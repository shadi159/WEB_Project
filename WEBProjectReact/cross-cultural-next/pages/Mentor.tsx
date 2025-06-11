import React, { useEffect, useState, useRef, useCallback } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, push, onValue, onChildAdded, off, serverTimestamp, set, remove } from 'firebase/database';
import SimplePeer from 'simple-peer';

interface SessionAcceptedPayload {
  firebaseSessionPath: string;
  sessionType: 'chat' | 'video';
}

interface ChatMessage {
  from: string;
  message: string;
  timestamp: any;
}

interface IncomingRequest {
  id: string;
  type: string;
  fromMentorId: string;
  sessionType: 'chat' | 'video';
  timestamp: any;
  status: string;
}

interface UserDetails {
  displayName: string;
  firstName: string;
  lastName: string;
  role: string;
  id: string;
  email?: string; // Made email optional since it might not always be available
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const firebaseDb = getDatabase(app);

const MentorComponent = () => {
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<'user' | 'mentor' | null>(null);
  const [myUserDetails, setMyUserDetails] = useState<UserDetails | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [onlineUserStatuses, setOnlineUserStatuses] = useState<any>({});
  const [userDetailsCache, setUserDetailsCache] = useState<{[key: string]: UserDetails}>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserDetails[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeFirebaseSessionPath, setActiveFirebaseSessionPath] = useState<string | null>(null);
  const [peerConnection, setPeerConnection] = useState<SimplePeer.Instance | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isInVideoCall, setIsInVideoCall] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Fetch user details from your MongoDB
  const fetchUserDetails = useCallback(async (userIds: string[]) => {
    try {
      const response = await fetch(`/api/get-user-details?userIds=${userIds.join(',')}`);
      const data = await response.json();
      
      if (data.users) {
        setUserDetailsCache(prev => ({ ...prev, ...data.users }));
        return data.users;
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
    return {};
  }, []);

  // Search for users by name
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const response = await fetch(`/api/search-users?query=${encodeURIComponent(query)}&role=user`);
      const data = await response.json();
      
      if (data.users) {
        setSearchResults(data.users);
        setShowSearchResults(true);
        
        // Update cache with search results
        const newCache = data.users.reduce((acc: any, user: UserDetails) => {
          acc[user.id] = user;
          return acc;
        }, {});
        setUserDetailsCache(prev => ({ ...prev, ...newCache }));
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchUsers]);

  // Get display name for a user ID
  const getUserDisplayName = useCallback((userId: string): string => {
    const userDetails = userDetailsCache[userId];
    if (userDetails) {
      return `${userDetails.displayName} (${userDetails.role})`;
    }
    return userId; // Fallback to ID if name not found
  }, [userDetailsCache]);

  const handleSelectUser = (user: UserDetails) => {
    const input = document.getElementById('targetUserId') as HTMLInputElement;
    if (input) {
      input.value = user.id;
      input.setAttribute('data-display-name', user.displayName);
    }
    setShowSearchResults(false);
    setSearchQuery('');
  };

  // Initialize user data from localStorage and fetch details
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          console.log('Loaded user from localStorage:', parsedUser);
          const userId = parsedUser._id || parsedUser.id;
          setMyUserId(userId);
          setMyRole(parsedUser.role as 'user' | 'mentor');
          
          // Fetch current user details from database
          const userDetails = await fetchUserDetails([userId]);
          if (userDetails[userId]) {
            setMyUserDetails(userDetails[userId]);
          }
        } else {
          // For testing purposes, create a mock user
          const mockUser = {
            _id: `user_${Math.random().toString(36).substr(2, 9)}`,
            role: 'user' as const,
            firstName: 'Test',
            lastName: 'User'
          };
          localStorage.setItem("user", JSON.stringify(mockUser));
          setMyUserId(mockUser._id);
          setMyRole(mockUser.role);
          
          // Set mock user details
          const mockDetails: UserDetails = {
            displayName: `${mockUser.firstName} ${mockUser.lastName}`,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            role: mockUser.role,
            id: mockUser._id
          };
          setMyUserDetails(mockDetails);
          setUserDetailsCache(prev => ({ ...prev, [mockUser._id]: mockDetails }));
          
          console.log('Created mock user:', mockUser);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    initializeUser();
  }, [fetchUserDetails]);

  // Set user online status in Firebase with user details
  useEffect(() => {
    if (!myUserId || !myUserDetails) return;

    const userStatusRef = ref(firebaseDb, `user_statuses/${myUserId}`);
    const connectedRef = ref(firebaseDb, '.info/connected');

    const handleConnectedChange = (snapshot: any) => {
      if (snapshot.val() === true) {
        // User is online - include display name and role
        set(userStatusRef, {
          status: 'online',
          role: myRole,
          displayName: myUserDetails.displayName,
          firstName: myUserDetails.firstName,
          lastName: myUserDetails.lastName,
          timestamp: serverTimestamp(),
        });

        // Remove user when they disconnect
        onValue(ref(firebaseDb, '.info/connected'), (snap) => {
          if (!snap.val()) {
            set(userStatusRef, {
              status: 'offline',
              role: myRole,
              displayName: myUserDetails.displayName,
              firstName: myUserDetails.firstName,
              lastName: myUserDetails.lastName,
              timestamp: serverTimestamp(),
            });
          }
        });

        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    };

    onValue(connectedRef, handleConnectedChange);

    // Cleanup function
    return () => {
      off(connectedRef, 'value', handleConnectedChange);
      if (myUserId) {
        set(ref(firebaseDb, `user_statuses/${myUserId}`), {
          status: 'offline',
          role: myRole,
          displayName: myUserDetails.displayName,
          firstName: myUserDetails.firstName,
          lastName: myUserDetails.lastName,
          timestamp: serverTimestamp(),
        });
      }
    };
  }, [myUserId, myRole, myUserDetails]);

  const startVideoCall = useCallback(async (initiator: boolean, sessionPath: string) => {
    try {
      console.log(`Starting video call - Initiator: ${initiator}, Path: ${sessionPath}`);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const peer = new SimplePeer({ 
        initiator, 
        trickle: false, 
        stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      peer.on('signal', (data) => {
        console.log('Sending WebRTC signal:', data);
        push(ref(firebaseDb, `${sessionPath}/signals`), {
          from: myUserId,
          signal: JSON.stringify(data),
          timestamp: serverTimestamp()
        });
      });

      peer.on('stream', (remoteStream) => {
        console.log('Received remote stream');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      peer.on('error', (err) => {
        console.error('Peer connection error:', err);
      });

      peer.on('connect', () => {
        console.log('Peer connected successfully!');
        setIsInVideoCall(true);
      });

      peer.on('close', () => {
        console.log('Peer connection closed');
        setIsInVideoCall(false);
      });

      setPeerConnection(peer);
    } catch (err) {
      console.error('Failed to get media stream:', err);
      alert('Failed to access camera/microphone. Please check permissions.');
    }
  }, [myUserId]);

  const endCurrentSession = useCallback(() => {
    console.log('Ending current session');
    if (activeFirebaseSessionPath) {
      // Update session status to ended
      set(ref(firebaseDb, `${activeFirebaseSessionPath}/status`), 'ended');
      
      // Clean up Firebase listeners
      off(ref(firebaseDb, `${activeFirebaseSessionPath}/messages`));
      off(ref(firebaseDb, `${activeFirebaseSessionPath}/signals`));
      off(ref(firebaseDb, activeFirebaseSessionPath));
      
      setActiveFirebaseSessionPath(null);
      setChatMessages([]);
      setIsInVideoCall(false);
      
      // Clean up peer connection
      if (peerConnection) {
        peerConnection.destroy();
        setPeerConnection(null);
      }
      
      // Clean up video streams
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        localVideoRef.current.srcObject = null;
      }
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    }
  }, [activeFirebaseSessionPath, peerConnection]);

  const setupFirebaseSessionListeners = useCallback((path: string, sessionType: 'chat' | 'video') => {
    console.log(`Setting up Firebase listeners for session: ${path}, type: ${sessionType}`);
    
    // Listen for new messages
    const messagesRef = ref(firebaseDb, `${path}/messages`);
    onChildAdded(messagesRef, (snapshot) => {
      const message = snapshot.val();
      console.log('New message received:', message);
      setChatMessages((prev) => [...prev, message]);
    });

    // Listen for WebRTC signals if video call
    if (sessionType === 'video') {
      const signalsRef = ref(firebaseDb, `${path}/signals`);
      onChildAdded(signalsRef, (snapshot) => {
        const signalData = snapshot.val();
        if (signalData.from !== myUserId && peerConnection) {
          try {
            const signal = JSON.parse(signalData.signal);
            console.log('Received WebRTC signal:', signal);
            peerConnection.signal(signal);
          } catch (err) {
            console.error('Error parsing WebRTC signal:', err);
          }
        }
      });
      
      // Start video call
      startVideoCall(myRole === 'mentor', path);
    }

    // Listen for session status changes
    const sessionRef = ref(firebaseDb, path);
    onValue(sessionRef, (snapshot) => {
      const sessionData = snapshot.val();
      if (sessionData?.status === 'ended') {
        console.log('Session ended by peer');
        endCurrentSession();
      }
    });
  }, [myUserId, myRole, peerConnection, startVideoCall, endCurrentSession]);

  // Listen for user statuses and notifications
  useEffect(() => {
    if (!myUserId) return;

    console.log('Setting up Firebase listeners for user:', myUserId);
    
    const statusesRef = ref(firebaseDb, 'user_statuses');
    const requestsRef = ref(firebaseDb, `user_notifications/${myUserId}/requests`);
    const responsesRef = ref(firebaseDb, `user_notifications/${myUserId}/responses`);

    onValue(statusesRef, async (snapshot) => {
      const statuses = snapshot.val() || {};
      console.log('User statuses updated:', statuses);
      
      // Fetch user details for any new users we haven't seen before
      const unknownUserIds = Object.keys(statuses).filter(uid => 
        uid !== myUserId && !userDetailsCache[uid] && !uid.startsWith('user_') && !uid.startsWith('mentor_')
      );
      
      if (unknownUserIds.length > 0) {
        await fetchUserDetails(unknownUserIds);
      }
      
      setOnlineUserStatuses(statuses);
    });

    onChildAdded(requestsRef, async (snap) => {
      const request = { id: snap.key, ...snap.val() };
      console.log('New request received:', request);
      
      // Fetch details for the mentor who sent the request
      if (request.fromMentorId && !userDetailsCache[request.fromMentorId]) {
        await fetchUserDetails([request.fromMentorId]);
      }
      
      setIncomingRequests((prev) => [...prev, request]);
    });

    onChildAdded(responsesRef, (snap) => {
      const response = snap.val();
      console.log('New response received:', response);
      
      if (response.type === 'session_accepted') {
        setActiveFirebaseSessionPath(response.firebaseSessionPath);
        setupFirebaseSessionListeners(response.firebaseSessionPath, response.sessionType);
      } else if (response.type === 'session_ended') {
        endCurrentSession();
      }
    });

    return () => {
      off(statusesRef);
      off(requestsRef);
      off(responsesRef);
    };
  }, [myUserId, setupFirebaseSessionListeners, endCurrentSession, userDetailsCache, fetchUserDetails]);

  const handleMentorRequestSession = async (targetUserId: string, sessionType: 'chat' | 'video') => {
    if (!myUserId || myRole !== 'mentor') {
      alert('Only mentors can request sessions');
      return;
    }
    
    console.log(`Requesting ${sessionType} session with user: ${targetUserId}`);
    
    // Send notification directly via Firebase
    const notificationPath = `user_notifications/${targetUserId}/requests`;
    await push(ref(firebaseDb, notificationPath), {
      type: 'session_request',
      fromMentorId: myUserId,
      sessionType: sessionType,
      timestamp: serverTimestamp(),
      status: 'pending'
    });
  };

  const handleUserAcceptSession = async (fromMentorId: string, sessionType: 'chat' | 'video', requestId: string) => {
    if (!myUserId || myRole !== 'user') {
      alert('Only users can accept sessions');
      return;
    }
    
    console.log(`Accepting ${sessionType} session from mentor: ${fromMentorId}`);
    
    // Generate session details
    const sessionId = `${myUserId}_${fromMentorId}_${Date.now()}`;
    const firebaseSessionPath = `live_sessions/${sessionId}`;

    // Initialize session in Firebase RTDB
    await set(ref(firebaseDb, firebaseSessionPath), {
      mentorId: fromMentorId,
      userId: myUserId,
      sessionType: sessionType,
      status: 'active',
      createdAt: serverTimestamp(),
    });

    // Notify both parties via Firebase
    await push(ref(firebaseDb, `user_notifications/${myUserId}/responses`), {
      type: 'session_accepted',
      peerUserId: fromMentorId,
      sessionType: sessionType,
      firebaseSessionPath: firebaseSessionPath,
      timestamp: serverTimestamp(),
    });

    await push(ref(firebaseDb, `user_notifications/${fromMentorId}/responses`), {
      type: 'session_accepted',
      peerUserId: myUserId,
      sessionType: sessionType,
      firebaseSessionPath: firebaseSessionPath,
      timestamp: serverTimestamp(),
    });

    // Remove the request
    await remove(ref(firebaseDb, `user_notifications/${myUserId}/requests/${requestId}`));
    setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const handleSendChatMessage = (msg: string) => {
    if (!activeFirebaseSessionPath || !myUserId || !msg.trim()) return;
    
    console.log('Sending chat message:', msg);
    push(ref(firebaseDb, `${activeFirebaseSessionPath}/messages`), {
      from: myUserId,
      message: msg.trim(),
      timestamp: serverTimestamp(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentMessage.trim()) {
      handleSendChatMessage(currentMessage);
      setCurrentMessage('');
    }
  };

  if (!myUserId || !myRole) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading user session...</h2>
        <p>If this persists, please refresh the page.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Mentor/User Dashboard (Firebase Only)</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <p><strong>User:</strong> {myUserDetails ? myUserDetails.displayName : myUserId}</p>
        <p><strong>Role:</strong> {myRole}</p>
        <p><strong>Firebase Status:</strong> {isOnline ? '🟢 Connected' : '🔴 Disconnected'}</p>
        <p><em>This version works on Vercel using Firebase only (no Socket.IO)</em></p>
      </div>

      {/* Mentor Controls */}
      {myRole === 'mentor' && (
        <div style={{ marginBottom: '30px', padding: '15px', border: '2px solid #007bff', borderRadius: '5px' }}>
          <h2>Mentor Controls</h2>
          
          {/* User Search */}
          <div style={{ marginBottom: '15px', position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Search for users by name:
            </label>
            <input 
              type="text" 
              placeholder="Type user's first name or last name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '8px', width: '300px', marginBottom: '5px' }}
            />
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '3px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 1000,
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              }}>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    style={{
                      padding: '10px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #eee'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <div style={{ fontWeight: 'bold' }}>{user.displayName}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {user.role}{user.email ? ` • ${user.email}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manual ID Input */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Or enter User ID directly:
            </label>
            <input 
              type="text" 
              placeholder="Enter User ID (ObjectId)" 
              id="targetUserId"
              style={{ padding: '8px', marginRight: '10px', width: '300px' }}
            />
          </div>

          <div>
            <button 
              onClick={() => {
                const input = document.getElementById('targetUserId') as HTMLInputElement;
                if (input.value.trim()) {
                  handleMentorRequestSession(input.value.trim(), 'chat');
                }
              }}
              style={{ padding: '8px 15px', marginRight: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px' }}
            >
              Request Chat
            </button>
            <button 
              onClick={() => {
                const input = document.getElementById('targetUserId') as HTMLInputElement;
                if (input.value.trim()) {
                  handleMentorRequestSession(input.value.trim(), 'video');
                }
              }}
              style={{ padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px' }}
            >
              Request Video Call
            </button>
          </div>
        </div>
      )}

      {/* Incoming Requests */}
      {myRole === 'user' && incomingRequests.length > 0 && (
        <div style={{ marginBottom: '30px', padding: '15px', border: '2px solid #ffc107', borderRadius: '5px' }}>
          <h2>Incoming Session Requests:</h2>
          {incomingRequests.map((req) => (
            <div key={req.id} style={{ padding: '10px', backgroundColor: '#fff3cd', marginBottom: '10px', borderRadius: '3px' }}>
              <p><strong>From Mentor:</strong> {getUserDisplayName(req.fromMentorId)}</p>
              <p><strong>Session Type:</strong> {req.sessionType}</p>
              <button 
                onClick={() => handleUserAcceptSession(req.fromMentorId, req.sessionType, req.id)}
                style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px' }}
              >
                Accept {req.sessionType}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active Session */}
      {activeFirebaseSessionPath && (
        <div style={{ marginBottom: '30px', padding: '15px', border: '2px solid #28a745', borderRadius: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2>Active Session</h2>
            <button 
              onClick={endCurrentSession}
              style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px' }}
            >
              End Session
            </button>
          </div>
          
          {/* Chat Interface */}
          <div style={{ marginBottom: '20px' }}>
            <h3>Chat Messages:</h3>
            <div style={{ 
              height: '200px', 
              overflowY: 'auto', 
              border: '1px solid #ccc', 
              padding: '10px', 
              backgroundColor: '#f9f9f9',
              marginBottom: '10px'
            }}>
              {chatMessages.map((msg, index) => (
                <div key={index} style={{ 
                  marginBottom: '8px', 
                  padding: '5px',
                  backgroundColor: msg.from === myUserId ? '#007bff' : '#6c757d',
                  color: 'white',
                  borderRadius: '3px',
                  alignSelf: msg.from === myUserId ? 'flex-end' : 'flex-start'
                }}>
                  <strong>{msg.from === myUserId ? 'You' : getUserDisplayName(msg.from)}:</strong> {msg.message}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex' }}>
              <input 
                type="text" 
                placeholder="Type your message..." 
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                style={{ flex: 1, padding: '8px', marginRight: '10px' }}
              />
              <button 
                onClick={() => {
                  if (currentMessage.trim()) {
                    handleSendChatMessage(currentMessage);
                    setCurrentMessage('');
                  }
                }}
                style={{ padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px' }}
              >
                Send
              </button>
            </div>
          </div>

          {/* Video Interface */}
          {isInVideoCall && (
            <div>
              <h3>Video Call:</h3>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div>
                  <p>Your Video:</p>
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    style={{ width: '300px', height: '200px', backgroundColor: '#000', borderRadius: '5px' }}
                  />
                </div>
                <div>
                  <p>Remote Video:</p>
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    style={{ width: '300px', height: '200px', backgroundColor: '#000', borderRadius: '5px' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Online Users */}
      <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>Online Users:</h3>
        {Object.keys(onlineUserStatuses).length === 0 ? (
          <p>No users online</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {Object.entries(onlineUserStatuses).map(([uid, data]: [string, any]) => (
              <li key={uid} style={{ 
                padding: '10px', 
                marginBottom: '5px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '3px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>
                  <strong>
                    {data.displayName ? `${data.displayName} (${data.role})` : getUserDisplayName(uid)}
                  </strong> - {data.status === 'online' ? '🟢' : '🔴'} {data.status}
                </span>
                {myRole === 'mentor' && data.status === 'online' && uid !== myUserId && data.role === 'user' && (
                  <div>
                    <button 
                      onClick={() => handleMentorRequestSession(uid, 'video')}
                      style={{ padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', fontSize: '12px' }}
                    >
                      Video
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Test Users Helper */}
      <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ffc107', borderRadius: '5px', backgroundColor: '#fff3cd' }}>
        <h3>Testing Helper:</h3>
        <p>To test the system with named users:</p>
        <button 
          onClick={() => {
            const mentor = { 
              _id: 'mentor_123', 
              role: 'mentor',
              firstName: 'Dr. Sarah',
              lastName: 'Johnson'
            };
            localStorage.setItem('user', JSON.stringify(mentor));
            window.location.reload();
          }}
          style={{ padding: '5px 10px', marginRight: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px' }}
        >
          Load as Dr. Sarah Johnson (Mentor)
        </button>
        <button 
          onClick={() => {
            const user = { 
              _id: 'user_456', 
              role: 'user',
              firstName: 'John',
              lastName: 'Smith'
            };
            localStorage.setItem('user', JSON.stringify(user));
            window.location.reload();
          }}
          style={{ padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px' }}
        >
          Load as John Smith (User)
        </button>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          <p><strong>For real MongoDB users:</strong> Enter the ObjectId in the User ID field above.</p>
          <p>The system will automatically fetch and display the user's first name and role.</p>
        </div>
      </div>
    </div>
  );
};

export default MentorComponent;
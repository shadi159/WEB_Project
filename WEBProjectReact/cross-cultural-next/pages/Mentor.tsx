import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, onChildAdded, push, set, serverTimestamp } from 'firebase/database';
import SimplePeer from 'simple-peer';

// Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const firebaseDb = getDatabase(app);

interface UserDetails {
  displayName: string;
  firstName: string;
  lastName: string;
  role: string;
  id: string;
  email?: string;
}

interface UserStatus {
  status: string;
  role: string;
  displayName?: string;
  [key: string]: any;
}

const MentorComponent = () => {
  // Core user state
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<'user' | 'mentor' | null>(null);
  const [myUserDetails, setMyUserDetails] = useState<UserDetails | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  // UI state
  const [userDetailsCache, setUserDetailsCache] = useState<{[key: string]: UserDetails}>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserDetails[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [onlineUserStatuses, setOnlineUserStatuses] = useState<{[key: string]: UserStatus}>({});
  const [currentMessage, setCurrentMessage] = useState('');

  // Session state
  const [activeFirebaseSessionPath, setActiveFirebaseSessionPath] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isInVideoCall, setIsInVideoCall] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [processedRequests, setProcessedRequests] = useState<Set<string>>(new Set());
  const [peerConnection, setPeerConnection] = useState<SimplePeer.Instance | null>(null);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const cleanupFunctions = useRef<(() => void)[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper functions
  const addCleanup = useCallback((cleanup: () => void) => {
    cleanupFunctions.current.push(cleanup);
  }, []);

  const clearAllCleanup = useCallback(() => {
    cleanupFunctions.current.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    });
    cleanupFunctions.current = [];
  }, []);

  // User initialization
  useEffect(() => {
    const initUser = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
          throw new Error('No user data found');
        }

        const parsedUser = JSON.parse(storedUser);
        const userId = parsedUser._id || parsedUser.id;
        let userRole = parsedUser.role;

        // Validate role
        if (!userRole || !['user', 'mentor'].includes(userRole)) {
          try {
            const response = await fetch('/api/profile', {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });
            if (response.ok) {
              const data = await response.json();
              userRole = data.user?.role || 'user';
              localStorage.setItem("user", JSON.stringify({ ...parsedUser, role: userRole }));
            } else {
              userRole = 'user';
            }
          } catch {
            userRole = 'user';
          }
        }

        const userDetails: UserDetails = {
          displayName: `${parsedUser.firstName || 'Unknown'} ${parsedUser.lastName || 'User'}`.trim(),
          firstName: parsedUser.firstName || 'Unknown',
          lastName: parsedUser.lastName || 'User',
          role: userRole,
          id: userId,
          email: parsedUser.email
        };

        setMyUserId(userId);
        setMyRole(userRole);
        setMyUserDetails(userDetails);
        setUserDetailsCache(prev => ({ ...prev, [userId]: userDetails }));
        setIsInitialized(true);
        setIsLoading(false);

      } catch (error) {
        console.error('User init error:', error);
        setUserError('Failed to load user data. Please refresh.');
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initUser();
  }, []);

  // Firebase status management
  useEffect(() => {
    if (!myUserId || !myUserDetails || !isInitialized) return;

    const userStatusRef = ref(firebaseDb, `user_statuses/${myUserId}`);
    const connectedRef = ref(firebaseDb, '.info/connected');

    const unsubscribe = onValue(connectedRef, (snapshot) => {
      if (snapshot.val()) {
        set(userStatusRef, {
          status: 'online',
          role: myUserDetails.role,
          displayName: myUserDetails.displayName,
          firstName: myUserDetails.firstName,
          lastName: myUserDetails.lastName,
          timestamp: serverTimestamp(),
        }).then(() => setIsOnline(true)).catch(() => setIsOnline(false));
      } else {
        setIsOnline(false);
      }
    });

    addCleanup(unsubscribe);

    return () => {
      unsubscribe();
      if (myUserId && myUserDetails) {
        set(ref(firebaseDb, `user_statuses/${myUserId}`), {
          status: 'offline',
          role: myUserDetails.role,
          displayName: myUserDetails.displayName,
          firstName: myUserDetails.firstName,
          lastName: myUserDetails.lastName,
          timestamp: serverTimestamp(),
        }).catch(console.error);
      }
    };
  }, [myUserId, myUserDetails, isInitialized, addCleanup]);

  // Firebase listeners
  useEffect(() => {
    if (!isInitialized || !myUserId || !myRole) return;

    const statusesRef = ref(firebaseDb, 'user_statuses');
    const requestsRef = ref(firebaseDb, `user_notifications/${myUserId}/requests`);
    const responsesRef = ref(firebaseDb, `user_notifications/${myUserId}/responses`);

    // Online users listener
    const statusUnsubscribe = onValue(statusesRef, (snapshot) => {
      setOnlineUserStatuses(snapshot.val() || {});
    });

    // Requests listener
    const requestsUnsubscribe = onValue(requestsRef, (snapshot) => {
      const requests = snapshot.val() || {};
      const requestsArray = Object.entries(requests).map(([id, data]: [string, any]) => ({ id, ...data }));
      const pending = requestsArray.filter(req => req.status === 'pending' && !processedRequests.has(req.id));
      setIncomingRequests(pending);
    });

    // Responses listener
    const responsesUnsubscribe = onChildAdded(responsesRef, (snapshot) => {
      const response = snapshot.val();
      if (response.type === 'session_accepted') {
        setActiveFirebaseSessionPath(response.firebaseSessionPath);
        setupSession(response.firebaseSessionPath, response.sessionType);
      } else if (response.type === 'session_ended') {
        endSession();
      }
    });

    addCleanup(statusUnsubscribe);
    addCleanup(requestsUnsubscribe);
    addCleanup(responsesUnsubscribe);

    return () => {
      statusUnsubscribe();
      requestsUnsubscribe();
      responsesUnsubscribe();
    };
  }, [isInitialized, myUserId, myRole, processedRequests, addCleanup]);

  // Search functionality
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        try {
          const response = await fetch(`/api/search-users?query=${encodeURIComponent(searchQuery)}&role=user`);
          if (response.ok) {
            const data = await response.json();
            setSearchResults(data.users || []);
            setShowSearchResults(true);
          }
        } catch (error) {
          console.error('Search error:', error);
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  // Session setup
  const setupSession = useCallback((path: string, sessionType: string) => {
    setChatMessages([]);

    const messagesRef = ref(firebaseDb, `${path}/messages`);
    const messagesUnsubscribe = onChildAdded(messagesRef, (snapshot) => {
      const message = snapshot.val();
      if (message) {
        setChatMessages(prev => [...prev, message]);
      }
    });

    const sessionRef = ref(firebaseDb, path);
    const sessionUnsubscribe = onValue(sessionRef, (snapshot) => {
      const sessionData = snapshot.val();
      if (sessionData?.status === 'ended') {
        endSession();
      }
    });

    addCleanup(messagesUnsubscribe);
    addCleanup(sessionUnsubscribe);

    if (sessionType === 'video') {
      startVideoCall(myRole === 'mentor', path);
    }
  }, [myRole, addCleanup]);

  // Video call functionality
  const startVideoCall = useCallback(async (initiator: boolean, sessionPath: string) => {
    try {
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
        push(ref(firebaseDb, `${sessionPath}/signals`), {
          from: myUserId,
          signal: JSON.stringify(data),
          timestamp: serverTimestamp()
        });
      });

      peer.on('stream', (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      peer.on('connect', () => setIsInVideoCall(true));
      peer.on('close', () => setIsInVideoCall(false));

      setPeerConnection(peer);

      const signalsRef = ref(firebaseDb, `${sessionPath}/signals`);
      const signalsUnsubscribe = onChildAdded(signalsRef, (snapshot) => {
        const signalData = snapshot.val();
        if (signalData && signalData.from !== myUserId) {
          try {
            peer.signal(JSON.parse(signalData.signal));
          } catch (err) {
            console.error('Signal parse error:', err);
          }
        }
      });

      addCleanup(signalsUnsubscribe);

    } catch (err) {
      console.error('Video call error:', err);
      alert('Failed to access camera/microphone');
    }
  }, [myUserId, addCleanup]);

  // End session
  const endSession = useCallback(() => {
    if (activeFirebaseSessionPath) {
      set(ref(firebaseDb, `${activeFirebaseSessionPath}/status`), 'ended');
      setActiveFirebaseSessionPath(null);
    }
    setChatMessages([]);
    setIsInVideoCall(false);
    
    if (peerConnection) {
      peerConnection.destroy();
      setPeerConnection(null);
    }

    // Stop video streams
    [localVideoRef, remoteVideoRef].forEach(videoRef => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    });
  }, [activeFirebaseSessionPath, peerConnection]);

  // Helper functions
  const getUserDisplayName = useCallback((userId: string): string => {
    const userDetails = userDetailsCache[userId];
    return userDetails ? `${userDetails.displayName} (${userDetails.role})` : userId;
  }, [userDetailsCache]);

  const handleSelectUser = useCallback((user: UserDetails) => {
    const input = document.getElementById('targetUserId') as HTMLInputElement;
    if (input) input.value = user.id;
    setSearchQuery('');
    setShowSearchResults(false);
  }, []);

  const sendRequest = useCallback(async (targetUserId: string, sessionType: 'chat' | 'video') => {
    if (!myUserId || myRole !== 'mentor' || !targetUserId.trim()) {
      alert('Invalid request parameters');
      return;
    }

    try {
      await push(ref(firebaseDb, `user_notifications/${targetUserId}/requests`), {
        type: 'session_request',
        fromMentorId: myUserId,
        sessionType,
        timestamp: serverTimestamp(),
        status: 'pending'
      });
      alert(`${sessionType} request sent!`);
    } catch (error) {
      alert('Failed to send request');
    }
  }, [myUserId, myRole]);

  const acceptRequest = useCallback(async (fromMentorId: string, sessionType: 'chat' | 'video', requestId: string) => {
    if (!myUserId || myRole !== 'user') return;

    try {
      setProcessedRequests(prev => new Set([...prev, requestId]));
      
      const sessionId = `${myUserId}_${fromMentorId}_${Date.now()}`;
      const firebaseSessionPath = `live_sessions/${sessionId}`;

      await set(ref(firebaseDb, firebaseSessionPath), {
        mentorId: fromMentorId,
        userId: myUserId,
        sessionType,
        status: 'active',
        createdAt: serverTimestamp(),
      });

      const notifications = [
        { path: `user_notifications/${myUserId}/responses`, userId: fromMentorId },
        { path: `user_notifications/${fromMentorId}/responses`, userId: myUserId }
      ];

      await Promise.all(notifications.map(notif => 
        push(ref(firebaseDb, notif.path), {
          type: 'session_accepted',
          peerUserId: notif.userId,
          sessionType,
          firebaseSessionPath,
          timestamp: serverTimestamp(),
        })
      ));

      await set(ref(firebaseDb, `user_notifications/${myUserId}/requests/${requestId}/status`), 'accepted');
      setIncomingRequests(prev => prev.filter(r => r.id !== requestId));

    } catch (error) {
      alert('Failed to accept request');
    }
  }, [myUserId, myRole]);

  const sendMessage = useCallback(() => {
    if (!activeFirebaseSessionPath || !myUserId || !currentMessage.trim()) return;
    
    push(ref(firebaseDb, `${activeFirebaseSessionPath}/messages`), {
      from: myUserId,
      message: currentMessage.trim(),
      timestamp: serverTimestamp(),
    });
    setCurrentMessage('');
  }, [activeFirebaseSessionPath, myUserId, currentMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllCleanup();
      endSession();
    };
  }, [clearAllCleanup, endSession]);

  // Error state
  if (userError) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h2>Error</h2>
        <p>{userError}</p>
        <button onClick={() => window.location.reload()}>Refresh</button>
      </div>
    );
  }

  // Loading state
  if (isLoading || !isInitialized || !myUserId || !myRole || !myUserDetails) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading...</h2>
        <p>Initializing system...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Mentor/User Dashboard</h1>
      
      {/* User Info */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <p><strong>User:</strong> {myUserDetails.displayName}</p>
        <p><strong>Role:</strong> {myRole}</p>
        <p><strong>Status:</strong> {isOnline ? '🟢 Online' : '🔴 Offline'}</p>
      </div>

      {/* Mentor Controls */}
      {myRole === 'mentor' && (
        <div style={{ marginBottom: '30px', padding: '15px', border: '2px solid #007bff', borderRadius: '5px' }}>
          <h2>Mentor Controls</h2>
          
          <div style={{ marginBottom: '15px', position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Search for users:
            </label>
            <input 
              type="text" 
              placeholder="Type user's name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '8px', width: '300px' }}
            />
            
            {showSearchResults && searchResults.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '3px',
                maxHeight: '200px', overflowY: 'auto', zIndex: 1000,
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              }}>
                {searchResults.map((user) => (
                  <div key={user.id} onClick={() => handleSelectUser(user)}
                    style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}>
                    <div style={{ fontWeight: 'bold' }}>{user.displayName}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {user.role}{user.email ? ` • ${user.email}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Or enter User ID directly:
            </label>
            <input type="text" placeholder="Enter User ID" id="targetUserId"
              style={{ padding: '8px', marginRight: '10px', width: '300px' }} />
          </div>

          <div>
            <button onClick={() => {
              const input = document.getElementById('targetUserId') as HTMLInputElement;
              if (input?.value.trim()) sendRequest(input.value.trim(), 'chat');
            }} style={{ padding: '8px 15px', marginRight: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px' }}>
              Request Chat
            </button>
            <button onClick={() => {
              const input = document.getElementById('targetUserId') as HTMLInputElement;
              if (input?.value.trim()) sendRequest(input.value.trim(), 'video');
            }} style={{ padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px' }}>
              Request Video Call
            </button>
          </div>
        </div>
      )}

      {/* Incoming Requests */}
      {myRole === 'user' && incomingRequests.length > 0 && (
        <div style={{ marginBottom: '30px', padding: '15px', border: '2px solid #ffc107', borderRadius: '5px' }}>
          <h2>Incoming Requests:</h2>
          {incomingRequests.map((req) => (
            <div key={req.id} style={{ padding: '10px', backgroundColor: '#fff3cd', marginBottom: '10px', borderRadius: '3px' }}>
              <p><strong>From:</strong> {getUserDisplayName(req.fromMentorId)}</p>
              <p><strong>Type:</strong> {req.sessionType}</p>
              <button onClick={() => acceptRequest(req.fromMentorId, req.sessionType, req.id)}
                style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px' }}>
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
            <button onClick={endSession}
              style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px' }}>
              End Session
            </button>
          </div>
          
          {/* Chat */}
          <div style={{ marginBottom: '20px' }}>
            <h3>Messages:</h3>
            <div style={{ 
              height: '200px', overflowY: 'auto', border: '1px solid #ccc', 
              padding: '10px', backgroundColor: '#f9f9f9', marginBottom: '10px'
            }}>
              {chatMessages.map((msg, index) => (
                <div key={index} style={{ 
                  marginBottom: '8px', padding: '5px',
                  backgroundColor: msg.from === myUserId ? '#007bff' : '#6c757d',
                  color: 'white', borderRadius: '3px'
                }}>
                  <strong>{msg.from === myUserId ? 'You' : getUserDisplayName(msg.from)}:</strong> {msg.message}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex' }}>
              <input type="text" placeholder="Type message..." value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                style={{ flex: 1, padding: '8px', marginRight: '10px' }} />
              <button onClick={sendMessage}
                style={{ padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px' }}>
                Send
              </button>
            </div>
          </div>

          {/* Video */}
          {isInVideoCall && (
            <div>
              <h3>Video Call:</h3>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div>
                  <p>Your Video:</p>
                  <video ref={localVideoRef} autoPlay muted playsInline 
                    style={{ width: '300px', height: '200px', backgroundColor: '#000', borderRadius: '5px' }} />
                </div>
                <div>
                  <p>Remote Video:</p>
                  <video ref={remoteVideoRef} autoPlay playsInline 
                    style={{ width: '300px', height: '200px', backgroundColor: '#000', borderRadius: '5px' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Online Users */}
      <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>Online Users ({Object.keys(onlineUserStatuses).length}):</h3>
        {Object.keys(onlineUserStatuses).length === 0 ? (
          <p>No users online</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {Object.entries(onlineUserStatuses).map(([uid, data]) => (
              <li key={uid} style={{ 
                padding: '10px', marginBottom: '5px', backgroundColor: '#f8f9fa', borderRadius: '3px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <span>
                  <strong>{data.displayName || getUserDisplayName(uid)}</strong> - 
                  {data.status === 'online' ? '🟢' : '🔴'} {data.status}
                </span>
                {myRole === 'mentor' && data.status === 'online' && uid !== myUserId && data.role === 'user' && (
                  <div>
                    <button onClick={() => sendRequest(uid, 'chat')}
                      style={{ padding: '5px 10px', marginRight: '5px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px', fontSize: '12px' }}>
                      Chat
                    </button>
                    <button onClick={() => sendRequest(uid, 'video')}
                      style={{ padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', fontSize: '12px' }}>
                      Video
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MentorComponent;
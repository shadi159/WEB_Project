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
  email?: string;
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
  const [processedRequests, setProcessedRequests] = useState<Set<string>>(new Set());
  const [userLoadError, setUserLoadError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Fetch user details from your MongoDB with better error handling
  const fetchUserDetails = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return {};
    
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

  // Search for users by name with debouncing
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

  // Enhanced user initialization with better error handling
  useEffect(() => {
    const initializeUser = async () => {
      try {
        setUserLoadError(null);
        const storedUser = localStorage.getItem("user");
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          console.log('Loaded user from localStorage:', parsedUser);
          
          const userId = parsedUser._id || parsedUser.id;
          let userRole = parsedUser.role;
          
          // 🔧 CRITICAL: Validate and fix role
          if (!userRole || (userRole !== 'user' && userRole !== 'mentor')) {
            console.warn('Invalid or missing role, attempting to fetch from server...');
            
            try {
              // Fetch current user data from server to get correct role
              const response = await fetch('/api/profile', {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
              });
              
              if (response.ok) {
                const profileData = await response.json();
                userRole = profileData.user?.role || 'user'; // Default to 'user' if still missing
                
                // Update localStorage with correct role
                const updatedUser = { ...parsedUser, role: userRole };
                localStorage.setItem("user", JSON.stringify(updatedUser));
                
                console.log('✅ Role updated from server:', userRole);
              } else {
                console.warn('Failed to fetch profile, defaulting role to user');
                userRole = 'user'; // Safe default
              }
            } catch (fetchError) {
              console.error('Error fetching user profile:', fetchError);
              userRole = 'user'; // Safe default
            }
          }
          
          setMyUserId(userId);
          setMyRole(userRole as 'user' | 'mentor');
          
          // Create user details with validated role
          const userDetails: UserDetails = {
            displayName: `${parsedUser.firstName || 'Unknown'} ${parsedUser.lastName || 'User'}`.trim(),
            firstName: parsedUser.firstName || 'Unknown',
            lastName: parsedUser.lastName || 'User',
            role: userRole,
            id: userId,
            email: parsedUser.email
          };
          
          setMyUserDetails(userDetails);
          setUserDetailsCache(prev => ({ ...prev, [userId]: userDetails }));
          
          // Fetch additional details from database if needed
          try {
            const serverDetails = await fetchUserDetails([userId]);
            if (serverDetails[userId]) {
              const updatedDetails = { ...userDetails, ...serverDetails[userId] };
              setMyUserDetails(updatedDetails);
              setUserDetailsCache(prev => ({ ...prev, [userId]: updatedDetails }));
            }
          } catch (detailsError) {
            console.warn('Could not fetch additional user details:', detailsError);
            // Continue with local data
          }
          
        } else {
          // Create a mock user for testing if no stored user
          const mockUser = {
            _id: `user_${Math.random().toString(36).substr(2, 9)}`,
            role: 'user' as const,
            firstName: 'Test',
            lastName: 'User'
          };
          
          localStorage.setItem("user", JSON.stringify(mockUser));
          setMyUserId(mockUser._id);
          setMyRole(mockUser.role);
          
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
        setUserLoadError('Failed to load user data. Please refresh the page.');
      }
    };

    initializeUser();
  }, [fetchUserDetails]);

  // Set user online status in Firebase with validation
  useEffect(() => {
    if (!myUserId || !myUserDetails || !myRole) {
      console.log('Skipping Firebase status update - missing required data:', {
        myUserId: !!myUserId,
        myUserDetails: !!myUserDetails,
        myRole: !!myRole
      });
      return;
    }

    console.log('Setting up Firebase status for:', { myUserId, myRole, displayName: myUserDetails.displayName });

    const userStatusRef = ref(firebaseDb, `user_statuses/${myUserId}`);
    const connectedRef = ref(firebaseDb, '.info/connected');

    const handleConnectedChange = (snapshot: any) => {
      if (snapshot.val() === true) {
        console.log('User connected to Firebase, setting status...');
        
        // 🔧 CRITICAL: Ensure all values are valid before setting
        const statusData = {
          status: 'online',
          role: myRole, // This must not be null/undefined
          displayName: myUserDetails.displayName || 'Unknown User',
          firstName: myUserDetails.firstName || 'Unknown',
          lastName: myUserDetails.lastName || 'User',
          timestamp: serverTimestamp(),
        };
        
        console.log('Setting Firebase status with data:', statusData);
        
        set(userStatusRef, statusData)
          .then(() => {
            console.log('✅ Firebase status set successfully');
            setIsOnline(true);
          })
          .catch((error) => {
            console.error('❌ Failed to set Firebase status:', error);
            setIsOnline(false);
          });
      } else {
        console.log('User disconnected from Firebase');
        setIsOnline(false);
      }
    };

    const unsubscribe = onValue(connectedRef, handleConnectedChange);

    // Cleanup function
    return () => {
      unsubscribe();
      if (myUserId && myRole && myUserDetails) {
        console.log('Cleaning up Firebase status on unmount');
        set(ref(firebaseDb, `user_statuses/${myUserId}`), {
          status: 'offline',
          role: myRole,
          displayName: myUserDetails.displayName || 'Unknown User',
          firstName: myUserDetails.firstName || 'Unknown',
          lastName: myUserDetails.lastName || 'User',
          timestamp: serverTimestamp(),
        }).catch(console.error);
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
    
    // Clear existing messages
    setChatMessages([]);
    
    // Listen for new messages
    const messagesRef = ref(firebaseDb, `${path}/messages`);
    const messagesUnsubscribe = onChildAdded(messagesRef, (snapshot) => {
      const message = snapshot.val();
      console.log('New message received:', message);
      setChatMessages((prev) => [...prev, message]);
    });

    // Listen for WebRTC signals if video call
    let signalsUnsubscribe: (() => void) | null = null;
    if (sessionType === 'video') {
      const signalsRef = ref(firebaseDb, `${path}/signals`);
      signalsUnsubscribe = onChildAdded(signalsRef, (snapshot) => {
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
    const sessionUnsubscribe = onValue(sessionRef, (snapshot) => {
      const sessionData = snapshot.val();
      if (sessionData?.status === 'ended') {
        console.log('Session ended by peer');
        endCurrentSession();
      }
    });

    // Return cleanup function
    return () => {
      messagesUnsubscribe();
      if (signalsUnsubscribe) signalsUnsubscribe();
      sessionUnsubscribe();
    };
  }, [myUserId, myRole, peerConnection, startVideoCall, endCurrentSession]);

  // Listen for user statuses and notifications with rate limiting
  useEffect(() => {
    if (!myUserId || !myRole) return;

    console.log('Setting up Firebase listeners for user:', myUserId);
    
    const statusesRef = ref(firebaseDb, 'user_statuses');
    const requestsRef = ref(firebaseDb, `user_notifications/${myUserId}/requests`);
    const responsesRef = ref(firebaseDb, `user_notifications/${myUserId}/responses`);

    // Clear existing requests on mount
    setIncomingRequests([]);
    setProcessedRequests(new Set());

    // Rate limit the fetchUserDetails calls
    let fetchTimeout: NodeJS.Timeout | null = null;
    const pendingUserIds = new Set<string>();

    const debouncedFetchUserDetails = (userIds: string[]) => {
      userIds.forEach(id => pendingUserIds.add(id));
      
      if (fetchTimeout) {
        clearTimeout(fetchTimeout);
      }
      
      fetchTimeout = setTimeout(async () => {
        const idsToFetch = Array.from(pendingUserIds);
        pendingUserIds.clear();
        
        if (idsToFetch.length > 0) {
          await fetchUserDetails(idsToFetch);
        }
      }, 500); // Wait 500ms before fetching
    };

    const statusesUnsubscribe = onValue(statusesRef, async (snapshot) => {
      const statuses = snapshot.val() || {};
      console.log('User statuses updated, count:', Object.keys(statuses).length);
      
      // Fetch user details for any new users we haven't seen before
      const unknownUserIds = Object.keys(statuses).filter(uid => 
        uid !== myUserId && !userDetailsCache[uid] && 
        !uid.startsWith('user_') && !uid.startsWith('mentor_')
      );
      
      if (unknownUserIds.length > 0) {
        console.log('Fetching details for unknown users:', unknownUserIds.length);
        debouncedFetchUserDetails(unknownUserIds);
      }
      
      setOnlineUserStatuses(statuses);
    });

    // Use onValue instead of onChildAdded to get all existing requests first
    const requestsUnsubscribe = onValue(requestsRef, async (snapshot) => {
      const requests = snapshot.val() || {};
      console.log('All requests:', Object.keys(requests).length);
      
      const requestsArray = Object.entries(requests).map(([id, data]: [string, any]) => ({
        id,
        ...data
      }));

      // Filter out processed requests and only show pending ones
      const pendingRequests = requestsArray.filter(req => 
        req.status === 'pending' && !processedRequests.has(req.id)
      );

      if (pendingRequests.length > 0) {
        // Fetch details for mentors who sent requests
        const mentorIds = pendingRequests
          .map(req => req.fromMentorId)
          .filter(id => id && !userDetailsCache[id]);
        
        if (mentorIds.length > 0) {
          debouncedFetchUserDetails(mentorIds);
        }
      }

      setIncomingRequests(pendingRequests);
    });

    const responsesUnsubscribe = onChildAdded(responsesRef, (snap) => {
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
      if (fetchTimeout) {
        clearTimeout(fetchTimeout);
      }
      statusesUnsubscribe();
      requestsUnsubscribe();
      responsesUnsubscribe();
    };
  }, [myUserId, myRole, setupFirebaseSessionListeners, endCurrentSession, userDetailsCache, fetchUserDetails, processedRequests]);

  const handleMentorRequestSession = async (targetUserId: string, sessionType: 'chat' | 'video') => {
    if (!myUserId || myRole !== 'mentor') {
      alert('Only mentors can request sessions');
      return;
    }
    
    console.log(`Requesting ${sessionType} session with user: ${targetUserId}`);
    
    try {
      // Send notification directly via Firebase
      const notificationPath = `user_notifications/${targetUserId}/requests`;
      await push(ref(firebaseDb, notificationPath), {
        type: 'session_request',
        fromMentorId: myUserId,
        sessionType: sessionType,
        timestamp: serverTimestamp(),
        status: 'pending'
      });
      
      alert(`${sessionType} request sent successfully!`);
      
      // Clear the input
      const input = document.getElementById('targetUserId') as HTMLInputElement;
      if (input) {
        input.value = '';
      }
    } catch (error) {
      console.error('Error sending request:', error);
      alert('Failed to send request. Please try again.');
    }
  };

  const handleUserAcceptSession = async (fromMentorId: string, sessionType: 'chat' | 'video', requestId: string) => {
    if (!myUserId || myRole !== 'user') {
      alert('Only users can accept sessions');
      return;
    }
    
    console.log(`Accepting ${sessionType} session from mentor: ${fromMentorId}`);
    
    try {
      // Mark this request as processed to prevent duplicates
      setProcessedRequests(prev => new Set([...prev, requestId]));
      
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

      // Remove the request and update status
      await set(ref(firebaseDb, `user_notifications/${myUserId}/requests/${requestId}/status`), 'accepted');
      
      // Remove from local state
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
      
    } catch (error) {
      console.error('Error accepting session:', error);
      alert('Failed to accept session. Please try again.');
    }
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

  // Show error message if user loading failed
  if (userLoadError) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h2>Error Loading User Data</h2>
        <p>{userLoadError}</p>
        <button onClick={() => window.location.reload()}>
          Refresh Page
        </button>
      </div>
    );
  }

  // Show loading if user data is not ready
  if (!myUserId || !myRole || !myUserDetails) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading user session...</h2>
        <p>Validating user data and role...</p>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          <p>User ID: {myUserId ? '✅' : '❌'}</p>
          <p>Role: {myRole ? '✅' : '❌'}</p>
          <p>Details: {myUserDetails ? '✅' : '❌'}</p>
        </div>
        {!myUserId && <p>If this persists, please refresh the page or sign in again.</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Mentor/User Dashboard (Firebase Only)</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <p><strong>User:</strong> {myUserDetails.displayName}</p>
        <p><strong>Role:</strong> {myRole}</p>
        <p><strong>Firebase Status:</strong> {isOnline ? '🟢 Connected' : '🔴 Disconnected'}</p>
        <p><em>This version works on Vercel using Firebase only (no Socket.IO)</em></p>
      </div>

      {/* Rest of your component remains the same... */}
      {/* I'll keep the rest of the component unchanged to avoid making this response too long */}
      {/* The key fixes are in the user initialization and Firebase status setting */}
      
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
                      onClick={() => handleMentorRequestSession(uid, 'chat')}
                      style={{ padding: '5px 10px', marginRight: '5px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px', fontSize: '12px' }}
                    >
                      Chat
                    </button>
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
    </div>
  );
};

export default MentorComponent;
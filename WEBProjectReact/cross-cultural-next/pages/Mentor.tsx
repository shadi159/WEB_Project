import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

// TypeScript interfaces
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
  firstName?: string;
  lastName?: string;
  timestamp?: any;
}

interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  databaseURL?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

// Error handler utility
const createErrorHandler = (setErrors: React.Dispatch<React.SetStateAction<string[]>>) => {
  const handleError = (message: string) => {
    if (message.includes('message channel closed') || 
        message.includes('Extension context invalidated') ||
        message.includes('listener indicated an asynchronous response')) {
      setErrors(prev => [...prev, message].slice(-5));
      return true;
    }
    return false;
  };

  const errorHandler = (e: ErrorEvent) => {
    if (handleError(e.message)) {
      e.preventDefault();
      return false;
    }
  };

  const rejectionHandler = (e: PromiseRejectionEvent) => {
    if (handleError(e.reason?.message || 'Promise rejection')) {
      e.preventDefault();
      return false;
    }
  };

  return { errorHandler, rejectionHandler };
};

// Firebase configuration validator
const validateFirebaseConfig = (): FirebaseConfig | null => {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const requiredFields = ['apiKey', 'authDomain', 'databaseURL', 'projectId'];
  const missingFields = requiredFields.filter(field => !config[field as keyof FirebaseConfig]);
  
  if (missingFields.length > 0) {
    console.error('Missing Firebase config fields:', missingFields);
    return null;
  }

  return config;
};

// Disable SSR for this component since it uses browser APIs
const MentorComponentClient = dynamic(() => Promise.resolve(MentorComponentInner), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Loading Mentor System...</h2>
      <p>Initializing browser environment...</p>
    </div>
  )
});

// Main component wrapper
const MentorComponent = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading Mentor System...</h2>
        <p>Initializing browser environment...</p>
      </div>
    );
  }

  return <MentorComponentClient />;
};

// Client-side component with browser checks
const MentorComponentInner = () => {
  const [firebaseLoaded, setFirebaseLoaded] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  // Check browser environment
  if (typeof window === 'undefined') {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading...</h2>
        <p>Browser environment required</p>
      </div>
    );
  }

  useEffect(() => {
    const loadFirebase = async () => {
      try {
        // Validate config first
        const firebaseConfig = validateFirebaseConfig();
        if (!firebaseConfig) {
          throw new Error('Invalid Firebase configuration. Please check environment variables.');
        }

        // Dynamic imports for Firebase
        const { initializeApp, getApps } = await import('firebase/app');
        const { getDatabase } = await import('firebase/database');
        
        // Initialize Firebase
        const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
        const firebaseDb = getDatabase(app);
        
        // Store in window for global access
        (window as any).firebaseDb = firebaseDb;
        setFirebaseLoaded(true);
      } catch (error) {
        console.error('Firebase initialization error:', error);
        setFirebaseError(error instanceof Error ? error.message : 'Unknown Firebase error');
      }
    };

    loadFirebase();
  }, []);

  if (firebaseError) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h2>Firebase Configuration Error</h2>
        <p>{firebaseError}</p>
        <p>Please check your environment variables and try again.</p>
      </div>
    );
  }

  if (!firebaseLoaded) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading...</h2>
        <p>Initializing Firebase...</p>
      </div>
    );
  }

  return <MentorComponentCore />;
};

// Core component with all the logic
const MentorComponentCore = () => {
  // Get Firebase instance from window
  const firebaseDb = (window as any).firebaseDb;

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
  const [peerConnection, setPeerConnection] = useState<any>(null);

  // Error tracking
  const [errors, setErrors] = useState<string[]>([]);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const cleanupFunctions = useRef<(() => void)[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced error handling setup
  useEffect(() => {
    const { errorHandler, rejectionHandler } = createErrorHandler(setErrors);
    
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  // Cleanup management
  const addCleanup = useCallback((cleanup: () => void) => {
    cleanupFunctions.current.push(cleanup);
  }, []);

  const clearAllCleanup = useCallback(() => {
    cleanupFunctions.current.forEach((cleanup: () => void) => {
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

        // Validate and fix role if needed
        if (!userRole || !['user', 'mentor'].includes(userRole)) {
          try {
            const token = localStorage.getItem('token');
            if (token) {
              const response = await fetch('/api/profile', {
                headers: { 'Authorization': `Bearer ${token}` },
              });
              if (response.ok) {
                const data = await response.json();
                userRole = data.user?.role || 'user';
                localStorage.setItem("user", JSON.stringify({ ...parsedUser, role: userRole }));
              }
            }
          } catch {
            // Fallback to default role
          }
          userRole = userRole || 'user';
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
    if (!myUserId || !myUserDetails || !isInitialized || !firebaseDb) return;

    const setupFirebaseStatus = async () => {
      try {
        const { ref, onValue, set, serverTimestamp } = await import('firebase/database');
        
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

        // Cleanup on unmount
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
      } catch (error) {
        console.error('Firebase status setup error:', error);
      }
    };

    setupFirebaseStatus();
  }, [myUserId, myUserDetails, isInitialized, firebaseDb, addCleanup]);

  // Search functionality with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

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
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Enhanced end session with better cleanup
  const endSession = useCallback(async () => {
    console.log('Ending session...');
    
    try {
      if (activeFirebaseSessionPath && firebaseDb) {
        const { ref, set } = await import('firebase/database');
        set(ref(firebaseDb, `${activeFirebaseSessionPath}/status`), 'ended')
          .catch((err: any) => console.error('Error setting session status:', err));
        setActiveFirebaseSessionPath(null);
      }
      
      setChatMessages([]);
      setIsInVideoCall(false);
      
      // Enhanced peer connection cleanup
      if (peerConnection) {
        try {
          peerConnection.destroy();
        } catch (err) {
          console.warn('Peer destruction error (non-critical):', err);
        }
        setPeerConnection(null);
      }

      // Enhanced video stream cleanup
      [localVideoRef, remoteVideoRef].forEach(videoRef => {
        if (videoRef.current?.srcObject) {
          try {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => {
              try {
                track.stop();
              } catch (err) {
                console.warn('Track stop error (non-critical):', err);
              }
            });
            videoRef.current.srcObject = null;
          } catch (err) {
            console.warn('Video cleanup error (non-critical):', err);
          }
        }
      });

    } catch (err) {
      console.error('Session cleanup error:', err);
    }
  }, [activeFirebaseSessionPath, peerConnection, firebaseDb]);

  // Video call functionality with enhanced error handling
  const startVideoCall = useCallback(async (initiator: boolean, sessionPath: string) => {
    try {
      console.log(`Starting video call as ${initiator ? 'initiator' : 'receiver'}`);
      
      // Dynamic import SimplePeer to avoid SSR issues
      const SimplePeer = (await import('simple-peer')).default;
      
      // Request media with error handling
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 }, 
          audio: true 
        });
      } catch (mediaError) {
        console.error('Media access error:', mediaError);
        alert('Could not access camera/microphone. Please check permissions.');
        return;
      }
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer with enhanced error handling
      const peer = new SimplePeer({ 
        initiator, 
        trickle: false, 
        stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      // Enhanced error handling for peer events
      peer.on('error', (err) => {
        console.error('Peer connection error:', err);
        if (!err.message.includes('message channel closed') && 
            !err.message.includes('Extension context invalidated')) {
          console.warn('WebRTC Error (non-critical):', err.message);
        }
      });

      peer.on('signal', async (data) => {
        try {
          const { ref, push, serverTimestamp } = await import('firebase/database');
          push(ref(firebaseDb, `${sessionPath}/signals`), {
            from: myUserId,
            signal: JSON.stringify(data),
            timestamp: serverTimestamp()
          }).catch((err: any) => console.error('Signal send error:', err));
        } catch (err) {
          console.error('Signal creation error:', err);
        }
      });

      peer.on('stream', (remoteStream) => {
        console.log('Received remote stream');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      peer.on('connect', () => {
        console.log('Peer connected');
        setIsInVideoCall(true);
      });

      peer.on('close', () => {
        console.log('Peer connection closed');
        setIsInVideoCall(false);
      });

      setPeerConnection(peer);

      // Listen for signals with error handling
      const { ref, onChildAdded } = await import('firebase/database');
      const signalsRef = ref(firebaseDb, `${sessionPath}/signals`);
      const signalsUnsubscribe = onChildAdded(signalsRef, (snapshot) => {
        try {
          const signalData = snapshot.val();
          if (signalData && signalData.from !== myUserId) {
            try {
              const signal = JSON.parse(signalData.signal);
              peer.signal(signal);
            } catch (parseErr) {
              console.error('Signal parse error:', parseErr);
            }
          }
        } catch (err) {
          console.error('Signal processing error:', err);
        }
      });

      addCleanup(signalsUnsubscribe);

    } catch (err: any) {
      console.error('Video call setup error:', err);
      if (!err.message.includes('message channel closed')) {
        alert('Failed to set up video call. Please try again.');
      }
    }
  }, [myUserId, addCleanup, firebaseDb]);

  // Enhanced session setup with error handling
  const setupSession = useCallback(async (path: string, sessionType: string) => {
    console.log(`Setting up ${sessionType} session at ${path}`);
    setChatMessages([]);

    try {
      const { ref, onValue, onChildAdded } = await import('firebase/database');
      
      const messagesRef = ref(firebaseDb, `${path}/messages`);
      const messagesUnsubscribe = onChildAdded(messagesRef, (snapshot) => {
        try {
          const message = snapshot.val();
          if (message) {
            setChatMessages(prev => [...prev, message]);
          }
        } catch (err) {
          console.error('Message processing error:', err);
        }
      }, (error) => {
        console.error('Messages listener error:', error);
      });

      const sessionRef = ref(firebaseDb, path);
      const sessionUnsubscribe = onValue(sessionRef, (snapshot) => {
        try {
          const sessionData = snapshot.val();
          if (sessionData?.status === 'ended') {
            console.log('Session ended by remote party');
            endSession();
          }
        } catch (err) {
          console.error('Session status error:', err);
        }
      }, (error) => {
        console.error('Session listener error:', error);
      });

      addCleanup(messagesUnsubscribe);
      addCleanup(sessionUnsubscribe);

      if (sessionType === 'video') {
        setTimeout(() => {
          startVideoCall(myRole === 'mentor', path);
        }, 1000);
      }

    } catch (err) {
      console.error('Session setup error:', err);
    }
  }, [myRole, addCleanup, startVideoCall, endSession, firebaseDb]);

  // Enhanced Firebase listeners with error handling
  useEffect(() => {
    if (!isInitialized || !myUserId || !myRole || !firebaseDb) return;

    console.log('Setting up Firebase listeners...');

    const setupListeners = async () => {
      try {
        const { ref, onValue, onChildAdded } = await import('firebase/database');
        
        const statusesRef = ref(firebaseDb, 'user_statuses');
        const requestsRef = ref(firebaseDb, `user_notifications/${myUserId}/requests`);
        const responsesRef = ref(firebaseDb, `user_notifications/${myUserId}/responses`);

        // Online users listener with error handling
        const statusUnsubscribe = onValue(statusesRef, (snapshot) => {
          try {
            setOnlineUserStatuses(snapshot.val() || {});
          } catch (err) {
            console.error('Status update error:', err);
          }
        }, (error) => {
          console.error('Status listener error:', error);
        });

        // Requests listener with error handling
        const requestsUnsubscribe = onValue(requestsRef, (snapshot) => {
          try {
            const requests = snapshot.val() || {};
            const requestsArray = Object.entries(requests).map(([id, data]: [string, any]) => ({ id, ...data }));
            const pending = requestsArray.filter(req => req.status === 'pending' && !processedRequests.has(req.id));
            setIncomingRequests(pending);
          } catch (err) {
            console.error('Requests processing error:', err);
          }
        }, (error) => {
          console.error('Requests listener error:', error);
        });

        // Responses listener with error handling
        const responsesUnsubscribe = onChildAdded(responsesRef, (snapshot) => {
          try {
            const response = snapshot.val();
            if (response) {
              if (response.type === 'session_accepted') {
                console.log('Session accepted:', response.firebaseSessionPath);
                setActiveFirebaseSessionPath(response.firebaseSessionPath);
                setupSession(response.firebaseSessionPath, response.sessionType);
              } else if (response.type === 'session_ended') {
                console.log('Session ended by remote party');
                endSession();
              }
            }
          } catch (err) {
            console.error('Response processing error:', err);
          }
        }, (error) => {
          console.error('Responses listener error:', error);
        });

        addCleanup(statusUnsubscribe);
        addCleanup(requestsUnsubscribe);
        addCleanup(responsesUnsubscribe);

      } catch (err) {
        console.error('Firebase listeners setup error:', err);
      }
    };

    setupListeners();
  }, [isInitialized, myUserId, myRole, processedRequests, addCleanup, setupSession, endSession, firebaseDb]);

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
    if (!myUserId || myRole !== 'mentor' || !targetUserId.trim() || !firebaseDb) {
      alert('Invalid request parameters');
      return;
    }

    try {
      const { ref, push, serverTimestamp } = await import('firebase/database');
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
  }, [myUserId, myRole, firebaseDb]);

  const acceptRequest = useCallback(async (fromMentorId: string, sessionType: 'chat' | 'video', requestId: string) => {
    if (!myUserId || myRole !== 'user' || !firebaseDb) return;

    try {
      const { ref, set, push, serverTimestamp } = await import('firebase/database');
      
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
  }, [myUserId, myRole, firebaseDb]);

  const sendMessage = useCallback(async () => {
    if (!activeFirebaseSessionPath || !myUserId || !currentMessage.trim() || !firebaseDb) return;
    
    try {
      const { ref, push, serverTimestamp } = await import('firebase/database');
      await push(ref(firebaseDb, `${activeFirebaseSessionPath}/messages`), {
        from: myUserId,
        message: currentMessage.trim(),
        timestamp: serverTimestamp(),
      });
      setCurrentMessage('');
    } catch (error) {
      console.error('Send message error:', error);
    }
  }, [activeFirebaseSessionPath, myUserId, currentMessage, firebaseDb]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllCleanup();
      endSession();
    };
  }, [clearAllCleanup, endSession]);

  // Loading states
  if (userError) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h2>Error</h2>
        <p>{userError}</p>
        <button onClick={() => window.location.reload()}>Refresh</button>
      </div>
    );
  }

  if (isLoading || !isInitialized || !myUserId || !myRole || !myUserDetails) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading...</h2>
        <p>Initializing system...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#333', marginBottom: '30px' }}>Mentor/User Dashboard</h1>
      
      {/* Error notification */}
      {errors.length > 0 && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffc107', 
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          <strong>ℹ️ Browser Extension Notices</strong>
          <p style={{ margin: '5px 0 0 0' }}>
            {errors.length} non-critical errors have been suppressed (browser extensions). 
            <button 
              onClick={() => setErrors([])}
              style={{ 
                marginLeft: '10px', 
                padding: '4px 12px', 
                fontSize: '12px',
                backgroundColor: '#856404',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </p>
        </div>
      )}
      
      {/* User Info Card */}
      <div style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#495057' }}>Your Profile</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <div><strong>Name:</strong> {myUserDetails.displayName}</div>
          <div><strong>Role:</strong> <span style={{ 
            padding: '4px 8px', 
            backgroundColor: myRole === 'mentor' ? '#007bff' : '#28a745', 
            color: 'white', 
            borderRadius: '4px',
            fontSize: '12px'
          }}>{myRole.toUpperCase()}</span></div>
          <div><strong>Status:</strong> {isOnline ? '🟢 Online' : '🔴 Offline'}</div>
        </div>
      </div>

      {/* Mentor Controls */}
      {myRole === 'mentor' && (
        <div style={{ 
          marginBottom: '30px', 
          padding: '20px', 
          border: '2px solid #007bff', 
          borderRadius: '8px',
          backgroundColor: '#f8f9ff'
        }}>
          <h2 style={{ color: '#007bff', marginBottom: '20px' }}>Mentor Controls</h2>
          
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold',
              color: '#495057'
            }}>
              Search for users:
            </label>
            <input 
              type="text" 
              placeholder="Type user's name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                padding: '12px', 
                width: '100%',
                maxWidth: '400px',
                border: '2px solid #ced4da',
                borderRadius: '6px',
                fontSize: '14px',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#007bff'}
              onBlur={(e) => e.target.style.borderColor = '#ced4da'}
            />
            
            {showSearchResults && searchResults.length > 0 && (
              <div style={{
                position: 'absolute', 
                top: '100%', 
                left: 0, 
                right: 0,
                maxWidth: '400px',
                backgroundColor: 'white', 
                border: '1px solid #ccc', 
                borderRadius: '6px',
                maxHeight: '250px', 
                overflowY: 'auto', 
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                marginTop: '4px'
              }}>
                {searchResults.map((user) => (
                  <div
                    key={user.id} 
                    onClick={() => handleSelectUser(user)}
                    style={{ 
                      padding: '12px', 
                      cursor: 'pointer', 
                      borderBottom: '1px solid #eee',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <div style={{ fontWeight: 'bold', color: '#495057' }}>{user.displayName}</div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                      {user.role}{user.email ? ` • ${user.email}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold',
              color: '#495057'
            }}>
              Or enter User ID directly:
            </label>
            <input 
              type="text" 
              placeholder="Enter User ID" 
              id="targetUserId"
              style={{ 
                padding: '12px', 
                width: '100%',
                maxWidth: '400px',
                border: '2px solid #ced4da',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => {
                const input = document.getElementById('targetUserId') as HTMLInputElement;
                if (input?.value.trim()) sendRequest(input.value.trim(), 'chat');
              }} 
              style={{ 
                padding: '12px 24px', 
                backgroundColor: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#218838'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
            >
              💬 Request Chat
            </button>
            <button 
              onClick={() => {
                const input = document.getElementById('targetUserId') as HTMLInputElement;
                if (input?.value.trim()) sendRequest(input.value.trim(), 'video');
              }} 
              style={{ 
                padding: '12px 24px', 
                backgroundColor: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
            >
              📹 Request Video Call
            </button>
          </div>
        </div>
      )}

      {/* Incoming Requests */}
      {myRole === 'user' && incomingRequests.length > 0 && (
        <div style={{ 
          marginBottom: '30px', 
          padding: '20px', 
          border: '2px solid #ffc107', 
          borderRadius: '8px',
          backgroundColor: '#fffbf0'
        }}>
          <h2 style={{ color: '#856404', marginBottom: '20px' }}>📨 Incoming Requests</h2>
          {incomingRequests.map((req) => (
            <div key={req.id} style={{ 
              padding: '15px', 
              backgroundColor: '#fff3cd', 
              marginBottom: '12px', 
              borderRadius: '6px',
              border: '1px solid #ffeaa7'
            }}>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontWeight: 'bold', color: '#495057' }}>
                  From: {getUserDisplayName(req.fromMentorId)}
                </div>
                <div style={{ color: '#6c757d', fontSize: '14px' }}>
                  Type: {req.sessionType === 'chat' ? '💬 Chat' : '📹 Video Call'}
                </div>
              </div>
              <button 
                onClick={() => acceptRequest(req.fromMentorId, req.sessionType, req.id)}
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '5px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ✅ Accept {req.sessionType}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active Session */}
      {activeFirebaseSessionPath && (
        <div style={{ 
          marginBottom: '30px', 
          padding: '20px', 
          border: '2px solid #28a745', 
          borderRadius: '8px',
          backgroundColor: '#f8fff9'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <h2 style={{ color: '#28a745', margin: 0 }}>🟢 Active Session</h2>
            <button 
              onClick={endSession}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: '#dc3545', 
                color: 'white', 
                border: 'none', 
                borderRadius: '5px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ❌ End Session
            </button>
          </div>
          
          {/* Chat Interface */}
          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ color: '#495057', marginBottom: '15px' }}>💬 Messages</h3>
            <div style={{ 
              height: '250px', 
              overflowY: 'auto', 
              border: '1px solid #dee2e6', 
              padding: '15px', 
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              marginBottom: '15px'
            }}>
              {chatMessages.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#6c757d', 
                  fontStyle: 'italic',
                  marginTop: '50px'
                }}>
                  No messages yet. Start the conversation!
                </div>
              ) : (
                chatMessages.map((msg, index) => (
                  <div key={index} style={{ 
                    marginBottom: '12px', 
                    padding: '10px 15px',
                    backgroundColor: msg.from === myUserId ? '#007bff' : '#6c757d',
                    color: 'white', 
                    borderRadius: '18px',
                    maxWidth: '80%',
                    marginLeft: msg.from === myUserId ? 'auto' : '0',
                    marginRight: msg.from === myUserId ? '0' : 'auto'
                  }}>
                    <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>
                      {msg.from === myUserId ? 'You' : getUserDisplayName(msg.from)}
                    </div>
                    <div>{msg.message}</div>
                  </div>
                ))
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Type your message..." 
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  border: '2px solid #ced4da',
                  borderRadius: '25px',
                  fontSize: '14px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007bff'}
                onBlur={(e) => e.target.style.borderColor = '#ced4da'}
              />
              <button 
                onClick={sendMessage}
                disabled={!currentMessage.trim()}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: currentMessage.trim() ? '#007bff' : '#6c757d', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '25px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: currentMessage.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Send
              </button>
            </div>
          </div>

          {/* Video Interface */}
          {isInVideoCall && (
            <div>
              <h3 style={{ color: '#495057', marginBottom: '15px' }}>📹 Video Call</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: '20px' 
              }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>Your Video:</p>
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    style={{ 
                      width: '100%', 
                      maxWidth: '300px',
                      height: '200px', 
                      backgroundColor: '#000', 
                      borderRadius: '8px',
                      border: '2px solid #007bff'
                    }} 
                  />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>Remote Video:</p>
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    style={{ 
                      width: '100%', 
                      maxWidth: '300px',
                      height: '200px', 
                      backgroundColor: '#000', 
                      borderRadius: '8px',
                      border: '2px solid #28a745'
                    }} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Online Users */}
      <div style={{ 
        padding: '20px', 
        border: '1px solid #dee2e6', 
        borderRadius: '8px',
        backgroundColor: '#ffffff'
      }}>
        <h3 style={{ 
          color: '#495057', 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          👥 Online Users ({Object.keys(onlineUserStatuses).length})
        </h3>
        {Object.keys(onlineUserStatuses).length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#6c757d', 
            fontStyle: 'italic',
            padding: '30px'
          }}>
            No users currently online
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {Object.entries(onlineUserStatuses).map(([uid, data]) => (
              <div key={uid} style={{ 
                padding: '15px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '8px',
                border: '1px solid #e9ecef',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#495057' }}>
                    {data.displayName || getUserDisplayName(uid)}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>
                    {data.status === 'online' ? '🟢' : '🔴'} {data.status} • {data.role}
                  </div>
                </div>
                {myRole === 'mentor' && data.status === 'online' && uid !== myUserId && data.role === 'user' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => sendRequest(uid, 'chat')}
                      style={{ 
                        padding: '6px 12px', 
                        backgroundColor: '#28a745', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      💬 Chat
                    </button>
                    <button 
                      onClick={() => sendRequest(uid, 'video')}
                      style={{ 
                        padding: '6px 12px', 
                        backgroundColor: '#007bff', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      📹 Video
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorComponent;
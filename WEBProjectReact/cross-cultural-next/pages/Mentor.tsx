import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

// Core component with all the logic - memoized to prevent unnecessary re-renders
const MentorComponentCore = React.memo(() => {
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
  const [videoCallStatus, setVideoCallStatus] = useState<string>('');

  // Error tracking and performance monitoring
  const [errors, setErrors] = useState<string[]>([]);
  const [renderCount, setRenderCount] = useState(0);
  const [lastRenderTime, setLastRenderTime] = useState(Date.now());

  // Monitor render frequency to detect excessive re-renders
  useEffect(() => {
    const now = Date.now();
    setRenderCount(prev => prev + 1);
    setLastRenderTime(now);
    
    // Log warning if rendering too frequently
    if (renderCount > 0 && now - lastRenderTime < 100) {
      console.warn(`Fast re-render detected (${now - lastRenderTime}ms since last render)`);
    }
  });

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

  // Helper functions with proper memoization
  const getUserDisplayName = useCallback((userId: string): string => {
    const userDetails = userDetailsCache[userId];
    return userDetails ? `${userDetails.displayName} (${userDetails.role})` : userId;
  }, [userDetailsCache]);

  // Memoized computed values to prevent re-renders
  const onlineUsersCount = useMemo(() => Object.keys(onlineUserStatuses).length, [onlineUserStatuses]);
  
  const onlineUsersList = useMemo(() => {
    return Object.entries(onlineUserStatuses).map(([uid, data]) => ({
      uid,
      data,
      displayName: data.displayName || getUserDisplayName(uid)
    }));
  }, [onlineUserStatuses, getUserDisplayName]);

  // Memoized search results to prevent re-computation
  const memoizedSearchResults = useMemo(() => {
    return searchResults.map(user => ({
      ...user,
      key: user.id // Add stable key for React
    }));
  }, [searchResults]);

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

  // Firebase status management with throttling
  useEffect(() => {
    if (!myUserId || !myUserDetails || !isInitialized || !firebaseDb) return;

    console.log('Setting up Firebase status management...');
    let isActive = true;
    let lastStatusUpdate = 0;

    const setupFirebaseStatus = async () => {
      try {
        const { ref, onValue, set, serverTimestamp } = await import('firebase/database');
        
        const userStatusRef = ref(firebaseDb, `user_statuses/${myUserId}`);
        const connectedRef = ref(firebaseDb, '.info/connected');

        const updateStatus = async (status: string) => {
          const now = Date.now();
          // Throttle status updates to once per 2 seconds
          if (now - lastStatusUpdate < 2000) return;
          lastStatusUpdate = now;

          if (!isActive) return;

          try {
            await set(userStatusRef, {
              status,
              role: myUserDetails.role,
              displayName: myUserDetails.displayName,
              firstName: myUserDetails.firstName,
              lastName: myUserDetails.lastName,
              timestamp: serverTimestamp(),
            });
            
            if (status === 'online') {
              setIsOnline(true);
            } else {
              setIsOnline(false);
            }
          } catch (err) {
            console.error('Status update error:', err);
          }
        };

        let connectionTimeout: NodeJS.Timeout | null = null;
        const unsubscribe = onValue(connectedRef, (snapshot) => {
          if (!isActive) return;

          // Clear any existing timeout
          if (connectionTimeout) clearTimeout(connectionTimeout);

          if (snapshot.val()) {
            // Debounce online status updates
            connectionTimeout = setTimeout(() => {
              if (isActive) updateStatus('online');
            }, 1000);
          } else {
            setIsOnline(false);
          }
        });

        addCleanup(() => {
          isActive = false;
          if (connectionTimeout) clearTimeout(connectionTimeout);
          unsubscribe();
          
          // Set offline status on cleanup
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
        });

      } catch (error) {
        console.error('Firebase status setup error:', error);
      }
    };

    setupFirebaseStatus();

    return () => {
      isActive = false;
    };
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
      setVideoCallStatus('');
      
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

  // Video call functionality with enhanced error handling and state management
  const startVideoCall = useCallback(async (initiator: boolean, sessionPath: string) => {
    try {
      console.log(`Starting video call as ${initiator ? 'initiator' : 'receiver'}`);
      
      // Clean up any existing peer connection first
      if (peerConnection) {
        console.log('Cleaning up existing peer connection');
        try {
          peerConnection.destroy();
        } catch (err) {
          console.warn('Error destroying existing peer:', err);
        }
        setPeerConnection(null);
      }
      
      // Dynamic import SimplePeer to avoid SSR issues
      const SimplePeer = (await import('simple-peer')).default;
      
      // Request media with error handling
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            facingMode: 'user'
          }, 
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        });
      } catch (mediaError) {
        console.error('Media access error:', mediaError);
        alert('Could not access camera/microphone. Please check permissions and try again.');
        return;
      }
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer with enhanced configuration
      const peer = new SimplePeer({ 
        initiator, 
        trickle: false, 
        stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ],
          iceCandidatePoolSize: 10
        }
      });

      // Track peer connection state
      let isConnected = false;
      let isDestroyed = false;
      
      // Set up peer connection initialization status
      setVideoCallStatus('Initializing...');
      
      // Enhanced error handling for peer events
      peer.on('error', (err) => {
        console.error('Peer connection error:', err);
        setVideoCallStatus(`Error: ${err.message}`);
        
        // Don't show alerts for certain expected errors
        if (err.message.includes('message channel closed') || 
            err.message.includes('Extension context invalidated') ||
            err.message.includes('Connection failed') ||
            err.message.includes('setLocalDescription') ||
            err.message.includes('setRemoteDescription')) {
          console.warn('WebRTC Error (recoverable):', err.message);
          return;
        }
        
        // Only show user-facing errors for critical issues
        if (!isDestroyed) {
          console.error('Critical WebRTC error:', err.message);
        }
      });

      peer.on('signal', async (data) => {
        if (isDestroyed) return;
        
        setVideoCallStatus(`Signaling (${data.type || 'unknown'})...`);
        
        try {
          const { ref, push, serverTimestamp } = await import('firebase/database');
          
          // Add some metadata to help with debugging
          const signalData = {
            from: myUserId,
            signal: JSON.stringify(data),
            timestamp: serverTimestamp(),
            type: data.type || 'unknown',
            initiator: initiator
          };
          
          await push(ref(firebaseDb, `${sessionPath}/signals`), signalData);
        } catch (err) {
          console.error('Signal creation error:', err);
          setVideoCallStatus('Signal error');
        }
      });

      peer.on('stream', (remoteStream) => {
        if (isDestroyed) return;
        
        console.log('Received remote stream');
        setVideoCallStatus('Stream received');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      peer.on('connect', () => {
        if (isDestroyed) return;
        
        console.log('Peer connected successfully');
        setVideoCallStatus('Connected');
        isConnected = true;
        setIsInVideoCall(true);
      });

      peer.on('close', () => {
        console.log('Peer connection closed');
        setVideoCallStatus('Disconnected');
        isConnected = false;
        setIsInVideoCall(false);
        
        // Clean up video streams
        if (remoteVideoRef.current?.srcObject) {
          const stream = remoteVideoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          remoteVideoRef.current.srcObject = null;
        }
      });

      // Store peer connection
      setPeerConnection(peer);

      // Listen for signals with enhanced error handling and state checking
      const { ref, onChildAdded } = await import('firebase/database');
      const signalsRef = ref(firebaseDb, `${sessionPath}/signals`);
      
      const signalsUnsubscribe = onChildAdded(signalsRef, (snapshot) => {
        if (isDestroyed) return;
        
        try {
          const signalData = snapshot.val();
          if (!signalData || signalData.from === myUserId) return;
          
          try {
            const signal = JSON.parse(signalData.signal);
            
            // Check if peer is in a valid state before signaling
            if (peer.destroyed) {
              console.warn('Peer is destroyed, ignoring signal');
              return;
            }
            
            // Add a small delay for offer/answer signals to prevent race conditions
            if (signal.type === 'offer' || signal.type === 'answer') {
              setTimeout(() => {
                if (!peer.destroyed && !isDestroyed) {
                  peer.signal(signal);
                }
              }, 100);
            } else {
              // ICE candidates can be processed immediately
              peer.signal(signal);
            }
            
          } catch (parseErr) {
            console.error('Signal parse error:', parseErr);
          }
        } catch (err) {
          console.error('Signal processing error:', err);
        }
      });

      addCleanup(() => {
        isDestroyed = true;
        signalsUnsubscribe();
        if (peer && !peer.destroyed) {
          try {
            peer.destroy();
          } catch (err) {
            console.warn('Error destroying peer during cleanup:', err);
          }
        }
      });

      // Set up a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (!isConnected && !isDestroyed) {
          console.warn('Video call connection timeout');
          try {
            peer.destroy();
          } catch (err) {
            console.warn('Error destroying peer after timeout:', err);
          }
          setPeerConnection(null);
        }
      }, 30000); // 30 second timeout

      // Clean up timeout when connection succeeds
      peer.on('connect', () => {
        clearTimeout(connectionTimeout);
      });

      addCleanup(() => {
        clearTimeout(connectionTimeout);
      });

    } catch (err: any) {
      console.error('Video call setup error:', err);
      
      // Clean up on error
      if (peerConnection) {
        try {
          peerConnection.destroy();
        } catch (destroyErr) {
          console.warn('Error destroying peer after setup error:', destroyErr);
        }
        setPeerConnection(null);
      }
      
      if (!err.message.includes('message channel closed')) {
        alert('Failed to set up video call. Please try again.');
      }
    }
  }, [myUserId, addCleanup, firebaseDb, peerConnection]);

  // Enhanced session setup with error handling and better state management
  const setupSession = useCallback(async (path: string, sessionType: string) => {
    console.log(`Setting up ${sessionType} session at ${path}`);
    
    // Don't setup if already active
    if (activeFirebaseSessionPath === path) {
      console.log('Session already active for this path');
      return;
    }
    
    // Clear any existing session data
    setChatMessages([]);
    setVideoCallStatus('');

    try {
      const { ref, onValue, onChildAdded } = await import('firebase/database');
      
      const messagesRef = ref(firebaseDb, `${path}/messages`);
      let messageCount = 0;
      
      const messagesUnsubscribe = onChildAdded(messagesRef, (snapshot) => {
        try {
          const message = snapshot.val();
          if (message) {
            messageCount++;
            // Throttle message updates to prevent excessive re-renders
            setChatMessages(prev => {
              const newMessages = [...prev, message];
              // Limit to last 100 messages to prevent memory issues
              return newMessages.slice(-100);
            });
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

      // Only start video call if it's a video session and we don't already have a video call active
      if (sessionType === 'video' && !isInVideoCall && !peerConnection) {
        // Add a longer delay to ensure Firebase listeners are set up
        setTimeout(() => {
          // Double-check we still need to start the video call
          if (activeFirebaseSessionPath === path && !peerConnection) {
            startVideoCall(myRole === 'mentor', path);
          }
        }, 2000);
      }

    } catch (err) {
      console.error('Session setup error:', err);
    }
  }, [myRole, addCleanup, startVideoCall, endSession, firebaseDb, activeFirebaseSessionPath, isInVideoCall, peerConnection]);

  // Enhanced Firebase listeners with error handling and optimization
  useEffect(() => {
    if (!isInitialized || !myUserId || !myRole || !firebaseDb) return;

    console.log('Setting up Firebase listeners...');
    let isActive = true; // Flag to prevent setting state after cleanup

    const setupListeners = async () => {
      try {
        const { ref, onValue, onChildAdded } = await import('firebase/database');
        
        const statusesRef = ref(firebaseDb, 'user_statuses');
        const requestsRef = ref(firebaseDb, `user_notifications/${myUserId}/requests`);
        const responsesRef = ref(firebaseDb, `user_notifications/${myUserId}/responses`);

        // Throttle status updates to prevent excessive re-renders
        let statusUpdateTimeout: NodeJS.Timeout | null = null;
        const statusUnsubscribe = onValue(statusesRef, (snapshot) => {
          if (!isActive) return;
          
          try {
            const newStatuses = snapshot.val() || {};
            
            // Throttle updates to prevent rapid fire
            if (statusUpdateTimeout) clearTimeout(statusUpdateTimeout);
            statusUpdateTimeout = setTimeout(() => {
              if (isActive) {
                setOnlineUserStatuses((prevStatuses: any) => {
                  // Only update if there's actually a change
                  if (JSON.stringify(prevStatuses) !== JSON.stringify(newStatuses)) {
                    return newStatuses;
                  }
                  return prevStatuses;
                });
              }
            }, 500); // 500ms throttle
            
          } catch (err) {
            console.error('Status update error:', err);
          }
        }, (error) => {
          if (isActive) console.error('Status listener error:', error);
        });

        // Throttle request updates
        let requestUpdateTimeout: NodeJS.Timeout | null = null;
        const requestsUnsubscribe = onValue(requestsRef, (snapshot) => {
          if (!isActive) return;
          
          try {
            const requests = snapshot.val() || {};
            
            if (requestUpdateTimeout) clearTimeout(requestUpdateTimeout);
            requestUpdateTimeout = setTimeout(() => {
              if (isActive) {
                const requestsArray = Object.entries(requests).map(([id, data]: [string, any]) => ({ id, ...data }));
                const pending = requestsArray.filter(req => req.status === 'pending');
                
                setIncomingRequests((prevRequests: any) => {
                  // Only update if there's actually a change
                  const prevIds = prevRequests.map((r: any) => r.id).sort();
                  const newIds = pending.map(r => r.id).sort();
                  if (JSON.stringify(prevIds) !== JSON.stringify(newIds)) {
                    return pending.filter(req => !processedRequests.has(req.id));
                  }
                  return prevRequests;
                });
              }
            }, 300); // 300ms throttle
            
          } catch (err) {
            console.error('Requests processing error:', err);
          }
        }, (error) => {
          if (isActive) console.error('Requests listener error:', error);
        });

        // Use onChildAdded for responses to avoid re-processing old responses
        let lastResponseTime = Date.now();
        const responsesUnsubscribe = onChildAdded(responsesRef, (snapshot) => {
          if (!isActive) return;
          
          try {
            const response = snapshot.val();
            if (!response) return;
            
            // Only process responses that are newer than when we started listening
            const responseTime = response.timestamp?.toMillis?.() || Date.now();
            if (responseTime < lastResponseTime) return;
            
            console.log('Processing new response:', response.type);
            
            if (response.type === 'session_accepted') {
              console.log('Session accepted:', response.firebaseSessionPath);
              setActiveFirebaseSessionPath(response.firebaseSessionPath);
              setupSession(response.firebaseSessionPath, response.sessionType);
            } else if (response.type === 'session_ended') {
              console.log('Session ended by remote party');
              endSession();
            }
          } catch (err) {
            console.error('Response processing error:', err);
          }
        }, (error) => {
          if (isActive) console.error('Responses listener error:', error);
        });

        // Store cleanup functions
        const cleanup = () => {
          isActive = false;
          if (statusUpdateTimeout) clearTimeout(statusUpdateTimeout);
          if (requestUpdateTimeout) clearTimeout(requestUpdateTimeout);
          
          try {
            statusUnsubscribe();
            requestsUnsubscribe();
            responsesUnsubscribe();
          } catch (err) {
            console.warn('Listener cleanup error (non-critical):', err);
          }
        };

        addCleanup(cleanup);

        return cleanup;

      } catch (err) {
        console.error('Firebase listeners setup error:', err);
      }
    };

    setupListeners();

    return () => {
      isActive = false;
    };
  }, [isInitialized, myUserId, myRole, firebaseDb, processedRequests, addCleanup, setupSession, endSession]);

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
      
      setProcessedRequests((prev: any) => new Set([...prev, requestId]));
      
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
      setIncomingRequests((prev: any) => prev.filter((r: any) => r.id !== requestId));

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
      
      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '10px', 
          backgroundColor: '#e9ecef', 
          border: '1px solid #ced4da', 
          borderRadius: '5px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <strong>🔧 Debug Info:</strong>
          <div>Renders: {renderCount} | Last: {new Date(lastRenderTime).toLocaleTimeString()}</div>
          <div>Session: {activeFirebaseSessionPath ? '✅ Active' : '❌ None'}</div>
          <div>Video: {isInVideoCall ? '✅ Connected' : '❌ Disconnected'} | Status: {videoCallStatus}</div>
          <div>Online Users: {onlineUsersCount} | Firebase: {isOnline ? '🟢' : '🔴'}</div>
        </div>
      )}
      
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
            
            {showSearchResults && memoizedSearchResults.length > 0 && (
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
                {memoizedSearchResults.map((user) => (
                  <div
                    key={user.key} 
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
          {(isInVideoCall || videoCallStatus) && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ color: '#495057', margin: 0 }}>📹 Video Call</h3>
                {videoCallStatus && (
                  <span style={{ 
                    fontSize: '12px', 
                    color: isInVideoCall ? '#28a745' : '#6c757d',
                    fontWeight: 'bold'
                  }}>
                    Status: {videoCallStatus}
                  </span>
                )}
              </div>
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
                  {!isInVideoCall && videoCallStatus && (
                    <div style={{ 
                      marginTop: '10px', 
                      fontSize: '12px', 
                      color: '#6c757d',
                      fontStyle: 'italic'
                    }}>
                      {videoCallStatus.includes('Error') ? 
                        'Connection failed. Please try again.' : 
                        'Connecting to peer...'}
                    </div>
                  )}
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
          👥 Online Users ({onlineUsersCount})
        </h3>
        {onlineUsersCount === 0 ? (
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
            {onlineUsersList.map(({ uid, data, displayName }) => (
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
                    {displayName}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>
                    {(data as any).status === 'online' ? '🟢' : '🔴'} {(data as any).status} • {(data as any).role}
                  </div>
                </div>
                {myRole === 'mentor' && (data as any).status === 'online' && uid !== myUserId && (data as any).role === 'user' && (
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
});

export default MentorComponent;
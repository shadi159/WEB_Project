import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/app/components/Navbar';

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

// Enhanced error handler that properly handles browser extension errors
const errorHandlerCache = { current: null as any };

const getErrorHandler = (setErrors: React.Dispatch<React.SetStateAction<string[]>>) => {
  if (!errorHandlerCache.current) {
    const handleError = (message: string) => {
      if (message.includes('message channel closed') || 
          message.includes('Extension context invalidated') ||
          message.includes('listener indicated an asynchronous response') ||
          message.includes('chrome-extension://') ||
          message.includes('moz-extension://') ||
          message.includes('Attempting to use a disconnected port object')) {
        return true;
      }
      return false;
    };

    const errorHandler = (e: ErrorEvent) => {
      if (handleError(e.message)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const rejectionHandler = (e: PromiseRejectionEvent) => {
      const message = e.reason?.message || e.reason?.toString() || 'Promise rejection';
      if (handleError(message)) {
        e.preventDefault();
        return false;
      }
    };

    errorHandlerCache.current = { errorHandler, rejectionHandler };
  }
  return errorHandlerCache.current;
};

// Cached Firebase config validation
let firebaseConfigCache: FirebaseConfig | null | undefined = undefined;

const validateFirebaseConfig = (): FirebaseConfig | null => {
  if (firebaseConfigCache !== undefined) {
    return firebaseConfigCache;
  }

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
    firebaseConfigCache = null;
  } else {
    firebaseConfigCache = config;
  }

  return firebaseConfigCache;
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

// Main component wrapper with proper memoization
const MentorComponent = React.memo(() => {
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
});

// Client-side component with initialization guard
const MentorComponentInner = React.memo(() => {
  const [firebaseLoaded, setFirebaseLoaded] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [simplePeerLoaded, setSimplePeerLoaded] = useState(false);
  const initRef = useRef(false);

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
    if (initRef.current) return;
    initRef.current = true;

    const loadDependencies = async () => {
      try {
        const firebaseConfig = validateFirebaseConfig();
        if (!firebaseConfig) {
          throw new Error('Invalid Firebase configuration. Please check environment variables.');
        }

        const { initializeApp, getApps } = await import('firebase/app');
        const { getDatabase } = await import('firebase/database');
        
        const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
        const firebaseDb = getDatabase(app);
        
        (window as any).firebaseDb = firebaseDb;
        setFirebaseLoaded(true);

        const SimplePeer = await import('simple-peer');
        (window as any).SimplePeer = SimplePeer.default || SimplePeer;
        setSimplePeerLoaded(true);
        
      } catch (error) {
        console.error('Dependencies initialization error:', error);
        setFirebaseError(error instanceof Error ? error.message : 'Unknown initialization error');
      }
    };

    loadDependencies();
  }, []);

  if (firebaseError) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h2>Initialization Error</h2>
        <p>{firebaseError}</p>
        <p>Please check your environment variables and try again.</p>
      </div>
    );
  }

  if (!firebaseLoaded || !simplePeerLoaded) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading...</h2>
        <p>Initializing Firebase and WebRTC...</p>
      </div>
    );
  }

  return <MentorComponentCore />;
});

// Core component with video functionality
const MentorComponentCore = React.memo(() => {
  const firebaseDb = (window as any).firebaseDb;
  const SimplePeer = (window as any).SimplePeer;

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
  const activeSessionRef = useRef<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [processedRequests, setProcessedRequests] = useState<Set<string>>(new Set());

  // Video call state
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isCallInitiator, setIsCallInitiator] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [callStatus, setCallStatus] = useState<string>('');
  const [incomingVideoCall, setIncomingVideoCall] = useState<any>(null);

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);
  const signalingCleanupRef = useRef<(() => void) | null>(null);
  const videoCallInitializingRef = useRef(false);
  const currentCallIdRef = useRef<number | null>(null);

  // Sync ref with state
  useEffect(() => {
    activeSessionRef.current = activeFirebaseSessionPath;
  }, [activeFirebaseSessionPath]);

  // Error tracking
  const [errors, setErrors] = useState<string[]>([]);

  // Refs
  const cleanupFunctions = useRef<(() => void)[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userInitRef = useRef(false);

  // Enhanced error handling setup with stable references
  useEffect(() => {
    const { errorHandler, rejectionHandler } = getErrorHandler(setErrors);
    
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  // Cleanup management with stable references
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

  // FIXED: Simplified and clearer role-based initiation
  const determineInitiator = useCallback((myUserId: string, otherUserId: string, myRole: string): boolean => {
    console.log('🔍 determineInitiator called with:', { myUserId, otherUserId, myRole });
    
    // ALWAYS: Mentor initiates, User receives
    if (myRole === 'mentor') {
      console.log('✅ MENTOR ROLE - should initiate: TRUE');
      return true;
    } else if (myRole === 'user') {
      console.log('✅ USER ROLE - should initiate: FALSE (will receive)');
      return false;
    }
    
    // Fallback (should not happen)
    const result = myUserId.localeCompare(otherUserId) < 0;
    console.log('⚠️ FALLBACK: lexicographic comparison result:', result);
    return result;
  }, []);

  // FIXED: Extract other user ID from session path
  const getOtherUserIdFromSessionPath = useCallback((sessionPath: string, myUserId: string): string | null => {
    try {
      const pathParts = sessionPath.split('/');
      if (pathParts.length < 2) return null;
      
      const sessionPart = pathParts[1];
      const parts = sessionPart.split('_');
      
      // Find user IDs (not timestamp)
      const userIds = parts.filter(part => part !== myUserId && !/^\d+$/.test(part));
      return userIds.length > 0 ? userIds[0] : null;
    } catch (error) {
      console.error('Error extracting user ID from path:', error);
      return null;
    }
  }, []);

  // FIXED: Improved media access with better error handling
  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = devices.some(device => device.kind === 'videoinput');
      const hasAudio = devices.some(device => device.kind === 'audioinput');
      
      console.log('Available devices:', { hasVideo, hasAudio });

      if (!hasVideo && !hasAudio) {
        throw new Error('No camera or microphone devices found');
      }

      const constraints = {
        video: hasVideo ? {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 30 }
        } : false,
        audio: hasAudio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        } : false
      };

      console.log('Requesting media with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Media stream obtained:', stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })));
      
      return stream;
    } catch (error: any) {
      console.error('Media access error:', error);
      
      let errorMessage = 'Failed to access camera/microphone';
      switch (error.name) {
        case 'NotAllowedError':
          errorMessage = 'Camera/microphone access denied. Please allow access and try again.';
          break;
        case 'NotFoundError':
          errorMessage = 'No camera or microphone found.';
          break;
        case 'NotReadableError':
          errorMessage = 'Camera/microphone is already in use. Please close other applications and try again.';
          break;
        case 'OverconstrainedError':
          errorMessage = 'Camera/microphone constraints not supported.';
          break;
      }
      
      throw new Error(errorMessage);
    }
  }, []);

  // FIXED: Enhanced cleanup with proper stream disposal
  const cleanupVideoCall = useCallback((reason = 'Manual cleanup') => {
    console.log(`🧹 Cleaning up video call - Reason: ${reason}`);
    
    // Reset state flags immediately
    videoCallInitializingRef.current = false;
    currentCallIdRef.current = null;

    // Cleanup peer connection
    if (peerRef.current) {
      try {
        console.log('Destroying peer connection...');
        if (!peerRef.current.destroyed) {
          peerRef.current.destroy();
        }
      } catch (error) {
        console.warn('Error destroying peer:', error);
      }
      peerRef.current = null;
    }
    
    // Cleanup signaling listeners
    if (signalingCleanupRef.current) {
      try {
        console.log('Cleaning up signaling listeners...');
        signalingCleanupRef.current();
      } catch (error) {
        console.warn('Error cleaning up signaling:', error);
      }
      signalingCleanupRef.current = null;
    }

    // Stop and cleanup local media
    if (localStream) {
      try {
        console.log('Stopping local media tracks...');
        localStream.getTracks().forEach(track => {
          try {
            if (track.readyState !== 'ended') {
              track.stop();
            }
          } catch (trackError) {
            console.warn('Error stopping track:', trackError);
          }
        });
      } catch (error) {
        console.warn('Error stopping local stream:', error);
      }
      setLocalStream(null);
    }

    // Clear video elements
    try {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    } catch (error) {
      console.warn('Error clearing video elements:', error);
    }

    // Reset all video call state
    setRemoteStream(null);
    setIsVideoCallActive(false);
    setIsCallInitiator(false);
    setCallStatus('');
    setIncomingVideoCall(null);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);

    console.log('✅ Video call cleanup complete');
  }, [localStream]);

  // FIXED: Robust startVideoCall with improved signaling
  const startVideoCall = useCallback(async () => {
    if (!firebaseDb || !activeFirebaseSessionPath || !myUserId || !myRole) {
      console.error('❌ Missing requirements for video call');
      return;
    }
    
    if (isVideoCallActive || videoCallInitializingRef.current) {
      console.log('❌ Video call already active or initializing');
      return;
    }

    videoCallInitializingRef.current = true;
    const callId = Date.now();
    currentCallIdRef.current = callId;
    
    console.log(`🎬 Starting video call with ID: ${callId}`);
    setCallStatus('Initializing...');

    try {
      // Clean up any existing resources
      cleanupVideoCall('Starting new call');
      
      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Double-check we should still start
      if (!videoCallInitializingRef.current || currentCallIdRef.current !== callId) {
        console.log('❌ Call initialization cancelled');
        return;
      }

      // Get other user ID
      const otherUserId = getOtherUserIdFromSessionPath(activeFirebaseSessionPath, myUserId);
      if (!otherUserId) {
        throw new Error('Could not determine other user ID');
      }

      // Verify we should initiate
      const shouldInitiate = determineInitiator(myUserId, otherUserId, myRole);
      if (!shouldInitiate) {
        console.log('❌ This user should not initiate video call');
        setCallStatus('Waiting for other user to start video call...');
        videoCallInitializingRef.current = false;
        return;
      }

      setCallStatus('Requesting camera and microphone access...');
      
      // Get media stream
      const stream = await getMediaStream();
      
      // Check if call was cancelled while getting media
      if (!videoCallInitializingRef.current || currentCallIdRef.current !== callId) {
        console.log('❌ Call cancelled during media access');
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      setLocalStream(stream);
      setIsVideoCallActive(true);
      setIsCallInitiator(true);
      
      // Set local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        try {
          await localVideoRef.current.play();
        } catch (playError) {
          console.warn('Local video play error (non-critical):', playError);
        }
      }

      setCallStatus('Creating connection...');

      // Create peer with improved configuration
      const peer = new SimplePeer({
        initiator: true,
        trickle: true,
        stream: stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
          ],
          iceCandidatePoolSize: 10
        }
      });

      peerRef.current = peer;

      // Setup Firebase signaling
      const { ref, set, push, onChildAdded, serverTimestamp, remove } = await import('firebase/database');
      const signalBasePath = `${activeFirebaseSessionPath}/video_signal`;
      
      // Clear old signaling data
      try {
        await remove(ref(firebaseDb, signalBasePath));
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (removeError) {
        console.warn('Error clearing old signals:', removeError);
      }

      // Send our signals to Firebase
      peer.on('signal', async (data: any) => {
        try {
          if (currentCallIdRef.current !== callId) {
            console.log('⚠️ Ignoring signal from cancelled call');
            return;
          }
          
          console.log(`📤 Caller sending signal: ${data.type}`);
          await push(ref(firebaseDb, `${signalBasePath}/caller`), {
            signal: data,
            timestamp: serverTimestamp(),
            callId: callId,
            from: myUserId,
            role: 'caller'
          });
        } catch (error) {
          console.error('❌ Error sending signal:', error);
        }
      });

      // Listen for accepter signals
      const accepterSignalPath = `${signalBasePath}/accepter`;
      let signalCount = 0;
      
      const unsubscribe = onChildAdded(ref(firebaseDb, accepterSignalPath), (snapshot) => {
        const data = snapshot.val();
        if (!data || !data.signal || !peer || peer.destroyed) return;
        
        // Only process signals from current call
        if (data.callId !== callId) {
          console.log('⚠️ Ignoring signal from different call');
          return;
        }

        try {
          signalCount++;
          console.log(`📥 Caller processing signal #${signalCount}: ${data.signal.type}`);
          peer.signal(data.signal);
        } catch (error: any) {
          console.error('❌ Error processing remote signal:', error);
          if (error.message?.includes('cannot set remote description')) {
            setCallStatus('Connection error - please try again');
            setTimeout(() => cleanupVideoCall('Signal processing error'), 2000);
          }
        }
      });

      signalingCleanupRef.current = unsubscribe;

      // Enhanced peer event handlers
      peer.on('stream', (remoteStream: MediaStream) => {
        console.log('🎥 Caller received remote stream');
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(console.warn);
        }
        setCallStatus('Connected');
      });

      peer.on('connect', () => {
        console.log('🔗 Caller peer connected');
        setCallStatus('Connected');
      });

      peer.on('close', () => {
        console.log('🔌 Caller peer connection closed');
        cleanupVideoCall('Peer connection closed');
      });

      peer.on('error', (error: any) => {
        console.error('💥 Caller peer error:', error);
        setCallStatus(`Connection error: ${error.message}`);
        setTimeout(() => cleanupVideoCall('Peer error'), 3000);
      });

      // Send video call notification
      setCallStatus('Sending call notification...');
      await push(ref(firebaseDb, `${activeFirebaseSessionPath}/video_call_notifications`), {
        type: 'video_call_request',
        from: myUserId,
        to: otherUserId,
        callId: callId,
        timestamp: serverTimestamp()
      });

      setCallStatus('Calling...');
      console.log('📞 Video call initiated successfully');
      
      // Clear initializing flag
      videoCallInitializingRef.current = false;

      // Set a timeout for call response
      setTimeout(() => {
        if (currentCallIdRef.current === callId && !remoteStream && peer && !peer.destroyed) {
          setCallStatus('No response - call timeout');
          setTimeout(() => cleanupVideoCall('Call timeout'), 2000);
        }
      }, 30000); // 30 second timeout

    } catch (error: any) {
      console.error('💥 Error starting video call:', error);
      setCallStatus(`Failed to start call: ${error.message}`);
      cleanupVideoCall(`Start call error: ${error.message}`);
      setTimeout(() => setCallStatus(''), 5000);
    }
  }, [firebaseDb, activeFirebaseSessionPath, myUserId, myRole, isVideoCallActive, determineInitiator, getOtherUserIdFromSessionPath, getMediaStream, cleanupVideoCall, remoteStream]);

  // FIXED: Enhanced acceptVideoCall with better synchronization
  const acceptVideoCall = useCallback(async () => {
    console.log('📞 Accepting video call...');
    
    if (!firebaseDb || !activeFirebaseSessionPath || !myUserId || !incomingVideoCall) {
      console.error('❌ Missing requirements for accepting call');
      return;
    }

    if (isVideoCallActive || videoCallInitializingRef.current) {
      console.log('❌ Video call already active');
      return;
    }

    videoCallInitializingRef.current = true;
    const callId = incomingVideoCall.callId;
    currentCallIdRef.current = callId;
    
    console.log(`📞 Accepting call with ID: ${callId}`);
    setCallStatus('Accepting call...');

    try {
      // Clean up any existing resources
      cleanupVideoCall('Accepting new call');
      
      // Clear incoming call notification
      setIncomingVideoCall(null);
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Double-check we should still accept
      if (!videoCallInitializingRef.current || currentCallIdRef.current !== callId) {
        console.log('❌ Call acceptance cancelled');
        return;
      }

      setCallStatus('Requesting camera and microphone access...');
      
      // Get media stream
      const stream = await getMediaStream();
      
      // Check if call was cancelled
      if (!videoCallInitializingRef.current || currentCallIdRef.current !== callId) {
        console.log('❌ Call cancelled during media access');
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      setLocalStream(stream);
      setIsVideoCallActive(true);
      setIsCallInitiator(false);
      
      // Set local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        try {
          await localVideoRef.current.play();
        } catch (playError) {
          console.warn('Local video play error (non-critical):', playError);
        }
      }

      setCallStatus('Connecting...');

      // Wait longer for caller signals to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create peer - accepter is never initiator
      const peer = new SimplePeer({
        initiator: false,
        trickle: true,
        stream: stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
          ],
          iceCandidatePoolSize: 10
        }
      });

      peerRef.current = peer;

      // Setup Firebase signaling
      const { ref, onValue, push, onChildAdded, serverTimestamp } = await import('firebase/database');
      const signalBasePath = `${activeFirebaseSessionPath}/video_signal`;

      // Send our signals to Firebase
      peer.on('signal', async (data: any) => {
        try {
          if (currentCallIdRef.current !== callId) {
            console.log('⚠️ Ignoring signal from cancelled call');
            return;
          }
          
          console.log(`📤 Accepter sending signal: ${data.type}`);
          await push(ref(firebaseDb, `${signalBasePath}/accepter`), {
            signal: data,
            timestamp: serverTimestamp(),
            callId: callId,
            from: myUserId,
            role: 'accepter'
          });
        } catch (error) {
          console.error('❌ Error sending signal:', error);
        }
      });

      // Process existing caller signals first
      console.log('📥 Processing existing caller signals...');
      const callerSignalPath = `${signalBasePath}/caller`;
      
      try {
        const existingSignalsSnapshot = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
          onValue(ref(firebaseDb, callerSignalPath), (snapshot) => {
            clearTimeout(timeout);
            resolve(snapshot);
          }, { onlyOnce: true });
        });
        
        const existingSignals = (existingSignalsSnapshot as any).val();
        if (existingSignals && !peer.destroyed) {
          const signals = Object.values(existingSignals)
            .filter((signalData: any) => 
              signalData.callId === callId && 
              signalData.role === 'caller'
            )
            .sort((a: any, b: any) => {
              const aTime = a.timestamp?.seconds || a.timestamp || 0;
              const bTime = b.timestamp?.seconds || b.timestamp || 0;
              return aTime - bTime;
            });

          console.log(`📥 Processing ${signals.length} existing caller signals`);
          for (const signalData of signals) {
            try {
              console.log(`📥 Processing existing signal: ${(signalData as any).signal.type}`);
              peer.signal((signalData as any).signal);
              await new Promise(resolve => setTimeout(resolve, 200)); // Wait between signals
            } catch (error) {
              console.error('❌ Error processing existing signal:', error);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error processing existing signals:', error);
      }

      // Listen for new caller signals
      console.log('👂 Setting up listener for new caller signals...');
      const unsubscribe = onChildAdded(ref(firebaseDb, callerSignalPath), (snapshot) => {
        const data = snapshot.val();
        if (!data || !data.signal || !peer || peer.destroyed) return;
        
        if (data.callId !== callId) {
          console.log('⚠️ Ignoring signal from different call');
          return;
        }

        try {
          console.log(`📥 Accepter processing new signal: ${data.signal.type}`);
          peer.signal(data.signal);
        } catch (error: any) {
          console.error('❌ Error processing new signal:', error);
        }
      });

      signalingCleanupRef.current = unsubscribe;

      // Enhanced peer event handlers
      peer.on('stream', (remoteStream: MediaStream) => {
        console.log('🎥 Accepter received remote stream');
        setRemoteStream(remoteStream);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(console.warn);
        }
        setCallStatus('Connected');
      });

      peer.on('connect', () => {
        console.log('🔗 Accepter peer connected');
        setCallStatus('Connected');
      });

      peer.on('close', () => {
        console.log('🔌 Accepter peer connection closed');
        cleanupVideoCall('Peer connection closed');
      });

      peer.on('error', (error: any) => {
        console.error('💥 Accepter peer error:', error);
        setCallStatus(`Connection error: ${error.message}`);
        setTimeout(() => cleanupVideoCall('Peer error'), 3000);
      });

      console.log('✅ Call acceptance setup complete');
      videoCallInitializingRef.current = false;

    } catch (error: any) {
      console.error('💥 Error accepting video call:', error);
      setCallStatus(`Failed to accept call: ${error.message}`);
      cleanupVideoCall(`Accept call error: ${error.message}`);
      setTimeout(() => setCallStatus(''), 5000);
    }
  }, [firebaseDb, activeFirebaseSessionPath, myUserId, incomingVideoCall, isVideoCallActive, getMediaStream, cleanupVideoCall]);

  // FIXED: Simple endVideoCall wrapper
  const endVideoCall = useCallback(() => {
    cleanupVideoCall('User ended call');
  }, [cleanupVideoCall]);

  // Media control functions
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log('📹 Video toggled:', videoTrack.enabled ? 'ON' : 'OFF');
      }
    }
  }, [localStream]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log('🎤 Audio toggled:', audioTrack.enabled ? 'ON' : 'OFF');
      }
    }
  }, [localStream]);

  // Memoized computed values
  const onlineUsersCount = useMemo(() => Object.keys(onlineUserStatuses).length, [onlineUserStatuses]);
  
  const onlineUsersList = useMemo(() => {
    return Object.entries(onlineUserStatuses).map(([uid, data]) => ({
      uid,
      data,
      displayName: data.displayName || getUserDisplayName(uid)
    }));
  }, [onlineUserStatuses, getUserDisplayName]);

  const memoizedSearchResults = useMemo(() => {
    return searchResults.map(user => ({
      ...user,
      key: user.id
    }));
  }, [searchResults]);

  // User initialization
  useEffect(() => {
    if (userInitRef.current) return;
    userInitRef.current = true;

    const initUser = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
          throw new Error('No user data found');
        }

        const parsedUser = JSON.parse(storedUser);
        const userId = parsedUser._id || parsedUser.id;
        let userRole = parsedUser.role;

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
            // Fallback
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
        
        setActiveFirebaseSessionPath(null);
        activeSessionRef.current = null;
        setChatMessages([]);
        
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
          if (now - lastStatusUpdate < 5000) return;
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
            
            setIsOnline(status === 'online');
          } catch (err) {
            console.error('Status update error:', err);
          }
        };

        let connectionTimeout: NodeJS.Timeout | null = null;
        const unsubscribe = onValue(connectedRef, (snapshot) => {
          if (!isActive) return;

          if (connectionTimeout) clearTimeout(connectionTimeout);

          if (snapshot.val()) {
            connectionTimeout = setTimeout(() => {
              if (isActive) updateStatus('online');
            }, 3000);
          } else {
            setIsOnline(false);
          }
        });

        addCleanup(() => {
          isActive = false;
          if (connectionTimeout) clearTimeout(connectionTimeout);
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

  // Search functionality
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
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Session management
  const endSession = useCallback(async () => {
    console.log('Ending session...', activeSessionRef.current);
    
    try {
      // End video call if active
      if (isVideoCallActive) {
        cleanupVideoCall('Session ended');
      }
      
      const currentSessionPath = activeSessionRef.current;
      if (currentSessionPath && firebaseDb) {
        const { ref, set } = await import('firebase/database');
        set(ref(firebaseDb, `${currentSessionPath}/status`), 'ended')
          .catch((err: any) => console.error('Error setting session status:', err));
      }
      
      setActiveFirebaseSessionPath(null);
      activeSessionRef.current = null;
      setChatMessages([]);

    } catch (err) {
      console.error('Session cleanup error:', err);
    }
  }, [firebaseDb, isVideoCallActive, cleanupVideoCall]);

  const setupSession = useCallback(async (path: string, sessionType: string) => {
    console.log(`Setting up ${sessionType} session at ${path}`);
    
    if (activeSessionRef.current === path) {
      console.log('Session already active for this path');
      return;
    }
    
    setChatMessages([]);

    try {
      const { ref, onChildAdded, onValue } = await import('firebase/database');
      
      const messagesRef = ref(firebaseDb, `${path}/messages`);
      const videoCallNotificationsRef = ref(firebaseDb, `${path}/video_call_notifications`);
      
      const messagesUnsubscribe = onChildAdded(messagesRef, (snapshot) => {
        try {
          const message = snapshot.val();
          if (message) {
            setChatMessages(prev => {
              const messageExists = prev.some(msg => 
                msg.from === message.from && 
                msg.message === message.message && 
                Math.abs((msg.timestamp?.toMillis?.() || 0) - (message.timestamp?.toMillis?.() || 0)) < 1000
              );
              
              if (!messageExists) {
                const newMessages = [...prev, message];
                return newMessages.slice(-100);
              }
              return prev;
            });
          }
        } catch (err) {
          console.error('Message processing error:', err);
        }
      });

      // FIXED: Enhanced video call notification handler
      const videoCallUnsubscribe = onChildAdded(videoCallNotificationsRef, (snapshot) => {
        try {
          const notification = snapshot.val();
          
          console.log('📞 Video call notification received:', notification);
          
          if (notification && 
              notification.from !== myUserId && 
              notification.type === 'video_call_request') {
            
            const otherUserId = notification.from;
            const shouldWeInitiate = determineInitiator(myUserId!, otherUserId, myRole!);
            
            console.log('📞 Should we initiate?', shouldWeInitiate);
            
            if (shouldWeInitiate) {
              console.log('❌ We should initiate, ignoring incoming call notification');
              return;
            }
            
            // Only users should receive incoming call notifications
            if (myRole === 'user') {
              console.log('✅ Setting incoming video call for user');
              setIncomingVideoCall(notification);
            }
          }
        } catch (err) {
          console.error('Video call notification error:', err);
        }
      });

      const sessionRef = ref(firebaseDb, `${path}/status`);
      const sessionUnsubscribe = onValue(sessionRef, (snapshot) => {
        try {
          const sessionStatus = snapshot.val();
          
          if (sessionStatus === 'ended' && 
              activeFirebaseSessionPath === path && 
              !isVideoCallActive) {
            console.log('Session ended by remote party');
            endSession();
          }
        } catch (err) {
          console.error('Session status error:', err);
        }
      });

      const sessionCleanup = () => {
        try {
          messagesUnsubscribe();
          videoCallUnsubscribe();
          sessionUnsubscribe();
        } catch (err) {
          console.warn('Session cleanup error:', err);
        }
      };

      addCleanup(sessionCleanup);

    } catch (err) {
      console.error('Session setup error:', err);
    }
  }, [addCleanup, endSession, firebaseDb, activeFirebaseSessionPath, myUserId, myRole, isVideoCallActive, determineInitiator]);

  // Firebase listeners
  useEffect(() => {
    if (!isInitialized || !myUserId || !myRole || !firebaseDb) return;

    console.log('Setting up Firebase listeners...');
    let isActive = true;
    let listenersSetup = false;

    const setupListeners = async () => {
      if (listenersSetup) return;
      listenersSetup = true;

      try {
        const { ref, onValue, onChildAdded } = await import('firebase/database');
        
        const statusesRef = ref(firebaseDb, 'user_statuses');
        const requestsRef = ref(firebaseDb, `user_notifications/${myUserId}/requests`);
        const responsesRef = ref(firebaseDb, `user_notifications/${myUserId}/responses`);

        let statusUpdateTimeout: NodeJS.Timeout | null = null;
        const statusUnsubscribe = onValue(statusesRef, (snapshot) => {
          if (!isActive) return;
          
          try {
            const newStatuses = snapshot.val() || {};
            
            if (statusUpdateTimeout) clearTimeout(statusUpdateTimeout);
            statusUpdateTimeout = setTimeout(() => {
              if (isActive) {
                setOnlineUserStatuses(newStatuses);
              }
            }, 2000);
            
          } catch (err) {
            console.error('Status update error:', err);
          }
        });

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
                setIncomingRequests(pending.filter(req => !processedRequests.has(req.id)));
              }
            }, 1000);
            
          } catch (err) {
            console.error('Requests processing error:', err);
          }
        });
        
        let processedResponseIds = new Set<string>();
        const listenerStartTime = Date.now();

        const responsesUnsubscribe = onChildAdded(responsesRef, (snapshot) => {
          if (!isActive) return;
          
          try {
            const response = snapshot.val();
            const responseId = snapshot.key;
            
            if (!response || !responseId) return;
            
            if (processedResponseIds.has(responseId)) {
              return;
            }
            
            let responseTime = 0;
            if (response.timestamp) {
              if (typeof response.timestamp === 'number') {
                responseTime = response.timestamp;
              } else if (response.timestamp.toMillis) {
                responseTime = response.timestamp.toMillis();
              } else if (response.timestamp.seconds) {
                responseTime = response.timestamp.seconds * 1000;
              }
            }
            
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            if (responseTime > 0 && responseTime < oneHourAgo) {
              console.log('Ignoring very old response:', responseId);
              return;
            }
            
            const sessionStartThreshold = listenerStartTime - (5 * 60 * 1000);
            if (responseTime > 0 && responseTime < sessionStartThreshold) {
              console.log('Ignoring pre-session response:', responseId);
              return;
            }
            
            processedResponseIds.add(responseId);
            console.log('Processing response:', response.type, responseId);
            
            if (response.type === 'session_accepted') {
              console.log('Session accepted:', response.firebaseSessionPath);
              if (!activeSessionRef.current) {
                setActiveFirebaseSessionPath(response.firebaseSessionPath);
                setupSession(response.firebaseSessionPath, response.sessionType);
              } else {
                console.log('Session already active, ignoring');
              }
            } else if (response.type === 'session_ended') {
              console.log('Session ended by remote party');
              if (activeSessionRef.current && response.firebaseSessionPath === activeSessionRef.current) {
                endSession();
              }
            }
          } catch (err) {
            console.error('Response processing error:', err);
          }
        });

        const cleanup = () => {
          isActive = false;
          listenersSetup = false;
          if (statusUpdateTimeout) clearTimeout(statusUpdateTimeout);
          if (requestUpdateTimeout) clearTimeout(requestUpdateTimeout);
          
          try {
            statusUnsubscribe();
            requestsUnsubscribe();
            responsesUnsubscribe();
          } catch (err) {
            console.warn('Listener cleanup error:', err);
          }
        };

        addCleanup(cleanup);

      } catch (err) {
        console.error('Firebase listeners setup error:', err);
      }
    };

    setupListeners();

    return () => {
      isActive = false;
    };
  }, [isInitialized, myUserId, myRole, firebaseDb, setupSession, addCleanup, endSession, processedRequests]);

  // Helper functions
  const handleSelectUser = useCallback((user: UserDetails) => {
    const input = document.getElementById('targetUserId') as HTMLInputElement;
    if (input) input.value = user.id;
    setSearchQuery('');
    setShowSearchResults(false);
  }, []);

  const sendRequest = useCallback(async (targetUserId: string, requestType: 'chat' | 'video' = 'chat') => {
    if (!myUserId || myRole !== 'mentor' || !targetUserId.trim() || !firebaseDb) {
      alert('Invalid request parameters');
      return;
    }

    try {
      const { ref, push, serverTimestamp } = await import('firebase/database');
      await push(ref(firebaseDb, `user_notifications/${targetUserId}/requests`), {
        type: 'session_request',
        fromMentorId: myUserId,
        sessionType: requestType,
        timestamp: serverTimestamp(),
        status: 'pending'
      });
      alert(`${requestType === 'video' ? 'Video call' : 'Chat'} request sent!`);
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
      cleanupVideoCall('Component unmounting');
      endSession();
    };
  }, [clearAllCleanup, cleanupVideoCall, endSession]);

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
    <div>
      {/* Fixed navbar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
        <Navbar />
      </div>
      
      {/* Main content */}
      <div style={{ 
        paddingTop: '80px',
        padding: '20px', 
        maxWidth: '1200px', 
        margin: '0 auto', 
        fontFamily: 'Arial, sans-serif' 
      }}>
        <h1 style={{ color: '#333', marginBottom: '30px' }}>Mentor/User Chat & Video Dashboard</h1>
        
        {/* Debug info */}
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f0f0f0', 
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '12px',
          marginBottom: '20px'
        }}>
          <strong>🔍 DEBUG STATE:</strong><br/>
          My Role: {myRole} | User ID: {myUserId}<br/>
          Incoming Video Call: {incomingVideoCall ? 'YES' : 'NO'}<br/>
          Video Call Active: {isVideoCallActive ? 'YES' : 'NO'}<br/>
          Active Session: {activeFirebaseSessionPath ? 'YES' : 'NO'}<br/>
          Call Status: {callStatus || 'None'}<br/>
          {incomingVideoCall && (
            <>Call From: {incomingVideoCall.from} | Call ID: {incomingVideoCall.callId}</>
          )}
        </div>
        
        {/* Error notifications */}
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
              {errors.length} non-critical errors suppressed. 
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
        
        {/* User profile card */}
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

        {/* FIXED: Incoming video call notification */}
        {incomingVideoCall && !isVideoCallActive && (
          <div style={{ 
            marginBottom: '30px', 
            padding: '20px', 
            border: '3px solid #17a2b8', 
            borderRadius: '8px',
            backgroundColor: '#d1ecf1',
            animation: 'pulse 2s infinite'
          }}>
            <h2 style={{ color: '#0c5460', margin: '0 0 10px 0' }}>
              📹 Incoming Video Call
            </h2>
            <p style={{ margin: 0, fontSize: '16px', color: '#0c5460' }}>
              From: {getUserDisplayName(incomingVideoCall.from)}
            </p>
            <p style={{ fontSize: '12px', color: '#6c757d', margin: '5px 0' }}>
              Call ID: {incomingVideoCall.callId}
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button 
                onClick={acceptVideoCall}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                ❌ Decline
              </button>
            </div>
          </div>
        )}

        {/* Mentor controls */}
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
                  backgroundColor: '#17a2b8', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#138496'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#17a2b8'}
              >
                📹 Request Video Call
              </button>
            </div>
          </div>
        )}

        {/* Incoming requests */}
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
                    Type: {req.sessionType === 'video' ? '📹 Video Call' : '💬 Chat Session'}
                  </div>
                </div>
                <button 
                  onClick={() => acceptRequest(req.fromMentorId, req.sessionType, req.id)}
                  style={{ 
                    padding: '10px 20px', 
                    backgroundColor: req.sessionType === 'video' ? '#17a2b8' : '#28a745', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '5px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {req.sessionType === 'video' ? '📹 Accept Video Call' : '✅ Accept Chat'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Active session */}
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
              <h2 style={{ color: '#28a745', margin: 0 }}>
                🟢 Active {isVideoCallActive ? 'Video Call' : 'Chat'} Session
              </h2>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {!isVideoCallActive && (
                  <button 
                    onClick={startVideoCall}
                    disabled={videoCallInitializingRef.current}
                    style={{ 
                      padding: '10px 20px', 
                      backgroundColor: videoCallInitializingRef.current ? '#6c757d' : '#17a2b8', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '5px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: videoCallInitializingRef.current ? 'not-allowed' : 'pointer'
                    }}
                  >
                    📹 {videoCallInitializingRef.current ? 'Starting...' : 'Start Video Call'}
                  </button>
                )}
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
            </div>

            {/* Debug info */}
            <div style={{ 
              marginBottom: '15px', 
              padding: '10px', 
              backgroundColor: '#e9ecef', 
              borderRadius: '4px',
              fontSize: '12px',
              color: '#495057'
            }}>
              <strong>Debug:</strong> Session: {activeFirebaseSessionPath ? '✅' : '❌'} | 
              Video Active: {isVideoCallActive ? '✅' : '❌'} | 
              Local Stream: {localStream ? '✅' : '❌'} | 
              Remote Stream: {remoteStream ? '✅' : '❌'} | 
              Call Status: {callStatus || 'None'} |
              Initializing: {videoCallInitializingRef.current ? '✅' : '❌'}
            </div>

            {/* Video call interface */}
            {isVideoCallActive && (
              <div style={{ marginBottom: '25px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '15px',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <h3 style={{ color: '#495057', margin: 0 }}>📹 Video Call</h3>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>
                    Status: {callStatus || 'Connected'}
                  </div>
                </div>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                  gap: '15px', 
                  marginBottom: '15px' 
                }}>
                  {/* Local video */}
                  <div style={{ position: 'relative' }}>
                    <video 
                      ref={localVideoRef}
                      autoPlay 
                      muted 
                      playsInline
                      style={{ 
                        width: '100%', 
                        height: '250px', 
                        backgroundColor: '#000', 
                        borderRadius: '8px',
                        objectFit: 'cover'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '10px',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      You {!isVideoEnabled && '(Video Off)'} {!isAudioEnabled && '(Muted)'}
                    </div>
                  </div>

                  {/* Remote video */}
                  <div style={{ position: 'relative' }}>
                    <video 
                      ref={remoteVideoRef}
                      autoPlay 
                      playsInline
                      style={{ 
                        width: '100%', 
                        height: '250px', 
                        backgroundColor: '#000', 
                        borderRadius: '8px',
                        objectFit: 'cover'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '10px',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      Remote User
                    </div>
                    {!remoteStream && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'white',
                        fontSize: '14px',
                        textAlign: 'center'
                      }}>
                        Waiting for remote video...
                      </div>
                    )}
                  </div>
                </div>

                {/* Video controls */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: '10px', 
                  marginBottom: '20px',
                  flexWrap: 'wrap'
                }}>
                  <button 
                    onClick={toggleVideo}
                    style={{ 
                      padding: '10px 15px', 
                      backgroundColor: isVideoEnabled ? '#28a745' : '#dc3545', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '25px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      minWidth: '120px'
                    }}
                  >
                    {isVideoEnabled ? '📹 Video On' : '📹 Video Off'}
                  </button>
                  <button 
                    onClick={toggleAudio}
                    style={{ 
                      padding: '10px 15px', 
                      backgroundColor: isAudioEnabled ? '#28a745' : '#dc3545', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '25px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      minWidth: '120px'
                    }}
                  >
                    {isAudioEnabled ? '🎤 Mic On' : '🎤 Mic Off'}
                  </button>
                  <button 
                    onClick={endVideoCall}
                    style={{ 
                      padding: '10px 15px', 
                      backgroundColor: '#dc3545', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '25px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      minWidth: '120px'
                    }}
                  >
                    ❌ End Call
                  </button>
                </div>
              </div>
            )}
            
            {/* Chat interface */}
            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ color: '#495057', marginBottom: '15px' }}>💬 Messages</h3>
              <div style={{ 
                height: isVideoCallActive ? '200px' : '350px', 
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
          </div>
        )}

        {/* Online users */}
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
                          backgroundColor: '#17a2b8', 
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

        {/* Add pulse animation for incoming call */}
        <style jsx>{`
          @keyframes pulse {
            0% {
              box-shadow: 0 0 0 0 rgba(23, 162, 184, 0.7);
            }
            70% {
              box-shadow: 0 0 0 10px rgba(23, 162, 184, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(23, 162, 184, 0);
            }
          }
        `}</style>
      </div>
    </div>
  );
});

// Add display names for easier debugging
MentorComponent.displayName = 'MentorComponent';
MentorComponentInner.displayName = 'MentorComponentInner';
MentorComponentCore.displayName = 'MentorComponentCore';

export default MentorComponent;
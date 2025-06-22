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
      // More comprehensive browser extension error detection
      if (message.includes('message channel closed') || 
          message.includes('Extension context invalidated') ||
          message.includes('listener indicated an asynchronous response') ||
          message.includes('chrome-extension://') ||
          message.includes('moz-extension://') ||
          message.includes('Attempting to use a disconnected port object')) {
        // Silently handle these errors without adding to error list
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
    // Prevent multiple initializations
    if (initRef.current) return;
    initRef.current = true;

    const loadDependencies = async () => {
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

        // Load simple-peer
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
  // Get Firebase instance from window
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

// Add a ref to track video call initialization state
const videoCallInitializingRef = useRef(false);

// Fixed startVideoCall with race condition prevention
const startVideoCall = useCallback(async () => {
  if (!firebaseDb || !activeFirebaseSessionPath || !myUserId) return;
  
  // Prevent multiple simultaneous calls - CRITICAL CHECK
  if (isVideoCallActive || videoCallInitializingRef.current) {
    console.log('Video call already active or initializing, ignoring start request');
    return;
  }

  // Set initializing flag IMMEDIATELY to prevent race conditions
  videoCallInitializingRef.current = true;
  console.log('Starting video call...');
  setCallStatus('Initializing...');

  try {
    // First, clean up any existing streams to avoid "device in use" errors
    if (localStream) {
      console.log('Cleaning up existing local stream...');
      localStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      setLocalStream(null);
    }

    // Clean up any existing peer connection
    if (peerRef.current) {
      console.log('Cleaning up existing peer connection...');
      try {
        if (!peerRef.current.destroyed) {
          peerRef.current.destroy();
        }
      } catch (e) {
        console.warn('Error destroying existing peer:', e);
      }
      peerRef.current = null;
    }

    // Wait longer for devices to be completely released
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Double-check we're still supposed to start the call
    if (!videoCallInitializingRef.current) {
      console.log('Video call initialization was cancelled');
      return;
    }

    setIsVideoCallActive(true);
    setIsCallInitiator(true);
    setCallStatus('Requesting camera and microphone access...');
    
    // Get user media with enhanced error handling
    let stream: MediaStream;
    try {
      // Try to get available devices first
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = devices.some(device => device.kind === 'videoinput');
      const hasAudio = devices.some(device => device.kind === 'audioinput');
      
      if (!hasVideo && !hasAudio) {
        throw new Error('No camera or microphone devices found');
      }

      stream = await navigator.mediaDevices.getUserMedia({ 
        video: hasVideo ? { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } : false, 
        audio: hasAudio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      });
    } catch (mediaError: any) {
      console.error('Media access error:', mediaError);
      let errorMessage = 'Failed to access camera/microphone';
      
      if (mediaError.name === 'NotAllowedError') {
        errorMessage = 'Camera/microphone access denied. Please allow access and try again.';
      } else if (mediaError.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found.';
      } else if (mediaError.name === 'NotReadableError') {
        errorMessage = 'Camera/microphone is already in use. Please close other applications using the camera and try again.';
      } else if (mediaError.name === 'OverconstrainedError') {
        errorMessage = 'Camera/microphone constraints not supported.';
      }
      
      setCallStatus(errorMessage);
      setIsVideoCallActive(false);
      setIsCallInitiator(false);
      videoCallInitializingRef.current = false;
      
      // Auto-clear error after 5 seconds
      setTimeout(() => setCallStatus(''), 5000);
      return;
    }
    
    console.log('Got media stream, setting local video...');
    setLocalStream(stream);
    
    // Set local video with error handling
    if (localVideoRef.current) {
      try {
        localVideoRef.current.srcObject = stream;
        // Wait for video to start playing
        await new Promise((resolve, reject) => {
          if (!localVideoRef.current) {
            reject(new Error('Video element not found'));
            return;
          }
          
          localVideoRef.current.onloadedmetadata = () => resolve(true);
          localVideoRef.current.onerror = reject;
          
          // Timeout after 5 seconds
          setTimeout(() => reject(new Error('Video load timeout')), 5000);
        });
      } catch (videoError) {
        console.error('Error setting local video:', videoError);
      }
    }

    setCallStatus('Initializing video call...');

    // Determine other user ID
    const getOtherUserIdFromSessionPath = (sessionPath: string, myUserId: string): string | null => {
    // Session path format: live_sessions/userId1_userId2_timestamp
    // Extract the part after 'live_sessions/'
    const pathParts = sessionPath.split('/');
    if (pathParts.length < 2) return null;
    
    const sessionPart = pathParts[1]; // Gets "userId1_userId2_timestamp"
    const userIds = sessionPart.split('_');
    
    // Find the other user ID (not mine and not the timestamp)
    for (const id of userIds) {
      // Skip if it's my ID, or if it looks like a timestamp (all numbers)
      if (id !== myUserId && !/^\d+$/.test(id)) {
        return id;
      }
    }
    
    return null;
  };

  const otherUserId = activeFirebaseSessionPath 
    ? getOtherUserIdFromSessionPath(activeFirebaseSessionPath, myUserId)
    : null;

  console.log('Session path:', activeFirebaseSessionPath);
  console.log('My user ID:', myUserId);
  console.log('Detected other user ID:', otherUserId);

  if (!otherUserId) {
    throw new Error(`Could not determine other user ID from session path: ${activeFirebaseSessionPath}`);
  }

    console.log(`Video call initiator decision: true (myRole: ${myRole}, myUserId: ${myUserId}, otherUserId: ${otherUserId})`);

    // Clear any existing signaling data
    const { ref, set, push, onChildAdded, serverTimestamp, remove } = await import('firebase/database');
    const signalBasePath = `${activeFirebaseSessionPath}/video_signal`;
    
    try {
      await remove(ref(firebaseDb, signalBasePath));
    } catch (removeError) {
      console.warn('Error clearing signaling data:', removeError);
    }
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create peer connection with enhanced config
    const peer = new SimplePeer({
      initiator: true,
      trickle: true,
      stream: stream,
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

    peerRef.current = peer;
    const callId = Date.now();

    // Enhanced signaling with better error handling
    peer.on('signal', async (data: any) => {
      try {
        console.log('Caller sending signal:', data.type);
        await push(ref(firebaseDb, `${signalBasePath}/${myUserId}`), {
          signal: data,
          timestamp: serverTimestamp(),
          callId: callId,
          isInitiator: true,
          role: 'caller'
        });
      } catch (error) {
        console.error('Error sending signal:', error);
      }
    });

    // Listen for remote signals with improved filtering
    const remoteSignalPath = `${signalBasePath}/${otherUserId}`;
    let signalCount = 0;
    
    const unsubscribe = onChildAdded(ref(firebaseDb, remoteSignalPath), (snapshot) => {
      const data = snapshot.val();
      if (!data || !data.signal || !peer || peer.destroyed) return;
      
      // Only process signals from the current call
      if (data.callId && data.callId !== callId) {
        console.log('Ignoring signal from different call');
        return;
      }

      try {
        signalCount++;
        console.log(`Processing remote signal #${signalCount}:`, data.signal.type, 'from role:', data.role);
        peer.signal(data.signal);
      } catch (error: any) {
        console.error('Error processing remote signal:', error);
        if (error?.message?.includes('have-remote-offer')) {
          console.log('WebRTC state error - ending call');
          endVideoCall();
        }
      }
    });

    signalingCleanupRef.current = unsubscribe;

    // Enhanced peer event handlers
    peer.on('stream', (remoteStream: MediaStream) => {
      console.log('Caller received remote stream');
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      setCallStatus('Connected');
    });

    peer.on('connect', () => {
      console.log('Caller peer connected');
      setCallStatus('Connected');
    });

    peer.on('close', () => {
      console.log('Caller peer connection closed');
      endVideoCall();
    });

    peer.on('error', (error: any) => {
      console.error('Caller peer error:', error);
      setCallStatus('Connection error: ' + error.message);
      setTimeout(() => endVideoCall(), 3000);
    });

    // Notify other user about video call
    await push(ref(firebaseDb, `${activeFirebaseSessionPath}/video_call_notifications`), {
      type: 'video_call_request',
      from: myUserId,
      callId: callId,
      initiatorRole: true,
      timestamp: serverTimestamp()
    });

    setCallStatus('Waiting for response...');
    
    // Clear initializing flag only after successful setup
    videoCallInitializingRef.current = false;

  } catch (error: any) {
    console.error('Error starting video call:', error);
    setCallStatus('Failed to start video call: ' + error.message);
    
    // Clean up on error
    if (localStream) {
      localStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      setLocalStream(null);
    }
    
    setIsVideoCallActive(false);
    setIsCallInitiator(false);
    videoCallInitializingRef.current = false; // Clear flag on error
    
    // Auto-clear error message after 5 seconds
    setTimeout(() => setCallStatus(''), 5000);
  }
}, [firebaseDb, activeFirebaseSessionPath, myUserId, isVideoCallActive, myRole, localStream]);

// Fixed acceptVideoCall with race condition prevention
// COMPLETE FIXED acceptVideoCall function
// Replace your entire acceptVideoCall function with this:

const acceptVideoCall = useCallback(async () => {
  if (!firebaseDb || !activeFirebaseSessionPath || !myUserId || !incomingVideoCall) return;

  // Prevent multiple simultaneous accepts
  if (isVideoCallActive || videoCallInitializingRef.current) {
    console.log('Video call already active or initializing, ignoring accept request');
    return;
  }

  videoCallInitializingRef.current = true;
  console.log('Accepting video call from:', incomingVideoCall.from);
  setCallStatus('Accepting video call...');

  try {
    // Clean up any existing streams first
    if (localStream) {
      console.log('Cleaning up existing local stream...');
      localStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      setLocalStream(null);
    }

    // Clean up any existing peer
    if (peerRef.current) {
      try {
        if (!peerRef.current.destroyed) {
          peerRef.current.destroy();
        }
      } catch (e) {
        console.warn('Error destroying existing peer:', e);
      }
      peerRef.current = null;
    }

    // Wait longer for devices to be released
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsVideoCallActive(true);
    setIsCallInitiator(false);
    setIncomingVideoCall(null);
    
    // Get user media with enhanced error handling
    let stream: MediaStream;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = devices.some(device => device.kind === 'videoinput');
      const hasAudio = devices.some(device => device.kind === 'audioinput');

      stream = await navigator.mediaDevices.getUserMedia({ 
        video: hasVideo ? { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } : false, 
        audio: hasAudio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      });
    } catch (mediaError: any) {
      console.error('Media access error:', mediaError);
      setCallStatus('Failed to access camera/microphone: ' + mediaError.message);
      setIsVideoCallActive(false);
      videoCallInitializingRef.current = false;
      setTimeout(() => setCallStatus(''), 5000);
      return;
    }
    
    console.log('Got media stream for accepter, setting local video...');
    setLocalStream(stream);
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    // Wait longer before creating peer to ensure caller's signals are ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    // FIXED: Add proper user ID detection
    const getOtherUserIdFromSessionPath = (sessionPath: string, myUserId: string): string | null => {
      const pathParts = sessionPath.split('/');
      if (pathParts.length < 2) return null;
      
      const sessionPart = pathParts[1];
      const userIds = sessionPart.split('_');
      
      for (const id of userIds) {
        if (id !== myUserId && !/^\d+$/.test(id)) {
          return id;
        }
      }
      return null;
    };

    const otherUserId = activeFirebaseSessionPath 
      ? getOtherUserIdFromSessionPath(activeFirebaseSessionPath, myUserId)
      : null;

    console.log('Accepter - Session path:', activeFirebaseSessionPath);
    console.log('Accepter - My user ID:', myUserId);
    console.log('Accepter - Detected other user ID:', otherUserId);
    console.log('Accepter - incomingVideoCall.from:', incomingVideoCall.from);

    if (!otherUserId) {
      throw new Error(`Could not determine other user ID from session path: ${activeFirebaseSessionPath}`);
    }

    // Use the detected otherUserId for signaling
    const remoteUserId = otherUserId;

    // Create peer connection - accepter is never initiator
    const peer = new SimplePeer({
      initiator: false,
      trickle: true,
      stream: stream,
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

    peerRef.current = peer;

    // Setup signaling
    const { ref, push, onChildAdded, onValue, serverTimestamp } = await import('firebase/database');
    const signalBasePath = `${activeFirebaseSessionPath}/video_signal`;

    // Send our signals
    peer.on('signal', async (data: any) => {
      try {
        console.log('Accepter sending signal:', data.type);
        await push(ref(firebaseDb, `${signalBasePath}/${myUserId}`), {
          signal: data,
          timestamp: serverTimestamp(),
          callId: incomingVideoCall.callId,
          isInitiator: false,
          role: 'accepter'
        });
      } catch (error) {
        console.error('Error sending signal:', error);
      }
    });

    // FIXED: Use the correct remote user ID for signaling path
    const remoteSignalPath = `${signalBasePath}/${remoteUserId}`;
    console.log('Accepter listening for signals on path:', remoteSignalPath);

    // Process existing signals first
    console.log('Processing existing signals from caller...');
    
    try {
      const existingSignalsRef = ref(firebaseDb, remoteSignalPath);
      const existingSignalsSnapshot = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
        onValue(existingSignalsRef, (snapshot) => {
          clearTimeout(timeout);
          resolve(snapshot);
        }, { onlyOnce: true });
      });
      
      const existingSignals = (existingSignalsSnapshot as any).val();
      if (existingSignals && peer && !peer.destroyed) {
        const signals = Object.values(existingSignals)
          .filter((signalData: any) => 
            signalData.callId === incomingVideoCall.callId && 
            signalData.role === 'caller'
          )
          .sort((a: any, b: any) => {
            const aTime = a.timestamp?.seconds || a.timestamp || 0;
            const bTime = b.timestamp?.seconds || b.timestamp || 0;
            return aTime - bTime;
          });

        console.log(`Accepter processing ${signals.length} existing signals`);
        for (const signalData of signals) {
          try {
            console.log('Accepter processing existing signal:', (signalData as any).signal.type);
            peer.signal((signalData as any).signal);
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error: any) {
            console.error('Error processing existing signal:', error);
          }
        }
      } else {
        console.log('No existing signals found or peer destroyed');
      }
    } catch (error) {
      console.error('Error processing existing signals:', error);
    }

    // Listen for new signals
    console.log('Accepter setting up listener for new signals...');
    const unsubscribe = onChildAdded(ref(firebaseDb, remoteSignalPath), (snapshot) => {
      const data = snapshot.val();
      if (!data || !data.signal || !peer || peer.destroyed) return;
      
      if (data.callId !== incomingVideoCall.callId) {
        console.log('Ignoring signal from different call');
        return;
      }

      try {
        console.log('Accepter processing new remote signal:', data.signal.type, 'from role:', data.role);
        peer.signal(data.signal);
      } catch (error: any) {
        console.error('Error processing remote signal:', error);
      }
    });

    signalingCleanupRef.current = unsubscribe;

    // Enhanced peer event handlers
    peer.on('stream', (remoteStream: MediaStream) => {
      console.log('Accepter received remote stream');
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      setCallStatus('Connected');
    });

    peer.on('connect', () => {
      console.log('Accepter peer connected');
      setCallStatus('Connected');
    });

    peer.on('close', () => {
      console.log('Accepter peer connection closed');
      endVideoCall();
    });

    peer.on('error', (error: any) => {
      console.error('Accepter peer error:', error);
      setCallStatus('Connection error: ' + error.message);
      setTimeout(() => endVideoCall(), 3000);
    });

    // Clear initializing flag after successful setup
    videoCallInitializingRef.current = false;

  } catch (error: any) {
    console.error('Error accepting video call:', error);
    setCallStatus('Failed to accept video call: ' + error.message);
    
    // Clean up on error
    if (localStream) {
      localStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      setLocalStream(null);
    }
    
    setIsVideoCallActive(false);
    videoCallInitializingRef.current = false;
    setTimeout(() => setCallStatus(''), 5000);
  }
}, [firebaseDb, activeFirebaseSessionPath, myUserId, incomingVideoCall, localStream, isVideoCallActive]);

// Enhanced endVideoCall with initialization flag reset
const endVideoCall = useCallback(() => {
  console.log('Ending video call...');

  // Reset initialization flag immediately
  videoCallInitializingRef.current = false;

  // Cleanup peer connection
  if (peerRef.current) {
    try {
      if (!peerRef.current.destroyed) {
        peerRef.current.destroy();
      }
    } catch (error) {
      console.warn('Error destroying peer:', error);
    }
    peerRef.current = null;
  }
  
  // Cleanup signaling
  if (signalingCleanupRef.current) {
    try {
      signalingCleanupRef.current();
    } catch (error) {
      console.warn('Error cleaning up signaling:', error);
    }
    signalingCleanupRef.current = null;
  }

  // Stop local media tracks with better error handling
  if (localStream) {
    try {
      localStream.getTracks().forEach(track => {
        try {
          if (track.readyState !== 'ended') {
            track.stop();
          }
        } catch (trackError) {
          console.warn('Error stopping track:', trackError);
        }
      });
    } catch (streamError) {
      console.warn('Error stopping stream:', streamError);
    }
    setLocalStream(null);
  }

  // Clear video elements safely
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

  // Reset state
  setRemoteStream(null);
  setIsVideoCallActive(false);
  setIsCallInitiator(false);
  setCallStatus('');
  setIncomingVideoCall(null);
  setIsVideoEnabled(true);
  setIsAudioEnabled(true);

  console.log('Video call cleanup complete');
}, [localStream]);

const toggleVideo = useCallback(() => {
  if (localStream) {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
      console.log('Video toggled:', videoTrack.enabled ? 'ON' : 'OFF');
    } else {
      console.warn('No video track found');
    }
  } else {
    console.warn('No local stream available for video toggle');
  }
}, [localStream]);

const toggleAudio = useCallback(() => {
  if (localStream) {
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
      console.log('Audio toggled:', audioTrack.enabled ? 'ON' : 'OFF');
    } else {
      console.warn('No audio track found');
    }
  } else {
    console.warn('No local stream available for audio toggle');
  }
}, [localStream]);

  // Memoized computed values with proper dependencies
  const onlineUsersCount = useMemo(() => Object.keys(onlineUserStatuses).length, [onlineUserStatuses]);
  
  const onlineUsersList = useMemo(() => {
    return Object.entries(onlineUserStatuses).map(([uid, data]) => ({
      uid,
      data,
      displayName: data.displayName || getUserDisplayName(uid)
    }));
  }, [onlineUserStatuses, getUserDisplayName]);

  // Memoized search results
  const memoizedSearchResults = useMemo(() => {
    return searchResults.map(user => ({
      ...user,
      key: user.id
    }));
  }, [searchResults]);

  // User initialization with session cleanup
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
        
        // Clear any existing session on fresh entry
        setActiveFirebaseSessionPath(null);
        activeSessionRef.current = null;
        setChatMessages([]);
        console.log('User initialized - all sessions cleared');
        
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

  // Firebase status management with better throttling
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
          // Increased throttle time to 5 seconds
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

          // Clear any existing timeout
          if (connectionTimeout) clearTimeout(connectionTimeout);

          if (snapshot.val()) {
            // Increased debounce time to 3 seconds
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

  // Search functionality with proper debouncing
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

  // Enhanced end session with better state management
  const endSession = useCallback(async () => {
    console.log('Ending session...', activeSessionRef.current);
    
    try {
      // Only end video call if we initiated the session end
      // Don't end video call if session is ending due to external factors
      const currentSessionPath = activeSessionRef.current;
      if (currentSessionPath && firebaseDb) {
        const { ref, set } = await import('firebase/database');
        set(ref(firebaseDb, `${currentSessionPath}/status`), 'ended')
          .catch((err: any) => console.error('Error setting session status:', err));
      }
      
      // Clear session state
      setActiveFirebaseSessionPath(null);
      activeSessionRef.current = null;
      setChatMessages([]);

    } catch (err) {
      console.error('Session cleanup error:', err);
    }
  }, [firebaseDb]);

  const setupSession = useCallback(async (path: string, sessionType: string) => {
    console.log(`Setting up ${sessionType} session at ${path}`);
    
    // Don't setup if already active for this exact path
    if (activeSessionRef.current === path) {
      console.log('Session already active for this path, skipping setup');
      return;
    }
    
    // Clear any existing session data
    setChatMessages([]);

    try {
      const { ref, onValue, onChildAdded } = await import('firebase/database');
      
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
      }, (error) => {
        console.error('Messages listener error:', error);
      });

      // Listen for video call notifications
      const videoCallUnsubscribe = onChildAdded(videoCallNotificationsRef, (snapshot) => {
        try {
          const notification = snapshot.val();
          console.log('Video call notification received:', notification);
          if (notification && notification.from !== myUserId && notification.type === 'video_call_request') {
            console.log('Setting incoming video call:', notification);
            setIncomingVideoCall(notification);
          }
        } catch (err) {
          console.error('Video call notification error:', err);
        }
      });

      const sessionRef = ref(firebaseDb, `${path}/status`);
      const sessionUnsubscribe = onValue(sessionRef, (snapshot) => {
        try {
          const sessionStatus = snapshot.val();
          console.log('Session status update:', sessionStatus, 'for path:', path);
          
          // Only end session if status is explicitly 'ended' AND we're not in an active video call
          // AND this is actually the current active session
          if (sessionStatus === 'ended' && 
              activeFirebaseSessionPath === path && 
              !isVideoCallActive) {
            console.log('Session ended by remote party for our active session');
            endSession();
          }
        } catch (err) {
          console.error('Session status error:', err);
        }
      }, (error) => {
        console.error('Session listener error:', error);
      });

      // Store cleanup functions
      const sessionCleanup = () => {
        console.log('Cleaning up session listeners for:', path);
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
  }, [addCleanup, endSession, firebaseDb, activeFirebaseSessionPath, myUserId]);

  // Enhanced Firebase listeners with better session management
  useEffect(() => {
    if (!isInitialized || !myUserId || !myRole || !firebaseDb) return;

    console.log('Setting up Firebase listeners...');
    let isActive = true;
    let listenersSetup = false;

    const setupListeners = async () => {
      // Prevent multiple listener setups
      if (listenersSetup) return;
      listenersSetup = true;

      try {
        const { ref, onValue, onChildAdded } = await import('firebase/database');
        
        const statusesRef = ref(firebaseDb, 'user_statuses');
        const requestsRef = ref(firebaseDb, `user_notifications/${myUserId}/requests`);
        const responsesRef = ref(firebaseDb, `user_notifications/${myUserId}/responses`);

        // Much better throttling for status updates
        let statusUpdateTimeout: NodeJS.Timeout | null = null;
        const statusUnsubscribe = onValue(statusesRef, (snapshot) => {
          if (!isActive) return;
          
          try {
            const newStatuses = snapshot.val() || {};
            
            // Increased throttle time to 2 seconds
            if (statusUpdateTimeout) clearTimeout(statusUpdateTimeout);
            statusUpdateTimeout = setTimeout(() => {
              if (isActive) {
                setOnlineUserStatuses((prevStatuses: any) => {
                  // Only update if there's actually a change
                  const prevString = JSON.stringify(prevStatuses);
                  const newString = JSON.stringify(newStatuses);
                  if (prevString !== newString) {
                    return newStatuses;
                  }
                  return prevStatuses;
                });
              }
            }, 2000);
            
          } catch (err) {
            console.error('Status update error:', err);
          }
        }, (error) => {
          if (isActive) console.error('Status listener error:', error);
        });

        // Better throttling for request updates
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
            }, 1000);
            
          } catch (err) {
            console.error('Requests processing error:', err);
          }
        }, (error) => {
          if (isActive) console.error('Requests listener error:', error);
        });
        
        // Initialize variables
        let processedResponseIds = new Set<string>();
        const listenerStartTime = Date.now();

        // Better approach - listen for new responses with proper timestamp handling
        const responsesUnsubscribe = onChildAdded(responsesRef, (snapshot) => {
          if (!isActive) return;
          
          try {
            const response = snapshot.val();
            const responseId = snapshot.key;
            
            if (!response || !responseId) return;
            
            // Prevent processing the same response multiple times
            if (processedResponseIds.has(responseId)) {
              console.log('Response already processed:', responseId);
              return;
            }
            
            // Better timestamp handling for Firebase timestamps
            let responseTime = 0;
            if (response.timestamp) {
              // Handle different timestamp formats
              if (typeof response.timestamp === 'number') {
                responseTime = response.timestamp;
              } else if (response.timestamp.toMillis) {
                responseTime = response.timestamp.toMillis();
              } else if (response.timestamp.seconds) {
                // Firestore timestamp format
                responseTime = response.timestamp.seconds * 1000;
              } else if (typeof response.timestamp === 'object' && response.timestamp.time) {
                // Alternative timestamp format
                responseTime = response.timestamp.time;
              }
            }
            
            // More lenient time filtering - only ignore very old responses (older than 1 hour)
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            if (responseTime > 0 && responseTime < oneHourAgo) {
              console.log('Ignoring very old response:', responseId, 'from', new Date(responseTime).toLocaleString());
              return;
            }
            
            // Only filter out responses that are clearly from before this session
            const sessionStartThreshold = listenerStartTime - (5 * 60 * 1000); // 5 minutes before listener start
            if (responseTime > 0 && responseTime < sessionStartThreshold) {
              console.log('Ignoring pre-session response:', responseId, 'from', new Date(responseTime).toLocaleString());
              return;
            }
            
            processedResponseIds.add(responseId);
            console.log('Processing response:', response.type, responseId, responseTime ? `from ${new Date(responseTime).toLocaleString()}` : '(no timestamp)');
            
            if (response.type === 'session_accepted') {
              console.log('Session accepted:', response.firebaseSessionPath);
              // Only set active session if we don't already have one
              if (!activeSessionRef.current) {
                setActiveFirebaseSessionPath(response.firebaseSessionPath);
                setupSession(response.firebaseSessionPath, response.sessionType);
              } else {
                console.log('Session already active, ignoring new session request');
              }
            } else if (response.type === 'session_ended') {
              console.log('Session ended by remote party');
              // Only end if this response is for our current session
              if (activeSessionRef.current && response.firebaseSessionPath === activeSessionRef.current) {
                endSession();
              }
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
          listenersSetup = false;
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
  }, [isInitialized, myUserId, myRole, firebaseDb]); // Stable dependencies

  // Stable callback functions
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
      <h1 style={{ color: '#333', marginBottom: '30px' }}>Mentor/User Chat & Video Dashboard</h1>
      
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

      {/* Incoming Video Call Notification */}
      {incomingVideoCall && !isVideoCallActive && (
        <div style={{ 
          marginBottom: '30px', 
          padding: '20px', 
          border: '3px solid #17a2b8', 
          borderRadius: '8px',
          backgroundColor: '#d1ecf1',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px'
          }}>
            <div>
              <h2 style={{ color: '#0c5460', margin: '0 0 10px 0' }}>📹 Incoming Video Call</h2>
              <p style={{ margin: 0, fontSize: '16px', color: '#0c5460' }}>
                From: {getUserDisplayName(incomingVideoCall.from)}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
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
                📹 Accept
              </button>
              <button 
                onClick={() => setIncomingVideoCall(null)}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#dc3545', 
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
        </div>
      )}

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
            <h2 style={{ color: '#28a745', margin: 0 }}>
              🟢 Active {isVideoCallActive ? 'Video Call' : 'Chat'} Session
            </h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {!isVideoCallActive && (
                <button 
                  onClick={startVideoCall}
                  style={{ 
                    padding: '10px 20px', 
                    backgroundColor: '#17a2b8', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '5px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  📹 Start Video Call
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

          {/* Debug Info */}
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
            Call Status: {callStatus || 'None'}
          </div>

          {/* Video Call Interface - Always show if video call is active */}
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
                {/* Local Video */}
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

                {/* Remote Video */}
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

              {/* Video Controls */}
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
          
          {/* Chat Interface */}
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
  );
});

// Add display names for easier debugging
MentorComponent.displayName = 'MentorComponent';
MentorComponentInner.displayName = 'MentorComponentInner';
MentorComponentCore.displayName = 'MentorComponentCore';

export default MentorComponent;
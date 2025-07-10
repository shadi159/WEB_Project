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

// Add these interfaces at the top of your Mentor.tsx file (after imports)
interface NetworkTestResponse {
  ok: boolean;
  status: number;
}

interface NetworkTestResult {
  success: boolean;
  message: string;
}

interface MediaError extends Error {
  name: 'NotAllowedError' | 'NotFoundError' | 'NotReadableError' | string;
}

interface SignalData {
  type: 'offer' | 'answer' | 'candidate';
  candidate?: RTCIceCandidate;
  sdp?: string;
  [key: string]: any;
}

// Professional Loading Component
const ProfessionalLoader = ({ 
  title = "Loading...", 
  subtitle = "Please wait while we initialize the system",
  showSpinner = true 
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      padding: '40px 20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Logo/Icon Container */}
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        {showSpinner ? (
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        ) : (
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold'
          }}>
            📋
          </div>
        )}
      </div>

      {/* Title */}
      <h2 style={{
        margin: '0 0 8px 0',
        fontSize: '24px',
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: '-0.5px'
      }}>
        {title}
      </h2>

      {/* Subtitle */}
      <p style={{
        margin: '0 0 32px 0',
        fontSize: '16px',
        opacity: 0.9,
        textAlign: 'center',
        maxWidth: '400px',
        lineHeight: '1.5'
      }}>
        {subtitle}
      </p>

      {/* Progress Bar */}
      <div style={{
        width: '200px',
        height: '4px',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: '60%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent)',
          animation: 'shimmer 2s infinite'
        }} />
      </div>

      {/* CSS Animation Styles */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

// Full-screen loading overlay
const FullScreenLoader = ({ 
  title = "Loading...", 
  subtitle = "Please wait while we initialize the system" 
}) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <ProfessionalLoader title={title} subtitle={subtitle} />
    </div>
  );
};

// Compact loading for smaller areas
const CompactLoader = ({ text = "Loading..." }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 20px',
      background: '#f8fafc',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        width: '20px',
        height: '20px',
        border: '2px solid #e2e8f0',
        borderTop: '2px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginRight: '12px'
      }} />
      <span style={{
        color: '#64748b',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        {text}
      </span>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

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
    <ProfessionalLoader 
      title="Loading Mentor System" 
      subtitle="Preparing browser environment and real-time features..."
    />
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
      <ProfessionalLoader 
        title="Starting Application" 
        subtitle="Initializing browser environment for real-time chat and video..."
      />
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
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '40px 20px',
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          fontSize: '32px'
        }}>
          ⚠️
        </div>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600' }}>
          Initialization Error
        </h2>
        <p style={{ 
          margin: '0 0 24px 0', 
          fontSize: '16px', 
          opacity: 0.9, 
          textAlign: 'center',
          maxWidth: '500px',
          lineHeight: '1.5'
        }}>
          {firebaseError}
        </p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!firebaseLoaded || !simplePeerLoaded) {
    return (
      <ProfessionalLoader 
        title="Loading Services" 
        subtitle="Connecting to Firebase and initializing WebRTC for video calls..."
      />
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
  const [isRemotePlaybackBlocked, setIsRemotePlaybackBlocked] = useState(false);
  const [callStatus, setCallStatus] = useState<string>('');
  const [incomingVideoCall, setIncomingVideoCall] = useState<any>(null);

  const [fetchingUserDetails, setFetchingUserDetails] = useState<Set<string>>(new Set());

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);
   const tryPlayRemoteVideo = useCallback(async () => {
    if (remoteVideoRef.current) {
      try {
        await remoteVideoRef.current.play();
        setIsRemotePlaybackBlocked(false);
      } catch (error: any) {
        if (error.name === 'NotAllowedError') {
          console.warn('Remote video autoplay blocked:', error);
          setIsRemotePlaybackBlocked(true);
        } else {
          console.warn('Remote video play failed:', error);
        }
      }
    }
  }, []);
  const signalingCleanupRef = useRef<(() => void) | null>(null);
  const getICEConfiguration = () => {
  return {
    iceServers: [
      // Google STUN servers (multiple for redundancy)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      
      // Cloudflare STUN servers
      { urls: 'stun:stun.cloudflare.com:3478' },
      
      // Free TURN servers for NAT traversal (multiple for redundancy)
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
      
      // Alternative TURN servers
      { urls: 'turn:turn.bistri.com:80', username: 'homeo', credential: 'homeo' },
      { urls: 'turn:turn.anyfirewall.com:443?transport=tcp', username: 'webrtc', credential: 'webrtc' }
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all', // Use both UDP and TCP
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };
};

const setupConnectionMonitoring = (peer: any, callType: string) => {
  let connectionStateTimeout: NodeJS.Timeout | null = null;
  let iceConnectionStateTimeout: NodeJS.Timeout | null = null;
  
  // Monitor ICE connection state with audio debugging
  peer.on('iceConnectionStateChange', (state: string) => {
    console.log(`${callType} ICE Connection State: ${state}`);
    
    if (iceConnectionStateTimeout) {
      clearTimeout(iceConnectionStateTimeout);
    }
    
    switch (state) {
      case 'checking':
        setCallStatus('Checking connection...');
        break;
        
      case 'connecting':
        setCallStatus('Establishing connection...');
        iceConnectionStateTimeout = setTimeout(() => {
          console.warn(`${callType} ICE connection stuck in connecting state`);
          setCallStatus('Connection taking longer than expected...');
        }, 15000); // Increased timeout
        break;
        
      case 'connected':
      case 'completed':
        setCallStatus('Connected');
        console.log(`✅ ${callType} ICE connection successful`);
        
        // CRITICAL FIX: Verify audio tracks when connected
        if (localStream) {
          const audioTracks = localStream.getAudioTracks();
          console.log(`🎤 ${callType} Local audio tracks:`, audioTracks.map(track => ({
            id: track.id,
            enabled: track.enabled,
            readyState: track.readyState,
            kind: track.kind,
            label: track.label
          })));
        }
        
        if (iceConnectionStateTimeout) {
          clearTimeout(iceConnectionStateTimeout);
        }
        break;
        
      case 'disconnected':
        setCallStatus('Connection interrupted - attempting to reconnect...');
        iceConnectionStateTimeout = setTimeout(() => {
          if (peer && !peer.destroyed) {
            console.log('Attempting to restart ICE');
          }
        }, 5000);
        break;
        
      case 'failed':
        setCallStatus('Connection failed');
        setTimeout(() => endVideoCall(), 2000);
        break;
        
      case 'closed':
        setCallStatus('Connection closed');
        break;
    }
  });
  
  // Enhanced general connection state monitoring
  peer.on('connectionStateChange', (state: string) => {
    console.log(`${callType} Connection State: ${state}`);
    
    if (connectionStateTimeout) {
      clearTimeout(connectionStateTimeout);
    }
    
    switch (state) {
      case 'connecting':
        setCallStatus('Connecting...');
        break;
      case 'connected':
        setCallStatus('Connected');
        console.log(`✅ ${callType} Peer connection successful`);
        
        // ADDITIONAL FIX: Check audio when peer connects
        setTimeout(() => {
          if (localStream) {
            const audioTracks = localStream.getAudioTracks();
            audioTracks.forEach((track, index) => {
              console.log(`🎤 Audio track ${index}:`, {
                enabled: track.enabled,
                readyState: track.readyState,
                constraints: track.getConstraints(),
                settings: track.getSettings()
              });
            });
          }
        }, 1000);
        break;
      case 'disconnected':
        setCallStatus('Disconnected - attempting to reconnect...');
        connectionStateTimeout = setTimeout(() => {
          console.warn(`${callType} Connection timeout`);
          endVideoCall();
        }, 20000); // Increased timeout
        break;
      case 'failed':
        setCallStatus('Connection failed');
        setTimeout(() => endVideoCall(), 2000);
        break;
      case 'closed':
        setCallStatus('Connection closed');
        break;
    }
  });
  
  return () => {
    if (connectionStateTimeout) clearTimeout(connectionStateTimeout);
    if (iceConnectionStateTimeout) clearTimeout(iceConnectionStateTimeout);
  };
};

  // Sync ref with state
  useEffect(() => {
    activeSessionRef.current = activeFirebaseSessionPath;
  }, [activeFirebaseSessionPath]);

  useEffect(() => {
  console.log('🔍 Remote stream state changed:', {
    hasRemoteStream: !!remoteStream,
    streamId: remoteStream?.id,
    streamActive: remoteStream?.active,
    videoTracks: remoteStream?.getVideoTracks().length || 0,
    audioTracks: remoteStream?.getAudioTracks().length || 0,
    remoteVideoElement: !!remoteVideoRef.current
  });

  if (remoteStream && remoteVideoRef.current) {
    console.log('🔍 Setting remote stream to video element');
    
    // CRITICAL FIX: Add delay to prevent interruption
    setTimeout(() => {
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
        tryPlayRemoteVideo();
      }
    }, 100);
  }
}, [remoteStream]);

// 4. Enhanced remote video element with debugging
const RemoteVideoElement = () => (
  <div style={{ position: 'relative' }}>
    <video 
      ref={remoteVideoRef}
      autoPlay 
      playsInline
      muted={false} // Ensure audio is not muted
      style={{ 
        width: '100%', 
        height: '250px', 
        backgroundColor: '#000', 
        borderRadius: '8px',
        objectFit: 'cover'
      }}
      onLoadedMetadata={() => {
        console.log('✅ Remote video metadata loaded');
        setCallStatus('Connected'); // Ensure status is updated
        tryPlayRemoteVideo();
      }}
      onPlay={() => {
        console.log('✅ Remote video started playing');
      }}
      onError={(e) => {
        console.error('❌ Remote video error:', e);
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
      Remote User {!remoteStream && '(No video)'}
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
        <br />
        <small>Status: {callStatus}</small>
      </div>
    )}
  </div>
);

  // Error tracking
  const [errors, setErrors] = useState<string[]>([]);
  const [endedSessions, setEndedSessions] = useState<Set<string>>(new Set());
  const listenersActiveRef = useRef(false);

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
  // DIAGNOSTIC: Log the call stack to see what's calling this
  console.log('🚨 clearAllCleanup called from:');
  console.trace(); // This will show the call stack
  console.log('🚨 Current state when clearAllCleanup called:', {
    activeFirebaseSessionPath,
    activeSessionRefCurrent: activeSessionRef.current,
    isVideoCallActive,
    cleanupFunctionsCount: cleanupFunctions.current.length
  });
  
  const cleanupCount = cleanupFunctions.current.length;
  console.log(`🧹 Clearing ${cleanupCount} cleanup functions...`);
  
  cleanupFunctions.current.forEach((cleanup: () => void, index: number) => {
    try {
      console.log(`🧹 Executing cleanup function ${index + 1}/${cleanupCount}`);
      cleanup();
    } catch (error) {
      console.warn(`⚠️ Cleanup error for function ${index + 1}:`, error);
    }
  });
  
  cleanupFunctions.current = [];
  listenersActiveRef.current = false;
  
  console.log('✅ All cleanup functions cleared');
}, [activeFirebaseSessionPath, isVideoCallActive]);

  // Helper functions with proper memoization
  const getUserDisplayName = useCallback((userId: string): string => {
  const userDetails = userDetailsCache[userId];
  if (userDetails) {
    return `${userDetails.displayName} (${userDetails.role})`;
  }
  
  // If currently fetching, show loading state
  if (fetchingUserDetails.has(userId)) {
    return `Loading... (${userId.substring(0, 8)}...)`;
  }
  
  // If not in cache and not fetching, trigger a fetch and show ID
  fetchSingleUserDetail(userId);
  return `User ${userId.substring(0, 8)}...`;
}, [userDetailsCache, fetchingUserDetails]);

const fetchSingleUserDetail = useCallback(async (userId: string) => {
  // Don't fetch if already in cache or currently fetching
  if (userDetailsCache[userId] || fetchingUserDetails.has(userId)) {
    return;
  }
  
  // Mark as fetching
  setFetchingUserDetails(prev => new Set([...prev, userId]));
  
  try {
    const response = await fetch(`/api/get-user-details?userIds=${encodeURIComponent(userId)}`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.success && data.users && data.users[userId]) {
        const userData = data.users[userId];
        const userDetails: UserDetails = {
          displayName: userData.displayName || `${userData.firstName || 'Unknown'} ${userData.lastName || 'User'}`.trim(),
          firstName: userData.firstName || 'Unknown',
          lastName: userData.lastName || 'User',
          role: userData.role || 'user',
          id: userId,
          email: userData.email
        };
        
        // Add to cache
        setUserDetailsCache(prev => ({ ...prev, [userId]: userDetails }));
      }
    }
  } catch (error) {
    console.error('Failed to fetch single user detail:', error);
  } finally {
    // Remove from fetching set
    setFetchingUserDetails(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  }
}, [userDetailsCache, fetchingUserDetails]);

  // ✅ UPDATED determineInitiator with enhanced debugging
  const determineInitiator = (myUserId: string, otherUserId: string, myRole: string): boolean => {
    console.log('🔍 determineInitiator called with:', { myUserId, otherUserId, myRole });
    
    // ✅ CRITICAL: Mentor ALWAYS initiates
    if (myRole === 'mentor') {
      console.log('✅ MENTOR ROLE detected - should initiate: TRUE');
      return true;
    } 
    // ✅ CRITICAL: User NEVER initiates (always receives)
    else if (myRole === 'user') {
      console.log('✅ USER ROLE detected - should initiate: FALSE (will receive calls)');
      return false;
    }
    
    // Fallback for same roles (shouldn't happen in your case)
    const result = myUserId.localeCompare(otherUserId) < 0;
    console.log('⚠️ FALLBACK: Same roles - lexicographic comparison result:', result);
    return result;
  };
  
  // Add a ref to track video call initialization state
  const videoCallInitializingRef = useRef(false);

 // 1. Browser-compatible network test (no AbortSignal issues)
const testNetworkCompatibility = async (): Promise<NetworkTestResult> => {
  try {
    const testUrl = 'https://httpbin.org/get';
    
    const response = await new Promise<NetworkTestResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.timeout = 8000; // 8 second timeout
      xhr.onload = () => resolve({ 
        ok: xhr.status >= 200 && xhr.status < 300, 
        status: xhr.status 
      });
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.ontimeout = () => reject(new Error('Network timeout'));
      xhr.open('GET', testUrl);
      xhr.send();
    });
    
    if (response.ok) {
      console.log('✅ Network connectivity: OK');
      return { success: true, message: 'Network OK' };
    } else {
      console.log('❌ Network error:', response.status);
      return { success: false, message: `HTTP ${response.status}` };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
    console.log('❌ Network error:', errorMessage);
    return { success: false, message: errorMessage };
  }
};

// 2. Browser-compatible ICE server configuration
const getBrowserCompatibleICEConfig = () => {
  return {
    iceServers: [
      // Multiple STUN servers (your tests show these work perfectly)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      
      // TURN servers for NAT traversal
      { 
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      { 
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };
};

// 3. Enhanced getUserMedia with permission handling
const getMediaStreamWithPermissions = async (): Promise<MediaStream> => {
  try {
    // Enhanced audio constraints for better quality
    const constraints: MediaStreamConstraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 2, // Stereo audio
        sampleRate: 48000, // Higher quality
        sampleSize: 16
      }
    };
    let stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    stream.getAudioTracks().forEach(track => {
      if (!track.enabled) {
        track.enabled = true;
        console.log(`Audio track ${track.id} enabled`);
      }
    });
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Media stream obtained with enhanced audio settings');
    } catch (error: unknown) {
      // Fallback: try with basic constraints
      console.warn('Falling back to basic media constraints');
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    }
    
    // CRITICAL FIX: Verify audio tracks immediately
    const audioTracks = stream.getAudioTracks();
    console.log('🎤 Audio tracks obtained:', audioTracks.map(track => ({
      id: track.id,
      enabled: track.enabled,
      readyState: track.readyState,
      kind: track.kind,
      label: track.label,
      settings: track.getSettings(),
      constraints: track.getConstraints()
    })));
    
    return stream;
    
  } catch (error: unknown) {
    console.error('Media access error:', error);
    throw error;
  }
};

const requestMediaPermissions = async (): Promise<boolean> => {
  try {
    // Request permissions first
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    
    // Stop the stream immediately - we just wanted to get permissions
    stream.getTracks().forEach(track => track.stop());
    
    console.log('✅ Media permissions granted');
    return true;
  } catch (error: unknown) {
    const mediaError = error as MediaError;
    console.error('❌ Media permissions denied:', mediaError.message);
    
    if (mediaError.name === 'NotAllowedError') {
      alert('Camera/microphone access is required for video calls. Please click "Allow" when prompted and refresh the page.');
    }
    
    return false;
  }
};

// 4. Updated startVideoCall function with compatibility fixes
const startVideoCallCompatible = async () => {
  if (!firebaseDb || !activeFirebaseSessionPath || !myUserId) {
    console.error('Missing requirements for video call');
    return;
  }

  if (isVideoCallActive || videoCallInitializingRef.current) {
    console.log('Video call already active or initializing');
    return;
  }

  videoCallInitializingRef.current = true;
  console.log('Starting video call...');

  // Request permissions first
  setCallStatus('Requesting camera and microphone permissions...');
  const hasPermissions = await requestMediaPermissions();
  
  if (!hasPermissions) {
    setCallStatus('Camera/microphone permissions required. Please refresh and allow access.');
    setIsVideoCallActive(false);
    videoCallInitializingRef.current = false;
    return;
  }

  try {
    // Step 1: Test network (browser compatible)
    setCallStatus('Checking network connection...');
    const networkTest = await testNetworkCompatibility();
    
    if (!networkTest.success) {
      console.warn('Network test failed, but continuing with WebRTC attempt');
      setCallStatus('Network test failed, trying WebRTC anyway...');
    }

    // Step 2: Clean up existing resources
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    if (peerRef.current) {
      if (!peerRef.current.destroyed) {
        peerRef.current.destroy();
      }
      peerRef.current = null;
    }

    // Step 3: Get user media with better error handling
    setCallStatus('Requesting camera and microphone access...');
    let stream: MediaStream;
    
    try {
      stream = await getMediaStreamWithPermissions();
    } catch (mediaError: unknown) {
      const errorMessage = mediaError instanceof Error ? mediaError.message : 'Unknown media error';
      setCallStatus(errorMessage);
      setIsVideoCallActive(false);
      videoCallInitializingRef.current = false;
      
      setTimeout(() => {
        setCallStatus('To enable video calls: 1) Refresh page 2) Click "Allow" for camera/mic 3) Try again');
      }, 3000);
      return;
    }

    console.log('✅ Got media stream, setting local video...');
    setLocalStream(stream);
    
    console.log('🎤 User audio tracks after setting local stream:', 
      stream.getAudioTracks().map(track => ({
        id: track.id,
        enabled: track.enabled,
        readyState: track.readyState,
        settings: track.getSettings()
      }))
    );

    // Ensure audio tracks are enabled
    stream.getAudioTracks().forEach(track => {
      track.enabled = true;
      console.log(`🎤 Ensured audio track ${track.id} is enabled:`, track.enabled);
    });
    setIsVideoCallActive(true);
    setIsCallInitiator(true);

    // ✅ CRITICAL FIX: Set local video IMMEDIATELY after getting stream
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      console.log('✅ Local video set for mentor');
      
      // Force play the local video
      localVideoRef.current.play().catch(error => {
        console.warn('Local video play failed:', error);
      });
    }

    setCallStatus('Setting up video connection...');

    // Step 4: Determine other user
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

    const otherUserId = getOtherUserIdFromSessionPath(activeFirebaseSessionPath, myUserId);
    if (!otherUserId) {
      throw new Error('Could not determine other user ID');
    }

    // Step 5: Create peer with compatible configuration
    const peer = new SimplePeer({
      initiator: true,
      trickle: true,
      stream: stream,
      config: getBrowserCompatibleICEConfig()
    });

    peerRef.current = peer;
    const callId = Date.now();

    // Step 6: Enhanced error handling
    peer.on('error', (error: Error) => {
      console.error('Peer error:', error);
      
      if (error.message?.includes('Connection failed')) {
        setCallStatus('Connection failed - retrying with different settings...');
        
        setTimeout(() => {
          if (isVideoCallActive) {
            console.log('Retrying video call with fallback settings...');
            endVideoCall();
          }
        }, 3000);
      } else {
        setCallStatus(`Connection error: ${error.message}`);
        setTimeout(() => endVideoCall(), 3000);
      }
    });

    // Step 7: Connection state monitoring
    peer.on('connect', () => {
      console.log('✅ Peer connected successfully');
      setCallStatus('Connected');
    });

    peer.on('close', () => {
      console.log('Peer connection closed');
      setCallStatus('Call ended');
      endVideoCall();
    });

    // Step 8: Remote stream handling
    peer.on('stream', (remoteStream: MediaStream) => {
      console.log('✅ Mentor received remote stream from user');
      console.log('Remote stream details:', {
        id: remoteStream.id,
        active: remoteStream.active,
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length
      });

      console.log('Received remote stream with audio tracks:', remoteStream.getAudioTracks().length);
      // Force enable remote audio tracks
      remoteStream.getAudioTracks().forEach(track => {
        if (!track.enabled) {
          track.enabled = true;
          console.log(`Remote audio track ${track.id} enabled`);
        }
      });
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        tryPlayRemoteVideo();
      }

      // Audio debug
      const audioTracks = remoteStream.getAudioTracks();
      console.log('🔊 Remote audio tracks:', audioTracks.map(track => ({
        id: track.id,
        enabled: track.enabled,
        readyState: track.readyState,
        kind: track.kind,
        label: track.label
      })));

      // Force enable audio tracks
      audioTracks.forEach(track => track.enabled = true);
      
      setRemoteStream(remoteStream);
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        console.log('✅ Remote video element updated for mentor');
        
        tryPlayRemoteVideo();

      }
      setCallStatus('Connected - Video active');
    });

    // ✅ CRITICAL FIX: SINGLE signal handler only
    const { ref, push, onChildAdded, serverTimestamp } = await import('firebase/database');
    const signalBasePath = `${activeFirebaseSessionPath}/video_signal`;

    peer.on('signal', async (data: any) => {
      console.log('Mentor sending signal:', data.type);
      try {
        await push(ref(firebaseDb, `${signalBasePath}/${myUserId}`), {
          signal: data,
          timestamp: serverTimestamp(),
          callId: callId,
          role: 'caller'
        });
      } catch (signalError: unknown) {
        const errorMessage = signalError instanceof Error ? signalError.message : 'Unknown signaling error';
        console.error('Failed to send signal:', errorMessage);
      }
    });

    // Listen for remote signals
    const remoteSignalPath = `${signalBasePath}/${otherUserId}`;
    const unsubscribe = onChildAdded(ref(firebaseDb, remoteSignalPath), (snapshot) => {
      const data = snapshot.val();
      if (!data || !data.signal || !peer || peer.destroyed) return;
      if (data.callId && data.callId !== callId) return;

      console.log('Mentor processing signal from user:', data.signal.type);
      try {
        peer.signal(data.signal);
      } catch (signalError) {
        console.error('Failed to process signal:', signalError);
      }
    });

    signalingCleanupRef.current = unsubscribe;

    // Step 10: Notify other user
    await push(ref(firebaseDb, `${activeFirebaseSessionPath}/video_call_notifications`), {
      type: 'video_call_request',
      from: myUserId,
      callId: callId,
      timestamp: serverTimestamp()
    });

    setCallStatus('Calling...');
    videoCallInitializingRef.current = false;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error starting video call';
    console.error('Error starting video call:', errorMessage);
    setCallStatus(`Failed to start call: ${errorMessage}`);
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    setIsVideoCallActive(false);
    setIsCallInitiator(false);
    videoCallInitializingRef.current = false;
    
    setTimeout(() => setCallStatus(''), 5000);
  }
};

  // ✅ UPDATED acceptVideoCall with deduplication and single-answer logic
  const acceptVideoCall = useCallback(async () => {
  console.log('🎯 acceptVideoCall CALLED');
  
  if (!firebaseDb || !activeFirebaseSessionPath || !myUserId || !incomingVideoCall) {
    console.error('❌ Missing requirements for acceptVideoCall');
    return;
  }

  if (isVideoCallActive || videoCallInitializingRef.current) {
    console.log('❌ Video call already active or initializing, ignoring accept request');
    return;
  }

  // CRITICAL FIX: Preserve the current session path
  const currentSessionPath = activeFirebaseSessionPath;
  console.log('🔒 Preserving session path during video call acceptance:', currentSessionPath);

  videoCallInitializingRef.current = true;
  console.log('✅ Accepting video call from:', incomingVideoCall.from);
  setCallStatus('Accepting call...');

  const processedSignalKeys = new Set();
  let hasSentAnswer = false;
  let offerProcessed = false;

  try {
    // Clean up existing media resources (but NOT session)
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

    await new Promise(resolve => setTimeout(resolve, 1000));

    // CRITICAL FIX: Set video call state WITHOUT clearing session
    setIsVideoCallActive(true);
    setIsCallInitiator(false);
    setIncomingVideoCall(null);
    setCallStatus('Getting camera access...');

    // CRITICAL FIX: Ensure session path is preserved
    if (activeFirebaseSessionPath !== currentSessionPath) {
      console.log('🔄 Restoring session path:', currentSessionPath);
      setActiveFirebaseSessionPath(currentSessionPath);
      activeSessionRef.current = currentSessionPath;
    }

    // Get user media for accepter
    let stream: MediaStream;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = devices.some(device => device.kind === 'videoinput');
      const hasAudio = devices.some(device => device.kind === 'audioinput');

      console.log('User devices:', { hasVideo, hasAudio });

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
      
      console.log('✅ User got media stream:', {
        id: stream.id,
        active: stream.active,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
      
    } catch (mediaError: any) {
      console.error('Media access error:', mediaError);
      setCallStatus('Failed to access camera/microphone: ' + mediaError.message);
      setIsVideoCallActive(false);
      videoCallInitializingRef.current = false;
      
      // CRITICAL FIX: Restore session state on media error
      setActiveFirebaseSessionPath(currentSessionPath);
      activeSessionRef.current = currentSessionPath;
      
      setTimeout(() => setCallStatus(''), 5000);
      return;
    }

    console.log('✅ Got media stream for user, setting local video...');
    setLocalStream(stream);
    setCallStatus('Setting up connection...');
    
    // Set local video IMMEDIATELY for user
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      console.log('✅ Local video set for user');
      
      localVideoRef.current.play().catch(error => {
        console.warn('Local video play failed:', error);
      });
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Get other user ID
    const getOtherUserIdFromSessionPath = (sessionPath: string, myUserId: string): string | null => {
      const pathParts = sessionPath.split('/');
      if (pathParts.length < 2) return null;
      const sessionPart = pathParts[1];
      const userIds = sessionPart.split('_');
      for (const id of userIds) {
        if (id !== myUserId && !/^[0-9]+$/.test(id)) {
          return id;
        }
      }
      return null;
    };

    const otherUserId = currentSessionPath 
      ? getOtherUserIdFromSessionPath(currentSessionPath, myUserId)
      : null;

    if (!otherUserId) {
      throw new Error(`Could not determine other user ID from session path: ${currentSessionPath}`);
    }

    const shouldWeInitiate = determineInitiator(myUserId, otherUserId, myRole || 'user');
    if (shouldWeInitiate) {
      console.log('We should be the initiator, not accepting');
      setCallStatus('Error: Role conflict');
      videoCallInitializingRef.current = false;
      
      // CRITICAL FIX: Restore session state on role conflict
      setActiveFirebaseSessionPath(currentSessionPath);
      activeSessionRef.current = currentSessionPath;
      
      setTimeout(() => setCallStatus(''), 3000);
      return;
    }

    const remoteUserId = otherUserId;
    
    // Create peer with enhanced configuration
    const peer = new SimplePeer({
      initiator: false,
      trickle: true,
      stream: stream,
      config: getICEConfiguration()
    });

    peerRef.current = peer;
    const { ref, push, onChildAdded, onValue, serverTimestamp } = await import('firebase/database');
    
    // CRITICAL FIX: Use preserved session path for signaling
    const signalBasePath = `${currentSessionPath}/video_signal`;

    // Setup connection monitoring
    const cleanupMonitoring = setupConnectionMonitoring(peer, 'Accepter');

    // Enhanced error handling
    peer.on('error', (error: any) => {
      console.error('Accepter peer error:', error);
      cleanupMonitoring();
      
      let errorMessage = 'Connection error';
      if (error.message?.includes('Connection failed')) {
        errorMessage = 'Connection failed - please check your network and try again';
      } else if (error.message?.includes('ice')) {
        errorMessage = 'Network connection issue - trying to reconnect...';
      } else {
        errorMessage = `Connection error: ${error.message}`;
      }
      
      setCallStatus(errorMessage);
      setTimeout(() => {
        // CRITICAL FIX: Don't end session on peer error, just end video call
        if (isVideoCallActive) {
          setIsVideoCallActive(false);
          setIsCallInitiator(false);
          setCallStatus('');
          
          // Ensure session is preserved
          setActiveFirebaseSessionPath(currentSessionPath);
          activeSessionRef.current = currentSessionPath;
        }
      }, 3000);
    });

    // Enhanced stream handling for user
    peer.on('stream', (remoteStream: MediaStream) => {
      console.log('✅ User received remote stream from mentor');
      console.log('Remote stream details:', {
        id: remoteStream.id,
        active: remoteStream.active,
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length
      });

      console.log('Received remote stream with audio tracks:', remoteStream.getAudioTracks().length);
      // Force enable remote audio tracks
      remoteStream.getAudioTracks().forEach(track => {
        if (!track.enabled) {
          track.enabled = true;
          console.log(`Remote audio track ${track.id} enabled`);
        }
      });
      setRemoteStream(remoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        tryPlayRemoteVideo();
      }

      // Audio debug
      const audioTracks = remoteStream.getAudioTracks();
      console.log('🔊 Remote audio tracks:', audioTracks.map(track => ({
        id: track.id,
        enabled: track.enabled,
        readyState: track.readyState,
        kind: track.kind,
        label: track.label
      })));

      // Force enable audio tracks
      audioTracks.forEach(track => track.enabled = true);
        
      setRemoteStream(remoteStream);

      stream.getAudioTracks().forEach(track => {
        track.enabled = true;
        console.log(`🎤 User ensured audio track ${track.id} enabled:`, track.enabled);
      });
  
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        console.log('✅ Remote video element updated for user');
        setTimeout(() => {
        tryPlayRemoteVideo();
        }, 200);
      }
      setCallStatus('Connected');
    });

    // Enhanced signaling
    peer.on('signal', async (data: any) => {
      console.log('User sending signal:', data.type);
      
      if (data.type === 'candidate') {
        if (
          !data.candidate ||
          typeof data.candidate !== 'object' ||
          typeof data.candidate.candidate !== 'string' ||
          !data.candidate.candidate ||
          data.candidate.sdpMid === undefined ||
          data.candidate.sdpMLineIndex === undefined
        ) {
          console.warn('User: Invalid ICE candidate, not sending:', data);
          return;
        }
      }
      
      try {
        if (data.type === 'answer') {
          if (hasSentAnswer) return;
          hasSentAnswer = true;
          console.log('User sending answer signal');
        }
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

    // Process existing signals
    const remoteSignalPath = `${signalBasePath}/${remoteUserId}`;
    
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
        for (const [key, signalDataRaw] of Object.entries(existingSignals)) {
          const signalData = signalDataRaw as { callId: any; role: string; signal: { type: string }; };
          processedSignalKeys.add(key);
          if (signalData.callId === incomingVideoCall.callId && signalData.role === 'caller') {
            console.log('User processing existing signal:', signalData.signal.type);
            if (signalData.signal.type === 'offer' && !offerProcessed) {
              peer.signal(signalData.signal);
              offerProcessed = true;
              console.log('User processed first offer from existing signals');
            } else if (signalData.signal.type !== 'offer') {
              peer.signal(signalData.signal);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
    } catch (error) {
      console.error('Error processing existing signals:', error);
    }

    // Listen for new signals
    const unsubscribe = onChildAdded(ref(firebaseDb, remoteSignalPath), (snapshot) => {
      const key = snapshot.key;
      if (processedSignalKeys.has(key)) return;
      processedSignalKeys.add(key);
      const data = snapshot.val();
      if (!data || !data.signal || !peer || peer.destroyed) return;
      if (data.callId !== incomingVideoCall.callId) return;
      
      console.log('User processing new signal:', data.signal.type);
      
      if (data.signal.type === 'candidate') {
        if (
          !data.signal.candidate ||
          typeof data.signal.candidate !== 'object' ||
          typeof data.signal.candidate.candidate !== 'string' ||
          !data.signal.candidate.candidate ||
          data.signal.candidate.sdpMid === undefined ||
          data.signal.candidate.sdpMLineIndex === undefined
        ) {
          console.warn('User: Received invalid ICE candidate, ignoring:', data.signal);
          return;
        }
      }
      
      try {
        if (data.signal.type === 'offer' && !offerProcessed) {
          peer.signal(data.signal);
          offerProcessed = true;
          console.log('User processed first offer from new signals');
        } else if (data.signal.type !== 'offer') {
          peer.signal(data.signal);
        }
      } catch (error: any) {
        console.error('Error processing remote signal:', error);
      }
    });

    signalingCleanupRef.current = () => {
      unsubscribe();
      cleanupMonitoring();
    };

    peer.on('connect', () => {
      console.log('✅ User peer connected');
      setCallStatus('Connected');
    });

    peer.on('close', () => {
      console.log('User peer connection closed');
      cleanupMonitoring();
      setCallStatus('Call ended');
      
      // CRITICAL FIX: Only end video call, not the entire session
      setIsVideoCallActive(false);
      setIsCallInitiator(false);
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }
      setRemoteStream(null);
      
      // Ensure session is preserved
      setActiveFirebaseSessionPath(currentSessionPath);
      activeSessionRef.current = currentSessionPath;
    });

    videoCallInitializingRef.current = false;
    setCallStatus('Connecting...');

    // FINAL CHECK: Ensure session path is still set
    console.log('🔍 Final session check:', {
      currentSessionPath,
      activeFirebaseSessionPath,
      activeSessionRefCurrent: activeSessionRef.current
    });

  } catch (error: any) {
    console.error('Error accepting video call:', error);
    setCallStatus('Failed to accept video call: ' + error.message);
    
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
    
    // CRITICAL FIX: Restore session state on error
    setActiveFirebaseSessionPath(currentSessionPath);
    activeSessionRef.current = currentSessionPath;
    
    setTimeout(() => setCallStatus(''), 5000);
  }
}, [firebaseDb, activeFirebaseSessionPath, myUserId, incomingVideoCall, localStream, isVideoCallActive, myRole]);


  // Enhanced endVideoCall with initialization flag reset
  const endVideoCall = useCallback(() => {
  console.log('Ending video call...');
  
  // CRITICAL FIX: Preserve current session path
  const currentSessionPath = activeFirebaseSessionPath;
  
  videoCallInitializingRef.current = false;
  
  setTimeout(() => {
    // Clean up video call resources
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
    
    if (signalingCleanupRef.current) {
      try {
        signalingCleanupRef.current();
      } catch (error) {
        console.warn('Error cleaning up signaling:', error);
      }
      signalingCleanupRef.current = null;
    }
    
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
    
    setRemoteStream(null);
    setIsVideoCallActive(false);
    setIsCallInitiator(false);
    setCallStatus('');
    setIncomingVideoCall(null);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    
    // CRITICAL FIX: Restore session if it was active
    if (currentSessionPath) {
      console.log('🔄 Preserving session after video call end:', currentSessionPath);
      setActiveFirebaseSessionPath(currentSessionPath);
      activeSessionRef.current = currentSessionPath;
    }
    
    console.log('Video call cleanup complete - session preserved');
  }, 2000);
}, [localStream, activeFirebaseSessionPath]);

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

  useEffect(() => {
  console.log('🔍 Local stream state changed:', {
    hasLocalStream: !!localStream,
    streamId: localStream?.id,
    streamActive: localStream?.active,
    videoTracks: localStream?.getVideoTracks().length || 0,
    audioTracks: localStream?.getAudioTracks().length || 0,
    localVideoElement: !!localVideoRef.current
  });

  if (localStream && localVideoRef.current) {
    console.log('🔍 Setting local stream to video element');
    
    // CRITICAL FIX: Add delay to prevent interruption
    setTimeout(() => {
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
        
        // Enhanced play with retry logic
        const playVideo = async () => {
          try {
            await localVideoRef.current!.play();
            console.log('✅ Local video playing successfully');
          } catch (error: any) {
            if (error.name === 'AbortError') {
              console.log('🔄 Local video play aborted, retrying...');
              setTimeout(playVideo, 100);
            } else {
              console.warn('Local video play failed:', error);
            }
          }
        };
        
        playVideo();
      }
    }, 100);
  }
}, [localStream]);

  useEffect(() => {
    if (!remoteStream) return;
    
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(remoteStream);
    const analyser = audioContext.createAnalyser();
    source.connect(analyser);
    
    const resumeContextIfSuspended = async () => {
      if (audioContext.state === 'suspended') {
        try {
          await audioContext.resume();
          console.log('🔊 AudioContext resumed');
        } catch (err) {
          console.warn('AudioContext resume failed:', err);
        }
      }
    };

    remoteVideoRef.current?.addEventListener('play', resumeContextIfSuspended);

    const checkAudio = () => {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      const isAudioPlaying = dataArray.some(value => value > 0);
      console.log('🔊 Audio activity detected:', isAudioPlaying);
      
      if (!isAudioPlaying) {
        console.warn('No audio detected!');
      }
    };
    
    const interval = setInterval(checkAudio, 2000);
    
    return () => {
      remoteVideoRef.current?.removeEventListener('play', resumeContextIfSuspended);
      clearInterval(interval);
      audioContext.close();
    };
  }, [remoteStream]);

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

  useEffect(() => {
  if (peerRef.current && isVideoCallActive) {
    const monitorConnection = setInterval(() => {
      if (peerRef.current && !peerRef.current.destroyed) {
        try {
          // Get connection stats (this is a simplified version)
          const connectionState = peerRef.current._pc?.connectionState;
          const iceConnectionState = peerRef.current._pc?.iceConnectionState;
          
          console.log('Connection monitoring:', {
            connectionState,
            iceConnectionState,
            connected: peerRef.current.connected
          });
          
          // Update UI based on connection quality
          if (connectionState === 'failed' || iceConnectionState === 'failed') {
            setCallStatus('Connection lost - attempting to reconnect...');
          } else if (connectionState === 'disconnected') {
            setCallStatus('Connection interrupted...');
          }
        } catch (error) {
          console.warn('Error monitoring connection:', error);
        }
      }
    }, 2000);

    return () => {
      clearInterval(monitorConnection);
    };
  }
}, [isVideoCallActive]);

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
  const currentSessionPath = activeSessionRef.current;
  console.log('🚨 endSession called from:');
  console.trace(); // This will show the call stack
  console.log('🔴 endSession called for:', currentSessionPath);
  
  // Prevent multiple calls
  if (!currentSessionPath || endedSessions.has(currentSessionPath)) {
    console.log('⏭️ Session already ended or not active, skipping');
    return;
  }
  
  try {
    // Mark as ended immediately to prevent re-entry
    console.log('🔒 Marking session as ended:', currentSessionPath);
    setEndedSessions(prev => new Set([...prev, currentSessionPath]));
    
    // Clear local state first
    console.log('🧹 Clearing local session state...');
    setActiveFirebaseSessionPath(null);
    activeSessionRef.current = null;
    setChatMessages([]);
    
    // Clean up all listeners
    console.log('🧹 Calling clearAllCleanup from endSession...');
    clearAllCleanup();
    
    // End video call if active
    if (isVideoCallActive) {
      console.log('📹 Ending active video call...');
      endVideoCall();
    }
    
    // Set Firebase status to ended
    if (firebaseDb) {
      try {
        const { ref, set } = await import('firebase/database');
        set(ref(firebaseDb, `${currentSessionPath}/status`), 'ended')
          .then(() => console.log('✅ Firebase status updated to ended'))
          .catch(err => console.warn('⚠️ Failed to update Firebase status:', err));
      } catch (fbError) {
        console.warn('⚠️ Firebase import error:', fbError);
      }
    }
    
    console.log('✅ Session ended successfully');

  } catch (err) {
    console.error('❌ Session cleanup error:', err);
  }
}, [firebaseDb, isVideoCallActive, endVideoCall, clearAllCleanup, endedSessions, activeFirebaseSessionPath]);

useEffect(() => {
  const fetchMissingUserDetails = async () => {
    const missingUserIds = incomingRequests
      .map(req => req.fromMentorId)
      .filter(userId => !userDetailsCache[userId] && !fetchingUserDetails.has(userId));
    
    if (missingUserIds.length === 0) return;
    
    console.log('Fetching missing user details for:', missingUserIds);
    
    // Mark as fetching to prevent duplicate requests
    setFetchingUserDetails(prev => {
      const newSet = new Set(prev);
      missingUserIds.forEach(id => newSet.add(id));
      return newSet;
    });
    
    try {
      // Use your existing batch API endpoint
      const userIdsParam = missingUserIds.join(',');
      const response = await fetch(`/api/get-user-details?userIds=${encodeURIComponent(userIdsParam)}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.users) {
          // Convert the response to your UserDetails format
          const newUserDetails: {[key: string]: UserDetails} = {};
          
          Object.entries(data.users).forEach(([userId, userData]: [string, any]) => {
            newUserDetails[userId] = {
              displayName: userData.displayName || `${userData.firstName || 'Unknown'} ${userData.lastName || 'User'}`.trim(),
              firstName: userData.firstName || 'Unknown',
              lastName: userData.lastName || 'User',
              role: userData.role || 'user',
              id: userId,
              email: userData.email
            };
          });
          
          // Update cache with fetched details
          if (Object.keys(newUserDetails).length > 0) {
            setUserDetailsCache(prev => ({ ...prev, ...newUserDetails }));
            console.log(`Successfully cached ${Object.keys(newUserDetails).length} user details`);
          }
        } else {
          console.warn('API response indicates failure:', data);
        }
      } else {
        console.error('Failed to fetch user details:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      // Remove from fetching set
      setFetchingUserDetails(prev => {
        const newSet = new Set(prev);
        missingUserIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };
  
  fetchMissingUserDetails();
}, [incomingRequests, userDetailsCache, fetchingUserDetails]);


const setupSession = useCallback(async (path: string, sessionType: string) => {
  console.log(`🚀 Setting up ${sessionType} session at ${path}`);
  
  // Check if this session was already ended
  if (endedSessions.has(path)) {
    console.log('❌ Session was already ended, skipping setup:', path);
    return;
  }
  
  // Don't setup if already active for this exact path
  if (activeSessionRef.current === path) {
    console.log('⚠️ Session already active for this path, skipping setup');
    return;
  }

  try {
    const { ref, onValue, onChildAdded, set, serverTimestamp } = await import('firebase/database');
    
    // Set session status to active in Firebase
    const sessionRef = ref(firebaseDb, `${path}/status`);
    console.log('📝 Setting session status to active in Firebase...');
    await set(sessionRef, 'active');
    console.log('✅ Session status set to active in Firebase');
    
    // Set local state
    console.log('🔒 Setting active session path locally:', path);
    setActiveFirebaseSessionPath(path);
    activeSessionRef.current = path;
    
    // Clear any existing session data
    setChatMessages([]);
    
    const messagesRef = ref(firebaseDb, `${path}/messages`);
    const videoCallNotificationsRef = ref(firebaseDb, `${path}/video_call_notifications`);
    
    // Set up message listener
    console.log('📨 Setting up messages listener...');
    const messagesUnsubscribe = onChildAdded(messagesRef, (snapshot) => {
      try {
        const message = snapshot.val();
        if (message && !endedSessions.has(path) && activeSessionRef.current === path) {
          console.log('📨 New message received');
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
        console.error('❌ Message processing error:', err);
      }
    });

    // Set up video call notifications listener
    console.log('📹 Setting up video call notifications listener...');
    const videoCallUnsubscribe = onChildAdded(videoCallNotificationsRef, (snapshot) => {
      try {
        if (endedSessions.has(path) || activeSessionRef.current !== path) {
          console.log('⏭️ Ignoring video call notification - session not active');
          return;
        }
        
        const notification = snapshot.val();
        
        if (notification && notification.from !== myUserId && notification.type === 'video_call_request') {
          const otherUserId = notification.from;
          
          if (!otherUserId || !myUserId) return;
          
          const shouldWeInitiate = determineInitiator(myUserId, otherUserId, myRole || 'user');
          
          if (shouldWeInitiate) {
            console.log('❌ We should initiate, ignoring incoming call');
            return;
          }
          
          console.log('✅ Setting incoming video call');
          setIncomingVideoCall(notification);
        }
      } catch (err) {
        console.error('❌ Video call notification error:', err);
      }
    });

    // Set up session status listener with delay
    console.log('📊 Setting up session status listener...');
    let sessionStatusTimeout: NodeJS.Timeout | null = null;
    let initialStatusReceived = false;
    
    const sessionUnsubscribe = onValue(sessionRef, (snapshot) => {
      try {
        const sessionStatus = snapshot.val();
        
        // Skip the first status update if it's our own 'active' status
        if (!initialStatusReceived) {
          initialStatusReceived = true;
          if (sessionStatus === 'active') {
            console.log('✅ Initial session status confirmed as active');
            return;
          }
        }
        
        console.log('📊 Session status update:', sessionStatus);
        
        if (sessionStatusTimeout) {
          clearTimeout(sessionStatusTimeout);
          sessionStatusTimeout = null;
        }
        
        if (sessionStatus === 'ended') {
          console.log('⚠️ Session status is "ended" - will check after delay...');
          
          sessionStatusTimeout = setTimeout(() => {
            const isOurActiveSession = activeSessionRef.current === path;
            const isNotInVideoCall = !isVideoCallActive;
            const isNotAlreadyEnded = !endedSessions.has(path);
            
            if (isOurActiveSession && isNotInVideoCall && isNotAlreadyEnded) {
              console.log('✅ Ending session after delay');
              endSession();
            } else {
              console.log('❌ Not ending session - conditions not met');
            }
          }, 2000);
        }
      } catch (err) {
        console.error('❌ Session status error:', err);
      }
    });

    // Store cleanup functions
    const sessionCleanup = () => {
      console.log('🧹 Cleaning up session listeners for:', path);
      
      if (sessionStatusTimeout) {
        clearTimeout(sessionStatusTimeout);
        sessionStatusTimeout = null;
      }
      
      try {
        messagesUnsubscribe();
        videoCallUnsubscribe();
        sessionUnsubscribe();
      } catch (err) {
        console.warn('⚠️ Session cleanup error:', err);
      }
    };

    // CRITICAL: Only add cleanup if session is still valid
    if (!endedSessions.has(path) && activeSessionRef.current === path) {
      addCleanup(sessionCleanup);
      console.log('✅ Session setup completed successfully for:', path);
    } else {
      console.log('❌ Session ended during setup, cleaning up');
      sessionCleanup();
    }

  } catch (err) {
    console.error('❌ Session setup error:', err);
    if (activeSessionRef.current === path) {
      setActiveFirebaseSessionPath(null);
      activeSessionRef.current = null;
    }
  }
}, [addCleanup, endSession, firebaseDb, myUserId, myRole, isVideoCallActive, endedSessions]);

// Clear ended sessions periodically to prevent memory buildup
useEffect(() => {
  const cleanupInterval = setInterval(() => {
    setEndedSessions(prev => {
      // Keep only recent ended sessions (last hour)
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      const recentSessions = new Set<string>();
      
      // Since we don't have timestamps for ended sessions, just clear them periodically
      // This prevents the Set from growing indefinitely
      if (prev.size > 10) {
        return new Set<string>();
      }
      return prev;
    });
  }, 5 * 60 * 1000); // Every 5 minutes

  return () => clearInterval(cleanupInterval);
}, []);


  // Enhanced Firebase listeners with better session management
  useEffect(() => {
  console.log('🔍 Firebase listeners effect triggered with dependencies:', {
    isInitialized,
    myUserId: !!myUserId,
    myRole,
    firebaseDb: !!firebaseDb,
    listenersActive: listenersActiveRef.current,
    isVideoCallActive, // ADD THIS to dependencies but handle it properly
  });
  
  if (!isInitialized || !myUserId || !myRole || !firebaseDb) {
    console.log('⏸️ Skipping Firebase listeners setup - missing requirements');
    return;
  }
  
  if (listenersActiveRef.current) {
    console.log('⏸️ Skipping Firebase listeners setup - already active');
    return;
  }

  // CRITICAL FIX: Don't setup new listeners during video call initialization
  if (videoCallInitializingRef.current) {
    console.log('⏸️ Skipping Firebase listeners setup - video call initializing');
    return;
  }

  console.log('🔧 Setting up Firebase listeners...');
  listenersActiveRef.current = true;
  let isActive = true;

  const setupListeners = async () => {
    try {
      const { ref, onValue, onChildAdded } = await import('firebase/database');
      
      const statusesRef = ref(firebaseDb, 'user_statuses');
      const requestsRef = ref(firebaseDb, `user_notifications/${myUserId}/requests`);
      const responsesRef = ref(firebaseDb, `user_notifications/${myUserId}/responses`);

      // Status listener (unchanged)
      let statusUpdateTimeout: NodeJS.Timeout | null = null;
      const statusUnsubscribe = onValue(statusesRef, (snapshot) => {
        if (!isActive) return;
        
        try {
          const newStatuses = snapshot.val() || {};
          
          if (statusUpdateTimeout) clearTimeout(statusUpdateTimeout);
          statusUpdateTimeout = setTimeout(() => {
            if (isActive) {
              setOnlineUserStatuses((prevStatuses: any) => {
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

      // Requests listener (unchanged)
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
      
      let processedResponseIds = new Set<string>();
      const responsesUnsubscribe = onChildAdded(responsesRef, (snapshot) => {
        if (!isActive) return;
        
        try {
          const response = snapshot.val();
          const responseId = snapshot.key;
          
          if (!response || !responseId) return;
          
          if (processedResponseIds.has(responseId)) {
            console.log('🔄 Response already processed:', responseId);
            return;
          }
          
          if (response.firebaseSessionPath && endedSessions.has(response.firebaseSessionPath)) {
            console.log('🚫 Ignoring response for ended session:', response.firebaseSessionPath);
            return;
          }
          
          // Only process very recent responses
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
          
          const thirtySecondsAgo = Date.now() - (30 * 1000);
          if (responseTime > 0 && responseTime < thirtySecondsAgo) {
            console.log('⏰ Ignoring old response:', responseId);
            return;
          }
          
          processedResponseIds.add(responseId);
          console.log('✅ Processing response:', response.type, responseId);
          
          if (response.type === 'session_accepted') {
            console.log('🎯 Session accepted:', response.firebaseSessionPath);
            
            const hasActiveSession = !!activeSessionRef.current;
            const isSessionEnded = endedSessions.has(response.firebaseSessionPath);
            const isVideoCallInitializing = videoCallInitializingRef.current;
            
            console.log('🔍 Session acceptance check:', {
              hasActiveSession,
              currentActiveSession: activeSessionRef.current,
              newSessionPath: response.firebaseSessionPath,
              isSessionEnded,
              isVideoCallInitializing
            });
            
            // CRITICAL FIX: Don't setup new session if video call is initializing
            if (!hasActiveSession && !isSessionEnded && !isVideoCallInitializing) {
              console.log('✅ Setting up new session:', response.firebaseSessionPath);
              setupSession(response.firebaseSessionPath, response.sessionType);
            } else {
              console.log('⚠️ Cannot setup session - already have active session, session ended, or video call initializing');
            }
          }
        } catch (err) {
          console.error('❌ Response processing error:', err);
        }
      });

      // Store cleanup
      const cleanup = () => {
        console.log('🧹 Firebase listeners cleanup called');
        isActive = false;
        listenersActiveRef.current = false;
        
        if (statusUpdateTimeout) clearTimeout(statusUpdateTimeout);
        if (requestUpdateTimeout) clearTimeout(requestUpdateTimeout);
        
        try {
          statusUnsubscribe();
          requestsUnsubscribe();
          responsesUnsubscribe();
        } catch (err) {
          console.warn('⚠️ Listener cleanup error:', err);
        }
      };

      addCleanup(cleanup);
      console.log('✅ Firebase listeners setup completed');

    } catch (err) {
      console.error('❌ Firebase listeners setup error:', err);
      listenersActiveRef.current = false;
    }
  };

  setupListeners();

  return () => {
    console.log('🧹 Firebase listeners effect cleanup');
    isActive = false;
    listenersActiveRef.current = false;
  };
}, [isInitialized, myUserId, myRole, firebaseDb, setupSession, addCleanup, endedSessions, processedRequests]); // REMOVED videoCallInitializingRef from dependencies



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

useEffect(() => {
  // This effect should only run on mount/unmount, not when dependencies change
  return () => {
    console.log('🔴 Component unmounting - running final cleanup');
    
    // Store current values at cleanup time
    const currentSessionPath = activeSessionRef.current;
    
    // Clean up all listeners first
    cleanupFunctions.current.forEach((cleanup: () => void) => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Cleanup error on unmount:', error);
      }
    });
    cleanupFunctions.current = [];
    
    // End session if active
    if (currentSessionPath) {
      // Set Firebase status to ended without triggering React state updates
      if (firebaseDb) {
        import('firebase/database').then(({ ref, set }) => {
          set(ref(firebaseDb, `${currentSessionPath}/status`), 'ended')
            .catch(err => console.warn('Failed to end session on unmount:', err));
        });
      }
    }
    
    console.log('✅ Component unmount cleanup completed');
  };
}, []);

  // Loading states
  if (userError) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '40px 20px',
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          fontSize: '32px'
        }}>
          👤
        </div>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600' }}>
          Authentication Error
        </h2>
        <p style={{ 
          margin: '0 0 24px 0', 
          fontSize: '16px', 
          opacity: 0.9, 
          textAlign: 'center',
          maxWidth: '500px',
          lineHeight: '1.5'
        }}>
          {userError}
        </p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            backdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          Refresh
        </button>
      </div>
    );
  }

  if (isLoading || !isInitialized || !myUserId || !myRole || !myUserDetails) {
    return (
      <ProfessionalLoader 
        title="Initializing Mentor System" 
        subtitle="Setting up your profile and connecting to services..."
      />
    );
  }

  return (
    <div>
      {/* ✅ FIXED NAVBAR AT TOP */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
        <Navbar />
      </div>
      
      {/* ✅ MAIN CONTENT WITH TOP PADDING TO ACCOUNT FOR FIXED NAVBAR */}
      <div style={{ 
        paddingTop: '80px', // Adjust based on your navbar height
        padding: '20px', 
        maxWidth: '1200px', 
        margin: '0 auto', 
        fontFamily: 'Arial, sans-serif' 
      }}>
        <h1 style={{ color: '#333', marginBottom: '30px' }}>Mentor/User Chat & Video Dashboard</h1>
        
        {/* 🔍 TEMPORARY DEBUG INFO - Remove this later */}
        <div className='bg-background text-secondary' style={{ 
          padding: '10px', 
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
          {incomingVideoCall && (
            <>Call From: {incomingVideoCall.from} | Call ID: {incomingVideoCall.callId}</>
          )}
        </div>
        
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
        <div className='bg-background text-secondary' style={{ 
          marginBottom: '30px', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3 className='text-secondary' style={{ margin: '0 0 15px 0' }}>Your Profile</h3>
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

        {/* ✅ UPDATED Incoming Video Call Notification with enhanced debugging */}
        {incomingVideoCall && !isVideoCallActive && (
          <div className='bg-background text-secondary' style={{ 
            marginBottom: '30px', 
            padding: '20px', 
            border: '3px solid #17a2b8', 
            borderRadius: '8px',
            animation: 'pulse 2s infinite'
          }}>
            <div>
              <h2 style={{ color: '#0c5460', margin: '0 0 10px 0' }}>
                📹 Incoming Video Call (DEBUG: {JSON.stringify(incomingVideoCall)})
              </h2>
              <p style={{ margin: 0, fontSize: '16px', color: '#0c5460' }}>
                From: {getUserDisplayName(incomingVideoCall.from)}
              </p>
              <p style={{ fontSize: '12px', color: '#6c757d' }}>
                Call ID: {incomingVideoCall.callId} | Role: {myRole}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button 
                onClick={() => {
                  console.log('🔴 ACCEPT BUTTON CLICKED');
                  acceptVideoCall();
                }}
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
                📹 Accept Call
              </button>
              <button 
                onClick={() => {
                  console.log('🔴 DECLINE BUTTON CLICKED');
                  setIncomingVideoCall(null);
                }}
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
        )}

        {/* Mentor Controls */}
        {myRole === 'mentor' && (
          <div className='bg-background text-secondary' style={{ 
            marginBottom: '30px', 
            padding: '20px', 
            border: '2px solid #007bff', 
            borderRadius: '8px',
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
          <div className='bg-background text-secondary' style={{ 
            marginBottom: '30px', 
            padding: '20px', 
            border: '2px solid #ffc107', 
            borderRadius: '8px',
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
                {!isVideoCallActive && myRole == 'mentor' && (
                  <button 
                    onClick={startVideoCallCompatible}
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
                      muted={true} // Local video should be muted
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
                      muted={false}
                      playsInline
                      style={{ 
                        width: '100%', 
                        height: '250px', 
                        backgroundColor: '#000', 
                        borderRadius: '8px',
                        objectFit: 'cover'
                      }}
                    />
                    {/* Add unmute button here for better visibility */}
                    {!isAudioEnabled && (
                      <div style={{
                        position: 'absolute',
                        bottom: '50px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 10
                      }}>
                        <button
                          onClick={() => {
                            const audioTracks = remoteStream?.getAudioTracks() || [];
                            audioTracks.forEach(track => track.enabled = true);
                            setIsAudioEnabled(true);
                          }}
                          style={{ 
                            padding: '10px 15px', 
                            backgroundColor: '#17a2b8', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '25px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                          }}
                        >
                          🔊 Unmute Audio
                        </button>
                      </div>
                    )}
                     {isRemotePlaybackBlocked && (
                      <div style={{
                        position: 'absolute',
                        bottom: '90px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 10
                      }}>
                        <button
                          onClick={tryPlayRemoteVideo}
                          style={{
                            padding: '10px 15px',
                            backgroundColor: '#ffc107',
                            color: 'white',
                            border: 'none',
                            borderRadius: '25px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                          }}
                        >
                          ▶ Start Video
                        </button>
                      </div>
                    )}
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
        <div className='bg-background text-secondary' style={{ 
          padding: '20px', 
          border: '1px solid #dee2e6', 
          borderRadius: '8px',
        }}>
          <h3 className='text-secondary' style={{ 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            👥 Online Users ({onlineUsersCount})
          </h3>
          {onlineUsersCount === 0 ? (
            <div className='text-secondary' style={{ 
              textAlign: 'center', 
              fontStyle: 'italic',
              padding: '30px'
            }}>
              No users currently online
            </div>
          ) : (
            <div className='bg-background text-secondary' style={{ display: 'grid', gap: '12px' }}>
              {onlineUsersList.map(({ uid, data, displayName }) => (
                <div key={uid} style={{ 
                  padding: '15px', 
                  borderRadius: '8px',
                  border: '1px solid #e9ecef',
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div>
                    <div className='text-secondary' style={{ fontWeight: 'bold' }}>
                      {displayName}
                    </div>
                    <div className='text-secondary' style={{ fontSize: '14px' }}>
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
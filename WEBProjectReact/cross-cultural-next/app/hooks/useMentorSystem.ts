// hooks/useMentorSystem.ts - Fixed TypeScript errors
import { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, off } from 'firebase/database';

interface UserDetails {
  displayName: string;
  firstName: string;
  lastName: string;
  role: string;
  id: string;
  email?: string;
}

// Firebase config (should match your existing config)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const firebaseDb = getDatabase(app);

// Hook for user initialization
export const useUserInitialization = () => {
  const [userState, setUserState] = useState({
    myUserId: null as string | null,
    myRole: null as 'user' | 'mentor' | null,
    myUserDetails: null as UserDetails | null,
    isInitialized: false,
    error: null as string | null,
    isLoading: true
  });

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        
        if (!storedUser) {
          throw new Error('No user data found in localStorage');
        }

        const parsedUser = JSON.parse(storedUser);
        const userId = parsedUser._id || parsedUser.id;
        let userRole = parsedUser.role;
        
        // Validate and fix role if needed
        if (!userRole || !['user', 'mentor'].includes(userRole)) {
          console.warn('Invalid role, fetching from server...');
          
          try {
            const response = await fetch('/api/profile', {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
            });
            
            if (response.ok) {
              const profileData = await response.json();
              userRole = profileData.user?.role || 'user';
              
              // Update localStorage
              const updatedUser = { ...parsedUser, role: userRole };
              localStorage.setItem("user", JSON.stringify(updatedUser));
            } else {
              userRole = 'user'; // Safe default
            }
          } catch {
            userRole = 'user'; // Safe default
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
        
        setUserState({
          myUserId: userId,
          myRole: userRole as 'user' | 'mentor',
          myUserDetails: userDetails,
          isInitialized: true,
          error: null,
          isLoading: false
        });
        
      } catch (error) {
        console.error('User initialization error:', error);
        setUserState(prev => ({
          ...prev,
          error: 'Failed to load user data. Please refresh the page.',
          isInitialized: true,
          isLoading: false
        }));
      }
    };

    initializeUser();
  }, []);

  return userState;
};

// Hook for Firebase status management
export const useFirebaseStatus = (userId: string | null, userDetails: UserDetails | null) => {
  const [isOnline, setIsOnline] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId || !userDetails) return;

    const userStatusRef = ref(firebaseDb, `user_statuses/${userId}`);
    const connectedRef = ref(firebaseDb, '.info/connected');

    const handleConnectedChange = (snapshot: any) => {
      if (snapshot.val() === true) {
        const statusData = {
          status: 'online',
          role: userDetails.role,
          displayName: userDetails.displayName,
          firstName: userDetails.firstName,
          lastName: userDetails.lastName,
          timestamp: { '.sv': 'timestamp' },
        };
        
        import('firebase/database').then(({ set }) => {
          set(userStatusRef, statusData)
            .then(() => setIsOnline(true))
            .catch(() => setIsOnline(false));
        });
      } else {
        setIsOnline(false);
      }
    };

    const unsubscribe = onValue(connectedRef, handleConnectedChange);
    cleanupRef.current = unsubscribe;

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      
      // Set offline status
      if (userId && userDetails) {
        import('firebase/database').then(({ set, serverTimestamp }) => {
          set(ref(firebaseDb, `user_statuses/${userId}`), {
            status: 'offline',
            role: userDetails.role,
            displayName: userDetails.displayName,
            firstName: userDetails.firstName,
            lastName: userDetails.lastName,
            timestamp: serverTimestamp(),
          }).catch(console.error);
        });
      }
    };
  }, [userId, userDetails]);

  return isOnline;
};

// Hook for user details caching
export const useUserDetailsCache = () => {
  const [userDetailsCache, setUserDetailsCache] = useState<{[key: string]: UserDetails}>({});
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUserDetails = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return {};
    
    try {
      const response = await fetch(`/api/get-user-details?userIds=${userIds.join(',')}`);
      if (!response.ok) throw new Error('Failed to fetch user details');
      
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

  const debouncedFetchUserDetails = useCallback((userIds: string[]) => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    fetchTimeoutRef.current = setTimeout(() => {
      fetchUserDetails(userIds);
    }, 500);
  }, [fetchUserDetails]);

  const getUserDisplayName = useCallback((userId: string): string => {
    const userDetails = userDetailsCache[userId];
    return userDetails 
      ? `${userDetails.displayName} (${userDetails.role})`
      : userId;
  }, [userDetailsCache]);

  const addUserToCache = useCallback((userId: string, userDetails: UserDetails) => {
    setUserDetailsCache(prev => ({ ...prev, [userId]: userDetails }));
  }, []);

  return {
    userDetailsCache,
    fetchUserDetails,
    debouncedFetchUserDetails,
    getUserDisplayName,
    addUserToCache
  };
};

// Hook for search functionality
export const useUserSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserDetails[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const searchUsers = useCallback(async (query: string, role?: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    
    try {
      const url = `/api/search-users?query=${encodeURIComponent(query)}${role ? `&role=${role}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      if (data.users) {
        setSearchResults(data.users);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery, 'user'); // Default to searching for users
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
  }, [searchQuery, searchUsers]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    showSearchResults,
    setShowSearchResults,
    isSearching,
    searchUsers,
    clearSearch
  };
};

// Hook for session management
export const useSessionManagement = (userId: string | null) => {
  const [activeFirebaseSessionPath, setActiveFirebaseSessionPath] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isInVideoCall, setIsInVideoCall] = useState(false);
  const sessionCleanupRef = useRef<(() => void)[]>([]);

  const addSessionCleanup = useCallback((cleanup: () => void) => {
    sessionCleanupRef.current.push(cleanup);
  }, []);

  const clearSessionListeners = useCallback(() => {
    sessionCleanupRef.current.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Error cleaning up session listener:', error);
      }
    });
    sessionCleanupRef.current = [];
  }, []);

  const endCurrentSession = useCallback(() => {
    console.log('Ending current session');
    
    if (activeFirebaseSessionPath) {
      // Update session status
      import('firebase/database').then(({ set, ref }) => {
        set(ref(firebaseDb, `${activeFirebaseSessionPath}/status`), 'ended');
      });
      
      clearSessionListeners();
      setActiveFirebaseSessionPath(null);
    }
    
    // Reset state
    setChatMessages([]);
    setIsInVideoCall(false);
  }, [activeFirebaseSessionPath, clearSessionListeners]);

  const sendChatMessage = useCallback((message: string) => {
    if (!activeFirebaseSessionPath || !userId || !message.trim()) return;
    
    console.log('Sending chat message');
    import('firebase/database').then(({ push, ref, serverTimestamp }) => {
      push(ref(firebaseDb, `${activeFirebaseSessionPath}/messages`), {
        from: userId,
        message: message.trim(),
        timestamp: serverTimestamp(),
      });
    });
  }, [activeFirebaseSessionPath, userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSessionListeners();
      endCurrentSession();
    };
  }, [clearSessionListeners, endCurrentSession]);

  return {
    activeFirebaseSessionPath,
    setActiveFirebaseSessionPath,
    chatMessages,
    setChatMessages,
    isInVideoCall,
    setIsInVideoCall,
    addSessionCleanup,
    clearSessionListeners,
    endCurrentSession,
    sendChatMessage
  };
};

// Hook for request management
export const useRequestManagement = (userId: string | null, role: 'user' | 'mentor' | null) => {
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [processedRequests, setProcessedRequests] = useState<Set<string>>(new Set());

  const sendSessionRequest = useCallback(async (targetUserId: string, sessionType: 'chat' | 'video') => {
    if (!userId || role !== 'mentor') {
      throw new Error('Only mentors can send session requests');
    }
    
    if (!targetUserId.trim()) {
      throw new Error('Please enter a valid user ID');
    }
    
    console.log(`Sending ${sessionType} request to: ${targetUserId}`);
    
    const { push, ref, serverTimestamp } = await import('firebase/database');
    const notificationPath = `user_notifications/${targetUserId}/requests`;
    
    await push(ref(firebaseDb, notificationPath), {
      type: 'session_request',
      fromMentorId: userId,
      sessionType: sessionType,
      timestamp: serverTimestamp(),
      status: 'pending'
    });
    
    return true;
  }, [userId, role]);

  const acceptSessionRequest = useCallback(async (fromMentorId: string, sessionType: 'chat' | 'video', requestId: string) => {
    if (!userId || role !== 'user') {
      throw new Error('Only users can accept session requests');
    }
    
    console.log(`Accepting ${sessionType} session from: ${fromMentorId}`);
    
    // Mark as processed
    setProcessedRequests(prev => new Set([...prev, requestId]));
    
    // Generate session
    const sessionId = `${userId}_${fromMentorId}_${Date.now()}`;
    const firebaseSessionPath = `live_sessions/${sessionId}`;

    const { set, push, ref, serverTimestamp } = await import('firebase/database');

    // Initialize session
    await set(ref(firebaseDb, firebaseSessionPath), {
      mentorId: fromMentorId,
      userId: userId,
      sessionType: sessionType,
      status: 'active',
      createdAt: serverTimestamp(),
    });

    // Notify both parties
    const notifications = [
      {
        path: `user_notifications/${userId}/responses`,
        data: {
          type: 'session_accepted',
          peerUserId: fromMentorId,
          sessionType: sessionType,
          firebaseSessionPath: firebaseSessionPath,
          timestamp: serverTimestamp(),
        }
      },
      {
        path: `user_notifications/${fromMentorId}/responses`,
        data: {
          type: 'session_accepted',
          peerUserId: userId,
          sessionType: sessionType,
          firebaseSessionPath: firebaseSessionPath,
          timestamp: serverTimestamp(),
        }
      }
    ];

    await Promise.all(
      notifications.map(notif => push(ref(firebaseDb, notif.path), notif.data))
    );

    // Update request status
    await set(ref(firebaseDb, `user_notifications/${userId}/requests/${requestId}/status`), 'accepted');
    
    // Remove from local state
    setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
    
    return firebaseSessionPath;
  }, [userId, role]);

  return {
    incomingRequests,
    setIncomingRequests,
    processedRequests,
    setProcessedRequests,
    sendSessionRequest,
    acceptSessionRequest
  };
};

// Main hook that combines all functionality
export const useMentorSystem = () => {
  const userState = useUserInitialization();
  const isOnline = useFirebaseStatus(userState.myUserId, userState.myUserDetails);
  const userCache = useUserDetailsCache();
  const search = useUserSearch();
  const session = useSessionManagement(userState.myUserId);
  const requests = useRequestManagement(userState.myUserId, userState.myRole);

  return {
    // User state
    ...userState,
    isOnline,
    
    // User cache
    ...userCache,
    
    // Search
    ...search,
    
    // Session management
    ...session,
    
    // Request management
    ...requests
  };
};
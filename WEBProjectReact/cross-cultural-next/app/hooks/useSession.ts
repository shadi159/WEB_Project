// hooks/useSession.ts - Custom hook for session management
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './use-toast';

interface UserData {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
}

interface SessionState {
  isLoggedIn: boolean;
  user: UserData | null;
  token: string | null;
  isLoading: boolean;
}

interface UseSessionReturn extends SessionState {
  login: (userData: UserData, token: string) => void;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
  validateToken: (token?: string) => boolean;
  clearSession: () => void;
}

export const useSession = (): UseSessionReturn => {
  const router = useRouter();
  const { toast } = useToast();
  
  const [sessionState, setSessionState] = useState<SessionState>({
    isLoggedIn: false,
    user: null,
    token: null,
    isLoading: true,
  });

  // 🔧 Enhanced session cleanup
  const clearSession = useCallback(() => {
    console.log("🧹 Clearing session from useSession hook");
    
    // Clear all storage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("profileCache");
    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.clear();
    
    // Reset state
    setSessionState({
      isLoggedIn: false,
      user: null,
      token: null,
      isLoading: false,
    });
    
    console.log("✅ Session cleared");
  }, []);

  // 🔧 Enhanced token validation
  const validateToken = useCallback((token?: string): boolean => {
    const tokenToValidate = token || localStorage.getItem("token");
    
    if (!tokenToValidate) {
      console.log("❌ No token to validate");
      return false;
    }

    try {
      // Basic JWT format check
      const parts = tokenToValidate.split('.');
      if (parts.length !== 3) {
        console.log("❌ Invalid JWT format");
        return false;
      }

      // Decode payload to check expiration
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Date.now() / 1000;
      
      if (payload.exp && payload.exp < currentTime) {
        console.log("❌ Token expired");
        return false;
      }

      console.log("✅ Token is valid");
      return true;
    } catch (error) {
      console.log("❌ Token validation error:", error);
      return false;
    }
  }, []);

  // 🔧 Login function
  const login = useCallback((userData: UserData, token: string) => {
    console.log("🔐 Logging in user:", userData.email);
    
    // Store in localStorage
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    sessionStorage.setItem("isLoggedIn", "true");
    
    // Update state
    setSessionState({
      isLoggedIn: true,
      user: userData,
      token,
      isLoading: false,
    });
    
    console.log("✅ User logged in successfully");
  }, []);

  // 🔧 Logout function
  const logout = useCallback(() => {
    console.log("👋 Logging out user");
    clearSession();
    toast({ 
      title: "Signed out", 
      description: "You have been signed out successfully" 
    });
    router.push("/SignIn");
  }, [clearSession, toast, router]);

  // 🔧 Refresh session from storage
  const refreshSession = useCallback(async (): Promise<boolean> => {
    console.log("🔄 Refreshing session");
    
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    const sessionFlag = sessionStorage.getItem("isLoggedIn");

    // Check if we have the required data
    if (!token || !storedUser || sessionFlag !== "true") {
      console.log("❌ Missing session data");
      clearSession();
      return false;
    }

    // Validate token
    if (!validateToken(token)) {
      console.log("❌ Invalid token during refresh");
      clearSession();
      toast({ 
        title: "Session expired", 
        description: "Please sign in again", 
        variant: "destructive" 
      });
      return false;
    }

    try {
      const userData = JSON.parse(storedUser);
      
      // Update state
      setSessionState({
        isLoggedIn: true,
        user: userData,
        token,
        isLoading: false,
      });
      
      console.log("✅ Session refreshed successfully");
      return true;
    } catch (error) {
      console.log("❌ Error parsing user data:", error);
      clearSession();
      return false;
    }
  }, [validateToken, clearSession, toast]);

  // 🔧 Initialize session on mount
  useEffect(() => {
    console.log("🚀 Initializing session");
    refreshSession();
  }, [refreshSession]);

  // 🔧 Periodic session validation
  useEffect(() => {
    if (!sessionState.isLoggedIn) return;

    const interval = setInterval(() => {
      console.log("⏰ Periodic session check");
      if (!validateToken()) {
        console.log("🚨 Session invalid during periodic check");
        logout();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [sessionState.isLoggedIn, validateToken, logout]);

  // 🔧 Listen for storage changes (multi-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token") {
        if (!e.newValue) {
          console.log("🔄 Token removed in another tab");
          clearSession();
        } else if (validateToken(e.newValue)) {
          console.log("🔄 Valid token added in another tab");
          refreshSession();
        }
      } else if (e.key === "user" && e.newValue) {
        console.log("🔄 User data updated in another tab");
        refreshSession();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [validateToken, clearSession, refreshSession]);

  // 🔧 Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && sessionState.isLoggedIn) {
        console.log("👁️ Tab became visible - checking session");
        if (!validateToken()) {
          logout();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sessionState.isLoggedIn, validateToken, logout]);

  return {
    ...sessionState,
    login,
    logout,
    refreshSession,
    validateToken,
    clearSession,
  };
};
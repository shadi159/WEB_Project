// utils/auth.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Type definition for decoded token
interface DecodedToken {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

/**
 * Authenticate a user based on their JWT token
 * Can be used as a middleware or utility function
 */
export const authenticateUser = (req: NextRequest) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Create a protected API route
 * @param handler The API route handler
 */
export const withAuth = (handler: Function) => {
  return async (req: NextRequest, res: NextResponse) => {
    const user = authenticateUser(req);
    
    if (!user) {
      return new NextResponse(
        JSON.stringify({ message: 'Unauthorized' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    
    // Add user to the request object
    return handler(req, res, user);
  };
};

/**
 * Utility function to get the current user from client-side
 * Returns the user object if authenticated, null otherwise
 */
export const getCurrentUser = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (!token || !user) {
    return null;
  }
  
  try {
    // Verify that the token is not expired
    const decoded = jwt.decode(token) as DecodedToken;
    const currentTime = Date.now() / 1000;
    
    if (decoded.exp < currentTime) {
      // Token is expired, clear storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('isLoggedIn');
      return null;
    }
    
    return JSON.parse(user);
  } catch (error) {
    return null;
  }
};
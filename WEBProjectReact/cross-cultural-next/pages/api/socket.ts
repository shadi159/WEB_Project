// pages/api/socket.ts - Improved version with better error handling and cleanup
import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as NetServer } from 'http';
import type { Socket as NetSocket } from 'net';
import mongoose from 'mongoose';
import * as admin from 'firebase-admin';
import LiveUser from '../../models/LiveUser';
import ActiveSession from '../../models/ActiveSession';

// Global connection state to prevent multiple connections
let mongoConnected = false;
let firebaseAdminApp: admin.app.App | null = null;

// Mongoose connection with singleton pattern
const connectMongo = async () => {
  if (mongoConnected && mongoose.connections[0].readyState === 1) {
    console.log('✅ MongoDB already connected');
    return;
  }
  
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    // Close existing connections if any
    if (mongoose.connections[0].readyState !== 0) {
      await mongoose.disconnect();
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    
    mongoConnected = true;
    console.log('✅ MongoDB connected successfully');
    
  } catch (error) {
    mongoConnected = false;
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
};

interface SocketServer extends NetServer {
  io?: Server | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

// Firebase Admin initialization with singleton pattern
const getFirebaseAdmin = () => {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const databaseURL = process.env.FIREBASE_DATABASE_URL;
    
    if (!serviceAccountKey || !databaseURL) {
      console.error('❌ Firebase environment variables not set');
      return null;
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountKey);
    } catch (parseError) {
      console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', parseError);
      return null;
    }

    // Check if Firebase app already exists
    try {
      firebaseAdminApp = admin.app();
      console.log('✅ Using existing Firebase Admin app');
    } catch {
      firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: databaseURL,
      });
      console.log('✅ Firebase Admin SDK initialized');
    }
    
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
    return null;
  }

  return firebaseAdminApp;
};

export default async function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  try {
    // Only allow POST requests to prevent GET request loops
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Connect to services
    await connectMongo();
    const firebaseApp = getFirebaseAdmin();
    
    if (!firebaseApp) {
      res.status(500).json({ error: 'Firebase Admin SDK not configured' });
      return;
    }

    const db = firebaseApp.database();

    // Initialize Socket.IO server only once
    if (!res.socket.server.io) {
      console.log('🚀 Initializing Socket.IO server...');
      
      const io = new Server(res.socket.server, {
        path: '/api/socket',
        cors: {
          origin: [
            'http://localhost:3000',
            'https://localhost:3000',
            /\.vercel\.app$/
          ],
          methods: ['GET', 'POST'],
          credentials: true,
        },
        transports: ['polling', 'websocket'],
        pingTimeout: 60000,
        pingInterval: 25000,
        connectTimeout: 45000,
        allowEIO3: true,
      });

      res.socket.server.io = io;

      // Socket connection handler
      io.on('connection', (socket) => {
        console.log(`✅ Client connected: ${socket.id}`);
        
        // Send initial connection confirmation
        socket.emit('connected', {
          message: 'Successfully connected to server',
          clientId: socket.id,
          timestamp: new Date().toISOString(),
        });

        // Handle user registration
        socket.on('register', async ({ userId, role }) => {
          try {
            if (!userId || !role || !['user', 'mentor'].includes(role)) {
              socket.emit('server-error', { 
                message: 'Invalid userId or role provided' 
              });
              return;
            }

            console.log(`📝 Registering: ${userId} as ${role}`);
            
            socket.data.userId = userId;
            socket.data.role = role;

            // Update LiveUser record
            await LiveUser.findOneAndUpdate(
              { userId },
              {
                socketIoId: socket.id,
                role,
                status: 'online',
                lastSeen: new Date(),
              },
              { upsert: true, new: true }
            );

            // Update Firebase status
            await db.ref(`user_statuses/${userId}`).set({
              status: 'online',
              socketIoId: socket.id,
              role,
              timestamp: admin.database.ServerValue.TIMESTAMP,
            });

            socket.emit('registration-success', { userId, role });
            console.log(`✅ User ${userId} registered successfully`);

          } catch (error) {
            console.error('❌ Registration error:', error);
            socket.emit('server-error', { 
              message: 'Registration failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        });

        // Handle mentor session requests
        socket.on('mentor-request-session', async ({ targetUserId, sessionType }) => {
          try {
            if (socket.data.role !== 'mentor') {
              socket.emit('server-error', { message: 'Only mentors can initiate sessions' });
              return;
            }

            if (!targetUserId || !sessionType || !['chat', 'video'].includes(sessionType)) {
              socket.emit('server-error', { message: 'Invalid target user or session type' });
              return;
            }

            console.log(`📞 Session request: ${socket.data.userId} -> ${targetUserId} (${sessionType})`);

            // Find target user
            const targetUser = await LiveUser.findOne({ 
              userId: targetUserId, 
              status: 'online' 
            });

            if (!targetUser) {
              socket.emit('server-error', { message: 'Target user not found or offline' });
              return;
            }

            // Check for existing active sessions
            const existingSession = await ActiveSession.findOne({
              $or: [
                { userUserId: targetUserId, status: 'active' },
                { mentorUserId: targetUserId, status: 'active' },
                { userUserId: socket.data.userId, status: 'active' },
                { mentorUserId: socket.data.userId, status: 'active' }
              ]
            });

            if (existingSession) {
              socket.emit('server-error', { message: 'User already in active session' });
              return;
            }

            // Send request via Firebase
            const requestRef = db.ref(`user_notifications/${targetUserId}/requests`).push();
            await requestRef.set({
              type: 'session_request',
              fromMentorId: socket.data.userId,
              mentorSocketIoId: socket.id,
              sessionType,
              timestamp: admin.database.ServerValue.TIMESTAMP,
              status: 'pending'
            });

            socket.emit('request-sent', { targetUserId, sessionType });
            console.log(`✅ Request sent to ${targetUserId}`);

          } catch (error) {
            console.error('❌ Error in mentor-request-session:', error);
            socket.emit('server-error', { 
              message: 'Failed to send session request',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        });

        // Handle user accepting sessions
        socket.on('user-accept-session', async ({ mentorUserId, sessionType, requestId }) => {
          try {
            if (socket.data.role !== 'user') {
              socket.emit('server-error', { message: 'Only users can accept sessions' });
              return;
            }

            console.log(`✅ Session accepted by ${socket.data.userId}`);

            // Find both users
            const [mentorUser, user] = await Promise.all([
              LiveUser.findOne({ userId: mentorUserId, status: 'online' }),
              LiveUser.findOne({ userId: socket.data.userId, status: 'online' })
            ]);

            if (!mentorUser || !user) {
              socket.emit('server-error', { message: 'Mentor or user not found' });
              return;
            }

            // Generate session
            const sessionId = `${user.userId}_${mentorUser.userId}_${Date.now()}`;
            const firebaseSessionPath = `live_sessions/${sessionId}`;

            // Create active session
            await ActiveSession.create({
              sessionId,
              mentorUserId: mentorUser.userId,
              mentorSocketIoId: mentorUser.socketIoId,
              userUserId: user.userId,
              userSocketIoId: user.socketIoId,
              sessionType,
              firebaseSessionPath,
              status: 'active',
            });

            // Initialize Firebase session
            await db.ref(firebaseSessionPath).set({
              mentorId: mentorUser.userId,
              userId: user.userId,
              sessionType,
              status: 'active',
              createdAt: admin.database.ServerValue.TIMESTAMP,
            });

            // Update request status
            if (requestId) {
              await db.ref(`user_notifications/${user.userId}/requests/${requestId}`).update({ 
                status: 'accepted' 
              });
            }

            // Notify both parties
            const notifications = [
              {
                path: `user_notifications/${user.userId}/responses`,
                data: {
                  type: 'session_accepted',
                  peerUserId: mentorUser.userId,
                  sessionType,
                  firebaseSessionPath,
                  timestamp: admin.database.ServerValue.TIMESTAMP,
                }
              },
              {
                path: `user_notifications/${mentorUser.userId}/responses`,
                data: {
                  type: 'session_accepted',
                  peerUserId: user.userId,
                  sessionType,
                  firebaseSessionPath,
                  timestamp: admin.database.ServerValue.TIMESTAMP,
                }
              }
            ];

            await Promise.all(
              notifications.map(notif => 
                db.ref(notif.path).push(notif.data)
              )
            );

            console.log(`✅ Session ${sessionId} created successfully`);

          } catch (error) {
            console.error('❌ Error accepting session:', error);
            socket.emit('server-error', { 
              message: 'Failed to accept session',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        });

        // Handle session ending
        socket.on('end-session', async () => {
          try {
            console.log(`🔚 Ending session for ${socket.data.userId}`);

            const session = await ActiveSession.findOneAndUpdate(
              {
                $or: [
                  { userSocketIoId: socket.id },
                  { mentorSocketIoId: socket.id }
                ],
                status: 'active'
              },
              { 
                status: 'ended', 
                endTime: new Date() 
              },
              { new: true }
            );

            if (session) {
              // Update Firebase
              await db.ref(session.firebaseSessionPath).update({
                status: 'ended',
                endedBy: socket.data.userId,
                endTime: admin.database.ServerValue.TIMESTAMP,
              });

              // Notify peer
              const peerUserId = session.userUserId === socket.data.userId 
                ? session.mentorUserId 
                : session.userUserId;

              await db.ref(`user_notifications/${peerUserId}/responses`).push({
                type: 'session_ended',
                peerUserId: socket.data.userId,
                sessionId: session.sessionId,
                timestamp: admin.database.ServerValue.TIMESTAMP,
                reason: 'ended_by_peer'
              });

              socket.emit('session-ended', { sessionId: session.sessionId });
              console.log(`✅ Session ${session.sessionId} ended`);
            }

          } catch (error) {
            console.error('❌ Error ending session:', error);
            socket.emit('server-error', { 
              message: 'Failed to end session',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        });

        // Handle disconnection
        socket.on('disconnect', async (reason) => {
          console.log(`❌ Client disconnected: ${socket.id}, Reason: ${reason}`);
          
          try {
            if (socket.data.userId) {
              // Update user status
              await Promise.all([
                LiveUser.findOneAndUpdate(
                  { socketIoId: socket.id },
                  { status: 'offline', lastSeen: new Date() }
                ),
                db.ref(`user_statuses/${socket.data.userId}`).update({
                  status: 'offline',
                  timestamp: admin.database.ServerValue.TIMESTAMP,
                })
              ]);

              // End any active sessions
              const session = await ActiveSession.findOneAndUpdate(
                {
                  $or: [
                    { userSocketIoId: socket.id },
                    { mentorSocketIoId: socket.id }
                  ],
                  status: 'active'
                },
                { 
                  status: 'ended', 
                  endTime: new Date() 
                }
              );

              if (session) {
                await db.ref(session.firebaseSessionPath).update({
                  status: 'ended',
                  endedBy: socket.data.userId,
                  endTime: admin.database.ServerValue.TIMESTAMP,
                  reason: 'peer_disconnected',
                });

                const peerUserId = session.userUserId === socket.data.userId 
                  ? session.mentorUserId 
                  : session.userUserId;

                await db.ref(`user_notifications/${peerUserId}/responses`).push({
                  type: 'session_ended',
                  peerUserId: socket.data.userId,
                  sessionId: session.sessionId,
                  reason: 'peer_disconnected',
                  timestamp: admin.database.ServerValue.TIMESTAMP,
                });
              }
            }
          } catch (error) {
            console.error('❌ Disconnect cleanup error:', error);
          }
        });

        // Health check
        socket.on('ping', () => {
          socket.emit('pong');
        });
      });

      console.log('✅ Socket.IO server initialized');
    }

    res.status(200).json({ message: 'Socket.IO server running' });

  } catch (error) {
    console.error('❌ Socket handler error:', error);
    res.status(500).json({ 
      error: 'Socket server initialization failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
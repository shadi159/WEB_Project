// pages/api/socket.ts - Fixed version with better error handling and logging
import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as NetServer } from 'http';
import type { Socket as NetSocket } from 'net';
import mongoose from 'mongoose';
import * as admin from 'firebase-admin';
import LiveUser from '../../models/LiveUser';
import ActiveSession from '../../models/ActiveSession';

// Mongoose connection with better error handling
const connectMongo = async () => {
  if (mongoose.connections[0].readyState) {
    console.log('MongoDB already connected');
    return;
  }
  
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
    });
    console.log('✅ MongoDB connected successfully');
    
    // Test the connection by performing a simple operation
    await LiveUser.countDocuments();
    console.log('✅ MongoDB operations working');
    
  } catch (error) {
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

// Firebase Admin initialization with better error handling
let firebaseAdminApp: admin.app.App | null = null;

const getFirebaseAdmin = () => {
  if (!firebaseAdminApp) {
    try {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      const databaseURL = process.env.FIREBASE_DATABASE_URL;
      
      if (!serviceAccountKey) {
        console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
        return null;
      }
      
      if (!databaseURL) {
        console.error('❌ FIREBASE_DATABASE_URL environment variable is not set');
        return null;
      }

      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountKey);
      } catch (parseError) {
        console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', parseError);
        return null;
      }

      if (!serviceAccount || Object.keys(serviceAccount).length === 0) {
        console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY is empty or malformed');
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
        console.log('✅ Firebase Admin SDK initialized successfully');
      }
      
    } catch (error) {
      console.error('❌ Error initializing Firebase Admin SDK:', error);
      return null;
    }
  }
  return firebaseAdminApp;
};

export default async function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  try {
    // Connect to MongoDB first
    await connectMongo();
    console.log('✅ MongoDB connection established');

    // Initialize Firebase Admin
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      console.error('❌ Firebase Admin SDK initialization failed');
      res.status(500).json({ error: 'Firebase Admin SDK not configured' });
      return;
    }

    const db = firebaseApp.database();
    console.log('✅ Firebase Admin SDK ready');

    if (!res.socket.server.io) {
      console.log('🚀 Initializing new Socket.IO server...');
      
      const io = new Server(res.socket.server, {
        path: '/api/socket',
        cors: {
          origin: (origin, callback) => {
            // Allow same-origin requests and Vercel deployments
            if (!origin || 
                origin.endsWith('.vercel.app') || 
                origin === 'http://localhost:3000' ||
                origin === 'https://localhost:3000') {
              callback(null, true);
            } else {
              console.warn(`🚫 Blocked by CORS: ${origin}`);
              callback(new Error(`Blocked by CORS: ${origin}`));
            }
          },
          methods: ['GET', 'POST'],
          credentials: true,
        },
        transports: ['polling', 'websocket'],
        pingTimeout: 60000,
        pingInterval: 25000,
        connectTimeout: 45000,
      });

      res.socket.server.io = io;

      io.on('connection', (socket) => {
        console.log(`✅ Client connected: ${socket.id}`);
        
        socket.emit('connected', {
          message: 'Successfully connected to server',
          clientId: socket.id,
          timestamp: new Date().toISOString(),
          totalClients: io.engine.clientsCount,
        });

        // Handle user registration
        socket.on('register', async ({ userId, role }) => {
          try {
            console.log(`📝 Registering user: ${userId} as ${role} (Socket: ${socket.id})`);
            
            socket.data.userId = userId;
            socket.data.role = role;

            // Update or create LiveUser record
            const liveUser = await LiveUser.findOneAndUpdate(
              { userId: userId },
              {
                socketIoId: socket.id,
                role: role,
                status: 'online',
                lastSeen: new Date(),
              },
              { upsert: true, new: true }
            );

            console.log(`✅ LiveUser record updated:`, liveUser);

            // Update Firebase user status
            await db.ref(`user_statuses/${userId}`).set({
              status: 'online',
              socketIoId: socket.id,
              role: role,
              timestamp: admin.database.ServerValue.TIMESTAMP,
            });

            console.log(`✅ Firebase user status updated for ${userId}`);

          } catch (error) {
            console.error('❌ Error registering client:', error);
            socket.emit('server-error', { 
              message: 'Failed to register user. Please try again.',
              error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
          }
        });

        // Handle mentor session requests
        socket.on('mentor-request-session', async ({ targetUserId, sessionType }) => {
          try {
            console.log(`📞 Session request: ${socket.data.userId} -> ${targetUserId} (${sessionType})`);

            if (socket.data.role !== 'mentor') {
              socket.emit('server-error', { message: 'Only mentors can initiate sessions.' });
              return;
            }

            // Find target user
            const targetUser = await LiveUser.findOne({ 
              userId: targetUserId, 
              role: 'user', 
              status: 'online' 
            });

            if (!targetUser) {
              socket.emit('server-error', { message: 'Target user not found or not online.' });
              console.warn(`❌ Target user ${targetUserId} not found or offline`);
              return;
            }

            // Check if target user is already in a session
            const existingSession = await ActiveSession.findOne({
              $or: [
                { userUserId: targetUserId, status: 'active' },
                { mentorUserId: targetUserId, status: 'active' }
              ]
            });

            if (existingSession) {
              socket.emit('server-error', { message: 'Target user is already in an active session.' });
              return;
            }

            // Send notification via Firebase
            const notificationPath = `user_notifications/${targetUserId}/requests`;
            await db.ref(notificationPath).push({
              type: 'session_request',
              fromMentorId: socket.data.userId,
              mentorSocketIoId: socket.id,
              sessionType: sessionType,
              timestamp: admin.database.ServerValue.TIMESTAMP,
              status: 'pending'
            });

            console.log(`✅ Session request sent to ${targetUserId} via Firebase`);

          } catch (error) {
            console.error('❌ Error in mentor-request-session:', error);
            socket.emit('server-error', { 
              message: 'Internal server error during session request.',
              error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
          }
        });

        // Handle user accepting sessions
        socket.on('user-accept-session', async ({ mentorSocketIoId, sessionType, requestId }) => {
          try {
            console.log(`✅ Session accepted by ${socket.data.userId} from mentor ${mentorSocketIoId}`);

            if (socket.data.role !== 'user') {
              socket.emit('server-error', { message: 'Only users can accept sessions.' });
              return;
            }

            // Find mentor and user
            const mentorLiveUser = await LiveUser.findOne({ 
              socketIoId: mentorSocketIoId, 
              status: 'online' 
            });
            const userLiveUser = await LiveUser.findOne({ 
              socketIoId: socket.id, 
              status: 'online' 
            });

            if (!mentorLiveUser || !userLiveUser) {
              socket.emit('server-error', { message: 'Mentor or user not found or offline.' });
              return;
            }

            // Generate session details
            const sessionId = `${userLiveUser.userId}_${mentorLiveUser.userId}_${Date.now()}`;
            const firebaseSessionPath = `live_sessions/${sessionId}`;

            // Create active session record
            const activeSession = await ActiveSession.create({
              sessionId: sessionId,
              mentorUserId: mentorLiveUser.userId,
              mentorSocketIoId: mentorLiveUser.socketIoId,
              userUserId: userLiveUser.userId,
              userSocketIoId: userLiveUser.socketIoId,
              sessionType: sessionType,
              firebaseSessionPath: firebaseSessionPath,
              status: 'active',
            });

            console.log(`✅ Active session created:`, activeSession);

            // Update request status in Firebase
            if (requestId) {
              await db.ref(`user_notifications/${userLiveUser.userId}/requests/${requestId}`).update({ 
                status: 'accepted' 
              });
            }

            // Initialize session in Firebase RTDB
            await db.ref(firebaseSessionPath).set({
              mentorId: mentorLiveUser.userId,
              userId: userLiveUser.userId,
              sessionType: sessionType,
              status: 'active',
              createdAt: admin.database.ServerValue.TIMESTAMP,
            });

            // Notify both parties via Firebase
            await db.ref(`user_notifications/${userLiveUser.userId}/responses`).push({
              type: 'session_accepted',
              peerUserId: mentorLiveUser.userId,
              sessionType: sessionType,
              firebaseSessionPath: firebaseSessionPath,
              timestamp: admin.database.ServerValue.TIMESTAMP,
            });

            await db.ref(`user_notifications/${mentorLiveUser.userId}/responses`).push({
              type: 'session_accepted',
              peerUserId: userLiveUser.userId,
              sessionType: sessionType,
              firebaseSessionPath: firebaseSessionPath,
              timestamp: admin.database.ServerValue.TIMESTAMP,
            });

            console.log(`✅ Session notifications sent to both parties`);

          } catch (error) {
            console.error('❌ Error in user-accept-session:', error);
            socket.emit('server-error', { 
              message: 'Internal server error during session acceptance.',
              error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
          }
        });

        // Handle session ending
        socket.on('end-session', async () => {
          try {
            console.log(`🔚 Session end requested by ${socket.data.userId}`);

            // Find and update active session
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
              console.log(`✅ Session ended: ${session.sessionId}`);

              // Update session status in Firebase
              await db.ref(session.firebaseSessionPath).update({
                status: 'ended',
                endedBy: socket.data.userId,
                endTime: admin.database.ServerValue.TIMESTAMP,
              });

              // Notify other party
              const otherPeerUserId = session.userUserId === socket.data.userId 
                ? session.mentorUserId 
                : session.userUserId;

              await db.ref(`user_notifications/${otherPeerUserId}/responses`).push({
                type: 'session_ended',
                peerUserId: socket.data.userId,
                sessionId: session.sessionId,
                timestamp: admin.database.ServerValue.TIMESTAMP,
                reason: 'ended_by_peer'
              });

              console.log(`✅ Session end notification sent to ${otherPeerUserId}`);
            }

          } catch (error) {
            console.error('❌ Error ending session:', error);
            socket.emit('server-error', { 
              message: 'Internal server error during session end.',
              error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
          }
        });

        // Handle ping-pong for connection health
        socket.on('ping', () => {
          socket.emit('pong');
        });

        // Handle disconnection
        socket.on('disconnect', async (reason) => {
          console.log(`❌ Client disconnected: ${socket.id}, Reason: ${reason}`);
          
          try {
            if (socket.data.userId) {
              // Update LiveUser status
              const liveUser = await LiveUser.findOneAndUpdate(
                { socketIoId: socket.id },
                { 
                  status: 'offline', 
                  lastSeen: new Date() 
                },
                { new: true }
              );

              if (liveUser) {
                console.log(`✅ User ${liveUser.userId} marked offline`);

                // Update Firebase user status
                await db.ref(`user_statuses/${liveUser.userId}`).update({
                  status: 'offline',
                  timestamp: admin.database.ServerValue.TIMESTAMP,
                });

                // Check for active sessions and end them
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
                  console.log(`✅ Session ${session.sessionId} ended due to disconnect`);

                  // Update session status in Firebase
                  await db.ref(session.firebaseSessionPath).update({
                    status: 'ended',
                    endedBy: liveUser.userId,
                    endTime: admin.database.ServerValue.TIMESTAMP,
                    reason: 'peer_disconnected',
                  });

                  // Notify other party
                  const otherPeerUserId = session.userUserId === liveUser.userId 
                    ? session.mentorUserId 
                    : session.userUserId;

                  await db.ref(`user_notifications/${otherPeerUserId}/responses`).push({
                    type: 'session_ended',
                    peerUserId: liveUser.userId,
                    sessionId: session.sessionId,
                    reason: 'peer_disconnected',
                    timestamp: admin.database.ServerValue.TIMESTAMP,
                  });

                  console.log(`✅ Disconnect notification sent to ${otherPeerUserId}`);
                }
              }
            }
          } catch (error) {
            console.error('❌ Error handling disconnect:', error);
          }
        });

        // Handle socket errors
        socket.on('error', (error: Error) => {
          console.error(`❌ Socket error for client ${socket.id}:`, error);
          socket.emit('server-error', {
            message: 'Socket connection error',
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        });
      });

      console.log('✅ Socket.IO server initialized successfully');
    } else {
      console.log('♻️ Socket.IO server already running');
    }

  } catch (error) {
    console.error('❌ Socket handler error:', error);
    res.status(500).json({ 
      error: 'Socket server initialization failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
    return;
  }

  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
};
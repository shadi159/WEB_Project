// pages/api/socket.ts - Modified for Vercel with MongoDB state and Firebase RTDB
import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as NetServer } from 'http';
import type { Socket as NetSocket } from 'net';
import mongoose from 'mongoose';
import * as admin from 'firebase-admin'; // Firebase Admin SDK
import LiveUser from '../../models/LiveUser';
import ActiveSession from '../../models/ActiveSession';

// Ensure Mongoose is connected
const connectMongo = async () => {
  if (mongoose.connections[0].readyState) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI!, {});
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
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

// Initialize Firebase Admin SDK globally
let firebaseAdminApp: admin.app.App | null = null;
const getFirebaseAdmin = () => {
  if (!firebaseAdminApp) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

      if (!serviceAccount || Object.keys(serviceAccount).length === 0) {
        console.error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is empty or malformed.');
        return null;
      }

      firebaseAdminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
      console.log('Firebase Admin SDK initialized.');
    } catch (error) {
      console.error('Error initializing Firebase Admin SDK:', error);
      return null;
    }
  }
  return firebaseAdminApp;
};

export default async function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  // Ensure MongoDB is connected
  await connectMongo();
  const firebaseApp = getFirebaseAdmin();

  if (!firebaseApp) {
    res.status(500).end('Internal Server Error: Firebase Admin SDK not configured');
    return;
  }

  const db = firebaseApp.database(); // Get Realtime Database reference

    if (!res.socket.server.io) {
    console.log('Initializing new Socket.IO server...');
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      cors: {
        origin: (origin, callback) => {
          // Allow undefined (for same-origin) and all Vercel subdomains
          if (!origin || origin.endsWith('.vercel.app') || origin === 'http://localhost:3000') {
            callback(null, true);
          } else {
            callback(new Error(`Blocked by CORS: ${origin}`));
          }
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log(`✅ Client connected: ${socket.id}`);
      socket.emit('connected', {
        message: 'Successfully connected via polling',
        clientId: socket.id,
        timestamp: new Date().toISOString(),
        totalClients: io.engine.clientsCount,
      });

      socket.on('register', async ({ userId, role }) => {
        socket.data.userId = userId;
        socket.data.role = role;

        try {
          await LiveUser.findOneAndUpdate(
            { userId: userId },
            {
              socketIoId: socket.id,
              role: role,
              status: 'online',
              lastSeen: new Date(),
            },
            { upsert: true, new: true }
          );
          console.log(`Client ${socket.id} registered as ${role} (User ID: ${userId})`);

          // Notify clients of user status change via Firebase RTDB
          // Clients will listen on a 'user_statuses' path.
          db.ref(`user_statuses/${userId}`).set({
            status: 'online',
            socketIoId: socket.id,
            timestamp: admin.database.ServerValue.TIMESTAMP,
          });

        } catch (error) {
          console.error('Error registering client in MongoDB:', error);
          socket.emit('server-error', { message: 'Failed to register user.' });
        }
      });

      // Mentor requests a session (via Socket.IO, then server triggers Firebase)
      socket.on('mentor-request-session', async ({ targetUserId, sessionType }) => {
        if (socket.data.role !== 'mentor') {
          socket.emit('server-error', { message: 'Only mentors can initiate sessions.' });
          return;
        }

        console.log(`Mentor ${socket.data.userId} (socket: ${socket.id}) requesting session with user ID: ${targetUserId}`);

        try {
          const targetUser = await LiveUser.findOne({ userId: targetUserId, role: 'user', status: 'online' });

          if (targetUser) {
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

            // Push a notification to the target user's Firebase path
            const notificationPath = `user_notifications/${targetUserId}/requests`;
            db.ref(notificationPath).push({
              type: 'session_request',
              fromMentorId: socket.data.userId,
              mentorSocketIoId: socket.id,
              sessionType: sessionType,
              timestamp: admin.database.ServerValue.TIMESTAMP,
              status: 'pending' // So client can accept/reject
            });
            console.log(`Session request sent from mentor ${socket.data.userId} to user ${targetUserId} via Firebase path ${notificationPath}`);
          } else {
            socket.emit('server-error', { message: 'Target user not found or not online.' });
            console.warn(`Mentor ${socket.data.userId} failed to find user ${targetUserId}`);
          }
        } catch (error) {
          console.error('Error in mentor-request-session:', error);
          socket.emit('server-error', { message: 'Internal server error during session request.' });
        }
      });

      // User accepts a session (via Socket.IO, then server updates MongoDB & triggers Firebase)
      socket.on('user-accept-session', async ({ mentorSocketIoId, sessionType, requestId }) => {
        if (socket.data.role !== 'user') {
          socket.emit('server-error', { message: 'Only users can accept sessions.' });
          return;
        }

        try {
          const mentorLiveUser = await LiveUser.findOne({ socketIoId: mentorSocketIoId, status: 'online' });
          const userLiveUser = await LiveUser.findOne({ socketIoId: socket.id, status: 'online' });

          if (!mentorLiveUser || !userLiveUser) {
            socket.emit('server-error', { message: 'Mentor or user not found or offline.' });
            return;
          }

          // Generate a unique path for this session in Firebase RTDB
          const firebaseSessionPath = `live_sessions/${userLiveUser.userId}_${mentorLiveUser.userId}_${Date.now()}`;

          // Save active session details to MongoDB
          await ActiveSession.create({
            sessionId: `${userLiveUser.userId}_${mentorLiveUser.userId}_${Date.now()}`,
            mentorUserId: mentorLiveUser.userId,
            mentorSocketIoId: mentorLiveUser.socketIoId,
            userUserId: userLiveUser.userId,
            userSocketIoId: userLiveUser.socketIoId,
            sessionType: sessionType,
            firebaseSessionPath: firebaseSessionPath,
            status: 'active',
          });

          console.log(`User ${socket.id} accepted session from mentor ${mentorSocketIoId} as type: ${sessionType}. Firebase Path: ${firebaseSessionPath}`);

          // Update the request status in Firebase (if you stored it there)
          if (requestId) {
            db.ref(`user_notifications/${userLiveUser.userId}/requests/${requestId}`).update({ status: 'accepted' });
          }

          // Notify both parties of acceptance and session path via Firebase notifications
          db.ref(`user_notifications/${userLiveUser.userId}/responses`).push({
            type: 'session_accepted',
            peerUserId: mentorLiveUser.userId,
            sessionType: sessionType,
            firebaseSessionPath: firebaseSessionPath,
            timestamp: admin.database.ServerValue.TIMESTAMP,
          });
          db.ref(`user_notifications/${mentorLiveUser.userId}/responses`).push({
            type: 'session_accepted',
            peerUserId: userLiveUser.userId,
            sessionType: sessionType,
            firebaseSessionPath: firebaseSessionPath,
            timestamp: admin.database.ServerValue.TIMESTAMP,
          });

          // Also set up initial session data in Firebase RTDB
          await db.ref(firebaseSessionPath).set({
            mentorId: mentorLiveUser.userId,
            userId: userLiveUser.userId,
            sessionType: sessionType,
            status: 'active',
            messages: [], // Initialize for chat
            signals: [], // Initialize for WebRTC signals
            createdAt: admin.database.ServerValue.TIMESTAMP,
          });

        } catch (error) {
          console.error('Error in user-accept-session:', error);
          socket.emit('server-error', { message: 'Internal server error during session acceptance.' });
        }
      });

      // End session (via Socket.IO, then server updates MongoDB & triggers Firebase)
      socket.on('end-session', async () => {
        try {
          // Find the active session involving this socket
          const session = await ActiveSession.findOneAndUpdate(
            {
              $or: [{ userSocketIoId: socket.id }, { mentorSocketIoId: socket.id }],
              status: 'active'
            },
            { status: 'ended', endTime: new Date() },
            { new: true }
          );

          if (session) {
            console.log(`Session ended by ${socket.data.userId}. Session ID: ${session.sessionId}`);

            // Update session status in Firebase RTDB
            await db.ref(session.firebaseSessionPath).update({
              status: 'ended',
              endedBy: socket.data.userId,
              endTime: admin.database.ServerValue.TIMESTAMP,
            });

            // Notify both parties of session end via Firebase notifications
            const otherPeerUserId = session.userUserId === socket.data.userId ? session.mentorUserId : session.userUserId;
            db.ref(`user_notifications/${socket.data.userId}/responses`).push({
              type: 'session_ended',
              peerUserId: otherPeerUserId,
              sessionId: session.sessionId,
              timestamp: admin.database.ServerValue.TIMESTAMP,
            });
            db.ref(`user_notifications/${otherPeerUserId}/responses`).push({
              type: 'session_ended',
              peerUserId: socket.data.userId,
              sessionId: session.sessionId,
              timestamp: admin.database.ServerValue.TIMESTAMP,
              reason: 'peer_disconnected'
            });

          } else {
            console.log(`Session ended by ${socket.id}, but no active paired session found.`);
          }
        } catch (error) {
          console.error('Error ending session:', error);
          socket.emit('server-error', { message: 'Internal server error during session end.' });
        }
      });

      // NOTE: Chat messages and WebRTC signals will primarily be handled client-side by Firebase SDK.
      // The server will only be involved if you need to log, moderate, or do complex routing.
      // For simplicity, we'll assume clients send/receive directly via Firebase Realtime Database.
      // Example of client-side chat send:
      // firebase.database().ref(`${session.firebaseSessionPath}/messages`).push({
      //   from: MY_USER_ID,
      //   message: 'Hello',
      //   timestamp: firebase.database.ServerValue.TIMESTAMP
      // });
      // Example of client-side chat receive:
      // firebase.database().ref(`${session.firebaseSessionPath}/messages`).on('child_added', (snapshot) => {
      //   setMessages((prev) => [...prev, snapshot.val()]);
      // });

      socket.on('ping', () => {
        socket.emit('pong');
      });

      socket.on('disconnect', async (reason) => {
        console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`);
        try {
          const liveUser = await LiveUser.findOneAndUpdate(
            { socketIoId: socket.id },
            { status: 'offline', lastSeen: new Date() },
            { new: true }
          );

          if (liveUser) {
            console.log(`User ${liveUser.userId} marked offline.`);
            // Update user status in Firebase RTDB
            db.ref(`user_statuses/${liveUser.userId}`).update({
              status: 'offline',
              timestamp: admin.database.ServerValue.TIMESTAMP,
            });

            // Check if this user was in an active session and end it
            const session = await ActiveSession.findOneAndUpdate(
              {
                $or: [{ userSocketIoId: socket.id }, { mentorSocketIoId: socket.id }],
                status: 'active'
              },
              { status: 'ended', endTime: new Date() },
              { new: true }
            );

            if (session) {
              console.log(`Session ${session.sessionId} ended due to disconnect of ${socket.id}.`);
              // Update session status in Firebase RTDB
              await db.ref(session.firebaseSessionPath).update({
                status: 'ended',
                endedBy: liveUser.userId,
                endTime: admin.database.ServerValue.TIMESTAMP,
                reason: 'peer_disconnected',
              });

              // Notify the other peer directly via Firebase notifications
              const otherPeerUserId = session.userUserId === liveUser.userId ? session.mentorUserId : session.userUserId;
              db.ref(`user_notifications/${otherPeerUserId}/responses`).push({
                type: 'session_ended',
                peerUserId: liveUser.userId,
                sessionId: session.sessionId,
                reason: 'peer_disconnected',
                timestamp: admin.database.ServerValue.TIMESTAMP,
              });
            }
          }
        } catch (error) {
          console.error('Error on disconnect handler:', error);
        }
      });

      socket.on('error', (error) => {
        console.error(`Socket error for client ${socket.id}:`, error);
        socket.emit('server-error', {
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      });
    });
  } else {
    console.log('Socket.io server already running.');
  }
  res.end();
}
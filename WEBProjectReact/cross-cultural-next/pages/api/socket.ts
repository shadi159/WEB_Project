// pages/api/socket.ts
import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as NetServer } from 'http';
import type { Socket as NetSocket } from 'net';

interface SocketServer extends NetServer {
  io?: Server | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

// Map to store connected clients by their role/ID for targeted signaling
const connectedClients = new Map<string, { userId: string, role: 'user' | 'mentor', socketId: string }>();
// Map to store active paired sessions, including their type (chat or video)
const pairedSessions = new Map<string, { peerSocketId: string; type: 'chat' | 'video' }>();

export default function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (!res.socket.server.io) {
    console.log('New Socket.io server...');
    const io = new Server(res.socket.server, {
      path: '/api/socket', // Crucial: This path must match the client's connection path
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001'], // Allow your Next.js client origins
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log(`✅ Client connected: ${socket.id}`);
      socket.emit('connected', {
        message: 'Successfully connected',
        clientId: socket.id,
        timestamp: new Date().toISOString(),
        totalClients: io.engine.clientsCount,
      });

      socket.on('register', ({ userId, role }) => {
        socket.data.userId = userId;
        socket.data.role = role;
        connectedClients.set(socket.id, { userId, role, socketId: socket.id });
        console.log(`Client ${socket.id} registered as ${role} (User ID: ${userId})`);
        io.emit('client-list-updated', Array.from(connectedClients.values())); // Optional: for debugging or UI
      });

      // --- Signaling for Video Calls ---
      socket.on('signal', (data) => {
        const targetSocketId = data.targetId;
        const signalData = data.signalData;

        // Ensure there's an active video session pairing for signaling
        const session = pairedSessions.get(socket.id);
        if (session && session.peerSocketId === targetSocketId && session.type === 'video') {
          console.log(`Forwarding signal from ${socket.id} to ${targetSocketId}`);
          io.to(targetSocketId).emit('signal', signalData);
        } else {
          console.warn(`Attempted to send signal to non-paired peer or invalid target for video call: ${targetSocketId}`);
          socket.emit('server-error', { message: 'Invalid signaling target or no active video call.' });
        }
      });

      // --- Mentor initiates a session request (can be chat or video) ---
      socket.on('mentor-request-session', ({ targetUserId }) => {
        if (socket.data.role !== 'mentor') {
          socket.emit('server-error', { message: 'Only mentors can initiate sessions.' });
          return;
        }

        console.log(`Mentor ${socket.data.userId} (socket: ${socket.id}) requesting session with user ID: ${targetUserId}`);

        let targetSocket = null;
        for (const [sId, clientData] of connectedClients.entries()) {
            if (clientData.userId === targetUserId && clientData.role === 'user') {
                targetSocket = io.sockets.sockets.get(sId);
                break;
            }
        }

        if (targetSocket) {
            // Notify the user about the incoming session request
            targetSocket.emit('incoming-session-request', { fromMentorId: socket.data.userId, mentorSocketId: socket.id });
            console.log(`Session request sent from mentor ${socket.id} to user ${targetSocket.id}`);
        } else {
            socket.emit('server-error', { message: 'Target user not found or not online.' });
            console.warn(`Mentor ${socket.id} failed to find user ${targetUserId}`);
        }
      });

      // --- User accepts a session request (specifying type) ---
      socket.on('user-accept-session', ({ mentorSocketId, sessionType }) => {
        if (socket.data.role !== 'user') {
            socket.emit('server-error', { message: 'Only users can accept sessions.' });
            return;
        }

        const mentorSocket = io.sockets.sockets.get(mentorSocketId);
        if (mentorSocket) {
            // Establish pairing for the session
            pairedSessions.set(socket.id, { peerSocketId: mentorSocketId, type: sessionType });
            pairedSessions.set(mentorSocketId, { peerSocketId: socket.id, type: sessionType });

            console.log(`User ${socket.id} accepted session from mentor ${mentorSocketId} as type: ${sessionType}`);

            // Notify both parties about the accepted session and its type
            socket.emit('session-accepted', { mentorSocketId: mentorSocketId, sessionType: sessionType });
            mentorSocket.emit('user-accepted-session', { userSocketId: socket.id, sessionType: sessionType });

            // Trigger specific actions based on session type
            if (sessionType === 'video') {
                socket.emit('start-peer-as-receiver'); // User starts as receiver
                mentorSocket.emit('start-peer-as-initiator'); // Mentor starts as initiator
            } else if (sessionType === 'chat') {
                socket.emit('start-chat-session');
                mentorSocket.emit('start-chat-session');
            }

        } else {
            socket.emit('server-error', { message: 'Invalid mentor for session acceptance or mentor offline.' });
            console.warn(`User ${socket.id} tried to accept invalid session from mentor ${mentorSocketId}`);
        }
      });

      // --- Chat Messaging ---
      socket.on('sendChatMessage', ({ targetSocketId, message, fromUserId }) => {
        const session = pairedSessions.get(socket.id);
        if (session && session.peerSocketId === targetSocketId && session.type === 'chat') {
          console.log(`Forwarding chat message from ${fromUserId} (${socket.id}) to ${targetSocketId}: ${message}`);
          io.to(targetSocketId).emit('receiveChatMessage', { from: fromUserId, message, timestamp: new Date().toLocaleTimeString() });
        } else {
          console.warn(`Attempted to send chat message to non-paired peer or non-chat session: ${targetSocketId}`);
          socket.emit('server-error', { message: 'You are not in an active chat session with this user.' });
        }
      });

      // --- Session Ended by either party (generalizing from call-ended) ---
      socket.on('end-session', () => {
        const session = pairedSessions.get(socket.id);
        if (session) {
          io.to(session.peerSocketId).emit('session-ended-by-peer');
          pairedSessions.delete(socket.id);
          pairedSessions.delete(session.peerSocketId);
          console.log(`Session ended by ${socket.id}. Notified ${session.peerSocketId}`);
        } else {
          console.log(`Session ended by ${socket.id}, but no active paired session found.`);
        }
        // Clean up peer connections on client side (done by client upon 'session-ended-by-peer' or local 'end-session' call)
      });

      socket.on('ping', () => {
        socket.emit('pong');
      });

      socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`);
        connectedClients.delete(socket.id);

        // If this client was in a session, end it for the other peer
        const session = pairedSessions.get(socket.id);
        if (session) {
          io.to(session.peerSocketId).emit('peer-disconnected', {
            clientId: socket.id,
            reason,
            timestamp: new Date().toISOString()
          });
          pairedSessions.delete(socket.id);
          pairedSessions.delete(session.peerSocketId);
          console.log(`Session ended due to disconnect of ${socket.id}. Notified ${session.peerSocketId}`);
        }
        io.emit('client-list-updated', Array.from(connectedClients.values())); // Update UI
      });

      socket.on('error', (error) => {
        console.error(`Socket error for client ${socket.id}:`, error);
        // This error typically means something went wrong internally with the socket.
        // The client-side will also handle 'connect_error' for connection issues.
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
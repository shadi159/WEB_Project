// pages/api/socket.ts - Modified for Vercel compatibility
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

// Use in-memory storage (note: this won't persist across function invocations on Vercel)
const connectedClients = new Map<string, { userId: string, role: 'user' | 'mentor', socketId: string }>();
const pairedSessions = new Map<string, { peerSocketId: string; type: 'chat' | 'video' }>();

export default function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (!res.socket.server.io) {
    console.log('New Socket.io server...');
    const io = new Server(res.socket.server, {
      path: '/api/socket',
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://web-project-1ai7g4748-shadis-projects-924eb319.vercel.app'] // Replace with your actual domain
          : ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      // Force polling transport for Vercel compatibility
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

      socket.on('register', ({ userId, role }) => {
        socket.data.userId = userId;
        socket.data.role = role;
        connectedClients.set(socket.id, { userId, role, socketId: socket.id });
        console.log(`Client ${socket.id} registered as ${role} (User ID: ${userId})`);
        io.emit('client-list-updated', Array.from(connectedClients.values()));
      });

      // Rest of your socket handlers remain the same...
      socket.on('signal', (data) => {
        const targetSocketId = data.targetId;
        const signalData = data.signalData;

        const session = pairedSessions.get(socket.id);
        if (session && session.peerSocketId === targetSocketId && session.type === 'video') {
          console.log(`Forwarding signal from ${socket.id} to ${targetSocketId}`);
          io.to(targetSocketId).emit('signal', signalData);
        } else {
          console.warn(`Attempted to send signal to non-paired peer or invalid target for video call: ${targetSocketId}`);
          socket.emit('server-error', { message: 'Invalid signaling target or no active video call.' });
        }
      });

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
            targetSocket.emit('incoming-session-request', { fromMentorId: socket.data.userId, mentorSocketId: socket.id });
            console.log(`Session request sent from mentor ${socket.id} to user ${targetSocket.id}`);
        } else {
            socket.emit('server-error', { message: 'Target user not found or not online.' });
            console.warn(`Mentor ${socket.id} failed to find user ${targetUserId}`);
        }
      });

      socket.on('user-accept-session', ({ mentorSocketId, sessionType }) => {
        if (socket.data.role !== 'user') {
            socket.emit('server-error', { message: 'Only users can accept sessions.' });
            return;
        }

        const mentorSocket = io.sockets.sockets.get(mentorSocketId);
        if (mentorSocket) {
            pairedSessions.set(socket.id, { peerSocketId: mentorSocketId, type: sessionType });
            pairedSessions.set(mentorSocketId, { peerSocketId: socket.id, type: sessionType });

            console.log(`User ${socket.id} accepted session from mentor ${mentorSocketId} as type: ${sessionType}`);

            socket.emit('session-accepted', { mentorSocketId: mentorSocketId, sessionType: sessionType });
            mentorSocket.emit('user-accepted-session', { userSocketId: socket.id, sessionType: sessionType });

            if (sessionType === 'video') {
                socket.emit('start-peer-as-receiver');
                mentorSocket.emit('start-peer-as-initiator');
            } else if (sessionType === 'chat') {
                socket.emit('start-chat-session');
                mentorSocket.emit('start-chat-session');
            }

        } else {
            socket.emit('server-error', { message: 'Invalid mentor for session acceptance or mentor offline.' });
            console.warn(`User ${socket.id} tried to accept invalid session from mentor ${mentorSocketId}`);
        }
      });

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
      });

      socket.on('ping', () => {
        socket.emit('pong');
      });

      socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`);
        connectedClients.delete(socket.id);

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
        io.emit('client-list-updated', Array.from(connectedClients.values()));
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
// pages/api/socket.ts - Modified for Vercel compatibility with Redis Adapter
import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as NetServer } from 'http';
import type { Socket as NetSocket } from 'net';
import { createClient } from 'redis'; // Import createClient from 'redis'
import { createAdapter } from '@socket.io/redis-adapter'; // Import createAdapter

interface SocketServer extends NetServer {
  io?: Server | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

// NOTE: connectedClients and pairedSessions will now primarily be managed by the Redis Adapter.
// You might still use local maps for immediate lookup within a single function invocation,
// but for state that needs to be shared across instances, Redis is crucial.
// For simplicity and direct state sharing, we will rely heavily on Redis's pub/sub and state management.

// Initialize Redis clients globally to avoid re-creating on every invocation
// For Vercel, ensure these clients are connected only once per function instance lifecycle.
let pubClient: ReturnType<typeof createClient> | null = null;
let subClient: ReturnType<typeof createClient> | null = null;

async function initializeRedisClients() {
  if (!process.env.REDIS_URL) {
    console.error('REDIS_URL environment variable is not set!');
    return;
  }

  if (!pubClient || !pubClient.isReady) { // Check if client exists and is ready
    pubClient = createClient({ url: process.env.REDIS_URL });
    pubClient.on('error', (err) => console.error('Redis Publisher Error:', err));
    await pubClient.connect();
    console.log('Redis Publisher connected.');
  }

  if (!subClient || !subClient.isReady) { // Check if client exists and is ready
    subClient = pubClient.duplicate(); // Duplicate for subscriber
    subClient.on('error', (err) => console.error('Redis Subscriber Error:', err));
    await subClient.connect();
    console.log('Redis Subscriber connected.');
  }
}

export default async function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (!res.socket.server.io) {
    console.log('New Socket.io server...');

    // Initialize Redis clients
    await initializeRedisClients();

    if (!pubClient || !subClient) {
      console.error('Failed to initialize Redis clients. Cannot start Socket.IO server.');
      res.status(500).end('Internal Server Error: Redis not connected');
      return;
    }

    const io = new Server(res.socket.server, {
      path: '/api/socket',
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? ['https://web-project-1ai7g4748-shadis-projects-924eb319.vercel.app'] 
          : ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['polling'], // Continue to force polling for Vercel
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Use the Redis adapter
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Socket.io server initialized with Redis adapter.');

    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log(`✅ Client connected: ${socket.id}`);
      socket.emit('connected', {
        message: 'Successfully connected via polling',
        clientId: socket.id,
        timestamp: new Date().toISOString(),
        totalClients: io.engine.clientsCount, // This count is now global across instances
      });

      socket.on('register', async ({ userId, role }) => {
        socket.data.userId = userId;
        socket.data.role = role;
        // Store user details in Redis hash for global access
        await pubClient?.hSet('socket_users', socket.id, JSON.stringify({ userId, role, socketId: socket.id }));
        console.log(`Client ${socket.id} registered as ${role} (User ID: ${userId})`);

        // Emit to all connected clients (across instances) that client list updated
        // You might need a more sophisticated way to get all connected client info from Redis
        // For now, this will emit, but client-side will need to fetch actual list if needed.
        io.emit('client-list-updated', { message: 'Client registered', socketId: socket.id, userId, role });
      });

      socket.on('signal', async (data) => {
        const targetSocketId = data.targetId;
        const signalData = data.signalData;

        // Retrieve session data from Redis
        const sessionJson = await pubClient?.hGet('paired_sessions', socket.id);
        const session = sessionJson ? JSON.parse(sessionJson) : null;

        if (session && session.peerSocketId === targetSocketId && session.type === 'video') {
          console.log(`Forwarding signal from ${socket.id} to ${targetSocketId}`);
          io.to(targetSocketId).emit('signal', signalData);
        } else {
          console.warn(`Attempted to send signal to non-paired peer or invalid target for video call: ${targetSocketId}`);
          socket.emit('server-error', { message: 'Invalid signaling target or no active video call.' });
        }
      });

      socket.on('mentor-request-session', async ({ targetUserId }) => {
        if (socket.data.role !== 'mentor') {
          socket.emit('server-error', { message: 'Only mentors can initiate sessions.' });
          return;
        }

        console.log(`Mentor ${socket.data.userId} (socket: ${socket.id}) requesting session with user ID: ${targetUserId}`);

        // Find target user's socket ID(s) from Redis
        let targetSocketId: string | null = null;
        const allClientsData = await pubClient?.hGetAll('socket_users') || {};
        for (const sId in allClientsData) {
            const clientData = JSON.parse(allClientsData[sId]);
            if (clientData.userId === targetUserId && clientData.role === 'user') {
                targetSocketId = sId;
                break;
            }
        }

        if (targetSocketId) {
            // Check if the target is already in a session
            const targetSessionJson = await pubClient?.hGet('paired_sessions', targetSocketId);
            if (targetSessionJson) {
                socket.emit('server-error', { message: 'Target user is already in a session.' });
                console.warn(`Mentor ${socket.id} tried to request session with busy user ${targetUserId}`);
                return;
            }

            io.to(targetSocketId).emit('incoming-session-request', { fromMentorId: socket.data.userId, mentorSocketId: socket.id });
            console.log(`Session request sent from mentor ${socket.id} to user ${targetSocketId}`);
        } else {
            socket.emit('server-error', { message: 'Target user not found or not online.' });
            console.warn(`Mentor ${socket.id} failed to find user ${targetUserId}`);
        }
      });

      socket.on('user-accept-session', async ({ mentorSocketId, sessionType }) => {
        if (socket.data.role !== 'user') {
            socket.emit('server-error', { message: 'Only users can accept sessions.' });
            return;
        }

        // Check if mentorSocketId is a valid connected client
        const mentorClientData = await pubClient?.hGet('socket_users', mentorSocketId);
        if (!mentorClientData) {
            socket.emit('server-error', { message: 'Mentor is not online or invalid.' });
            return;
        }

        // Store session in Redis
        await pubClient?.hSet('paired_sessions', socket.id, JSON.stringify({ peerSocketId: mentorSocketId, type: sessionType }));
        await pubClient?.hSet('paired_sessions', mentorSocketId, JSON.stringify({ peerSocketId: socket.id, type: sessionType }));

        console.log(`User ${socket.id} accepted session from mentor ${mentorSocketId} as type: ${sessionType}`);

        socket.emit('session-accepted', { mentorSocketId: mentorSocketId, sessionType: sessionType });
        io.to(mentorSocketId).emit('user-accepted-session', { userSocketId: socket.id, sessionType: sessionType });

        if (sessionType === 'video') {
            socket.emit('start-peer-as-receiver');
            io.to(mentorSocketId).emit('start-peer-as-initiator');
        } else if (sessionType === 'chat') {
            socket.emit('start-chat-session');
            io.to(mentorSocketId).emit('start-chat-session');
        }
      });

      socket.on('sendChatMessage', async ({ targetSocketId, message, fromUserId }) => {
        const sessionJson = await pubClient?.hGet('paired_sessions', socket.id);
        const session = sessionJson ? JSON.parse(sessionJson) : null;

        if (session && session.peerSocketId === targetSocketId && session.type === 'chat') {
          console.log(`Forwarding chat message from ${fromUserId} (${socket.id}) to ${targetSocketId}: ${message}`);
          io.to(targetSocketId).emit('receiveChatMessage', { from: fromUserId, message, timestamp: new Date().toLocaleTimeString() });
        } else {
          console.warn(`Attempted to send chat message to non-paired peer or non-chat session: ${targetSocketId}`);
          socket.emit('server-error', { message: 'You are not in an active chat session with this user.' });
        }
      });

      socket.on('end-session', async () => {
        const sessionJson = await pubClient?.hGet('paired_sessions', socket.id);
        const session = sessionJson ? JSON.parse(sessionJson) : null;

        if (session) {
          io.to(session.peerSocketId).emit('session-ended-by-peer');
          await pubClient?.hDel('paired_sessions', socket.id);
          await pubClient?.hDel('paired_sessions', session.peerSocketId);
          console.log(`Session ended by ${socket.id}. Notified ${session.peerSocketId}`);
        } else {
          console.log(`Session ended by ${socket.id}, but no active paired session found.`);
        }
      });

      socket.on('ping', () => {
        socket.emit('pong');
      });

      socket.on('disconnect', async (reason) => {
        console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`);
        // Remove client from Redis
        await pubClient?.hDel('socket_users', socket.id);

        const sessionJson = await pubClient?.hGet('paired_sessions', socket.id);
        const session = sessionJson ? JSON.parse(sessionJson) : null;

        if (session) {
          io.to(session.peerSocketId).emit('peer-disconnected', {
            clientId: socket.id,
            reason,
            timestamp: new Date().toISOString()
          });
          await pubClient?.hDel('paired_sessions', socket.id);
          await pubClient?.hDel('paired_sessions', session.peerSocketId);
          console.log(`Session ended due to disconnect of ${socket.id}. Notified ${session.peerSocketId}`);
        }
        // Emit update (clients will need to refetch full list from Redis if necessary)
        io.emit('client-list-updated', { message: 'Client disconnected', socketId: socket.id, reason });
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
// pages/Mentor.tsx
'use client';

import Navbar from '@/app/components/Navbar';
import { useEffect, useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import _io from 'socket.io-client';
import { getCurrentUser } from '@/utils/auth'; // <--- Import your actual client-side auth utility

// Define a type for the user object returned by getCurrentUser
// This should match the structure of the user object you store in localStorage
interface AuthenticatedUser {
  _id: string; // Mongoose ID
  firstName: string;
  lastName: string;
  email: string;
  role: 'user' | 'mentor' | 'admin'; // This is crucial for determining the role
  // Add other properties you might need from the user object
}

type SocketType = ReturnType<typeof _io>;

interface ConnectionState {
  socket: 'disconnected' | 'connecting' | 'connected';
  peer: 'disconnected' | 'connecting' | 'connected';
}

interface ChatMessage {
  from: string;
  message: string;
  timestamp: string;
}

export default function Mentor() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remote, setRemote] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    socket: 'disconnected',
    peer: 'disconnected'
  });
  const [error, setError] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<'user' | 'mentor' | 'admin' | null>(null); // Updated type to include 'admin'
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // New states for session type and chat
  const [activeSessionType, setActiveSessionType] = useState<'none' | 'chat' | 'video'>('none');
  const [incomingSessionRequest, setIncomingSessionRequest] = useState<{ fromMentorId: string, mentorSocketId: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentChatMessage, setCurrentChatMessage] = useState('');
  const [remotePeerSocketId, setRemotePeerSocketId] = useState<string | null>(null);


  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const socketRef = useRef<SocketType | null>(null);
  const mountedRef = useRef(true);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null); // For auto-scrolling chat

  // --- ACTUAL AUTHENTICATION INTEGRATION ---
  useEffect(() => {
    // Attempt to get the current user from localStorage using your utility function
    const user = getCurrentUser() as AuthenticatedUser | null; // Cast to your AuthenticatedUser type

    if (user) {
      setCurrentUserId(user._id); // Use the Mongoose _id as the userId
      setCurrentUserRole(user.role); // Set the role from the authenticated user object
      console.log(`Authenticated user loaded: Role - ${user.role}, ID - ${user._id}, Email - ${user.email}`);
      setError(null); // Clear any previous auth errors
    } else {
      setCurrentUserId(null);
      setCurrentUserRole(null);
      console.log('No authenticated user found in localStorage.');
      // You might want to show a login prompt or redirect if auth is required
      setError('Please log in to access this page.');
    }
  }, []); // Empty dependency array means this runs once on component mount
  // --- END ACTUAL AUTHENTICATION INTEGRATION ---


  const cleanupSession = useCallback(() => {
    console.log('Cleaning up session...');

    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch (err) {
        console.warn('Error destroying peer:', err);
      }
      peerRef.current = null;
    }

    if (stream) {
      stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (err) {
          console.warn('Error stopping track:', err);
        }
      });
    }

    setConnectionState(prev => ({ ...prev, peer: 'disconnected' }));
    setIsSessionActive(false);
    setActiveSessionType('none');
    setRemote(null);
    setIncomingSessionRequest(null);
    setChatMessages([]);
    setCurrentChatMessage('');
    setRemotePeerSocketId(null);
  }, [stream]);


  const cleanupSocket = useCallback(() => {
    if (socketRef.current) {
      try {
        socketRef.current.disconnect();
      } catch (err) {
        console.warn('Error disconnecting socket:', err);
      }
      socketRef.current = null;
    }
    setConnectionState(prev => ({ ...prev, socket: 'disconnected' }));
  }, []);


  useEffect(() => {
    let mediaStream: MediaStream | null = null;

    const getUserMedia = async () => {
      try {
        console.log('Requesting user media...');
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true
          }
        });

        if (mountedRef.current) {
          setStream(mediaStream);
          console.log('Got user media successfully');
          setError(null);
        }
      } catch (err: any) {
        console.error('Error getting user media:', err);
        if (mountedRef.current) {
          setError(`Failed to access camera/microphone: ${err.message}. Please allow permissions and refresh.`);
        }
      }
    };

    getUserMedia();

    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const endSession = useCallback(() => {
    console.log('Ending session...');

    if (socketRef.current?.connected) {
      socketRef.current.emit('end-session');
    }

    cleanupSession();
    setError(null);
  }, [cleanupSession]);


  const startPeer = useCallback((initiator: boolean) => {
    if (!stream || !socketRef.current?.connected) {
      console.error('Cannot start peer - missing stream or socket');
      setError('Cannot start video: camera/microphone not available or not connected to signaling server.');
      return;
    }

    if (!remotePeerSocketId) {
        console.error('Cannot start peer - no remote peer socket ID');
        setError('Cannot start video: No active session peer detected.');
        return;
    }

    console.log(`Starting peer as ${initiator ? 'initiator' : 'receiver'} with remote peer: ${remotePeerSocketId}`);

    if (peerRef.current) {
      peerRef.current.destroy();
    }

    try {
      const peer = new SimplePeer({
        initiator,
        trickle: false,
        stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ]
        }
      });

      peerRef.current = peer;
      setConnectionState(prev => ({ ...prev, peer: 'connecting' }));
      setError(null);

      peer.on('signal', (data) => {
        console.log('Sending peer signal');
        if (socketRef.current?.connected && remotePeerSocketId) {
          socketRef.current.emit('signal', { signalData: data, targetId: remotePeerSocketId });
        } else {
           console.warn('No target socket ID found for signaling or socket disconnected.');
           setError('Failed to send video signal: No active peer found or server connection lost.');
        }
      });

      peer.on('stream', (remoteStream) => {
        console.log('Received remote stream');
        if (mountedRef.current) {
          setRemote(remoteStream);
          setConnectionState(prev => ({ ...prev, peer: 'connected' }));
          setIsSessionActive(true);
          setActiveSessionType('video');
        }
      });

      peer.on('connect', () => {
        console.log('Peer connection established');
        if (mountedRef.current) {
          setConnectionState(prev => ({ ...prev, peer: 'connected' }));
          setIsSessionActive(true);
          setActiveSessionType('video');
        }
      });

      peer.on('error', (err: any) => {
        console.error('Peer error:', err);
        if (mountedRef.current) {
          setError(`Video call error: ${err.message}. Connection might be unstable.`);
          setConnectionState(prev => ({ ...prev, peer: 'disconnected' }));
          endSession();
        }
      });

      peer.on('close', () => {
        console.log('Peer connection closed');
        if (mountedRef.current) {
          setConnectionState(prev => ({ ...prev, peer: 'disconnected' }));
          endSession();
        }
      });

    } catch (err: any) {
      console.error('Error creating peer:', err);
      setError(`Failed to establish video connection: ${err.message}`);
      endSession();
    }
  }, [stream, remotePeerSocketId, endSession]);


  const connectSocket = useCallback(() => {
  if (!mountedRef.current) return;

  if (socketRef.current?.connected) {
    console.log('Socket already connected');
    return;
  }

  // Only attempt to connect if currentUserId and currentUserRole are determined
  if (!currentUserId || !currentUserRole) {
    console.log('User ID or Role not set yet, cannot connect socket.');
    setError('User role/ID not determined. Please ensure you are logged in.');
    return;
  }

  try {
    setConnectionState(prev => ({ ...prev, socket: 'connecting' }));
    setError(null);

    console.log('Connecting to Socket.IO...');
    const socket = _io({
      path: '/api/socket',
      // Force polling transport for Vercel compatibility
      transports: ['polling'],
      upgrade: false, // Disable transport upgrades
      timeout: 20000,
      forceNew: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO connected via polling:', socket.id);
      if (mountedRef.current) {
        setConnectionState(prev => ({ ...prev, socket: 'connected' }));
        setError(null);
        // Register the user with the server, sending their actual role and ID
        socket.emit('register', { userId: currentUserId, role: currentUserRole });
      }
    });

    socket.on('connected', (data: any) => {
      console.log('Server confirmed connection:', data);
    });

    // Rest of your socket event handlers remain the same...
    socket.on('incoming-session-request', ({ fromMentorId, mentorSocketId }: { fromMentorId: string, mentorSocketId: string }) => {
      if (currentUserRole === 'user' && mountedRef.current) {
        console.log(`Incoming session request from mentor ${fromMentorId}`);
        setIncomingSessionRequest({ fromMentorId, mentorSocketId });
      }
    });

    socket.on('session-accepted', (data: { mentorSocketId: string, sessionType: 'chat' | 'video' }) => {
      if (mountedRef.current) {
        console.log(`Session accepted, type: ${data.sessionType}`);
        setIsSessionActive(true);
        setActiveSessionType(data.sessionType);
        setIncomingSessionRequest(null);
        setRemotePeerSocketId(data.mentorSocketId);
      }
    });

    socket.on('user-accepted-session', ({ userSocketId, sessionType }: { userSocketId: string, sessionType: 'chat' | 'video' }) => {
      if (currentUserRole === 'mentor' && mountedRef.current) {
        console.log(`User (socket: ${userSocketId}) accepted the session as type: ${sessionType}.`);
        setIsSessionActive(true);
        setActiveSessionType(sessionType);
        setRemotePeerSocketId(userSocketId);
      }
    });

    socket.on('start-peer-as-initiator', () => {
      if (currentUserRole === 'mentor' && stream && mountedRef.current) {
        console.log('Server instructing mentor to start peer as initiator');
        startPeer(true);
      }
    });

    socket.on('start-peer-as-receiver', () => {
      if (currentUserRole === 'user' && stream && mountedRef.current) {
        console.log('Server instructing user to start peer as receiver');
        startPeer(false);
      }
    });

    socket.on('signal', (data: any) => {
      if (!mountedRef.current || !peerRef.current) return;
      console.log('Received peer signal');
      try {
        peerRef.current.signal(data);
      } catch (err: any) {
        console.error('Error handling signal:', err);
        if (mountedRef.current) setError(`Signaling error: ${err.message}`);
      }
    });

    socket.on('start-chat-session', () => {
      console.log('Server instructing to start chat session');
      if (mountedRef.current) {
        setIsSessionActive(true);
        setActiveSessionType('chat');
      }
    });

    socket.on('receiveChatMessage', (messageData: ChatMessage) => {
      console.log('Received chat message:', messageData);
      if (mountedRef.current) {
        setChatMessages(prev => [...prev, messageData]);
      }
    });

    socket.on('session-ended-by-peer', () => {
      console.log('Session ended by peer');
      if (mountedRef.current) {
        endSession();
      }
    });

    socket.on('peer-disconnected', (data: { clientId: string, reason: string }) => {
      console.log('Peer disconnected:', data.clientId, 'Reason:', data.reason);
      if (mountedRef.current) {
        setError(`Peer disconnected: ${data.clientId} (${data.reason}).`);
        endSession();
      }
    });

    socket.on('pong', () => {
      // Ping/pong for connection health
    });

    socket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
      if (mountedRef.current) {
        setConnectionState(prev => ({ ...prev, socket: 'disconnected' }));
        if (reason === 'io server disconnect') {
          setError('Server disconnected the connection. Please try reconnecting.');
        } else if (reason !== 'io client disconnect') {
          setError(`Socket unexpectedly disconnected: ${reason}. Attempting to reconnect...`);
        }
        endSession();
      }
    });

    socket.on('server-error', (data: { message: string }) => {
      console.error('Server error received:', data);
      if (mountedRef.current) {
        setError(`Server error: ${data.message}`);
      }
    });

    socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error);
      if (mountedRef.current) {
        setError(`Socket connection failed: ${error.message}. Please ensure the server is running.`);
        setConnectionState(prev => ({ ...prev, socket: 'disconnected' }));
      }
    });

  } catch (err: any) {
    console.error('Error creating socket:', err);
    if (mountedRef.current) {
      setError(`Failed to create socket connection: ${err.message}`);
      setConnectionState(prev => ({ ...prev, socket: 'disconnected' }));
    }
  }
}, [stream, currentUserId, currentUserRole, cleanupSession, startPeer, endSession]);


  useEffect(() => {
    // Connect socket only if user ID and role are available and socket is disconnected
    if (stream && currentUserId && currentUserRole && connectionState.socket === 'disconnected') {
      const timeout = setTimeout(() => {
        if (mountedRef.current) {
          connectSocket();
        }
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [stream, currentUserId, currentUserRole, connectionState.socket, connectSocket]);


  const startSessionRequest = useCallback(() => {
    if (currentUserRole !== 'mentor') {
      setError('Only mentors can initiate a session.');
      return;
    }
    if (connectionState.socket !== 'connected') {
      setError('Not connected to signaling server. Cannot initiate session.');
      return;
    }
    if (!targetUserId) {
      setError('Please enter a target user ID to request a session.');
      return;
    }
    if (isSessionActive || incomingSessionRequest) {
      setError('There is already an active session or pending request.');
      return;
    }

    console.log(`Mentor ${currentUserId} attempting to request session with user ID: ${targetUserId}`);
    setError(null);

    if (socketRef.current?.connected) {
      socketRef.current.emit('mentor-request-session', { targetUserId });
      setConnectionState(prev => ({ ...prev, peer: 'connecting' }));
    } else {
      setError('Socket not connected to send session request.');
    }
  }, [connectionState.socket, currentUserRole, targetUserId, currentUserId, isSessionActive, incomingSessionRequest]);


  const acceptSession = useCallback((type: 'chat' | 'video') => {
    if (!incomingSessionRequest || currentUserRole !== 'user') {
      setError('No incoming session request to accept, or you are not a user.');
      return;
    }
    if (isSessionActive) {
        setError('Cannot accept: another session is already active.');
        return;
    }
    if (type === 'video' && !stream) {
        setError('Cannot accept video call: camera/microphone not available.');
        return;
    }

    console.log(`User accepting session as ${type}`);
    socketRef.current?.emit('user-accept-session', {
      mentorSocketId: incomingSessionRequest.mentorSocketId,
      sessionType: type,
    });
    setIncomingSessionRequest(null);
    setError(null);
  }, [incomingSessionRequest, currentUserRole, isSessionActive, stream]);


  const sendChatMessage = useCallback(() => {
    if (!currentChatMessage.trim()) return;
    if (!socketRef.current?.connected) {
      setError('Not connected to chat server.');
      return;
    }
    if (activeSessionType !== 'chat') {
        setError('Not in an active chat session.');
        return;
    }
    if (!remotePeerSocketId) {
        setError('No active chat partner found.');
        return;
    }

    const messagePayload = {
      targetSocketId: remotePeerSocketId,
      message: currentChatMessage,
      fromUserId: currentUserId,
    };
    console.log('Sending chat message:', messagePayload);

    socketRef.current.emit('sendChatMessage', messagePayload);
    setChatMessages(prev => [...prev, { from: currentUserId || 'You', message: currentChatMessage, timestamp: new Date().toLocaleTimeString() }]);
    setCurrentChatMessage('');
  }, [currentChatMessage, socketRef, activeSessionType, remotePeerSocketId, currentUserId]);


  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);


  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupSession();
      cleanupSocket();
    };
  }, [cleanupSession, cleanupSocket]);


  return (
    <div className="w-full bg-background min-h-screen p-4">
      <Navbar />
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Session Center ({currentUserRole})</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <h3 className="text-lg font-semibold mb-3">Connection Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionState.socket === 'connected' ? 'bg-green-500' :
                connectionState.socket === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-sm">
                Server: <span className="font-medium capitalize">{connectionState.socket}</span>
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionState.peer === 'connected' ? 'bg-green-500' :
                connectionState.peer === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-sm">
                Peer: <span className="font-medium capitalize">{connectionState.peer}</span>
              </span>
            </div>
          </div>
          <p className="text-sm mt-2">Active Session: <span className="font-medium capitalize">{activeSessionType}</span></p>
        </div>

        {/* Incoming Session Request UI (for User) */}
        {incomingSessionRequest && currentUserRole === 'user' && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6 text-center">
            <p className="font-semibold text-lg mb-3">Incoming session request from Mentor: {incomingSessionRequest.fromMentorId}</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => acceptSession('chat')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Accept Chat
              </button>
              <button
                onClick={() => acceptSession('video')}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                Accept Video Call
              </button>
            </div>
          </div>
        )}

        {/* Video Call UI */}
        {activeSessionType === 'video' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h3 className="text-lg font-semibold">Your Video (Role: {currentUserRole}, ID: {currentUserId})</h3>
              </div>
              <div className="relative aspect-video bg-gray-900">
                <video
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                  ref={(el) => {
                    if (el && stream) {
                      el.srcObject = stream;
                    }
                  }}
                />
                {!stream && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p>Loading camera...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <h3 className="text-lg font-semibold">Remote Video</h3>
              </div>
              <div className="relative aspect-video bg-gray-900">
                <video
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay
                  ref={(el) => {
                    if (el && remote) {
                      el.srcObject = remote;
                    }
                  }}
                />
                {!remote && (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      {isSessionActive ? (
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                          <p>Connecting to remote peer...</p>
                        </>
                      ) : (
                        <p>Waiting for video call to start</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat UI */}
        {activeSessionType === 'chat' && (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden p-4 mb-6">
            <h3 className="text-lg font-semibold mb-3">Chat Session</h3>
            <div className="h-80 overflow-y-auto border rounded-lg p-3 mb-4 bg-gray-50 flex flex-col space-y-2">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex ${msg.from === currentUserId ? 'justify-end' : 'justify-start'}`}>
                  <div className={`rounded-lg px-3 py-1 text-sm ${
                    msg.from === currentUserId
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-300 text-gray-800'
                  }`}>
                    <span className="font-semibold mr-1">{msg.from === currentUserId ? 'You' : msg.from}:</span>
                    {msg.message}
                    <span className="ml-2 text-xs opacity-75">{msg.timestamp}</span>
                  </div>
                </div>
              ))}
              <div ref={chatMessagesEndRef} />
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Type your message..."
                className="flex-grow px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={currentChatMessage}
                onChange={(e) => setCurrentChatMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    sendChatMessage();
                  }
                }}
              />
              <button
                onClick={sendChatMessage}
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                disabled={!currentChatMessage.trim()}
              >
                Send
              </button>
            </div>
          </div>
        )}


        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Only show "Request Session" if current user is a mentor, not active, and no pending request */}
            {currentUserRole === 'mentor' && !isSessionActive && !incomingSessionRequest && (
                <div className="flex flex-col space-y-2">
                    <input
                        type="text"
                        placeholder="Target User ID (e.g., user456)"
                        value={targetUserId}
                        onChange={(e) => setTargetUserId(e.target.value)}
                        className="px-4 py-2 border rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={startSessionRequest}
                        disabled={connectionState.socket !== 'connected' || !targetUserId || connectionState.peer === 'connecting'}
                        className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                        <span>Request Session</span>
                    </button>
                </div>
            )}

            {/* Only show "Waiting for mentor" if current user is a user, not active, and no pending request */}
            {currentUserRole === 'user' && !isSessionActive && !incomingSessionRequest && (
                 <p className="text-lg text-gray-600">Waiting for a mentor to request a session...</p>
            )}

            {isSessionActive && (
                <button
                    onClick={endSession}
                    className="px-8 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 6.707 6.293a1 1 0 00-1.414 1.414L8.586 11l-3.293 3.293a1 1 0 001.414 1.414L10 12.414l3.293 3.293a1 1 0 001.414-1.414L11.414 11l3.293-3.293z" clipRule="evenodd" />
                    </svg>
                    <span>End Session</span>
                </button>
            )}

          <button
            onClick={connectSocket}
            disabled={connectionState.socket === 'connecting' || !currentUserId || !currentUserRole}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {connectionState.socket === 'connecting' ? 'Connecting...' : 'Reconnect Signaling'}
          </button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-2">Debug Info</h4>
            <div className="text-xs space-y-1">
              <p>Stream: {stream ? 'Available' : 'Not available'}</p>
              <p>Remote: {remote ? 'Available' : 'Not available'}</p>
              <p>Socket: {connectionState.socket}</p>
              <p>Peer: {connectionState.peer}</p>
              <p>Active Session Type: {activeSessionType}</p>
              <p>Current Role: {currentUserRole || 'N/A'}</p>
              <p>Current User ID: {currentUserId || 'N/A'}</p>
              <p>Socket ID: {socketRef.current?.id || 'Not connected'}</p>
              <p>Target User ID: {targetUserId || 'N/A'}</p>
              <p>Incoming Request: {incomingSessionRequest ? `From ${incomingSessionRequest.fromMentorId}` : 'None'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
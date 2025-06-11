import React, { useEffect, useState, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, push, onValue, onChildAdded, off, serverTimestamp } from 'firebase/database';
import SimplePeer from 'simple-peer';
// import DebugPanel from '../components/DebugPanel'; // Uncomment when you create the component

interface SessionAcceptedPayload {
  firebaseSessionPath: string;
  sessionType: 'chat' | 'video';
}

interface ChatMessage {
  from: string;
  message: string;
  timestamp: any;
}

interface IncomingRequest {
  id: string;
  type: string;
  fromMentorId: string;
  mentorSocketIoId: string;
  sessionType: 'chat' | 'video';
  timestamp: any;
  status: string;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const firebaseDb = getDatabase(app);

const MentorComponent = () => {
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<'user' | 'mentor' | null>(null);
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [onlineUserStatuses, setOnlineUserStatuses] = useState<any>({});
  const [activeFirebaseSessionPath, setActiveFirebaseSessionPath] = useState<string | null>(null);
  const [peerConnection, setPeerConnection] = useState<SimplePeer.Instance | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isInVideoCall, setIsInVideoCall] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Initialize user data from localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        console.log('Loaded user from localStorage:', parsedUser);
        setMyUserId(parsedUser._id || parsedUser.id);
        setMyRole(parsedUser.role as 'user' | 'mentor');
      } else {
        // For testing purposes, create a mock user
        const mockUser = {
          _id: `user_${Math.random().toString(36).substr(2, 9)}`,
          role: 'user' as const // Change to 'mentor' for testing mentor functionality
        };
        localStorage.setItem("user", JSON.stringify(mockUser));
        setMyUserId(mockUser._id);
        setMyRole(mockUser.role);
        console.log('Created mock user:', mockUser);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  const isProd = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');

  const SOCKET_OPTIONS = {
    path: '/api/socket',
    transports: isProd ? ['polling'] : ['websocket', 'polling'] as any,
    timeout: 60000,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  };

  const startVideoCall = useCallback(async (initiator: boolean, sessionPath: string) => {
    try {
      console.log(`Starting video call - Initiator: ${initiator}, Path: ${sessionPath}`);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const peer = new SimplePeer({ 
        initiator, 
        trickle: false, 
        stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      peer.on('signal', (data) => {
        console.log('Sending WebRTC signal:', data);
        push(ref(firebaseDb, `${sessionPath}/signals`), {
          from: myUserId,
          signal: JSON.stringify(data),
          timestamp: serverTimestamp()
        });
      });

      peer.on('stream', (remoteStream) => {
        console.log('Received remote stream');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      peer.on('error', (err) => {
        console.error('Peer connection error:', err);
      });

      peer.on('connect', () => {
        console.log('Peer connected successfully!');
        setIsInVideoCall(true);
      });

      peer.on('close', () => {
        console.log('Peer connection closed');
        setIsInVideoCall(false);
      });

      setPeerConnection(peer);
    } catch (err) {
      console.error('Failed to get media stream:', err);
      alert('Failed to access camera/microphone. Please check permissions.');
    }
  }, [myUserId]);

  const endCurrentSession = useCallback(() => {
    console.log('Ending current session');
    if (activeFirebaseSessionPath) {
      // Clean up Firebase listeners
      off(ref(firebaseDb, `${activeFirebaseSessionPath}/messages`));
      off(ref(firebaseDb, `${activeFirebaseSessionPath}/signals`));
      off(ref(firebaseDb, activeFirebaseSessionPath));
      
      setActiveFirebaseSessionPath(null);
      setChatMessages([]);
      setIsInVideoCall(false);
      
      // Clean up peer connection
      if (peerConnection) {
        peerConnection.destroy();
        setPeerConnection(null);
      }
      
      // Clean up video streams
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        localVideoRef.current.srcObject = null;
      }
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }

      // Notify server to end session
      if (socket) {
        socket.emit('end-session');
      }
    }
  }, [activeFirebaseSessionPath, peerConnection, socket]);

  const setupFirebaseSessionListeners = useCallback((path: string, sessionType: 'chat' | 'video') => {
    console.log(`Setting up Firebase listeners for session: ${path}, type: ${sessionType}`);
    
    // Listen for new messages
    const messagesRef = ref(firebaseDb, `${path}/messages`);
    onChildAdded(messagesRef, (snapshot) => {
      const message = snapshot.val();
      console.log('New message received:', message);
      setChatMessages((prev) => [...prev, message]);
    });

    // Listen for WebRTC signals if video call
    if (sessionType === 'video') {
      const signalsRef = ref(firebaseDb, `${path}/signals`);
      onChildAdded(signalsRef, (snapshot) => {
        const signalData = snapshot.val();
        if (signalData.from !== myUserId && peerConnection) {
          try {
            const signal = JSON.parse(signalData.signal);
            console.log('Received WebRTC signal:', signal);
            peerConnection.signal(signal);
          } catch (err) {
            console.error('Error parsing WebRTC signal:', err);
          }
        }
      });
      
      // Start video call
      startVideoCall(myRole === 'mentor', path);
    }

    // Listen for session status changes
    const sessionRef = ref(firebaseDb, path);
    onValue(sessionRef, (snapshot) => {
      const sessionData = snapshot.val();
      if (sessionData?.status === 'ended') {
        console.log('Session ended by peer');
        endCurrentSession();
      }
    });
  }, [myUserId, myRole, peerConnection, startVideoCall, endCurrentSession]);

  // Socket.IO connection setup
  useEffect(() => {
    if (!myUserId || !myRole) return;

    console.log(`Connecting socket for user: ${myUserId}, role: ${myRole}`);
    const newSocket = io(SOCKET_OPTIONS);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      newSocket.emit('register', { userId: myUserId, role: myRole });
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connected', (data: any) => {
      console.log('Socket.IO connected:', data);
    });

    newSocket.on('server-error', (data: any) => {
      console.error('Server error:', data);
      alert(`Server Error: ${data.message}`);
    });

    newSocket.on('incoming-session-request', (data: any) => {
      console.log('Incoming session request:', data);
      setIncomingRequests((prev) => [...prev, data]);
    });

    newSocket.on('session-accepted', ({ firebaseSessionPath, sessionType }: SessionAcceptedPayload) => {
      console.log('Session accepted:', { firebaseSessionPath, sessionType });
      setActiveFirebaseSessionPath(firebaseSessionPath);
      setupFirebaseSessionListeners(firebaseSessionPath, sessionType);
    });

    newSocket.on('session-ended-by-peer', () => {
      console.log('Session ended by peer');
      endCurrentSession();
    });

    newSocket.on('peer-disconnected', () => {
      console.log('Peer disconnected');
      endCurrentSession();
    });

    return () => {
      console.log('Cleaning up socket connection');
      newSocket.disconnect();
    };
  }, [myUserId, myRole, setupFirebaseSessionListeners, endCurrentSession]);

  // Firebase listeners for user statuses and notifications
  useEffect(() => {
    if (!myUserId) return;

    console.log('Setting up Firebase listeners for user:', myUserId);
    
    const statusesRef = ref(firebaseDb, 'user_statuses');
    const requestsRef = ref(firebaseDb, `user_notifications/${myUserId}/requests`);
    const responsesRef = ref(firebaseDb, `user_notifications/${myUserId}/responses`);

    onValue(statusesRef, (snapshot) => {
      const statuses = snapshot.val() || {};
      console.log('User statuses updated:', statuses);
      setOnlineUserStatuses(statuses);
    });

    onChildAdded(requestsRef, (snap) => {
      const request = { id: snap.key, ...snap.val() };
      console.log('New request received:', request);
      setIncomingRequests((prev) => [...prev, request]);
    });

    onChildAdded(responsesRef, (snap) => {
      const response = snap.val();
      console.log('New response received:', response);
      
      if (response.type === 'session_accepted') {
        setActiveFirebaseSessionPath(response.firebaseSessionPath);
        setupFirebaseSessionListeners(response.firebaseSessionPath, response.sessionType);
      } else if (response.type === 'session_ended') {
        endCurrentSession();
      }
    });

    return () => {
      off(statusesRef);
      off(requestsRef);
      off(responsesRef);
    };
  }, [myUserId, setupFirebaseSessionListeners, endCurrentSession]);

  const handleMentorRequestSession = (targetUserId: string, type: 'chat' | 'video') => {
    if (!socket || !isConnected) {
      alert('Not connected to server');
      return;
    }
    
    console.log(`Requesting ${type} session with user: ${targetUserId}`);
    socket.emit('mentor-request-session', { targetUserId, sessionType: type });
  };

  const handleUserAcceptSession = (mentorSocketIoId: string, sessionType: 'chat' | 'video', requestId: string) => {
    if (!socket || !isConnected) {
      alert('Not connected to server');
      return;
    }
    
    console.log(`Accepting ${sessionType} session from mentor: ${mentorSocketIoId}`);
    socket.emit('user-accept-session', { mentorSocketIoId, sessionType, requestId });
    setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const handleSendChatMessage = (msg: string) => {
    if (!activeFirebaseSessionPath || !myUserId || !msg.trim()) return;
    
    console.log('Sending chat message:', msg);
    push(ref(firebaseDb, `${activeFirebaseSessionPath}/messages`), {
      from: myUserId,
      message: msg.trim(),
      timestamp: serverTimestamp(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentMessage.trim()) {
      handleSendChatMessage(currentMessage);
      setCurrentMessage('');
    }
  };

  if (!myUserId || !myRole) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading user session...</h2>
        <p>If this persists, please refresh the page.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Mentor/User Dashboard</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <p><strong>User ID:</strong> {myUserId}</p>
        <p><strong>Role:</strong> {myRole}</p>
        <p><strong>Connection Status:</strong> {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</p>
      </div>

      {/* Mentor Controls */}
      {myRole === 'mentor' && (
        <div style={{ marginBottom: '30px', padding: '15px', border: '2px solid #007bff', borderRadius: '5px' }}>
          <h2>Mentor Controls</h2>
          <div style={{ marginBottom: '10px' }}>
            <input 
              type="text" 
              placeholder="Enter User ID" 
              id="targetUserId"
              style={{ padding: '8px', marginRight: '10px', width: '200px' }}
            />
            <button 
              onClick={() => {
                const input = document.getElementById('targetUserId') as HTMLInputElement;
                if (input.value.trim()) {
                  handleMentorRequestSession(input.value.trim(), 'chat');
                }
              }}
              style={{ padding: '8px 15px', marginRight: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px' }}
            >
              Request Chat
            </button>
            <button 
              onClick={() => {
                const input = document.getElementById('targetUserId') as HTMLInputElement;
                if (input.value.trim()) {
                  handleMentorRequestSession(input.value.trim(), 'video');
                }
              }}
              style={{ padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px' }}
            >
              Request Video Call
            </button>
          </div>
        </div>
      )}

      {/* Incoming Requests */}
      {myRole === 'user' && incomingRequests.length > 0 && (
        <div style={{ marginBottom: '30px', padding: '15px', border: '2px solid #ffc107', borderRadius: '5px' }}>
          <h2>Incoming Session Requests:</h2>
          {incomingRequests.map((req) => (
            <div key={req.id} style={{ padding: '10px', backgroundColor: '#fff3cd', marginBottom: '10px', borderRadius: '3px' }}>
              <p><strong>From Mentor:</strong> {req.fromMentorId}</p>
              <p><strong>Session Type:</strong> {req.sessionType}</p>
              <button 
                onClick={() => handleUserAcceptSession(req.mentorSocketIoId, req.sessionType, req.id)}
                style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px' }}
              >
                Accept {req.sessionType}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Active Session */}
      {activeFirebaseSessionPath && (
        <div style={{ marginBottom: '30px', padding: '15px', border: '2px solid #28a745', borderRadius: '5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2>Active Session</h2>
            <button 
              onClick={endCurrentSession}
              style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px' }}
            >
              End Session
            </button>
          </div>
          
          {/* Chat Interface */}
          <div style={{ marginBottom: '20px' }}>
            <h3>Chat Messages:</h3>
            <div style={{ 
              height: '200px', 
              overflowY: 'auto', 
              border: '1px solid #ccc', 
              padding: '10px', 
              backgroundColor: '#f9f9f9',
              marginBottom: '10px'
            }}>
              {chatMessages.map((msg, index) => (
                <div key={index} style={{ 
                  marginBottom: '8px', 
                  padding: '5px',
                  backgroundColor: msg.from === myUserId ? '#007bff' : '#6c757d',
                  color: 'white',
                  borderRadius: '3px',
                  alignSelf: msg.from === myUserId ? 'flex-end' : 'flex-start'
                }}>
                  <strong>{msg.from === myUserId ? 'You' : msg.from}:</strong> {msg.message}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex' }}>
              <input 
                type="text" 
                placeholder="Type your message..." 
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                style={{ flex: 1, padding: '8px', marginRight: '10px' }}
              />
              <button 
                onClick={() => {
                  if (currentMessage.trim()) {
                    handleSendChatMessage(currentMessage);
                    setCurrentMessage('');
                  }
                }}
                style={{ padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px' }}
              >
                Send
              </button>
            </div>
          </div>

          {/* Video Interface */}
          {isInVideoCall && (
            <div>
              <h3>Video Call:</h3>
              <div style={{ display: 'flex', gap: '20px' }}>
                <div>
                  <p>Your Video:</p>
                  <video 
                    ref={localVideoRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    style={{ width: '300px', height: '200px', backgroundColor: '#000', borderRadius: '5px' }}
                  />
                </div>
                <div>
                  <p>Remote Video:</p>
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    style={{ width: '300px', height: '200px', backgroundColor: '#000', borderRadius: '5px' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Online Users */}
      <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
        <h3>Online Users:</h3>
        {Object.keys(onlineUserStatuses).length === 0 ? (
          <p>No users online</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {Object.entries(onlineUserStatuses).map(([uid, data]: [string, any]) => (
              <li key={uid} style={{ 
                padding: '10px', 
                marginBottom: '5px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '3px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>
                  <strong>{uid}</strong> - {data.status === 'online' ? '🟢' : '🔴'} {data.status}
                </span>
                {myRole === 'mentor' && data.status === 'online' && uid !== myUserId && (
                  <div>
                    <button 
                      onClick={() => handleMentorRequestSession(uid, 'chat')}
                      style={{ padding: '5px 10px', marginRight: '5px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px', fontSize: '12px' }}
                    >
                      Chat
                    </button>
                    <button 
                      onClick={() => handleMentorRequestSession(uid, 'video')}
                      style={{ padding: '5px 10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '3px', fontSize: '12px' }}
                    >
                      Video
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MentorComponent;
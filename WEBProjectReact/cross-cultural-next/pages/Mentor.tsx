// pages/Mentor.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';

import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';

import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, push, onValue, onChildAdded, off, serverTimestamp } from 'firebase/database';

import SimplePeer from 'simple-peer';

interface ClientInfo {
  userId: string;
  role: 'user' | 'mentor';
  socketId: string;
}

const MY_USER_ID = 'user_abc';
const MY_ROLE: 'user' | 'mentor' = 'user'; // Still a const

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const firebaseDb = getDatabase(app);

const MentorComponent = () => {
  const [socket, setSocket] = useState<typeof Socket | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [onlineUserStatuses, setOnlineUserStatuses] = useState<any>({});
  const [activeFirebaseSessionPath, setActiveFirebaseSessionPath] = useState<string | null>(null);
  const [peerConnection, setPeerConnection] = useState<SimplePeer.Instance | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const SOCKET_OPTIONS = {
    path: '/api/socket',
    transports: ['polling'],
    timeout: 60000,
    query: { userId: MY_USER_ID, role: MY_ROLE },
  };


  const startVideoCall = useCallback(async (initiator: boolean, sessionPath: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const peer = new SimplePeer({
        initiator: initiator,
        trickle: false,
        stream: stream
      });

      peer.on('signal', (data) => {
        push(ref(firebaseDb, `${sessionPath}/signals`), {
          from: MY_USER_ID,
          signal: JSON.stringify(data),
          timestamp: serverTimestamp()
        });
      });

      peer.on('stream', (remoteStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      peer.on('error', (err) => console.error('Peer error:', err));
      peer.on('connect', () => console.log('Peer connected!'));

      setPeerConnection(peer);
    } catch (err) {
      console.error('Failed to get media stream:', err);
    }
  }, [firebaseDb, MY_USER_ID]);

  const endCurrentSession = useCallback(() => {
    console.log('Ending current session...');
    if (activeFirebaseSessionPath) {
      off(ref(firebaseDb, `${activeFirebaseSessionPath}/messages`));
      off(ref(firebaseDb, `${activeFirebaseSessionPath}/signals`));
      off(ref(firebaseDb, activeFirebaseSessionPath));

      setActiveFirebaseSessionPath(null);
      setChatMessages([]);
      if (peerConnection) {
        peerConnection.destroy();
        setPeerConnection(null);
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    }
  }, [activeFirebaseSessionPath, peerConnection, firebaseDb]);

  const setupFirebaseSessionListeners = useCallback((path: string, sessionType: 'chat' | 'video') => {
    console.log(`Setting up Firebase listeners for session path: ${path}, type: ${sessionType}`);
    onChildAdded(ref(firebaseDb, `${path}/messages`), (snapshot) => {
      const message = snapshot.val();
      setChatMessages((prev) => [...prev, message]);
      console.log('New chat message:', message);
    });

    if (sessionType === 'video') {
      console.log('Setting up WebRTC signal listener for video session.');
      onChildAdded(ref(firebaseDb, `${path}/signals`), (snapshot) => {
        const signal = JSON.parse(snapshot.val().signal);
        console.log('Received WebRTC signal:', signal);
        if (peerConnection) {
          peerConnection.signal(signal);
        }
      });
      // FIX 1: Add type assertion to MY_ROLE here
      if ((MY_ROLE as string) === 'mentor') {
        startVideoCall(true, path);
      } else {
        startVideoCall(false, path);
      }
    }

    onValue(ref(firebaseDb, path), (snapshot) => {
      const sessionData = snapshot.val();
      if (sessionData && sessionData.status === 'ended') {
        console.log('Session ended from Firebase RTDB update.');
        endCurrentSession();
      }
    });
  }, [firebaseDb, peerConnection, MY_ROLE, endCurrentSession, startVideoCall]);

  // --- Socket.IO setup ---
  useEffect(() => {
    const newSocket = io(SOCKET_OPTIONS);

    setSocket(newSocket);

    newSocket.on('connected', (data: { message: string; clientId: string; timestamp: string; totalClients: number }) => {
      console.log('Socket.IO connected:', data.message);
      newSocket.emit('register', { userId: MY_USER_ID, role: MY_ROLE });
    });

    newSocket.on('server-error', (data: { message: string }) => {
      console.error('Socket.IO Server Error:', data.message);
      alert(`Server Error: ${data.message}`);
    });

    newSocket.on('incoming-session-request', (data: any) => {
      console.log('Incoming session request:', data);
      setIncomingRequests(prev => [...prev, data]);
    });

    newSocket.on('session-accepted', (data: { firebaseSessionPath: string; sessionType: 'chat' | 'video' }) => {
      console.log('Session accepted:', data);
      setActiveFirebaseSessionPath(data.firebaseSessionPath);
      setupFirebaseSessionListeners(data.firebaseSessionPath, data.sessionType);
    });

    newSocket.on('user-accepted-session', (data: { firebaseSessionPath: string; sessionType: 'chat' | 'video' }) => {
      console.log('User accepted session:', data);
      setActiveFirebaseSessionPath(data.firebaseSessionPath);
      setupFirebaseSessionListeners(data.firebaseSessionPath, data.sessionType);
    });

    newSocket.on('session-ended-by-peer', () => {
      console.log('Session ended by peer');
      endCurrentSession();
    });

    newSocket.on('peer-disconnected', (data: any) => {
      console.log('Peer disconnected:', data);
      endCurrentSession();
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log(`Socket.IO disconnected: ${reason}`);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [MY_USER_ID, MY_ROLE, endCurrentSession, setupFirebaseSessionListeners]);

  // --- Firebase Realtime Database Listeners ---
  useEffect(() => {
    const userStatusesRef = ref(firebaseDb, 'user_statuses');
    onValue(userStatusesRef, (snapshot) => {
      setOnlineUserStatuses(snapshot.val() || {});
      console.log('Online user statuses updated:', snapshot.val());
    });

    const userRequestsRef = ref(firebaseDb, `user_notifications/${MY_USER_ID}/requests`);
    onChildAdded(userRequestsRef, (snapshot) => {
      const request = { id: snapshot.key, ...snapshot.val() };
      console.log('New incoming request from Firebase:', request);
      setIncomingRequests(prev => [...prev, request]);
    });

    const userResponsesRef = ref(firebaseDb, `user_notifications/${MY_USER_ID}/responses`);
    onChildAdded(userResponsesRef, (snapshot) => {
      const response = snapshot.val();
      console.log('New response from Firebase:', response);
      if (response.type === 'session_accepted') {
        setActiveFirebaseSessionPath(response.firebaseSessionPath);
        setupFirebaseSessionListeners(response.firebaseSessionPath, response.sessionType);
      } else if (response.type === 'session_ended') {
        console.log('Session ended via Firebase notification:', response);
        endCurrentSession();
      }
    });

    return () => {
      off(userStatusesRef);
      off(userRequestsRef);
      off(userResponsesRef);
    };
  }, [MY_USER_ID, endCurrentSession, setupFirebaseSessionListeners]);


  const handleMentorRequestSession = (targetUserId: string, type: 'chat' | 'video') => {
    if (socket) {
      socket.emit('mentor-request-session', { targetUserId, sessionType: type });
    }
  };

  const handleUserAcceptSession = (mentorSocketIoId: string, sessionType: 'chat' | 'video', requestId: string) => {
    if (socket) {
      socket.emit('user-accept-session', { mentorSocketIoId, sessionType, requestId });
      setIncomingRequests(prev => prev.filter(req => req.id !== requestId));
    }
  };

  const handleSendChatMessage = (message: string) => {
    if (activeFirebaseSessionPath) {
      push(ref(firebaseDb, `${activeFirebaseSessionPath}/messages`), {
        from: MY_USER_ID,
        message: message,
        timestamp: serverTimestamp(),
      });
    } else {
      alert('No active session to send chat message.');
    }
  };

  const handleEndSession = () => {
    if (socket) {
      socket.emit('end-session');
    }
  };

  return (
    <div>
      <h1>Mentor/User Dashboard</h1>
      {/* FIX 2: Add type assertion to MY_ROLE here */}
      {(MY_ROLE as string) === 'mentor' && (
        <button onClick={() => handleMentorRequestSession('user_def', 'chat')}>Request Chat with User DEF</button>
      )}

      {/* This condition `MY_ROLE === 'user'` is fine as is, but if it flags, you can add `(MY_ROLE as string) === 'user'` */}
      {MY_ROLE === 'user' && incomingRequests.length > 0 && (
        <div>
          <h2>Incoming Session Requests:</h2>
          {incomingRequests.map((req) => (
            <div key={req.id}>
              <p>From Mentor ID: {req.fromMentorId} ({req.sessionType})</p>
              <button onClick={() => handleUserAcceptSession(req.mentorSocketIoId, req.sessionType, req.id)}>Accept {req.sessionType}</button>
            </div>
          ))}
        </div>
      )}

      {activeFirebaseSessionPath && (
        <div>
          <h2>Active Session (Firebase Path: {activeFirebaseSessionPath})</h2>
          <button onClick={handleEndSession}>End Session</button>
          <h3>Chat:</h3>
          <div>
            {chatMessages.map((msg, index) => (
              <p key={index}>
                <strong>{msg.from}:</strong> {msg.message} ({(new Date(msg.timestamp)).toLocaleTimeString()})
              </p>
            ))}
          </div>
          <input
            type="text"
            placeholder="Type message"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendChatMessage((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />

          {/* Video elements for WebRTC */}
          <div>
            <h3>Video Streams</h3>
            <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '300px' }}></video>
            <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '300px' }}></video>
          </div>
        </div>
      )}

      <h3>Online Users:</h3>
      <ul>
        {Object.entries(onlineUserStatuses).map(([userId, data]: [string, any]) => (
          <li key={userId}>
            {userId}: {data.status} ({new Date(data.timestamp).toLocaleTimeString()})
            {/* FIX 3: Add type assertion to MY_ROLE here */}
            {(MY_ROLE as string) === 'mentor' && data.status === 'online' && userId !== MY_USER_ID && (
              <>
                <button onClick={() => handleMentorRequestSession(userId, 'chat')}>Chat</button>
                <button onClick={() => handleMentorRequestSession(userId, 'video')}>Video</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MentorComponent;
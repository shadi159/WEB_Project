// pages/Mentor.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, push, onValue, onChildAdded, off, serverTimestamp } from 'firebase/database';
import SimplePeer from 'simple-peer';

interface SessionAcceptedPayload {
  firebaseSessionPath: string;
  sessionType: 'chat' | 'video';
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

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const firebaseDb = getDatabase(app);

const MentorComponent = () => {
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<'user' | 'mentor' | null>(null);
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [onlineUserStatuses, setOnlineUserStatuses] = useState<any>({});
  const [activeFirebaseSessionPath, setActiveFirebaseSessionPath] = useState<string | null>(null);
  const [peerConnection, setPeerConnection] = useState<SimplePeer.Instance | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setMyUserId(parsedUser._id);
      setMyRole(parsedUser.role);
    }
  }, []);

  const isProd = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');

  const SOCKET_OPTIONS = {
    path: '/api/socket',
    transports: isProd ? ['polling'] : ['websocket', 'polling'],
    timeout: 60000,
  };

  const startVideoCall = useCallback(async (initiator: boolean, sessionPath: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const peer = new SimplePeer({ initiator, trickle: false, stream });

      peer.on('signal', (data) => {
        push(ref(firebaseDb, `${sessionPath}/signals`), {
          from: myUserId,
          signal: JSON.stringify(data),
          timestamp: serverTimestamp()
        });
      });

      peer.on('stream', (remoteStream) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      });

      peer.on('error', console.error);
      peer.on('connect', () => console.log('Peer connected!'));

      setPeerConnection(peer);
    } catch (err) {
      console.error('Failed to get media stream:', err);
    }
  }, [myUserId]);

  const endCurrentSession = useCallback(() => {
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
  }, [activeFirebaseSessionPath, peerConnection]);

  const setupFirebaseSessionListeners = useCallback((path: string, sessionType: 'chat' | 'video') => {
    onChildAdded(ref(firebaseDb, `${path}/messages`), (snapshot) => {
      setChatMessages((prev) => [...prev, snapshot.val()]);
    });

    if (sessionType === 'video') {
      onChildAdded(ref(firebaseDb, `${path}/signals`), (snapshot) => {
        const signal = JSON.parse(snapshot.val().signal);
        if (peerConnection) peerConnection.signal(signal);
      });
      startVideoCall(myRole === 'mentor', path);
    }

    onValue(ref(firebaseDb, path), (snapshot) => {
      const sessionData = snapshot.val();
      if (sessionData?.status === 'ended') endCurrentSession();
    });
  }, [peerConnection, myRole, endCurrentSession, startVideoCall]);

  useEffect(() => {
    if (!myUserId || !myRole) return;
    const newSocket = io(SOCKET_OPTIONS);
    setSocket(newSocket);

    newSocket.on('connected', (data: any) => {
      console.log('Socket.IO connected:', data);
      newSocket.emit('register', { userId: myUserId, role: myRole });
    });

    newSocket.on('server-error', (data: any) => alert(`Server Error: ${data.message}`));
    newSocket.on('incoming-session-request', (data: any) => setIncomingRequests((prev) => [...prev, data]));
    newSocket.on('session-accepted', ({ firebaseSessionPath, sessionType }: SessionAcceptedPayload) => {
      setActiveFirebaseSessionPath(firebaseSessionPath);
      setupFirebaseSessionListeners(firebaseSessionPath, sessionType);
    });
    newSocket.on('session-ended-by-peer', endCurrentSession);
    newSocket.on('peer-disconnected', endCurrentSession);

    return () => {
      newSocket.disconnect();
    };
  }, [myUserId, myRole, setupFirebaseSessionListeners, endCurrentSession]);

  useEffect(() => {
    if (!myUserId) return;
    const statusesRef = ref(firebaseDb, 'user_statuses');
    const requestsRef = ref(firebaseDb, `user_notifications/${myUserId}/requests`);
    const responsesRef = ref(firebaseDb, `user_notifications/${myUserId}/responses`);

    onValue(statusesRef, (snapshot) => setOnlineUserStatuses(snapshot.val() || {}));
    onChildAdded(requestsRef, (snap) => setIncomingRequests((prev) => [...prev, { id: snap.key, ...snap.val() }]));
    onChildAdded(responsesRef, (snap) => {
      const res = snap.val();
      if (res.type === 'session_accepted') {
        setActiveFirebaseSessionPath(res.firebaseSessionPath);
        setupFirebaseSessionListeners(res.firebaseSessionPath, res.sessionType);
      } else if (res.type === 'session_ended') endCurrentSession();
    });

    return () => {
      off(statusesRef);
      off(requestsRef);
      off(responsesRef);
    };
  }, [myUserId, setupFirebaseSessionListeners, endCurrentSession]);

  const handleMentorRequestSession = (targetUserId: string, type: 'chat' | 'video') => {
    socket?.emit('mentor-request-session', { targetUserId, sessionType: type });
  };

  const handleUserAcceptSession = (mentorSocketIoId: string, sessionType: 'chat' | 'video', requestId: string) => {
    socket?.emit('user-accept-session', { mentorSocketIoId, sessionType, requestId });
    setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const handleSendChatMessage = (msg: string) => {
    if (!activeFirebaseSessionPath || !myUserId) return;
    push(ref(firebaseDb, `${activeFirebaseSessionPath}/messages`), {
      from: myUserId,
      message: msg,
      timestamp: serverTimestamp(),
    });
  };

  if (!myUserId || !myRole) return <p>Loading user session...</p>;

  return (
    <div>
      <h1>Mentor/User Dashboard</h1>

      {myRole === 'mentor' && (
        <button onClick={() => handleMentorRequestSession('user_def', 'chat')}>
          Request Chat with User DEF
        </button>
      )}

      {myRole === 'user' && incomingRequests.length > 0 && (
        <div>
          <h2>Incoming Session Requests:</h2>
          {incomingRequests.map((req) => (
            <div key={req.id}>
              <p>From Mentor ID: {req.fromMentorId} ({req.sessionType})</p>
              <button onClick={() => handleUserAcceptSession(req.mentorSocketIoId, req.sessionType, req.id)}>
                Accept {req.sessionType}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeFirebaseSessionPath && (
        <div>
          <h2>Active Session</h2>
          <input type="text" placeholder="Type message" onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSendChatMessage((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = '';
            }
          }} />

          <div>
            <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '300px' }}></video>
            <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '300px' }}></video>
          </div>
        </div>
      )}

      <h3>Online Users:</h3>
      <ul>
        {Object.entries(onlineUserStatuses).map(([uid, data]: [string, any]) => (
          <li key={uid}>
            {uid}: {data.status}
            {myRole === 'mentor' && data.status === 'online' && uid !== myUserId && (
              <>
                <button onClick={() => handleMentorRequestSession(uid, 'chat')}>Chat</button>
                <button onClick={() => handleMentorRequestSession(uid, 'video')}>Video</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MentorComponent;

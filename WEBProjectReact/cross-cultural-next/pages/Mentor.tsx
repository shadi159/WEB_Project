"use client";

import React, { useEffect, useRef, useState } from 'react';
import Navbar from '@/app/components/Navbar';
import DenoP2PSignaling from '../app/components/p2p/DenoP2PSignaling';
import WebRTCManager from '../app/components/p2p/WebRTCManager';
import { P2P_SIGNALING_URL } from '../app/shared/config';

const Mentor = () => {
  const [roomId, setRoomId] = useState('');
  const [joinedRoom, setJoinedRoom] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [isInCall, setIsInCall] = useState(false);

  const signalingRef = useRef<DenoP2PSignaling | null>(null);
  const managerRef = useRef<WebRTCManager | null>(null);

  useEffect(() => {
    const signaling = new DenoP2PSignaling(P2P_SIGNALING_URL);
    const manager = new WebRTCManager(signaling);

    signalingRef.current = signaling;
    managerRef.current = manager;

    manager.addEventListener('localStream', (e: any) => setLocalStream(e.detail));
    manager.addEventListener('remoteStream', (e: any) => {
      const { peerId, stream } = e.detail;
      setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
    });

    return () => {
      manager.close();
      signaling.leaveRoom();
    };
  }, []);

  const createRoom = async () => {
    if (!signalingRef.current || !managerRef.current) return;
    const id = roomId || Math.random().toString(36).slice(2);
    signalingRef.current.joinRoom(id);
    await managerRef.current.startLocalStream();
    setJoinedRoom(id);
    setIsInCall(true);
  };

  const leaveRoom = () => {
    signalingRef.current?.leaveRoom();
    managerRef.current?.close();
    setJoinedRoom(null);
    setIsInCall(false);
    setRemoteStreams({});
    setLocalStream(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="p-4 flex-1 space-y-4">
        {!isInCall ? (
          <div className="space-y-2">
            <input
              className="border px-2 py-1"
              value={roomId}
              placeholder="Room ID"
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button className="border px-4 py-2" onClick={createRoom}>
              Create / Join Room
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {localStream && (
                <video
                  className="w-full"
                  muted
                  autoPlay
                  playsInline
                  ref={(el) => {
                    if (el) el.srcObject = localStream;
                  }}
                />
              )}
              {Object.entries(remoteStreams).map(([id, stream]) => (
                <video
                  key={id}
                  className="w-full"
                  autoPlay
                  playsInline
                  ref={(el) => {
                    if (el) el.srcObject = stream;
                  }}
                />
              ))}
            </div>
            <button className="border px-4 py-2" onClick={leaveRoom}>
              Leave Room
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Mentor;
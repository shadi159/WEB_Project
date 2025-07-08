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
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const signalingRef = useRef<DenoP2PSignaling | null>(null);
  const managerRef = useRef<WebRTCManager | null>(null);

  useEffect(() => {
    // Initialize but don't connect immediately
    const signaling = new DenoP2PSignaling(P2P_SIGNALING_URL);
    const manager = new WebRTCManager(signaling);

    signalingRef.current = signaling;
    managerRef.current = manager;

    // Add connection status listeners
    signaling.addEventListener('open', () => {
      setConnectionStatus('connected');
      setError(null);
    });

    signaling.addEventListener('close', () => {
      setConnectionStatus('disconnected');
    });

    signaling.addEventListener('error', (e: any) => {
      setError(`Connection error: ${e.message || 'Unknown error'}`);
      setConnectionStatus('disconnected');
    });

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
    
    try {
      setError(null);
      setConnectionStatus('connecting');
      
      // Wait for connection to be established
      await new Promise<void>((resolve, reject) => {
        const signaling = signalingRef.current!;
        
        const onOpen = () => {
          signaling.removeEventListener('open', onOpen);
          signaling.removeEventListener('error', onError);
          resolve();
        };
        
        const onError = (e: any) => {
          signaling.removeEventListener('open', onOpen);
          signaling.removeEventListener('error', onError);
          reject(new Error(`Failed to connect: ${e.message || 'Connection failed'}`));
        };
        
        signaling.addEventListener('open', onOpen);
        signaling.addEventListener('error', onError);
        
        // Try to connect
        signaling.connect();
        
        // Timeout after 10 seconds
        setTimeout(() => {
          signaling.removeEventListener('open', onOpen);
          signaling.removeEventListener('error', onError);
          reject(new Error('Connection timeout'));
        }, 10000);
      });

      const id = roomId || Math.random().toString(36).slice(2);
      signalingRef.current.joinRoom(id);
      await managerRef.current.startLocalStream();
      setJoinedRoom(id);
      setIsInCall(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      setConnectionStatus('disconnected');
    }
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
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <span className="text-sm">Status:</span>
          <span className={`text-sm px-2 py-1 rounded ${
            connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
            connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {connectionStatus}
          </span>
        </div>
        
        {!isInCall ? (
          <div className="space-y-2">
            <input
              className="border px-2 py-1"
              value={roomId}
              placeholder="Room ID"
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button 
              className="border px-4 py-2 disabled:opacity-50" 
              onClick={createRoom}
              disabled={connectionStatus === 'connecting'}
            >
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Create / Join Room'}
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
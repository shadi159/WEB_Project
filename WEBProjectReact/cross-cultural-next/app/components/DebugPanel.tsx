// components/DebugPanel.tsx - Add this to help debug your application
import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, off } from 'firebase/database';

interface DebugPanelProps {
  firebaseDb: any;
  socket: any;
  myUserId: string | null;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ firebaseDb, socket, myUserId }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [mongoStatus, setMongoStatus] = useState<string>('Unknown');
  const [firebaseStatus, setFirebaseStatus] = useState<string>('Unknown');
  const [socketStatus, setSocketStatus] = useState<string>('Disconnected');

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]); // Keep last 50 logs
  };

  useEffect(() => {
    // Test Firebase connection
    if (firebaseDb && myUserId) {
      try {
        const testRef = ref(firebaseDb, '.info/connected');
        onValue(testRef, (snapshot) => {
          const connected = snapshot.val();
          setFirebaseStatus(connected ? 'Connected' : 'Disconnected');
          addLog(`Firebase: ${connected ? 'Connected' : 'Disconnected'}`);
        });

        return () => off(testRef);
      } catch (error) {
        setFirebaseStatus('Error');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        addLog(`Firebase Error: ${errorMessage}`);
      }
    }
  }, [firebaseDb, myUserId]);

  useEffect(() => {
    if (socket) {
      socket.on('connect', () => {
        setSocketStatus('Connected');
        addLog('Socket.IO: Connected');
      });

      socket.on('disconnect', (reason: string) => {
        setSocketStatus('Disconnected');
        addLog(`Socket.IO: Disconnected - ${reason}`);
      });

      socket.on('connected', (data: any) => {
        addLog(`Socket.IO: Server acknowledged connection - ${JSON.stringify(data)}`);
      });

      socket.on('server-error', (error: any) => {
        addLog(`Socket.IO Error: ${JSON.stringify(error)}`);
      });

      return () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connected');
        socket.off('server-error');
      };
    }
  }, [socket]);

  const testMongoConnection = async () => {
    try {
      const response = await fetch('/api/test-mongo', { method: 'POST' });
      const result = await response.json();
      setMongoStatus(result.success ? 'Connected' : 'Error');
      addLog(`MongoDB Test: ${result.success ? 'Success' : result.error}`);
    } catch (error) {
      setMongoStatus('Error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog(`MongoDB Test Failed: ${errorMessage}`);
    }
  };

  const testFirebaseWrite = async () => {
    if (!firebaseDb || !myUserId) return;
    
    try {
      const { push, ref, serverTimestamp } = await import('firebase/database');
      await push(ref(firebaseDb, `debug_tests/${myUserId}`), {
        message: 'Test message',
        timestamp: serverTimestamp()
      });
      addLog('Firebase Write Test: Success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addLog(`Firebase Write Test Failed: ${errorMessage}`);
    }
  };

  const createTestUsers = () => {
    // Create test mentor
    const mentor = {
      _id: 'mentor_123',
      role: 'mentor'
    };
    
    // Create test user
    const user = {
      _id: 'user_456',
      role: 'user'
    };

    localStorage.setItem('testMentor', JSON.stringify(mentor));
    localStorage.setItem('testUser', JSON.stringify(user));
    addLog('Test users created: mentor_123 and user_456');
  };

  const loadTestUser = (type: 'mentor' | 'user') => {
    const testUser = type === 'mentor' 
      ? { _id: 'mentor_123', role: 'mentor' }
      : { _id: 'user_456', role: 'user' };
    
    localStorage.setItem('user', JSON.stringify(testUser));
    addLog(`Loaded test ${type}: ${testUser._id}`);
    window.location.reload();
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px', 
      width: '400px', 
      height: '500px',
      backgroundColor: '#1a1a1a',
      color: '#00ff00',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      fontFamily: 'monospace',
      overflow: 'hidden',
      border: '1px solid #333',
      zIndex: 1000
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Debug Panel</h4>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Status:</strong><br />
        MongoDB: <span style={{ color: mongoStatus === 'Connected' ? '#00ff00' : '#ff0000' }}>{mongoStatus}</span><br />
        Firebase: <span style={{ color: firebaseStatus === 'Connected' ? '#00ff00' : '#ff0000' }}>{firebaseStatus}</span><br />
        Socket.IO: <span style={{ color: socketStatus === 'Connected' ? '#00ff00' : '#ff0000' }}>{socketStatus}</span>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <button onClick={testMongoConnection} style={{ marginRight: '5px', fontSize: '10px' }}>
          Test MongoDB
        </button>
        <button onClick={testFirebaseWrite} style={{ marginRight: '5px', fontSize: '10px' }}>
          Test Firebase
        </button>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <button onClick={createTestUsers} style={{ marginRight: '5px', fontSize: '10px' }}>
          Create Test Users
        </button>
        <button onClick={() => loadTestUser('mentor')} style={{ marginRight: '5px', fontSize: '10px' }}>
          Load Mentor
        </button>
        <button onClick={() => loadTestUser('user')} style={{ fontSize: '10px' }}>
          Load User
        </button>
      </div>

      <div style={{ 
        height: '300px', 
        overflowY: 'auto', 
        backgroundColor: '#000', 
        padding: '5px',
        borderRadius: '3px'
      }}>
        <strong>Logs:</strong><br />
        {logs.map((log, index) => (
          <div key={index} style={{ marginBottom: '2px' }}>
            {log}
          </div>
        ))}
      </div>

      <button 
        onClick={() => setLogs([])}
        style={{ 
          marginTop: '5px', 
          fontSize: '10px', 
          backgroundColor: '#333', 
          color: '#fff',
          border: 'none',
          padding: '3px 6px',
          borderRadius: '3px'
        }}
      >
        Clear Logs
      </button>
    </div>
  );
};

export default DebugPanel;
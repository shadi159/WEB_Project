// utils/socketClient.ts - Fixed TypeScript errors
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';

class SocketClient {
  private socket: typeof Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async connect(): Promise<typeof Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    try {
      // First, initialize the Socket.IO server by making a POST request
      await fetch('/api/socket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Then connect to the Socket.IO server
      this.socket = io({
        path: '/api/socket',
        transports: ['polling', 'websocket'],
        timeout: 20000,
        forceNew: true,
      });

      this.setupEventHandlers();
      
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket not initialized'));
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket.once('connected', () => {
          clearTimeout(timeout);
          this.reconnectAttempts = 0;
          console.log('✅ Socket.IO connected successfully');
          resolve(this.socket!);
        });

        this.socket.once('connect_error', (error: any) => {
          clearTimeout(timeout);
          console.error('❌ Socket.IO connection error:', error);
          reject(error);
        });
      });

    } catch (error) {
      console.error('❌ Failed to initialize socket connection:', error);
      throw error;
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('disconnect', (reason: any) => {
      console.log('🔌 Socket disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('❌ Socket connection error:', error);
      this.handleReconnect();
    });

    this.socket.on('server-error', (error: any) => {
      console.error('❌ Server error:', error);
    });
  }

  private async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    setTimeout(() => {
      this.connect().catch(console.error);
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  register(userId: string, role: 'user' | 'mentor'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Registration timeout'));
      }, 5000);

      this.socket.once('registration-success', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket.once('server-error', (error: any) => {
        clearTimeout(timeout);
        reject(new Error(error.message || 'Registration failed'));
      });

      this.socket.emit('register', { userId, role });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): typeof Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const socketClient = new SocketClient();
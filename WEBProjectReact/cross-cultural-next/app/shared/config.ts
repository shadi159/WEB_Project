export const API = process.env.NEXT_PUBLIC_API || '';
export const P2P_SIGNALING_URL = process.env.NEXT_PUBLIC_P2P_SIGNALING_URL || 'ws://localhost:8080';
export const P2P_CONFIG = {
  MAX_PARTICIPANTS: 4,
  RTC_CONFIGURATION: {
    iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }]
  }
};
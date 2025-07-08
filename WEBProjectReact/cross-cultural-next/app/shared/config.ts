export const API = process.env.NEXT_PUBLIC_API || '';
export const P2P_SIGNALING_URL = "wss://0.peerjs.com/peerjs/0.6.1/"; // PeerJS public server
export const P2P_CONFIG = {
  MAX_PARTICIPANTS: 4,
  RTC_CONFIGURATION: {
    iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }]
  }
};
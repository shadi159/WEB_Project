import DenoP2PSignaling, { SignalMessage } from './DenoP2PSignaling';
import { P2P_CONFIG } from '../../shared/config';

export default class WebRTCManager extends EventTarget {
  private connections = new Map<string, RTCPeerConnection>();
  private localStream: MediaStream | null = null;
  private signaling: DenoP2PSignaling;

  constructor(signaling: DenoP2PSignaling) {
    super();
    this.signaling = signaling;
    this.signaling.addEventListener('message', (e: any) => {
      const { sender, data } = e.detail;
      if (sender) this.handleSignal(sender, data);
    });
  }

  async startLocalStream(constraints: MediaStreamConstraints = { audio: true, video: true }) {
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    this.dispatchEvent(new CustomEvent('localStream', { detail: this.localStream }));
    return this.localStream;
  }

  private async createConnection(peerId: string) {
    const pc = new RTCPeerConnection(P2P_CONFIG.RTC_CONFIGURATION);
    this.connections.set(peerId, pc);
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => pc.addTrack(t, this.localStream!));
    }
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.signaling.send({ to: peerId, type: 'candidate', candidate: e.candidate });
      }
    };
    pc.ontrack = (e) => {
      this.dispatchEvent(new CustomEvent('remoteStream', { detail: { peerId, stream: e.streams[0] } }));
    };
    return pc;
  }

  async callPeer(peerId: string) {
    const pc = await this.createConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.signaling.send({ to: peerId, type: 'offer', sdp: pc.localDescription });
  }

  async handleSignal(from: string, data: SignalMessage) {
    let pc = this.connections.get(from);
    if (!pc) {
      pc = await this.createConnection(from);
    }
    if (data.type === 'offer') {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.signaling.send({ to: from, type: 'answer', sdp: pc.localDescription });
    } else if (data.type === 'answer') {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    } else if (data.type === 'candidate' && data.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  }

  close() {
    this.connections.forEach((pc) => pc.close());
    this.connections.clear();
  }
}
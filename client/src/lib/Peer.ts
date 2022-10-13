import { Options, PeerOnEvent, Signal, SignalType } from "../types";

export class Peer {
  private initiator: boolean;
  private peer: RTCPeerConnection;
  private event: PeerOnEvent = {
    onChunk: () => {},
    onConnection: Function,
    onSignal: () => {},
  };
  private channel: RTCDataChannel;
  private closed: boolean;
  private candidates: RTCIceCandidate[] = [];

  constructor({ initiator }: Options) {
    this.initiator = initiator;
    window.addEventListener("unload", () => this.emit("onClose"));
    this.peerConnect();
  }

  private peerConnect() {
    this.peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    this.initiator
      ? this.createChannel()
      : (this.peer.ondatachannel = (e) => this.channelOpened(e.channel));

    this.onIceCandidate();
  }

  private createChannel() {
    const channel = this.peer.createDataChannel("dataChannel");
    channel.onopen = () => this.channelOpened(channel);
    this.offerSignal();
  }

  private channelOpened(channel: RTCDataChannel) {
    channel.onmessage = (e) => this.onMessage(e.data);
    channel.onclose = () =>
      !this.closed && ((this.closed = true), this.event["onClose"]());
    channel.binaryType = "arraybuffer";
    this.channel = channel;
    this.event.onConnection();
  }

  private onMessage(message: string | ArrayBuffer) {
    if (typeof message !== "string") {
      this.event.onChunk(message);
      return;
    }

    const { msg, data } = JSON.parse(message);
    if (msg === "onClose") this.closed = true;
    this.event[msg]?.(data);
  }

  private addLocalDescription(description: RTCSessionDescriptionInit) {
    this.peer
      .setLocalDescription(description)
      .then(() => this.event.onSignal({ sdp: description }));
  }

  private offerSignal() {
    this.peer.createOffer().then((offer) => this.addLocalDescription(offer));
  }

  private answerSignal() {
    this.peer.createAnswer().then((answer) => this.addLocalDescription(answer));
  }

  private dequeueCandidate() {
    if (this.candidates.length < 1) return;
    const candidate = this.candidates.shift();
    this.peer.addIceCandidate(new RTCIceCandidate(candidate));
    this.dequeueCandidate();
  }

  private onIceCandidate() {
    this.peer.onicecandidate = (e) => {
      if (e.candidate) {
        this.event.onSignal({ candidate: e.candidate });
      }
    };
  }

  private addIceCandidate(candidate: RTCIceCandidate) {
    if (!this.peer.currentRemoteDescription) {
      this.candidates.push(candidate);
      return;
    }
    this.peer.addIceCandidate(new RTCIceCandidate(candidate));
  }

  private addSdp(sdp: RTCSessionDescriptionInit) {
    this.peer.setRemoteDescription(new RTCSessionDescription(sdp)).then(() => {
      if (!this.initiator) this.answerSignal();
      this.dequeueCandidate();
    });
  }

  onSignal(fn: Signal) {
    this.event.onSignal = fn;
  }

  setSignal(signal: SignalType) {
    if (signal.sdp) this.addSdp(signal.sdp);
    if (signal.candidate) this.addIceCandidate(signal.candidate);
  }

  on<Type>(event: string, fnCallBack: (data: Type) => void) {
    this.event[event] = fnCallBack;
  }

  emit<Type>(msg: string, data?: Type) {
    if (this.isConnectionStable())
      this.channel.send(JSON.stringify({ msg, data }));
  }

  sendChunk(chunk: ArrayBuffer) {
    if (this.isConnectionStable()) this.channel.send(chunk);
  }

  onChunk(fnCallBack: (data: ArrayBuffer) => void) {
    this.event.onChunk = fnCallBack;
  }

  onConnection(fnCallBack: () => void) {
    this.event.onConnection = fnCallBack;
  }

  isConnectionStable() {
    return this.channel && this.channel.readyState == "open" && !this.closed;
  }

  onClose(fn: () => void) {
    this.event["onClose"] = fn;
  }

  close() {
    if (this.peer) this.peer.close();
    this.peer = this.event = this.channel = null as any;
  }
}

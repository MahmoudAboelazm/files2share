import { Options, OnEvent, Signal, SignalType } from "../types";

export class Peer {
  private options: Options;
  private peer: RTCPeerConnection;
  private onEvent: OnEvent = { onChunk: Function, onConnection: Function };
  private channel: RTCDataChannel;
  private signalCreated: boolean;

  constructor({ initiator }: Options) {
    this.options = { initiator };
    this.peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    initiator
      ? this.createChannel()
      : (this.peer.ondatachannel = (e) => this.channelOpened(e.channel));
  }

  private createChannel() {
    const channel = this.peer.createDataChannel("dataChannel");
    channel.onopen = () => this.channelOpened(channel);
  }

  private channelOpened(channel: RTCDataChannel) {
    channel.onmessage = (e) => this.onMessage(e.data);
    channel.onclose = () => this.onEvent["onClose"]();
    channel.binaryType = "arraybuffer";
    this.channel = channel;
    this.onEvent["onConnection"]();
  }

  private onMessage(message: string | ArrayBuffer) {
    if (typeof message !== "string") {
      this.onEvent["onChunk"](message);
      return;
    }

    const { msg, data } = JSON.parse(message);
    this.onEvent[msg]?.(data);
  }

  private offerSignal() {
    this.peer
      .createOffer()
      .then((offer) => this.peer.setLocalDescription(offer));
    this.signalCreated = true;
  }

  private answerSignal() {
    this.peer
      .createAnswer()
      .then((answer) => this.peer.setLocalDescription(answer));
    this.signalCreated = true;
  }

  private onIceCandidate(signalCallBack: Signal) {
    this.peer.onicecandidate = (e) => {
      if (e.candidate && !this.isConnectionStable()) {
        signalCallBack({
          sdp: this.peer.localDescription,
          candidate: e.candidate,
        });
      }
    };
  }

  onSignal(fn: Signal) {
    this.onIceCandidate(fn);
    if (!this.signalCreated)
      this.options.initiator ? this.offerSignal() : this.answerSignal();
  }

  async setSignal(signal: SignalType) {
    try {
      if (
        signal.sdp &&
        this.peer.connectionState !== "connected" &&
        this.peer.iceConnectionState !== "connected"
      )
        this.peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));

      if (signal.candidate)
        this.peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
    } catch (error) {
      console.log("setSignal Error: ", error.message);
    }
  }

  on<Type>(event: string, fnCallBack: (data: Type) => void) {
    this.onEvent[event] = fnCallBack;
  }

  emit<Type>(msg: string, data?: Type) {
    if (this.isConnectionStable())
      this.channel.send(JSON.stringify({ msg, data }));
  }

  sendChunk(chunk: ArrayBuffer) {
    if (this.isConnectionStable()) this.channel.send(chunk);
  }

  onChunk(fnCallBack: (data: Buffer) => void) {
    this.onEvent["onChunk"] = fnCallBack;
  }

  onConnection(fnCallBack: () => void) {
    this.onEvent["onConnection"] = fnCallBack;
  }

  isConnectionStable() {
    return this.channel && this.channel.readyState == "open";
  }

  onClose(fn: () => void) {
    this.onEvent["onClose"] = fn;
  }

  close() {
    if (this.peer) this.peer.close();
    this.peer = this.onEvent = this.channel = null as any;
  }
}

import { Options, OnEvent, Signal, SignalType } from "../types";

export class Peer {
  private options: Options;
  private peer: RTCPeerConnection;
  private onEvent: OnEvent = { onChunk: Function, onConnection: Function };
  private channel: RTCDataChannel;

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
    channel.binaryType = "arraybuffer";
    channel.onopen = () => this.channelOpened(channel);
  }

  private channelOpened(channel: RTCDataChannel) {
    channel.onmessage = (e) => this.onMessage(e.data);
    this.channel = channel;
    this.onEvent["onConnection"]();
  }

  private onMessage(message: any) {
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
  }

  private answerSignal() {
    this.peer
      .createAnswer()
      .then((answer) => this.peer.setLocalDescription(answer));
  }

  private onIceCandidate(signalCallBack: Signal) {
    this.peer.onicecandidate = (e) => {
      if (e.candidate) {
        signalCallBack({
          sdp: this.peer.localDescription,
          candidate: e.candidate,
        });
      }
    };
  }

  onSignal(fn: Signal) {
    this.onIceCandidate(fn);
    this.options.initiator ? this.offerSignal() : this.answerSignal();
  }

  async setSignal(signal: SignalType) {
    try {
      if (signal.sdp)
        this.peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      if (signal.candidate)
        this.peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
    } catch (error: any) {
      console.log("setSignal Error: ", error.message);
    }
  }

  on(event: string, fnCallBack: (data: any) => void) {
    this.onEvent[event] = fnCallBack;
  }

  emit(msg: string, data?: any) {
    if (this.channel) this.channel.send(JSON.stringify({ msg, data }));
  }

  sendChunk(chunk: ArrayBuffer) {
    if (this.channel) this.channel.send(chunk);
  }

  onChunk(fnCallBack: (data: Buffer) => void) {
    this.onEvent["onChunk"] = fnCallBack;
  }

  onConnection(fnCallBack: () => void) {
    this.onEvent["onConnection"] = fnCallBack;
  }

  close() {
    this.peer.close();
    this.peer = this.onEvent = this.channel = null as any;
  }
}

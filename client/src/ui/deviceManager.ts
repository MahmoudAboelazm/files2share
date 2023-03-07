import { Chunker } from "../lib/Chunker";
import { Digester } from "../lib/Digester";
import { Peer } from "../lib/Peer";
import { Observable } from "../lib/Observable";
import {
  Device,
  FileReceived,
  DeviceManagerOptions,
  FileMeta,
  MyDeviceInfo,
  SignalType,
} from "../types";
import { DeviceUI } from "./DeviceUI";

export class DeviceManager {
  private deviceUI: DeviceUI;
  private peer: Peer;
  private files: File[] = [];
  private checkDuplicates: Map<string, boolean>;
  private id: string;
  private digister: Digester;
  private chunker: Chunker;
  private busy: boolean;
  private busyObserver: Observable<boolean>;
  private transferring: boolean;
  private myDeviceInfo: MyDeviceInfo;
  private device: Device;
  private connectionNotify: () => void;
  constructor({
    initiator,
    duplicates,
    device,
    id,
    busy,
    myDeviceInfo,
  }: DeviceManagerOptions) {
    this.checkDuplicates = duplicates.value;
    this.busy = busy.value;
    this.busyObserver = busy;
    this.id = id;
    duplicates.subscribe((files) => (this.checkDuplicates = files));
    busy.subscribe((busy) => (this.busy = busy));
    this.deviceInit(device);
    this.peerInit(initiator);
    this.myDeviceInfo = myDeviceInfo;
    this.device = device;
  }

  private peerInit(initiator: boolean) {
    this.peer = new Peer({ initiator });
    this.listenToPeerEvents();
  }

  private listenToPeerEvents() {
    this.peer.onConnection(() => {
      this.device.imgURL = this.myDeviceInfo.imgURL;
      this.device.name = this.myDeviceInfo.randomName;
      this.peer.emit<Device>("deviceInfo", this.device);
      if (this.connectionNotify) this.connectionNotify();
    });
    this.peer.on<Device>("deviceInfo", (deviceInfo) =>
      this.deviceInfo(deviceInfo),
    );
    this.peer.onClose(() => this.destroy());
    this.peer.onChunk((chunk) => this.chunkReceived(chunk));
    this.peer.on<FileMeta>("file-head", (meta) => this.fileHead(meta));
    this.peer.on("partition", () => this.peer.emit("partition-received"));
    this.peer.on("partition-received", () => this.chunker.nextPartition());
    this.peer.on("transfer-completed", () => this.transferCompleted());
  }

  private deviceInfo(device: Device) {
    this.device = device;
    this.deviceInit(this.device);
    this.deviceUI.show();
  }

  private deviceInit(device: Device) {
    const observer: Observable<File[]> = new Observable();
    observer.subscribe((files) => this.setFiles(files));
    this.deviceUI = new DeviceUI(observer, device);
  }

  private setFiles(files: File[]) {
    this.files = files;
    if (this.busy) return;
    this.busyObserver.next(true);
    this.dequeueFile();
  }

  private dequeueFile() {
    if (this.files.length < 1) return this.busyObserver.next(false);
    const file = this.files.shift()!;
    const meta = {
      name: file.name,
      size: file.size,
      mime: file.type,
    };
    const chunker = new Chunker(file);
    this.deviceUI.currentTransfer(meta);
    this.deviceUI.statusSending();
    chunker.onChunk((chunk) => {
      this.peer.sendChunk(chunk);
      this.deviceUI.progress(this.chunker.progress);
    });
    chunker.onPartition(() => this.peer.emit("partition"));
    this.chunker = chunker;
    this.peer.emit<FileMeta>("file-head", meta);
    this.transferring = true;
  }

  private transferCompleted() {
    this.transferring = false;
    this.deviceUI.transferCompleted();
    this.dequeueFile();
  }

  private fileReceived(file?: FileReceived) {
    this.busyObserver.next(false);
    this.deviceUI.transferCompleted();
    if (file) this.deviceUI.downloadFile(file);
    this.peer.emit("transfer-completed");
  }

  private chunkReceived(chunk: ArrayBuffer) {
    this.digister.unchunk(chunk);
    const progress = this.digister.progress;
    this.deviceUI.progress(progress);
  }

  private fileHead(meta: FileMeta) {
    /** Check if there is any duplicates before continue receiving the file */
    if (this.checkDuplicates && this.checkDuplicates.get(meta.name))
      return this.peer.emit("transfer-completed");

    if (this.busy) return;
    this.busyObserver.next(true);
    this.deviceUI.statusReceiving();
    this.digister = new Digester(meta);
    this.digister.onFileReceived((file) => this.fileReceived(file));
    this.deviceUI.currentTransfer(meta);
    this.peer.emit("partition-received");
    this.transferring = true;
  }

  //////////////// Connect peers ///////////////////

  onPeerConnection(fn: () => void) {
    this.connectionNotify = fn;
  }

  setSignal(signal: SignalType) {
    this.peer.setSignal(signal);
  }

  onSignal(send: Function) {
    this.peer.onSignal((signal) => send({ signal, id: this.id }));
  }

  destroy() {
    if (this.peer.isConnectionStable()) return; // in case the server lost connection for any reason but peer still exist
    if (this.transferring) {
      this.busyObserver.next(false);
      this.deviceUI.transferCompleted(); // TODO: show error
    }
    this.peer.close();
    this.deviceUI.remove();
  }
}

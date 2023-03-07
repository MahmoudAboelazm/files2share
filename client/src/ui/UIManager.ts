import { DeviceManager } from "./deviceManager";
import { Observable } from "../lib/Observable";
import ServerConnection from "../lib/ServerConnection";
import { addBackground, getTheme } from "./theme";
import {
  CreateDevice,
  Device,
  Devices,
  IdSignalType,
  MyDeviceInfo,
  ServerDevice,
  ServerSignal,
} from "../types";
import { UISettings } from "./UISettings";
import { QRConnection } from "../lib/QRConnection";

export default class UIManager {
  private devices: Map<string, DeviceManager>;
  private server: ServerConnection;
  private preventDuplicates: Observable<Map<string, boolean>>;
  private myDeviceDom: Element;
  private deviceBusy: Observable<boolean>;
  private settingsObserver: Observable<MyDeviceInfo>;
  private QR: QRConnection;

  constructor() {
    this.devices = new Map();
    this.myDeviceDom = document.getElementsByClassName("my-device")[0];
    this.preventDuplicates = new Observable();
    this.deviceBusy = new Observable();
  }

  makeQRConnection() {
    const QR = new QRConnection();
    this.QR = QR;
    QR.init();
    QR.onSignal((signal) => this.peerSignal(signal));
    this.myDevice(QR.qrDevice);

    QR.answerPeer(() => {
      this.devices.delete(QR.id);
      this.createDevice({
        initiator: false,
        id: QR.id,
        device: QR.qrDevice,
      });
    });
    this.createDevice({
      initiator: true,
      id: QR.id,
      device: QR.qrDevice,
    });
  }

  serverConnect() {
    const url = process.env.SERVER_URL as string;
    const server = new ServerConnection(url);
    server.on("network-devices", (data: Devices) => this.networkDevices(data));
    server.on("new-device", (data: ServerDevice) => this.newDevice(data));
    server.on("peer-signal", (data: ServerSignal) => this.peerSignal(data));
    server.on("device-left", ({ id }: { id: string }) => this.deviceLeft(id));
    server.on("my-device", ({ device }: { device: Device }) =>
      this.myDevice(device),
    );
    this.server = server;
  }

  init() {
    getTheme();
    addBackground();
    this.preventDuplicateOnChange();
    this.serviceWorker();
  }

  private serviceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then(() => console.log("Service Worker registered"));
    }
  }

  private preventDuplicateOnChange() {
    const input = this.myDeviceDom.children[3] as HTMLInputElement;
    const label = this.myDeviceDom.children[4];
    label.addEventListener("keypress", () => input.click());
    const selectedLength = this.myDeviceDom.children[5];
    input.addEventListener("change", (e) => {
      const input = e.target as HTMLInputElement;
      const files = input.files;
      if (files) {
        const filesMap = new Map<string, boolean>();
        for (let i = 0; i < files.length; i++) {
          filesMap.set(files[i].name, true);
        }
        this.preventDuplicates.next(filesMap);
        selectedLength.innerHTML = `${files.length || 0} Seletcted File`;
      }
      input.value = null as any;
    });
  }

  private myDevice(device: Device) {
    const img = this.myDeviceDom.children[0].children[0] as HTMLImageElement;
    const name = this.myDeviceDom.children[2] as HTMLElement;
    const settingsObserver: Observable<MyDeviceInfo> = new Observable();
    settingsObserver.subscribe(({ randomName, imgURL }) => {
      (img.src = imgURL),
        (name.innerHTML = `${randomName}<h6>${device.vendor || device.os} | ${
          device.browser
        }</h6>`);
    });
    const uiSettings = new UISettings(settingsObserver);
    uiSettings.init();

    this.settingsObserver = settingsObserver;
  }

  //// network devices connection ////////////////////////////////////////////////
  private networkDevices({ devices }: Devices) {
    devices.forEach(({ id, device }) => {
      this.createDevice({ id, device, initiator: false });
    });
  }

  private newDevice({ device, id }: ServerDevice) {
    this.createDevice({ id, device, initiator: true });
  }

  private createDevice({ initiator, id, device }: CreateDevice) {
    const config = {
      initiator,
      device,
      id,
      duplicates: this.preventDuplicates,
      busy: this.deviceBusy,
      myDeviceInfo: this.settingsObserver.value,
    };
    const deviceManager = new DeviceManager(config);

    deviceManager.onSignal((signal: IdSignalType) => {
      this.server?.send<IdSignalType>(signal);
      this.QR?.peerSignal(signal);
    });

    deviceManager.onPeerConnection(() => this.QR?.peerConnected());
    this.devices.set(id, deviceManager);
  }

  private peerSignal({ peer }: ServerSignal) {
    this.devices.get(peer.id)?.setSignal(peer.signal);
  }

  private deviceLeft(id: string) {
    this.devices.get(id)?.destroy();
    this.devices.delete(id);
  }
}

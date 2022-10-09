import { DeviceManager } from "./deviceManager";
import { Observable } from "../lib/Observable";
import ServerConnection from "../lib/ServerConnection";
import { addBackground, getTheme } from "./theme";
import {
  Device,
  Devices,
  MyDeviceInfo,
  ServerDevice,
  ServerSignal,
  SignalType,
} from "../types";
import { UISettings } from "./UISettings";

export default class UIManager {
  private devices: Map<string, DeviceManager>;
  private server: ServerConnection;
  private preventDuplicates: Observable<Map<string, boolean>>;
  private myDeviceDom: Element;
  private deviceBusy: Observable<boolean>;
  private settingsObserver: Observable<MyDeviceInfo>;

  constructor() {
    this.devices = new Map();
    this.myDeviceDom = document.getElementsByClassName("my-device")[0];
    this.preventDuplicates = new Observable();
    this.deviceBusy = new Observable();
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
    const input = this.myDeviceDom.children[3];
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
    settingsObserver.subscribe(({ randomName, imgURL }: MyDeviceInfo) => {
      (img.src = imgURL), (name.innerText = randomName);
    });
    const uiSettings = new UISettings(settingsObserver);
    uiSettings.init();

    this.settingsObserver = settingsObserver;
    device;
  }

  //// network devices connection ////////////////////////////////////////////////
  private networkDevices({ devices }: Devices) {
    devices.forEach(({ id, device }) => {
      const deviceManager = new DeviceManager({
        initiator: false,
        device,
        id,
        duplicates: this.preventDuplicates,
        busy: this.deviceBusy,
        myDeviceInfo: this.settingsObserver.value,
      });
      this.devices.set(id, deviceManager);
    });
  }

  private newDevice({ device, id }: ServerDevice) {
    const config = {
      initiator: true,
      device,
      id,
      duplicates: this.preventDuplicates,
      busy: this.deviceBusy,
      myDeviceInfo: this.settingsObserver.value,
    };
    const deviceManager = new DeviceManager(config);
    deviceManager.createSignal({
      send: (signal: SignalType) => this.server.send<SignalType>(signal),
    });
    this.devices.set(id, deviceManager);
  }

  private peerSignal({ peer }: ServerSignal) {
    this.devices.get(peer.id)?.updateSignal({
      send: (signal: SignalType) => this.server.send<SignalType>(signal),
      signal: peer.signal,
    });
  }

  private deviceLeft(id: string) {
    this.devices.get(id)?.destroy();
    this.devices.delete(id);
  }
}

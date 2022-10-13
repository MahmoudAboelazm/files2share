import { Observable } from "./lib/Observable";

export interface OnEvent {
  [k: string]: Function;
}

export interface PeerOnEvent {
  onSignal: Signal;
  onConnection: Function;
  onChunk: (data: ArrayBuffer) => void;
  [k: string]: Function;
}

export type Signal = (signal: SignalType) => void;

export interface SignalType {
  sdp?: RTCSessionDescriptionInit | null;
  candidate?: RTCIceCandidate;
}

export interface CreateDevice {
  id: string;
  device: Device;
  initiator: boolean;
}

export interface Options {
  initiator: boolean;
}

export interface Device {
  name: string;
  model: string | undefined;
  os: string | undefined;
  browser: string | undefined;
  type: string | undefined;
  vendor: string | undefined;
  imgURL: string;
}
export interface ServerDevice {
  id: string;
  device: Device;
}
export interface Devices {
  devices: ServerDevice[];
}

export interface ServerSignal {
  peer: {
    id: string;
    signal: SignalType;
  };
}

export interface FileReceived {
  name: string;
  mime: string;
  size: number;
  blob: Blob;
}
export interface DeviceManagerOptions {
  initiator: boolean;
  device: Device;
  id: string;
  duplicates: Observable<Map<string, boolean>>;
  busy: Observable<boolean>;
  myDeviceInfo: MyDeviceInfo;
}
export interface MyDeviceInfo {
  imgURL: string;
  randomName: string;
}

export interface FileMeta {
  size: number;
  mime: string;
  name: string;
}

export interface UseLocalStorage {
  name: string;
  value?: string;
}

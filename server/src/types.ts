import { Request, Response } from "express";

export interface Device {
  name: string;
  model: string | undefined;
  os: string | undefined;
  browser: string | undefined;
  type: string | undefined;
  vendor: string | undefined;
  imgURL: string;
}

export interface PeerSignal {
  id: string;
  signal: any;
}

export interface Notifiy {
  msg: string;
  [k: string]: any;
}

export interface ConnectedDevice {
  id: string;
  device: Device;
  req: Request;
  res: Response;
}
export interface Network {
  connectedDevices: ConnectedDevice[];
}

import { Device, IdSignalType, ServerSignal, SignalType } from "../types";
import QRCode from "qrcode";
import { randomId } from "./ServerConnection";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Html5QrcodeResult } from "html5-qrcode/esm/core";
import { detect } from "detect-browser";

export class QRConnection {
  private signals: SignalType[] = [];
  private signalEvent: (signal: ServerSignal) => void;
  private html5QrcodeScanner: Html5QrcodeScanner;
  private generateAnswerPeer: () => void;
  qrDevice: Device;
  id = randomId();
  constructor() {}

  init = () => {
    this.getMyDevice();
    this.startReadQRCode();
  };

  peerSignal = ({ signal }: IdSignalType) => {
    this.signals.push(signal);
    const { length } = this.signals;
    if (length > 1 && length < 5) this.generateQRCode();
  };

  onSignal = (fn: (signal: ServerSignal) => void) => {
    this.signalEvent = fn;
  };

  answerPeer = (fn: () => void) => {
    this.generateAnswerPeer = fn;
  };

  peerConnected = () => {
    const qrUI = document.getElementsByClassName("qr")[0] as HTMLDivElement;
    qrUI.classList.add("hide");
  };

  private qrboxFunction = (
    viewfinderWidth: number,
    viewfinderHeight: number,
  ) => {
    let minEdgeSizeThreshold = 250,
      edgeSizePercentage = 0.75,
      minEdgeSize =
        viewfinderWidth > viewfinderHeight ? viewfinderHeight : viewfinderWidth,
      qrboxEdgeSize = Math.floor(minEdgeSize * edgeSizePercentage);

    if (qrboxEdgeSize < minEdgeSizeThreshold) {
      if (minEdgeSize < minEdgeSizeThreshold) {
        return { width: minEdgeSize, height: minEdgeSize };
      } else {
        return {
          width: minEdgeSizeThreshold,
          height: minEdgeSizeThreshold,
        };
      }
    }
    return { width: qrboxEdgeSize, height: qrboxEdgeSize };
  };

  private checkOfferPeer = (data: SignalType[]) => {
    if (data[0].sdp?.type == "offer") {
      this.signals = [];
      this.generateAnswerPeer();
    }
  };

  private startReadQRCode = () => {
    this.html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-video",
      {
        fps: 60,
        qrbox: this.qrboxFunction,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
      },
      undefined,
    );
    this.html5QrcodeScanner.render(this.onScanSuccess, () => {});
  };

  private peerSignalsInit = (signals: SignalType[]) => {
    signals.forEach((s) =>
      this.signalEvent({ peer: { id: this.id, signal: s } }),
    );
  };

  private generateQRCode = () => {
    const data = JSON.stringify(this.signals);
    QRCode.toDataURL(data).then((url) => {
      const img = document.getElementById("qr-img") as HTMLImageElement;
      img.src = url;
    });
  };

  private onScanSuccess = (_: string, { decodedText }: Html5QrcodeResult) => {
    const data = JSON.parse(decodedText) as SignalType[];
    this.checkOfferPeer(data);
    this.peerSignalsInit(data);
    this.html5QrcodeScanner.clear();
  };

  private getMyDevice = () => {
    const browser = detect();
    if (browser) {
      const { name, os, type } = browser;
      this.qrDevice = {
        name,
        type,
        os: os as string,
        browser: name,
        imgURL: "",
        model: "",
        vendor: "",
      };
    }
  };
}

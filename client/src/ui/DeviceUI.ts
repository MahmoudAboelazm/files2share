import { Observable } from "../lib/Observable";
import { Device, FileMeta, FileReceived } from "../types";

//////////////// Select some elements ///////////////
const download = document.getElementById("download") as HTMLAnchorElement;
const backgroundAnimation = document.getElementsByClassName(
  "scaner-container",
)[0] as HTMLDivElement;
const otherPeersContainer = document.getElementsByClassName("other-devices")[0];
const transferContainer = document.getElementsByClassName("transfering")[0];
const transferFileName = transferContainer.children[0] as HTMLParagraphElement;
const transferDevice = transferContainer.children[1];
const transferProgress = transferContainer.children[2]
  .children[0] as HTMLSpanElement;
const transferText = transferContainer.children[2]
  .children[1] as HTMLSpanElement;

const transferDeviceImg = transferDevice.children[0]
  .children[0] as HTMLImageElement;
const transferDeviceName = transferDevice.children[1]
  .children[1] as HTMLHeadingElement;

const transferDeviceStatus = transferDevice.children[1]
  .children[0] as HTMLHeadingElement;

////////////////////////////////////////////////////
export class DeviceUI {
  filesObserver: Observable<File[]>;
  container: HTMLElement;
  device: Device;
  constructor(observer: Observable<File[]>, device: Device) {
    this.filesObserver = observer;
    this.device = device;
  }

  progress(progress: number) {
    const fixed = progress.toFixed(1);
    transferProgress.style.width = `${fixed}%`;
    transferText.innerText = `${fixed}%`;
  }

  currentTransfer(meta: FileMeta) {
    transferContainer.classList.remove("hide");
    transferFileName.innerText = meta.name;
    transferDeviceImg.src = this.device.imgURL;
    transferDeviceName.innerText = this.device.name;
  }

  async downloadFile(file: FileReceived) {
    const url = URL.createObjectURL(file.blob);
    download.href = url;
    download.download = file.name;
    download.target = "_blank";
    download.click();
    URL.revokeObjectURL(url);
  }

  transferCompleted() {
    transferProgress.style.width = "100%";
    transferContainer.classList.add("hide");
  }

  statusSending() {
    transferDeviceStatus.innerText = "Sending to";
    this.backgroundAnimationPause();
  }
  statusReceiving() {
    transferDeviceStatus.innerText = "Receiving from";
    this.backgroundAnimationPause();
  }

  backgroundAnimationPause() {
    backgroundAnimation.style.animationPlayState = "paused";
  }

  backgroundAnimationContinue() {
    backgroundAnimation.style.animationPlayState = "running";
  }

  show() {
    const div = document.createElement("div");
    div.classList.add("peer-container");
    div.innerHTML = `
    <label tabindex="0" title="Send files to ${this.device.name}">
      <div>
        <img
            src=${this.device.imgURL} />
      </div>
    <input type="file" multiple="multiple" hidden />
  </label>
  <h4>${this.device.name}</h4>
  <h6>${this.device.vendor || this.device.os} | ${this.device.browser}</h6>
  `;
    otherPeersContainer.append(div);
    const inputLabel = div.children[0] as HTMLLabelElement;
    inputLabel.addEventListener("keypress", () => inputLabel.click());
    inputLabel.addEventListener("change", (e) => this.onSelectFiles(e));
    this.container = div;
  }

  onSelectFiles(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = input.files;

    if (files) {
      const filesQueue = [];
      for (let i = 0; i < files.length; i++) {
        filesQueue.push(files[i]);
      }
      this.filesObserver.next(filesQueue);
    }
    input.value = null as any;
  }

  remove() {
    this.container?.remove();
  }
}

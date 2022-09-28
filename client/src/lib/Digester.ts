import { FileMeta, FileReceived } from "../types";
/**
 * This class from snapdrop with some modifications
 */
export class Digester {
  private buffer: ArrayBuffer[];
  private bytesReceived: number;
  private size: number;
  private mime: string;
  private name: string;
  progress: number = 0;
  private onFileEvent: (file: FileReceived) => any;

  constructor(meta: FileMeta) {
    this.buffer = [];
    this.bytesReceived = 0;
    this.size = meta.size;
    this.mime = meta.mime || "application/octet-stream";
    this.name = meta.name;
  }

  unchunk(chunk: ArrayBuffer) {
    this.buffer.push(chunk);
    this.bytesReceived += chunk.byteLength;

    this.progress = (this.bytesReceived / this.size) * 100;
    if (isNaN(this.progress)) this.progress = 1;

    if (this.bytesReceived < this.size) return;
    // we are done
    let blob = new Blob(this.buffer, { type: this.mime });
    const file = {
      name: this.name,
      mime: this.mime,
      size: this.size,
      blob: blob,
    };
    this.onFileEvent(file);
  }

  onFileReceived(fn: (file: FileReceived) => any) {
    this.onFileEvent = fn;
  }
}

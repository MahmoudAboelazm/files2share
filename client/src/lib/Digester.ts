import streamSaver from "streamsaver";
import { FileMeta, FileReceived } from "../types";
/**
 * This class from snapdrop with some modifications
 */
export class Digester {
  private buffer: { push: (chunk: ArrayBuffer) => void; close: () => void };
  private bytesReceived: number;
  private size: number;
  private mime: string;
  private name: string;
  progress: number = 0;
  private onFileEvent: (file?: FileReceived) => any;
  private writer: WritableStreamDefaultWriter<any>;

  constructor(meta: FileMeta) {
    this.bytesReceived = 0;
    this.size = meta.size;
    this.mime = meta.mime || "application/octet-stream";
    this.name = meta.name;
    const fileStream = streamSaver.createWriteStream(meta.name, {
      size: meta.size,
    });
    this.writer = fileStream.getWriter();
    const isBigFile = meta.size > 1024 * 1024 * 50; // Max file size to use normal digester is 50 MB. Otherwise, act as a server while transferring!
    this.buffer = this.bufferInit(isBigFile);
  }

  private bufferInit(isBigFile: boolean) {
    let buffer;
    if (isBigFile) {
      buffer = {
        push: (chunk: ArrayBuffer) => this.writer.write(new Uint8Array(chunk)),
        close: () => {
          this.writer.close();
          this.onFileEvent();
        },
      };
    } else {
      const arr: ArrayBuffer[] = [];
      buffer = {
        push: (chunk: ArrayBuffer) => arr.push(chunk),
        close: () => {
          let blob = new Blob(arr, { type: this.mime });
          const file = {
            name: this.name,
            mime: this.mime,
            size: this.size,
            blob: blob,
          };
          this.onFileEvent(file);
        },
      };
    }

    return buffer;
  }

  unchunk(chunk: ArrayBuffer) {
    this.buffer.push(chunk);
    this.bytesReceived += chunk.byteLength;

    this.progress = (this.bytesReceived / this.size) * 100;
    if (isNaN(this.progress)) this.progress = 1;

    if (this.bytesReceived < this.size) return;
    this.buffer.close();
  }

  onFileReceived(fn: (file?: FileReceived) => void) {
    this.onFileEvent = fn;
  }
}

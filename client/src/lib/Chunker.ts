/**
 * This class from snapdrop with some modifications
 */
export class Chunker {
  private maxPartitionSize: number;
  private chunkSize: number;
  private partitionSize: number;
  private offset: number;
  private reader: FileReader;
  private file: File;
  private onChunkEvent: (chunk: ArrayBuffer) => any;
  private onPartitionEvent: () => any;
  progress = 0;
  private bytesSent = 0;

  constructor(file: File) {
    this.chunkSize = 64000; // 64 KB
    this.maxPartitionSize = 1e6; // 1 MB
    this.offset = 0;
    this.partitionSize = 0;
    this.file = file;
    this.reader = new FileReader();
    this.reader.addEventListener("load", (e) =>
      this.onChunkRead(e.target?.result as ArrayBuffer),
    );
  }

  nextPartition() {
    if (this.isFileEnd()) return;
    this.partitionSize = 0;
    this.readChunk();
  }

  /**
   *  I was trying to send it to multiple peers at the same time but it requires more work &
   *  it could be a headache for the network but still could do in the future. :D
   */
  onChunk(fn: (chunk: ArrayBuffer) => any) {
    this.onChunkEvent = fn;
  }

  onPartition(fn: () => any) {
    this.onPartitionEvent = fn;
  }

  private readChunk() {
    const chunk = this.file.slice(this.offset, this.offset + this.chunkSize);
    this.reader.readAsArrayBuffer(chunk);
  }

  private onChunkRead(chunk: ArrayBuffer) {
    this.offset += chunk.byteLength;
    this.partitionSize += chunk.byteLength;
    this.bytesSent += chunk.byteLength;
    this.progress = (this.bytesSent / this.file.size) * 100;

    this.onChunkEvent(chunk);
    if (this.isFileEnd()) return;
    if (this.isPartitionEnd()) {
      this.onPartitionEvent();
      return;
    }
    this.readChunk();
  }

  private isPartitionEnd() {
    return this.partitionSize >= this.maxPartitionSize;
  }

  private isFileEnd() {
    return this.offset >= this.file.size;
  }
}

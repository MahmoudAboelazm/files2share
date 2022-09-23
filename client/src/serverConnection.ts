import { OnEvent } from "./types";

const randomId = () => "id" + Math.random().toString(16).slice(2);

export default class ServerConnection {
  private onEvent: OnEvent = {};
  private baseUrl: string;
  private id: string;
  constructor(url: string) {
    this.baseUrl = url;
    this.id = randomId();
    const source = new EventSource(url + `/connect/${this.id}`, {
      withCredentials: false,
    });
    source.onmessage = async (e) => {
      const data = await JSON.parse(e.data);
      this.onEvent[data.msg]?.(data);
    };
  }

  on(event: string, fnCallBack: (data: any) => void) {
    this.onEvent[event] = fnCallBack;
  }

  send(data: any) {
    fetch(this.baseUrl + `/peerSignal/${this.id}`, {
      method: "POST",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  }
}

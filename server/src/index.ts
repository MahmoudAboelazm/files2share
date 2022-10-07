import cors from "cors";
import express, { Request, Response } from "express";
import uaParser from "ua-parser-js";
import {
  adjectives,
  animals,
  uniqueNamesGenerator,
} from "unique-names-generator";
import { CLIENT_URL, PORT } from "./config/constants";
import { Device, Network, Notifiy, PeerSignal } from "./types";
import { createAvatar } from "@dicebear/avatars";
import * as style from "@dicebear/adventurer-neutral";

const expressInit = async () => {
  ////////////////////////////////////////////////////////
  /////////////////// Network ///////////////////////////
  //////////////////////////////////////////////////////
  const networks = new Map<string, Network>();

  const networkIp = (request: Request): string => {
    const ip = request.headers["x-forwarded-for"]
      ? (request.headers["x-forwarded-for"] as string).split(/\s*,\s*/)[0]
      : (request.connection.remoteAddress as string);

    return ip == "::1" ||
      ip == "::ffff:127.0.0.1" ||
      ip.includes("::ffff:192.168.1.1")
      ? "127.0.0.1"
      : ip;
  };

  const getDeviceInfo = (request: Request): Device => {
    let ua = uaParser(request.headers["user-agent"]);

    const randomName = uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      separator: " ",
    });

    const imgURL = createAvatar(style, {
      seed: randomName,
      dataUri: true,
      size: 80,
    });

    return {
      name: randomName,
      model: ua.device.model
        ? ua.device.model
        : ua.browser.name
        ? ua.browser.name
        : "Unknown Device",
      os: ua.os.name,
      browser: ua.browser.name,
      type: ua.device.type,
      vendor: ua.device.vendor,
      imgURL,
    };
  };

  //////////////////////////////////////////////////////////////
  //////////////// Server send events init ////////////////////
  ////////////////////////////////////////////////////////////
  const emitSSE = (res: Response, data: Notifiy) => {
    res.write("data: " + JSON.stringify(data) + "\n\n");
  };

  const setSSE = (res: Response) => {
    res.set({
      "Cache-Control": "no-cache",
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
  };

  //////////////////////////////////////////////////////////
  //////////////////////// On SSE  ////////////////////////
  ////////////////////////////////////////////////////////
  const onDeviceConnected = (res: Response, req: Request, ip: string) => {
    const device = getDeviceInfo(req);
    const network = networks.get(ip);
    const id = req.params.id;
    emitSSE(res, { msg: "my-device", device });

    if (network) {
      emitSSE(res, {
        msg: "network-devices",
        devices: network.connectedDevices.map(({ id, device }) => ({
          id,
          device,
        })),
      });
      network.connectedDevices.forEach((d) =>
        emitSSE(d.res, { msg: "new-device", id, device }),
      );

      network.connectedDevices.push({
        id,
        device,
        req,
        res,
      });
    } else {
      networks.set(ip, {
        connectedDevices: [
          {
            id,
            device,
            req,
            res,
          },
        ],
      });
    }
  };
  const onClose = (req: Request, ip: string) => {
    const { id } = req.params;
    const network = networks.get(ip);
    if (network) {
      network.connectedDevices = network.connectedDevices.filter(
        (d) => d.id !== id,
      );
      network.connectedDevices.forEach((d) =>
        emitSSE(d.res, { msg: "device-left", id }),
      );
      if (network.connectedDevices.length == 0) networks.delete(ip);
    }
  };

  const onDeviceLeave = (req: Request, ip: string) => {
    req.on("close", () => onClose(req, ip));
    req.on("error", () => onClose(req, ip));
  };

  const onPeerSignal = (req: Request, network: Network) => {
    const peer: PeerSignal = req.body;
    const myId = req.params.id;

    for (const device of network.connectedDevices) {
      if (device.id == peer.id) {
        peer.id = myId; // change peer id to my id so the other device can update the peer related to my id
        emitSSE(device.res, { msg: "peer-signal", peer });
        break;
      }
    }
  };

  ////////////////////////////////////////////////////////////////
  /////////////////// Server requests ///////////////////////////
  //////////////////////////////////////////////////////////////
  const connectDevice = (req: Request, res: Response) => {
    const ip = networkIp(req);
    setSSE(res);
    onDeviceConnected(res, req, ip);
    onDeviceLeave(req, ip);
  };

  const peerSignal = (req: Request, res: Response) => {
    const ip = networkIp(req);
    const network = networks.get(ip);
    if (network) onPeerSignal(req, network);
    res.end();
  };

  /////////////////////////////////////////////////////////////
  /////////////////// Express Server /////////////////////////
  ///////////////////////////////////////////////////////////
  const app = express();
  app.use(express.json());
  app.use(
    cors({
      origin: CLIENT_URL,
    }),
  );
  app.get("/connect/:id", connectDevice);
  app.post("/peerSignal/:id", peerSignal);

  app.listen(PORT, () => console.log("🚀 Server running on port: ", PORT));
};

expressInit().catch((err) => {
  console.log(err);
});

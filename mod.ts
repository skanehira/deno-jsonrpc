import { io } from "./deps.ts";

export interface Notify {
  jsonrpc?: "2.0";
  method: string;
  params?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export interface Request extends Notify {
  id?: number;
}

export interface Error {
  code: number;
  message: string;
  data?: unknown;
}

export interface Response<T> {
  jsonrpc: "2.0";
  result?: T;
  error?: Error;
}

export class Client {
  #id: number;
  conn: Deno.Conn;
  encoder: TextEncoder;
  decoder: TextDecoder;

  constructor(conn: Deno.Conn) {
    this.conn = conn;
    this.#id = 0;
    this.encoder = new TextEncoder();
    this.decoder = new TextDecoder();
  }

  private async readResponse<T>(): Promise<Response<T>> {
    const cap = 1024;
    const p = new Uint8Array(cap);
    const buf = new io.Buffer();
    while (1) {
      const readed = await this.conn.read(p);
      if (readed === null || readed === 0) { // EOF
        break;
      }
      if (readed !== cap) {
        buf.write(p.slice(0, readed));
        break;
      }
      buf.write(p);
    }

    const body = this.decoder.decode(buf.bytes());
    return JSON.parse(body) as Response<T>;
  }

  async Request<T>(req: Request): Promise<Response<T>> {
    req.id = this.#id;
    req.jsonrpc = "2.0";
    const body = JSON.stringify(req);
    await this.conn.write(this.encoder.encode(body));
    this.#id++;
    return this.readResponse();
  }

  async Notify(req: Notify): Promise<void> {
    try {
      req.jsonrpc = "2.0";
      const body = JSON.stringify(req);
      await this.conn.write(this.encoder.encode(body));
    } catch (e) {
      console.error(e);
    }
  }

  close() {
    this.conn.close();
  }
}

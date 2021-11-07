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

  // returns response body as a string
  private async readResponseBody(): Promise<string> {
    const cap = 1024 * 30;
    const buf = new io.Buffer();
    while (1) {
      const p = new Uint8Array(cap);
      const readed = await this.conn.read(p);
      if (readed === null) { // EOF
        break;
      }
      if (readed < cap) {
        await buf.write(p.slice(0, readed));
        break;
      }
      await buf.write(p);
    }

    if (buf.length === 0) {
      throw new Error("respone body is empty");
    }

    const body = this.decoder.decode(buf.bytes());
    return body;
  }

  private async readResponse<T>(): Promise<Response<T>> {
    const body = await this.readResponseBody();
    return JSON.parse(body) as Response<T>;
  }

  private async readBatchResponse<T>(): Promise<Response<T>[]> {
    const body = await this.readResponseBody();
    return JSON.parse(body) as Response<T>[];
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
    req.jsonrpc = "2.0";
    const body = JSON.stringify(req);
    await this.conn.write(this.encoder.encode(body));
  }

  async Batch<T>(...reqs: Request[]): Promise<Response<T>[]> {
    const body = JSON.stringify(reqs.map((req) => {
      req.jsonrpc = "2.0";
      req.id = this.#id;
      this.#id++;
      return req;
    }));
    await this.conn.write(this.encoder.encode(body));
    return this.readBatchResponse<T>();
  }

  close() {
    this.#id = 0;
    this.conn.close();
  }
}

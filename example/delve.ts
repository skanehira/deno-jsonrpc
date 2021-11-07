import { readLines } from "https://deno.land/std@0.113.0/io/mod.ts";
import { Client } from "../mod.ts";

let cli: Client;

async function doBreak(value: string): Promise<void> {
  const [f, l] = value.split(":");
  await cli.Request({
    method: "RPCServer.CreateBreakpoint",
    params: [
      {
        breakpoint: {
          file: f,
          line: Number(l),
        },
      },
    ],
  });
}

async function doContinue(): Promise<void> {
  await cli.Request({
    method: "RPCServer.Command",
    params: [
      {
        name: "continue",
      },
    ],
  });
}

async function doExit(): Promise<void> {
  await cli.Request({
    method: "RPCServer.Detach",
    params: [
      {
        kill: true,
      },
    ],
  });
}

async function doListBreakpoints(): Promise<void> {
  await cli.Request({
    method: "RPCServer.ListBreakpoints",
    params: [
      {
        all: true,
      },
    ],
  });
}

async function doHalt(): Promise<void> {
  await cli.Request({
    method: "RPCServer.Command",
    params: [
      {
        name: "halt",
      },
    ],
  });
}

async function doHttp(): Promise<void> {
  await fetch("http://localhost:9998");
}

async function doRestart(): Promise<void> {
  await cli.Request({
    method: "RPCServer.Restart",
    params: [
      {
        rebuild: false,
      },
    ],
  });
}

async function doGetState(): Promise<void> {
  const result = await cli.Request({
    method: "RPCServer.State",
    params: [
      {
        Nonblocking: true,
      },
    ],
  });
  console.log(result);
}

async function doOp(
  f: (...args: string[]) => Promise<void>,
  ...args: string[]
): Promise<void> {
  await doHalt();
  f(...args);
}

async function main() {
  const conn = await Deno.connect({ port: 8888 });
  cli = new Client(conn);
  console.log("connected");
  for await (const line of readLines(Deno.stdin)) {
    if (!line) continue;
    const [op, value] = line.split(" ");
    switch (op) {
      case "http":
        doHttp();
        break;
      case "halt":
        doHalt();
        break;
      case "breakpoints":
        doOp(doListBreakpoints);
        break;
      case "break":
        doOp(doBreak, value);
        break;
      case "c":
      case "continue":
        doOp(doContinue);
        break;
      case "e":
      case "exit": {
        doOp(doExit);
        return;
      }
      case "r":
      case "restart":
        doOp(doRestart);
        break;
      case "state":
        doGetState();
    }
  }
}

main();

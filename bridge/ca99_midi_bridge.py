#!/usr/bin/env python3
"""
ca99_midi_bridge.py — CA99 蓝牙 MIDI 桥（WinRT → WebSocket）

为什么需要它：
  Windows 上 Chrome 的 Web MIDI 走 WinMM，看不到 BLE-MIDI 设备。
  本桥用 WinRT（Windows.Devices.Midi）枚举/打开 MIDI 端口——WinRT 能看到蓝牙
  MIDI，并且 MidiInPort 会自动把分片的 BLE SysEx 重新拼成完整消息，因此
  对 CA99 的 SysEx 协议完整支持。

前端如何使用（零改动复用现有 UI）：
  打开 app 时加 ?bridge=ws://127.0.0.1:8765
  或在控制台 localStorage.setItem('ca99.bridgeUrl','ws://127.0.0.1:8765')
  midi-core.js 检测到后自动切到 websocket 传输。

协议见 app/js/bridge-protocol.js（PROTOCOL_VERSION = 1）：
  Client→Bridge: {"cmd":"list"} / {"cmd":"selectInput","id":..} /
                 {"cmd":"selectOutput","id":..} / {"cmd":"send","bytes":[..]}
  Bridge→Client: {"evt":"hello","version":1,"transport":"winrt"} /
                 {"evt":"ports","inputs":[{id,name,manufacturer}],"outputs":[..]} /
                 {"evt":"message","bytes":[..]} / {"evt":"selected",..} /
                 {"evt":"error","message":..}

依赖（已预装，无需编译）：
  pip install winrt-Windows.Devices.Midi winrt-Windows.Devices.Enumeration
              winrt-Windows.Storage.Streams websockets pywin32

运行：
  python ca99_midi_bridge.py            # 默认 127.0.0.1:8765
  python ca99_midi_bridge.py --host 0.0.0.0 --port 8765

技术说明（COM STA 线程）：
  winrt-* Python 包的 WinRT 对象在 COM STA 公寓中创建。asyncio ProactorEventLoop
  使用 MTA（IOCP），两者混用会导致 send_message 在 await 之后报
  WinError -2147024775（semaphore timeout）。
  解决方案：所有 WinRT MIDI 操作在专用 STA 线程中执行，每次异步操作（list/open）
  用独立的 event loop 跑完即销毁；send_message 是同步调用，直接在 STA 线程执行。
  WebSocket 层仍在主 asyncio 循环，通过 asyncio.to_thread 调用 STA 线程。
"""
import argparse
import asyncio
import json
import queue
import sys
import threading

import websockets

try:
    import pythoncom
except ImportError:
    sys.exit("ERROR: pywin32 required — pip install pywin32")

try:
    from winrt.windows.devices.midi import (
        MidiInPort, MidiOutPort,
        MidiControlChangeMessage, MidiProgramChangeMessage,
        MidiNoteOnMessage, MidiNoteOffMessage,
        MidiPolyphonicKeyPressureMessage, MidiChannelPressureMessage,
        MidiPitchBendChangeMessage, MidiSystemExclusiveMessage,
    )
    from winrt.windows.devices.enumeration import DeviceInformation
    from winrt.windows.storage.streams import Buffer
except ImportError as e:
    sys.exit(f"ERROR: {e}\n"
             "pip install winrt-Windows.Devices.Midi "
             "winrt-Windows.Devices.Enumeration winrt-Windows.Storage.Streams")

PROTOCOL_VERSION = 1


# ---------------------------------------------------------------------------
# MidiSTA — 所有 WinRT MIDI 操作在专用 STA 线程中执行
# ---------------------------------------------------------------------------
class MidiSTA:
    """
    WinRT MIDI worker 运行在独立 COM STA 线程。
    - 异步 WinRT 操作（list / open port）：每次创建临时 event loop，用完即销毁。
    - 同步 WinRT 操作（send_message）：直接在 STA 线程调用，无需 event loop。
    主线程通过 execute() 投递命令并等待结果（blocking），
    通过 send_nowait() 异步投递发送命令（fire-and-forget）。
    """

    def __init__(self, main_loop: asyncio.AbstractEventLoop):
        self._cmd_q: queue.Queue = queue.Queue()
        self._res_q: queue.Queue = queue.Queue()
        self._main_loop = main_loop
        self._ready = threading.Event()
        self._in_port = None
        self._in_token = None
        self._out_port = None
        self.on_message = None   # coroutine function: bytes → None

    def start(self):
        t = threading.Thread(target=self._run, name="MidiSTA", daemon=True)
        t.start()
        self._ready.wait(5)

    def _run(self):
        pythoncom.CoInitialize()
        self._ready.set()
        while True:
            cmd = self._cmd_q.get()
            if cmd is None:
                break
            try:
                result = self._exec(cmd)
            except Exception as exc:
                result = {"ok": False, "error": str(exc)}
            self._res_q.put(result)
        pythoncom.CoUninitialize()

    def _exec(self, cmd: dict) -> dict:
        op = cmd["op"]
        # ---- synchronous ops ----
        if op == "send":
            self._send_bytes(cmd["bytes"])
            return {"ok": True}
        if op == "close_in":
            self._close_in()
            return {"ok": True}
        if op == "close_out":
            self._close_out()
            return {"ok": True}
        # ---- async ops: fresh event loop per call ----
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(self._async_exec(op, cmd))
        finally:
            loop.close()
            asyncio.set_event_loop(None)

    async def _async_exec(self, op: str, cmd: dict) -> dict:
        if op == "list":
            outs = await DeviceInformation.find_all_async_aqs_filter(
                MidiOutPort.get_device_selector())
            ins = await DeviceInformation.find_all_async_aqs_filter(
                MidiInPort.get_device_selector())
            return {
                "ok": True,
                "outputs": [{"id": d.id, "name": d.name, "manufacturer": ""}
                            for d in outs],
                "inputs":  [{"id": d.id, "name": d.name, "manufacturer": ""}
                            for d in ins],
            }
        if op == "open_out":
            port = await MidiOutPort.from_id_async(cmd["id"])
            if port is None:
                return {"ok": False, "error": "from_id_async returned None "
                        "(虚拟合成器无法打开，请选真实 MIDI 设备)"}
            self._out_port = port
            return {"ok": True}
        if op == "open_in":
            port = await MidiInPort.from_id_async(cmd["id"])
            if port is None:
                return {"ok": False, "error": "from_id_async returned None"}
            self._in_token = port.add_message_received(self._on_midi_in)
            self._in_port = port
            return {"ok": True}
        return {"ok": False, "error": f"unknown op: {op}"}

    def _send_bytes(self, bts: list):
        if not self._out_port or not bts:
            return
        data = bytes(int(b) & 0xFF for b in bts)
        s = data[0]
        b = s & 0xF0
        ch = s & 0x0F
        try:
            if   b == 0xB0 and len(data) >= 3:
                self._out_port.send_message(
                    MidiControlChangeMessage(ch, data[1], data[2]))
            elif b == 0xC0 and len(data) >= 2:
                self._out_port.send_message(
                    MidiProgramChangeMessage(ch, data[1]))
            elif b == 0x90 and len(data) >= 3:
                self._out_port.send_message(
                    MidiNoteOnMessage(ch, data[1], data[2]))
            elif b == 0x80 and len(data) >= 3:
                self._out_port.send_message(
                    MidiNoteOffMessage(ch, data[1], data[2]))
            elif b == 0xA0 and len(data) >= 3:
                self._out_port.send_message(
                    MidiPolyphonicKeyPressureMessage(ch, data[1], data[2]))
            elif b == 0xD0 and len(data) >= 2:
                self._out_port.send_message(
                    MidiChannelPressureMessage(ch, data[1]))
            elif b == 0xE0 and len(data) >= 3:
                self._out_port.send_message(
                    MidiPitchBendChangeMessage(ch, data[1] | (data[2] << 7)))
            elif s == 0xF0:
                buf = Buffer(len(data))
                buf.length = len(data)
                memoryview(buf)[:] = data
                self._out_port.send_message(MidiSystemExclusiveMessage(buf))
            else:
                print(f"[bridge] unhandled MIDI: {[hex(x) for x in data]}",
                      flush=True)
        except Exception as exc:
            print(f"[bridge] send error: {exc}", flush=True)

    def _on_midi_in(self, _sender, args):
        """WinRT thread-pool callback — forward to main asyncio loop."""
        try:
            raw = list(memoryview(args.message.raw_data))
        except Exception:
            return
        if self.on_message and self._main_loop:
            asyncio.run_coroutine_threadsafe(
                self.on_message(raw), self._main_loop)

    def _close_in(self):
        if self._in_port:
            try:
                if self._in_token is not None:
                    self._in_port.remove_message_received(self._in_token)
            except Exception:
                pass
            try:
                self._in_port.close()
            except Exception:
                pass
        self._in_port = None
        self._in_token = None

    def _close_out(self):
        if self._out_port:
            try:
                self._out_port.close()
            except Exception:
                pass
        self._out_port = None

    def execute(self, cmd: dict, timeout: float = 8.0) -> dict:
        """Main-thread-safe: enqueue and wait for result (blocking)."""
        self._cmd_q.put(cmd)
        return self._res_q.get(timeout=timeout)

    def send_nowait(self, bts: list):
        """Fire-and-forget MIDI send (non-blocking from caller's perspective)."""
        self._cmd_q.put({"op": "send", "bytes": bts})

    def stop(self):
        self._cmd_q.put(None)


# ---------------------------------------------------------------------------
# WebSocket handler — 保持远程 agent 定义的协议不变（PROTOCOL_VERSION = 1）
# ---------------------------------------------------------------------------
async def handle_client(ws, midi: MidiSTA):
    main_loop = asyncio.get_running_loop()
    in_id: str | None = None
    out_id: str | None = None

    async def send_json(obj):
        try:
            await ws.send(json.dumps(obj))
        except Exception:
            pass

    async def forward_midi(raw: list):
        await send_json({"evt": "message", "bytes": raw})

    midi.on_message = forward_midi

    peer = getattr(ws, "remote_address", None)
    print(f"[bridge] client connected {peer}", flush=True)
    await send_json({"evt": "hello", "version": PROTOCOL_VERSION,
                     "transport": "winrt"})

    try:
        async for raw_msg in ws:
            try:
                msg = json.loads(raw_msg)
            except (ValueError, TypeError):
                await send_json({"evt": "error", "message": "bad json"})
                continue
            cmd = msg.get("cmd")

            if cmd == "list":
                r = await asyncio.to_thread(midi.execute, {"op": "list"})
                if r["ok"]:
                    await send_json({"evt": "ports",
                                     "inputs":  r["inputs"],
                                     "outputs": r["outputs"]})
                else:
                    await send_json({"evt": "error", "message": r["error"]})

            elif cmd == "selectOutput":
                dev_id = msg.get("id", "")
                await asyncio.to_thread(midi.execute, {"op": "close_out"})
                r = await asyncio.to_thread(midi.execute,
                                            {"op": "open_out", "id": dev_id})
                if r["ok"]:
                    out_id = dev_id
                    await send_json({"evt": "selected",
                                     "input": in_id, "output": out_id})
                    print(f"[bridge] output selected: {dev_id}", flush=True)
                else:
                    await send_json({"evt": "error",
                                     "message": f"selectOutput: {r['error']}"})

            elif cmd == "selectInput":
                dev_id = msg.get("id", "")
                await asyncio.to_thread(midi.execute, {"op": "close_in"})
                r = await asyncio.to_thread(midi.execute,
                                            {"op": "open_in", "id": dev_id})
                if r["ok"]:
                    in_id = dev_id
                    await send_json({"evt": "selected",
                                     "input": in_id, "output": out_id})
                    print(f"[bridge] input selected: {dev_id}", flush=True)
                else:
                    await send_json({"evt": "error",
                                     "message": f"selectInput: {r['error']}"})

            elif cmd == "send":
                bts = msg.get("bytes") or []
                if midi._out_port is None:
                    await send_json({"evt": "error",
                                     "message": "no output selected"})
                else:
                    midi.send_nowait(bts)

            else:
                await send_json({"evt": "error",
                                 "message": f"unknown cmd: {cmd}"})

    except websockets.ConnectionClosed:
        pass
    finally:
        print(f"[bridge] client disconnected {peer}", flush=True)


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
async def main_async(host: str, port: int):
    main_loop = asyncio.get_running_loop()
    midi = MidiSTA(main_loop)
    midi.start()
    print(f"[bridge] CA99 MIDI bridge (WinRT) listening on ws://{host}:{port}",
          flush=True)

    # 启动时枚举端口，确认蓝牙设备可见
    try:
        r = await asyncio.to_thread(midi.execute, {"op": "list"})
        ins, outs = r.get("inputs", []), r.get("outputs", [])
        print(f"[bridge] inputs={len(ins)} outputs={len(outs)}", flush=True)
        for d in ins:
            print(f"[bridge]   IN  {d['name']}", flush=True)
        for d in outs:
            print(f"[bridge]   OUT {d['name']}", flush=True)
    except Exception as exc:
        print(f"[bridge] enumerate failed: {exc}", flush=True)

    async def _handler(ws):
        await handle_client(ws, midi)

    async with websockets.serve(_handler, host, port):
        await asyncio.Future()   # run forever


def main():
    ap = argparse.ArgumentParser(
        description="CA99 蓝牙 MIDI 桥 (WinRT → WebSocket)")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=8765)
    args = ap.parse_args()
    try:
        asyncio.run(main_async(args.host, args.port))
    except KeyboardInterrupt:
        print("\n[bridge] stopped", flush=True)
        sys.exit(0)


if __name__ == "__main__":
    main()

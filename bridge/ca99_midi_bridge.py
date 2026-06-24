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

运行：
  pip install -r requirements-bridge.txt
  python ca99_midi_bridge.py            # 默认 127.0.0.1:8765
  python ca99_midi_bridge.py --host 0.0.0.0 --port 8765
"""
import argparse
import asyncio
import json
import sys

import websockets
from winsdk.windows.devices.midi import MidiInPort, MidiOutPort
from winsdk.windows.devices.enumeration import DeviceInformation
from winsdk.windows.security.cryptography import CryptographicBuffer

PROTOCOL_VERSION = 1


async def enumerate_ports():
    """枚举所有 MIDI 输入/输出端口（含蓝牙）。"""
    in_sel = MidiInPort.get_device_selector()
    out_sel = MidiOutPort.get_device_selector()
    # 注意：必须用 2 参数形式 find_all_async(selector, [])，
    # 单参数形式会被解析成 DeviceClass(int) 重载而报错。
    in_devs = await DeviceInformation.find_all_async(in_sel, [])
    out_devs = await DeviceInformation.find_all_async(out_sel, [])
    inputs = [{"id": d.id, "name": d.name, "manufacturer": ""} for d in in_devs]
    outputs = [{"id": d.id, "name": d.name, "manufacturer": ""} for d in out_devs]
    return inputs, outputs


def buffer_to_bytes(buf):
    return bytes(CryptographicBuffer.copy_to_byte_array(buf))


def bytes_to_buffer(data):
    return CryptographicBuffer.create_from_byte_array(bytes(data))


async def handle_client(ws):
    loop = asyncio.get_running_loop()
    state = {"in_port": None, "in_token": None, "out_port": None,
             "in_id": None, "out_id": None}

    async def send_json(obj):
        try:
            await ws.send(json.dumps(obj))
        except Exception:
            pass

    def on_midi_message(sender, args):
        # 该回调跑在 WinRT 线程池线程，需调度回 asyncio 事件循环。
        try:
            data = buffer_to_bytes(args.message.raw_data)
        except Exception:
            return
        payload = json.dumps({"evt": "message", "bytes": list(data)})
        asyncio.run_coroutine_threadsafe(_safe_send(payload), loop)

    async def _safe_send(text):
        try:
            await ws.send(text)
        except Exception:
            pass

    def close_input():
        if state["in_port"] is not None:
            try:
                if state["in_token"] is not None:
                    state["in_port"].remove_message_received(state["in_token"])
            except Exception:
                pass
            try:
                state["in_port"].close()
            except Exception:
                pass
        state["in_port"] = None
        state["in_token"] = None

    def close_output():
        if state["out_port"] is not None:
            try:
                state["out_port"].close()
            except Exception:
                pass
        state["out_port"] = None

    peer = getattr(ws, "remote_address", None)
    print(f"[bridge] client connected {peer}", flush=True)
    await send_json({"evt": "hello", "version": PROTOCOL_VERSION, "transport": "winrt"})

    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except (ValueError, TypeError):
                await send_json({"evt": "error", "message": "bad json"})
                continue
            cmd = msg.get("cmd")

            if cmd == "list":
                inputs, outputs = await enumerate_ports()
                await send_json({"evt": "ports", "inputs": inputs, "outputs": outputs})

            elif cmd == "selectInput":
                dev_id = msg.get("id")
                close_input()
                try:
                    port = await MidiInPort.from_id_async(dev_id)
                    if port is None:
                        raise RuntimeError("打开输入端口失败")
                    token = port.add_message_received(on_midi_message)
                    state["in_port"] = port
                    state["in_token"] = token
                    state["in_id"] = dev_id
                    await send_json({"evt": "selected", "input": state["in_id"],
                                     "output": state["out_id"]})
                    print(f"[bridge] input selected: {dev_id}", flush=True)
                except Exception as e:
                    await send_json({"evt": "error", "message": f"selectInput: {e}"})

            elif cmd == "selectOutput":
                dev_id = msg.get("id")
                close_output()
                try:
                    port = await MidiOutPort.from_id_async(dev_id)
                    if port is None:
                        raise RuntimeError("打开输出端口失败")
                    state["out_port"] = port
                    state["out_id"] = dev_id
                    await send_json({"evt": "selected", "input": state["in_id"],
                                     "output": state["out_id"]})
                    print(f"[bridge] output selected: {dev_id}", flush=True)
                except Exception as e:
                    await send_json({"evt": "error", "message": f"selectOutput: {e}"})

            elif cmd == "send":
                bts = msg.get("bytes") or []
                if state["out_port"] is None:
                    await send_json({"evt": "error", "message": "no output selected"})
                    continue
                try:
                    clean = bytes((int(b) & 0xFF) for b in bts)
                    state["out_port"].send_buffer(bytes_to_buffer(clean))
                except Exception as e:
                    await send_json({"evt": "error", "message": f"send: {e}"})

            else:
                await send_json({"evt": "error", "message": f"unknown cmd: {cmd}"})

    except websockets.ConnectionClosed:
        pass
    finally:
        close_input()
        close_output()
        print(f"[bridge] client disconnected {peer}", flush=True)


async def main_async(host, port):
    print(f"[bridge] CA99 MIDI bridge (WinRT) listening on ws://{host}:{port}", flush=True)
    # 启动时打印一次端口清单，便于确认蓝牙设备是否可见
    try:
        inputs, outputs = await enumerate_ports()
        print(f"[bridge] inputs={len(inputs)} outputs={len(outputs)}", flush=True)
        for d in inputs:
            print(f"[bridge]   IN  {d['name']}", flush=True)
        for d in outputs:
            print(f"[bridge]   OUT {d['name']}", flush=True)
    except Exception as e:
        print(f"[bridge] enumerate failed: {e}", flush=True)

    async with websockets.serve(handle_client, host, port):
        await asyncio.Future()  # run forever


def main():
    ap = argparse.ArgumentParser(description="CA99 蓝牙 MIDI 桥 (WinRT → WebSocket)")
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

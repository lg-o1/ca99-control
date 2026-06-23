#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
validate_ca99_usb.py — Kawai CA99 真机 USB 验证脚本

目的：把"逆向出来的协议数据"在真实钢琴上验证一次。
脚本会基于 app/data/sounds.json + app/data/sysex.json：
  1. 列出系统里的 MIDI 输出端口（找到 CA99 的 USB MIDI 口）
  2. 给 CA99 发"切到 Concert Grand"音色（标准 Bank Select + Program Change）
  3. （可选）再发一条 CA99 专属 SysEx（开启 SK-EX Rendering），验证 SysEx 框架也对

如果钢琴面板上的音色随脚本切换、声音变了，就说明逆向的 msb/lsb/pc 和
SysEx 帧格式在真机上是正确的。

----------------------------------------------------------------------
依赖安装（任选其一）：
    pip install mido python-rtmidi
端口连接：
    用 USB 线把 CA99 的 "USB to Host" 口接到电脑（或用蓝牙 MIDI）。
----------------------------------------------------------------------

用法示例：
    # 1) 先看有哪些 MIDI 输出口
    python validate_ca99_usb.py --list

    # 2) 自动挑选名字含 CA99/Kawai 的口，切到 Concert Grand
    python validate_ca99_usb.py

    # 3) 指定端口（名字可部分匹配）和目标音色
    python validate_ca99_usb.py --port "CA99" --sound "Concert"

    # 4) 切音色 + 顺便发 SysEx 开启 Rendering（验证 SysEx 帧）
    python validate_ca99_usb.py --sysex

    # 5) 只打印将要发送的字节，不真正发送（干跑，检查数据）
    python validate_ca99_usb.py --dry-run --sound "Jazz Clean"
"""

import argparse
import json
import os
import sys
import time

# -------------------------------------------------------------------- 数据加载
HERE = os.path.dirname(os.path.abspath(__file__))
# 脚本放在 scripts/ 下，数据在 ../app/data/
DATA_DIR = os.path.normpath(os.path.join(HERE, "..", "app", "data"))


def load_json(name):
    path = os.path.join(DATA_DIR, name)
    if not os.path.exists(path):
        sys.exit(f"❌ 找不到数据文件：{path}\n   请在 ca99-control 仓库内运行本脚本。")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def to_int(v):
    """sysex.json 里的值是 '0x10' 这样的十六进制字符串；sounds.json 里是普通整数。"""
    if isinstance(v, int):
        return v
    if isinstance(v, str):
        v = v.strip()
        if v == "":
            return None
        return int(v, 16) if v.lower().startswith("0x") else int(v)
    return None


def hx(bs):
    return " ".join(f"{b:02X}" for b in bs)


# -------------------------------------------------------------------- 协议构造
# 与 app/js/ca99.js 保持一致

PART_SYSTEM = 0x7F


def build_sound_select(sound, channel=0):
    """切音色 = Bank Select MSB(CC0) + Bank Select LSB(CC32) + Program Change。
    返回 3 条标准 MIDI 消息（list[list[int]]）。"""
    ch = channel & 0x0F
    msb = to_int(sound["msb"]) & 0x7F
    lsb = to_int(sound["lsb"]) & 0x7F
    pc = to_int(sound["pc"]) & 0x7F
    return [
        [0xB0 | ch, 0x00, msb],   # Bank Select MSB
        [0xB0 | ch, 0x20, lsb],   # Bank Select LSB
        [0xC0 | ch, pc],          # Program Change
    ]


def build_sysex(fn, v1, v2, part=PART_SYSTEM, data=()):
    """CA99 通用 SysEx：F0 40 7F [fn] 08 02 [v1] [v2] [part] [data...] F7
    （来自官方 kawaipiano.js getMidi() 的逆向）"""
    body = [fn & 0x7F, 0x08, 0x02, v1 & 0x7F, v2 & 0x7F, part & 0x7F]
    body += [d & 0x7F for d in data]
    return [0xF0, 0x40, 0x7F] + body + [0xF7]


def build_param_sysex(param, part=PART_SYSTEM):
    """从 sysex.json 的一条参数定义构造 SysEx（用其 v4 作为数据字节）。"""
    fn = to_int(param["fn"])
    v1 = to_int(param["v1"])
    v2 = to_int(param["v2"])
    v4 = to_int(param.get("v4"))
    data = [] if v4 is None else [v4]
    return build_sysex(fn, v1, v2, part, data)


# -------------------------------------------------------------------- 查找辅助
def find_sound(sounds, query):
    """按名字（不区分大小写、部分匹配）找音色；优先精确匹配，再按 ConcertGrand 标签排序。"""
    q = query.lower()
    exact = [s for s in sounds if s["name"].lower() == q]
    if exact:
        return _prefer_concert_grand(exact)
    partial = [s for s in sounds if q in s["name"].lower()]
    if partial:
        return _prefer_concert_grand(partial)
    return None


def _prefer_concert_grand(rows):
    """同名多条时，优先标了 ConcertGrand 且 Piano 1 分类的那条。"""
    cg = [s for s in rows if "ConcertGrand" in (s.get("tag") or "")]
    pool = cg or rows
    p1 = [s for s in pool if (s.get("category") or "").startswith("Piano 1")]
    return (p1 or pool)[0]


def find_param(sysex_rows, parameter, value):
    for p in sysex_rows:
        if p.get("parameter") == parameter and p.get("value") == value:
            return p
    return None


# -------------------------------------------------------------------- MIDI 发送
def open_port(port_query, dry_run):
    if dry_run:
        return None, "(dry-run，不打开真实端口)"
    try:
        import mido
    except ImportError:
        sys.exit(
            "❌ 未安装 mido。请先运行：\n"
            "       pip install mido python-rtmidi\n"
            "   （python-rtmidi 提供底层 MIDI 后端）"
        )
    outs = mido.get_output_names()
    if not outs:
        sys.exit("❌ 没有发现任何 MIDI 输出端口。请确认 CA99 已用 USB 连接并开机。")
    chosen = None
    if port_query:
        for name in outs:
            if port_query.lower() in name.lower():
                chosen = name
                break
        if not chosen:
            sys.exit(f"❌ 没有匹配 '{port_query}' 的端口。可用端口：\n   " + "\n   ".join(outs))
    else:
        # 自动找名字含 CA99 / Kawai 的口
        for name in outs:
            if "ca99" in name.lower() or "kawai" in name.lower():
                chosen = name
                break
        if not chosen:
            chosen = outs[0]
            print(f"⚠ 未找到 CA99/Kawai 端口，默认用第一个：{chosen}")
    return mido.open_output(chosen), chosen


def send_raw(port, msg_bytes, label, dry_run):
    print(f"  → {label:<28} {hx(msg_bytes)}")
    if dry_run or port is None:
        return
    import mido
    if msg_bytes and msg_bytes[0] == 0xF0:
        port.send(mido.Message("sysex", data=msg_bytes[1:-1]))
    else:
        port.send(mido.Message.from_bytes(bytes(msg_bytes)))


# -------------------------------------------------------------------- 主流程
def main():
    ap = argparse.ArgumentParser(
        description="Kawai CA99 真机 USB 验证：切到 Concert Grand 并可选发 SysEx。",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument("--list", action="store_true", help="列出所有 MIDI 输出端口后退出")
    ap.add_argument("--port", default=None, help="MIDI 输出端口名（部分匹配，默认自动找 CA99/Kawai）")
    ap.add_argument("--sound", default="Concert", help="目标音色名（部分匹配，默认 'Concert' = Concert Grand）")
    ap.add_argument("--channel", type=int, default=0, help="MIDI 通道 0-15（默认 0）")
    ap.add_argument("--sysex", action="store_true", help="切音色后再发一条 SysEx（开启 SK-EX Rendering）验证 SysEx 帧")
    ap.add_argument("--dry-run", action="store_true", help="只打印将发送的字节，不真正发送")
    args = ap.parse_args()

    if args.list:
        try:
            import mido
        except ImportError:
            sys.exit("❌ 未安装 mido。请先运行：pip install mido python-rtmidi")
        outs = mido.get_output_names()
        print("MIDI 输出端口：")
        for i, n in enumerate(outs):
            print(f"  [{i}] {n}")
        if not outs:
            print("  （无）— 请确认 CA99 已连接并开机")
        return

    sounds = load_json("sounds.json")
    sysex_rows = load_json("sysex.json")

    sound = find_sound(sounds, args.sound)
    if not sound:
        sys.exit(f"❌ 在 sounds.json 中找不到音色 '{args.sound}'。试试 --sound \"Concert\"")

    print("=" * 60)
    print(f"目标音色：{sound['name']}  (category={sound.get('category')}, tag={sound.get('tag')})")
    print(f"  Bank MSB={to_int(sound['msb'])}  LSB={to_int(sound['lsb'])}  PC={to_int(sound['pc'])}")
    print(f"通道：{args.channel}   端口查询：{args.port or '(自动)'}   "
          f"{'[DRY-RUN]' if args.dry_run else ''}")
    print("=" * 60)

    port, name = open_port(args.port, args.dry_run)
    if not args.dry_run:
        print(f"已打开端口：{name}\n")

    # ---- 切音色（Bank Select + Program Change）----
    print("发送『切音色』(标准 Bank Select + Program Change)：")
    for msg in build_sound_select(sound, args.channel):
        kind = "Bank MSB (CC0)" if msg[1:2] == [0x00] and msg[0] & 0xF0 == 0xB0 else \
               "Bank LSB (CC32)" if msg[1:2] == [0x20] and msg[0] & 0xF0 == 0xB0 else \
               "Program Change"
        send_raw(port, msg, kind, args.dry_run)
        time.sleep(0.05)

    # ---- 可选 SysEx：开启 Rendering ----
    if args.sysex:
        param = find_param(sysex_rows, "Rendering", "On")
        if param:
            print("\n发送『SK-EX Rendering = On』(CA99 专属 SysEx，验证帧格式)：")
            sx = build_param_sysex(param, part=PART_SYSTEM)
            send_raw(port, sx, "Rendering On", args.dry_run)
        else:
            print("\n⚠ sysex.json 里没找到 Rendering/On 参数，跳过 SysEx 演示。")

    if port is not None:
        time.sleep(0.1)
        port.close()

    print("\n✅ 完成。请看 CA99 面板：")
    print("   · 音色显示是否变成了 Concert Grand？")
    print("   · 弹几个音，音色是否对？")
    if args.sysex:
        print("   · Rendering 设置是否被打开（SK-EX Rendering）？")
    print("   如果都对，说明逆向的 msb/lsb/pc 与 SysEx 帧格式在真机上验证通过。")


if __name__ == "__main__":
    main()

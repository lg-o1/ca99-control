/**
 * velocity-switch.js — 力度感应换音色路由（纯逻辑，可测试）
 *
 * 把 0-127 的力度范围切成若干区，每区绑定一个音色。
 * 弹奏时根据 note-on 的力度选出音色 id；只有当目标音色与当前不同才提示切换，
 * 避免每个音符都重复发 Program Change。
 *
 * 引擎本身不发 MIDI，只回答"这个力度该用哪个音色"。
 */

export class VelocityRouter {
  /**
   * @param {Array<{min:number, max:number, soundId:number}>} zones
   *        力度区间（含端点），按需可重叠——取第一个命中的区。
   */
  constructor(zones = []) {
    this.zones = zones;
    this._lastSound = null;
    this.onSwitch = () => {}; // (soundId, zone) => void  仅在音色变化时触发
  }

  setZones(zones) { this.zones = zones || []; }

  /** 找出该力度对应的音色 id（无命中返回 null） */
  soundFor(velocity) {
    for (const z of this.zones) {
      if (velocity >= z.min && velocity <= z.max) return z.soundId;
    }
    return null;
  }

  /** 找出命中的区对象（无命中返回 null） */
  zoneFor(velocity) {
    for (const z of this.zones) {
      if (velocity >= z.min && velocity <= z.max) return z;
    }
    return null;
  }

  /**
   * 处理一个 note-on 力度。若选出的音色与上次不同，触发 onSwitch 并返回该 id；
   * 否则返回 null（无需切换）。
   * @param {number} velocity 0-127
   * @returns {?number}
   */
  feed(velocity) {
    const id = this.soundFor(velocity);
    if (id == null || id === this._lastSound) return null;
    this._lastSound = id;
    this.onSwitch(id, this.zoneFor(velocity));
    return id;
  }

  /** 重置（下一个音符必定触发切换） */
  reset() { this._lastSound = null; }
}

/**
 * 把力度范围按给定音色数等分成若干连续区。
 * @param {number[]} soundIds  按力度从弱到强的音色 id
 * @returns {Array<{min:number,max:number,soundId:number}>}
 */
export function splitZones(soundIds) {
  const n = soundIds.length;
  if (!n) return [];
  const zones = [];
  for (let i = 0; i < n; i++) {
    const min = Math.round((127 * i) / n) + (i === 0 ? 0 : 1);
    const max = i === n - 1 ? 127 : Math.round((127 * (i + 1)) / n);
    zones.push({ min, max, soundId: soundIds[i] });
  }
  return zones;
}

// 💛 复活币 / 二次机会（Revive Coins）— 纯逻辑
// 设计哲学（家庭核心价值「成长」而非「完美」）：
//   这不是表现奖励、不是可囤积的金币商店（避免外在奖励挤出内在动机 SDT / 有条件的爱 Luthar）。
//   它是一张「降挫败安全网」——每天温和补充固定数量的「二次机会」，
//   弹错被击落时可以续命再战一次，直接对抗 Lily 的挑战回避（成长思维 2.3/6）。
//   每个孩子每天都有同样多的复活币，与弹得好不好无关——失败不该让你失去再试的权利。

export const DAILY_REVIVES = 5;

// 本地日期 YYYY-MM-DD（按本地时区，跨天自动补满）
export function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 复活币银行：每日定额补充的二次机会池
// opts: { perDay=5, store={get(),set(v)} 可选持久化, now=()=>Date }
export class ReviveBank {
  constructor({ perDay = DAILY_REVIVES, store = null, now = () => new Date() } = {}) {
    this.perDay = Math.max(0, perDay | 0);
    this.store = store;
    this.now = now;
    this._state = null;
    this._load();
  }

  _freshState() {
    return { day: dayKey(this.now()), left: this.perDay };
  }

  _load() {
    let state = null;
    if (this.store) {
      try { state = JSON.parse(this.store.get() || 'null'); } catch (_) { state = null; }
    }
    if (!state || typeof state.left !== 'number' || state.day !== dayKey(this.now())) {
      state = this._freshState();
      this._save(state);
    } else {
      // 夹紧到合法范围（perDay 改小后旧值过大时）
      state.left = Math.max(0, Math.min(this.perDay, state.left | 0));
    }
    this._state = state;
  }

  _save(state) {
    this._state = state;
    if (this.store) {
      try { this.store.set(JSON.stringify(state)); } catch (_) {}
    }
  }

  // 跨天则补满
  _refreshDay() {
    if (!this._state || this._state.day !== dayKey(this.now())) {
      this._save(this._freshState());
    }
  }

  coinsLeft() {
    this._refreshDay();
    return this._state.left;
  }

  canRevive() {
    return this.coinsLeft() > 0;
  }

  // 花一颗复活币续命。成功返回 true 并扣 1，没币返回 false
  useRevive() {
    this._refreshDay();
    if (this._state.left <= 0) return false;
    this._state.left -= 1;
    this._save({ ...this._state });
    return true;
  }

  reset() {
    this._save(this._freshState());
  }
}

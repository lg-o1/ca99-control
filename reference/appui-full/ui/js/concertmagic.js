const cmagicAnimation = {

  initialized: false,
  isAnimated: false,
  count: 0,
  barnum: 15,
  bar: 0,
  mgn_w: 0.164,
  gray: 73,
  idInterval: -1,
  intervalBegin: 0,
  success: true,
  velocity: 0,
  msec: 0,

  init(){
    const parent = document.getElementById('parent-concertMagic')
    while(parent.lastChild){ parent.removeChild(parent.lastChild) }

    const pw = parent.clientWidth
    const ph = parent.clientHeight


    const touchHandlerStart =(event)=> {
      let x = 0, y = 0

      const touchObject = event.changedTouches[0]
      const touchX = touchObject.pageX
      const touchY = touchObject.pageY

      // 要素の位置を取得
      const clientRect = parent.getBoundingClientRect()
      const positionX = clientRect.left + window.pageXOffset
      const positionY = clientRect.top + window.pageYOffset

      // 要素内におけるタッチ位置を計算
      x = touchX - positionX
      y = touchY - positionY

      let noteno = 60
      let velocity = 0

      if (event.touches && event.touches[0]) {
        noteno = 21 + Math.floor(x / clientRect.width * 88)
        velocity = Math.floor(Math.pow(1 - y / clientRect.height, 0.5) * 127)
        if (mainVm.EmbeddedMode) {
          KWM.playConcertMagic(noteno, velocity)
        } else {
          musicVm.m.concertmagic.trigger(velocity, noteno)
        }
      }
    }
    parent.addEventListener('touchstart', touchHandlerStart, { passive: true })

    const m = pw * this.mgn_w
    const bw = pw - m * 2
    const w = bw / (this.barnum * 2 - 1)

    //  バー群の追加
    for (var b = 0; b < this.barnum; b++) {
        // li要素を生成
        const bar = document.createElement('li')
        // classを追加
        bar.className = 'cm_indicator'
        const id = 'cm_indicator' + b
        bar.setAttribute('id', id)
        // 生成した要素を追加する
        parent.appendChild(bar)
        bar.style.left = m + w * 2 * b + 'px'
        bar.style.top = 0 + 'px'
        bar.style.width = w + "px"
        bar.style.height = ph + "px"
        bar.style.background = 'rgb(' + this.gray + ',' + this.gray + ',' + this.gray + ')'
    }

    //  透過マスク
    const elMask = document.createElement('div')
    elMask.setAttribute('id', 'cmMask')
    parent.appendChild(elMask)

    this.initialized = true
  },
  begin(){
    const interval =()=> {
      if (!this.initialized) { return }
      if (mainVm.EmbeddedMode) {
        if (PIANO.Music.Mode !== 'ConcertMagic') { return }
      } else {
        if (musicVm.m.status !== 'concertmagic') { return }
      }

      const date = new Date()
      const interval = date.getTime()
      const ms = interval - this.intervalBegin
      const cur = ms / this.msec
      const curBar = Math.min(Math.floor(cur * this.barnum), this.barnum - 1)
      if (this.bar === curBar) { return }
      this.bar = curBar
      const lightRgb =(rate)=> {
        const r = Math.floor((1 - rate) * this.gray + rate *   0)
        const g = Math.floor((1 - rate) * this.gray + rate * 239)
        const b = Math.floor((1 - rate) * this.gray + rate * 255)
        return 'rgb(' + r + ',' + g + ',' + b + ')'
      }

      for (var b = 0; b < this.barnum; b++) {
        const bar = document.getElementById('cm_indicator' + (this.count % 2 == 0 ? b : (this.barnum - 1 - b)))
        if (b == curBar) {
          bar.style.background = lightRgb(this.velocity / 127)
        } else {
          bar.style.background = this.success ? 'rgb(' + this.gray + ',' + this.gray + ',' + this.gray + ')' : 'rgb(167, 104, 69)'
        }
      }
    }
    // 遅延させないと、サイズが0になる
    const parent = document.getElementById('parent-concertMagic')
    if (parent.clientWidth == 0) { setTimeout(()=>{ this.init() }, 10) }

    this.count = 0
    this.idInterval = setInterval(interval, 30)
  },
  animate(obj){
    this.isAnimated = true
    const isSuccess = (obj.evaluation.success && obj.evaluation.advice === 'OK') ? true : false
    if (isSuccess) {
      this.success = true
      this.velocity = obj.triggeredVelocity
      this.msec = Math.max(obj.nextTriggerTime * 1000, 1)

      const date = new Date()
      this.intervalBegin = date.getTime()

      this.count++
    }
  },
  end(){
    if (this.idInterval) { clearInterval(this.idInterval) }
  },
}
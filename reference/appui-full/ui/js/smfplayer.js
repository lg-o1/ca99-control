const keyboardAnimation = {

  isInitialized: false,
  KeyMin: 21,  //88鍵
  KeyMax: 108,
  transitionNum: 0,
  notebars: [],
  notebaridx: 0,
  BarNum: null,
  mgn_h: 1,
  mgn_v: 0,
  mgn_c: 0.1,
  barwdh: null,
  noteBarMax: 1024,

  init() {

    if (this.isInitialized) { return }

    const playbar = document.getElementById('playbar')
    while (playbar.lastChild) { playbar.removeChild(playbar.lastChild) }

    this.BarNum = this.KeyMax - this.KeyMin + 1
    for (let i = 0; i < this.BarNum; i++) {
      // li要素を生成
      const li = document.createElement('li')
      // classを追加
      li.className = 'keybar'
      const barid = "keybar" + i
      li.setAttribute("id", barid)
      // 生成した要素を追加する
      playbar.appendChild(li);
      const bar = document.getElementById(barid)
      if (!bar) { return }
      bar.style.height = "0%"
      bar.style.top = this.mgn_v + 45 + '%'
      this.barwdh = (100 - this.mgn_h * 2 - this.mgn_c * (this.BarNum - 1)) / this.BarNum
      bar.style.left = this.mgn_h + (this.barwdh + this.mgn_c) * i + "%"
      bar.style.width = this.barwdh + "%"
      bar.style.background = "linear-gradient(#2B2D2 0%,#227A84 50%,#2B2D2C 100%)"
      bar.addEventListener('transitionend', ()=> {
          if (this.transitionNum > 0) { this.transitionNum-- }
      })
    }

    const elMask = document.createElement('div')
    elMask.setAttribute('id', 'keyMask')
    playbar.appendChild(elMask)

    this.isInitialized = true

  },
  animate(msg) {

    const playbar = document.getElementById('playbar')
    this.isInitialized = (playbar.childNodes.length) ? true : false

    if (!this.isInitialized) { this.init() }

    const type = msg[0] & 0xf0
    const isNoteOn = type == 0x90 && msg[2] > 0
    const isNoteOff = type == 0x80 || (type == 0x90 && msg[2] == 0)
    if (!isNoteOn && !isNoteOff) { return }

    const baridx = msg[1] - this.KeyMin;
    const barid = "keybar" + baridx
    const bar = document.getElementById(barid)
    if (!bar) { return }

    if (isNoteOff) {
      bar.style.background = "#0"
    } else {
      bar.style.background = "linear-gradient(#2B2D2 0%,#227A84 50%,#2B2D2C 100%)"
    }
    const vel = msg[2] / 127
    bar.style.top = this.mgn_v + 50 + (isNoteOff ? 0 :  - Math.floor((100 - this.mgn_v) * vel) / 2) + '%'
    bar.style.left = this.mgn_h + (this.barwdh + this.mgn_c) * baridx + "%"
    bar.style.height = isNoteOff ? '0px' : Math.floor((100 - this.mgn_v) * vel) + '%'

    const isHard = false
    const secOff = isHard ? 0.01 : 0.5
    const secOn = isHard ? 0 : 0.1
    if (isNoteOn)
        bar.style.transition = 0 + "s"
    bar.style.transition = (isNoteOff ? secOff : secOn) + "s"

    this.transitionNum++

    if (this.notebars[this.notebaridx] >= 0){
      const notebarid = "keybar" + this.notebars[this.notebaridx]
      const notebar = document.getElementById(notebarid)
      notebar.style.top = this.mgn_v + 50 + '%'
      notebar.style.height = "0px"
      notebar.style.transition = "0s"
    }
    this.notebars[this.notebaridx] = baridx
    this.notebaridx = (this.notebaridx + 1) % this.noteBarMax

  },
  reset(){
    this.notebars = null
    for (let i = 0; i < this.BarNum; i++){
      const barid = "keybar" + i
      const bar = document.getElementById(barid)
      if (!bar) { return }
      bar.style.top = this.mgn_v + 50 + '%'
      bar.style.height = "0%"
      bar.style.background = "#0"
      bar.style.transition = "1.0s"
    }
  }

}

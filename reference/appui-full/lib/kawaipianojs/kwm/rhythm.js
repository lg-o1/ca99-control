class Rhythm {

  constructor() {
    this._isPianoControl = (KWM.isEmbeddedMode) ? true : PIANO.Rhythm.isActive

    if (this._isPianoControl) {
      // SysEx受信の値をセット
      this._play = PIANO.Rhythm.Play
      this._mute = false
      this._mode = PIANO.Rhythm.Mode
      this._tempo = PIANO.Rhythm.Tempo
      this._volume = (PIANO.Rhythm.Volume.value) ? PIANO.Rhythm.Volume : {value: 74, valueType: "range", valueMin: 0, valueMax: 127}
      this._beat = PIANO.Rhythm.Beat || '4/4'
      this._pattern = PIANO.Rhythm.Pattern

      KWM.setMetronomeNativeAudio(false) // KWMcoreメトロノームをMIDIモードにセット
    } else {
      this._play = false
      this._mute = false
      this._mode = undefined // KWMcoreはリズムメトロノーム機能がないのでundefined
      this._tempo = {value: 120, valueType: "range", valueMin: 10, valueMax: 500}
      this._volume = {value: 74, valueType: "range", valueMin: 0, valueMax: 127}
      this._beat = '4/4'
      this._pattern = undefined // KWMcoreはリズムメトロノーム機能がないのでundefined

      KWM.setMetronomeNativeAudio(true) // KWMcoreメトロノームをAudioモードにセット
      KWM.setMetronomeVolume(Math.round(this._volume.value / 127))
      KWM.setMetronomeTempo(this._tempo.value)
      KWM.setMetronomeTimeSignature(Number(this._beat.split('/')[0]), Number(this._beat.split('/')[1]))
    }

    // UIリロード時等でなりっぱなしを防ぐため停止
    PIANO.set('Rhythm', 'Play', false)
    KWM.enableMetronome(false)
    // ミュート解除
    KWM.muteMetronome(false)

    // イベントハンドラー
    this._eventHandlers = []
    KWM.onMetronomeEvent((obj)=>{
      for (const item of this._eventHandlers) {
        if (item.type === 'beat') { item.handler(obj) }
      }
    })

  }

  get isPianoControl () {
    return this._isPianoControl
  }
  get play () {
    return this._play
  }
  set play (newVal) {
    this._play = newVal
    if (this._isPianoControl) {
      PIANO.set('Rhythm', 'Play', newVal)
      KWM.muteMetronome(newVal)
    } else {
      KWM.enableMetronome(newVal)
    }
  }
  get mute () {
    return this._mute
  }
  set mute (newVal) {
    this._mute = newVal
    if (this._isPianoControl) {
      const vol = (newVal) ? 0 : this._volume.value
      PIANO.set('Rhythm', 'Volume', {value: vol})
      KWM.setMetronomeVolume(Math.round(vol * 10 / 127) / 10)
    }
    KWM.muteMetronome(newVal)
  }
  get mode () {
    return this._mode
  }
  set mode (newVal) {
    if (this._isPianoControl) {
      this._mode = newVal
      PIANO.set ('Rhythm', 'Mode', newVal)
    } else {
      return
    }
  }
  get tempo () {
    return this._tempo
  }
  set tempo (newVal) {
    this._tempo.value = newVal
    if (this._isPianoControl) { PIANO.set('Rhythm', 'Tempo', {value: newVal}) }
    KWM.setMetronomeTempo(newVal) // KWMもテンポセットしないと録音テンポに反映されない
  }
  get volume () {
    return this._volume
  }
  set volume (newVal) {
    this._volume.value = newVal
    if (this._isPianoControl) { PIANO.set('Rhythm', 'Volume', {value: newVal}) }
    KWM.setMetronomeVolume(Math.round(newVal * 10 / 127) / 10)
  }
  get beat () {
    return this._beat
  }
  set beat (newVal) {
    this._beat = newVal
    if (this._isPianoControl) { PIANO.set('Rhythm', 'Beat', newVal) }
    const numra = Number(newVal.split('/')[0])
    const denom = Number(newVal.split('/')[1])
    KWM.setMetronomeTimeSignature(numra, denom) // KWMも拍子セットしないと録音拍子に反映されない
  }
  get pattern () {
    return this._pattern
  }
  set pattern (newVal) {
    if (this._isPianoControl) {
      this._pattern = newVal
      PIANO.set('Rhythm', 'Pattern', newVal)
      const numra = Number(newVal.beat.split('/')[0])
      const denom = Number(newVal.beat.split('/')[1])
      KWM.setMetronomeTimeSignature(numra, denom) // KWMも拍子セットしないと録音拍子に反映されない
    } else {
      return
    }
  }

  addEventListener(event, callback) {
    const id = new Date().getTime().toString()
    const eventObj = { id : id, type: event, handler: callback }
    this._eventHandlers.push(eventObj)
    return id
  }
  removeEventListener(id) {
    const i = this._eventHandlers.findIndex( (item)=> { return item.id === id } )
    if (i >= 0) { this._eventHandlers.splice(i, 1) }
  }

}
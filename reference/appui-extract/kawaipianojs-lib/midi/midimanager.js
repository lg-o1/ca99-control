const MIDI = new class {

  constructor() {
    this.IN = {
      NoteOn (data) {},
      NoteOff (data) {},
      NotePressure (data) {},
      ControlChange (data) {},
      ProgramChange (data) {},
      ChannelPressure (data) {},
      PitchBend (data) {},
      SystemExclusive (data) {},
      TimeCode (data) {},
      SongPosition (data) {},
      SystemRealtimeMessage (data) {},
    }

    this._isAvailable = false
    this._sendMidiMessage =(msg, id, time)=> {

      // MIDI送信処理
      if (this._api === "KWMcore"){
        KWM.sendMidiMessage(msg, id, time)
      } else {
        this._webmidi.sendMidiMessage(msg, id, time)
      }

      // ログ表示
      const log =()=>{
        if (id) {
          const i = this._devices.findIndex(item => item.id === id)
          if (KawaipianoJs.log.midiOut) { console.log('MIDI OUT  | ' + this._devices[i].name +' : ' + encode.getHexString(msg) + ' : ' + Date.now()) }
        } else {
          if (KawaipianoJs.log.midiOut) { console.log('MIDI OUT  | All : ' + encode.getHexString(msg) + ' : ' + Date.now()) }
        }
      }
      setTimeout(log(), 0)
    }
    this._handshake = {
      buffer : [],
      waitingAck : null,
      ackTimerId : null,
      counter : 0,
      init () {
        this.buffer.length = 0
        this.waitingAck = null
        this.counter = 0
        clearTimeout(this.ackTimerId)
      },
      send (msg, id) {
        if (this.waitingAck) {
          //Ack待ちの場合、バッファー末尾にメッセージを追加
          this.buffer.push(msg)
        } else {
          //バッファーが空の場合、メッセージをバッファーに追加して即送信
          if (this.buffer.length === 0 && msg) {
            this.buffer.push(msg)
          }
          const m = this.buffer[0]
          this.waitingAck = [ m[6], m[7], m[8] ].toString()
          MIDI._sendMidiMessage(m, id)
          this.ackTimer()
        }
      },
      resend () {
        this.counter ++
        if (this.counter < 16) {
          this.waitingAck = null
          this.send()
          if (KawaipianoJs.log.handshake) { console.warn("Handshake retry | " +  this.counter + "time") }
        } else {
          this.init()
          if (KawaipianoJs.log.handshake) { console.error("Handshake failed | ", {unsentMsg: this.buffer}) }
          PIANO.set('Sync', false, null, true)
        }
      },
      ackTimer () {
        this.ackTimerId = setTimeout(()=>{ this.resend() }, 1000)
      },
      callback (msg) {
        if (this.buffer.length) {
          const onAckID = [ msg[6], msg[7], msg[8] ].toString()
          if (this.waitingAck === onAckID) {
            this.buffer.shift()
            this.waitingAck = null
            this.counter = 0
            clearTimeout(this.ackTimerId)
            if (this.buffer.length) {
              this.send()
            } else {
              if (KawaipianoJs.log.handshake) { console.log("Handshake finished") }
            }
          }
        }
      }
    }
    this._eventHandlers = [
      {
        id : null,
        type: 'deviceState',
        handler () { console.log('MIDI.onDeviceStateChange : %c' + MIDI.API, `color: skyblue`) }
      }
    ]
    this._onReady =()=> {
      for (const item of this._eventHandlers) {
        if (item.type === 'ready') { item.handler() }
      }
    }
    this._onDeviceStateChange =()=> {
      for (const item of this._eventHandlers) {
        if (item.type === 'deviceState') { item.handler() }
      }
    }
    this._onMidiMessage =(msg, id, time)=> {
      for (const item of this._eventHandlers) {
        if (item.type === 'midiMessage') { item.handler(msg, id, time) }
      }
    }

    const onMidi =(msg, id, time)=> {
      parser.midiMessage(msg, id, time)
      this._onMidiMessage(msg, id, time)
      const log =()=>{
        if (KawaipianoJs.log.midiIn) {
          const i = this._devices.findIndex(item => item.id === id)
          const name = (i >= 0) ? this._devices[i].name : id
          console.log('MIDI IN   | ' + name +' : ' + encode.getHexString(msg))
        }
      }
      setTimeout(log(), 0)
    }

    KWM.invoke().then((mode)=> {
      this._api = 'KWMcore'
      this._devices = KWM.devices
      KWM.onDeviceStateChange =()=> { this._onDeviceStateChange() }
      KWM.onMidiMessage =(msg, id, time)=> { onMidi(msg, id, time) }
      KWM.onSmfMidiMessage =(msg, time)=> { onMidi(msg, 'KWMcore', time) }
      this.bluetooth = new BluetoothMIDI()
      this._isAvailable = true
      this._onReady()
      console.log ('%c [Kawaipiano.js] KWMcore ' + mode, 'color: ' + KawaipianoJs.log.color)
    }).catch(()=>{
      this._api = 'WebMIDI'

      const success =()=> {
        this._devices = this._webmidi.devices
        this._webmidi.onStatusChange(()=> { this._onDeviceStateChange() })
        this._webmidi.onMidiMessage =(msg, id, time)=> { onMidi(msg, id, time) }
        this._isAvailable = true
        this._onReady()
        console.log ('%c [Kawaipiano.js] Web MIDI API Mode', 'color: ' + KawaipianoJs.log.color)
      }
      const error =()=> {
        console.error ('[Kawaipiano.js] No MIDI API')
      }
      this._webmidi = new WebMidi (success, error)
    })
  }

  get isAvailable () {
    return this._isAvailable
  }
  get API () {
    return this._api
  }
  get DEVICES () {
    if (this._api === 'KWMcore') {
      this._devices = KWM.devices
    } else {
      this._devices = this._webmidi.devices
    }
    return this._devices
  }
  get isBuffering () {
    return (this._handshake.buffer.length) ? true : false
  }

  OUT (msg, id, time) {
    if(!msg) { return }

    // 配列が数値型ではない場合修正
    const numArrayCheck = encode.tools.isMatchAllType('number', msg)
    if (!numArrayCheck) {
      console.error('MIDI配列が数値型ではないため修復しました', msg)
      let fixedMsg = []
      for (const n of msg) { fixedMsg.push(Number(n)) }
      msg = fixedMsg
    }

    // idが存在しない場合はundefinedに
    const deviceExists = this._devices.find(item => item.id === id)
    if (!deviceExists) { id = undefined }

    const kawaiSysExMsg = (msg[0] === 0xF0 && msg[1] === 0x40 && [0x03, 0x05, 0x09, 0x10].includes(msg[3]) && PIANO.HandshakeSupport) ? true : false

    if (kawaiSysExMsg) {
      this._handshake.send(msg, id)
    } else {
      this._sendMidiMessage(msg, id, time)
    }
  }
  initBuffer () {
    this._handshake.init()
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
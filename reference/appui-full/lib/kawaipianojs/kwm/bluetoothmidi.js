class BluetoothMIDI {

  constructor() {
    this._id = undefined
    this._name = undefined
    this._pairing = false
    this._window = undefined
    this._offset = undefined
    this._clockFilter = undefined
    this._firmware = undefined
    this.init()
    MIDI.addEventListener( 'deviceState', ()=>this.init()　)
  }

  get id () {
    return this._id
  }
  get window () {
    return this._window
  }
  set window (newVal) {
    if (newVal) {
      KWM.openBleMidiWindow()
    } else {
      KWM.closeBleMidiWindow()
    }
    this._window = newVal
  }
  get name () {
    return this._name
  }
  set name (newVal) {
    const id = this.id
    const parsedBytes = encode.getCodePoints(newVal)
    const dataByte = [...parsedBytes,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0].slice(0, 16)
    MIDI.OUT([0xF0, 0x00, 0x02, 0x08, 0x10, 0x55, 0x00, 0x01, ...dataByte, 0xF7], id)
    this._name = newVal
  }
  get pairing () {
    return this._pairing
  }
  set pairing (newVal) {
    const window = KWM.isBleMidiWindowShown // KWMcoreネイティブ対応後削除
    if (window) { KWM.closeBleMidiWindow() } // KWMcoreネイティブ対応後削除
    KWM.autoConnectBleMidi(newVal)
    if (window) { KWM.openBleMidiWindow() } // KWMcoreネイティブ対応後削除
    this._pairing = newVal
  }
  get offset () {
    return this._offset
  }
  set offset (newVal) {
    const id = this.id
    this.checkQs()
    const time = Number( (newVal >= 0 && newVal <= 127) ? newVal : 0 )
    MIDI.OUT([0xF0, 0x00, 0x02, 0x08, 0x10, 0x55, 0x00, 0x02, time, 0x00, 0xF7], id)
    this._offset = time
  }
  get clockFilter () {
    return this._clockFilter
  }
  set clockFilter (newVal) {
    const id = this.id
    this.checkQs()
    const isOn = (newVal) ? 0x00 : 0x01
    MIDI.OUT([0xF0, 0x00, 0x02, 0x08, 0x10, 0x55, 0x01, 0x00, isOn, 0xF7], id)
    this._clockFilter = newVal
  }
  get firmware () {
    return this._firmware
  }

  init() {
    const kawaiDevice = MIDI.DEVICES.find (item => item.id === PIANO.DeviceID)
    const pairedDevice = MIDI.DEVICES.find (item => item.driver === 'QS-BLE')
    const connectedDevice = MIDI.DEVICES.find (item => item.driver === 'BLE-MIDI')
    if (kawaiDevice) {
      this._id = kawaiDevice.id
      this._name = kawaiDevice.name
      this._pairing = kawaiDevice.driver === 'QS-BLE'
    } else if (pairedDevice) {
      this._id = pairedDevice.id
      this._name = pairedDevice.name
      this._pairing = true
    } else if (connectedDevice) {
      this._id = connectedDevice.id
      this._name = connectedDevice.name
      this._pairing = false
    } else {
      this._id = undefined
      this._name = undefined
      this._pairing = false
    }
    this._window = KWM.isBleMidiWindowShown
    this.getQsInfo()
  }
  getQsInfo () {
    if (!this._id) {
      this._offset = 0
      this._clockFilter = false
      this._firmware = undefined
      return
    }

    const firmwareCallback =(msg)=> {
      const responsMsgHeader = msg.slice(0, 8).toString()
      const checker = [0xF0, 0x00, 0x02, 0x08, 0x10, 0x55, 0x20, 0x04].toString()
      if (responsMsgHeader === checker) {
        const dataBytes = msg.slice(8, -1)
        const modelName = encode.getText(dataBytes)
        this._firmware = modelName
        MIDI.removeEventListener(firmwareHandlerId)
        MIDI.OUT([0xF0, 0x00, 0x02, 0x08, 0x10, 0x55, 0x10, 0x05, 0x00, 0xF7], this._id)

        appController.connectViaQs()
      }
    }
    const offsetCallback =(msg)=> {
      const responsMsgHeader = msg.slice(0, 8).toString()
      const checker = [0xF0, 0x00, 0x02, 0x08, 0x10, 0x55, 0x20, 0x05].toString()
      if (responsMsgHeader === checker) {
        // this._offset = msg[8]
        // Fix: BLE-MIDI モジュールが壊れる問題の対策のため、常に timestamp 無効にする
        const delay = msg[8]
        if (delay !== 0) {
          // timestamp が有効になっていたら無効にする
          MIDI.OUT([0xF0, 0x00, 0x02, 0x08, 0x10, 0x55, 0x00, 0x02, 0x00, 0x00, 0xF7], this._id)
        }
        this._offset = 0
        this._clockFilter = false
        MIDI.removeEventListener(offsetHandlerId)
      }
    }
    const firmwareHandlerId = MIDI.addEventListener('midiMessage', firmwareCallback)
    const offsetHandlerId = MIDI.addEventListener('midiMessage', offsetCallback)

    MIDI.OUT([0xF0, 0x00, 0x02, 0x08, 0x10, 0x55, 0x10, 0x04, 0x00, 0xF7], this._id)
    setTimeout(()=>{
      if (this.firmware === undefined) {
        this._offset = 0
        this._clockFilter = false
        MIDI.removeEventListener(firmwareHandlerId)
        MIDI.removeEventListener(offsetHandlerId)
      }
    }, 500)

  }
  checkQs () {
    if (!this._firmware) { throw new Error ('Bluetooth MIDI Device is not Qs firmware.') }
  }
  disconnectDevices () {
    const id = this.id
    this.checkQs()
    MIDI.OUT([0xF0, 0x00, 0x02, 0x08, 0x10, 0x55, 0x7F, 0x01, 0x01, 0xF7], id)
  }
  gotoDfuMode () {
    const id = this.id
    this.checkQs()
    MIDI.OUT([0xF0, 0x00, 0x02, 0x08, 0x10, 0x55, 0x7F, 0x00, 0x01, 0xF7], id)
  }
  update (progressCallback, confirmHandler) {
    return new Promise ((resolve)=> {
      const id = this.id
      const progress =(status)=> {
        if (progressCallback) {
          progressCallback(status)
        } else {
          console.log ('BluetoothMIDI update', status)
        }
      }
      if (!KWM.isAvailable || KWM.isEmbeddedMode || this.pairing || !this.id) {
        progress('noupdate')
        resolve()
        return
      }

      progress('update check')
      KWM.getDeviceBleMidiVersion(id)
        .then((obj)=>{
          console.log(obj)
          if (!obj.isUpdateAvailable) {
            progress('noupdate')
            resolve()
            return
          }

          const onProgress =(e)=> {
            if (e.errno) {
              progress('error')
              resolve()
            } else if (e.complete) {
              progress('completed')
            } else {
              progress(e.progress)
            }
          }

          const ok =()=> {
            progress('downloading')
            KWM.downloadBleMidiFirmware(id)
            .then(()=>{
              progress('updating')
              KWM.updateBleMidiFirmware(id, onProgress)
            })
            .catch(()=> {
              progress('noupdate')
              resolve()
              return
            })
          }
          const cancel =()=> {
            progress('cancel')
            resolve()
            return
          }
          if (confirmHandler) { confirmHandler(ok, cancel) } else { ok() }

        })
        .catch(()=>{

          progress('noupdate')
          resolve()
          return

        })
    })
  }

}
class WebMidi {

  constructor(resolve, reject) {
    navigator.requestMIDIAccess({sysex: true}).then(
      // WebMIDI API is available
      (access)=>{
        this._midiAccess = access
        this._devices = []
        this._input = []
        this._output = []
        this._onMidiMessage =()=> {}
        this._log = false
        this._init()
        if (resolve) { resolve() }
      },
      // WebMIDI API is unavailable
      (msg)=>{
        if (reject) { reject() }
        console.warn("Web MIDI API is not supported. " + msg)
      }
    )
  }

  get devices () {
    return this._devices
  }
  set onMidiMessage (newVal) {
    if (typeof newVal !== 'function') { return }
    this._onMidiMessage = newVal
  }
  set log (newVal) {
    this._log = newVal
  }
  get log () {
    return this._log
  }

  _init () {
    // get IO port info
    this._input = []
    this._output = []
    const inputs = this._midiAccess.inputs.values()
    const outputs = this._midiAccess.outputs.values()
    for (let i = inputs.next(); !i.done; i = inputs.next()) { this._input.push(i.value) }
    for (let o = outputs.next(); !o.done; o = outputs.next()) { this._output.push(o.value) }
    // make device list
    for (const item of this._output) { this._devices.push( { name:item.name, id:item.id }) }
    // set MIDI IN handler
    const onmidimessage =(midievent)=> {
      const i = this._input.findIndex(item => item.id === midievent.target.id)
      const msg = Array.from(midievent.data)
      const id = this._output[i].id
      const time = midievent.timeStamp
      const deviceName = midievent.target.name
      this._onMidiMessage (msg, id, time)
      if (this._log) { console.log("WebMIDI IN   | " + deviceName +" : " + this._getHexString(msg)) }
    }
    for (const i of this._input) { i.onmidimessage = onmidimessage }
  }
  _getHexString (numArray) {
    if (numArray) {
      return numArray.map(function(val){return '0x' + ('00' + val.toString(16).toUpperCase()).substr(-2)})
    }
  }

  onStatusChange (callback) {
    const onstatuschange =(e)=> {
      // privent duplicated fire by IN and OUT port
      if (e.port.type === 'output') {
        this._init()
        callback()
      }
    }
    this._midiAccess.onstatechange =(e)=> { onstatuschange(e) }
  }
  sendMidiMessage (msg, id, time) {
    if (id === undefined){
      for (const o of this._output) { o.send(msg, time) }
      if (this._log) { console.log("WebMIDI OUT  | All : " + this._getHexString(msg)) }
    } else {
      const i = this._output.findIndex(item => item.id === id)
      if (i === -1) {
        console.warn("MIDI device ID ["  + id + "] is not existing.")
      } else {
        this._output[i].send(msg, time)
        if (this._log) { console.log("WebMIDI OUT  | " + this._output[i].name +" : " + this._getHexString(msg)) }
      }
    }
  }

}
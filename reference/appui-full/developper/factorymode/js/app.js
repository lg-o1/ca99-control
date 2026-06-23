const GPLIST = ['ATX4GP', 'AURES2GP', 'NV10S']
const UPLIST = ['ATX4UP', 'AURES2UP', 'NV5S']

new Vue({

  el: '#app',

  data: {
    prevDataType: '',
    waitTimer: '',
    isLoading: false,
    model: '',
    version: '',
    destination: '',
    PIANO: [],
    UI: {
      page: -1,
      modes: [
        { title: 'LCD', completed: false },
        { title: 'Pedal, Volume, Keyboard', completed: false  },
        { title: 'Effect, Reverb', completed: false },
        { title: 'TG All Channel', completed: false },
        { title: 'L/R', completed: false },
        { title: 'EQ Level', completed: false },
        { title: 'USB device, Bluetooth Audio', completed: false },
        { title: 'Max Touch', completed: false },
        { title: 'Tone Check', completed: false },
        { title: 'Keyboard S1, S2, S3, A/D Raw Value', completed: false },
        { title: 'WAVE CheckSum', completed: false },
        { title: 'All Key On', completed: false },
        { title: 'Key Adjust', completed: false },
        { title: 'Touch Select', completed: false },
        { title: 'Touch Calibration', completed: false },
        { title: 'ProgramROM checksum', completed: false }
      ],
      lcd: {
        isTapped: [ false, false, false, false ],
        isDeadPixelOverlayShown: false
      },
      pedal: {
        damper: '---', sostenute: '---', soft: '---'
      },
      volume: {
        main: '---', linein: '---'
      },
      key: {
        port: '', no: '---', velocity: '---'
      },
      tgAllChannell: { isPlay: false, btntxt: 'CHECK'},
      checkLR: {isL:false, Lbtntxt:'CHECK', isR:false, Rbtntxt:'CHECK'},
      eqLevel: {
        isSpeakerEQ: true,
        isMute: false,
        isEq1: false,
        hz1:'100',
        btn1txt:'CHECK',
        isEq2: false,
        hz2:'400',
        btn2txt:'CHECK',
        isEq3: false,
        hz3:'1.2k',
        btn3txt:'CHECK',
        isEq4: false,
        hz4:'4.0k',
        btn4txt:'CHECK'
      },
      usbDevice: { type: '---' },
      bluetoothAudio: { type: '---' },
      keyNumber: { Num:'---', S1: '---', S2: '---', S3: '---' },
      allKeyOn: { result: '---', key1: '---', key2: '---', key3: '---', key4: '---' },
      keyAdjust: { keyNo: '---', value: '---' },
      selectedTouchCurve: '',
      touchCurveSaveButton: false,
      modelType: '',
      touchCurveData: [
        { byte: 0x00, model: 'K-15E', type: 'upright' },
        { byte: 0x01, model: 'K-200', type: 'upright' },
        { byte: 0x02, model: 'K-300/400', type: 'upright' },
        { byte: 0x03, model: 'K-500/700', type: 'upright' },
        { byte: 0x04, model: 'K-600/800', type: 'upright' },
        { byte: 0x00, model: 'GX-1', type: 'grand' },
        { byte: 0x01, model: 'GX-2', type: 'grand' },
        { byte: 0x02, model: 'GX-3', type: 'grand' },
        { byte: 0x03, model: 'GX-5', type: 'grand' },
        { byte: 0x04, model: 'GX-6', type: 'grand' },
        { byte: 0x05, model: 'GX-7', type: 'grand' },
      ],
      selectedTimbreIndex: 0,
      selectedTimbreName: '',
      selectedTimbreCategory: '',
    },
    checkSum: {
      ctr: 0,
      tmpCheckSum: '',
      waveRom: [
        { name: 'ROM1', add: '---', checkSum: '---' },
        { name: 'ROM2', add: '---', checkSum: '---' },
        { name: 'ROM3', add: '---', checkSum: '---' },
        { name: 'ROM4', add: '---', checkSum: '---' }
      ],
      progRom: [
        { name: 'BootProgram', checkSum: '---' },
        { name: 'MainProgram', checkSum: '---' },
        { name: 'UserMemory', checkSum: '---' },
        { name: 'AT TouchAdjust', checkSum: '---' },
        { name: 'unused_1', checkSum: '---' },
        { name: 'unused_2', checkSum: '---' },
        { name: 'TouchCalib.', checkSum: '---' },
        { name: 'unused_3', checkSum: '---' },
        { name: 'RecorderData', checkSum: '---' }
      ],
    },
    buffer: '',
  },

  computed: {
    isAvailable () {
      return this.isLoading === false
    }
  },

  created: function(){
    this.isLoading = false
    const successInvoke =()=> {
      this.isLoading = false
      appController.setSysInfo('MemoryAddress', '')
      appController.setSysInfo('Checksum', '')
      this.PIANO = PIANO
      this.model = PIANO.Model
      this.version = PIANO.Version
      this.destination = PIANO.Destination.name


      MIDI.IN.NoteOff = (data) => {
        //   data.ch;
        //   data.note_num;
        //   data.velocity;
        //   data.device;

        // Fix: NoteOnに合せ、こちらもchをチェックしない: kawa.: 2019.10.29
        // if (data.ch !== 15) { return; }

        if (this.UI.page === 9) {
          this.UI.keyNumber.S1 = 'OFF'
          this.UI.keyNumber.Num = data.note_num
        }
      }
      MIDI.IN.NoteOn = (data) => {
        // data.ch;
        // data.note_num;
        // data.velocity;
        // data.device;

        // Fix: chが0になってた: kawa.: 2019.10.29
        // if (data.ch !== 15) { return; }

        if (this.UI.page === 1) {
          this.UI.key.no = data.note_num
          this.UI.key.velocity = data.velocity
        }
        else if (this.UI.page === 9) {
          this.UI.keyNumber.S3 = 'ON'
          this.UI.keyNumber.Num = data.note_num
        }
      }
      MIDI.IN.NotePressure = (data) => {
      //   data.ch;
      //   data.note_num;
      //   data.value;
      //   data.device;

        if (this.UI.page === 12) {
          this.UI.keyAdjust.keyNo = (data.note_num === 0x7F) ? 'ALL' : data.note_num
          this.UI.keyAdjust.value = data.value -64
        }
      }
      MIDI.IN.ControlChange = (data) => {
      //   data.ch;
      //   data.type;
      //   data.value;
      //   data.device;

        if (this.UI.page === 13) {
          const selectedTouchCurve = this.UI.touchCurveData.filter(item => {
            return item.byte === data.value && item.type === this.UI.modelType
          })
          this.UI.selectedTouchCurve = selectedTouchCurve[0].model
        }

        // Fix: NoteOnに合せ、こちらもchをチェックしない: kawa.: 2019.10.29
        // if (data.ch !== 15) { return; }

        // 全部処理しようとすると表示が遅れるので、間が開くまで待ってみる
        const updateValue = (data) => {
          switch (data.type) {
            case 0x40:  // damper
              if ([1, 9].includes(this.UI.page)) {
                this.UI.pedal.damper = data.value
              }
              break;
              
            case 0x42:  // sostenute
              if ([1, 9].includes(this.UI.page)) {
                this.UI.pedal.sostenute = data.value
              }
              break;
  
            case 0x43:  // soft
              if ([1, 9].includes(this.UI.page)) {
                this.UI.pedal.soft = data.value
              }
              break;
  
            case 0x07:  // volume.main
              if ([1, 9].includes(this.UI.page)) {
                this.UI.volume.main = data.value
              }
              break;
  
            case 0x10:  // volume.linein
              if ([1, 9].includes(this.UI.page)) {
                this.UI.volume.linein = data.value
              }
              else if (this.UI.page === 12) {
                this.UI.keyAdjust.keyNo = (data.value === 0x7F) ? 'ALL' : data.note_num
                this.UI.keyAdjust.value = 'UP'
              }
              break;
  
            case 0x11:  // key.port, usbDevice.type, allKeyOn.result
              if (this.UI.page === 1) {
                this.UI.key.port = (data.value === 0x00) ? 'MIDI' : 'USB'
              }
              else if (this.UI.page === 6) {
                switch (data.value) {
                  case 0: this.UI.usbDevice.type = "No set";  break;
                  case 1: this.UI.usbDevice.type = "USB memory";  break;
                  case 2: this.UI.usbDevice.type = "FDD"; break;
                  default:  this.UI.usbDevice.type = "error" + data.value;  break;
                }
              }
              else if (this.UI.page === 11) {
                this.UI.allKeyOn.result = (data.value === 0x00) ? 'OK' : 'Error'
              }
              else if (this.UI.page === 12) {
                this.UI.keyAdjust.keyNo = (data.value === 0x7F) ? 'ALL' : data.note_num
                this.UI.keyAdjust.value = 'DOWN'
              }
              break;
  
            case 0x13:  // bluetoothAudio.type
              switch (data.value) {
                case 0: this.UI.bluetoothAudio.type = "No set"; break;
                case 1: this.UI.bluetoothAudio.type = "Product";  break;
                case 2: this.UI.bluetoothAudio.type = "FactoryA"; break;
                case 3: this.UI.bluetoothAudio.type = "FactoryB"; break;
                default:  this.UI.bluetoothAudio.type = "error" + data.value; break;
              }
              break;
  
            case 0x50:  // keyNumber.S1, allKeyOn.key1
              if (this.UI.page === 9) {
                this.UI.keyNumber.S1 = 'ON'
                this.UI.keyNumber.Num = data.value
              }
              else if (this.UI.page === 11) {
                this.UI.allKeyOn.key1 = data.value
              }
              break;
  
            case 0x51:  // keyNumber.S2, allKeyOn.key2
              if (this.UI.page === 9) {
                this.UI.keyNumber.S2 = 'ON'
                this.UI.keyNumber.Num = data.value
              }
              else if (this.UI.page === 11) {
                this.UI.allKeyOn.key2 = data.value
              }
              break;
  
            case 0x52:  // keyNumber.S3, allKeyOn.key3
              if (this.UI.page === 9) {
                this.UI.keyNumber.S2 = 'OFF'
                this.UI.keyNumber.Num = data.value
              }
              else if (this.UI.page === 11) {
                this.UI.allKeyOn.key3 = data.value
              }
              break;
  
            case 0x53:  // keyNumber.S4, allKeyOn.key4
              if (this.UI.page === 9) {
                this.UI.keyNumber.S3 = 'OFF'
                this.UI.keyNumber.Num = data.value
              }
              else if (this.UI.page === 11) {
                this.UI.allKeyOn.key4 = data.value
              }
              break;
  
            default:
              break;
          }
        }

        if (KWM.isEmbeddedMode) {
          if (data.type === this.prevDataType) {
            if (this.waitTimer) clearTimeout(this.waitTimer)
            this.waitTimer = setTimeout(() => updateValue(data), 100)
          } else {
            updateValue(data)
          }
          this.prevDataType = data.type
        } else {
          updateValue(data)
        }
      }

      if (GPLIST.includes(this.model)) {
        this.UI.modelType = 'grand'
      } else if  (UPLIST.includes(this.model)) {
        this.UI.modelType = 'upright'
      }

    }
    const errorInvoke =(e)=> {
      console.error(e)
    }
    MIDI.addEventListener('ready', ()=>{
      KawaipianoJs.invoke({sync: 'identify'}).then(successInvoke).catch((e)=> errorInvoke(e))
    })
    MIDI.addEventListener('deviceState', ()=>{
      if (MIDI.API ==='KWMcore' && MIDI.bluetooth.window) { MIDI.bluetooth.window = false }
      if (MIDI.API ==='KWMcore') { location.reload() }  // MIDIクラスで対処したい
    })
  },

  methods: {
    /* 
     * select page
     */
    selectPage(index) {
      this.UI.page = index;
    },

    nextPage() {
      nextPage = this.UI.page + 1;
      if (nextPage > this.UI.modes.length - 1)  nextPage = 0;
      this.UI.page = nextPage;
    },
    
    /* 
     * complete
     */
    complete(page) {
      this.UI.modes[page].completed = true;
    },

    tapComplete() {
      this.complete(this.UI.page);
      if (this.UI.page === 13) { this.UI.page = -1 } else { this.nextPage() }
    },
    
    /* 
     * LCD
     */
    tapLCDButton(index) {
      // this.UI.lcd.isTapped[index] = !this.UI.lcd.isTapped[index];
      this.$set(this.UI.lcd.isTapped, index, !this.UI.lcd.isTapped[index]);
    },
    showDeadPixel() {
      this.UI.lcd.isDeadPixelOverlayShown = true;
    },
    hideDeadPixel() {
      this.UI.lcd.isDeadPixelOverlayShown = false;
    },
    
    /* 
     * Effect, Reverb
     */
    checkEffect() {
      MIDI.OUT([0xBF, 0x10, 0x7F])
    },

    checkReverb() {
      MIDI.OUT([0xBF, 0x11, 0x7F])
    },
    
    /* 
     * TG All Channel
     */
    checkTGAllChannel() {
      if (this.UI.tgAllChannell.isPlay === false) {
        MIDI.OUT([0xBF, 0x10, 0x01])
        this.UI.tgAllChannell.isPlay = true
        this.UI.tgAllChannell.btntxt = 'STOP'
      } else {
        MIDI.OUT([0xBF, 0x10, 0x00])
        this.UI.tgAllChannell.isPlay = false
        this.UI.tgAllChannell.btntxt = 'CHECK'
      }
    },
    
    /* 
     * L/R
     */
    checkL() {
      if (this.UI.checkLR.isR === true) {
        // Rの発音を停止
        this.checkR()
      }

      if (this.UI.checkLR.isL === false) {
        if (this.UI.page === 4) MIDI.OUT([0xBF, 0x10, 0x7F])
        this.UI.checkLR.isL = true
        this.UI.checkLR.Lbtntxt = 'STOP'
      } else {
        // ページ切替のリセット処理で、MIDI出力しないようにする
        if (this.UI.page === 4) MIDI.OUT([0xBF, 0x10, 0x00])
        this.UI.checkLR.isL = false
        this.UI.checkLR.Lbtntxt = 'CHECK'
      }
    },

    checkR() {
      if (this.UI.checkLR.isL === true) {
        // Lの発音を停止
        this.checkL()
      }

      if (this.UI.checkLR.isR === false) {
        if (this.UI.page === 4) MIDI.OUT([0xBF, 0x11, 0x7F])
        this.UI.checkLR.isR = true
        this.UI.checkLR.Rbtntxt = 'STOP'
      } else {
        // ページ切替のリセット処理で、MIDI出力しないようにする
        if (this.UI.page === 4) MIDI.OUT([0xBF, 0x11, 0x00])
        this.UI.checkLR.isR = false
        this.UI.checkLR.Rbtntxt = 'CHECK'
      }
    },
    
    /* 
     * EQ Level
     */
    turnSpeakerEQ() {
      if (this.UI.eqLevel.isSpeakerEQ === false) {
        MIDI.OUT([0xBF, 0x10, 0x01])
        this.UI.eqLevel.isSpeakerEQ = true
      } else {
        MIDI.OUT([0xBF, 0x10, 0x00])
        this.UI.eqLevel.isSpeakerEQ = false
      }
    },

    turnMute() {
      if (this.UI.eqLevel.isMute === false) {
        MIDI.OUT([0xBF, 0x11, 0x00])
        this.UI.eqLevel.isMute = true
      } else {
        MIDI.OUT([0xBF, 0x11, 0x01])
        this.UI.eqLevel.isMute = false
      }
    },

    check1Hz() {
      this.stopAll
      if (this.UI.eqLevel.isEq1 === false) {
        MIDI.OUT([0xBF, 0x50, 0x7F])
        this.UI.eqLevel.isEq1 = true
        this.UI.eqLevel.btn1txt = 'STOP'

        MIDI.OUT([0xBF, 0x51, 0x00])
        this.UI.eqLevel.isEq2 = false
        this.UI.eqLevel.btn2txt = 'CHECK'

        MIDI.OUT([0xBF, 0x52, 0x00])
        this.UI.eqLevel.isEq3 = false
        this.UI.eqLevel.btn3txt = 'CHECK'

        MIDI.OUT([0xBF, 0x53, 0x00])
        this.UI.eqLevel.isEq4 = false
        this.UI.eqLevel.btn4txt = 'CHECK'
      } else {
        MIDI.OUT([0xBF, 0x50, 0x00])
        this.UI.eqLevel.isEq1 = false
        this.UI.eqLevel.btn1txt = 'CHECK'
      }
    },

    check2Hz() {
      this.stopAll
      if (this.UI.eqLevel.isEq2 === false) {
        MIDI.OUT([0xBF, 0x50, 0x00])
        this.UI.eqLevel.isEq1 = false
        this.UI.eqLevel.btn1txt = 'CHECK'

        MIDI.OUT([0xBF, 0x51, 0x7F])
        this.UI.eqLevel.isEq2 = true
        this.UI.eqLevel.btn2txt = 'STOP'

        MIDI.OUT([0xBF, 0x52, 0x00])
        this.UI.eqLevel.isEq3 = false
        this.UI.eqLevel.btn3txt = 'CHECK'

        MIDI.OUT([0xBF, 0x53, 0x00])
        this.UI.eqLevel.isEq4 = false
        this.UI.eqLevel.btn4txt = 'CHECK'
      } else {
        MIDI.OUT([0xBF, 0x51, 0x00])
        this.UI.eqLevel.isEq2 = false
        this.UI.eqLevel.btn2txt = 'CHECK'
      }
    },

    check3Hz() {
      this.stopAll
      if (this.UI.eqLevel.isEq3 === false) {
        MIDI.OUT([0xBF, 0x50, 0x00])
        this.UI.eqLevel.isEq1 = false
        this.UI.eqLevel.btn1txt = 'CHECK'

        MIDI.OUT([0xBF, 0x51, 0x00])
        this.UI.eqLevel.isEq2 = false
        this.UI.eqLevel.btn2txt = 'CHECK'

        MIDI.OUT([0xBF, 0x52, 0x7F])
        this.UI.eqLevel.isEq3 = true
        this.UI.eqLevel.btn3txt = 'STOP'

        MIDI.OUT([0xBF, 0x53, 0x00])
        this.UI.eqLevel.isEq4 = false
        this.UI.eqLevel.btn4txt = 'CHECK'
      } else {
        MIDI.OUT([0xBF, 0x52, 0x00])
        this.UI.eqLevel.isEq3 = false
        this.UI.eqLevel.btn3txt = 'CHECK'
      }
    },

    check4Hz() {
      this.stopAll
      if (this.UI.eqLevel.isEq4 === false) {
        MIDI.OUT([0xBF, 0x50, 0x00])
        this.UI.eqLevel.isEq1 = false
        this.UI.eqLevel.btn1txt = 'CHECK'

        MIDI.OUT([0xBF, 0x51, 0x00])
        this.UI.eqLevel.isEq2 = false
        this.UI.eqLevel.btn2txt = 'CHECK'

        MIDI.OUT([0xBF, 0x52, 0x00])
        this.UI.eqLevel.isEq3 = false
        this.UI.eqLevel.btn3txt = 'CHECK'
  
        MIDI.OUT([0xBF, 0x53, 0x7F])
        this.UI.eqLevel.isEq4 = true
        this.UI.eqLevel.btn4txt = 'STOP'
      } else {
        MIDI.OUT([0xBF, 0x53, 0x00])
        this.UI.eqLevel.isEq4 = false
        this.UI.eqLevel.btn4txt = 'CHECK'
      }
    },
    /* 
     * USB device, Bluetooth Audio
     */
    checkUSBDevice() {
      MIDI.OUT([0xBF, 0x10, 0x00])
    },

    checkBluetoothAudio() {
      MIDI.OUT([0xBF, 0x12, 0x00])
    },

    setBluetoothProduct() {
      MIDI.OUT([0xBF, 0x12, 0x01])
    },

    setBluetoothFactA() {
      MIDI.OUT([0xBF, 0x12, 0x02])
    },

    setBluetoothFactB() {
      MIDI.OUT([0xBF, 0x12, 0x03])
    },
    
    /* 
     * Max Touch, Tone Check
     */
    nextTone() {
      let nextIndex = this.UI.selectedTimbreIndex + 1
      if (nextIndex > PRESET.Timbre.length - 1) nextIndex = 0
      this.sendProgramChange( nextIndex )
    },

    prevTone() {
      let prevIndex = this.UI.selectedTimbreIndex - 1
      if (prevIndex < 0)  prevIndex = PRESET.Timbre.length - 1
      this.sendProgramChange( prevIndex )
    },

    selectPiano() {
      this.sendProgramChange( 0 )
    },

    selectChurchOrgan() {
      this.sendProgramChangeWithName('Church Organ')
    },

    skipTone() {
      skipIndex = this.UI.selectedTimbreIndex + 10
      if (skipIndex > PRESET.Timbre.length - 1) skipIndex = 0
      this.sendProgramChange( skipIndex )
    },

    skipBackTone() {
      skipIndex = this.UI.selectedTimbreIndex - 10
      if (skipIndex < 0)  skipIndex = PRESET.Timbre.length - 1
      this.sendProgramChange( skipIndex )
    },

    sendProgramChange (index) {
      const obj = PRESET.Timbre[index]
      console.log(obj)
      this.UI.selectedTimbreIndex = index
      this.UI.selectedTimbreName = obj.name
      const type = DATABASE.Sound.filter((item) => {return (item.id) === obj.id})[0].type
      this.UI.selectedTimbreCategory = type
      MIDI.OUT([0xBF, 0x00, obj.msb])
      MIDI.OUT([0xBF, 0x20, obj.lsb])
      MIDI.OUT([0xCF, obj.pc])
    },

    sendProgramChangeWithName (name) {
      const obj = PRESET.Timbre.find((tim) => tim.name === name)
      console.log(obj)
      this.UI.selectedTimbreIndex = PRESET.Timbre.findIndex((tim) => tim === obj)
      this.UI.selectedTimbreName = obj.name
      const type = DATABASE.Sound.filter((item) => {return (item.id) === obj.id})[0].type
      this.UI.selectedTimbreCategory = type
      MIDI.OUT([0xBF, 0x00, obj.msb])
      MIDI.OUT([0xBF, 0x20, obj.lsb])
      MIDI.OUT([0xCF, obj.pc])
    },

    /* 
     * WaveROM / ProgramROM CheckSum
     */
    cancelCalcCheckSum() {
      MIDI.OUT([0xBF, 0x10, 0x00])
      unwatch()
      appController.setSysInfo('MemoryAddress', '')
      appController.setSysInfo('Checksum', '')
    },
    startWatchingWaveRomCheckSum () {
      this.checkSum.ctr = 0
      this.tmpCheckSum = ''
      this.checkSum.waveRom.forEach((rom) => {
        rom.add = '---'
        rom.checkSum = '---'
      })
      const callback = (newVal) => {
        this.checkSum.waveRom[this.checkSum.ctr].add = newVal.MemoryAddress || '---'
        const hasCheckSumReceived = newVal.Checksum !== this.checkSum.tmpCheckSum
        if (hasCheckSumReceived) {
          this.checkSum.waveRom[this.checkSum.ctr].checkSum = newVal.Checksum
          this.checkSum.tmpCheckSum = newVal.Checksum
          this.checkSum.ctr++
          if (this.checkSum.ctr >= this.checkSum.waveRom.length) unwatch()
        }
      }
      this.setWatcher ('PIANO.Parameters.System', callback)
    },
    startWatchingPrgRomCheckSum () {
      this.checkSum.ctr = 0
      this.tmpCheckSum = ''
      this.checkSum.progRom.forEach((rom) => {
        rom.checkSum = '---'
      })
      const callback = (newVal) => {
        this.checkSum.progRom[this.checkSum.ctr].checkSum = newVal.Checksum || '---'
        this.checkSum.ctr++
        if (this.checkSum.ctr >= this.checkSum.progRom.length) unwatch()
      }
      this.setWatcher('PIANO.Parameters.System', callback)
    },
    setWatcher (item, callback) {
      unwatch = this.$watch (item, function(newVal, oldVal) {
        callback (newVal, oldVal)
      },{deep: true})
    },
    
    /* 
     * All Key On
     */
    checkAllKeyOn() {
      this.UI = {...this.UI, allKeyOn: {result: '---', key1: '---', key2: '---', key3: '---', key4: '---' }}
      MIDI.OUT([0xBF, 0x10, 0x00])
    },
    
    /* 
     * Key Adjust
     */
    saveKeyAdjust() {
      MIDI.OUT([0xBF, 0x50, 0x00])
    },
    
    /* 
     * Touch Select
     */
    selectTouchCurve(item) {
      MIDI.OUT([0xBF, 0x10, item.byte])
      if (this.UI.selectedTouchCurve !== item.model) {
        this.UI.selectedTouchCurve = item.model
        this.UI.touchCurveSaveButton = true
      }
    },

    saveTouchCurve() {
      this.UI.touchCurveSaveButton = false
      MIDI.OUT([0xBF, 0x50, 0x00])
    },

    /*
     * Touch Calibration
     */
    _touchCalMsgFromParam (param) {
      const MIDI_MSG = {
        'ResetCOEF': [0xBF, 0x10, 0x00],
        'CalcCOEFAVG': [0xBF, 0x10, 0x10],
        'CalcCOEFLSQ': [0xBF, 0x10, 0x20],
        'SendCOEF': [0xBF, 0x12, 0x00],
        'SaveCOEF': [0xBF, 0x50, 0x00],
        'ResetTOUCH': [0xBF, 0x11, 0x00],
        'SendTOUCH': [0xBF, 0x13, 0x00],
        'undefined': []
      }
      return MIDI_MSG[param] || MIDI_MSG['undefined']
    },
    clkResetCOEF () {
      const msg = this._touchCalMsgFromParam('ResetCOEF')
      MIDI.OUT(msg)
    },
    clkCalcCOEFAVG () {
      const msg = this._touchCalMsgFromParam('CalcCOEFAVG')
      MIDI.OUT(msg)
    },
    clkCalcCOEFLSQ () {
      const msg = this._touchCalMsgFromParam('CalcCOEFLSQ')
      MIDI.OUT(msg)
    },
    clkSendCOEF () {
      const msg = this._touchCalMsgFromParam('SendCOEF')
      MIDI.OUT(msg)
    },
    clkSaveCOEF () {
      const msg = this._touchCalMsgFromParam('SaveCOEF')
      MIDI.OUT(msg)
    },
    clkResetTOUCH () {
      const msg = this._touchCalMsgFromParam('ResetTOUCH')
      MIDI.OUT(msg)
    },
    clkSendTOUCH () {
      const msg = this._touchCalMsgFromParam('SendTOUCH')
      MIDI.OUT(msg)
    },

    /*
     * Pedal Calibration
     */
    _pedalCalMsgFromParam (param) {
      const MIDI_MSG = {
        'CalcAndSaveTable': [0xBF, 0x13, 0x00],
        'ResetSample': [0xBF, 0x11, 0x00],
        'undefined': []
      }
      return MIDI_MSG[param] || MIDI_MSG['undefined']
    },
    clkCalcAndSaveTable () {
      const msg = this._pedalCalMsgFromParam('CalcAndSaveTable')
      MIDI.OUT(msg)
    },
    clkResetSample () {
      const msg = this._pedalCalMsgFromParam('ResetSample')
      MIDI.OUT(msg)
    },

  },
  watch: {
    'UI.page': function(newVal, oldVal) {
      if (newVal !== -1) { PIANO.set('Mode', 'FactoryMode_Mode' + newVal) }
      if (oldVal === 3 && this.UI.tgAllChannell.isPlay === true) { this.checkTGAllChannel() }
      if (oldVal === 4 && this.UI.checkLR.isL === true ) { this.checkL() }
      if (oldVal === 4 && this.UI.checkLR.isR === true ) { this.checkR() }
      if (oldVal === 5 && this.UI.eqLevel.isEq1 === true ) { this.check1Hz() }
      if (oldVal === 5 && this.UI.eqLevel.isEq2 === true ) { this.check2Hz() }
      if (oldVal === 5 && this.UI.eqLevel.isEq3 === true ) { this.check3Hz() }
      if (oldVal === 5 && this.UI.eqLevel.isEq4 === true ) { this.check4Hz() }
      if (newVal === 5) {
        this.UI.eqLevel.isSpeakerEQ === true
        this.UI.eqLevel.isMute === false
      }
      if (newVal === 7 || newVal === 8) { this.sendProgramChange( 0 ) }
      // WaveROM/ProgramROM checksum
      if (newVal === 10) { this.startWatchingWaveRomCheckSum () }
      if (oldVal === 10) { this.cancelCalcCheckSum() }
      if (newVal === 15) { this.startWatchingPrgRomCheckSum() }
      if (oldVal === 15) { this.cancelCalcCheckSum() }
    },
    deep: true
  }
})

//MDC初期化
window.mdc.autoInit()
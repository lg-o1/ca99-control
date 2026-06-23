const recWorker = {

  midi: {
    send: {
      exitMusicMode: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x1D,0x7F,0x00,0xF7],
      internalRecMode: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x1D,0x7F,0x02,0xF7],
      usbRecMode: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x1D,0x7F,0x03,0xF7],
      concertMagicMode: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x1D,0x7F,0x05,0xF7],
      formatWav: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x0C,0x7F,0x00,0xF7],
      formatMp3: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x0C,0x7F,0x01,0xF7],
      usbNewSong: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x1C,0x7F,0x00,0xF7],
      usbOverdubbing: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x1C,0x7F,0x01,0xF7],
      usbConvert: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x1C,0x7F,0x02,0xF7],
      stop: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x08,0x7F,0x00,0xF7],
      play: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x08,0x7F,0x01,0xF7],
      reset: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x08,0x7F,0x02,0xF7],
      standby: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x08,0x7F,0x03,0xF7],
      recording: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x08,0x7F,0x04,0xF7],
      deleteAll: [0xF0,0x40,0x7F,0x32,0x08,0x02,0x52,0x21,0x7F,0x7F,0x7F,0x7F,0x7F,0xF7],
      standby_Int_Song0_Part0: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F,0x02,0x7F,0x7F,0x00,0x00,0x00,0x03,0xF7],
      standby_Int_Song0_Part1: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F,0x02,0x7F,0x7F,0x00,0x00,0x01,0x03,0xF7],
      standby_Int_Song1_Part0: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F,0x02,0x7F,0x7F,0x00,0x01,0x00,0x03,0xF7],
      standby_Int_Song1_Part1: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F,0x02,0x7F,0x7F,0x00,0x01,0x01,0x03,0xF7],
      standby_Int_Song2_Part0: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F,0x02,0x7F,0x7F,0x00,0x02,0x00,0x03,0xF7],
      standby_Int_Song2_Part1: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F,0x02,0x7F,0x7F,0x00,0x02,0x01,0x03,0xF7],
      standby_Usb_Wav_New: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F,0x03,0x00,0x00,0x7F,0x7F,0x7F,0x03,0xF7],
      standby_Usb_mp3_New: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F,0x03,0x01,0x00,0x7F,0x7F,0x7F,0x03,0xF7],
      standby_Usb_Wav_Overdub: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F,0x03,0x00,0x01,0x7F,0x7F,0x7F,0x03,0xF7],
      standby_Usb_mp3_Overdub: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F,0x03,0x01,0x01,0x7F,0x7F,0x7F,0x03,0xF7],
      standby_Usb_Wav_Convert_Song0: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F,0x03,0x00,0x02,0x00,0x00,0x7F,0x03,0xF7],
      standby_Usb_mp3_Convert_Song0: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F,0x03,0x01,0x02,0x00,0x00,0x7F,0x03,0xF7],
      standby_Usb_Wav_Convert_Song1: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F,0x03,0x00,0x02,0x00,0x01,0x7F,0x03,0xF7],
      standby_Usb_mp3_Convert_Song1: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F,0x03,0x01,0x02,0x00,0x01,0x7F,0x03,0xF7],
      standby_Usb_Wav_Convert_Song2: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F,0x03,0x00,0x02,0x00,0x02,0x7F,0x03,0xF7],
      standby_Usb_mp3_Convert_Song2: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F,0x03,0x01,0x02,0x00,0x02,0x7F,0x03,0xF7],
      wavOverdub: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F,0x03,0x00,0x01,0x7F,0x7F,0x7F,0x03,0xF7],
      mp3Overdub: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F,0x03,0x01,0x01,0x7F,0x7F,0x7F,0x03,0xF7],
      mStandby: [],
    },
    reply: {
      modeChanged: ['exitMusicMode', 'internalRecMode', 'usbRecMode', 'concertMagicMode'],
      formatChanged: ['formatWav', 'formatMp3'],
      overdubChanged: ['usbNewSong', 'usbOverdubbing', 'usbConvert'],
      statusChanged: [
        'stop',
        'play',
        'reset',
        'standby',
        'recording',
        'standby_Int_Song0_Part0',
        'standby_Int_Song0_Part1',
        'standby_Int_Song1_Part0',
        'standby_Int_Song1_Part1',
        'standby_Int_Song2_Part0',
        'standby_Int_Song2_Part1',
        'standby_Usb_Wav_New',
        'standby_Usb_mp3_New',
        'standby_Usb_Wav_Overdub',
        'standby_Usb_mp3_Overdub',
        'standby_Usb_Wav_Convert',
        'standby_Usb_mp3_Convert',
        'standby_Usb_Wav_Convert_Song0',
        'standby_Usb_mp3_Convert_Song0',
        'standby_Usb_Wav_Convert_Song1',
        'standby_Usb_mp3_Convert_Song1',
        'standby_Usb_Wav_Convert_Song2',
        'standby_Usb_mp3_Convert_Song2',
        'wavOverdub',
        'mp3Overdub',
        'mStandby'
      ],
      songLoadCompleted: ['intSong', 'recPart'],
      completed: ['usbSong','saveUsb', 'delete', 'deleteCurrentUsb', 'deleteAll']
    }
  },
  statusWaitTime: 1000,
  completeWaitTime: 30000,
  filePath: [],
  intSongNo: [],
  intSongPart: [],
  canUseBuff: true,
  isUSBMode: false,
  isFileLoading: false,
  ////////////////////
  ////インターフェース////
  ///////////////////
  init (playback) {
    this.destroyEventHandlers()
    WebWorker.workers.recorder.postMessage({
      class: 'handshake',
      mode: 'recorder',
      method: 'initQueue',
      val: {}
    })
    setTimeout(() => {
      this.canUseBuff = true
      const seq = (playback) ? ['reset', 'exitMusicMode'] : ['exitMusicMode']
      this.sendMsgs(seq)
    }, 10)
  },
  clearBuffHandler() {
    this.destroyEventHandlers()
    WebWorker.workers.recorder.postMessage({
      class: 'handshake',
      mode: 'recorder',
      method: 'initQueue',
      val: {}
    })
    setTimeout(() => {
      this.canUseBuff = true
      const mode = PIANO.MusicMode
      PIANO[mode].isBusy = false
    }, 10)
  },
  selectIntSong (songNum, part, playback) {
    this.intSongNo.push(songNum) 
    this.intSongPart.push(part)
    const seq = (playback) ? ['reset','exitMusicMode', 'internalRecMode', 'intSong', 'recPart'] : ['exitMusicMode', 'internalRecMode', 'intSong', 'recPart']
    this.sendMsgs(seq)
  },
  selectUsbSong (path, playback) {
    this.filePath.push(path) 
    const seq = (playback) ? ['reset','exitMusicMode', 'usbRecMode', 'usbSong'] : ['exitMusicMode', 'usbRecMode', 'usbSong']
    this.sendMsgs(seq)
  },
  setConcertMagicMode (playback) {
    const seq = (playback) ? ['reset','concertMagicMode'] : ['concertMagicMode']
    this.sendMsgs(seq)
  },
  play () {
    this.sendMsgs(['play'])
  },
  stop () {
    this.sendMsgs(['stop'])
  },
  reset () {
    this.sendMsgs(['reset'])
  },
  standby (mode, obj) {
    if (mode === 'int') {
      this.intSongNo.push(obj.songNum)
      this.intSongPart.push(obj.part)
      this.sendMsgs(['internalRecMode', 'intSong', 'recPart', 'standby'])
    } else if (mode === 'mp3') {
      this.sendMsgs(['usbRecMode', 'formatMp3', 'usbNewSong', 'standby'])
    } else {
      this.sendMsgs(['usbRecMode', 'formatWav', 'usbNewSong', 'standby'])
    }
  },
  overdub (mode, obj) {
    if (typeof obj === 'object') {
      this.intSongNo.push(obj.songNum)
      this.intSongPart.push(obj.part)
    }
    let seq = []
    if (mode === 'int') {
      seq.push ('intOverdub') 
    } else {
      const cmd = (typeof obj === 'object') ? mode + 'Convert' : mode + 'Overdub'
      seq.push (cmd)  
    }
    this.sendMsgs(seq)
  },
  recording () {
    this.sendMsgs(['recording'])
  },
  save (path) {
    this.filePath.push(path) 
    this.sendMsgs(['reset', 'saveUsb', 'exitMusicMode'])
  },
  delete (songNum) {
    this.intSongNo.push(songNum)
    const seq = (songNum === 'All') ? ['reset', 'deleteAll', 'exitMusicMode'] 
    : (songNum === 'Current') ? ['reset', 'deleteCurrentUsb', 'exitMusicMode'] 
    : ['reset', 'delete', 'exitMusicMode']
    this.sendMsgs(seq)
  },

  // 複合メッセージ導入・RecControlモード導入後の関数
  selectSong (strage, path, needReset, callback) {
    this.isFileLoading = true
    if (strage === 'internal') {
      if (callback) { this.onFileLoad =(result)=> { callback(result) } }
      const song = Number(path.split('/')[1])
      const part = (Number(path.split('/')[2]) === 0) ? 0 : 0x7F
      this.selectIntSong (song, part, needReset)
    } else {
      if (callback) { this.onFileLoad =(result)=> { callback(result) } }
      this.selectUsbSong (path, needReset)
    }
  },
  changePlayerStatus (func, arg) {

    if (func === 'init') {
      // PIANO本体再生状態チェック
      const playback = (['init', 'stop'].includes(PIANO.Music.Status)) ? false : true
      this.init(playback)

    } else if (func === 'stop') {
      this.stop()

    } else if (func === 'play') {
      if (arg) { this.onPlayDone =()=> { arg() } }
      this.play()
    }

  },
  changeRecStatus (func, arg) {

    // PIANO本体再生状態チェック
    const playback = (['init', 'stop', 'overdub'].includes(PIANO.RecControl.Status)) ? false : true

    if (func === 'init') {
      const preventMidiSend = arg
      if (!preventMidiSend) { this.init(playback) } else { this.clearBuffHandler() }

    } else if (func === 'stop') {
      this.reset()

    } else if (func === 'overdub') {
      if (arg) {
        if (PIANO.RecControl.Selected.attribute === 'kso') {
          const songNum = Number(arg.filePath.split('/')[1])
          const part = (Number(arg.filePath.split('/')[2]) === 0) ? 0 : 0x7F
          this.selectIntSong(songNum, part, playback)
        } else {
          this.selectUsbSong (arg.filePath, playback)
        }
      } else {
        this.reset()
        PIANO.RecControl = { ...PIANO.RecControl, isBusy: false }
      }

    } else if (func === 'standby') {
      if (arg) { 
        this.onRecStart =()=> { arg.onRecording() }
        this.onRecDone =()=> { arg.onComplete() }
      }

      const attribute = PIANO.RecControl.Selected.attribute
      const overdub = PIANO.RecControl.Selected.overdub
      const path = PIANO.RecControl.Selected.filePath

      const format = PIANO.RecControl.Format
      const mode = 
          (overdub && format !== 'internal' && attribute !== 'kso') ? 'overdub'
        : (overdub && format === 'internal' && attribute === 'kso') ? 'overdub'
        : (overdub && format !== 'internal' && attribute === 'kso') ? 'convert'
        : 'new'
      const songNum = (format === 'internal' || mode === 'convert') ? Number(path.split('/')[1]) : null
      const part = (Number(PIANO.RecControl.Selected.filePath.split('/')[2]) === 0) ? 0x00 : 0x7F

      const bytes = {
        head: [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x23,0x7F],
        internal : {
          new: [0x02,0x7F,0x7F,0x00,songNum,0x00],
          overdub: [0x02,0x7F,0x7F,0x00,songNum,0x01],
        },
        wav : {
          new: [0x03,0x00,0x00,0x7F,0x7F,0x7F],
          overdub: [0x03,0x00,0x01,0x7F,0x7F,0x7F],
          convert: [0x03,0x00,0x02,0x00,songNum,part]
        },
        mp3 : {
          new: [0x03,0x01,0x00,0x7F,0x7F,0x7F],
          overdub: [0x03,0x01,0x01,0x7F,0x7F,0x7F],
          convert: [0x03,0x01,0x02,0x00,songNum,part]            
        },
        end: [0x03, 0xF7],
      }
      this.midi.send.mStandby = [ ...bytes.head, ...bytes[format][mode], ...bytes.end ]
      console.log({ RecFormat: format, RecMode: mode })

      this.sendMsgs(['mStandby'])
      
    } else if (func === 'recording') {
      this.recording()

    } else if (func === 'complete') {
      this.reset()

    } else if (func === 'play' || func === 'overdubPlay') {
      if (arg) { this.onPlayDone =()=> { arg() } }
      this.play()

    } else if (func === 'save') {
      // USbレコーダーの場合、ピアノ本体へ保存処理命令発行
      if (arg !== null) { this.save(arg) } else { this.init(playback) }

    } else if (func === 'delete') {
      if (arg === 'All') {
        recWorker.delete('All')

      } else if (arg === 'Current') {
        recWorker.delete('Current')
      } else if (arg === 'CurrentInt') {
        this.init(playback)
      } else {
        if (arg.split('/')[0] === 'internal') {
          recWorker.delete(Number(arg.split('/')[1]))
        } else {
          //USBメモリー楽曲削除
        }
      }
    }

  },
  ////////////////////

  onMidiMessage (recMsg, m) {
    if (window.Worker && WebWorker.enable) {
      if (this.isUSBMode) {
        if (recMsg !== 'songLoadCompleted') {
          this.wOnReply(recMsg)
        } else {
          console.log('This message is Maxtime on USB mode.')
        }
      } else {
        this.wOnReply(recMsg)
      }
    } else {
      this.onReply(recMsg, m)
    }

    const mode = PIANO.MusicMode
    const status = PIANO[mode].Status
    if (recMsg === 'statusChanged' && !mode.isBusy) {
      const result = 
        (m[9] === 0x00) ? 'stop'
      : (m[9] === 0x01) ? 'play' 
      : (m[9] === 0x02) ? 'reset' 
      : (m[9] === 0x03) ? 'recstandby' 
      : (m[9] === 0x04) ? 'recording' 
      : false

      if (result === 'reset' && status === 'play' || result === 'reset' && status === 'overdubPlay') {
        console.log('%c再生自動停止',　'color: orange; font-size: 16px')
        this.onPlayDone()
      } else if  (result === 'recording' && status === 'standby') {
        console.log('%c録音自動開始',　'color: orange; font-size: 16px')
        this.onRecStart()
      } else if (result === 'reset' && status === 'recording') {
        console.log('%c録音自動停止',　'color: orange; font-size: 16px')
        this.onRecDone()
      }

    }
  },
  onReply (recMsg, m) { console.log('%c要確認 | 想定外タイミングのリプライ', 'color: orange', recMsg, m) },
  onPlayDone () { console.warn('callback関数未登録') },
  onRecStart () { console.warn('callback関数未登録') },
  onRecDone () { console.warn('callback関数未登録') },
  onFileLoad (result) { console.warn('callback関数未登録', result) },
  destroyEventHandlers () {
    this.onPlayDone =()=> { console.warn('callback関数未登録') }
    this.onRecStart =()=> { console.warn('callback関数未登録') }
    this.onRecDone =()=> { console.warn('callback関数未登録') }
    this.onFileLoad =(result)=> { console.warn('callback関数未登録', result) }
  },
  sendMsg (msg) {
    return new Promise ((resolve)=> {

      this.onReply =(recMsg)=> {
        if (this.midi.reply[recMsg].includes(msg)) {
          console.log('%cOK | 処理完了:' + msg,　'color: blue; font-size: 16px')
          clearTimeout(timer)
          resolve(true)
        }
      }

      const time = (this.midi.reply.statusChanged.includes(msg) || this.midi.reply.songLoadCompleted.includes(msg)) ? this.statusWaitTime : this.completeWaitTime
      const timer = setTimeout(()=> {
        if (msg === 'reset') { resolve(true) }
        console.error('%cNG | リプライ無し: '+ msg, 'font-size: 16px')
        resolve(false)
      }, time)

      console.log('%cMIDI送信| ' + msg, 'font-size: 16px')
      if (msg === 'usbSong') {
        this.usbSongSelect()
      } else if (msg === 'saveUsb') {
        this.saveUsb()
      } else if (msg === 'intSong') {
        const songNum = (typeof (this.intSongNo[0]) === 'Number') ? this.intSongNo[0] : Number(this.intSongNo[0])
        MIDI.OUT([0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x00,0x7F,0x00,0x00,songNum,0xF7])
      } else if (msg === 'recPart') {
        const songNum = (typeof (this.intSongPart[0]) === 'Number') ? this.intSongPart[0] : Number(this.intSongPart[0])
        MIDI.OUT([0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x01,0x7F,songNum,0xF7])
      } else if (msg === 'delete') {
        const songNum = (typeof (this.intSongNo[0]) === 'Number') ? this.intSongNo[0] : Number(this.intSongNo[0])
        MIDI.OUT([0xF0,0x40,0x7F,0x32,0x08,0x02,0x52,0x21,0x7F,0x04,0x00,songNum,0x7F,0xF7])
      } else {
        MIDI.OUT(this.midi.send[msg])
      }
    })
  },
  usbSongSelect() {
    const midis = DATABASE.getMidi('FileAccess', {filePath:this.filePath[0] , value: 'FileSelectRequest' })
    if (window.Worker && WebWorker.enable) {
      const dummyMsg = 'dummy'
      return [...midis, dummyMsg]
    } else {
      for (const midi of midis) { MIDI.OUT(midi) }
    }
  },
  saveUsb() {
    const data = {
      value: 'FileRenameRequest',
      oldFilePath: 'kawairectempfile.tmp',
      newFilePath: this.filePath[0]
    }
    console.log('ファイルオブジェクト', data)
    const midis = DATABASE.getMidi('FileAccess', data)
    if (window.Worker && WebWorker.enable) {
      return [...midis, 'dummy']
    } else {
      for (const midi of midis) { MIDI.OUT(midi) }
    }
  },
  deleteCurrentUsb() {
    data = {
      value: 'FileDeleteRequest',
      filePath: 'kawairectempfile.tmp'
    }
    const midis = DATABASE.getMidi('FileAccess', data)
    if (window.Worker && WebWorker.enable) {
      return [...midis, 'dummy']
    } else {
      for (const midi of midis) { MIDI.OUT(midi) }
    }
  },
  sendMsgs (seq) {
    if (this.canUseBuff) {
      this.canUseBuff = false
    } else {
      return
    }
    console.log('Sequence: ', seq)
    const wRecorder = WebWorker.workers.recorder
    if (window.Worker && WebWorker.enable) {
      let midiMsg
      seq.forEach((msg) => {
        this.isUSBMode = (msg === 'usbSong') ? true : false
        if (msg === 'usbSong') {
          midiMsg = this.usbSongSelect()
        } else if (msg === 'saveUsb') {
          midiMsg = this.saveUsb()
        } else if (msg === 'intSong') {
          const songNum = (typeof (this.intSongNo[0]) === 'Number') ? this.intSongNo[0] : Number(this.intSongNo[0])
          midiMsg = [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x00,0x7F,0x00,0x00,songNum,0xF7]
        } else if (msg === 'recPart') {
          const songNum = (typeof (this.intSongPart[0]) === 'Number') ? this.intSongPart[0] : Number(this.intSongPart[0])
          midiMsg = [0xF0,0x40,0x7F,0x10,0x08,0x02,0x52,0x01,0x7F,songNum,0xF7]
        } else if (msg === 'delete') {
          const songNum = (typeof (this.intSongNo[0]) === 'Number') ? this.intSongNo[0] : Number(this.intSongNo[0])
          midiMsg = [0xF0,0x40,0x7F,0x32,0x08,0x02,0x52,0x21,0x7F,0x04,0x00,songNum,0x7F,0xF7]
        } else if (msg === 'deleteCurrentUsb') {
          midiMsg = this.deleteCurrentUsb()
        } else {
          midiMsg = this.midi.send[msg]
        }
        const waitTime = (this.midi.reply.statusChanged.includes(msg) || this.midi.reply.songLoadCompleted.includes(msg)) ? this.statusWaitTime : this.completeWaitTime
        wRecorder.postMessage({
          class: 'handshake',
          mode: 'recorder',
          method: 'enqueue',
          val: {msg: midiMsg, ack: true, wait: waitTime}
        })
      })
    } else {
      if (seq.length === 1) {
        this.sendMsg(seq[0]).then((result)=> { this.end(result) })
      } else {
        this.sendMsg(seq[0]).then(()=> {
          if(seq[1]) { this.sendMsg(seq[1]).then((result)=> {
            if(seq[2]) { this.sendMsg(seq[2]).then((result)=> {
              if(seq[3]) { this.sendMsg(seq[3]).then((result)=> {
                if(seq[4]) { this.sendMsg(seq[4]).then((result)=> {
                  if(seq[5]) { this.sendMsg(seq[5]).then((result)=> {
                    if(seq[6]) { this.sendMsg(seq[6]).then((result)=> {
                      if(seq[7]) { this.sendMsg(seq[7]).then((result)=> {
                        if(seq[8]) { this.sendMsg(seq[8]).then((result)=> {
                          if(seq[9]) { this.sendMsg(seq[9]).then((result)=> {
                            this.end(result)
                          })} else { this.end(result) }
                        })} else { this.end(result) }
                      })} else { this.end(result) }
                    })} else { this.end(result) }
                  })} else { this.end(result) }
                })} else { this.end(result) }
              })} else { this.end(result) }
            })} else { this.end(result) }
          })} else { this.end(result) }
        }).catch (()=> { console.error('error') })
      }
    }
  },
  end (result) {
    this.filePath.length = 0
    this.intSongNo.length = 0
    this.intSongPart.length = 0
    this.isUSBMode = false
    this.canUseBuff = true

    const mode = PIANO.MusicMode
    const status = PIANO[mode].Status
    PIANO[mode].isBusy = false

    if (result) {
      if (this.isFileLoading) { 
        this.isFileLoading = false
        this.onFileLoad(true) 
      }
      console.log('%cOK | 処理完了: mode = ' + mode + '  status = ' + status,　'color: blue; font-size: 16px')  
    } else {
      if (this.isFileLoading) {
        this.isFileLoading = false
        this.onFileLoad(false)
      }
      if (PIANO.MusicMode === 'Music' && ['Player','Lesson','ConcertMagic'].includes(PIANO.Music.Mode) ) { return }
      PIANO.onPianoError('recWorkerError')
      console.log('%cNG | エラー発生: mode = ' + mode + '  status = ' + status,　'color: red; font-size: 16px')  
    }
  },

  /**
   * Worker methods
   */

  wOnReply (recMsg) {
    if (recMsg === 'error') {
      this.end(false)
      return
    }

    // if (this.midi.reply[recMsg].includes(this.lastMsg)) {
      WebWorker.workers.recorder.postMessage({
        class: 'handshake',
        mode: 'recorder',
        method: 'post',
        val: {msg: 'ack'}
      })
    // }
  },
  toggleWorker() {
    this.worker = (this.worker) ? false : true
    WebWorker.enable = (WebWorker.enable) ? false : true
  }
}

const recTest = new Vue ({
  el: '#rectest',
  data: {
    sequence: [],
    fileName: '',
    fileAttribute: 'mp3',
  },
  computed: {
    sendItem: ()=> {
      const dataArray = []
      Object.keys(recWorker.midi.send).forEach((item)=>{ dataArray.push({name: item}) })
      dataArray.push({name: 'intSong'}, {name: 'recPart'}, {name: 'usbSong'}, {name: 'saveUsb'}, {name: 'delete'})
      return dataArray
    }
  },
  mounted: function () {
    //Kawaipiano.js起動
    const launchCallback =(result, msg)=> {
      console.groupEnd()
      console.log(msg)
    }
    const syncCallback =(result, msg)=> {
      console.groupEnd()
      console.log(msg)
      this.getUsbMemoryStatus()
    }
    KawaipianoJs.setOption({ mode: 'Sync', launchCallback: launchCallback, syncCallback: syncCallback })
    console.groupCollapsed('Kawaipiano.js Launch Sequence Log')

  },
  methods: {
    // USBメモリー状態取得
    getUsbMemoryStatus () {
      return new Promise ((resolve, reject)=> {
        PIANO.onHandshakeEnd =(msg)=> {if (msg[0] === 0x51, msg[1] === 0x2E) { resolve() }　else { reject() } }
        MIDI.OUT([0xF0, 0x40, 0x7F, 0x02, 0x08, 0x02, 0x51, 0x2E, 0x7F, 0xF7]) // USB Memory Status Request
      })      
    },

    usbSongSelect(msg) {
      const i = Number(msg.slice(-1)) - 1
      if(PIANO.ExternalStrage.length === 0) {
        console.error('USBメモリーに曲がありません')
        return
      }
      const fileObj = PIANO.ExternalStrage[i]
      console.log('選択曲オブジェクト: ', {...fileObj, value: 'FileSelectRequest'})
      const midis = DATABASE.getMidi('FileAccess', {...fileObj, value: 'FileSelectRequest' })
      if (window.Worker && WebWorker.enable) {
        return midis
      } else {
        for (const midi of midis) { MIDI.OUT(midi) }
      }
    },

    addTestItem (item) {
      if(item.name === 'saveUsb') {
        this.fileName = prompt('保存する曲の名前を入力してくださーーいっ')
        const path = this.fileName + '.' + this.fileAttribute
        const obj = {
          name: this.fileName,
          attribute: this.fileAttribute,
          filePath: path,
          isSaved: true,
          inPiano: true,
          isUSBMusicPlayer: true,
        }
        PIANO.ExternalStrage.push(obj)

        recWorker.filePath.push(path)
        console.log(path)
      } else if (item.name === 'formatWav') {
        this.fileAttribute = 'wav'
      } else if (item.name === 'formatMp3') {
        this.fileAttribute = 'mp3'
      } else if (item.name === 'usbSong') {
        const i = prompt('PIANO.ExternalStrageの配列番号を入力してくださいましー')
        const path = PIANO.ExternalStrage[i].filePath
        recWorker.filePath.push(path)
        console.log(path)
      } else if (item.name === 'intSong') {
        const i = prompt('曲番号を0~9の間で入力してください')
        recWorker.intSongNo.push(i)
        console.log('内蔵曲ソング選択', i)
      } else if (item.name === 'recPart') {
        const i = prompt('0 or 1 or 127を入力してください。(0=新規録音, 1=オーバーダブ, 127=全パート)')
        recWorker.intSongPart.push(i)
        console.log('内蔵曲パート選択', i)
      } else if (item.name === 'delete') {
        const i = prompt('曲番号を0~9の間で入力してください')
        recWorker.intSongNo.push(i)
        console.log('内蔵曲ソング選択', i)
      }
      if (this.sequence.length < 10) {
        this.sequence.push(item.name)
      } else {
        console.error('10メッセージ以上は非対応です')
      }
    },

    start () {
      recWorker.sendMsgs(this.sequence)
    },
    
    clear () {
      this.sequence = []
      this.fileName = ''
    },
  }
})
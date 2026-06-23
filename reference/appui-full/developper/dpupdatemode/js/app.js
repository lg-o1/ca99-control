new Vue({

  el: '#app',

  data: {
    isLoading: true,
    PIANO: [],
    UI: {
      page: '',
      fwUpdate: {
        // statusCode: 0,
        // statusList: ['Writing',   // statusCode: 0
        //              'Boot End',  // statusCode: 1
        //              'File not found', 'No Device',  // statusCode: 2-3
        //              'Insert USB Memory'],  // statusCode: 4
        curStatus: '',
        status: {
          insertUsbMemory: { 
            msg: 'Insert USB Memory', 
            sysEx: [] 
          },
          writing: { 
            msg: 'Writing', 
            sysEx: [] 
          },
          bootEnd: { 
            msg: 'Update completed!', 
            sysEx: [0xF0, 0x40, 0x7F, 0x7E, 0x04, 0x1E, 0x03, 0x00, 0x01, 0x7D, 0xF7] 
          },
          fileNotFound: { 
            msg: 'File not found', 
            sysEx: [0xF0, 0x40, 0x7F, 0x7E, 0x04, 0x1E, 0x03, 0x00, 0x00, 0x56, 0xF7] 
          },
          noDevice: {
            msg: 'No Device', 
            sysEx: [0xF0, 0x40, 0x7F, 0x7E, 0x04, 0x1E, 0x03, 0x00, 0x00, 0x21, 0xF7] 
          },
        },
        result: {
          ok: {
            msg: 'OK!',
            sysEx: [0xF0, 0x40, 0x7F, 0x7E, 0x04, 0x1E, 0x03, 0x00, 0x00, 0x00, 0xF7]
          },
          error: {
            msg: 'Write Error',
            sysEx: [0xF0, 0x40, 0x7F, 0x7E, 0x04, 0x1E, 0x03, 0x00, 0x01, 0x7B, 0xF7]
          },
        },
        infos: [],
        msg: '電源ボタンを5秒以上押し続け、本体の電源をお切りください。\n\nPress and hold the power switch 5 seconds to turn off.',
      }
    }
  },

  created: function(){
    // this.isLoading = true
    MIDI.addEventListener('ready', ()=>{
      KawaipianoJs.invoke({sync: 'connect'}).catch((e)=> console.error(e))
    })
    MIDI.addEventListener('deviceState', ()=>{
      if (MIDI.API ==='KWMcore' && MIDI.bluetooth.window) { MIDI.bluetooth.window = false }
      if (MIDI.API ==='KWMcore') { location.href='../../../index.html' }
    })
    this.init()
  },

  Mounted: ()=> {
    window.mdc.autoInit()
  },

  computed: {
    isAvailable () {
      return this.isLoading === false
    },
    hasFWUpdated() {
      return this.UI.fwUpdate.curStatus !== 'insertUsbMemory' &&
             this.UI.fwUpdate.curStatus !== 'writing'
    },
    curFWUpdateIdx() {
      return Math.max(0, this.UI.fwUpdate.infos.length - 1)
    },
    fwUpdateStatusMsg() {
      return this.fwUpdateStatusToMsg(this.UI.fwUpdate.curStatus)
    }
  },

  methods: {
    init() {
      PIANO.Parameters.System = {...PIANO.Parameters.System, 'MemoryAddress': ''}
      PIANO.Parameters.System = {...PIANO.Parameters.System, 'Checksum': ''}
      PIANO.Parameters.System = {...PIANO.Parameters.System, 'RomName': ''}

      this.PIANO = PIANO

      this.UI.fwUpdate.curStatus = 'insertUsbMemory'
      setTimeout(() => {
        if (this.isLoading) {
          this.finishLoading()
        }
      }, 6000)

      PIANO.onPianoSuccess = (obj) => {
        if (this.isLoading) {
          this.finishLoading()
        }

        switch (obj.no) {
          case 3:   this.fwUpdateInfo(this.curFWUpdateIdx).result = 'ok'
                                                            break // success
          case 36:  this.UI.fwUpdate.curStatus = 'bootEnd'; break // bootend
          default:
            break
        }
      }

      // アップデートエラーを取得
      MIDI.IN.SystemExclusive = (data)=> {
        let isError = false

        // Write error
        if (this.isSameArray(this.fwUpdateResultToSysEx('error'), data.msg)) {
          this.fwUpdateInfo(this.curFWUpdateIdx).result = 'error'
          isError = true
        }
        // File not found
        else if (this.isSameArray(this.fwUpdateStatusToSysEx('fileNotFound'), data.msg)) {
          this.UI.fwUpdate.curStatus = 'fileNotFound'
          isError = true
        }
        // No device
        else if (this.isSameArray(this.fwUpdateStatusToSysEx('noDevice'), data.msg)) {
          this.UI.fwUpdate.curStatus = 'noDevice'
          isError = true
        }

        if (isError && this.isLoading) {
          this.finishLoading()
        }
      }


    },

    finishLoading () {
      if (!PIANO.Mode) {
        PIANO.Mode = 'DevelopperMode_HostUpdate'
      }

      if (PIANO.Mode === 'DevelopperMode_Destination' ||
        PIANO.Mode === 'DevelopperMode_Model') {
        appController.resetUserSounds()
        KawaipianoJs.saveUserData()
        KWM.saveJson('user/uicache.json', undefined)
      }

      this.UI.page = PIANO.Mode === 'DevelopperMode_HostUpdate' ? 'HostUpdate'
        : 'Destination'

      this.isLoading = false
    },

    fwUpdateInfo(idx) {
      return this.UI.fwUpdate.infos[idx]
    },
    fwUpdateResultMsg(idx) {
      return this.fwUpdateResultToMsg(this.fwUpdateInfo(idx).result)
    },
    fwUpdateStatusToSysEx(status) {
      return this.UI.fwUpdate.status[status].sysEx
    },
    fwUpdateResultToSysEx(result) {
      return this.UI.fwUpdate.result[result].sysEx
    },
    fwUpdateStatusToMsg(status) {
      return this.UI.fwUpdate.status[status].msg
    },
    fwUpdateResultToMsg(result) {
      if (result === '----')  return result
      return this.UI.fwUpdate.result[result].msg
    },

    // cancelCalcCheckSum() {
    //   MIDI.OUT([0xBF, 0x10, 0x00])
    // },

    // 書込みAddressのメッセージか？
    isAddress(msg) {
      let addressHeader = [0xF0, 0x40, 0x7F, 0x7E, 0x04, 0x1E, 0x04]
      var msgHeader = msg.slice(0, addressHeader.length)

      if (this.isSameArray(addressHeader, msgHeader)) return true

      return false
    },

    // FileNameのメッセージか？
    isFileName(msg) {
      let fNameHeader = [0xf0, 0x40, 0x7f, 0x24]
      var msgHeader = msg.slice(0, fNameHeader.length)

      if (this.isSameArray(fNameHeader, msgHeader)) return true

      return false
    },

    // 配列が同じか？
    isSameArray(array1, array2) {

      if (!array1 || !array2) return false

      if (array1.length !== array2.length)  return false

      for (var i = 0; i < array1.length; i++) {
        if (array1[i] !== array2[i])  return false
      }

      return true
    },
  },

  watch: {
    // PIANO.Mode: モードを監視
    'PIANO.Mode': function(newVal, oldVal) {
      if (!newVal) return

      this.finishLoading()
    },

    // PIANO.ExternalStrage: ファイル名を監視
    'PIANO.ExternalStrage': function(newVal, oldVal) { 
      if (!newVal || newVal.length === 0) return
      console.log('PIANO.Mode: ' + newVal)

      if (this.isLoading) {
        this.UI.fwUpdate.curStatus = 'writing'
        this.finishLoading()
      }

      // ファイル数に応じて、"infos"配列を用意する
      while (this.UI.fwUpdate.infos.length < newVal.length) {
        this.UI.fwUpdate.infos.push({ name: '----', address: '----', result: '----' })
        this.UI.fwUpdate.curStatus = 'writing'
      }
      // "infos"にファイル名を格納する
      for (var i = 0; i < newVal.length; i++) {
        this.fwUpdateInfo(i).name = newVal[i].name
      }
    },

    // PIANO.Parameters.System.MemoryAddress: 現在の書込み中のアドレスを監視
    'PIANO.Parameters.System.MemoryAddress': function(newVal, oldVal) {
      // 現在書込み中のファイル情報のアドレスを更新する
      if (this.UI.fwUpdate.infos.length > 0) {
        this.fwUpdateInfo(this.curFWUpdateIdx).address = newVal
      }
    },
    
    deep: true
  }
})
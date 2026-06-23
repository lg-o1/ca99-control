"use strict"

/**
 * PIANO Object
 */
const PIANO = {
  Sync: false,
  DeviceID: '',
  get DeviceIndex () { return MIDI.DEVICES.findIndex (item => item.id === PIANO.DeviceID) },
  Model: '',
  Mode: '',
  Destination: '',
  Language: '',
  Version: '',
  HandshakeSupport: false,
  Parameters: {},
  MusicMode: 'Music',
  Music: {
    /**
     * PIANO.Music.Modeについて
     * Playerのモードを管理します。
     * @Player            KWM内蔵曲Playerモード
     * @Lesson            KWM内蔵曲Lessonモード
     * @ConcertMagic      KWM内蔵曲ConcertMagicモード
     * @RecorderPlayback  PIANO内蔵レコーダー再生コントロールモード
     * @USBMusicPlayer    PIANO内蔵USBミュージックプレイヤーコントロールモード
     */
    Mode: 'Player',
    /**
     * PIANO.Music.isBusyについて
     * ピアノ本体がKawaiSysEx受信不可の場合、true　
     */
    isBusy: false,
    /**
     * PIANO.Music.Stausについて　
     * KWM SMF Playerおよびピアノ本体の再生、録音状態を管理します。
     * @init        初期状態、非選曲状態
     * @reset       KWM/ピアノ本体 選曲頭出し状態
     * @stop        KWM/ピアノ本体 途中停止状態
     * @pause       KWM 一時停止状態 (Note Offなし)
     * @play        KWM/ピアノ本体 楽曲再生状態
     * @error       KWM/ピアノ本体 楽曲読み込みエラー状態
     */
    Status: 'init',
    Selected: {name: null},
    Next: true,
    Previous: true,
    Time: {
      progress: 0,
      current: '',
      total: '',
      remaining: '',
      currentString: '',
      totalString: '',
      remainingString: '',
      pointA: '',
      pointB: '',
    },
    Queue: [],
    Recent: [],
    Favorite: [],
    Repeat: false,
    Shuffle: false,
    Volume: {
      // MIDI 0~127
      master: 100,
      // 0~100%
      rightHand: 100,
      leftHand: 100,
      usbRec: 77,
      usbPlay: 40,
      intRecPlay: 100,
      // オーバーダブ録音時: true / 再生時: false
      isUsbRec: false,
      // SysExコントロール非対応の場合: false
      multiTrackControl: false,
    },
    Balance: 50,
    Tempo: {original:120, default:120, music:'', concertMagic:'', relative:'1'},
    Transpose: 0,
    DefaultSound: [],
    Track: {},
    ContinuPlay: {isOn: true, waitTime: 2000},
    Division: 480, /* kats */
    Format: 0, /* kats */
    BarNum: 10, /* kats */
    ConcertMagic: true,
    HandsBalance: true,
    RepeatA: false,
    RepeatB: false
  },
  RecControl: {
    /**
     * PIANO.RecControl.Status
     * @init          初期状態 ・ RecControl以外のモードを選択中
     * @stop          録音停止状態
     * @overdub       オーバーダビング曲選曲完了状態
     * @overdubPlay   オーバーダビングトラック再生中
     * @standby       録音スタンバイ状態
     * @recording     録音中
     * @complete      録音終了後ユーザー操作待機状態
     * @play          録音曲再生中
     * @save          保存操作 ・ 処理中
     * @delete        削除操作 ・ 処理中
     */
    Status: 'init',
    Format: 'internal',
    Selected: {
      isRecFile: true,
      id: '',
      name: '',
      attribute: '',
      filePath: {},
      isSaved: '',
      recordedDevice: '',
      overdub: false,
      overdubTime: 0,
      tempo: {},
      time: {total: ''},
      abRepeat: {A:{}, B:{}}
    },
    RecordedSongs: [],
    IntMemoryAvailablity: [true, true, true, true, true, true, true, true, true, true],
    isBusy: false,
    startTime: null,
    endTime: null
  },
  Rhythm: {
    isActive: false,
    Play: false,
    Mode: 'Metronome',
    Tempo: {value: 120, valueType: "range", valueMin: 10, valueMax: 500},
    Volume: {value: 74, valueType: "range", valueMin: 0, valueMax: 127},
    Beat: '4/4',
    Pattern: {value: 0, subValue: 0},
    Counter: {},
  },
  ExternalStrage: [],
  soundChangeLimitor: false,
  onPlayerChange (e) {},
  onRecorderStatusChange (e) {},
  onFileLoadCompleted (e) {}, //set Music関数内で利用しているため、UI側で利用禁止。この場所でいいかはリファルタリング時に考える
  onProgress (progress) {},
  onBeatEvent (e) {},
  onHeadphonesStatus (e) {},
  onUsbStatus (e) {},
  onBluetoothStatus (e) {},
  onHandshakeEnd (e) {},
  // onHostUpdateStart () {},
  onPianoSuccess (obj) {},
  onPianoError (obj) {},
  onMultiTimbralMode (e) {},
  get(parameter, part) {

    // TimbreのPC#オブジェクトからidを取得
    const getTimbreId =(timbrePcObj)=> {
      const timbre = PRESET.Timbre.filter((obj)=>{
        return (obj.pc === timbrePcObj.PC && obj.msb === timbrePcObj.MSB && obj.lsb === timbrePcObj.LSB)
      })
      return timbre[0].id
    }

    const verifyParam =(obj)=> {
      // // 現在値との照合関数関数
      // // この場所がいいかは後々検討
      const item =
        (!PIANO.Parameters[obj.part]) ? false
      : (!PIANO.Parameters[obj.part][obj.parameter]) ? false
      : PIANO.Parameters[obj.part][obj.parameter]

      if (obj.parameter === 'Timbre') {
        if (typeof obj.data === 'object') { obj.data = getTimbreId(obj.data)}
        item.value = item.id
      }
      if (obj.data === 'Off') { obj.data = 0 }

      const checkNum =()=> {
        item.value = (item.value === 'Off') ? 0 : item.value
        return (String(obj.data) === String(item.value)) ? true : false
      }
      const checkString =()=> {
        const value = (typeof item.value === 'number' && item.valueType === 'enum') ? item.valueList[item.value] : item.value
        return (obj.data === value) ? true : false
      }
      const checkObj =()=> {
        const getEnumObj =(data)=> {
          const checkNumEnum = (data, prop) => {
            return (typeof data[prop] === 'number' && item[prop + 'Type'] === 'enum') ? true : false
          }
          const value = ( checkNumEnum(data, 'value') ) ? item.valueList[data.value] : data.value
          const subValue = ( checkNumEnum(data, 'subValue') ) ? item.subValueList[data.value][data.subValue] : data.subValue
          const subValue2 = ( checkNumEnum(data, 'subValue2') ) ? item.subValue2List[data.value][data.subValue][data.subValue2] : data.subValue2
          return {value, subValue, subValue2}
        }
        const verifyData = getEnumObj(obj.data)
        const currentData = getEnumObj(item)
        return (
          verifyData.value === currentData.value
          && verifyData.subValue === currentData.subValue
          && verifyData.subValue2 === currentData.subValue2
        ) ? true : false
      }

      const result =
        (!item || obj.data == null ) ? undefined
      : (typeof obj.data === 'number') ? checkNum()
      : (typeof obj.data === 'string') ? checkString()
      : checkObj()

      if (KawaipianoJs.log.verifyParam && result === false) {
        console.log( '%c VerifyResult: ' + result + '  Parameter: ' + obj.parameter + ' | ' + obj.part, 'color: pink')
        const val = (item.valueType === 'enum') ? item.valueList[item.value] : item.value
        const data = (typeof obj.data === 'object') ? obj.data.value + '|' + obj.data.subValue : obj.data
        if (result === false) { console.log( '%c 現在値:' + val + '| 比較対象:' + data, 'color: pink') }
      }
      return result
    }

    if (DATABASE.systemKey.includes(parameter)) {
      return this[parameter]

    } else if (parameter === 'Sound') {

      // Main1パートのTimbreと一致するSoundデータ抽出
      const getSoundObjByTimbre =(timbreId)=> {
        const preset = PRESET.Sound.filter((obj) => {
          const id = (typeof obj.data.Main1.Timbre === 'object') ? getTimbreId(obj.data.Main1.Timbre) :obj.data.Main1.Timbre
          return (id === timbreId)
        })
        const user = USER.Sound.filter((obj) => {
          const id = (typeof obj.data.Main1.Timbre === 'object') ? getTimbreId(obj.data.Main1.Timbre) :obj.data.Main1.Timbre
          return (id === timbreId)
        })
        return [...preset, ...user]
      }

      // 現在の設定(PIANO.Parameters)と引数のSoundオブジェクトを比較
      const verifySound =(sound)=> {
        if (KawaipianoJs.log.verifyParam) { console.log({'音色ID':sound.id, 'プリセット': sound.data, '現在の設定': this.Parameters}) }

        const currentKeymode = this.Parameters.Global.KeyboardMode.valueList[this.Parameters.Global.KeyboardMode.value]
        if (currentKeymode === '4Hands') { PIANO.set('KeyboardMode', 'Single', 'Global') } //4handsモードの場合、ピアノ本体Singleモードに変更
        const keymode = (!currentKeymode || currentKeymode === '4Hands') ? 'Single' : currentKeymode

        const verifySoundParams =(soundObj, part)=> {
          let result = true
          const keys = Object.keys(soundObj.data[part])
          for (const key of keys) {
            const checkParam = {
              parameter: key,
              data: soundObj.data[part][key],
              part: part
            }
            if (checkParam.part === 'Main1' && checkParam.parameter === 'Timbre') {
            } else if (checkParam.parameter === 'VirtualTechnician') {
              if (PIANO.get('VirtualTechnician') !== checkParam.data) { result = false }
            } else {
              const verifyResult = verifyParam(checkParam)
              result = (verifyResult === undefined) ? true : (!verifyResult) ? false : true
            }
            if (!result) { break }
          }
          if (KawaipianoJs.log.verifyParam) { console.log ('%c' +  sound.id + ' 音色の照合結果: ' + result, 'color: pink') }
          return result
        }

        const presetKeymode = (!sound.data.Global.KeyboardMode) ? 'Single' : this.Parameters.Global.KeyboardMode.valueList[sound.data.Global.KeyboardMode]
        if (presetKeymode === keymode) {
          const checkMain = (verifySoundParams(sound, 'Main1') && verifySoundParams(sound, 'Global') && verifySoundParams(sound, 'System')) ? true : false
          if (keymode === 'Single') {
            return checkMain
          } else if (keymode === 'Dual') {
            const checkLayer = verifySoundParams(sound, 'Layer')
            return (checkMain && checkLayer)
          } else if (keymode === 'Split') {
            const checkLower = verifySoundParams(sound, 'Lower')
            return (checkMain && checkLower)
          }
        } else { return false }
      }

      const sounds = getSoundObjByTimbre(PIANO.Parameters.Main1.Timbre.id)
      const result = sounds.find((sound)=> { return verifySound(sound) })

      if (result) { return result.id } else { return undefined }

    } else if (parameter === 'VirtualTechnician') {
      const verifyVts =()=> {
        const index = PRESET.VirtualTechnician.findIndex((item) => {
          let result = true
          Object.keys(item.data).forEach((key)=> {
            const checkParam = { parameter: key, data: item.data[key], part: 'Main1' }
            const verifyResult = verifyParam(checkParam)
            result = (!result) ? false : (verifyResult === undefined) ? true : verifyResult
          })
          if (KawaipianoJs.log.verifyParam) { console.warn('%c VerifyVT |  比較プリセット:' + item.name + '  結果:' + result, 'color: pink') }
          return result
        })
        return (index !== -1) ? index : undefined
      }
      return verifyVts()
    } else {
      if (part) {
        return this.Parameters[part][parameter]
      } else {
        let vals = {}
        Object.keys(DATABASE.Part).forEach((key)=> {
          const p = DATABASE.Part[key]
          if (this.Parameters[p]) {
            if (this.Parameters[p][parameter] !== undefined) {
              vals[p] = this.Parameters[p][parameter]
            }
          }
        })
        if (Object.keys(vals).length !== 0) {
          return vals
        } else {
          if (KawaipianoJs.log.pianoObj) {　console.warn ('PIANO.get : "' + parameter + '" is not exsiting.') }
          return undefined
        }
      }
    }
  },
  async set(parameter, data, part, midiSendOpt) {
    if (KawaipianoJs.log.pianoObj) { console.log('PIANO SET | ', {parameter: parameter, data: data, part: part, midiSendOpt: midiSendOpt}) }

    // midiSendOpt処理
    let fromPiano = (typeof midiSendOpt === 'object') ? midiSendOpt.fromPiano : midiSendOpt
    const forceSend = (typeof midiSendOpt === 'object') ? midiSendOpt.forceSend : false

    if (DATABASE.systemKey.includes(parameter)) {
      if (parameter === 'Sync') {
        if (!data) {
          this.Mode = ''

          if (this.MusicMode === 'Music' && this.Music.Status !== 'init') {
            if (this.Music.Mode === 'RecorderPlayback' || this.Music.Mode === 'USBMusicPlayer') {
              PIANO.set('Music', 'Init')
            } else if (this.Music.Mode === 'ConcertMagic') {
              PIANO.set('Music', 'Init')
            } else {
              PIANO.set('Music', 'Reset')
            }
          } else if (this.MusicMode === 'RecControl' && this.RecControl.Status !== 'init') {
            PIANO.set('RecControl', 'init', true)
          }
          if (KWM.isEmbeddedMode) { this.set('USBMemory', 'ClearUsbMusicObj') }
          if (fromPiano && this.Sync) { KawaipianoJs.onUnsync() }
        } else {
          if (fromPiano) {
            MIDI.OUT(DATABASE.getMidi(parameter, data))
            KawaipianoJs.allParamSync.request()
          }
        }
        this[parameter] = data
      // } else if (parameter === 'Model' && typeof data !== 'string' ) {
      } else if (parameter === 'Model' && typeof data === 'string' ) {
        appController.setSysInfo(parameter, data)
        if (PIANO.Destination) {
          DATABASE.makeSoundList()
          
          const initData = appController
            .getInitData(PIANO.Model, PIANO.Destination.name)
          for (let part of Object.keys(initData.data)) {
            if (part === 'Sound') {
              const id = 'preset_' + initData.data['Sound']
              await appController.setSound(id)
            } else {
              Object.keys(initData.data[part]).forEach(async (param) => {
                const val = initData.data[part][param]
                await this.set(param, val, part)
              })
            }
          }
        }
        this.HandshakeSupport = data.sysEx
      } else if (parameter === 'Checksum' || parameter === 'MemoryAddress') {
        appController.setSysInfo(parameter, data)
      } else if (parameter === 'Language') {
        appController.setSysInfo(parameter, data)
        DATABASE.makeSoundList()
        if (!KWM.isEmbddedMode) { DATABASE.saveUserSettings('Language') }
      } else if (parameter === 'Result_Error' || parameter === 'Result_Busy') {
        const obj = {
          result: false,
          title: data.title,
          no: data.no,
          description: data.desicriptionJp
        }
        if (obj.title === 'Error') {
          this.onPianoError(obj)
        } else if (obj.title === 'NoData') {
          this.onFileLoadCompleted(obj)
        } else if (obj.title === 'Success') {
          this.onPianoSuccess(obj)
        } else { }
      } else if (parameter === 'PowerOff') {
        KWM.willSystemPowerOff = true
      } else {
        appController.setSysInfo(parameter, data)
      }
      if (PIANO.Sync && !fromPiano && parameter !== 'Sync') {
        if (parameter === 'Language' && '!KWM.isEmbddedMode') { return }
        MIDI.OUT(DATABASE.getMidi(parameter, data), PIANO.DeviceID)
      }
    } else if (parameter === 'All') {
      let sendMidi = (part) ? {forceSend: true} : false
      let synced = this.Sync
      if (!sendMidi && synced) { this.Sync = false }
      Object.keys(data).forEach((part) => {
        if(part === 'Sound') {
          this.set(part, 'preset_' + data[part])
        } else {
          Object.keys(data[part]).forEach((param) => {
            const item = data[part][param]
            this.set(param, item, part, sendMidi)
          })
        }
      })
      // ↑ 不要なパートに設定を送信すると最後の設定が有効になってしまう
      // ↓ すべての設定を送信後、現在の音色を再設定してみたが、設定は変化していないため何も送信されない
      // const id = this.get('Sound')
      // this.set('Sound', id)
      // ↓ 現在の音色パートの設定を再送信している
      const setCurParams = (data) => {
        if (!data['Global']) return

        const keyboardMode = data['Global'].KeyboardMode
        const partsByKeyMode = (keyboardMode) => 
          (keyboardMode === '4Hands') ? ['FourHandsRight', 'FourHandsLeft']
          : (keyboardMode === 'Dual') ? ['Main1', 'Layer']
          : (keyboardMode === 'Split') ? ['Main1', 'Lower']
          : ['Main1']
        const isCurParts = (part, keyboardMode) => 
          partsByKeyMode(keyboardMode).includes(part)
        Object.keys(data)
          .filter(part => isCurParts(part, keyboardMode))
          .forEach(part => Object.keys(data[part])
            .forEach(param => {
              const item = data[part][param]
              this.set(param, item, part, sendMidi)
            })
          )
      }
      setCurParams(data)
      if (!sendMidi && synced) { this.Sync = true }
    } else if (parameter === 'Timbre') {
      //文字・数字入力の場合、オブジェクトに変換
      if (typeof data === 'string') {
        const index = PRESET.Timbre.findIndex(item => item.name === data)
        if (index !== -1) {
          data = PRESET.Timbre[index]
        } else {
          console.error('The sound name is not existing : ' + data )
        }
      } else if (typeof data === 'number') {
        data = PRESET.Timbre.filter((obj) => {return (obj.id) === data})[0]
      } else if (typeof data === 'object') {
        data = (data.id) ? data : PRESET.Timbre.filter((obj) => {return (obj.pc) === data.PC && (obj.msb) === data.MSB && (obj.lsb) === data.LSB })[0]
      }
      if (part === undefined) {part = 'System'}

      if (data == null) {
        console.warn('timbre set error', parameter, data, part)
        data = PRESET.Timbre[0]
      }
      appController.setParam(part, parameter, data)

      if (PIANO.Sync && !fromPiano) {
        if (!part) {
          MIDI.OUT(DATABASE.getMidi('Sound', data, 0x00), PIANO.DeviceID)
        } else {
          MIDI.OUT(DATABASE.getMidi('Sound', data, part), PIANO.DeviceID)
        }
      }

    // KWMcoreのjsonに保存
    if (USER.CacheMode === 'auto') { KawaipianoJs.autoSaveCache() }

    } else if (parameter === 'Sound') {
      if (data === 'Favorite') {
        const arg = part
        const index = PRESET.SoundPalette[4].data.findIndex(item => item === arg)
        if (index === -1) {
          PRESET.SoundPalette[4].data.splice(0, 0, arg)
        } else {
          PRESET.SoundPalette[4].data.splice(index, 1)
        }
        DATABASE.saveUserSettings('FavoriteSound')

      } else if (data === 'Rename') {
        const id = part
        const name = midiSendOpt
        appController.renameUserSound(id, name)

      } else if (data === 'Delete') {
        const id = part
        appController.deleteUserSound(id)
        KawaipianoJs.saveUserData()
        DATABASE.saveUserSettings('FavoriteSound')
        DATABASE.saveUserSettings('RecentSound')
        
      } else if (data === 'Save') {
        const cache = KawaipianoJs.makeCache()

        const keyMode = this.Parameters.Global.KeyboardMode.valueList[cache.Global.KeyboardMode]
        if (keyMode === '4Hands') { return }

        const timbre =(pt)=> {
          const id = cache[pt].Timbre
          for (const item of PRESET.Timbre) {
            if (item.id === id) { return item }
          }
        }
        const name = (part) ? part : timbre('Main1').name
        const nameJa = (part) ? part : timbre('Main1').nameJa
        const category = (part) ? null : timbre('Main1').category
        const categoryJa = (part) ? null : timbre('Main1').categoryJa
        const availableParams = timbre('Main1').availableParams
        const lastId = (USER.Sound.length) ? USER.Sound.slice(-1)[0].id : undefined
        const idNum = (lastId) ? Number(lastId.split('_')[1]) + 1 : 0

        let soundObj = {
          id: 'user_' + idNum,
          name: name,
          nameJa: nameJa,
          category: category,
          categoryJa: categoryJa,
          data:{
            Global: cache.Global,
            Main1: cache.Main1,
            MIDI2ch: cache.MIDI2ch,
            System: {
              Tuning: cache.System.Tuning
            }
          },
          availableParams: availableParams
        }

        if (keyMode === 'Dual') {
          soundObj.nameSecondary = (part) ? null : timbre('Layer').name,
          soundObj.nameSecondaryJa = (part) ? null : timbre('Layer').nameJa
          soundObj.data.Layer = cache.Layer
        } else if (keyMode === 'Split') {
          soundObj.nameSecondary = (part) ? null : timbre('Lower').name,
          soundObj.nameSecondaryJa = (part) ? null : timbre('Lower').nameJa
          soundObj.data.Lower = cache.Lower
        }

        // 存在しない音色、または名前が付いている音色の場合はUSER Soundに追加
        const verifySounds = PIANO.get('Sound')
        let soundId
        if (verifySounds == null || part) {
          soundObj.isSaved = (part) ? true : false
          appController.storeSoundObj(soundObj)
          soundId = soundObj.id
        } else {
          soundId = verifySounds
        }

        // Sound Paletteのdata配列にidを追加
        if (part) {
          USER.SoundPalette[0].data.push(soundId)
          if (MIDI.API === "KWMcore") {
            KawaipianoJs.saveUserData()
          }
        } else {
          const duplicatedIndex = PRESET.SoundPalette[5].data.findIndex(item => item === soundId)
          if (duplicatedIndex >= 0) { PRESET.SoundPalette[5].data.splice(duplicatedIndex, 1) }
          PRESET.SoundPalette[5].data.splice(0, 0, soundId)
          if (PRESET.SoundPalette[5].data.length >= 30) { PRESET.SoundPalette[5].data.splice(30, PRESET.SoundPalette[5].data.length - 30) }
          DATABASE.saveUserSettings('RecentSound')
        }


      } else if (data === 'ClearFavorite') {
        PRESET.SoundPalette[4].data = []
        DATABASE.saveUserSettings('FavoriteSound')

      } else if (data === 'ClearRecently') {
        PRESET.SoundPalette[5].data = []
        DATABASE.saveUserSettings('RecentSound')

      } else if (data === 'ClearUserCategory') {
        // USER.SoundPalette[0].data = []
        appController.resetUserSounds()
        if (MIDI.API === "KWMcore") {
          KawaipianoJs.saveUserData()
          DATABASE.saveUserSettings('FavoriteSound')
          DATABASE.saveUserSettings('RecentSound')
        }

      } else {
        if (!data) { return }
        let forceMidiSend = false
        if (MIDI.isBuffering && this.soundChangeLimitor) {
          MIDI.initBuffer()
          forceMidiSend = true
        }
        this.soundChangeLimitor = true
        setTimeout (()=>{ this.soundChangeLimitor = false }, 500)

        await appController.sendListSound(data)
        if (USER.CacheMode === 'auto') { KawaipianoJs.autoSaveCache() }
      }
    } else if (parameter === 'VirtualTechnician') {
      if (data === 'Save') {
        USER.VirtualTechnician = []
        let data = {}
        Object.keys( PRESET.VirtualTechnician[0].data).forEach((param) => {
          if (!PIANO.Parameters.Main1[param]) { return }
          if (PIANO.Parameters.Main1[param].subValue === undefined) {
            data = { ...data, [param]: PIANO.Parameters.Main1[param].value }
          } else {
            data = { ...data, [param]:{ 'value': PIANO.Parameters.Main1[param].value, 'subValue': PIANO.Parameters.Main1[param].subValue } }
          }
        })
        const vtObj = {
          name: 'User',
          nameJa: 'ユーザー',
          data: data
        }
        appController.storeVtObj(vtObj)

      } else {
        const i = data
        await appController.sendVtPreset(i)
        if (USER.CacheMode === 'auto') { KawaipianoJs.autoSaveCache() }
      }

    } else if (parameter === 'Music') {
      if (!KWM.isEmbeddedMode) {
        if (data !== 'Volume' && data !== 'Balance' && data !== 'SoundDefault') { return }
      }
      const func = data
      const arg = part

      // MusicModeの変更
      if (this.MusicMode !== 'Music') {
        if (!['init', 'stop', 'overdub'].includes(this.RecControl.Status)) {
          console.log('RecControlが動作中のためreturn')
          return
        }
        this.MusicMode = 'Music'
      }

      if (func === 'Select') {
        await appController.musicSelect(arg)
        // return new Promise ((resolve, reject)=> {
        //   if (this.Music.isBusy || !arg) { reject() }
        //   this.Music.isBusy = true
        //   console.log('楽曲選択:', arg)

        //   // 描画用オブジェクトの更新
        //   // 引数argにFavoriteプロパティを追加
        //   const favoriteCheck = PRESET.PlayList[0].data.findIndex(item => item.id === arg.id)
        //   if (favoriteCheck === -1) {arg.favorite = false } else { arg.favorite = true }

        //   // 内蔵デモ曲の場合、音色をセット
        //   if (arg.function === 'soundDemo') {
        //     this.set('Music', 'SoundDefault', arg)
        //   } else {
        //     this.Music.Volume = {...this.Music.Volume, rightHand: 100, leftHand: 100}
        //     const vol = this.Music.Volume.master
        //     PIANO.set('Volume', vol, 'Global')
        //     PIANO.set('Volume', vol, 'MIDI2ch')
        //   }

        //   // Selectedプロパティに格納
        //   this.Music = {...this.Music, Selected : arg}
        //   // 再生コントローラーボタンの表示状態を取得
        //   musicHandler.updateStatus(arg)

        //   // KWMcore SMF Player 曲選択
        //   const KWMSongSelect =()=>{

        //     // ピアノ側コントロール状態の場合、Playerモードにセットする
        //     if (this.Music.Mode === 'RecorderPlayback' || this.Music.Mode === 'USBMusicPlayer') {
        //       const remote = ( ['RecorderPlayback','USBMusicPlayer'].includes(this.Music.Mode) ) ? true : false
        //       recWorker.init(remote)
        //       PIANO.set('Music', 'Mode', 'Player')
        //     }
        //     const path = "Kawai/default/" + arg.smfPath
        //     const balanceCtrl =  (arg.handsBalance && this.Music.Volume.multiTrackControl) ? true : false
        //     this.Music = {...this.Music, ConcertMagic: arg.concertMagic, HandsBalance: balanceCtrl}
        //     PIANO.onPlayerChange() // UI側へ変更通知

        //     if (MIDI.API === "KWMcore") {
        //       KWM.selectSmf(path).then ((smfInfo)=> {
        //         this.Music = {...this.Music,
        //           Transpose: smfInfo.transpose,
        //           Format: smfInfo.format,
        //           Division: smfInfo.division,
        //           RepeatA: smfInfo.repeatA,
        //           RepeatB: smfInfo.repeatB
        //         }
        //         this.Music.Time = {...this.Music.Time,
        //           total: smfInfo.totalTime,
        //           pointA: smfInfo.timeStringRepeatA,
        //           pointB: smfInfo.timeStringRepeatB
        //         }
        //         this.Music.Track = {...this.Music.Track,
        //           isExist: smfInfo.existTrack,
        //           volume: smfInfo.trackVolume
        //         }
        //         this.Music.Tempo = {...this.Music.Tempo,
        //           original: smfInfo.tempo,
        //           default: smfInfo.tempo
        //         }
        //         this.Music.beatInfo = smfInfo.beatInfo

        //         this.Music = {...this.Music, Status: 'reset'}
        //         console.log('%cUI状態チェンジ', 'color: green;',[PIANO.Music.Status, PIANO.Music.Mode])
        //         PIANO.onPlayerChange() // UI側へ変更通知
        //         this.Music.isBusy = false
        //         resolve()
        //       }).catch ((error)=>{
        //         this.Music = {...this.Music, Status: 'error'}
        //         console.log('%cUI状態チェンジ', 'color: green;',[PIANO.Music.Status, PIANO.Music.Mode])
        //         PIANO.onPlayerChange() // UI側へ変更通知
        //         reject(error)
        //       })
        //     }
        //   }

        //   // Piano Controller 曲選択
        //   const PianoSongSelect =()=>{
        //     if (MIDI.API === "KWMcore") {
        //       // KWM.playStopSmf()
        //       appController.stopPlaySmf()
        //     }

        //     //MIDI送信
        //     const remote = ( ['RecorderPlayback','USBMusicPlayer'].includes(this.Music.Mode) ) ? true : false
        //     const fileLoadCallback =(result)=> {
        //       if (result) {
        //         this.Music = {...this.Music, Status: 'reset'}
        //         console.log('%cUI状態チェンジ', 'color: green;',[PIANO.Music.Status, PIANO.Music.Mode])
        //         PIANO.onPlayerChange() // UI側へ変更通知
        //         resolve()
        //       } else {
        //         this.Music = {...this.Music, Status: 'error'}
        //         console.log('%cUI状態チェンジ', 'color: green;',[PIANO.Music.Status, PIANO.Music.Mode])
        //         reject()
        //       }
        //     }
        //     if (!arg.isUSBMusicPlayer) {
        //       this.Music = {...this.Music, Mode : 'RecorderPlayback'}
        //       recWorker.selectSong('internal', arg.filePath, remote, fileLoadCallback)
        //     } else {
        //       this.Music = {...this.Music, Mode : 'USBMusicPlayer'}

        //       // レコーダーボリュームセット
        //       this.Music.Volume = {...this.Music.Volume, isUsbRec: arg.isRecFile}
        //       const vol = (arg.isRecFile)
        //         ? Math.floor(this.Music.Volume.master * this.Music.Volume.usbRec / 100)
        //         : Math.floor(this.Music.Volume.master * this.Music.Volume.usbPlay / 100)
        //       PIANO.set('AudioPlayVolume', vol, 'System')

        //       recWorker.selectSong('usb', arg.filePath, remote, fileLoadCallback)
        //     }
        //   }

        //   // 再生プレイヤー分岐
        //   if (arg.inPiano) { PianoSongSelect() } else { KWMSongSelect() }
        // })
      } else if (func === 'Mode') {
        const donePlayConcertMagicCb = (noteno, velocity, sec, success, cmr) => {
          const evaluation = { 
            success: Boolean(success), 
            advice: ['OK', 'SLOW', 'FAST', 'TOOFAST', 'CHORD', 'NG'][cmr] 
          }
          cmagicAnimation.animate({
            triggeredKey: noteno,
            triggeredVelocity: velocity,
            nextTriggerTime: sec,
            evaluation: evaluation
          })
        }
        await appController.musicMode(arg, donePlayConcertMagicCb)
        // // コンマジモード終了処理
        // if (this.Music.Mode === 'ConcertMagic') {
        //   recWorker.init(true)
        //   KWM.setConcertMagicNativeTrigger(false)
        //   setTimeout(() => { this.set('Music', 'Play') }, 500)
        // }

        // // ピアノ本体再生終了処理
        // if (['RecorderPlayback','USBMusicPlayer'].includes(this.Music.Mode)) { recWorker.init(true) }

        // // モード変更処理
        // PIANO.Music = {...PIANO.Music, Mode: arg }

        // if (arg ==='Player' || arg ==='Lesson') {
        // } else if (arg ==='ConcertMagic') {
        //   this.set('Music', 'Stop')
        //   KWM.setConcertMagicMode(1, 0, 0)
        //   KWM.setConcertMagicNativeTrigger(true)
        //   KWM.donePlayConcertMagic =(noteno, velocity, sec, success, cmr)=> {
        //     const evaluation = { success: Boolean(success), advice: ['OK', 'SLOW', 'FAST', 'TOOFAST', 'CHORD', 'NG'][cmr] }
        //     cmagicAnimation.animate({
        //       triggeredKey: noteno,
        //       triggeredVelocity: velocity,
        //       nextTriggerTime: sec,
        //       evaluation: evaluation
        //     })
        //   }
        //   const remote = ( ['RecorderPlayback','USBMusicPlayer'].includes(this.Music.Mode) ) ? true : false
        //   recWorker.setConcertMagicMode(remote)
        // }
        // console.log('%cUI状態チェンジ', 'color: green;',[PIANO.Music.Status, PIANO.Music.Mode])
      } else if (func === 'Play') {

        if (!this.Music.Selected) { return }
        this.Music = {...this.Music, Status : 'play'}

        // コンサートマジックモード中にコンサートマジック非対応曲が選択された場合はプレイヤーモードに
        if (this.Music.Mode === 'ConcertMagic' && !PIANO.Music.Selected.concertMagic) {
          this.set('Music', 'Mode', 'Player')
        // レッスンモード中にバランス設定非対応曲が選択された場合はプレイヤーモードに
        } else if (this.Music.Mode === 'Lesson' && !PIANO.Music.Selected.handsBalance) {
          this.set('Music', 'Mode', 'Player')
        }

        if ( ['Player','Lesson','ConcertMagic'].includes(this.Music.Mode) ) {
          console.log('%cUI状態チェンジ', 'color: green;',[PIANO.Music.Status, PIANO.Music.Mode])
          if (MIDI.API === "KWMcore") {
            //  メトロノーム発火許可
            KWM.setMetronome(true) /* kats */
            var div = PIANO.Music.Division
            var numra = this.Music.beatInfo[0].numra
            var denom = this.Music.beatInfo[0].denom
            var bartime = div
            var de = denom
            var d = 0
            while (de > 1){
              de /= 2
              d++
            }
            if (d >= 2)
                bartime = (div >> (d - 2)) * numra
            else
                bartime = (div << (2 - d)) * numra
            var isBeat3 = denom == 8 && numra > 3
            if (PIANO.Music.Mode !== 'ConcertMagic')
                // KWM.playStartSmf(bartime / (numra / (isBeat3 ? 3 : 1)))
              appController.startPlaySmf(bartime / (numra / (isBeat3 ? 3 : 1)))
            KWM.onPlayDone (musicHandler.playOut)
            PIANO.onPlayerChange() // UI側へ変更通知
          }
        } else {
          const callback =()=> {
            this.Music = {...this.Music, Status : 'reset'}
            PIANO.onPlayerChange() // UI側へ変更通知
            musicHandler.playOut()
          }
          PIANO.Music.isBusy = true
          recWorker.changePlayerStatus('play', callback)
          PIANO.onPlayerChange() // UI側へ変更通知
        }
        musicHandler.addRecent(this.Music.Selected)

      } else if (func === 'Pause') {
        if (this.Music.isBusy) { return }

        this.Music = {...this.Music, Status : 'pause'}
        console.log('\u001b[34m'　+ '録音モードチェンジ',[PIANO.Music.Status, PIANO.Music.Mode])
        if ( ['Player','Lesson','ConcertMagic'].includes(this.Music.Mode) ) {
          console.log ('KWMcore Pause')
          if (MIDI.API === "KWMcore") { KWM.playPauseSmf() }
        } else {
          console.error('Pause method is not existing for Piano Controller')
        }
        PIANO.onPlayerChange() // UI側へ変更通知

      } else if (func === 'Stop') {
        if (this.Music.isBusy) { return }

        this.Music = {...this.Music, Status : 'stop'}
        console.log('%cUI状態チェンジ', 'color: green;',[PIANO.Music.Status, PIANO.Music.Mode])

        if ( ['Player','Lesson','ConcertMagic'].includes(this.Music.Mode) ) {
          // if (MIDI.API === "KWMcore") { KWM.playStopSmf() }
          if (MIDI.API === "KWMcore") { appController.stopPlaySmf() }
        } else {
          recWorker.changePlayerStatus('stop')
        }
        PIANO.onPlayerChange() // UI側へ変更通知

      } else if (func === 'Reset') {
        if ( ['Player','Lesson','ConcertMagic'].includes(this.Music.Mode) ) {
          this.Music = {...this.Music, Status : 'reset'}
          console.log('%cUI状態チェンジ', 'color: green;',[PIANO.Music.Status, PIANO.Music.Mode])
          // if (MIDI.API === "KWMcore") { KWM.playStopSmf() }
          if (MIDI.API === "KWMcore") { appController.stopPlaySmf() }
          PIANO.Music.Time = {...PIANO.Music.Time, progress: 0}
          KWM.setTimeProgress(0)
          PIANO.onPlayerChange() // UI側へ変更通知
        } else {
          recWorker.changePlayerStatus('init')
          this.Music = {...this.Music, Status : 'init'}
          console.log('%cUI状態チェンジ', 'color: green;',[PIANO.Music.Status, PIANO.Music.Mode])
          PIANO.onPlayerChange() // UI側へ変更通知
        }

      } else if (func === 'Next') {
        if (this.Music.isBusy) { return }

        if (this.Music.Next) {
          const current = this.Music.Selected.id
          const index = this.Music.Queue.findIndex(item => item.id === current)
          if (this.Music.Repeat && index === this.Music.Queue.length - 1) {
            PIANO.set('Music', 'Select', this.Music.Queue[0]).then(()=>{
              if (this.Status !== 'reset' || this.Status !== 'stop') { PIANO.set('Music', 'Play') }
            })
          } else {
            PIANO.set('Music', 'Select', this.Music.Queue[index + 1]).then(()=>{
              PIANO.set('Music', 'Play')
              // if (arg !== 'stop') { PIANO.set('Music', 'Play') }
            })
          }
        }

      } else if (func === 'Previous') {
        if (this.Music.isBusy) { return }

        if (this.Music.Previous) {
          const current = this.Music.Selected.id
          const index = this.Music.Queue.findIndex(item => item.id === current)
          if (this.Music.Repeat && index === 0) {
            PIANO.set('Music', 'Select', this.Music.Queue[this.Music.Queue.length - 1]).then(()=>{
              if (this.Status !== 'reset' || this.Status !== 'stop') { PIANO.set('Music', 'Play') }
            })
          } else {
            PIANO.set('Music', 'Select', this.Music.Queue[index - 1]).then(()=>{
              PIANO.set('Music', 'Play')
              // if (arg !== 'stop') { PIANO.set('Music', 'Play') }
            })
          }
        }

      } else if (func === 'Time') {
        if ( ['Player','Lesson','ConcertMagic'].includes(this.Music.Mode) ) {
          if (MIDI.API === "KWMcore") {
            KWM.setTimeProgress(this.Music.Time.total * arg)
          }
        } else {
          // ピアノコントロールの処理を書く
        }

      } else if (func === 'Queue') {
        if (this.Music.Shuffle) {
          this.Music = {...this.Music, Queue : musicHandler.shuffle(arg, this.Music.Selected)}
        } else {
          this.Music = {...this.Music, Queue : arg}
        }

      } else if (func === 'Favorite') {
        const index = PRESET.PlayList[0].data.findIndex(item => item.id === arg.id)
        if (index === -1) {
          PRESET.PlayList[0].data.splice(0, 0, arg)
          if (arg.id === this.Music.Selected.id) {
            this.Music.Selected = {...this.Music.Selected, favorite : true}
          }
        } else {
          PRESET.PlayList[0].data.splice(index, 1)
          if (arg.id === this.Music.Selected.id) {
            this.Music.Selected = {...this.Music.Selected, favorite : false}
          }
        }
        DATABASE.saveUserSettings('FavoriteMusic')
        PIANO.onPlayerChange ()

      } else if (func === 'Repeat') {
        if (arg) {
          this.Music = {...this.Music, Repeat : true}
        } else {
          this.Music = {...this.Music, Repeat : false}
        }
        musicHandler.updateStatus(this.Music.Selected)

      } else if (func === 'Shuffle') {
        if (arg) {
          this.Music = {...this.Music, Shuffle : true}
          const suffledQueue = musicHandler.shuffle(PIANO.Music.Queue, PIANO.Music.Selected)
          this.Music = {...this.Music, Queue : suffledQueue}
          musicHandler.updateStatus(this.Music.Selected)
        } else {
          this.Music = {...this.Music, Shuffle : false}
          this.Music = {...this.Music, Queue : musicHandler.shuffleBackup}
          musicHandler.updateStatus(this.Music.Selected)
        }

      } else if (func === 'Volume') {
        this.Music.Volume = { ...this.Music.Volume, master: arg }
        if (this.Music.Volume.multiTrackControl) {
          const rightHandVol = Math.floor(arg * this.Music.Volume.rightHand / 100)
          const leftHandVol = Math.floor(arg * this.Music.Volume.leftHand / 100)
          const usbRecVol = (this.Music.Volume.isUsbRec)
            ? Math.floor(arg * this.Music.Volume.usbRec / 100)
            : Math.floor(arg * this.Music.Volume.usbPlay / 100)
          const intRecPlayVol = Math.floor(arg * this.Music.Volume.intRecPlay / 100)
          PIANO.set('Volume', rightHandVol, 'Global')
          PIANO.set('Volume', leftHandVol, 'MIDI2ch')
          PIANO.set('AudioPlayVolume', usbRecVol, 'System')
          PIANO.set('Volume', intRecPlayVol, 'RecorderGlobal')
        } else {
          if (PIANO.Music.Track.length) {
            const i = PIANO.Music.Track.isExist.findIndex((item) => item)
            const firstTrackVol = Math.floor(PIANO.Music.Track.volume[i] * arg /100)
            const secondTrackVol = Math.floor(PIANO.Music.Track.volume[i + 1] * arg /100)
            MIDI.OUT([0xB0, 0x07, firstTrackVol], PIANO.DeviceID)
            MIDI.OUT([0xB1, 0x07, secondTrackVol], PIANO.DeviceID)
            PIANO.Music.Track.volume[i] = firstTrackVol
            PIANO.Music.Track.volume[i + 1] = secondTrackVol
          } else {
            MIDI.OUT([0xB0, 0x07, arg], PIANO.DeviceID)
            MIDI.OUT([0xB1, 0x07, arg], PIANO.DeviceID)
          }
        }

      } else if (func === 'Balance') {
        this.Music = {...this.Music, Balance: arg}
        if (arg === 50 ) {
          const vol = this.Music.Volume.master
          PIANO.set('Volume', vol, 'Global')
          PIANO.set('Volume', vol, 'MIDI2ch')
          this.Music.Volume = {...this.Music.Volume, rightHand: 100, leftHand: 100}
        } else if ( arg < 50 ) {
          const rightHandVol = Math.floor(100 * arg / 50)
          this.Music.Volume = {...this.Music.Volume, rightHand: rightHandVol, leftHand: 100}
          const vol = Math.floor(this.Music.Volume.master * rightHandVol / 100)
          PIANO.set('Volume', vol, 'Global')
          PIANO.set('Volume', this.Music.Volume.master, 'MIDI2ch')
        } else if ( arg > 50 ) {
          const leftHandVol = Math.floor(100 * (100 - arg) / 50 )
          this.Music.Volume = {...this.Music.Volume, rightHand: 100, leftHand: leftHandVol}
          const vol = Math.floor(this.Music.Volume.master * leftHandVol / 100)
          PIANO.set('Volume', this.Music.Volume.master, 'Global')
          PIANO.set('Volume', vol, 'MIDI2ch')
        }

      } else if (func === 'Tempo') {
        this.Music.Tempo = {...this.Music.Tempo, original : arg}
        if (MIDI.API === "KWMcore") {
          KWM.setSmfTempo(arg)
        }

      } else if (func === 'RelativeTempo') {
        this.Music.Tempo = {...this.Music.Tempo, relative : arg}
        if (MIDI.API === "KWMcore") {
          KWM.setSmfRelativeTempo(arg)
        }

      } else if (func === 'Transpose') {
        this.Music = {...this.Music, Transpose : arg}
        if (MIDI.API === "KWMcore") {
          KWM.setSmfTranspose(arg)
        }

      } else if (func === 'SoundDefault') {
        return await appController.sendSmfSound(arg.id)
        const sendMidi =(sound)=> {
          Object.keys(sound).forEach((part) => {
            Object.keys(sound[part]).forEach((param) => {
              const item = sound[part][param]
              if (param === 'Volume') {
                if (part === 'Global') {
                  this.Music.Volume = {...this.Music.Volume, rightHand: item}
                } else {
                  this.Music.Volume = {...this.Music.Volume, leftHand: item}
                }
                const vol = Math.floor(this.Music.Volume.master * item / 100)
                this.set('Volume', vol, part)

            } else {
                this.set(param, item, part)
              }
            })
          })
        }
        if (sound) {
          setTimeout(() => { sendMidi(sound.data) },0)
        }

      } else if (func === 'RepeatA') {
        KWM.setSmfRepeatA(0).then((result)=>{
            console.log(result)
            this.Music = {...this.Music, RepeatA: result.repeatA, RepeatB: result.repeatB}
            this.Music.Time = {...this.Music.Time, pointA: result.timeStringRepeatA, pointB: result.timeStringRepeatB}
            PIANO.onPlayerChange() // UI側へ変更通知
          }).catch(()=> {
        })
      } else if (func === 'RepeatB') {
        KWM.setSmfRepeatB().then((result)=>{
            console.log(result)
            this.Music = {...this.Music, RepeatA: result.repeatA, RepeatB: result.repeatB}
            this.Music.Time = {...this.Music.Time, pointA: result.timeStringRepeatA, pointB: result.timeStringRepeatB}
            PIANO.onPlayerChange() // UI側へ変更通知
          }).catch(()=> {
        })

      } else if (func === 'ClearFavorite') {
        PRESET.PlayList[0].data = []
        DATABASE.saveUserSettings('FavoriteMusic')

      } else if (func === 'ClearRecently') {
        PRESET.PlayList[1].data = []
        DATABASE.saveUserSettings('RecentMusic')

      } else if (func === 'Init') {
        this.Music = { ...this.Music,
          Mode: 'Player',
          Status: 'init',
          Selected: {name: null},
          Queue: [],
        }
        recWorker.clearBuffHandler()
      }

    } else if (parameter === 'RecControl') {
      if (this.RecControl.isBusy) {
        // this.onPianoError('recWorkerBusy')
        console.error('!recWorker busy! ignored command: ', data, part)
        return
      }

      // 引数名前変更
      const func = data
      let arg = part

      // プロパティセット
      if (func === 'property') {
        if (!['standby', 'recording', 'save', 'delete'].includes(this.RecControl.Status)) {
          if (arg.Format) {
            PIANO.set('AudioRecFormat', arg.Format.toUpperCase(), 'System')
          }
          this.RecControl = { ...this.RecControl, ...arg }
        }

      // ステータスセット
      } else {

        const initRecObj =()=> {
          const obj = {
            id: '',
            name: '',
            attribute: '',
            filePath: {},
            isSaved: '',
            recordedDevice: '',
            overdub: false,
            overdubTime: 0,
            tempo: {},
            time: {total: ''},
          }
          this.RecControl.Selected = { ...this.RecControl.Selected, ...obj }
          this.RecControl = { ...this.RecControl, Status: 'init', startTime: null,  endTime: null }
        }

        // MusicModeの変更
        if (this.MusicMode !== 'RecControl') {
          if (this.Music.Status === 'play') {
            this.onPianoError('musicStopWorning')
            return
          }
          this.MusicMode = 'RecControl'
        }

        // ステータス変更して、ピアノから応答があるまで、さらなるステータス変更を禁止に
        const currentStatus = this.RecControl.Status
        this.RecControl = { ...this.RecControl, Status: func, isBusy: true }

        // 各ステータス毎のオブジェクト操作
        if (func === 'init') {
          initRecObj()
        } else if (func === 'stop') {
          //処理無し

        } else if (func === 'overdub') {
          const obj = (!arg) ? { overdub: true }
            : (arg.isRecFile) ? { ...arg, overdub: true }
            : { ...arg,  overdub: true, isRecFile: false }
          this.RecControl.Selected = { ...this.RecControl.Selected, ...obj }

          // レコーダーボリュームセット
          const vol = (this.RecControl.Selected.isRecFile) ? this.Music.Volume.usbRec : this.Music.Volume.usbPlay
          PIANO.set('AudioPlayVolume', vol, 'System')

        } else if (func === 'standby') {

          // id取得(通し番号)
          let idNum
          if (this.RecControl.RecordedSongs.length) {
            let idNumArray = []
            for (const item of this.RecControl.RecordedSongs) {
              const Num = Number(item.id.split('_')[1])
              idNumArray.push(Num)
            }
            idNum = Math.max.apply(null, idNumArray) + 1
            console.log(idNum, idNumArray)
          } else {
            idNum = 0
          }

          if (this.RecControl.Format === 'internal') {

            const songNum = (!this.RecControl.Selected.overdub)
              ? this.RecControl.IntMemoryAvailablity.findIndex(item => item)
              : Number(this.RecControl.Selected.filePath.split('/')[1])
            const songPart = (!this.RecControl.Selected.overdub) ? 0 : 1
            if (songNum === -1) {
              this.onPianoError('IntMemoryFull')
              this.RecControl = { ...this.RecControl, Status: 'init', isBusy: false }
              return
            }
            const obj = {
              id: 'rec_' + idNum,
              attribute: 'kso',
              filePath: 'internal/' + songNum + '/' + songPart,
              isSaved: false,
              recordedDevice: this.DeviceID,
              tempo: this.Rhythm.Tempo,
              inPiano: true,
              isUSBMusicPlayer: false
            }
            this.RecControl.Selected = {...this.RecControl.Selected, ...obj}

          } else {
            if (!this.RecControl.Selected.overdub && this.RecControl.Selected.attribute !== 'kso') {
              this.RecControl.Selected = {...this.RecControl.Selected,
                id: 'rec_' + idNum,
                attribute: this.RecControl.Format,
                filePath: '',
                isSaved: false,
                recordedDevice: this.DeviceID,
                tempo: this.Rhythm.Tempo,
                inPiano: true,
                isUSBMusicPlayer: true
              }
            } else {
              this.RecControl.Selected = {...this.RecControl.Selected,
                id: 'rec_' + idNum,
                isSaved: false,
                recordedDevice: this.DeviceID,
                tempo: this.Rhythm.Tempo,
                inPiano: true,
              }
            }
          }

          // コールバック関数に状態変更処理追加
          if (arg) {
            const callback = arg
            arg = {
              onRecording () {
                callback.onRecording()
                PIANO.RecControl = { ...PIANO.RecControl, Status: 'recording' }
              },
              onComplete () {
                callback.onComplete()
                PIANO.RecControl = { ...PIANO.RecControl, Status: 'complete' }
              }
            }
          }

        } else if (func === 'recording') {
          this.RecControl = { ...this.RecControl, startTime: performance.now() }

        } else if (func === 'complete') {
          if (this.RecControl.startTime) {
            this.RecControl = { ...this.RecControl, endTime: performance.now() }
          }

        } else if (func === 'play' || func === 'overdubPlay') {

          // コールバック関数に状態変更処理追加
          if (arg) {
            const callback = arg
            arg =()=> {
              callback()
              this.RecControl = { ...this.RecControl, Status: currentStatus }
            }
          }

          // レコーダーボリュームセット
          if (func === 'play') {
            const vol = (this.RecControl.Selected.isRecFile) ? this.Music.Volume.usbRec : this.Music.Volume.usbPlay
            PIANO.set('AudioPlayVolume', vol, 'System')
          }

        } else if (func === 'save') {
          // RecControl.Selectedオブジェクト更新
          const rectime = Math.floor(this.RecControl.endTime - this.RecControl.startTime)
          const obj = {
            name: arg,
            isSaved: true,
            isRecFile: true,
            time: {total: rectime},
          }
          if (this.RecControl.Format !== 'internal') { obj.filePath = arg + '.' + this.RecControl.Format }

          // コンバートオーディオプロパティ追加
          if (this.RecControl.Format !== 'internal' && this.RecControl.Selected.attribute === 'kso') {
            obj.attribute = this.RecControl.Format,
            obj.filePath = arg + '.' + this.RecControl.Format
            obj.isUSBMusicPlayer = true
          }
          // オーバーダブプロパティ追加
          if (this.RecControl.Selected.overdub) {
            obj.overdubTime = this.RecControl.Selected.overdubTime + 1
            if (this.RecControl.Format === 'internal') {
              const songPath = this.RecControl.Selected.filePath.slice(0, -1) + '0'
              const i = this.RecControl.RecordedSongs.findIndex ((item)=> { return item.filePath === songPath })
              if (i !== -1) { this.RecControl.RecordedSongs[i].overdub = true }
              console.log(songPath, i, this.RecControl.RecordedSongs[i])
            }
          }
          this.RecControl.Selected = { ...this.RecControl.Selected, ...obj }

          // 内蔵レコーダーの場合、録音メモリフラグを更新、USbレコーダーの場合、ExternalStrageにオブジェクト追加
          if (this.RecControl.Format === 'internal') {
            const i = this.RecControl.Selected.filePath.split('/')[1]
            this.RecControl.IntMemoryAvailablity[i] = false
            arg = null
          } else {
            PIANO.ExternalStrage.push(this.RecControl.Selected)
            arg = this.RecControl.Selected.filePath
          }

          // 各曲リストを更新
          if(!PIANO.Sync) { return }
          this.RecControl.RecordedSongs.push(this.RecControl.Selected)
          DATABASE.saveUserSettings('RecordingSong')

          // レコーダー初期化
          initRecObj()

        } else if (func === 'delete') {
          if (arg === 'All') {
            PIANO.RecControl = {...PIANO.RecControl, RecordedSongs: [], IntMemoryAvailablity: [true, true, true, true, true, true, true, true, true, true] }
            PRESET.PlayList[0].data = PRESET.PlayList[0].data.filter((item) => {return !item.isRecFile })
            PRESET.PlayList[1].data = PRESET.PlayList[1].data.filter((item) => {return !item.isRecFile })
            DATABASE.saveUserSettings('FavoriteMusic')
            DATABASE.saveUserSettings('RecentMusic')
          } else if (arg === 'Current') {
            if (this.RecControl.Format === 'internal') { arg = 'CurrentInt' }
          } else if (arg === 'OldestIntSong') {
            for (let i = 0; i < this.RecControl.RecordedSongs.length; i++) {
              const obj = this.RecControl.RecordedSongs[i]
              if (obj.isRecFile && !obj.isUSBMusicPlayer) {
                const songNum = Number(obj.filePath.split('/')[1])

                const filteredIntSongObj =(objArray, songNum)=> {
                  console.log(objArray, songNum)
                  return objArray.filter((item) => {
                    if (item.isRecFile) {
                      const strage = item.filePath.split('/')[0]
                      const num = Number(item.filePath.split('/')[1])
                      return !(strage === 'internal' &&  num === songNum)
                    } else {
                      return item
                    }
                  })
                }
                // 録音した曲リストから消去
                this.RecControl = { ...this.RecControl, RecordedSongs: filteredIntSongObj(this.RecControl.RecordedSongs, songNum) }
                this.RecControl.IntMemoryAvailablity[songNum] = true
                // お気に入り曲リスト、最近弾いた曲リストから消去
                PRESET.PlayList[0].data = filteredIntSongObj(PRESET.PlayList[0].data, songNum)
                PRESET.PlayList[1].data = filteredIntSongObj(PRESET.PlayList[1].data, songNum)
                DATABASE.saveUserSettings('RecentMusic')

                arg = obj.filePath
                break
              }
            }
          }

          if(!PIANO.Sync) { return }
          DATABASE.saveUserSettings('RecordingSong')

          // レコーダー初期化
          initRecObj()
        }

        // ピアノへMIDIメッセージ送信してステータス変更要求を出す
        recWorker.changeRecStatus(func, arg)
        console.log('\u001b[34m'　+ '録音・再生状態変更',[PIANO.MusicMode, PIANO.RecControl.Status])
      }

    } else if (parameter === 'Rhythm') {
      const type = data
      const value = part
      // PIANOオブジェクト 書き込み
      this.Rhythm = {...this.Rhythm, [type]: value}

      if (!this.Rhythm.isActive && type === 'Play' && fromPiano) {
        this.Rhythm = {...this.Rhythm, isActive: true}
      }

      // MIDI送信
      if (PIANO.Sync && !fromPiano) {
        // KawaiSysExのオブジェクト形式に変換
        // この変換はgetMidi関数にあった方がよいが、他もこちらで処理している
        let p
        let d
        if (type === 'Play') {
          p = 'Metronome'
          if (value === false) { d = {value: 'Stop'} } else { d = {value: 'Run'} }
        }　else if (type === 'Mode') {
          p = 'MetronomeMode'
          d = { value: value }
        }　else if (type === 'Tempo') {
          p = 'MetronomeTempo'
          d = value
        }　else if (type === 'Volume') {
          p = 'MetronomeVolume'
          d = value
        }　else if (type === 'Beat') {
          p = 'BeatSelect'
          d = value
        }　else if (type === 'Pattern') {
          p = 'RhythmSelect'
          d = value
        }　else if (type === 'Counter') {
          p = 'BeatCounter'
          d = value
        }
        MIDI.OUT(DATABASE.getMidi(p, d, 'System'), PIANO.DeviceID)
      }
    } else if (parameter === 'Headphones') {
      let status
      if (data.value) { status = true } else {status = false }
      this.onHeadphonesStatus(status)
    } else if (parameter === 'USBMemory') {
      if (!KWM.isEmbeddedMode) { return }
      if (data === 'ClearUsbMusicObj') {

        // 楽曲オブジェクト配列のUsbMusicPlayerオブジェクトを消去
        PIANO.ExternalStrage.splice(0)
        PRESET.PlayList[0].data = PRESET.PlayList[0].data.filter((item) => {return !item.isUSBMusicPlayer })
        PRESET.PlayList[1].data = PRESET.PlayList[1].data.filter((item) => {return !item.isUSBMusicPlayer })
        PIANO.RecControl.RecordedSongs = PIANO.RecControl.RecordedSongs.filter((item) => {return !item.isUSBMusicPlayer })
        if (PIANO.Music.Selected.isUSBMusicPlayer) { PIANO.Music.Selected = { name: null } }
        // Jsonファイルを書き換え
        if (MIDI.API === "KWMcore") {
          if(!PIANO.Sync) { return }
          if (PRESET.PlayList[0].data.length === 0) { return }
          DATABASE.saveUserSettings('FavoriteMusic')
          if (PRESET.PlayList[1].data.length === 0) { return }
          DATABASE.saveUserSettings('RecentMusic')
          if (this.RecControl.RecordedSongs.length === 0) { return }
          DATABASE.saveUserSettings('RecordingSong')
        }

      } else {
        let status
        if (data.value) { status = true } else {status = false }
        this.onUsbStatus(status)
        if (status) {
          // Insert USB Memory.
          const midi = DATABASE.getMidi(
            'FileAccess',
            { value: 'FileListRequest' },
            undefined,
            false
          )
          MIDI.OUT(midi, PIANO.DeviceID)
          // auto set rec format
          const formatObj = PIANO.get('AudioRecFormat', 'System')
          const Format = formatObj.valueList[formatObj.value].toLowerCase()
          this.set('RecControl', 'property', { Format })
        } else {

          // init
          if (PIANO.MusicMode === 'Music') {
            PIANO.set('Music', 'Reset')
          } else if (PIANO.MusicMode === 'RecControl') {
            if (!['init', 'stop'].includes(PIANO.RecControl.Status) && PIANO.RecControl.Selected.isUSBMusicPlayer) {
              this.set('RecControl',　'init', true)
            }
          }
          // force set rec format to the 'internal'
          this.RecControl = { ...this.RecControl, Format: 'internal' }
          // clear usb recorder song object
          this.set('USBMemory', 'ClearUsbMusicObj')
        }
      }

    } else if (parameter === 'UserTouchCurve') {
      if (data === 'StartEdit') {
        await appController.startEditCurve()
      } else if (data === 'EndEdit') {
        appController.endEditCurve()
        DATABASE.saveUserSettings('UserVtData', 2000)
      } else {
        if (fromPiano)  { return }
  
        // dataが空の場合
        if (data === null) { return }
        // dataが配列型の場合、オブジェクト型に変換
        if (typeof data === 'array') { data = {velocityData: data} }
        // パート処理
        if (part === undefined) { part = 'System' }
        // 必要に応じてデータオブジェクトを補完
        if (!data.memoryNo) { data.memoryNo = 'Temporary' }
        if (!data.existOfPoint) { data.existOfPoint = Array(data.velocityData.length).fill(0) }
        // if (!data.value) { data.value = 'TouchCurveOperationPointHeader' }
        if (!data.value) { data.value = 'TouchCurveBulkOperationPoint' }
  
        if (!fromPiano) {
          appController.sendCurvePointData(data)
        }
      }
    } else if (parameter === 'PerNote') {
      if (data === 'StartEditVoicing') {
        await appController.startEditPerNoteVt({ name: 'PerNoteVoicingData' })
      } else if (data === 'EndEditVoicing') {
        appController.endEditPerNoteVt({ name: 'PerNoteVoicingData' })
        DATABASE.saveUserSettings('UserVtData', 2000)
      } else if (data === 'StartEditTuning') {
        await appController.startEditPerNoteVt({ name: 'PerNoteTuningData' })
      } else if (data === 'EndEditTuning') {
        appController.endEditPerNoteVt({ name: 'PerNoteTuningData' })
        DATABASE.saveUserSettings('UserVtData', 2000)
      } else if (data === 'StartEditTemperament') {
        await appController.startEditPerNoteVt({ name: 'PerNoteTemperamentData' })
      } else if (data === 'EndEditTemperament') {
        appController.endEditPerNoteVt({ name: 'PerNoteTemperamentData' })
        DATABASE.saveUserSettings('UserVtData', 2000)
      } else if (data === 'StartEditKeyVolume') {
        await appController.startEditPerNoteVt({ name: 'PerNoteKeyVolumeData' })
      } else if (data === 'EndEditKeyVolume') {
        appController.endEditPerNoteVt({ name: 'PerNoteKeyVolumeData' })
        DATABASE.saveUserSettings('UserVtData', 2000)
      } else {
        if (fromPiano) { return }
  
        // dataが空の場合
        if (data === null || data.value === null) { return }
        // パート処理
        if (part === undefined) { part = 'System' }
  
        if (data.value === 'PerNoteVoicingData'){
          // dataが配列型の場合、オブジェクト型に変換
          if (typeof data === 'array') { data = {keysVoicingOfst: data} }
          if (!data.memoryNo) data.memoryNo = 'Temporary'
          appController.sendPerNoteVtData(data)
        }
        else if (data.value === 'PerNoteTuningData') {
          // dataが配列型の場合、オブジェクト型に変換
          if (typeof data === 'array') { data = {keysTuningOfst: data} }
          if (!data.memoryNo) data.memoryNo = 'Temporary'
          appController.sendPerNoteVtData(data)
        }
        else if (data.value === 'PerNoteTemperamentData') {
          // dataが配列型の場合、オブジェクト型に変換
          if (typeof data === 'array') { data = {keysTuningOfst: data} }
          if (!data.memoryNo) data.memoryNo = 'Temporary'
          appController.sendPerNoteVtData(data)
        }
        else if (data.value === 'PerNoteKeyVolumeData') {
          // dataが配列型の場合、オブジェクト型に変換
          if (typeof data === 'array') { data = {keysVolOfst: data} }
          if (!data.memoryNo) data.memoryNo = 'Temporary'
          appController.sendPerNoteVtData(data)
        }
      }
    } else if (parameter === 'BluetoothPairingReset') {
      appController.sendParam(part, parameter, {})
    } else {
      if (data === null) { return }
      // dataが文字型,数値型の場合、オブジェクト型に変換
      if (typeof data === 'string' || typeof data === 'number') { data = {value: data} }
      // パート処理
      if (part === undefined) {part = 'System'}

      // 存在しない場合、変更有無を確認する
      let isChanged = true
      if (this.Parameters[part]) {
        const item = this.Parameters[part][parameter]
        if (item) {
          // enumパラメーターで引数がstringの場合、numberに変換
          if　(typeof data.value === 'string' && this.Parameters[part][parameter].valueType === 'enum') {
            const param = data.value
            data.value = this.Parameters[part][parameter].valueList.findIndex(item => item === data.value)
            if (data.value === -1) {
              console.warn( '"' + param + '" is not existing in enum list')
              return
            }
          }
          if　(typeof data.subValue === 'string' && this.Parameters[part][parameter].subValueType === 'enum') {
            const param = data.subValue
            data.subValue = this.Parameters[part][parameter].subValueList[data.value].findIndex(item => item === data.subValue)
            if (data.subValue === -1) {
              console.warn( '"' + param + '" is not existing in enum list')
              return
            }
          }

          if (item.value === data.value && item.subValue === data.subValue && item.subValue2 === data.subValue2) {
            isChanged = false
          }
        }
      }

      //強制送信パラメーター
      // CA49等でリバーブを本体側で音色毎に記憶しているため、上書きするために強制送信が必要になった
      const forceSendItems = ['Reverb', 'ReverbType']
      if ( forceSendItems.includes(parameter) ) { isChanged = true }

      if (isChanged || forceSend) {
        // MIDI送信
        let midi
        if (!fromPiano) {
          midi = DATABASE.getMidi(parameter, data, part)
          if (PIANO.Sync) { MIDI.OUT(midi, PIANO.DeviceID) }
        }
        // PIANO.Parameters書き換え
        appController.setParam(part, parameter, data)
        // KWMcoreのjsonに保存
        if (USER.CacheMode === 'auto') { KawaipianoJs.autoSaveCache() }
        // console.log('Parameter Changed : ', parameter, part, this.Parameters[part][parameter])　// デバッグ用

      }

    }
  }
}

/*
 * PRESET Data Object
 */
const PRESET = {
  Timbre: [],
  Sound: [],
  SoundPalette: [
    {
      name:'SK-EX Concert Grand',
      nameJa:'SK-EX コンサートグランド',
      data: []
    },
    {
      name:'EX Concert Grand',
      nameJa:'EX コンサートグランド',
      data: []
    },
    {
      name:'SK-5 Grand Piano',
      nameJa:'SK-5 グランドピアノ',
      data: []
    },
    {
      name:'Upright Piano',
      nameJa:'アップライトピアノ',
      data: []
    },
    {
      name:'Favorite',
      nameJa:'お気に入り',
      data: []
    },
    {
      name:'Recently Played',
      nameJa:'最近演奏した音色',
      data: []
    },
    {
      name:'Recommended',
      nameJa:'おすすめ音色',
      data: []
    },
    {
      name:'Classic',
      nameJa:'クラシック',
      data: []
    },
    {
      name:'Jazz',
      nameJa:'ジャズ',
      data: []
    },
    {
      name:'Pop',
      nameJa:'ポップ',
      data: []
    },
    {
      name:'Piano Style Collection',
      nameJa:'ピアノスタイルコレクション',
      data: []
    },
    {
      name:'Ensemble',
      nameJa:'アンサンブル',
      data: []
    },
    {
      name:'Historical',
      nameJa:'ヒストリカル',
      data: []
    },
    {
      name:'Relax',
      nameJa:'リラックス',
      data: []
    },
    {
      name:'Holiday',
      nameJa:'ホリデー',
      data: []
    },
    {
      name:'Party',
      nameJa:'パーティ',
      data: []
    },
    {
      name:'Chillout',
      nameJa:'チルアウト',
      data: []
    },
  ],
  Music: [],
  PlayList: [
    {
      name:'Favorite',
      nameJa:'お気に入り',
      data: []
    },
    {
      name:'Recently Played',
      nameJa:'最近再生した曲',
      data: []
    },
    {
      name:'Composer',
      nameJa:'作曲家',
      data: []
    },
    {
      name:'Lesson Books',
      nameJa:'楽譜集',
      data: []
    },
    {
      name:'Genre',
      nameJa:'ジャンル',
      data: []
    },
    {
      name:'Sound Demo',
      nameJa:'音色デモ',
      data: []
    }
  ],
  VirtualTechnician: [],
  TouchCurve: [
    {
      name:'Light1',
      nameJa:'ライト1',
      data: [0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
          16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
          32, 33, 34, 35, 36, 37, 38, 39, 41, 42, 43, 44, 45, 46, 47, 48,
          49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 60, 61, 62, 63, 64, 65,
          66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 79, 80, 81, 82,
          83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 99,
         100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,
         116,118,119,120,121,122,123,124,125,126,127,127,127,127,127,127,]
    },
    {
      name:'Light2',
      nameJa:'ライト2',
      data: [0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
          16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
          32, 33, 34, 36, 37, 38, 39, 40, 41, 42, 43, 44, 46, 47, 48, 49,
          50, 51, 52, 53, 55, 56, 57, 58, 59, 60, 61, 62, 63, 65, 66, 67,
          68, 69, 70, 71, 72, 73, 75, 76, 77, 78, 79, 80, 81, 82, 84, 85,
          86, 87, 88, 89, 90, 91, 92, 94, 95, 96, 97, 98, 99,100,101,102,
         104,105,106,107,108,109,110,111,113,114,115,116,117,118,119,120,
         121,123,124,125,126,127,127,127,127,127,127,127,127,127,127,127,]
    },
    {
      name:'Light3',
      nameJa:'ライト3',
      data: [5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
          21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
          37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52,
          53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68,
          69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84,
          85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99,100,
         101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,
         117,118,119,120,121,122,123,124,125,126,127,127,127,127,127,127,]
    },
    {
      name:'Light4',
      nameJa:'ライト4',
      data: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
        26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
        42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57,
        58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73,
        74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89,
        90, 91, 92, 93, 94, 95, 96, 97, 98, 99,100,101,102,103,104,105,
        106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,
        122,123,124,125,126,127,127,127,127,127,127,127,127,127,127,127,]
    },
    {
      name:'Normal',
      nameJa:'ノーマル',
      data: [0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
        16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
        32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
        48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63,
        64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79,
        80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95,
        96, 97, 98, 99,100,101,102,103,104,105,106,107,108,109,110,111,
        112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,]
    },
    {
      name:'Heavy1',
      nameJa:'ベビー1',
      data: [0,  1,  2,  2,  3,  4,  5,  6,  6,  7,  8,  9, 10, 10, 11, 12,
          13, 14, 14, 15, 16, 17, 18, 18, 19, 20, 21, 22, 22, 23, 24, 25,
          26, 27, 28, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43,
          44, 45, 46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 58, 59, 60, 61,
          62, 63, 64, 65, 67, 68, 69, 70, 71, 72, 73, 74, 76, 77, 78, 79,
          80, 81, 82, 83, 84, 86, 87, 88, 89, 90, 91, 92, 93, 95, 96, 97,
          98, 99,100,101,102,103,105,106,107,108,109,110,111,112,114,115,
         116,117,118,119,120,121,123,124,125,126,127,127,127,127,127,127,]
    },
    {
      name:'Heavy2',
      nameJa:'ヘビー2',
      data: [0,  1,  1,  2,  2,  3,  3,  4 , 4,  5,  5,  6,  6,  7,  7,  8,
          9,  9, 10, 10, 11, 11, 12, 12 ,13, 13, 14, 14, 15, 15, 16, 17,
         19, 20, 21, 22, 24, 25, 26, 27 ,29, 30, 31, 33, 34, 35, 36, 38,
         39, 40, 42, 43, 44, 45, 47, 48 ,49, 50, 52, 53, 54, 56, 57, 58,
         59, 61, 62, 63, 64, 66, 67, 68 ,70, 71, 72, 73, 75, 76, 77, 79,
         80, 81, 82, 84, 85, 86, 87, 89 ,90, 91, 93, 94, 95, 96, 98, 99,
        100,101,103,104,105,107,108,109,110,112,113,114,116,117,118,119,
        121,122,123,124,126,127,127,127,127,127,127,127,127,127,127,127,]
    },
    {
      name:'Heavy3',
      nameJa:'ヘビー3',
      data: [0,  1,  1,  2,  3,  3,  4,  5,  6,  6,  7,  8,  8,  9, 10, 10,
          11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
          27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42,
          43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58,
          59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74,
          75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90,
          91, 92, 93, 94, 95, 96, 97, 98, 99,100,101,102,103,104,105,106,
         107,108,109,110,111,112,113,115,116,118,119,121,122,124,125,127,]
    },
    {
        name:'Heavy4',
        nameJa:'ヘビー4',
        data: [0,  1,  1,  1,  2,  2,  2,  3,  3,  4,  4,  5,  5,  5,  6,  6,
          7,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
         22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37,
         38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53,
         54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69,
         70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85,
         86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99,100,101,
        102,103,104,105,106,107,109,111,113,115,117,119,121,123,125,127,]
    },
    {
      name:'Off',
      nameJa:'オフ',
      data: [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80,
          80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80,
          80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80,
          80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80,
          80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80,
          80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80,
          80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80,
          80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80,]
    }
  ],
  PerNote: [],
  InitData: []
}

/*
 * USER Data Object
 */
let USER = {
  Timbre: [],
  Sound: [],
  SoundPalette: [
    {
      name:'User',
      nameJa:'ユーザー',
      data: []
    },
  ],
  Music: [],
  PlayList: [
    {
      name: 'Recorder Playback',
      nameJa: '録音した曲',
      data: []
    },
    {
      name:'Downloaded',
      nameJa:'ダウンロード曲',
      data: []
    },
  ],
  VirtualTechnician: [],
  TouchCurve: [
    {
      memoryNo: 'temporary',
      name:'Ivory',
      data: [0,  0,  1,  1,  2,  2,  3,  4,  5,  6,  7,  7,  8,  9, 10, 11,
          11, 12, 13, 13, 14, 15, 15, 16, 17, 17, 18, 19, 20, 21, 22, 22,
          23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 33, 34, 35, 36, 37,
          38, 39, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52,
          54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 69, 70,
          71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 83, 84, 85, 86, 87,
          89, 90, 91, 92, 93, 94, 96, 97, 98,100,101,102,104,105,106,107,
         109,110,111,112,114,115,117,118,120,121,122,123,124,125,126,127,],
      point: [0,  0,  1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1,],
    },
    {
      name:'Pianoteq',
      data: [0,  0,  0,  0,  0,  1,  2,  2,  2,  3,  3,  3,  4,  4,  4,  5,
           5,  5,  5,  6,  6,  7,  7,  7,  8,  8,  9,  9, 10, 10, 11, 11,
          12, 12, 13, 14, 14, 15, 16, 17, 18, 19, 20, 20, 21, 22, 23, 24,
          25, 26, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 37, 38, 39, 40,
          41, 42, 44, 45, 46, 48, 49, 50, 52, 53, 54, 55, 56, 57, 59, 60,
          61, 63, 65, 66, 68, 69, 70, 72, 73, 74, 76, 77, 78, 80, 82, 84,
          85, 87, 88, 90, 92, 93, 95, 96, 98, 99,101,102,104,105,107,108,
          110,111,113,114,115,117,118,119,121,122,123,124,125,126,127,127,]
    },
    {
      name:'User',
      data: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,
        16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,
        32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,
        48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,
        64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,
        80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,
        96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,
        112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127]
    }
  ],
  PerNote: {
    Voicing: {
      name: 'User',
      data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    },
    Tuning: {
      name: 'User',
      data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    },
    Temperament: {
      name: 'User',
      data: [0,0,0,0,0,0,0,0,0,0,0,0]
    },
    Volume: {
      name: 'User',
      data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    },
  },
  CacheMode: 'init',  //'init', 'user', 'auto'
  CacheData: undefined
}

/*
 * DATABASE Object
 */
const DATABASE = {
  systemKey: [
    'PowerOff',
    'Sync',
    'Model',
    'Mode',
    'Destination',
    'Language',
    'Version',
    'Checksum',
    'MemoryAddress',
    'RequestModel',
    'RequestDestination',
    'RequestLanguage',
    'RequestVersion',
    'Result_Error',
    'Result_Busy'
  ],
  SysEx: [],
  Model: [],
  Destination: [],
  Sound: [],
  PresetSound: [],
  Vt:[],
  Effect: [],
  Music: [],
  Rhythm: [],
  Result: [],
  Part: {
    0x00: 'Main1',
    0x01: 'Main2',
    0x02: 'Main3',
    0x03: 'Main4',
    0x08: 'Layer',
    0x09: 'Lower',
    0x0A: 'FourHandsRight',
    0x0B: 'FourHandsLeft',
    0x0F: 'Global',
    0x10: 'RecorderMain1',
    0x11: 'RecorderMain2',
    0x12: 'RecorderMain3',
    0x13: 'RecorderMain4',
    0x18: 'RecorderLayer',
    0x19: 'RecorderLower',
    0x1A: 'Recorder4Hands Right',
    0x1B: 'Recorder4Hands Left',
    0x1F: 'RecorderGlobal',
    0x20: 'SMF1ch',
    0x21: 'SMF2ch',
    0x22: 'SMF3ch',
    0x23: 'SMF4ch',
    0x24: 'SMF5ch',
    0x25: 'SMF6ch',
    0x26: 'SMF7ch',
    0x27: 'SMF8ch',
    0x28: 'SMF9ch',
    0x29: 'SMF10ch',
    0x2A: 'SMF11ch',
    0x2B: 'SMF12ch',
    0x2C: 'SMF13ch',
    0x2D: 'SMF14ch',
    0x2E: 'SMF15ch',
    0x2F: 'SMF16ch',
    0x30: 'MIDI1ch',
    0x31: 'MIDI2ch',
    0x32: 'MIDI3ch',
    0x33: 'MIDI4ch',
    0x34: 'MIDI5ch',
    0x35: 'MIDI6ch',
    0x36: 'MIDI7ch',
    0x37: 'MIDI8ch',
    0x38: 'MIDI9ch',
    0x39: 'MIDI10ch',
    0x3A: 'MIDI11ch',
    0x3B: 'MIDI12ch',
    0x3C: 'MIDI13ch',
    0x3D: 'MIDI14ch',
    0x3E: 'MIDI15ch',
    0x3F: 'MIDI16ch',
    0x40: 'External1',
    0x41: 'External2',
    0x42: 'External3',
    0x43: 'External4',
    0x4F: 'ExternalGrobal',
    0x7F: 'System'
  },
  FileAccess: [
    [
      'TopOfDataLength',
      'DataPacket',
      'FileName',
      'FileReadRequest',
      'FileWriteRequest',
      'FileDeleteRequest',
      'FileRenameRequest',
      'FileSelectRequest',
      'FileLoadRequest',
      'FileListRequest',
      'EndOfFileList',
      'EndOfData',
      'Wait',
      'Cancel',
      'Nack',
      'Ack'
    ],
    {
      "parameter": "TopOfDataLength",
      "value": "FileAccess",
      "valueJa": "FileAccess",
      "unit": "",
      "fn": "0x24",
      "v1": "0x01",
      "v4Type": "data"
    },
    {
      "parameter": "DataPacket",
      "value": "FileAccess",
      "valueJa": "FileAccess",
      "unit": "",
      "fn": "0x24",
      "v1": "0x02",
      "v4Type": "data"
    },
    {
      "parameter": "FileName",
      "value": "FileAccess",
      "valueJa": "FileAccess",
      "unit": "",
      "fn": "0x24",
      "v1": "0x03",
      "v4Type": "data"
    },
    {
      "parameter": "FileReadRequest",
      "value": "FileAccess",
      "valueJa": "FileAccess",
      "unit": "",
      "fn": "0x24",
      "v1": "0x04",
      "v4Type": "data"
    },
    {
      "parameter": "FileWriteRequest",
      "value": "FileAccess",
      "valueJa": "FileAccess",
      "unit": "",
      "fn": "0x24",
      "v1": "0x05",
      "v4Type": "data"
    },
    {
      "parameter": "FileDeleteRequest",
      "value": "FileAccess",
      "valueJa": "FileAccess",
      "unit": "",
      "fn": "0x24",
      "v1": "0x06",
      "v4Type": "data"
    },
    {
      "parameter": "FileRenameRequest",
      "value": "FileAccess",
      "valueJa": "FileAccess",
      "unit": "",
      "fn": "0x24",
      "v1": "0x07",
      "v4Type": "data"
    },
    {
      "parameter": "FileSelectRequest",
      "value": "FileAccess",
      "valueJa": "FileAccess",
      "unit": "",
      "fn": "0x24",
      "v1": "0x08",
      "v4Type": "data"
    },
    {
      "parameter": "FileLoadRequest",
      "value": "FileAccess",
      "valueJa": "FileAccess",
      "unit": "",
      "fn": "0x24",
      "v1": "0x09",
      "v4Type": "data"
    },
    {
      "parameter": "FileListRequest",
      "value": "FileAccess",
      "valueJa": "FileAccess",
      "unit": "",
      "fn": "0x24",
      "v1": "0x11",
      "v4Type": "data"
    },
    {
      "parameter": "EndOfFileList",
      "value": "FileAccess",
      "valueJa": "FileAccess",
      "unit": "",
      "fn": "0x24",
      "v1": "0x1F",
      "v4Type": "data"
    },
    {
      "parameter": "EndOfData",
      "value": "FileAccess",
      "valueJa": "FileAccess",
      "unit": "",
      "fn": "0x24",
      "v1": "0x7B",
      "v4Type": "data"
    },
    {
      "parameter": "Wait",
      "value": "FileAccess",
      "valueJa": "FileAccess",
      "unit": "",
      "fn": "0x24",
      "v1": "0x7C",
      "v4Type": "data"
    },
    {
      "parameter": "Cancel",
      "value": "FileAccess",
      "valueJa": "FileAccess",
      "unit": "",
      "fn": "0x24",
      "v1": "0x7D",
      "v4Type": "data"
    },
    {
      "parameter": "Nack",
      "value": "FileAccess",
      "valueJa": "FileAccess",
      "unit": "",
      "fn": "0x24",
      "v1": "0x7E",
      "v4Type": "data"
    },
    {
      "parameter": "Ack",
      "value": "FileAccess",
      "valueJa": "FileAccess",
      "unit": "",
      "fn": "0x24",
      "v1": "0x7F",
      "v4Type": "data"
    },
  ],

  // Json load/save
  async getJson () {
    await appController.initDB()
  },
  //TODO: AppController → UseCase (← NativeRepository) → AppPresenter
  loadUserSettings () {
    return new Promise((resolve, reject) => {
      appController.initUser({})

      const getLanguage =()=> {
        return new Promise((resolve) => {
          if (KWM.isEmbeddedMode) {
            resolve()
            return
          }
          KWM.loadJson('user/language.json')
          .then ((data)=> {
            if (data) {
              if (KawaipianoJs.log.json) { console.log({ Lanugage: data }) }
              PIANO.Language = data.Language
              resolve()
            } else {
              if (KawaipianoJs.log.json) { console.log('language.json is empty', data) }
              resolve()
            }
          }).catch(()=> {
            if (KawaipianoJs.log.json) { console.log('language.json is not existing') }
            resolve()
          })
        })
      }
      const getFavoriteMusic =()=> {
        return new Promise((resolve) => {
          KWM.loadJson('user/favoritemusic.json')
          .then ((data)=> {
            if (data.length) {
              if (KawaipianoJs.log.json) { console.log({ FavoriteMusic: data }) }
              PRESET.PlayList[0].data = data
              resolve()
            } else {
              if (KawaipianoJs.log.json) { console.log('favoritemusic.json is empty', data) }
              resolve()
            }
          }).catch(()=> {
            if (KawaipianoJs.log.json) { console.log('favoritemusic.json is not existing') }
            resolve()
          })
        })
      }
      const getRecentMusic =()=> {
        return new Promise((resolve) => {
          KWM.loadJson('user/recentmusic.json')
          .then ((data)=> {
            if (data) {
              if (KawaipianoJs.log.json) { console.log({ RecentMusic: data }) }
              PRESET.PlayList[1].data = data
              resolve()
            } else {
              if (KawaipianoJs.log.json) { console.log('recentmusic.json is empty', data) }
              resolve()
            }
          }).catch(()=> {
            if (KawaipianoJs.log.json) { console.log('recentmusic.json is not existing') }
            resolve()
          })
        })
      }
      const getFavoriteSound =()=> {
        return new Promise((resolve) => {
          KWM.loadJson('user/favoritesound.json')
          .then ((data)=> {
            if (data) {
              if (KawaipianoJs.log.json) { console.log({ FavoriteSound: data }) }
              PRESET.SoundPalette[4].data = data
              resolve()
            } else {
              if (KawaipianoJs.log.json) { console.log('favoritesound.json is empty', data) }
              resolve()
            }
          }).catch(()=> {
            if (KawaipianoJs.log.json) { console.log('favoritesound.json is not existing') }
            resolve()
          })
        })
      }
      const getRecentSound =()=> {
        return new Promise((resolve) => {
          KWM.loadJson('user/recentsound.json')
          .then ((data)=> {
            if (data) {
              if (KawaipianoJs.log.json) { console.log({ RecentSound: data }) }
              PRESET.SoundPalette[5].data = data
              resolve()
            } else {
              if (KawaipianoJs.log.json) { console.log('recentsound.json is empty', data) }
              resolve()
            }
          }).catch(()=> {
            if (KawaipianoJs.log.json) { console.log('recentsound.json is not existing') }
            resolve()
          })
        })
      }
      const getRecordingSong =()=> {
        return new Promise((resolve) => {
          KWM.loadJson('user/recordingsong.json')
          .then ((data)=> {
            if (data) {
              if (KawaipianoJs.log.json) { console.log({ RecordingSong: data }) }
              for (const item of data) {
                if (item.filePath.split('/')[0] === 'internal') {
                  const song = Number(item.filePath.split('/')[1])
                  PIANO.RecControl.IntMemoryAvailablity[song] = false
                  PIANO.RecControl.RecordedSongs.push(item)
                }
              }
              resolve()
            } else {
              if (KawaipianoJs.log.json) { console.log('recordingsong.json is empty', data) }
              resolve()
            }
          }).catch(()=> {
            if (KawaipianoJs.log.json) { console.log('recordingsong.json is not existing') }
            resolve()
          })
        })
      }
      const getUserVtData =()=> {
        return new Promise((resolve) => {
          KWM.loadJson('user/uservt.json')
          .then ((data)=> {
            if (KawaipianoJs.log.json) { console.log({ UserVtData: data }) }
            if (data) {
              USERVTDATA = data
              resolve()
            } else {
              if (KawaipianoJs.log.json) { console.log('uservt.json is empty', data) }
              resolve()
            }
          }).catch((e)=> {
            if (KawaipianoJs.log.json) { console.log('uservt.json is not existing', e) }
            resolve()
          })
        })
      }
      const getUserData =()=> {
        return new Promise((resolve) => {
          KWM.loadJson('user/userdata.json')
          .then ((data)=> {
            if (KawaipianoJs.log.json) { console.log({ UserData: data }) }
            if (data) {
              //TODO: KWMRepository を作って UserUseCase で読み込みと登録を行う
              USER = Object.assign({}, data)
              USER.Sound = []
              USER.VirtualTechnician = []
              // 古いバージョンのユーザー音色のとき、System.Tuning を追加
              data.Sound.filter((soundObj) => !('System' in soundObj.data))
                .forEach((soundObj) => soundObj.data = Object.assign(soundObj.data, { "System": { "Tuning": 440 }}))
              data.Sound.forEach((soundObj) => { appController.storeSoundObj(soundObj) })
              data.VirtualTechnician.forEach((vtObj) => { appController.storeVtObj(vtObj) })
              resolve()
            } else {
              if (KawaipianoJs.log.json) { console.log('userdata.json is empty', data) }
              resolve()
            }
          }).catch((e)=> {
            if (KawaipianoJs.log.json) { console.log('userdata.json is not existing', e) }
            resolve()
          })
        })
      }

      if (MIDI.API === "KWMcore") {
        const loadSeq = Promise.resolve()
        loadSeq
        .then(getLanguage)
        .then(getFavoriteMusic)
        .then(getRecentMusic)
        .then(getFavoriteSound)
        .then(getRecentSound)
        .then(getRecordingSong)
        .then(getUserVtData)
        .then(getUserData)
        .then(()=>{ resolve() })
      } else {
        if (KawaipianoJs.log.json) { console.log('Launch without UserSettings (WebMIDI)') }
        resolve()
      }
    })
  },
  saveTimer: {},
  //TODO: AppController → UseCase (→ NativeRepository)
  saveUserSettings (item, waitTime) {
    if (!KWM.isAvailable) { return }
    const time = (waitTime) ? waitTime : 0
    let path
    let data
    if (item === 'Language') {
      path = 'user/language.json'
      data = {Language: PIANO.Language}
    } else if (item === 'FavoriteMusic') {
      path = 'user/favoritemusic.json'
      data = PRESET.PlayList[0].data
    } else if (item === 'RecentMusic') {
      path = 'user/recentmusic.json'
      data = PRESET.PlayList[1].data
    } else if (item === 'FavoriteSound') {
      path = 'user/favoritesound.json'
      data = PRESET.SoundPalette[4].data
    } else if (item === 'RecentSound') {
      path = 'user/recentsound.json'
      data = PRESET.SoundPalette[5].data
    } else if (item === 'RecordingSong') {
      path = 'user/recordingsong.json'
      data = PIANO.RecControl.RecordedSongs
    } else if (item === 'UserVtData') {
      path = 'user/uservt.json'
      data = USERVTDATA
    } else if (item === 'UserData') {
      path = 'user/userdata.json'
      data = USER
    } else { return }
    if (this.saveTimer.hasOwnProperty(item)) { clearInterval(this.saveTimer[item]) }
    const id = setTimeout(()=>{
      KWM.saveJson(path, data)
      delete this.saveTimer[item]
      if (KawaipianoJs.log.json) { console.log('saveJson', item, data) }
    }, time)
    this.saveTimer = {...this.saveTimer, [item]: id}
  },
  getUiJson (obj, callback) {
    return new Promise((resolve, reject) => {
      if (!obj || !callback) { resolve() }
      const getFromServer =(path)=> {
        return new Promise((resolve) => {
          axios.get(path + "?nocache=" + new Date().getTime())
            .then((response)=>{ resolve(response.data) })
            .catch(()=>{ resolve(null) })
        })
      }
      const getFromKWM =(path)=> {
        return new Promise((resolve) => {
          if (MIDI.API !== 'KWMcore') {
            resolve(null)
            return
          }
          KWM.loadJson(path)
            .then((response)=>{ resolve(response) })
            .catch(()=>{ resolve(null) })
        })
      }
      const promiseArray = obj.map((item)=>{
        const path = item.path
        const fromServer = path.startsWith('https://')
        if (fromServer) {
          return getFromServer(path)
        } else {
          return getFromKWM(path)
        }
      })

      Promise.all(promiseArray)
        .then((results)=>{
          const d = {}
          for (let i = 0; i < obj.length; i++) { d[obj[i].name] = results[i] }
          callback(d)
          resolve()
        })
        .catch(reject)
    })
  },

  // makeTimbreList () {
  makeSoundList () {
    if (!PIANO.Language) { PIANO.Language ='EN' }

    appController.initPreset()
    
    if (PIANO.Model) {
      this.makeSoundPalette ()
    }
  },
  makeSoundPalette () {
    Object.keys(PRESET.SoundPalette).forEach((index)=> {
      const paletteName = PRESET.SoundPalette[index].name
      if ( paletteName !== 'Favorite' && paletteName !== 'Recently Played' )PRESET.SoundPalette[index].data = []
    })
    Object.keys(PRESET.Sound).forEach((index)=> {
      index = Number (index)
      const category = PRESET.Sound[index].category
      const tag = PRESET.Sound[index].tag
      const id = PRESET.Sound[index].id
      if (category === 'SK-EX') {
        PRESET.SoundPalette[0].data.push(id)
      } else if (category === 'EX') {
        PRESET.SoundPalette[1].data.push(id)
      } else if (category === 'SK-5') {
        PRESET.SoundPalette[2].data.push(id)
      } else if (category === 'Upright Piano') {
        PRESET.SoundPalette[3].data.push(id)
      } else if (category === 'Piano Style Collection') {
        PRESET.SoundPalette[10].data.push(id)
      }
      if (tag.includes ('Recommended')) { PRESET.SoundPalette[6].data.push(id) }
      if (tag.includes ('Classic')) { PRESET.SoundPalette[7].data.push(id) }
      if (tag.includes ('Jazz')) { PRESET.SoundPalette[8].data.push(id) }
      if (tag.includes ('Pop')) { PRESET.SoundPalette[9].data.push(id) }
      if (category === 'Ensemble') { PRESET.SoundPalette[11].data.push(id) }
      if (category === 'Historical') { PRESET.SoundPalette[12].data.push(id) }
      if (category === 'Relax') { PRESET.SoundPalette[13].data.push(id) }
      if (category === 'Holiday') { PRESET.SoundPalette[14].data.push(id) }
      if (category === 'Party') { PRESET.SoundPalette[15].data.push(id) }
      if (category === 'Chillout') { PRESET.SoundPalette[16].data.push(id) }
    })
  },

  // 以下の関数はparserオブジェクトに移動予定
  getSystemObj (midi) {
    return appController.midiMsgToSysObj(midi)
  },
  getPianoObj (midi) {

    // 変数宣言
    const fn = midi[3]
    const databyte = midi.slice(6, midi.length - 1)
    let PianoObj = {}

    // 絞り込み
    const param =
      (fn === 0x24) ? this.FileAccess.filter((obj) => {
        return (Number(obj.fn) === fn && Number(obj.v1) === databyte[0])
        })
      : this.SysEx.filter((obj) => {
        return (
          Number(obj.fn) === fn
          && Number(obj.v1) === databyte[0]
          && Number(obj.v2) === databyte[1]
          ) && obj[PIANO.Model] > 0
        })

    // data型メッセージ変換処理
    const parseData = (param) => {
      /**
       * 4 分割された 4byte (28bit) の Length データ を 数値に変換します。
       *
       * @param  {Array}  array Length データ
       * @param  {Number} nBits default:7, 1byte ごとにシフトする幅。
       * @return {Number}       変換された Lenth データ
       */
      function jointByte (array, validBit=7) {
        if (arguments.length === 0 || arguments.length > 2) {
          this.error(parameter, 'jointByte: Invalid argument.', midi)
          return undefined
        } else if (!encode.tools.is('Array', array)) {
          this.error(parameter, 'jointByte: Type of "dataArray" must be Array.', midi)
          return undefined
        } else if (!encode.tools.is('Number', validBit)) {
          this.error(parameter, 'Type of "validBit" must be Number.', midi)
          return undefined
        } else if (array.length < 2) {
          this.error(parameter, 'Invalid array input. Array length is only "4".', midi)
          return undefined
        }

        let result = 0
        let nShift = (array.length - 1) * validBit
        for (let i = 0; i < array.length; i++) {
          result += (array[i] << nShift)
          nShift -= validBit
        }
        return result
      }
      const dataType = param[0].value
      if (['RenderingStatus',
          'sound.json',
          'effect.json',
          'rhythm.json',
          'KeyNum',
          'Tuning',
          'UserTouchCurve',
          'PerNote',
          'BPM',
          'Beat',
          'BeatCounter',
          'Progress',
          'AudioLevel',
          'UserEqGain',
          'UserEqFreq',
          'RecorderFileAccess',
          'Favorite',
          'Save',
          'BluetoothMIDIName',
        ].includes(dataType)) {
        PianoObj = appController.midiMsgToPianoObj(midi)
      } else if (dataType === 'FileAccess') { //!: kawaipiano.js に直書き、FileDataDump, parser.longSysExHandler
        function decodeMidiPacket (data) {
          let auxBits
          const result = []
          for (let i = 0; i < data.length; i++) {
            if (i % 8 === 0) {
              auxBits = data[i]
            } else {
              const signBit = (auxBits << (i % 8)) & 0b10000000
              const decodedByte = signBit + data[i]
              result.push(decodedByte)
            }
          }
          return result
        }
        const parameter = param[0].parameter
        const [v1, v2, v3, v4, v5, v6, v7, v8, v9] = databyte
        const bufferObj = parser.longSysExHandler

        if (fn === 0x24) {
          if (v1 === 0x01) {  // Top of Data Length
            const dataLen = jointByte(databyte.slice(1))
            bufferObj.clearall()
            bufferObj.add({
              parameter,
              dataLen,
              data: [],
              packetCounter: -1,
              lastMsg: []
            })
          } else if (v1 === 0x02) {  // Data Packet
            // Check buffer object.
            if (bufferObj.getCount() === 0) {
              this.error(dataType, 'Buffer is empty.', midi)
              return PianoObj=undefined
            } else if (!bufferObj.get(0).hasOwnProperty('parameter')) {
              this.error(dataType, 'Buffer hasn\'t property "parameter".', midi)
              bufferObj.clearall()
              return PianoObj=undefined
            } else if (bufferObj.get(0).parameter !== 'TopOfDataLength') {
              this.error(
                dataType,
                'Property "parameter" is not "TopOfDataLength".',
                midi
              )
              return PianoObj=undefined
            } else if (midi.toString() === bufferObj.get(0).lastMsg.toString()) {
              console.warn('Ignore this message because it has been received.')
              return PianoObj=undefined
            }
            const lastPacketCounter = Number(bufferObj.get(0).packetCounter)
            if ((databyte[1] - 1) !== lastPacketCounter) {
              this.error(param, 'Invalid "PacketCounter".', midi)
              return PianoObj=undefined
            }

            bufferObj.setObj(0, databyte[1], 'packetCounter')
            bufferObj.get(0).data.push(...databyte.slice(2, -1))
            bufferObj.setObj(0, midi, 'lastMsg')
          } else if (v1 === 0x7B) {  // End Of Data
            // Check buffer object.
            if (bufferObj.getCount() === 0) {
              this.error(dataType, 'Buffer is empty.', midi)
              buffer.Obj.clearall()
              return PianoObj=undefined
            } else if (!bufferObj.get(0).hasOwnProperty('parameter')) {
              this.error(dataType, 'Buffer hasn\'t property "parameter".', midi)
              buffer.Obj.clearall()
              return PianoObj=undefined
            } else if (!bufferObj.get(0).hasOwnProperty('data')) {
              this.error(
                dataType,
                'Buffer hasn\'t property "data".',
                midi
              )
              buffer.Obj.clearall()
              return PianoObj=undefined
            }

            // Decode data packets.
            const decodedData = decodeMidiPacket(bufferObj.get(0).data)

            // Set PianoObj.
            PianoObj = {
              parameter,
              data: decodedData
            }
            bufferObj.clearall()
          } else if (v1 === 0x03) {  // File name
            function isFilelistRequest (bufferObj) {
              if (bufferObj.getCount()) {
                if (bufferObj.get(0).hasOwnProperty('filelistRequest')) {
                  if (bufferObj.get(0).filelistRequest) {
                    return true
                  }
                }
              }
              return false
            }

            const packetCounter = databyte[1]
            const isFilelistRequestInst = isFilelistRequest(bufferObj)
            // Create buffer. When FilelistRequest, created buffer in getMidi().
            if (!isFilelistRequestInst) {
              if (packetCounter === 0 && !bufferObj.get(0)) {
                bufferObj.clearall()
                bufferObj.add({
                  parameter,
                  nameData: [[]],
                  packetCounter: -1,
                  lastMsg: [],
                  filelistRequest: false,
                  fileCounter: 1
                })
              }
            }
            // Check buffer object.
            if (bufferObj.getCount() === 0) {
              this.error(dataType, 'Buffer is empty.', midi)
              return PianoObj=undefined
            } else if (!bufferObj.get(0).hasOwnProperty('parameter')) {
              this.error(dataType, 'Buffer hasn\'t property "parameter".', midi)
              bufferObj.clearall()
              return PianoObj=undefined
            } else if (midi.toString() === bufferObj.get(0).lastMsg.toString()) {
              console.warn('Ignore this message because it has been received.')
              return PianoObj=undefined
            }

            if (bufferObj.get(0).fileCounter === undefined) {
              bufferObj.setObj(0, 1, 'fileCounter')
            }
            // Check packet counter.
            const lastPacketCounter = Number(bufferObj.get(0).packetCounter)
            if ((packetCounter - 1) !== lastPacketCounter) {
              const isNextName = (isFilelistRequestInst)
                && (packetCounter === 0)
                && (bufferObj.get(0).lastMsg.slice(-3)[0] === 0)  // Is null?
              if (isNextName) {
                // Only filelist request.
                bufferObj.setObj(
                  0,
                  bufferObj.get(0).fileCounter + 1,
                  'fileCounter'
                )
                bufferObj.get(0).nameData.push([])
              } else {
                this.error(param, 'Invalid "PacketCounter".', midi)
                return PianoObj=undefined
              }
            }

            bufferObj.setObj(0, databyte[1], 'packetCounter')
            bufferObj.get(0).nameData.slice(-1)[0].push(...databyte.slice(2, -1))
            bufferObj.setObj(0, midi, 'lastMsg')
            if (PIANO.Mode === 'DevelopperMode_HostUpdate') {
              if (midi.slice(-3)[0] === 0x00) {  // Is null?
                bufferObj.setObj(0, true, 'filelistRequest')
                this.getPianoObj([0xF0, 0x40, 0x7F, 0x24, 0x04, 0x1E, 0x1F, 0xF7])
              }
            }
          } else if (v1 === 0x11) {
            console.warn('getPianoObj(): File List Request is invalid inst. Ignore this instruction.')
          } else if (v1 === 0x1F) {  // End Of Filelist
            function sliceAttribute (path) {
              const lastDotIndex = path.lastIndexOf('.')
              if (lastDotIndex === -1) {
                return undefined
              }
              return path.slice(lastDotIndex + 1)
            }
            function sliceFilename (path) {
              const backslashIndex = path.lastIndexOf('\\')
              const dotIndex = path.lastIndexOf('.') === -1 ? undefined
                : path.lastIndexOf('.')
              if (backslashIndex === -1) {
                return path.slice(0, dotIndex)
              }
              return path.slice(backslashIndex + 1, dotIndex)
            }

            // Check buffer object.
            if (bufferObj.getCount() === 0) {
              this.error(dataType, 'Buffer is empty.', midi)
              return PianoObj=undefined
            } else if (!bufferObj.get(0).hasOwnProperty('filelistRequest')) {
              this.error(dataType, 'Buffer hasn\'t property "filelistRequest".', midi)
              bufferObj.clearall()
              return PianoObj=undefined
            } else if (!bufferObj.get(0).hasOwnProperty('fileCounter')) {
              this.error(dataType, 'Buffer hasn\'t property "fileCounter".', midi)
              bufferObj.clearall()
              return PianoObj=undefined
            }
            if (bufferObj.get(0).fileCounter === undefined) {
              return PianoObj={ parameter, data: [] }
            }

            PianoObj = {
              parameter,
              data: []
            }
            const nameList = bufferObj.get(0).nameData
            const nFiles = nameList.length
            if (window.Worker && PIANO.Mode !== 'DevelopperMode_HostUpdate') {
              const worker = encode.tools.newWorkerViaBlob('../../lib/kawaipianojs/worker/doWork.js')
              worker.addEventListener('message', function(e) {
                e.data.forEach((obj) => {
                  PIANO.ExternalStrage.push(obj)
                })
              }, false)
              worker.postMessage({
                baseURL: window.location.href.replace(/\\/g, '/').replace(/\/[^\/]*$/, '/'),
                class: 'convertToFilelistObj',
                nameList
              }) // Send data to our worker.
            } else {
              for (let i = 0; i < nFiles; i++) {
                // Decode midi1.0 format.
                const decodedList = decodeMidiPacket(nameList[i])
                const rawFilePath = Encoding.convert(decodedList, {
                  to: 'UNICODE',
                  from: 'SJIS',
                  type: 'string'
                }).replace(/\0/g, '')  // Remove all null char with regular exp.
                // Format need data.
                const attribute = sliceAttribute(rawFilePath)
                const id = i
                const name = sliceFilename(rawFilePath)
                const filePath = rawFilePath.split('\\').join('/').slice(1)
                // Push into PianoObj.
                PianoObj.data.push({
                  id,
                  name,
                  attribute,
                  filePath
                })
                // Push int ExternalStrage (Refactoring target).
                PIANO.ExternalStrage.push({
                  id,
                  name,
                  attribute,
                  filePath,
                  inPiano: true,
                  isUSBMusicPlayer: true
                })
              }
            }
            bufferObj.clearall()
          } else if (v1 === 0x7C) {  // Wait
            PianoObj = {
              parameter,
              data: {
                wait:true
              }
            }
          } else if (v1 === 0x7D) {  // Cancel
            PianoObj = {
              parameter,
              data: {
                cancel:true
              }
            }
          } else if (v1 === 0x7E) {  // Nack
            PianoObj = {
              parameter,
              data: {
                nack:true
              }
            }
          } else if (v1 === 0x7F) {  // Ack
            PianoObj = {
              parameter,
              data: {
                ack:true
              }
            }
          } else {
            console.error('"v1" is invalid.')
            return PianoObj=undefined
          }
        } else {
          this.error(parameter, '"fn" is invalid value.', midi)
          return PianoObj=undefined
        }
      } else if (dataType === 'msb/lsb') {  //!: not found
        PianoObj.parameter = param[0].parameter
        PianoObj.part = this.Part[databyte[2]]
        PianoObj.data = encode.getNum (databyte[3], databyte[4])
      } else if (dataType === 'ASCII encode') { //!: system
        PianoObj.parameter = param[0].parameter
        PianoObj.part = this.Part[databyte[2]]
        PianoObj.data = encode.getText(data)
      } else if (dataType === '8bit encode') {  //!: system
        PianoObj.parameter = param[0].parameter
        PianoObj.part = this.Part[databyte[2]]
        // PianoObj.data = encode.getHex8bitArray(data)
        const val = encode.getHex8bitArray(data)
        PianoObj.data = { value: val }
      } else {
        PianoObj = undefined
        this.error ('getPianoObj', 'unknown data', midi)
      }

      // Swap parameter and Value.
      // Because parameter and value are wrong in the specification.
      const swapParameterAndValue = (value, parameter, PianoObj) => {
        const exceptionParameter = [
          'FileAccess',
          'PerNote',
          'UserTouchCurve'
        ]
        if (!exceptionParameter.includes(value)) {
          return
        }
        const isUpdatePianoObj = (
          PianoObj.hasOwnProperty('data')
          && PianoObj.hasOwnProperty('parameter')
        )
        if (isUpdatePianoObj) {
          PianoObj.parameter = value
          // PianoObj.data.value = parameter
          PianoObj.data = {...PianoObj.data, ...{ value: parameter }}
        }
      }
      swapParameterAndValue(param[0].value, param[0].parameter, PianoObj)
    }

    // PianoObj生成
    if (param.length === 0) {
      PianoObj = undefined
      this.error('getPianoObj', 'unknown parameter', midi)
    } else if (param[0].v4Type === 'data'){
      parseData(param)
    } else {
      PianoObj = appController.midiMsgToPianoObj(midi)
    }

    // Rhythm、RecorderメッセージはPIANOオブジェクト内で別管理のため、再成形
    if (PianoObj) {
      const rhythmParamList = [
        'Metronome',
        'MetronomeMode',
        'MetronomeTempo',
        'MetronomeVolume',
        'BeatSelect',
        'RhythmSelect',
        'BeatCounter'
      ]
      const recorderParamList = [
        //コントロール
        'Music',
        'MaxTime',
        //プロパティ
        'MusicMode',
        'PianoLifeRecorder',
        //選曲
        'SongSelect',
        'RecMode',
        'IntSongPart',
        'MusicTempo',
        'ABRepeat',
        'RepeatPointA',
        'RepeatPointB',
        'InternalSongDelete',
        //リアルタイムメッセージ
        'AudioLevelMeter',
        'Remote_MusicProgress',
        'MusicProgress',
      ]
      if (rhythmParamList.includes(PianoObj.parameter)) {
        PianoObj = this.getRhythmObj(PianoObj)
      } else if (recorderParamList.includes(PianoObj.parameter)) {
        return
      }
    }

    return PianoObj
  },
  getRhythmObj (pianoObj) {
    let type
    let value
    if (pianoObj.parameter === 'Metronome') {
      type = 'Play'
      if (pianoObj.data.value === 'Stop') { value = false } else { value = true }
    } else if (pianoObj.parameter === 'MetronomeMode') {
      type = 'Mode'
      value = pianoObj.data.valueList[pianoObj.data.value]
    } else if (pianoObj.parameter === 'MetronomeTempo') {
      type = 'Tempo'
      value = pianoObj.data
    } else if (pianoObj.parameter === 'MetronomeVolume') {
      type = 'Volume'
      value = pianoObj.data
    } else if (pianoObj.parameter === 'BeatSelect') {
      type = 'Beat'
      value = pianoObj.data.value
    } else if (pianoObj.parameter === 'RhythmSelect') {
      type = 'Pattern'
      value = pianoObj.data
    } else if (pianoObj.parameter === 'BeatCounter') {
      type = 'Counter'
      value = pianoObj.data
      PIANO.onBeatEvent (pianoObj.data)
    }
    return {parameter: 'Rhythm', data: type, part: value }
  },
  getMidi (parameter, data, part) {
    //変数宣言
    const Exclusive = 0xF0
    const KawaiId = 0x40
    const Ch = 0x7F
    let Fn = undefined
    let Gn = 0x08
    let Mn = 0x02
    let v1 = undefined
    let v2 = undefined
    let v3 = undefined
    let databyte = []
    const Eox = 0xF7
    let midi = []

    //空プロパティ入力対策
    if (parameter === '') { parameter = undefined }
    if (data === '') { data = undefined }
    if (part === '') { part = undefined }

    // MultiPacketパラメーター変換
    const parameterReplace = (parameter, data={}) => {
      data = data || {}
      const exceptionParameters = [
        'FileAccess',
        'PerNote',
        'UserTouchCurve'
      ]
      if (exceptionParameters.includes(parameter)) {
        if (!data.hasOwnProperty('value')) {
          console.error('getMidi', 'data.value is not exist.')
          return undefined
        }
        return data.value
      } else {
        return parameter
      }
    }

    parameter = parameterReplace(parameter, data)

    // UserEQオブジェクト変換
    const eqObjReplace =(parameter, data)=> {
      const exceptionParameters = [
        'UserEqGainLow',
        'UserEqGainMidLow',
        'UserEqGainMidHigh',
        'UserEqGainHigh',
        'UserEqFreqMidLow',
        'UserEqFreqMidHigh'
      ]
      if (exceptionParameters.includes(parameter)) {
        const eqType = parameter.slice(0, 10)
        const eqBand = parameter.slice(10)
        parameter = eqType
        data = {
          bandNum : ['Low', 'MidLow', 'MidHigh', 'High'].findIndex((item)=> { return item === eqBand }),
          value : data.value
        }
      }
      return { parameter, data }
    }
    const epObj = eqObjReplace(parameter, data)
    parameter = epObj.parameter
    data = epObj.data

    //絞り込み
    const isFileAccess = this.FileAccess[0].includes(parameter)
    const param =
      (isFileAccess) ? this.FileAccess.filter((obj) => {
        return obj.parameter === parameter
        })
      : this.SysEx.filter((obj) => {
        return (obj.parameter === parameter) && (obj[PIANO.Model] > 0)
        })
    param.sort((a, b)=> {
      if(a[PIANO.Model] < b[PIANO.Model]) return -1
      if(a[PIANO.Model] > b[PIANO.Model]) return 1
      return 0
    })
    const supportedParam =
      (param.length === 0)
        ? false
        : (param[0].fn === '0x02')
          ? true
          : (data) ? true : false

    //// data型メッセージ解析
    const parseData = (param) => {
      /**
       * num の下位 nBit を 1byte ごとのバイナリデータに分割します。
       *     例えば、num=24, nBit=28 の場合は [0, 0, 0, 24] が出力されます。
       *
       * @param  {Number} num
       * @param  {Number} nBit
       * @return {Array}
       */
      const splitBinNumIntoBytes = (num, nBit=28) => {
        if (typeof num !== 'number') {
          this.error('getMidi', '"num" is invalid value.', data)
          return undefined
        }
        const sBin = encode.getBinary(num, nBit)
        const result = []
        let sBinAByte = '0b'
        for (let i = 0; i < sBin.length; i++) {
          sBinAByte += sBin[i]
          if (i % 7 === 6) {
            result[Math.floor(i/7)] = Number(sBinAByte)
            sBinAByte = '0b'
          }
        }
        return result
      }
      const dataType = param[0].value
      if(['sound.json',
          'rhythm.json',
          'KeyNum',
          'Tuning',
          'PerNote',
          'UserEqGain',
          'UserEqFreq',
          'UserTouchCurve',
          'RecorderFileAccess',
          'AudioLevel',
          'Progress',
          'BPM',
          'Beat',
          'BeatCounter',
          'BluetoothMIDIName',
          'Favorite',
        ].includes(dataType)) {
        if (dataType.includes('UserEq')) {
          const band = ['Low', 'MidLow', 'MidHigh', 'High'][data.bandNum]
          parameter = dataType + band
        }
        databyte = appController
          .pianoObjToMidiMsg(part, parameter, data)
          .slice(9, -1)
      } else if (dataType === 'FileAccess') { //!: FileDataDump
        function reshape (array, rows, cols) {
          if ((rows * cols) !== array.length) {
            console.error('function reshape(): Invalid arguments.')
            return undefined
          }
          const result = []
          for (let r = 0; r < rows; r++) {
            const row = []
            for (var c = 0; c < cols; c++) {
              let i = r * cols + c
              if (i < array.length) {
                row.push(array[i])
              }
            }
            result.push(row)
          }
          return result
        }
        function encodeMidi1Format (dataArray) {
          const midiFormatData = []
          let headByte = 0
          const otherByte = []
          const byteDataSize = 7
          for (let i = 0; i < dataArray.length; i++) {
            const ByteIndOfGroup = i % byteDataSize
            if (ByteIndOfGroup === 0) {
              midiFormatData.push([])
              headByte = 0
              otherByte.length = 0
            }
            headByte += (dataArray[i] & 0b10000000) >> (ByteIndOfGroup + 1)
            otherByte.push(dataArray[i] & 0b01111111)
            if (ByteIndOfGroup === 6 || i === dataArray.length - 1) {
              midiFormatData.slice(-1)[0].push(headByte, ...otherByte)
            }
          }
          return midiFormatData
        }
        function str2UnicodeArr (str) {
          const result = []
          str.split('').forEach((val) => {
            result.push(val.charCodeAt(0))  // Only 2byte code (TBD).
          })
          return result
        }
        function generateDatabyte (midiFormatMatrix) {
          const nGroupInPacket = 3
          let packetCounter = 0
          let groupCounter = 0
          const result = []
          for (let i = 0; i < midiFormatMatrix.length; i++) {
            if (groupCounter === 0) {
              result.push([packetCounter])
            }
            result.slice(-1)[0].push(...midiFormatMatrix[i])
            if (groupCounter === nGroupInPacket - 1) {
              packetCounter++
              groupCounter = 0
            } else {
              groupCounter++
            }
          }
          return result
        }
        function getFilenamePackets (path) {
          // To digital-piano's PATH format.
          const dpFormatPath = '\\' + path.split('/').join('\\')
          // Convert Unicode to SJIS Array.
          const sjisPath = Encoding.convert(str2UnicodeArr(dpFormatPath), {
            to: 'SJIS',
            from: 'UNICODE',
          })
          // Exception handling about max byte size.
          const maxByteSize = 253
          const sjisPathLen = sjisPath.length
          if (sjisPathLen > maxByteSize) {
            console.error('getMidi', '"path" over max byte size.', data)
            return databyte=undefined
          }
          // Push null code.
          sjisPath.push(0x00)
          // Encode to MIDI1.0 format.
          const midiFormatData = encodeMidi1Format(sjisPath)
          return generateDatabyte(midiFormatData)
        }

        const tools = encode.tools
        if (parameter === 'FileListRequest') {
          // This bufferObj is absolutely necessary.
          const bufferObj = parser.longSysExHandler
          bufferObj.clearall()
          bufferObj.add({
            parameter,
            nameData: [[]],
            packetCounter: -1,
            filelistRequest: true,
            fileCounter: undefined,
            lastMsg: []
          })
          return databyte=[]
        } else if (parameter === 'FileReadRequest') {
          // Object check.
          if (!tools.hasNecessaryProperties(data, ['filePath'])) {
            this.error(
              'getMidi', 'Object "data" doesn\'t contain a required properties',
              data
            )
            return databyte=undefined
          }
          // Generate databyte.
          const requestDatabyte = []
          return databyte=[requestDatabyte, getFilenamePackets(data.filePath)]
        } else if (parameter === 'FileWriteRequest') {
          const necessaryProperties = ['destinationType', 'drive', 'filePath']
          if (!tools.hasNecessaryProperties(data, necessaryProperties)) {
            this.error(
              'getMidi', 'Object "data" doesn\'t contain a required properties',
              data
            )
            return databyte=undefined
          } else if (!tools.checkRangeOfVals([data.drive], 0x7F, 0)) {
            this.error('getMidi', '"drive" is invalid value.', data)
              return databyte=undefined
          }
          const drive = data.drive
          const destinationType = (data.destinationType === 'Internal') ? 0x00
            : (data.destinationType === 'External') ? 0x00
            : undefined
          if (destinationType === undefined) {
            console.error('getMidi', '"destinationType" is invalid val.', midi)
            return databyte=undefined
          }
           // Generate databyte.
          const requestDatabyte = [destinationType, drive]
          return databyte=[requestDatabyte, getFilenamePackets(data.filePath)]
        } else if (parameter === 'FileDeleteRequest') {
          // Object check.
          if (!tools.hasNecessaryProperties(data, ['filePath'])) {
            this.error(
              'getMidi', 'Object "data" doesn\'t contain a required properties',
              data
            )
            return databyte=undefined
          }
          // Generate databyte.
          const requestDatabyte = []
          return databyte=[requestDatabyte, getFilenamePackets(data.filePath)]
          return databyte=[]
        } else if (parameter === 'FileRenameRequest') {
          const necessaryProperties = ['oldFilePath', 'newFilePath']
          if (!tools.hasNecessaryProperties(data, necessaryProperties)) {
            this.error(
              'getMidi', 'Object "data" doesn\'t contain a required properties',
              data
            )
            return databyte=undefined
          }
          const requestDatabyte = []
          return databyte=[
            requestDatabyte,
            [
              ...getFilenamePackets(data.oldFilePath),
              ...getFilenamePackets(data.newFilePath)
            ]
          ]
        } else if (parameter === 'FileSelectRequest') {
          // Object check.
          if (!tools.hasNecessaryProperties(data, ['filePath'])) {
            this.error(
              'getMidi', 'Object "data" doesn\'t contain a required properties',
              data
            )
            return databyte=undefined
          }
          // Generate databyte.
          const requestDatabyte = []
          return databyte=[requestDatabyte, getFilenamePackets(data.filePath)]
        } else if (parameter === 'FileLoadRequest') {
          // Object check.
          if (!tools.hasNecessaryProperties(data, ['filePath'])) {
            this.error(
              'getMidi', 'Object "data" doesn\'t contain a required properties',
              data
            )
            return databyte=undefined
          }
          // Generate databyte.
          const requestDatabyte = []
          return databyte=[requestDatabyte, getFilenamePackets(data.filePath)]
        } else if (parameter === 'EndOfFileList') {
          console.error('This instruction can\'t use.')
          return databyte=[]
        } else if (parameter === 'TopOfDataLength') {
          if (!tools.is('Array', data)) {
            this.error('getMidi', 'Type of "data" must be array.')
            return databyte=undefined
          }
          // Encode to MIDI1.0 format.
          const midiFormatData = encodeMidi1Format(data)
          const dataPacket = generateDatabyte(midiFormatData)
          // Generate Length packet.
          const topOfDataLength = splitBinNumIntoBytes(dataPacket.length)
          // End of Data packet.
          const endOfData = []
          return databyte=[topOfDataLength, dataPacket, endOfData]
        } else if (parameter === 'EndOfData') {
          console.error('This instruction can\'t use.')
          return databyte=[]
        } else if (parameter === 'Wait') {
          return databyte=[]
        } else if (parameter === 'Cancel') {
          return databyte=[]
        } else if (parameter === 'Nack') {
          return databyte=[]
        } else if (parameter === 'Ack') {
          return databyte=[]
        } else {
          this.error('getMidi', '"parameter" is invalid value.', data)
          return databyte=undefined
        }
      } else if (['ReverbDepth', 'ReverbTime', 'EffectSetting1', 'EffectSetting2'].includes(parameter)
        ) { //!: range じゃない？
        databyte = [data]
        console.log('raw value 暫定MIDI変換', parameter, data.value)
      } else {
        console.log('data型未実装', parameter, data, part)
        databyte = undefined //仮
        //data型解析処理を入れる
      }
    }

    //処理分岐
    if (DATABASE.systemKey.includes(parameter)) {
      return appController
        .sysObjToMidiMsg(parameter, data)
    } else if (!supportedParam) {
      console.log(PIANO.Model + ' is not supported SysEx of "' + parameter + '".')
    } else if (param.length === 0) {
      databyte = undefined
      this.error ('getMidi', 'unknown message', {parameter, data, part})
    } else {
      //Fn,v1~v3バイト解析
      Fn = Number (param[0].fn)
      v1 = Number (param[0].v1)
      v2 = Number (param[0].v2)
      if (part === undefined) {
        v3 = 0x7F
      } else if (typeof part === 'string') {
        const p = Object.keys(DATABASE.Part).filter((key) => {return DATABASE.Part[key] === part})
        v3 = Number (p)
      } else {
        v3 = Number (part)
      }
      if (param[0].fn !== '0x02') {
        //v4~バイト解析
        if (param[0].v4Type === 'data') {
          databyte.push(parseData(param))
        } else {
          return appController
            .pianoObjToMidiMsg(part, parameter, data)
        }
      }
    }

    //midi配列生成
    const generatePackets = (fn, v1, databyte) => {
      const makeDefaultFormat = (fn, v1) => {
        const formats = {
          userTouchCurve: new Map([
            ['Exclusive', Exclusive],
            ['KawaiId', KawaiId],
            ['Ch', Ch],
            ['Fn', Fn],
            ['Gn', Gn],
            ['Mn', Mn],
            ['v1', v1],
            ['v2', v2],
            ['v3', v3],
            ['Databyte', []],
            ['Eox', Eox]
          ]),
          fileAccess: new Map([
            ['Exclusive', Exclusive],
            ['KawaiId', KawaiId],
            ['Ch', Ch],
            ['Fn', Fn],
            ['Gn', Gn],
            ['Mn', Mn],
            ['v1', v1],
            ['Databyte', []],
            ['chksm', 0],
            ['Eox', Eox]
          ])
        }
        const paramType = (fn === 0x10 && v1 === 0x5A) ? 'userTouchCurve'
          : (fn === 0x24) ? 'fileAccess'
          : undefined

        if (paramType === undefined) {
          console.error('makeDefaultFormat: Unknown function type.')
          return undefined
        }
        return formats[paramType]
      }
      const makeTransition = (fn, v1) => {
        const transitionType = (fn === 0x10 && v1 === 0x5A) ? 'userTouchCurve'
          : (fn === 0x24 && v1 === 0x01) ? 'fileDataSend'
          : (fn === 0x24 && v1 === 0x07) ? 'fileRenameRequest'
          : (fn === 0x24) ? 'otherFileRequests'
          : undefined
        const transitionMap = {
          userTouchCurve: new Map([
            ['tar', 'v2'],
            ['header', v2],
            ['data', v2 + 1],
            ['end', v2 + 2]
          ]),
          fileDataSend: new Map([
            ['tar', 'v1'],
            ['header', 0x01],
            ['data', 0x02],
            ['end', 0x7B]
          ]),
          fileRenameRequest: new Map([
            ['tar', 'v1'],
            ['renameRequest', v1],
            ['oldFilename', 0x03],
            ['newFilename', 0x03]
          ]),
          otherFileRequests: new Map([
            ['tar', 'v1'],
            ['otherRequest', v1],
            ['filename', 0x03],
          ])
        }
        if (transitionMap === undefined) {
          console.error('makeTransition: Unknown function type.')
        }
        return transitionMap[transitionType]
      }
      const is2DArray = (aDatabyte) => {
        if (encode.tools.is('Array', aDatabyte[0])) { return true }
        return false
      }
      const convertToSinglePacket = (defaultFormat) => {
        const singlePacket = []
        defaultFormat.forEach(val => {
          if (encode.tools.is('Array', val)) {
            singlePacket.push(...val)
          } else {
            singlePacket.push(val)
          }
        })
        return singlePacket
      }
      const calcChksm = (defaultFormat) => {
        let chksm
        defaultFormat.forEach((val, key) => {
          if ((key !== 'Exclusive') && (key !== 'chksm') && (key !== 'Eox')) {
            if (encode.tools.is('Array', val)) {
              val.forEach((arrVal) => {
                chksm = chksm ^ arrVal
              })
            } else {
              chksm = chksm ^ val
            }
          }
        })
        return chksm
      }

      const packets = []
      const defaultFormat = makeDefaultFormat(fn, v1)
      const transition = makeTransition(fn, v1)
      const nMsg = databyte.length
      const msgSequence = transition.values()  // Iterator obj.
      const targetParam = msgSequence.next().value

      for (let msgNum = 0; msgNum < nMsg; msgNum++) {
        defaultFormat.set(targetParam, msgSequence.next().value)
        if (is2DArray(databyte[msgNum])) {  // for multiple message
          for (let pNum = 0; pNum < databyte[msgNum].length; pNum++) {
            defaultFormat.set('Databyte', databyte[msgNum][pNum])
            if (defaultFormat.has('chksm')) {
              const chksm = calcChksm(defaultFormat)
              defaultFormat.set('chksm', chksm)
            }
            packets.push(convertToSinglePacket(defaultFormat))
          }
        } else {  // for single message
          defaultFormat.set('Databyte', databyte[msgNum])
          if (defaultFormat.has('chksm')) {
            // Exception about chksm.
            defaultFormat.delete('chksm')
            packets.push(convertToSinglePacket(defaultFormat))
            defaultFormat.delete('Eox')
            defaultFormat.set('chksm', 0)
            defaultFormat.set('Eox', Eox)
            continue
          }
          packets.push(convertToSinglePacket(defaultFormat))
        }
      }
      return packets
    }

    const tools = encode.tools
    const is2DArray = (databyte !== undefined) ? tools.is('Array', databyte[0])
      : undefined
    if (v1 === undefined || databyte === undefined) {
      return undefined
    } else if (is2DArray) {
      return midi=generatePackets(Fn, v1, databyte)
    } else if (isFileAccess) {
      midi.push(Exclusive, KawaiId, Ch, Fn, Gn, Mn, v1, ...databyte, Eox)
      return midi
    } else {
      midi.push (Exclusive, KawaiId, Ch, Fn, Gn, Mn, v1)
      if (v2 !== undefined) { midi.push(v2) }
      if (v3 !== undefined) { midi.push(v3) }
      // for (const byte of databyte) { midi.push(byte) }
      if (Fn !== 0x02) {
        for (const byte of databyte) { midi.push(byte) }
      }
      midi.push (Eox)
      return midi
    }
  },
  error (method, message, val) {
    if (method === 'getMidi') {
      console.error (method + ' : ' + message, val)
    } else {
      // console.error (method + ' : ' + message, encode.getHexString(val))
    }
  }
}

/**
 * USER VT Data Object
 */
let USERVTDATA = {
  TouchCurve: {
    default: {
      index: 1,
      data: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,
      16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,
      32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,
      48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,
      64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,
      80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,
      96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,
      112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127]
    }
  },
  Voicing: {
    default: {
      // indexは現状UIで使用するため88鍵に対する番号を指定
      index: 39,
      data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    }
  },
  Tuning: {
    default: {
      // indexは現状UIで使用するため88鍵に対する番号を指定
      index: 39,
      data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    }
  },
  Temperament: {
    default: {
      index: 0,
      temp: 0,
      data: [0,0,0,0,0,0,0,0,0,0,0,0]
    }
  },
  Volume: {
    default: {
      // indexは現状UIで使用するため88鍵に対する番号を指定
      index: 39,
      data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    }
  },
}

/**
 * Encode
 */
const encode = {
  tools: {
    /**
     * 配列に対して一様に定数を加算します。
     *
     * @param  {Array}  array 配列
     * @param  {Number} num   加算する値
     * @return {Array}
     */
    uniformAdd (array, num) {
      if (arguments.length === 0 || arguments.length > 2) {
        console.error('tools.uniformAdd: Invalid argument.')
        return undefined
      } else if (!this.is('Array', array)) {
        console.error('tools.uniformAdd: Type of "dataArray" must be Array.')
        return undefined
      } else if (!this.is('Number', num)) {
        console.error('tools.uniformAdd: Type of "nBits" must be Number.')
        return undefined
      }

      for (let i = 0; i < array.length; i++) {
        array[i] += num
      }
      return array
    },

    /**
     * オブジェクトの厳密な型を比較します。
     *    typeof では判別が困難な Object と Array を区別することができます。
     *
     * @param  {String}  type 文字頭を大文字で型を指定します
     * @param  {Object}  obj  オブジェクトを指定します
     * @return {Boolean}
     */
    is (type, obj) {
      let clas = Object.prototype.toString.call(obj).slice(8, -1)
      return obj !== undefined && obj !== null && clas === type
    },

    /**
     * array に含まれる値が min 以上 max 以下 の範囲かどうかを判定します。
     *
     * @param  {Array}   array 入力配列
     * @param  {Number}  max   指定する範囲の上限値
     * @param  {Number}  min   指定する範囲の下限値
     * @return {Boolean}
     */
    checkRangeOfVals (array, max, min) {
      if (!this.is('Array', array)) {
        console.error('checkRangeOfVals: Variable "array" is invalid type.')
        return false
      }
      return (array.filter((val) => {
        if (typeof val !== 'number') { return true }
        return (val > max) || (val < min)
      }).length) === 0
    },

    /**
     * オブジェクトが指定したプロパティを持っているかどうかを判定します。
     *     デフォルトでは、プロパティをすべて持っていると true を返します。
     *     option に or を指定した場合、一つでも持っていれば true を返します。
     *
     * @param {Object} obj          判定対象のオブジェクト
     * @param {Array}  properties   プロパティの配列
     * @return {Boolean, undefined} エラー時には undefined を返します
     */
    hasNecessaryProperties (obj, properties, option='all') {
      if (!this.is('Object', obj) || !this.is('Array', properties)) {
        console.error('hasNecessaryProperties: Invalid argument.')
        return undefined
      } else if (properties.length < 1) {
        console.error('hasNecessaryProperties: Invalid argument.')
        return undefined
      }

      if (option === 'or') {
        return properties.filter((property) => {
          return obj.hasOwnProperty(property)
        }).length > 0
      } else {
        return properties.filter((property) => {
          return obj.hasOwnProperty(property)
        }).length === properties.length
      }
    },

    /**
     * array に含まれるすべての要素の型が type と一致するかどうかを判定します。
     *
     * @param  {String}  type  文字頭を小文字で型を指定します
     * @param  {Array}   array 判定対象の配列
     * @return {Boolean}      エラー時には undefined を返します
     */
    isMatchAllType (type, array) {
      if (!this.is('Array', array) || !this.is('String', type)) {
        console.error('this.isMatchAllType(): Argument is invalid type.')
        return undefined
      }
      for (let i = 0; i < array.length; i++) {
        if (typeof array[i] !== type) { return false }
      }
      return true
    },

    isChksmEqual (array, chksm) {
      let chksm_
      array.forEach((val) => {
        chksm_ = chksm_ ^ val
      })
      return chksm === chksm_
    },

    newWorkerViaBlob (relativePath) {
      const baseURL = window.location.href.replace(/\\/g, '/').replace(/\/[^\/]*$/, '/')
      const array = ['importScripts("' + baseURL + relativePath + '")']
      const blob = new Blob(array, {type: 'text/javascript'})
      const url = window.URL.createObjectURL(blob)
      return new Worker(url)
    },

    /**
     * arrayにkeyとvalueの組み合わせに一致するオブジェクトが含まれるかどうかを判定します。
     *  全てのオブジェクトに key が含まれていることを確認してください。
     *
     * @param  {Array}   array
     * @param  {String}  key    オブジェクトのキーをstringで指定します
     * @param  {any}     val    key の value を指定します
     * @return {boolean}
     */
    arrSome (array, key, val) {
      if (!encode.tools.is('Array', array)) {
        throw new Error('arrSome: array is invalid type.')
      } else if ((typeof key) !== 'string') {
        throw new Error('arrSome: key is invalid type.')
      }

      return array.some((obj) => {
        return (obj[key] === val)
      })
    }
  },
  getBinary (num, bit) {
    //64bit
    return ('0000000000000000000000000000000000000000000000000000000000000000' + num.toString(2)).slice(-bit)
  },
  getText (ascii) {
    return String.fromCharCode.apply(null, ascii)
  },
  getAscii (text) {
    const splitText = [...text]
    let result = []
    if (text.length !== splitText.length) {
      console.warn('getAscii: It contains non-Ascii code in the input string.')
    }

    for (let i = 0; i < splitText.length; i++) {
      if (splitText[i].codePointAt() > 0xFF) {
        console.warn('getAscii: ' + splitText[i] + ' is not an Ascii code.')
      }
      result.push('0x' + splitText[i].codePointAt().toString(16).toUpperCase())
    }
    return result
  },
  getCodePoints (text, masker=0x1FFFFF) {
    const splitText = [...text]
    let result = []

    for (let i = 0; i < splitText.length; i++) {
      const codePoint = (splitText[i].codePointAt(0) & masker)
      result.push(codePoint)
    }
    return result
  },
  getHexString (numArray) {
    if (numArray) {
      return numArray.map(function(val){return '0x' + ('00' + val.toString(16).toUpperCase()).substr(-2)})
    }
  },
  getHex8bitArray (num7bitArray) {
    console.log(num7bitArray)
    if (num7bitArray.length === 8) {
      let result = []
      const msb = this.getBinary(num7bitArray[0],7)
      for (let i = 0; i < msb.length; i++) {
        const bn = msb[i] + this.getBinary (num7bitArray[i+1], 7)
        result.push ( '0x' + Number ('0b'+ bn).toString(16).toUpperCase() )
      }
      return result
    } else {
      this.error ('getNum8bitArray', 'unsupported byte length', midi)
      return undefined
    }
  },
  getHex16bit (num7bitArray) {
    if (num7bitArray.length === 3) {
      const bn = this.getBinary (num7bitArray[2], 2) + this.getBinary (num7bitArray[1], 7) + this.getBinary (num7bitArray[0], 7)
      return '0x' + ('0000' + Number ('0b'+ bn).toString(16).toUpperCase() ).slice(-4)
    } else {
      this.error ('getHex16bit', 'unsupported byte length', midi)
      return undefined
    }
  },
  getHex32bit (num7bitArray) {
    if (num7bitArray.length === 5) {
      const bn = this.getBinary (num7bitArray[4], 4)
        + this.getBinary (num7bitArray[3], 7)
        + this.getBinary (num7bitArray[2], 7)
        + this.getBinary (num7bitArray[1], 7)
        + this.getBinary (num7bitArray[0], 7)
        return '0x' + ('00000000' + Number ('0b'+ bn).toString(16).toUpperCase() ).slice(-8)
    } else {
      this.error ('getHex32bit', 'unsupported byte length', midi)
      return undefined
    }
  },
  getNum (msb, lsb) {
    return (msb * 128) + lsb
  },
  getMsbLsb (num) {
    const msb = Math.floor(num / 0x80)
    const lsb = num % 0x80
    return [msb, lsb]
  }
}

/**
 * Parser
 */
const parser = {
  midiMessage (msg, id, time) {
    DPControllerFactory.create().receiveMidiMsg(msg, id)
    const i = MIDI.DEVICES.findIndex(item => item.id === id)
    const name = (i >= 0) ? MIDI.DEVICES[i].name : id
    if (msg[0] === 0xF0 && msg[1] === 0x40) { //KAWAI Sys-Ex受信処理
      this.kawaiSysEx(msg, id, name)
    }
  },
  kawaiSysEx (msg, deviceId, deviceName) {
    // console.log('KawaiSysEx IN | ' + deviceName +' : ' + encode.getHexString(msg))
    //// recWorker用特別パーサー
    if (KWM.isEmbeddedMode && recWorker) {
      const recMsg =
          (msg[3] !== 0x07 && msg[6] === 0x52 && msg[7] === 0x1D) ? 'modeChanged'
        : (msg[3] !== 0x07 && msg[6] === 0x52 && msg[7] === 0x0C) ? 'formatChanged'
        : (msg[3] !== 0x07 && msg[6] === 0x52 && msg[7] === 0x01) ? 'partChanged'
        : (msg[3] !== 0x07 && msg[6] === 0x52 && msg[7] === 0x1C) ? 'overdubChanged'
        : (msg[3] !== 0x07 && msg[6] === 0x52 && msg[7] === 0x08) ? 'statusChanged'
        : (msg[3] !== 0x07 && msg[6] === 0x52 && msg[7] === 0x18) ? 'songLoadCompleted'
        // : (JSON.stringify(msg) === JSON.stringify([0xF0,0x40,0x7F,0x32,0x04,0x1E,0x51,0x7E,0x7F,0x00,0x00,0xF7])) ? 'completed'
        : (msg[3] === 0x32 && msg[6] === 0x51 && msg[7] === 0x7E && msg[9] === 0x00 && msg[10] === 0x00) ? 'completed'
        // : (msg[3] === 0x7E && msg[6] === 0x03) ? 'error'
        : false
      if (recMsg) {
        recWorker.onMidiMessage(recMsg, msg)
        console.log('%cMIDI IN for Rec  | ' + deviceName +' : ' + encode.getHexString(msg), 'color: blue', recMsg)
      }
    }
  },
  longSysExHandler : {
    buffer: [],
    add(data) {
      this.buffer[this.buffer.length] = data
      return 0
    },
    setObj(index, value, key){
      if (encode.tools.is('Object', this.buffer[index])) {
        this.buffer[index][key] = value
      } else if (encode.tools.is('Array', this.buffer[index])) {
        this.buffer[index] = value
      } else {
        throw new Error('Object does not exitst.')
      }
    },
    get(index) {
      return this.buffer[index]
    },
    getCount() {
      return this.buffer.length
    },
    clearall() {
      this.buffer = []
    }
  }
}

/**
 * Music Event Handler
 */
const musicHandler = {
  updateStatus (music) {
    const index = PIANO.Music.Queue.findIndex(item => item.id === music.id)
    if (index === -1 || PIANO.Music.Queue.length === 1) {
      PIANO.Music = {...PIANO.Music, Next : false}
      PIANO.Music = {...PIANO.Music, Previous : false}
    } else if (index === 0 && !PIANO.Music.Repeat) {
      PIANO.Music = {...PIANO.Music, Next : true}
      PIANO.Music = {...PIANO.Music, Previous : false}
    } else if (index === PIANO.Music.Queue.length - 1  && !PIANO.Music.Repeat) {
      PIANO.Music = {...PIANO.Music, Next : false}
      PIANO.Music = {...PIANO.Music, Previous : true}
    } else {
      PIANO.Music = {...PIANO.Music, Next : true}
      PIANO.Music = {...PIANO.Music, Previous : true}
    }
    PIANO.onPlayerChange ()
  },
  time (event) {
    PIANO.onProgress (event)
  },
  playOut () {
    if ( ['Player','Lesson','ConcertMagic'].includes(PIANO.Music.Mode) ) {
      if (PIANO.Music.Status === 'play' || PIANO.Music.Mode === 'ConcertMagic') {
        if (PIANO.Music.Next && PIANO.Music.ContinuPlay.isOn) {
          setTimeout (PIANO.set('Music', 'Next'), PIANO.Music.ContinuPlay.waitTime)
        } else {
          setTimeout (PIANO.set('Music', 'Reset'), PIANO.Music.ContinuPlay.waitTime)
        }
      }
    } else {
      if (PIANO.Music.Status === 'reset') {
        if (PIANO.Music.Next && PIANO.Music.ContinuPlay.isOn) {
          setTimeout (PIANO.set('Music', 'Next'), PIANO.Music.ContinuPlay.waitTime)
        }
      }
    }

    if (PIANO.Music.Status === 'reset') {
      if (PIANO.Music.Next && PIANO.Music.ContinuPlay.isOn) {
        setTimeout (PIANO.set('Music', 'Next'), PIANO.Music.ContinuPlay.waitTime)
      } else {
        if ( ['Player','Lesson','ConcertMagic'].includes(PIANO.Music.Mode) ) {
          setTimeout (PIANO.set('Music', 'Reset'), PIANO.Music.ContinuPlay.waitTime)
        }
      }
      PIANO.onPlayerChange()
    }
  },
  addRecent (music) {
    const duplicatedIndex = PRESET.PlayList[1].data.findIndex(item => item.id === music.id)
    if (duplicatedIndex >= 0) { PRESET.PlayList[1].data.splice(duplicatedIndex, 1) }
    PRESET.PlayList[1].data.splice(0, 0, music)
    if (PRESET.PlayList[1].data.length >= 30) { PRESET.PlayList[1].data.splice(30, PRESET.PlayList[1].data.length - 30) }
    DATABASE.saveUserSettings('RecentMusic')
  },
  shuffle (currentArray, music) {
    this.shuffleBackup = Array.from(currentArray)
    let shuffledList = []
    const index = currentArray.findIndex(item => item.id === music.id)
    if (index > -1) {
      currentArray.splice(index, 1)
      shuffledList.push(music)
    }
    currentArray.sort(()=> {
      return Math.random() - Math.random()
    })
    for (const item of currentArray) {
      shuffledList.push(item)
    }
    return shuffledList
  },
  shuffleBackup : []
}

/**
 * Worker
 */
const WebWorker = {
  enable: true,
  workers: {},
  instantiation (name) {
    this.workers[name] = this.newWorkerViaBlob('../../lib/kawaipianojs/worker/doWork.js')
  },
  newWorkerViaBlob (relativePath) {
    const baseURL = window.location.href.replace(/\\/g, '/').replace(/\/[^\/]*$/, '/')
    const array = ['importScripts("' + baseURL + relativePath + '")']
    const blob = new Blob(array, {type: 'text/javascript'})
    const url = window.URL.createObjectURL(blob)
    return new Worker(url)
  },
  initRecHandshakeInst () {
    if (window.Worker && KWM.isEmbeddedMode) {
      WebWorker.instantiation('recorder')
      const wRecorder = WebWorker.workers.recorder
      wRecorder.addEventListener('message', function(e) {
        if (e.data.hasOwnProperty('msg')) {
          KWM.sendMidiMessage(e.data.msg, PIANO.DeviceID)
          console.log('%cMIDI送信| ' + encode.getHexString(e.data.msg), 'font-size: 16px')
        } else if (e.data.hasOwnProperty('error')) {
          recWorker.end(false)
          console.log('%cform Worker:', 'color: green;', e.data)
          console.error('%cNG | リプライ無し: '+ e.data.lastMsg, 'font-size: 16px')
          PIANO.onPianoError('recWorkerError')
        } else if (e.data.hasOwnProperty('info')) {
          if (e.data.info === 'empty' && !recWorker.canUseBuff) {
            recWorker.end(true)
          }
        } else {
          console.log('%cform Worker:', 'color: green;', e.data)
        }
      }, false)
      wRecorder.addEventListener('error', function(e) {
        console.error('Worker: Error handling.', e)
      }, false)
      wRecorder.postMessage({
        class: 'handshake',
        mode: 'recorder',
        method: 'new',
        val: {}
      })
      wRecorder.postMessage({
        class: 'handshake',
        mode: 'recorder',
        method: 'set',
        val: {timeout: 30000}
      })
      wRecorder.postMessage({
        class: 'handshake',
        mode: 'recorder',
        method: 'set',
        val: {nRetry: 0}
      })
    }
  },
}

/**
 * KawaipianoJs起動処理 / キャッシュ管理
 */
const KawaipianoJs = {
  isActive: false,
  path: null,
  log: {
    pianoObj: false,
    midiIn: false,
    midiOut: false,
    handshake: false,
    verifyParam: true,
    json: false,
    color: 'skyblue'
  },
  invoke (setting) {
    return new Promise ((resolve, reject)=> {
      const brightness = 100
      KWM.setLcdBacklight(brightness)

      console.groupCollapsed('[Kawaipiano.js] Launch Sequence Log')
      const timer = {
        start: null,
        end: null
      }
      this.isActive = true
      timer.start = performance.now()

      const updateUi =(isEnable, callback)=> {
        return new Promise ((resolve)=> {

          if(!isEnable) {
            resolve()
            return
          }

          if (!KWM.isAvailable || KWM.isEmbeddedMode) {
            callback('noupdate')
            console.log ('%c [Kawaipiano.js] No UI update', 'color: ' + this.log.color)
            resolve()
            return
          }

          console.log ('%c [Kawaipiano.js] UI version | local :' + KWM.localUiVersion + ' | latest : ' + KWM.latestUiVersion,  'color: ' + this.log.color)

          if (KWM.latestUiVersion === KWM.localUiVersion) {
            callback('noupdate')
            console.log ('%c [Kawaipiano.js] No UI update', 'color: ' + this.log.color)
            resolve()
            return
          }

          callback('downloading')
          console.log ('%c [Kawaipiano.js] UI data downloading', 'color: ' + this.log.color)
          KWM.downloadUiData()
            .then(()=>{
              callback('updating')
              console.log ('%c [Kawaipiano.js] UI updating', 'color: ' + this.log.color)
              return KWM.updateUiData()
            })
            .then(()=>{
              callback('completed')
              console.log ('%c [Kawaipiano.js] UI update is completed', 'color: ' + this.log.color)
              // location.reload()
            })
            .catch(()=>{
              callback('error')
              console.error ('[Kawaipiano.js] UI Update Error')
              resolve()
            })
        })
      }
      const loadJsons =(obj, callback)=> {
        return new Promise ((resolve, reject)=> {
          DATABASE.getJson()
            .then( DATABASE.loadUserSettings )
            .then( ()=> DATABASE.getUiJson(obj, callback) )
            .then( ()=> resolve() )
            .catch( ()=> reject({message: "Load Json Error", "type": "LOAD_JSON_ERROR"}) )
        })
      }
      const checkMidiDevice =(syncMode, callback)=> {
        return new Promise (async (resolve, reject) => {
          if (syncMode === 'demo') {
            resolve()
            return
          }
          if ( MIDI.DEVICES.length === 0 ) {
            reject({message: "No MIDI Device", type: "NO_MIDI_DEVICE"})
          } else {
            // Fix: BLE-MIDI モジュールが壊れる問題の対策のため、待ち時間 3 秒の間に timestamp を無効にする
            await new Promise(resolve => setTimeout(resolve, 3000))
            const obj = {
              api: MIDI.API,
              device: MIDI.DEVICES,
            }
            if (KWM.isAvailable) {
              obj.embeddedMode = KWM.isEmbeddedMode,
              obj.latestUi = KWM.latestUiVersion,
              obj.localUi = KWM.localUiVersion
            }
            callback(obj)
            console.log ('%c [Kawaipiano.js] MIDI is Ready', 'color: ' + this.log.color, obj)
            resolve()
          }
        })
      }
      const checkPianoObj =(item)=> {
        return new Promise ((resolve, reject)=> {
          let checkTimerId
          let counter = 0
          const check =()=> {
            if (PIANO[item]) {
              clearTimeout(checkTimerId)
              counter = 0
              resolve()
            } else {
              counter ++
              if (counter <= 450) {
                checkTimerId = setTimeout(function(){
                  check()
                }, 10)
                // console.log (item +' check '+ counter)
              } else {
                clearTimeout(checkTimerId)
                counter = 0
                reject(item)
              }
            }
          }
          check()
        })
      }
      const connectPiano =(syncMode, callback)=> {
        return new Promise ((resolve, reject)=> {

          if (syncMode === 'async' || syncMode === 'demo') {
            resolve()
            return
          }

          if(!PIANO.Sync) { MIDI.OUT(DATABASE.getMidi('Sync', true)) }
          checkPianoObj('Mode').then(()=>{
            callback(PIANO.Mode)
            console.log ('%c [Kawaipiano.js] Connected', 'color: ' + this.log.color, PIANO.Mode)
            resolve()
          }).catch(()=>{
            const needUpdateModels = ['ES920', 'CA49', 'DG30']
            const nonSupportedModels = ['Kawai Pi','NV10','NV5','ATX3,AR','CA98','CA78','CA58','CA48','CA33','CA28','CN39','CN37','CN29','CN27','CN17','KDP110','ES110','ES118']
            for (const device of MIDI.DEVICES) {
              for (const model of needUpdateModels) {
                if (device.name.match(model)) {
                  reject({message: "PianoFirmware update needed", type: "NEED_UPDATE_PIANO"})
                }
              }
              for (const model of nonSupportedModels) {
                if (device.name.match(model)) {
                  reject({message: "Piano is not supported the KawaiSysEx Protocol", type: "NON_SUPPORTED_PIANO"})
                }
              }

            }
            reject({message: "No Sync Reply", type: "NO_SYNC_REPLY"})
          })
        })
      }
      const updateBle =(isEnable, progressCallback, confirmCallback)=> {
        return new Promise ((resolve)=> {
          if(!isEnable || MIDI.API === 'WebMIDI') {
            resolve()
            return
          }
          const callback =(progress)=> {
            if (progress === 'noupdate') {
              console.log ('%c [Kawaipiano.js] No BLE update', 'color: ' + this.log.color)
            } else if (progress === 'downloading') {
              console.log ('%c [Kawaipiano.js] BLE firmware downloading', 'color: ' + this.log.color)
            } else if (progress === 'updating') {
              console.log ('%c [Kawaipiano.js] BLE firmware updating', 'color: ' + this.log.color)
            } else if (progress === 'completed') {
              console.log ('%c [Kawaipiano.js] BLE update is completed', 'color: ' + this.log.color)
            } else if (progress === 'error') {
              console.error ('[Kawaipiano.js] BLE Update Error')
            }
            if (progressCallback) { progressCallback(progress) }
          }

          MIDI.bluetooth.update(callback, confirmCallback).then(()=> { resolve() })
        })
      }
      const identifyPiano =(syncMode, callback)=> {
        return new Promise ((resolve, reject)=> {

          if (syncMode === 'async' || syncMode === 'connect') {
            resolve()
            return
          }

          const lang = (window.navigator.userLanguage || window.navigator.language || window.navigator.browserLanguage).substr(0,2) == "ja" ? 'Ja' : ''
          const requestModel =()=> {
            return new Promise ((resolve)=> {
              if (syncMode === 'demo' && !PIANO.Model) {
                appController.setSysInfo('Model', 'CA901')
              } else {
                appController.requestSysInfo('Model', PIANO.DeviceID)
              }
              checkPianoObj('Model').then(resolve).catch(resolve)
            })
          }
          const requestDestination =()=> {
            return new Promise ((resolve)=> {
              if (syncMode === 'demo') {
                const destination = (lang == 'Ja') ? 'D' : 'US'
                // PIANO.Destination = {name: destination, bluetooth: true}
                appController.setSysInfo('Destination', destination)
              } else {
                appController.requestSysInfo('Destination', PIANO.DeviceID)
              }
              checkPianoObj('Destination').then(resolve).catch(resolve)
            })
          }
          const requestLanguage =()=> {
            return new Promise ((resolve)=> {
              if (syncMode === 'demo') {
                // PIANO.Language = (lang == 'Ja') ? 'JA' : 'EN'
                const language = (lang == 'Ja') ? 'JA' : 'EN'
                appController.setSysInfo('Language', language)
              } else {
                appController.requestSysInfo('Language', PIANO.DeviceID)
              }
              checkPianoObj('Language').then(resolve).catch(resolve)
            })
          }
          const requestVersion =()=> {
            return new Promise ((resolve)=> {
              if (syncMode === 'demo') {
                // PIANO.Version = 'Kawaipiano.js Demo Mode'
                appController
                  .setSysInfo('Version', 'Kawaipiano.js Demo Mode')
              } else {
                appController.requestSysInfo('Version', PIANO.DeviceID)
              }
              checkPianoObj('Version').then(resolve).catch(resolve)
            })
          }
          const checkIdentifyError =()=> {
            return new Promise ((resolve, reject)=> {
              if (PIANO.Model && PIANO.Destination && PIANO.Language && PIANO.Version) {
                resolve()
              } else {
                reject()
              }
            })
          }
          const makeContents =()=> {
            return new Promise ((resolve)=> {
              DATABASE.makeSoundList()
              resolve()
            })
          }
          const getModelInfo =()=> {
            return {
              Model: PIANO.Model,
              Destination: PIANO.Destination.name,
              Language: PIANO.Language,
              Version: PIANO.Version
            }
          }

          requestModel()
          .then( requestDestination )
          .then( requestLanguage )
          .then( requestVersion )
          .then( checkIdentifyError )
          .then( makeContents )
          .then( ()=> {
            const obj = getModelInfo()
            callback(obj)
            console.log ('%c [Kawaipiano.js] Identified', 'color: ' + this.log.color, obj)
            resolve()
          })
          .catch( ()=> {
            const obj = getModelInfo()
            reject({message: "Identify Error", type: "IDENTIFY_ERROR", data: obj})
          })
        })
      }
      const syncPiano =(syncMode, callback)=> {
        return new Promise ((resolve, reject)=> {
          if (syncMode === 'async' || syncMode === 'connect' || syncMode === 'identify') {
            resolve()
            return
          }

          const allParameterLoading =()=> {
            return new Promise ((resolve)=> {
              if (USER.CacheMode === 'init') {
                console.log ('%c [Kawaipiano.js] Get params from preset', 'color: ' + this.log.color)
                for (const item of PRESET.InitData) {
                  if (item.Model === PIANO.Model && item.Destination === PIANO.Destination.name) {
                    PIANO.set('All', item.data, false)
                  }
                }
              } else {
                console.log ('%c [Kawaipiano.js] Get params from cache', 'color: ' + this.log.color)
                PIANO.set('All', USER.CacheData, false)
              }
              resolve()
            })
          }

          const allParameterRequest =()=> {
            return new Promise ((resolve, reject)=> {
              const modeList = [
                'Normal',
                'CheckSum',
                'Destination',
                'Model',
                'HostUpdate',
                'WaveUpdate',
                'KeyLSICurveEdit',
                'SPEQEdit',
                'SPEQTest1',
                'SPEQTest2',
                'SPEQTest3',
                'NoiseCheck',
                'Aging',
              ]
              if ( !KWM.isEmbeddedMode || modeList.includes(PIANO.Mode) ) { // 同期必須
                console.log ('%c [Kawaipiano.js] Get params from PIANO', 'color: ' + this.log.color)
                this.allParamSync.request().then(resolve).catch(reject)
              } else {
                console.log ('%c [Kawaipiano.js] Already synced', 'color: ' + this.log.color)
                resolve()
              }
            })
          }

          if (KWM.isEmbeddedMode || syncMode === 'demo') {
            allParameterLoading()
              .then(()=> {
                callback()
                console.log ('%c [Kawaipiano.js] Synced', 'color: ' + this.log.color)
                resolve()
              })
          } else {
            allParameterRequest()
            .then((time)=> {
              callback()
              console.log ('%c [Kawaipiano.js] Synced', 'color: ' + this.log.color, ' sync time: ' + time + 'sec')
              resolve()
            })
            .catch((msg)=> {
              reject({message: msg, type: "ALLPRAM.SYNC_ERROR"})
            })
          }

        })
      }
      const forceSendCurrentParam =(items)=> {
        for (const item of items ) {
          const obj = PIANO.get(item)
          if (!obj) { return }
          Object.keys(obj).forEach((part)=>{ PIANO.set(item, obj[part], part, {forceSend: true}) })
          console.log ('%c [Kawaipiano.js] Force Send : ' + item, 'color: ' + this.log.color)
        }
      }
      const onCompleted =(syncMode)=> {
        PIANO.set('Sync', true, null, false)

        if (syncMode === 'full') {
          // ローカルオフの場合、解除
          if (!KWM.isEmbeddedMode && PIANO.Parameters.System.LocalControl) {
            if (PIANO.Parameters.System.LocalControl.value !== 'On') {
              PIANO.set('LocalControl', {value: 'On'}, 'System')
            }
          }
          // KawaiSysExによるボリュームコントロール対応チェック
          if (PIANO.Parameters.MIDI2ch && PIANO.Parameters.MIDI2ch.Volume) {
            PIANO.Music.Volume.multiTrackControl = true
          } else {
            PIANO.Music.Volume.multiTrackControl = false
            PIANO.set('Music', 'Volume', 100)
          }
          // パラメーター強制送信
          if (setting.forceSendItem.length && KWM.isEmbeddedMode) { forceSendCurrentParam(setting.forceSendItem) }
        }

        timer.end = performance.now()
        const time = Math.ceil(timer.end - timer.start) / 1000
        console.log ('%c [Kawaipiano.js] Ready', 'color: ' + this.log.color, ' launch time: ' + time + 'sec')
        console.groupEnd()
        resolve ()
      }
      const onError =(e)=> {
        console.error('[Kawaipiano.js] Invoke Error : ' + e.message)
        PIANO.set('Sync', false, null, false)
        this.isActive = false
        console.groupEnd()
        reject (e)
      }

      // setting obj エラー処理
      if (!setting) { setting = {} }
      if (!setting.sync) { setting.sync = 'full' }
      if (!setting.forceSendItem) { setting.forceSendItem = [] }
      if (!setting.callback) { setting.callback = {} }
      if (!setting.callback.updatingUi) { setting.callback.updatingUi =()=>{} }
      if (!setting.callback.onLoadJson) { setting.callback.onLoadJson =()=>{} }
      if (!setting.callback.midiReady) { setting.callback.midiReady =()=>{} }
      if (!setting.callback.connected) { setting.callback.connected =()=>{} }
      if (!setting.callback.updatingBle) { setting.callback.updatingBle =()=>{} }
      if (!setting.callback.identified) { setting.callback.identified =()=>{} }
      if (!setting.callback.synced) { setting.callback.synced =()=>{} }

      // 同期解除ハンドラー登録
      if (setting.callback.onUnsync) { this.onUnsync = setting.callback.onUnsync }

      // シーケンス
      updateUi(setting.updateUi, setting.callback.updatingUi)
        .then (()=> loadJsons(setting.json, setting.callback.onLoadJson))
        .then (()=> checkMidiDevice(setting.sync, setting.callback.midiReady))
        .then (()=> connectPiano(setting.sync, setting.callback.connected))
        .then (()=> updateBle(setting.updateBle, setting.callback.updatingBle, setting.callback.confirmBleUpdate))
        .then (()=> identifyPiano(setting.sync, setting.callback.identified))
        .then (()=> WebWorker.initRecHandshakeInst())
        .then (()=> syncPiano(setting.sync, setting.callback.synced))
        .then (()=> onCompleted(setting.sync))
        .catch ((e)=> {onError(e)})
    })
  },
  allParamSync : {
    isHandling: false,
    request () {
      return new Promise ((resolve, reject)=> {
        let startTime
        let endTime
        this.completed =()=> {
          endTime = performance.now()
          const time = Math.ceil(endTime - startTime) / 1000
          this.isHandling = false
          resolve(time)
        }
        this.error =()=> {
          this.isHandling = false
          reject('[Kawaipiano.js] allParamSync error')
        }
        this.isHandling = true
        startTime = performance.now()
        appController.requestAllParam(PIANO.DeviceID)
      })
    },
    completed () {},
    error () {},
  },
  onUnsync ()　{},

  setCacheMode (mode) {
    USER.CacheMode = mode
    if (mode === 'init') {
      this.saveCache(undefined)
    } else if (mode === 'user') {
      this.saveCache(this.makeCache())
    } else if (mode === 'auto') {
      this.saveCache(this.makeCache())
    }
  },
  makeCache () {
    let obj = {}
    Object.keys(PIANO.Parameters).forEach((part) => {
      Object.keys(PIANO.Parameters[part]).forEach((param) => {
        if (param === 'Timbre') {
          obj[part] = { ...obj[part], 'Timbre': PIANO.Parameters[part][param].id }
        } else if (PIANO.Parameters[part][param].subValue === undefined) {
          obj[part] = { ...obj[part], [param]: PIANO.Parameters[part][param].value }
        } else {
          obj[part] = { ...obj[part], [param]:{ 'value': PIANO.Parameters[part][param].value, 'subValue': PIANO.Parameters[part][param].subValue } }
        }
      })
    })
    return obj
  },
  saveCache (obj) {
    USER.CacheData = obj
    this.saveUserData()
    console.log('Saved CacheData')
  },
  autoSaveCache() {
    clearInterval(this.autoSaveTimer)
    this.autoSaveTimer = setTimeout(()=> {
      this.saveCache(this.makeCache())
    }, 2000)
  },
  saveUserData () {
    setTimeout(()=>{
      DATABASE.saveUserSettings('UserData')
      setTimeout(() => {
        DATABASE.saveUserSettings('UserVtData')
      }, 100)
    }, 10)
  },
  initUserData() {
    USER = {
      Timbre: [],
      Sound: [],
      SoundPalette: [
        {
          name:'User',
          nameJa:'ユーザー',
          data: []
        },
      ],
      Music: [],
      PlayList: [
        {
          name: 'Recorder Playback',
          nameJa: '録音した曲',
          data: []
        },
        {
          name:'Downloaded',
          nameJa:'ダウンロード曲',
          data: []
        },
      ],
      VirtualTechnician: [],
      TouchCurve: [
        {
          memoryNo: 'temporary',
          name:'Ivory',
          data: [0,  0,  1,  1,  2,  2,  3,  4,  5,  6,  7,  7,  8,  9, 10, 11,
              11, 12, 13, 13, 14, 15, 15, 16, 17, 17, 18, 19, 20, 21, 22, 22,
              23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 33, 34, 35, 36, 37,
              38, 39, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52,
              54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 69, 70,
              71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 83, 84, 85, 86, 87,
              89, 90, 91, 92, 93, 94, 96, 97, 98,100,101,102,104,105,106,107,
             109,110,111,112,114,115,117,118,120,121,122,123,124,125,126,127,],
          point: [0,  0,  1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1,
              1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1,],
        },
        {
          name:'Pianoteq',
          data: [0,  0,  0,  0,  0,  1,  2,  2,  2,  3,  3,  3,  4,  4,  4,  5,
               5,  5,  5,  6,  6,  7,  7,  7,  8,  8,  9,  9, 10, 10, 11, 11,
              12, 12, 13, 14, 14, 15, 16, 17, 18, 19, 20, 20, 21, 22, 23, 24,
              25, 26, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 37, 38, 39, 40,
              41, 42, 44, 45, 46, 48, 49, 50, 52, 53, 54, 55, 56, 57, 59, 60,
              61, 63, 65, 66, 68, 69, 70, 72, 73, 74, 76, 77, 78, 80, 82, 84,
              85, 87, 88, 90, 92, 93, 95, 96, 98, 99,101,102,104,105,107,108,
              110,111,113,114,115,117,118,119,121,122,123,124,125,126,127,127,]
        },
        {
          name:'User',
          data: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,
            16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,
            32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,
            48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,
            64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,
            80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,
            96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,
            112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127]
        }
      ],
      PerNote: {
        Voicing: {
          name: 'User',
          data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        },
        Tuning: {
          name: 'User',
          data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        },
        Temperament: {
          name: 'User',
          data: [0,0,0,0,0,0,0,0,0,0,0,0]
        },
        Volume: {
          name: 'User',
          data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
            0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        },
      },
      CacheMode: 'init',
      CacheData: undefined
    }
    USERVTDATA = {
      TouchCurve: {
        default: {
          index: 1,
          data: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,
          16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,
          32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,
          48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,
          64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,
          80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,
          96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,
          112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127]
        }
      },
      Voicing: {
        default: {
          // indexは現状UIで使用するため88鍵に対する番号を指定
          index: 39,
          data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        }
      },
      Tuning: {
        default: {
          // indexは現状UIで使用するため88鍵に対する番号を指定
          index: 39,
          data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        }
      },
      Temperament: {
        default: {
          index: 0,
          temp: 0,
          data: [0,0,0,0,0,0,0,0,0,0,0,0]
        }
      },
      Volume: {
        default: {
          // indexは現状UIで使用するため88鍵に対する番号を指定
          index: 39,
          data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
          0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        }
      }
    }
    this.saveUserData()
  },
}

{
  KawaipianoJs.path = document.currentScript.getAttribute('src')
}
"use strict"

const KWM = {

  //-- KWMCore NativeIF
  callNative(cmd, obj) {
    const data = obj ? obj : {}
    const url = 'kwmcore://' + cmd + '/?' + JSON.stringify(data)

    if (typeof webkit === 'object') {
      webkit.messageHandlers.kwmcore.postMessage(url)
    }
    else if (typeof kwmcore === 'object') {
      kwmcore.postMessage(url)
    }
    else {
      //KAWAI: document.location = url
    }
  },
  log(msg) {
    KWM.callNative('log', {log:msg})
  },
  dispatchEvent(id, arg) {
    const event = new CustomEvent(id, { detail: arg })
    document.dispatchEvent(event)
  },
  callbacks: {},
  callbackNative(id, data, keep) {
    if (!KWM.callbacks[id]) return
    const callback = KWM.callbacks[id]
    if (callback) {
      const obj = data ? JSON.parse(data) : null
      callback(obj)
    }
    if (!keep) delete KWM.callbacks[id]
  },
  promises: {},
  resolvePromise(id, data) {
    if (!KWM.promises[id]) return
    const callback = KWM.promises[id].resolve
    if (callback) {
      const obj = data ? JSON.parse(data) : null
      callback(obj)
    }
    delete KWM.promises[id]
  },
  rejectPromise(id, data) {
    if (!KWM.promises[id]) return
    const callback = KWM.promises[id].reject
    if (callback) {
      const obj = data ? JSON.parse(data) : null
      callback(obj)
    }
    delete KWM.promises[id]
  },
  invoke () {
    return new Promise((resolve, reject) => {

      // KWMcore環境ではない場合、reject
      if (typeof webkit !== 'object' && typeof kwmcore !== 'object') { reject('KWMcore is unavailable.') }

      // 起動済みの場合、resolve
      if (this.isAvailable) { resolve() }

      // KWMcore devicereadyイベント発火後、起動処理実行
      document.addEventListener('deviceready', (e) => {

        KWM.permission = e.detail
        KWM.log("Event: deviceready" + ": " + e)

        //バージョン情報・MIDIデバイス情報取得
        const complete =(mode)=> {
          KWM.getVersions().finally(() => {
            this.isAvailable = true
            KWM.log(mode)
            resolve(mode)
          })
        }

        //組込モード判定
        if (typeof kwmcore === 'object') { // Android

          KWM.getEmbeddedMode().then((obj) => {
            if (obj) { // 組込モード
              this.isEmbeddedMode = true
              complete('Android/EmbeddedMode')

              KWM.getLcdInfo().then((obj) => {
                KWM.log('getLcdInfo:' + " height:" + obj.height + " width:" + obj.width + " dpi:" + obj.dpi)
              }).catch(() => {
                KWM.log('getLcdInfo.reject')
              })

              KWM.getLcdBacklight().then((obj) => {
                KWM.log('getLcdBacklight:' + obj.brightness)
                if (obj.brightness < 75) {
                  KWM.setLcdBacklight(75)
                } else {
                  KWM.setLcdBacklight(25)
                }
              }).catch(() => {
                KWM.log('getLcdBacklight.reject')
              })

              KWM.getUsbActivity().then((obj) => {
                if (obj) {
                  KWM.getUsbPath().then((obj) => {
                    KWM.log('getUsbPath:' + obj.path)
                  }).catch(() => {
                    KWM.log('getUsbPath.reject')
                  })
                }
              })

              KWM.getJniVersion().then((obj) => {
                KWM.log('getJniVersion:' + obj.version)
              }).catch(() => {
                KWM.log('getJniVersion.reject')
              })

            } else { // アプリモード
              complete('Android/AppMode')
            }
          }).catch(() => {
            KWM.log('getEmbeddedMode.reject')
            complete('Android/AppMode')
          })
        } else { //iOS
          complete('iOS/AppMode')
        }

      })
    })
  },
  getVersions() {
    return new Promise((resolve, reject) => {
      KWM.promises['getVersions'] = {resolve, reject}
      KWM.callNative('getVersions')
    })
  },
  getMidiDevices() {
    return new Promise((resolve, reject) => {
      KWM.promises['getMidiDevices'] = {resolve, reject}
      KWM.callNative('getMidiDevices')
    })
  },

  //-- KWMCore Properties
  isAvailable: false,             //Boolean型、KWMcoreが利用可能状態の場合True (KWMcore環境判定ではない)
  isEmbeddedMode: false,          //Boolean型、組込Androidモードの場合True
  devices : [],                   //object型、KWMcoreに接続されているMIDIデバイスの情報
  latestPianoVersion : null,      //object型、サーバーにあるピアノ本体ファームウェアのバージョン番号
  latestUiVersion : null,         //string型、サーバーにあるUIデータのバージョン番号
  localUiVersion : null,          //string型、KWMcoreが現在読み込んでいるUIデータのバージョン番号
  latestAppVersion : null,        //string型、アップデート可能なKWMcoreのバージョン番号
  localAppVersion : null,         //string型、KWMcoreが現在のバージョン番号
  isBleMidiWindowShown : false,   //Boolean型、ネイティブBLE MIDI画面が開いて入ればTrue、閉じて入ればFalse
  permission: {},                 //object型、KWMcoreへのパーミッション付与状況
  willSystemPowerOff: false,      //Boolean型、Piano本体から電源OFF通知を受信するとTrueに

  //-- KWMCore Methods

  //-- MIDI
  openBleMidiWindow() {
    KWM.callNative('openBleMidiWindow')
  },
  closeBleMidiWindow() {
    KWM.callNative('closeBleMidiWindow')
  },
  onDeviceStateChange() {
    MIDI.DEVICE.stateChange()
  },
  sendMidiMessage(message, id, time) {
    if (message.length) {
      let obj = {msg:message}
      if (id) obj.id = id
      if (time) obj.time = time
      KWM.callNative('sendMidiMessage', obj)
    }
  },
  onMidiMessage(message, id, time) {
    if (message.length) { KWM.log(message + ' ' + id + ' ' + time) }
  },

  autoConnectBleMidi(on) {
      KWM.callNative('autoConnectBleMidi', {'on': on})
  },
  setTimeStampLatency(ms) {
      KWM.callNative('setTimeStampLatency', {'ms': ms})
  },
  disableAutoLock(on) {
      KWM.callNative('disableAutoLock', {'on': on})
  },

  //-- Update
  downloadPianoFirmware(model) {
    //開発取り止め
    return new Promise(function (onSuccess, onError) {
    })
  },
  updatePianoFirmware(id, progressCallback) {
    //開発取り止め
    KWM.updateDP(progresscallback)
  },
  downloadBleMidiFirmware() {
    return new Promise(function (onSuccess, onError) {
      KWM.promises['downloadBleMidiFirmware'] = {resolve:onSuccess, reject:onError}
      KWM.callNative('downloadBleMidiFirmware')
    })
  },
  getDeviceBleMidiVersion(id) {
    return new Promise(function (onSuccess, onError) {
      KWM.promises['getDeviceBleMidiVersion'] = {resolve:onSuccess, reject:onError}
      KWM.callNative('getDeviceBleMidiVersion', {id})
    })
  },
  updateBleMidiFirmware(id, progresscallback) {
    KWM.callbacks['updateBleMidiFirmware'] = progresscallback
    KWM.callNative('updateBleMidiFirmware', {id})
  },
  updateBleMidiFirmware_Test(id, progresscallback) {
    //テスト用ファームへのアップデート
    KWM.callbacks['updateBleMidiFirmware'] = progresscallback
    KWM.callNative('updateBleMidiFirmware', {id,test:true})
  },
  downloadUiData() {
    return new Promise( (onSuccess, onError) => {
      KWM.promises['downloadUiData'] = {resolve:onSuccess, reject:onError}
      KWM.callNative('downloadUiData')
    })
  },
  updateUiData() {
    return new Promise( (onSuccess, onError) => {
      KWM.promises['updateUiData'] = {resolve:onSuccess, reject:onError}
      KWM.callNative('updateUiData')
    })
  },

  //-- Local Json
  saveJson(name, json) {
    if (this.willSystemPowerOff) { return }
    return new Promise((resolve, reject) => {
      KWM.promises['saveJson'] = {resolve, reject}
      KWM.callNative('saveJson', {'name':name,'json':json})
    })
  },
  loadJson(name) {
    return new Promise((resolve, reject) => {
      KWM.promises['loadJson'] = {resolve, reject}
      KWM.callNative('loadJson', {'name':name})
    })
  },
  deleteJson(name) {
    return new Promise((resolve, reject) => {
      KWM.promises['deleteJson'] = {resolve, reject}
      KWM.callNative('deleteJson', {'name':name})
    })
  },
  loadKwmJson(name) {
    return new Promise((resolve, reject) => {
      KWM.promises['loadKwmJson'] = {resolve, reject}
      KWM.callNative('loadKwmJson', {'name':name})
    })
  },

  //-- SMF Player
  selectSmf(path, quantise, overdubbing, info) {
    return new Promise(function (resolve, reject) {
      KWM.promises['selectSmf'] = {resolve, reject}
      const obj = {path:path, quantise:quantise, overdubbing:overdubbing, info:info}
      if (quantise == null) quantise = 256
      if ([2,4,8,16,32,64,128,256].includes(quantise)) obj.quantise = quantise
      KWM.callNative('selectSmf', obj)
    })
  },
  makeSmf(path, json) {
    return new Promise(function (resolve, reject) {
      KWM.promises['makeSmf'] = {resolve, reject}
      KWM.callNative('makeSmf', {'path': path, 'smfjson': json})
    })
  },
  deleteSmf(path) {
    return new Promise(function (resolve, reject) {
      KWM.promises['deleteSmf'] = {resolve, reject}
      KWM.callNative('deleteSmf', {'path': path})
    })
  },
  getSmfList(bundle) {
    return new Promise(function (resolve, reject) {
      KWM.promises['getSmfList'] = {resolve, reject}
      KWM.callNative('getSmfList', {'bundle': bundle})
    })
  },
  playStartSmf(interval, id) {
    KWM.callNative('playStartSmf', {'interval': interval, 'id': id})
  },
  playPauseSmf() {
    KWM.callNative('playPauseSmf')
  },
  playStopSmf() {
    KWM.callNative('playStopSmf')
  },
  getTimeProgress(timeProgresscallback) {
    KWM.callbacks['getTimeProgress'] = timeProgresscallback
    KWM.callNative('getTimeProgress', null)
  },
  setTimeProgress(deltaTime) {
    KWM.callNative('setTimeProgress', {'deltaTime': deltaTime})
  },
  setIntervalTimeProgress(interval) {
    KWM.callNative('setIntervalTimeProgress', {'interval': interval})
  },
  onPlayDone(callback) {
    KWM.callbacks['onPlayDone'] = callback
    KWM.callNative('onPlayDone', null)
  },
  enabledPlayStart(callback) {
    KWM.callbacks['enabledPlayStart'] = callback
    KWM.callNative('enabledPlayStart', null)
  },
  onSmfMidiMessage(message, time) {
    if (message.length) { KWM.log(message + ' SMFPlayer ' + time) }
  },
  setSmfTempo(tempo) {
    KWM.callNative('setSmfTempo', {'tempo': tempo})
  },
  setSmfRelativeTempo(tempo) {
    KWM.callNative('setSmfRelativeTempo', {'tempo': tempo})
  },
  setSmfTranspose(transpose) {
    KWM.callNative('setSmfTranspose', {'transpose': transpose})
  },
  setSmfTrack(array) {
    KWM.callNative('setSmfTrack', {'array': array})
  },
  setSmfOutFilter(on) {
    KWM.callNative('setSmfOutFilter', {'on': on})
  },
  setMetronome(isOn, volume) {
    KWM.callNative('setMetronome', {'isOn': isOn, 'volume': volume})
  },

  setSmfRepeatA(countIn) {
    return new Promise(function (resolve, reject) {
      KWM.promises['setSmfRepeatA'] = {resolve, reject}
      KWM.callNative('setSmfRepeatA', {'countIn': countIn})
    })
  },
  setSmfRepeatB() {
    return new Promise(function (resolve, reject) {
      KWM.promises['setSmfRepeatB'] = {resolve, reject}
      KWM.callNative('setSmfRepeatB')
    })
  },


  //-- ConcertMagic
  setConcertMagicMode(mode, smooth, triggerTrack) {
    return new Promise(function (resolve, reject) {
      KWM.promises['setConcertMagicMode'] = {resolve, reject}
      KWM.callNative('setConcertMagicMode', {'mode': mode, 'smooth': smooth, 'triggerTrack': triggerTrack})
    })
  },
  setConcertMagicNativeTrigger(isNative) {
    KWM.callNative('setConcertMagicNativeTrigger', {'isNative': isNative})
  },
  playConcertMagic(noteno, velocity) {
    KWM.callNative('playConcertMagic', {'noteno': noteno, 'velocity': velocity})
  },
  donePlayConcertMagic(noteno, velocity, sec, success, cmr) {
  },

  //-- Embedded Mode
  setEmbeddedMode(on) {
    let obj = on ? {on:true} : {on:false}
    KWM.callNative('setEmbeddedMode', obj)
  },
  getEmbeddedMode() {
    return new Promise((resolve, reject) => {
      KWM.promises['getEmbeddedMode'] = {resolve, reject}
      KWM.callNative('getEmbeddedMode')
    })
  },
  getLcdInfo() {
    return new Promise((resolve, reject) => {
      KWM.promises['getLcdInfo'] = {resolve, reject}
      KWM.callNative('getLcdInfo')
    })
  },
  getLcdBacklight() {
    return new Promise((resolve, reject) => {
      KWM.promises['getLcdBacklight'] = {resolve, reject}
      KWM.callNative('getLcdBacklight')
    })
  },
  setLcdBacklight(brightness) {
    KWM.callNative('setLcdBacklight', {brightness:brightness})
  },
  getLcdInfo() {
    return new Promise((resolve, reject) => {
      KWM.promises['getLcdInfo'] = {resolve, reject}
      KWM.callNative('getLcdInfo')
    })
  },
  getUsbActivity() {
    return new Promise((resolve, reject) => {
      KWM.promises['getUsbActivity'] = {resolve, reject}
      KWM.callNative('getUsbActivity')
    })
  },
  getUsbPath() {
    return new Promise((resolve, reject) => {
      KWM.promises['getUsbPath'] = {resolve, reject}
      KWM.callNative('getUsbPath')
    })
  },
  getJniVersion() {
    return new Promise((resolve, reject) => {
      KWM.promises['getJniVersion'] = {resolve, reject}
      KWM.callNative('getJniVersion')
    })
  },
  launchAndroidSettingsApp() {
    KWM.callNative('launchAndroidSettingsApp')
  },
  updateApk(appName) {
    return new Promise((resolve, reject) => {
      KWM.promises['updateApk'] = {resolve, reject}
      KWM.callNative('updateApk', {name:appName})
    })
  },

  //-- Metronome（Rhythmへ統合のため、廃止予定）
  enableMetronome(on) {
      KWM.callNative('enableMetronome', {'on': on})
  },
  setMetronomeTempo(tempo) {
      KWM.callNative('setMetronomeTempo', {'tempo': tempo})
  },
  setMetronomeTimeSignature(numra, denom) {
      KWM.callNative('setMetronomeTimeSignature', {'numra': numra, denom: denom})
  },
  setMetronomeVolume(volume) {
      KWM.callNative('setMetronomeVolume', {'volume': volume})
  },
  setMetronomeNativeAudio(on) {
      KWM.callNative('setMetronomeNativeAudio', {'on': on})
  },
  muteMetronome(on) {
      KWM.callNative('muteMetronome', {'on': on})
  },
  onMetronomeEvent(callback) {
      KWM.callbacks['onMetronomeEvent'] = callback
      KWM.callNative('onMetronomeEvent', null)
  },

  //-- Recorder Common
  setRecorderMode(midi) {
    KWM.callNative('setRecorderMode', {midi: midi})
  },
  recordStandby() {
    KWM.callNative('recordStandby', null)
  },
  recordStart() {
    KWM.callNative('recordStart', null)
  },
  recordStop() {
    return new Promise(function (resolve, reject) {
      KWM.promises['recordStop'] = {resolve, reject}
      KWM.callNative('recordStop')
    })
  },
  setRecordOverdubbing(on, audio) {
    KWM.callNative('setRecordOverdubbing', {on: on, 'audio': audio})
  },
  getRecordStatus(callback) {
    KWM.callbacks['getRecordStatus'] = callback
    KWM.callNative('getRecordStatus', null)
  },
  saveRecord(name) {
    return new Promise(function (resolve, reject) {
      KWM.promises['saveRecord'] = {resolve, reject}
      KWM.callNative('saveRecord', {'name': name})
    })
  },
  openShareRecord(dstname, srcname, x, y) {
    KWM.callNative('openShareRecord', {'dstname': dstname, 'srcname': srcname, 'x': x, 'y': y})
  },
  closeShareRecord() {
    KWM.callNative('closeShareRecord', null)
  },
  clearRecord() {
    return new Promise(function (resolve, reject) {
      KWM.promises['clearRecord'] = {resolve, reject}
      KWM.callNative('clearRecord')
    })
  },
  deleteAllRecord() {
    return new Promise(function (resolve, reject) {
      KWM.promises['deleteAllRecord'] = {resolve, reject}
      KWM.callNative('deleteAllRecord', null)
    })
  },

  //-- MIDI Recorder
  setRecordSmfChannel(ch) {
    KWM.callNative('setRecordSmfChannel', {'ch': ch})
  },
  setRecordSmfJson(name, time) {
    KWM.callNative('setRecordSmfJson', {'name': name, 'time': time})
  },
  onPlaySmfJson(name) {
    console.log('onPlaySmfJson', name)
    playSmfJson(name)   //  recorder.js
  },
  setRecordSmfFormat(format) {
    KWM.callNative('setRecordSmfFormat', {'format': format})
  },

  //-- Audio Recorder
  selectAudioRecord(path) {
    return new Promise(function (resolve, reject) {
      KWM.promises['selectAudioRecord'] = {resolve, reject}
      let obj = {path:path}
      KWM.callNative('selectAudioRecord', obj)
    })
  },
  getAudioRecordList() {
    return new Promise(function (resolve, reject) {
      KWM.promises['getAudioRecordList'] = {resolve, reject}
      KWM.callNative('getAudioRecordList', null)
    })
  },
  setRecordAudioFormat(extension, sampleRate, channels, bitsPerChannel) {
    KWM.callNative('setRecordAudioFormat', {'extension': extension, 'sampleRate': sampleRate, 'channels': channels, 'bitsPerChannel': bitsPerChannel})
  },
  getRecordAudioTimeProgress(callback) {
    KWM.callbacks['getRecordAudioTimeProgress'] = callback
    KWM.callNative('getRecordAudioTimeProgress', null)
  },
  playStartAudioRecord(select) {
    KWM.callNative('playStartAudioRecord', {'select': select})
  },
  playStopAudioRecord() {
    KWM.callNative('playStopAudioRecord', null)
  },
  deleteAudioRecord(path) {
    return new Promise(function (resolve, reject) {
      KWM.promises['deleteAudioRecord'] = {resolve, reject}
      KWM.callNative('deleteAudioRecord', {'path': path})
    })
  },
  setRecordAudioInputLevel(level) {
    KWM.callNative('setRecordAudioInputLevel', {'level': level})
  },
  getRecordAudioInputLevel(callback) {
    KWM.callbacks['getRecordAudioInputLevel'] = callback
    KWM.callNative('getRecordAudioInputLevel', null)
  },
  setRecordAudioHeadphoneMonitoring(on) {
    KWM.callNative('setRecordAudioHeadphoneMonitoring', {'on': on})
  },
  recordAudioInputStart() {
    KWM.callNative('recordAudioInputStart', null)
  },
  recordAudioInputStop() {
    KWM.callNative('recordAudioInputStop', null)
  },
  setRecordAudioTimeProgress(time) {
     KWM.callNative('setRecordAudioTimeProgress', {'time': time})
  },
  openURL(path) {
    return new Promise(function (resolve, reject) {
      KWM.promises['openURL'] = {resolve, reject}
      KWM.callNative('openURL', {'path': path})
    })
  },
    
  //-- Rhythm Mode
  getRhythmCategoryList(isJp) {
    return new Promise(function (resolve, reject) {
      KWM.promises['getRhythmCategoryList'] = {resolve, reject}
      KWM.callNative('getRhythmCategoryList', {'isJp':isJp})
    })
  },
  getRhythmStyleList(isJp) {
    return new Promise(function (resolve, reject) {
      KWM.promises['getRhythmStyleList'] = {resolve, reject}
      KWM.callNative('getRhythmStyleList', {'isJp':isJp})
    })
  },
  selectRhythmStyle(no) {
    return new Promise(function (resolve, reject) {
      KWM.promises['selectRhythmStyle'] = {resolve, reject}
      KWM.callNative('selectRhythmStyle', {'no': no})
    })
  },
  setRhythmTempo(tempo) {
    KWM.callNative('setRhythmTempo', {'tempo': tempo})
  },
  setRhythmVolume(volume) {
    KWM.callNative('setRhythmVolume', {'volume': volume})
  },
  setRhythmTimeSignature(numra, denom) {
      KWM.callNative('setRhythmTimeSignature', {'numra': numra, denom: denom})
  },
  muteRhythm(on) {
    KWM.callNative('muteRhythm', {'on': on})
  },
  enableRhythm(on) {
    KWM.callNative('enableRhythm', {'on': on})
  },
  onRhythmEvent(callback) {
    KWM.callbacks['onRhythmEvent'] = callback
    KWM.callNative('onRhythmEvent', null)
  },
  setRhythmPolyphony(num) {
    KWM.callNative('setRhythmPolyphony', {'num': num})
  },
  setRhythmReverbDepth(depth) {
    KWM.callNative('setRhythmReverbDepth', {'depth': depth})
  },
  setRhythmReverbTime(time) {
    KWM.callNative('setRhythmReverbTime', {'time': time})
  },
  useRhythmAudio(on) {
    KWM.callNative('useRhythmAudio', {'on': on})
  },
  getRhythmReverbTypeList(isJp) {
    return new Promise(function (resolve, reject) {
      KWM.promises['getRhythmReverbTypeList'] = {resolve, reject}
      KWM.callNative('getRhythmReverbTypeList', {'isJp':isJp})
    })
  },
  selectRhythmReverbType(no) {
    KWM.callNative('selectRhythmReverbType', {'no': no})
  },
  setRhythmRepeat(bar) {
    KWM.callNative('setRhythmRepeat', {'bar': bar})
  },

  //    import share file
  onShareFileMid(callback) {
    KWM.callbacks['onShareFileMid'] = callback
    KWM.callNative('onShareFileMid', null)
  },
  onShareFileAudio(callback) {
    KWM.callbacks['onShareFileAudio'] = callback
    KWM.callNative('onShareFileAudio', null)
  },

    
  //   for edit parameter
  playRhythmStyleDP(no) {
    KWM.callNative('playRhythmStyleDP', {'no': no})
  },
  setRhythmPara(wav, para, val) {
    return new Promise(function (resolve, reject) {
      KWM.promises['setRhythmPara'] = {resolve, reject}
      KWM.callNative('setRhythmPara', {'wav': wav, 'para':para, 'val': val})
    })
  },
  resetRhythmParaMain(wav) {
    return new Promise(function (resolve, reject) {
      KWM.promises['resetRhythmParaMain'] = {resolve, reject}
      KWM.callNative('resetRhythmParaMain', {'wav': wav})
    })
  },
  resetRhythmParaEq(wav) {
    return new Promise(function (resolve, reject) {
      KWM.promises['resetRhythmParaEq'] = {resolve, reject}
      KWM.callNative('resetRhythmParaEq', {'wav': wav})
    })
  },
  resetRhythmParaReverb(wav) {
    return new Promise(function (resolve, reject) {
      KWM.promises['resetRhythmParaReverb'] = {resolve, reject}
      KWM.callNative('resetRhythmParaReverb', {'wav': wav})
    })
  },
  resampleRhythm(wav) {
      return new Promise(function (resolve, reject) {
        KWM.promises['resampleRhythm'] = {resolve, reject}
          KWM.callNative('resampleRhythm', {'wav': wav})
      })
  },
  getRhythmAllWavParameters() {
    return new Promise(function (resolve, reject) {
      KWM.promises['getRhythmAllWavParameters'] = {resolve, reject}
      KWM.callNative('getRhythmAllWavParameters', null)
    })
  },
  setRhythmDpVol(style, vol) {
    KWM.callNative('setRhythmDpVol', {'style': style, 'vol': vol})
  },
  soloRhythm(wav, on) {
    KWM.callNative('soloRhythm', {'wav': wav, 'on': on})
  },
  playRhythmTest(wav, vol) {
    KWM.callNative('playRhythmTest', {'wav': wav, 'vol':vol})
  },
  selectRhythmWav(wav) {
    return new Promise(function (resolve, reject) {
      KWM.promises['selectRhythmWav'] = {resolve, reject}
      KWM.callNative('selectRhythmWav', {'wav': wav})
    })
  },
  saveResampleAllWav() {
      return new Promise(function (resolve, reject) {
        KWM.promises['saveResampleAllWav'] = {resolve, reject}
        KWM.callNative('saveResampleAllWav', null)
      })
  },
  onWaitProgress(callback) {
    KWM.callbacks['onWaitProgress'] = callback
    KWM.callNative('onWaitProgress', null)
  },
 resetAllParameter() {
    return new Promise(function (resolve, reject) {
      KWM.promises['resetAllParameter'] = {resolve, reject}
      KWM.callNative('resetAllParameter', null)
    })
},



  // kawai smfplayer.js 実験用メソッド
  // 以下のメソッドは開発実験用のため、Android版への移植は不要です。
  getOtherMidiDevices() {
    return new Promise((resolve, reject) => {
      KWM.promises['getOtherMidiDevices'] = {resolve, reject}
      KWM.callNative('getOtherMidiDevices')
    })
  },
  connectOtherMidiDevice(id) {
    return new Promise((resolve, reject) => {
      KWM.promises['connectOtherMidiDevice'] = {resolve, reject}
      KWM.callNative('connectOtherMidiDevice', {'id': id})
    })
  },
  allSoundOff(callback, param) {
    KWM.callNative('allSoundOff')
  },
  onKeyEvent(callback) {
    KWM.callbacks['onKeyEvent'] = callback
    KWM.callNative('onKeyEvent', null)
  },
  exportSmfFormat0() {
    KWM.callNative('exportSmfFormat0', null)
  },

}

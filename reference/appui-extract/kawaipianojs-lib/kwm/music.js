class Music {

  constructor() {
    this._status = 'init'
    this._selected = {}
    this._queue = []
    this._originalQueue = []
    this._repeat = false
    this._repeatSingle = false
    this._shuffle = false
    this._continuous = true
    this._continuousWaitTime = 2000
    this._time = {
      progress: 0,
      current: { delta: 0, num: 0, str: '--:--' },
      remaining: { delta: 0, num: 0, str: '--:--' },
      repeatA: { isActive: false, str: '--:--' },
      repeatB: { isActive: false, str: '--:--' },
    }
    this._volume = {
      master: 100,
      track: null,
      volume: null
    }
    this._tempo = {
      default: null,
      current: null,
      userInput: null
    }
    this._speed = 1
    this._transpose = 0

    // try { this._favorite = PRESET.PlayList[0].data }
    // catch (e) { this._favorite = [] }
    // try { this._recently = PRESET.PlayList[1].data }
    // catch (e) { this._recently = [] }
    try { this._recorded = USER.Music }
    catch (e) { this._recorded = [] }
    try { this._downloaded = USER.PlayList[1].data }
    catch (e) { this._downloaded = [] }

    const onProgress =(e)=> {
      this.onPlaybackEvent(e)
      if (this._status === 'loading') {
        _setStatus(this)('play')
        _emitStatus(this)('play')
      }
      // KWMcore側修正後消す
      if(this._status === 'recording' || !this._time.total) return
      if (!this._selected.format || this._selected.format === 'smf0' || this._selected.format === 'smf1') {
        let progress = Math.ceil( ( e.time / this._time.total.delta ) * 1000 ) / 1000
        progress = progress > 1 ? 1 : progress
        if (this._time.progress !== progress) {
          const progressEvent = {
            progress: progress,
            current: { delta: e.time, num: e.elapsedTime, str: e.elapsedTimeString },
            remaining: {　delta: this._time.total.delta - e.time, num: e.remainingTime, str: e.remainingTimeString　},
          }
          this._time = { ...this._time, ...progressEvent }
          if (!progressEvent.current.delta) { this._time.total.num = e.remainingTime }
          this.onProgressEvent(progressEvent)
        }
        if (this._tempo.current !== e.tempoMusic) {
          this._tempo.current = e.tempoMusic
          this.onTempoEvent(e.tempoMusic)
        }
        if (this._status === 'concertmagic') {
          this.concertmagic.playTempo = e.tempoPlay
          this.concertmagic.nextDeltaTime = e.timeTrigger
        }
      } else {
        const progress = Math.ceil( ( e.elapsedTime / this._time.total.num ) * 1000 ) / 1000
        if (this._time.progress !== progress) {
          const progressEvent = {
            progress: progress,
            current: { num: e.elapsedTime, str: e.elapsedTimeString },
            remaining: { num: this._time.total.num - e.elapsedTime, str: e.remainingTimeString　},
          }
          this._time = { ...this._time, ...progressEvent }
          this.onProgressEvent(progressEvent)
        }
      }
    }
    const onPlayEnd =()=> {
      if (this._status !== 'play' && this._status !== 'concertmagic') { return }
      if (this._repeatSingle) {
        this.time = 0
        if (this._status === 'play') { this.play() }
        this.onProgressEvent(this._time)
      } else if (this._continuous && this.nextSong) {
        setTimeout (this.next(), this._continuousWaitTime)
      } else {
        this.stop()
        this.time = 0
        this.onProgressEvent(this._time)
      }
    }

    KWM.setSmfOutFilter(true)
    KWM.getTimeProgress(onProgress)
    KWM.onPlaySmfJson =(id)=> { this.onSmfCallback(id) }
    KWM.onPlayDone (onPlayEnd)
    KWM.getRecordAudioInputLevel =(e)=> { this.onLevelEvent(e) }
    KWM.enabledPlayStart((e) => { console.log('KWM.enabledPlayStart', e) })
  }

  get favoriteSongs () { return PRESET.PlayList[0].data }
  set favoriteSongs (songs) { PRESET.PlayList[0].data = songs }

  get status () {
    return this._status
  }
  get selected () {
    return this._selected
  }
  get nextSong () {
    const i = this.queueIndex
    const l = this._queue.length
    const r = this._repeat
    return (i === -1 || l === 1 && !r || i === l - 1 && !r) ? false : true
  }
  get previousSong () {
    const i = this.queueIndex
    const l = this._queue.length
    const r = this._repeat
    return  (i === -1 || l === 1 || i === 0 && !r) ? false : true
  }
  get repeat () {
    return this._repeat
  }
  set repeat (newVal) {
    this._repeat = newVal
  }
  get repeatSingle () {
    return this._repeatSingle
  }
  set repeatSingle (newVal) {
    this._repeatSingle = newVal
  }
  get shuffle () {
    return this._shuffle
  }
  set shuffle (newVal) {
    this._shuffle = newVal
    if (newVal) {
      const newQueue = []
      const queue = Array.from(this._queue)
      this._originalQueue = Array.from(queue)
      const i = this.queueIndex
      if (i > -1) {
        queue.splice(i, 1)
        newQueue.push(this._selected)
      }
      queue.sort(()=> { return Math.random() - Math.random() })
      for (const item of queue) { newQueue.push(item) }
      this._queue = newQueue
    } else {
      this._queue = this._originalQueue
    }
  }
  get queue () {
    return this._queue
  }
  set queue (newVal) {
    this._queue = newVal
    if (this._shuffle) { this.shuffle = true }
  }
  get queueIndex () {
    return this._queue.findIndex(item => item.id === this._selected.id)
  }
  get continuous () {
    return this._continuous
  }
  set continuous (newVal) {
    this._continuous = newVal
  }
  get continuousWaitTime () {
    return this._continuousWaitTime
  }
  set continuousWaitTime (newVal) {
    this._continuousWaitTime = newVal
  }
  get time () {
    return this._time
  }
  set time (newVal) {
    if (!Object.keys(this._selected).length) { return }
    if (!this._selected.format || this._selected.format === 'smf0' || this._selected.format === 'smf1') {
      if (!newVal) {
        this._time = { ...this._time, progress: newVal, current: {delta: 0, num: 0, str: "0:00"} }
      } else if (newVal.delta) {
        const progress = Math.ceil( ( newVal.delta / this._time.total.delta ) * 1000 ) / 1000
        this._time =  { ...this._time, progress: progress, current: { ...this._time.current, delta: newVal.delta }}
      } else {
        if (typeof newVal !== 'number') {
          console.error ('Error! argument must be `number` or `delta object`.')
          return
        }
        if (newVal < 0 || newVal > 1) { console.warn ('Error! Time progress value must be `0 ~ 1`.') }
        this._time = { ...this._time, progress: newVal, current: { ...this._time.current, delta: this._time.total.delta * newVal } }
      }
      KWM.setTimeProgress(this._time.current.delta)
    } else {
      if (!newVal) {
        this._time = { ...this._time, progress: newVal, current: {num: 0, str: "0:00"} }
      } else {
        if (typeof newVal !== 'number') {
          console.error ('Error! argument must be `number`.')
          return
        }
        if (newVal < 0 || newVal > 1) { console.warn ('Error! Time progress value must be `0 ~ 1`.') }
        this._time = { ...this._time, progress: newVal, current: { ...this._time.current, num: this._time.total.num * newVal } }
      }
      KWM.setRecordAudioTimeProgress(this._time.current.num)
    }
  }
  get volume () {
    return this._volume
  }
  set volume (newVal) {
    this._volume = newVal
  }
  get tempo () {
    return this._tempo
  }
  set tempo (newVal) {
    this._tempo.userInput = newVal
    this._speed = Math.round(newVal / this._tempo.default * 10) / 10
    KWM.setSmfTempo(newVal)
  }
  get speed () {
    return this._speed
  }
  set speed (newVal) {
    this._tempo.userInput = Math.round(this._tempo.default * newVal)
    this._speed = newVal
    KWM.setSmfRelativeTempo(newVal)
  }
  get transpose () {
    return this._transpose
  }
  set transpose (newVal) {
    this._transpose = newVal
    KWM.setSmfTranspose(newVal)
  }
  get recorder () {
    return this._recorder
  }
  get recorded () {
    return this._recorded
  }
  get enableTracks () {
    return this._volume.track
  }
  set enableTracks (tracks) {
    KWM.setSmfTrack(tracks)
  }

  init() {
    if (this._status !== 'stop') { this.stop() }
    _setStatus(this)('init')
    this._selected = {}
    this._queue = []
    this._originalQueue = []
    this._time = {
      progress: 0,
      current: { delta: 0, num: 0, str: '--:--' },
      remaining: {　delta: 0, num: 0, str: '--:--' },
      repeatA: { isActive: false, str: '--:--' },
      repeatB: { isActive: false, str: '--:--' },
    }
    this._volume = {
      master: 100,
      track: null,
      volume: null
    }
    this._tempo = {
      default: null,
      current: null,
      userInput: null
    }
    this._speed = 1
    this._transpose = 0
    if (this._recorder) { this.recorder.clear() }
    delete this._recorder
    _emitStatus(this)('init')
  }
  select(musicObj) {
    return new Promise ((resolve, reject)=> {
      const status = this._status
      if (this._status !== 'stop') { this.stop() }
      if (this._repeatSingle) { this._repeatSingle = false }
      _setStatus(this)('inprogress')
      const path = (musicObj.isRecorded) ? musicObj.id + '.' + musicObj.attribute : "Kawai/default/" + musicObj.smfPath
      if (!musicObj.format || musicObj.format === 'smf0' || musicObj.format === 'smf1') {
        console.log('MusicClass select smf', path)
        KWM.selectSmf(path).then((smfInfo)=> {
          this._selected = {
            ...musicObj,
            favorite: (this.favoriteSongs.findIndex(item => item.id === musicObj.id) !== -1) ? true : false,
            concertMagicSupport: musicObj.concertMagic,
            lessonSupport: musicObj.handsBalance,
            format: ['smf0', 'smf1'][smfInfo.format],
            division: smfInfo.division,
            beat: smfInfo.beatInfo,
            bar: smfInfo.barInfo,
          }
          this._time = {
            progress: null,
            current: { delta: 0, num: 0, str: '--:--' },
            total: { delta: smfInfo.totalTime, num: 1, str: smfInfo.timeStringRepeatB },
            remaining: { delta: smfInfo.totalTime, num: 1, str: smfInfo.timeStringRepeatB },
            repeatA: { isActive: false, str: '0:00' },
            repeatB: { isActive: false, str: smfInfo.timeStringRepeatB },
            get interval () {
              const div = smfInfo.division
              const numra = smfInfo.beatInfo[0].numra
              const denom = smfInfo.beatInfo[0].denom
              let bartime = div
              let de = denom
              let d = 0
              while (de > 1){
                de /= 2
                d++
              }
              if (d >= 2) {
                bartime = (div >> (d - 2)) * numra
              } else {
                bartime = (div << (2 - d)) * numra
              }
              let isBeat3 = denom == 8 && numra > 3
              return bartime / (numra / (isBeat3 ? 3 : 1))
            }
          }
          this._volume = {
            master: this.volume.master,
            track: smfInfo.existTrack,
            volume: smfInfo.trackVolume
          }
          this._tempo = {
            default: smfInfo.tempo,
            current: smfInfo.tempo,
            userInput: smfInfo.tempo,
          }
          this._speed = 1,
          this._transpose = smfInfo.transpose
          if (status === 'play') {
            this.play()
          } else if (status === 'concertmagic') {
            this.setConcertMagic()
          } else {
            _setStatus(this)('stop')
            _emitStatus(this)(this._status)
          }
          resolve()
        }).catch ((error)=>{
          _setStatus(this)('error')
          _emitStatus(this)(this._status)
          reject(error)
        })
      } else {
        console.log('MusicClass select audio', path)
        KWM.selectAudioRecord(path).then((audioInfo)=> {
          this._selected = {
            ...musicObj,
            favorite: (this.favoriteSongs.findIndex(item => item.id === musicObj.id) !== -1) ? true : false,
          }
          this._time = {
            progress: null,
            current: { num: 0, str: '--:--' },
            total: { num: audioInfo.totalTime, str: audioInfo.totalTimeString },
            remaining: { num: audioInfo.totalTime, str: audioInfo.totalTimeString },
          }
          if (status === 'play') {
            this.play()
          } else {
            _setStatus(this)('stop')
            _emitStatus(this)(this._status)
          }
          resolve()
        }).catch ((error)=>{
          _setStatus(this)('error')
          _emitStatus(this)(this._status)
          reject(error)
        })
      }
    })
  }
  play() {
    if (this._status === 'loading') { return }
    if (!Object.keys(this._selected).length) { return }
    if (this._status !== 'stop') { this.stop() }
    if (!this._selected.isRecorded || this._selected.isRecorded && this._selected.isSaved) { this.addRecently(this._selected) }
    //!: onProgress で isPlaying を待つ
    // _setStatus(this)('play')
    _setStatus(this)('loading')
    _emitStatus(this)('loading')
    if (!this._selected.format || this._selected.format === 'smf1' || this._selected.format === 'smf0') {
      if (this._selected.isRecorded && this._selected.sound && !this._time.progress) {
        this.onSmfCallback(this._selected.sound)
        // this._timeoutId = setTimeout(()=>{KWM.playStartSmf(this._time.interval)}, 2000)
        this._timeoutId = setTimeout(()=>{appController.startPlaySmf(this._time.interval)}, 2000)
      } else {
        // KWM.playStartSmf(this._time.interval)
        appController.startPlaySmf(this._time.interval)
      }
    } else {
      KWM.playStartAudioRecord()
    }
    _emitStatus(this)(this._status)
  }
  stop() {
    if (this._status === 'play' || this._status === 'pause' ) {
      if (!this._selected.format || this._selected.format === 'smf1' || this._selected.format === 'smf0') {
        // KWM.playStopSmf()
        appController.stopPlaySmf()
        if (this._timeoutId) {
          clearTimeout(this._timeoutId)
          delete this._timeoutId
        }
      } else {
        KWM.playStopAudioRecord()
      }
      _setStatus(this)('stop')
      _emitStatus(this)(this._status)
    } else if (this._status === 'recstandby' || this._status === 'recording' ) {
      this._recorder.stop().then(()=>{
        this._selected = {
          id: undefined,
          name: undefined,
          format: this.recorder.settings.format,
          sound: this.recorder.settings.sound,
          recDevice: this.recorder.recDevice,
          recTime: this.recorder.recTime,
          isRecorded: true,
          isSaved: false,
        }
      }).catch((e)=>{ console.log(e) })
    } else if (this._status === 'concertmagic') {
      if (this.concertmagic.noteOnTrigger) { KWM.setConcertMagicNativeTrigger(false) }
      PIANO.set('LocalControl', {value: 'On'}, 'System')
      _setStatus(this)('stop')
      _emitStatus(this)(this._status)
      delete this.concertmagic
    }
  }
  next() {
    if (!this.nextSong) { return }
    const i = (this._repeat && this.queueIndex === this._queue.length - 1) ? 0 : this.queueIndex + 1
    this.select(this._queue[i])
  }
  previous() {
    if (this.time.current.num >= 3 || !this.previousSong) {
      this.time = 0
    } else {
      const i = (this._repeat && this.queueIndex === 0) ? this._queue.length - 1 : this.queueIndex - 1
      this.select(this._queue[i])
    }
  }
  record(mode, settings) {
    class Recorder {

      constructor(mode, settings, recStatusHandler) {
        this._mode = mode || 'midi'
        this._recDevice = PIANO.DeviceID
        this._recTime = undefined
        this._recStatusHandler = recStatusHandler
        this._settings = {}
        settings = settings || {}
        if (this._mode === 'midi' ) {
          this._settings.format = settings.format || 'smf1'
          this._settings.midiCh = settings.midiCh || 0
          this._settings.sound = settings.sound || undefined
          this._settings.soundRec = settings.soundRec || undefined
          this._settings.overdubTime = (!settings.overdub) ? 0 : (settings.overdubTime) ? settings.overdubTime ++ : 1
          KWM.setRecorderMode(true)
          if (settings.format) {
            const format = (settings.format === 'smf1') ? 1 : 0
            KWM.setRecordSmfFormat(format)
          }
          if (settings.midiCh) { KWM.setRecordSmfChannel(this._settings.midiCh) }
          KWM.setRecordOverdubbing(settings.overdub, false)
        } else if (this._mode === 'audio') {
          this._settings.format = settings.format || 'wav'
          this._settings.channel = settings.channel || 2
          this._settings.sampleRate = settings.sampleRate || 44100
          this._settings.bit = settings.bit || 16
          this._settings.monitoring = settings.monitoring || true
          const inputLevelFromDb = (db) => Math.pow(10, db / 20)
          this._settings.normalize = settings.normalize || false
          this._settings.overdubTime = (!settings.overdub) ? 0 : (settings.overdubTime) ? settings.overdubTime ++ : 1
          const attribute = (this._settings.format === 'aac') ? 'm4a' : this._settings.format
          KWM.setRecorderMode(false)
          KWM.setRecordAudioFormat(attribute, this._settings.sampleRate, this._settings.channel, this._settings.bit)
          KWM.setRecordAudioInputLevel(inputLevelFromDb(settings.inputLevel))
          KWM.setRecordAudioHeadphoneMonitoring(this._settings.monitoring)
          const audioOverdubbing = (settings.originalFormat === 'smf0' || settings.originalFormat === 'smf1' ) ? false : true
          KWM.setRecordOverdubbing(settings.overdub, audioOverdubbing)
          KWM.recordAudioInputStart()
        }

        const onRecStatus =(e)=> {
          if (e.status === 2) { this._recStatusHandler('recording') }
        }
        KWM.getRecordStatus(onRecStatus)
        this._recStatusHandler('recstandby')
        KWM.recordStandby()
      }

      get mode () {
        return this._mode
      }
      get settings () {
        return this._settings
      }
      get recDevice () {
        return this._recDevice
      }
      get recTime () {
        return this._recTime
      }

      start () {
        KWM.recordStart()
      }
      stop () {
        return new Promise ((resolve, reject)=> {
          this._recStatusHandler('inprogress')
          KWM.recordAudioInputStop()
          KWM.recordStop().then(()=> {
            const getCurrentTime =()=> {
              const date = new Date()
              const Y = date.getFullYear()
              const M = ("00" + (date.getMonth()+1)).slice(-2)
              const D = ("00" + date.getDate()).slice(-2)
              const h = ("00" + date.getHours()).slice(-2)
              const m = ("00" + date.getMinutes()).slice(-2)
              const s = ("00" + date.getSeconds()).slice(-2)
              return h + m + s + '_' + Y + M + D
            }
            this._recTime = getCurrentTime()
            this._recStatusHandler('stop')
            resolve()
          }).catch((e)=> {
            this._recStatusHandler('error')
            reject(e)
          })
        })
      }
      save (name) {
        return new Promise ((resolve, reject)=> {
          this._recStatusHandler('inprogress')
          KWM.saveRecord(name).then(()=>{
            this._recStatusHandler('stop')
            resolve()
          }).catch((e)=> {
            this._recStatusHandler('error')
            reject(e)
          })
        })
      }
      clear () {
        this._recDevice = undefined
        this._recTime = undefined
        KWM.clearRecord()
      }
      setSmfCallback (id) {
        if (this._mode !== 'midi' || !this._settings.soundRec) { return }
        KWM.setRecordSmfJson(id)
      }

    }
    const recStatusHandler =(status)=> {
      _setStatus(this)(status)
      _emitStatus(this)(this._status)
    }
    if (Object.keys(this._selected).length) {
      settings = { ...settings, overdub: true, originalFormat: this._selected.format }
    }
    if (this._status !== 'stop') { this.stop() }
    this._recorder = new Recorder(mode, settings, recStatusHandler)
  }
  setConcertMagic(settings) {

    class ConcertMagic {

      constructor(settings, onTrigger) {
        settings = settings || {}
        this._mode = settings.mode || 1
        this._smooth = settings.smooth || 1
        this._track = settings.track || 0
        this._noteOnTrigger = settings.noteOnTrigger || true
        KWM.setConcertMagicMode(this.mode, this.smooth, this.track)
        KWM.setConcertMagicNativeTrigger(this.noteOnTrigger)
        KWM.donePlayConcertMagic =(noteno, velocity, sec, success, cmr)=> {
          this.triggeredKey = noteno
          this.triggeredVelocity = velocity
          this.nextTriggerTime = sec
          this.evaluation = { success: Boolean(success), advice: ['OK', 'SLOW', 'FAST', 'TOOFAST', 'CHORD', 'NG'][cmr] }
          onTrigger({
            triggeredKey: this.triggeredKey,
            triggeredVelocity: this.triggeredVelocity,
            playTempo: this.playTempo,
            nextDeltaTime: this.nextDeltaTime,
            nextTriggerTime: this.nextTriggerTime,
            evaluation: this.evaluation
          })
        }
        PIANO.set('LocalControl', {value: 'Off'}, 'System')
      }

      get mode () {
        return this._mode
      }
      set mode (newVal) {
        this._mode = newVal
        KWM.setConcertMagicMode(newVal, this.smooth, this.track)
      }
      get smooth () {
        return this._smooth
      }
      set smooth (newVal) {
        this._smooth = newVal
        KWM.setConcertMagicMode(this.mode, newVal, this.track)
      }
      get track () {
        return this._track
      }
      set mode (newVal) {
        this._track = newVal
        KWM.setConcertMagicMode(this.mode, this.smooth, newVal)
      }
      get noteOnTrigger () {
        return this._noteOnTrigger
      }
      set noteOnTrigger (newVal) {
        this._noteOnTrigger = newVal
        KWM.setConcertMagicNativeTrigger(newVal)
      }

      trigger (velocity, keyNum) {
        const key = keyNum || 64
        const velo = velocity || 64
        KWM.playConcertMagic(key, velo)
      }

    }

    if (!Object.keys(this._selected).length) { return }
    if (this._status !== 'stop') { this.stop() }
    _setStatus(this)('concertmagic')
    const onTrigger =(e)=> { this.onConcertMagicEvent(e) }
    this.concertmagic = new ConcertMagic(settings, onTrigger)
    _emitStatus(this)(this._status)
  }
  async setRepeatA() {
    const result = await KWM.setSmfRepeatA(0)
    console.log(result)
    this._time = { ...this._time,
      repeatA: { isActive: result.repeatA, str: result.timeStringRepeatA },
      repeatB: { isActive: result.repeatB, str: result.timeStringRepeatB },
    }
  }
  async setRepeatB() {
    const result = await KWM.setSmfRepeatB()
    console.log(result)
    this._time = { ...this._time,
      repeatA: { isActive: result.repeatA, str: result.timeStringRepeatA },
      repeatB: { isActive: result.repeatB, str: result.timeStringRepeatB },
    }
  }
  addFavorite(musicObj) {
    const i = this.favoriteSongs.findIndex(item => item.id === musicObj.id)
    if (i === -1) {
      this.favoriteSongs.splice(0, 0, musicObj)
      if (musicObj.id === this._selected.id) { this._selected.favorite = true }
    } else {
      this.favoriteSongs.splice(i, 1)
      if (musicObj.id === this._selected.id) { this._selected.favorite = false }
    }
    this.saveFavorite()
  }
  clearFavorite() {
    this.favoriteSongs = []
    this.saveFavorite()
  }
  saveFavorite() {
    PRESET.PlayList[0].data = this.favoriteSongs
    DATABASE.saveUserSettings('FavoriteMusic')
  }
  addRecently(musicObj) {
    // const i = this._recently.findIndex(item => item.id === musicObj.id)
    // if (i > -1) { this._recently.splice(i, 1) }
    // this._recently.splice(0, 0, musicObj)
    // if (this._recently.length >= 30) { this._recently.splice(30, this._recently.length - 30) }
    const i = PRESET.PlayList[1].data.findIndex(item => item.id === musicObj.id)
    if (i > -1) { PRESET.PlayList[1].data.splice(i, 1) }
    PRESET.PlayList[1].data.splice(0, 0, musicObj)
    if (PRESET.PlayList[1].data.length >= 30) { PRESET.PlayList[1].data.splice(30, PRESET.PlayList[1].data.length - 30) }
    this.saveRecently()
  }
  clearRecently() {
    // this._recently = []
    PRESET.PlayList[1].data = []
    this.saveRecently()
  }
  saveRecently() {
    // PRESET.PlayList[1].data = this._recently
    DATABASE.saveUserSettings('RecentMusic')
  }
  save(name) {
    return new Promise ((resolve, reject)=> {
      if (this._selected.isRecorded) {
        if (this._selected.isSaved) { return }
        const filename = 'REC_' + this._selected.recTime
        const attribute = (this._selected.format === 'smf0' || this._selected.format === 'smf1') ? 'mid' : (this._selected.format === 'aac') ? 'm4a' : this._selected.format
        const obj = this._selected
        this._recorder.save(filename).then(()=> {
          obj.id = filename
          obj.name = (name) ? name : filename
          obj.attribute = attribute
          obj.isSaved = true
          this._recorded.push(obj)
          USER.PlayList[0].data = this._recorded
          KawaipianoJs.saveUserData()
          resolve()
        }).catch((e)=>{
          console.log(e)
          this._recorder.clear()
          resolve()
        })
      } else if (this._selected.isDownloaded) { resolve() }
    })
  }
  delete(musicObj) {
    return new Promise ((resolve, reject)=> {
      const onSuccess =()=> {
        const recordedIndex = this._recorded.findIndex(item => item.id === musicObj.id)
        if (recordedIndex > -1) {
          this._recorded.splice(recordedIndex, 1)
          USER.PlayList[0].data = this._recorded
          KawaipianoJs.saveUserData()
        }
        const queueIndex = this._queue.findIndex(item => item.id === musicObj.id)
        if (queueIndex > -1) {
          this._queue.splice(queueIndex, 1)
        }
        const favoriteIndex = this.favoriteSongs.findIndex(item => item.id === musicObj.id)
        if (favoriteIndex > -1) {
          this.favoriteSongs.splice(favoriteIndex, 1)
          this.saveFavorite()
        }
        // const recentlyIndex = this._recently.findIndex(item => item.id === musicObj.id)
        const recentlyIndex = PRESET.PlayList[1].data.findIndex(item => item.id === musicObj.id)
        if (recentlyIndex > -1) {
          // this._recently.splice(recentlyIndex, 1)
          PRESET.PlayList[1].data.splice(recentlyIndex, 1)
          this.saveRecently()
        }
        _setStatus(this)('stop')
        if (musicObj.id === this._selected.id) { this.init() }
        resolve()
      }
      const onError =(e)=> {
        _setStatus(this)('error')
        _emitStatus(this)(this._status)
        reject(e)
      }
      if (!musicObj.isRecorded) { reject('error: preset contents deletion') }
      if (this._status !== 'stop') { this.stop() }
      _setStatus(this)('inprogress')
      const path = musicObj.id + '.' + musicObj.attribute
      if (!musicObj.format || musicObj.format === 'smf0' || musicObj.format === 'smf1') {
        console.log('MusicClass delete smf', path)
        KWM.deleteSmf(path).then(()=> { onSuccess() }).catch ((error)=>{ onError(error) })
      } else {
        console.log('MusicClass delete audio', path)
        KWM.deleteAudioRecord(path).then(()=> { onSuccess() }).catch ((error)=>{ onError(error) })
      }
    })
  }
  deleteAll() {
    return new Promise ((resolve)=> {
      if (this._status !== 'stop') { this.stop() }
      _setStatus(this)('inprogress')
      const deleteMusicJsonData =()=>{
        this._recorded.length = 0
        USER.PlayList[0].data = this._recorded
        KawaipianoJs.saveUserData()
        this._queue = this._queue.filter(item => !item.isRecorded)
        this.favoriteSongs = this.favoriteSongs.filter(item => !item.isRecorded)
        this.saveFavorite()
        // this._recently = this._recently.filter(item => !item.isRecorded)
        PRESET.PlayList[1].data = PRESET.PlayList[1].data.filter(item => !item.isRecorded)
        this.saveRecently()
        this.init()
        resolve()
      }
      KWM.deleteAllRecord().then(()=>{ deleteMusicJsonData() }).catch(()=>{ deleteMusicJsonData() })
    })
  }
  rename(name, musicObj) {
    if (!musicObj.isRecorded) { reject('error: preset contents renaming') }
    if (musicObj.id === this._selected.id) {
      this._selected.name = name
    }
    const recordedIndex = this._recorded.findIndex(item => item.id === musicObj.id)
    if (recordedIndex > -1) {
      this._recorded[recordedIndex].name = name
      USER.PlayList[0].data = this._recorded
      KawaipianoJs.saveUserData()
    }
    const favoriteIndex = this.favoriteSongs.findIndex(item => item.id === musicObj.id)
    if (favoriteIndex > -1) {
      this.favoriteSongs[favoriteIndex].name = name
      this.saveFavorite()
    }
    // const recentlyIndex = this._recently.findIndex(item => item.id === musicObj.id)
    const recentlyIndex = PRESET.PlayList[1].data.findIndex(item => item.id === musicObj.id)
    if (recentlyIndex > -1) {
      // this._recently[recentlyIndex].name = name
      PRESET.PlayList[1].data[recentlyIndex].name = name
      this.saveRecently()
    }
  }
  openShare (musicObj, position) {
    const name = musicObj.name
    const path = musicObj.id + '.' + musicObj.attribute
    const x = (position) ? position.x : undefined
    const y = (position) ? position.y : undefined
    console.log('MusicClass openShare',name, path, x, y)
    KWM.openShareRecord(name, path, x, y)
  }
  closeShare () {
    KWM.closeShareRecord()
  }

  onStatusEvent(e) {}
  onProgressEvent(e) {}
  onPlaybackEvent(e) {}
  onTempoEvent(e) {}
  onConcertMagicEvent (e) {}
  onLevelEvent(e) {}
  onSmfCallback(id) {}

  addEventListener(event, callback) {
    if (event === 'status' ) {
      this.onStatusEvent = callback
    } else if (event === 'progress' ) {
      this.onProgressEvent = callback
    } else if (event === 'playback') {
      this.onPlaybackEvent = callback
    } else if (event === 'tempo' ) {
      this.onTempoEvent = callback
    } else if (event === 'beat' ) {
      KWM.onMetronomeEvent((obj)=>{ callback(obj.beatNo) })
    } else if (event === 'concertmagic' ) {
      this.onConcertMagicEvent = callback
    } else if (event === 'smfCallback' ) {
      this.onSmfCallback = callback
    } else if (event === 'audioLevel' ) {
      this.onLevelEvent = callback
    }
  }
}

const _setStatus = 
  (music) => 
  (status) => {
    console.log('music.setStatus: ', status)
    if (music._status === status) return
    music._status = status
  }

const _emitStatus = 
  (music) =>
  (status) => {
    console.log('music.emitStatus: ', status)
    music.onStatusEvent(status)
  }
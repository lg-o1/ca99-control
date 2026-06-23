"use strict"

////// UI  Version //////
const version = '1.3.11'
/////////////////////////

//Vue.js スクリプト
const popup = new Vue({
  el: '#popup',
  data: {
    isShown: false,
    type: null,
    bg: true,

    title: '',
    msg: '',
    trueBtnAccent: true,
    falseBtnAccent: false,
    trueBtnLabel: {off: 'OK', on:'OK'},
    falseBtnLabel: {off: 'Cancel', on:'Cancel'},
    trueCallback: '',
    falseCallback: '',
    textInput: '',
    textValidator: '',
    errorMsg: '',
    listData: [],
    img: '',
    busyNotify: true,
    busyTouchCounter: 0,
    // progressBar: {},
    updateChecker: false,
    updateCheckerCounter: 0,
  },
  computed: {
    originalTextInput: ()=> {
      // return false
      return mainVm.EmbeddedMode
    }
  },
  created: function () {
    this.loading()
  },
  methods: {
    info (title, msg, trueCallback, label, accentColor) {
      this.init()
      this.bg = true
      this.isShown = true
      this.type = 'info'
      this.title = msg ? title : ''
      this.msg = msg ? msg : title
      this.trueCallback = trueCallback
      this.trueBtnLabel = label ? {off: label, on:label} : {off: 'OK', on:'OK'}
      this.trueBtnAccent = accentColor ? true : false

    },
    confirm (title, msg, trueCallback, falseCallback, label, accentColor) {
      this.init()
      this.bg = true
      this.isShown = true
      this.type = 'confirm'
      this.title = msg ? title : ''
      this.msg = msg ? msg : title
      this.trueCallback = trueCallback
      this.falseCallback = falseCallback
      this.trueBtnLabel = label ? {off: label.true, on:label.true} : {off: 'OK', on:'OK'}
      this.falseBtnLabel =  label ? {off: label.false, on:label.false} : {off: 'Cancel', on:'Cancel'}
      if (accentColor) {
        this.trueBtnAccent = true
        this.falseBtnAccent = false
      } else {
        this.trueBtnAccent = false
        this.falseBtnAccent = true
      }
    },
    inputtext(title, initialText, trueCallback, falseCallback, label, validator) {
      this.init()
      this.bg = true
      this.isShown = true
      this.type = 'input'
      this.title = title
      this.textInput = initialText
      this.trueCallback = trueCallback
      this.falseCallback = falseCallback
      this.trueBtnLabel = label ? {off: label.true, on:label.true} : {off: 'OK', on:'OK'}
      this.falseBtnLabel =  label ? {off: label.false, on:label.false} : {off: 'Cancel', on:'Cancel'}
      this.trueBtnAccent = true
      this.falseBtnAccent = false
      this.textValidator = validator
      this.$nextTick(()=> {
        // 組込モードの時は勝田さんキーボードを表示し、アプリモードの場合はOSキーボードを表示
        if (this.originalTextInput) {
          TextKeyboard.open()
          TextKeyboard.inputStart()
        } else {
          this.$refs.textInput.focus()
        }
      })
    },
    inProgress (title, msg) {
      this.init()
      this.bg = true
      this.isShown = true
      this.type = 'inProgress'
      this.title = msg ? title : ''
      this.msg = msg ? msg : title
    },
    list (title, data, trueCallback, falseCallback, label) {
      this.init()
      this.bg = false
      this.isShown = true
      this.type = 'list'
      this.title = title
      this.listData = data
      this.trueCallback = trueCallback
      this.falseCallback = falseCallback
      this.trueBtnLabel = label ? label : undefined
    },
    overlay (msg, img, onTouch) {
      this.init()
      this.msg = msg
      this.img = img
      this.bg = false
      this.type = 'overlay'
      this.isShown = true
      this.trueCallback = onTouch
    },
    qr (msg) {
      this.init()
      this.msg = msg
      this.type = 'qr'
      this.isShown = true
      this.trueCallback = null
    },
    loading (msg) {
      if (this.type !== 'loading') {
        this.init()
        this.bg = false
        this.isShown = true
        this.type = 'loading'
      }
      this.msg = msg ? msg : ''
      // this.progressBar.determinate = false
    },
    busy (msg) {
      this.init()
      this.msg = msg
      this.bg = false
      this.type = 'busy'
      this.isShown = true
    },

    clickTrue (item) {
      if (this.type === 'input' && this.trueBtnAccent === false ) { return }
      this.isShown = false
      if (this.trueCallback) {
        let result
        if (this.type === 'input') {
          TextKeyboard.close()
          result = this.textInput
        } else if (this.type === 'list') {
          result = item
        }
        this.trueCallback(result)
      }
    },
    clickFalse () {
      this.isShown = false
      if (this.falseCallback) { this.falseCallback() }
    },
    onTouchPreventer() {
      this.busyTouchCounter ++
      if (this.busyTouchCounter > 1 ) {
        this.busyNotify = true
      }
    },
    onUpdatecheck() {
      this.updateCheckerCounter ++
      if (this.updateCheckerCounter === 10){
        this.updateCheckerCounter = 0
        const title = asset.messages.confirmCA49Update['title' + mainVm.webViewLang]
        const msg = asset.messages.confirmCA49Update['description' + mainVm.webViewLang]
        const label = asset.messages.confirmCA49Update['label' + mainVm.webViewLang]
        const okCallback =()=> { location.href='../../developper/ca49updater/html/index.html' }
        const cancelCallback =()=> { location.reload() }
        this.confirm(title, msg, okCallback, cancelCallback, label, true)
        this.updateChecker = false
      }
    },
    init () {
      // if (this.type === 'loading') { this.progressBar.close() }
      this.isShown = false
      this.type = null
      this.title = ''
      this.msg = ''
      this.trueBtnAccent = true
      this.falseBtnAccent = false,
      this.trueBtnLabel = {off: 'OK', on:'OK'}
      this.falseBtnLabel = {off: 'Cancel', on:'Cancel'}
      this.trueCallback = ''
      this.falseCallback = ''
      this.textInput = ''
      this.listData = []
      this.busyNotify = false
      this.busyTouchCounter = 0
    }

  },
  watch: {
    textInput: function (text) {
      if (!this.textValidator) { return }
      const validation = this.textValidator(text)
      this.errorMsg = validation.msg
      this.trueBtnAccent = validation.result
    }

  }
})

const mainVm = new Vue ({
  el: '#main',
  data: {
    initialized: false,
    Sync: false,
    DevelopperMode: false,
    EmbeddedMode: false,
    isLandscape: false,
    lang: '',
    webViewLang: '',
    NaviBarTitle: '',
    MenuButton: true,
    Tab: null,
    Metronome: false,
    Bg: false,
    isMultiRenderingTimbre: false,
    isRecBtnClicked: false,
    recBtnTimerId: null,
    vtWindow: false,
    CurrentSound: {
      id: '',
      name: '',
      rendering: true,
      favorite: false,
      availableParams: []
    },
    recentlySoundTimer: '',
    PianoTab: {
      scroll: 0,
      position: 0,
      startX: 0,
      moveX: 0,
      width: 0,
      swipeDist: 0,
      isStarted: false,
      isChanged: false,
      pages: null,
      pianoSelection: '',
      pianoSelectionList: [],
      variIndex: 0,
      variList: [],
      variMemory: [],
      rendering: true,
      shadow: true,
    },
    SoundsTab: {
      scrollX: 0,
      scrollY: 0,
      // reactHeight : {top: '162px'},
      reactOpacity : {opacity: '1.0'},
      listExpandable: false,
      soundGroup: 'Piano',
      timbreCategoryList: [],
      contents: [],
      categoryCard: [],
    },
    MusicTab: {
      listDirectory: 0,
      listBackTo: -1,
      listBackButton: false,
      categoryCard: [],
      category: [],
      selectedCategory: {},
      filter: '',
      contents: [],
      selected: '',
      player: false,
      // Test: USBメモリのリスト表示: kawa.: 2019.10.30
      isUsb: false, // 実験用
      isFileAdded: false, // 実験用
      testTimer: '',  // 実験用
      isESListHidden: true,
      isESListBack: false,
      curESPath: [],  // 階層付き表示用
      isESDirectory: [],  // 階層付き表示用
      esList: [],
    },
    Editor: {
      isShown: true,
      isOpen: false,
      isHidden: false,
      isPianoSelected: true,
      pianoVari: {
        idList: [],
        valueList: [],
        scondaryValueList: []
      },
      timbreMain: {},
      timbreSub: {},
      rendering: {},
      dualBalance: {},
      dualOctShift: {
        increbtn: true,
        decrebtn: true,
        clicked: false
      },
      dualDynamics: {},
      splitBalance: {},
      splitPoint: {
        clicked: false
      },
      splitOctShift: {
        clicked: false
      },
      splitPedal: {},
      vt: {
        index: 0
      },
      ambience: {
        isShown: false,
        expand: false,
      },
      ambienceDepth: {},
      reverb: {
        isShown: false,
        expand: false,
      },
      reverbType: {},
      reverbDepth: {},
      reverbTime: {},
      effect: {
        isShown: false,
        expand: false,
      },
      effectType: {},
      effectSetting1: {
        name: ''
      },
      effectSetting2: {
        name: ''
      },
      tuning : {
        clicked: false
      },
      transpose : {
        clicked: false
      },
      damperHold: {},
      menu: false,
      menuContents: []
    },
    ContentsMenu: {
      isShown: false,
      selected: null,
      contents: [],
    },
    Table: {
      ReverbTime: [
        [0, 6, 12, 19, 28, 32, 37, 41, 46, 50],
        [17, 20, 23, 27, 32, 34, 36, 38, 40, 42],
        [10, 16, 22, 30, 40, 44, 48, 52, 56, 60],
        [19, 24, 29, 34, 44, 50, 56, 64, 80, 104],
        [19, 23, 27, 32, 40, 44, 49, 54, 59, 70],
        [31, 34, 37, 40, 46, 63, 89, 99, 109, 119],
      ],
      Effect: [
        [3, 5, 11, 16, 21, 32, 43, 54, 64, 75], // Mono Delay
        [3, 11, 21, 32, 43, 48, 54, 64, 70, 75], // PingPong Delay
        [3, 11, 21, 43, 54, 56, 59, 64, 70, 75], // Triple Delay
        [2, 3, 4, 6, 8, 12, 16, 20, 28, 36], // Chorus
        [2, 3, 4, 5, 7, 10, 14, 18, 24, 31], // Classic Chorus
        [2, 3, 4, 6, 8, 12, 16, 20, 28, 36], // Ensemble
        [7, 17, 27, 37, 48, 54, 61, 68, 75, 82], // Tremolo
        [8, 21, 34, 47, 60, 68, 77, 85, 94, 103], // Classic Tremolo
        [0, 16, 32, 48, 64, 75, 85, 96, 112, 127], // Vibrato Tremolo
        [7, 17, 27, 37, 48, 54, 61, 68, 75, 82], // Tremolo+Amp
        [7, 17, 27, 37, 48, 54, 61, 68, 75, 82], // Auto Pan
        [7, 17, 27, 37, 48, 54, 61, 68, 75, 82], // Classic Auto Pan
        [7, 17, 27, 37, 48, 54, 61, 68, 75, 82], // Auto Pan+Amp
        [0, 1, 2, 3, 4, 6, 11, 17, 21, 26], // Phaser
        [0, 1, 2, 3, 4, 6, 11, 17, 21, 26], // Classic Phaser
        [7, 17, 27, 37, 48, 54, 61, 68, 75, 82], // Phaser+Auto Pan
        [0, 1, 2, 3, 4, 6, 11, 17, 21, 26], // Phaser+Amp
        [0, 1, 2, 3, 4, 6, 11, 17, 21, 26], // Phaser+Chorus
        [0, 16, 32, 48, 64, 75, 85, 96, 112, 127], // Rotary1
        [0, 16, 32, 48, 64, 75, 85, 96, 112, 127], // Rotary2
        [0, 16, 32, 48, 64, 75, 85, 96, 112, 127], // Rotary3
        [0, 16, 32, 48, 64, 75, 85, 96, 112, 127], // Rotary4
        [0, 16, 32, 48, 64, 75, 85, 96, 112, 127], // Rotary5
        [0, 16, 32, 48, 64, 75, 85, 96, 112, 127], // Rotary6
      ],
      DamperNoise: [0, 12, 25, 35, 42, 50, 60, 72, 86, 104, 127],
      FallbackNoise: [0, 12, 25, 35, 42, 50, 60, 72, 86, 104, 127],
      HammerNoise: [0, 26, 38, 46, 53, 60, 68, 77, 89, 104, 127],
      StringResonance: [0, 12, 25, 37, 50, 63, 75, 88, 101, 114, 127],
      UndampedStringResonance: [0, 12, 25, 37, 50, 63, 75, 88, 101, 114, 127],
      ReleaseTime: [-8, -6, -4, -2, 0, 2, 4, 6, 8, 10],
    },
    UiCache: {},
  },
  computed: {
    TouchCurvePreset: ()=> {
      const data = Object.assign (USER.TouchCurve, PRESET.TouchCurve)
      return data
    },
    isUsbMemoryAttached: ()=> {
      return statusVm.usb
    },
    tabbarLabel: ()=> {
      return asset.tabbar
    },
    editorLabel: ()=> {
      return asset.editor
    },
    buttonLabel: ()=> {
      return asset.buttonLabel
    },
    noUsbMemoryMessage: ()=> {
      return asset.messages.noUsbMemoryMessage
    },
    isAppUpdateAvailable: ()=> {
      if (this.EmbeddedMode || !KWM.localAppVersion) {
        return false
      } else {
        const versionTextHead = KWM.localAppVersion.substring(0, 3)
        return (versionTextHead === '1.0') ? true : false
      }
    },
    isSecondaryContentsBar: ()=> {
      if (!mainVm.CurrentSound.id) { return false }
      const recStatus = (mainVm.EmbeddedMode) ? recVm.isShown : musicVm.recWindow.isShown
      return mainVm.CurrentSound.secondary && !recStatus
    }
  },
  created: function () {

    // Kawaipiano.js起動
    const onUiUpdateStatus =(status)=> {
      const msgUpdateCheck = asset.messages.uiUpdateCheck['description' + this.webViewLang]
      const msgUpdating =  asset.messages.uiUpdating['description' + this.webViewLang]
      const msgCompleted = asset.messages.identifyPiano['description' + this.webViewLang]
      const msg =
          (this.EmbeddedMode) ? undefined
        : (status === 'update check') ? msgUpdateCheck
        : (status === 'downloading') ? msgUpdating
        : (status === 'updating') ? msgUpdating
        : msgCompleted
      popup.loading(msg)
      if (status === 'completed') { location.reload() }
    }
    const onLoadJson =(data)=> {
      console.log(data)
      if (!data.UiCache) {
        menuVm.initSettings()
        return
      }
      this.UiCache = data.UiCache
      if (Number.isFinite(this.UiCache.lcdContrast)) {
        if (this.UiCache.lcdContrast <= 0 || this.UiCache.lcdContrast > 100) { this.UiCache.lcdContrast = 100 }
      } else {
        this.UiCache.lcdContrast = 100
      }
    }
    const onConnectedPiano =(mode)=> {
      if　(mode.match(/FactoryMode/)) {
        location.href='../../developper/factorymode/html/index.html'
      } else if (mode.match(/DevelopperMode/)) {
        location.href='../../developper/dpupdatemode/html/index.html'
      } else if (mode.match(/DpTuningMode/)) {
        this.DevelopperMode = true
      }
    }
    const confirmBleUpdate =(onOk, onCancel)=> {
      const title = asset.messages.confirmBleUpdate['title' + this.webViewLang]
      const msg = asset.messages.confirmBleUpdate['description' + this.webViewLang]
      const label = asset.messages.confirmBleUpdate['label' + this.webViewLang]
      popup.confirm(title, msg, onOk, onCancel, label, true)
    }
    const onBleUpdateStatus =(status)=> {

      if (typeof status === 'number') { return }

      const msgUpdateCheck = asset.messages.bleUpdateCheck['description' + this.webViewLang]
      const msgUpdating = asset.messages.bleUpdating['description' + this.webViewLang]
      const msgCompleted = asset.messages.identifyPiano['description' + this.webViewLang]
      const msg =
          (this.EmbeddedMode) ? undefined
        : (status === 'update check') ? msgUpdateCheck
        : (status === 'downloading') ? msgUpdating
        : (status === 'updating') ? msgUpdating
        : (status === 'noupdate') ? msgCompleted
        : (status === 'completed') ? ''
        : msgCompleted
      popup.loading(msg)

      if (status === 'completed') {
        const title = asset.messages.completedBleUpdate['title' + this.webViewLang]
        const msg = asset.messages.completedBleUpdate['description' + this.webViewLang]
        const label = asset.messages.completedBleUpdate['label' + this.webViewLang]
        const okCallback =()=> { location.reload() }
        popup.info(title, msg, okCallback, label, true)
      }
    }
    const onIdentifiedPiano =()=> {
      const msg = (this.EmbeddedMode) ? undefined : asset.messages.syncPiano['description' + this.webViewLang]
      popup.loading(msg)
      if (Object.keys(this.UiCache).length) {
        if (!this.UiCache.bleMidiName) {this.UiCache.bleMidiName = PIANO.Model}
        if (PIANO.Model === 'CA9900GP' || PIANO.Model === 'SCA901') { this.UiCache.isGpDemo = true }
      }
    }
    const onUnsync =()=> {
      if (!this.EmbeddedMode) {
        this.showAppConnectionError()
      } else {
        this.showAppCoonnectedNotify()
      }
    }

    const option = {
      sync: 'full', // 'async', 'connect', 'identify', "full", 'demo'
      updateUi: true,
      updateBle: false,
      json: [ { path: 'user/uicache.json', name: 'UiCache' } ],
      forceSendItem: ['AutoPowerOff', 'WallEQ'],
      callback: {
        updatingUi: onUiUpdateStatus,
        onLoadJson: onLoadJson,
        connected: onConnectedPiano,
        confirmBleUpdate: confirmBleUpdate,
        updatingBle: onBleUpdateStatus,
        identified: onIdentifiedPiano,
        onUnsync: onUnsync,
      }
    }
    const successInvoke =()=> {
      // 画面スケール セット
      const scale = (this.EmbeddedMode) ? 1 : 0
      menuVm.selectViewportScale({ index: scale })
      // menuVm.setViewportScale (scale)
      // menuVm.ViewportDefaultScale = scale

      if (this.EmbeddedMode) {

        // BluetoothMIDIデバイス名 強制送信
        // if (this.UiCache.bleMidiName) {
        //   const name = this.UiCache.bleMidiName
        //   console.log('%c Force Send BluetoothMIDIName' + name, 'color: green')
        //   MIDI.OUT(DATABASE.getMidi('BluetoothMIDIName', {value: name}, 'System'))
        // }

        // 起動設定がデフォルト以外の場合、全てのパラメーターを送信
        if (USER.CacheMode !== 'init') {
          PIANO.set('All',  PIANO.Parameters, true)
        }

      } else {

        // MIDI通信終了時のUI再描画処理登録
        PIANO.onHandshakeEnd =()=> {
          if (this.Tab !== 2 && !vtVm.isShown) {
            this.init()
            if (menuVm.isShown) { menuVm.getParams() }
          } else if (vtVm.isShown) {
            vtVm.getUiParams()
            vtVm.getUserVtParams()
          }
        }

      }

      // ES520 version '0000'の場合、アップデート通知を表示
      if (PIANO.Model === 'ES520' && ['0000', '0000'].includes(PIANO.Version)) {
        this.showPianoUpdateNotify()
        return
      }

      // ATX AURES version 'V2.03 '以下の場合、アップデート通知を表示
      const isAtxAr = ['ATX4UP', 'AURES2UP', 'ATX4GP', 'AURES2GP'].includes(PIANO.Model)
      if (isAtxAr) {
        /*
        CA99 系のバージョニング命名規則
        CA99 系は 'Vx.xxx'
        末尾の少数第 3 位は、公式バージョンの場合スペース、βバージョンの場合 0 ~ 9 が入るため、先頭と末尾を除いた数値で比較
        CA901 系からセマンティックバージョニング
        */
        const version = parseFloat(PIANO.Version.substring(1, 5))
        if (version <= 2.03) {
          this.showPianoUpdateNotify()
          return
        }
      }

      // UI初期化
      this.init()
      // オートパワーオフの設定値を取得
      menuVm.getPowerOff()

      // ローディング画面解除
      setTimeout(()=>{
        this.Sync = true
        if (this.isAppUpdateAvailable && !this.EmbeddedMode) {
          this.showAppUpdateNotify()
        } else {
          popup.init()
        }
      }, 300)

    }
    const errorInvoke =(e)=> {
      console.groupEnd('起動シーケンス失敗')
      if (!this.EmbeddedMode) {
        if (e.type === 'NON_SUPPORTED_PIANO') {
          this.showNonSupportedPianoError()
        } else if (e.type === 'NEED_UPDATE_PIANO') {
          this.showPianoUpdateNotify()
        } else if (e.type === 'IDENTIFY_ERROR') {
          this.showPianoUpdateNotify()
        } else {
          this.showAppConnectionError()
        }
      } else {
        setTimeout(()=>{ location.reload() },3000)
      }
    }

    // 組込Androidモードチェック
    MIDI.addEventListener('ready', ()=>{
      // this.EmbeddedMode = true
      this.EmbeddedMode = (KWM.isEmbeddedMode) ? true: false
      console.log({EmbeddedModeCheckResult: this.EmbeddedMode})
      this.initialized = false
      KawaipianoJs.invoke(option).then(successInvoke).catch((e)=> errorInvoke(e))
    })

    MIDI.addEventListener('deviceState', ()=>{
      if (MIDI.API ==='KWMcore' && MIDI.bluetooth.window) { MIDI.bluetooth.window = false }
      if (MIDI.API ==='KWMcore') { location.reload() }  // MIDIクラスで対処したい
    })

    // WebViewの言語取得
    const langCode = (window.navigator.userLanguage || window.navigator.language || window.navigator.browserLanguage).substring(0, 2)
    this.webViewLang = (langCode == "ja") ? 'Ja' : (langCode == "zh") ? 'Zh' : ''
    const fontFamily = (this.webViewLang === 'Zh') ? "Roboto, 'Noto Sans SC', sans-serif" : "Roboto, 'Noto Sans JP', sans-serif"
    const root = document.querySelector(':root')
    root.style.setProperty('--CA-font-family', fontFamily)

    // 画面向き取得
    this.isLandscape = (window.orientation === 90 || window.orientation === -90) ? true : false
    window.addEventListener("orientationchange", ()=>{
      this.isLandscape = (window.orientation === 90 || window.orientation === -90) ? true : false
      if (this.Tab === 0) {
        setTimeout(() => {
          this.updatePianoSelection()
          this.setPianoUi()
        }, 50)
      } else if (this.Tab === 2) { cmagicAnimation.init() }
    })

    //フォアグラウンド時処理
    if (!this.EmbeddedMode) {
      document.addEventListener('visibilitychange', ()=>{
        if(document.visibilityState === 'visible' && this.Sync){
          PIANO.set('LocalControl', {value: PIANO.Parameters.System.LocalControl.value }, 'System', {forceSend: true})
        }
      })
    }
  },
  methods: {
    init () {
      // 言語取得
      if (this.EmbeddedMode && !this.initialized) {
        this.lang = (PIANO.Language === 'EN') ? '' : PIANO.Language.slice(0, 1) + PIANO.Language.slice(1).toLowerCase()
      } else if (!this.EmbeddedMode && !this.initialized) {
        const isNumber = (value) => { return ((typeof value === 'number') && (isFinite(value))) }
        const lang = (isNumber(this.UiCache.language)) ? this.UiCache.language : (this.webViewLang === '') ? 0 : (this.webViewLang === 'Ja') ? 1 : 2
        this.lang = (lang === 0) ? '' : (lang === 1) ? 'Ja' : 'Zh'
      }
      const fontFamily = (this.lang === 'Zh') ? "Roboto, 'Noto Sans SC', sans-serif" : "Roboto, 'Noto Sans JP', sans-serif"
      const root = document.querySelector(':root')
      root.style.setProperty('--CA-font-family', fontFamily)
      menuVm.getLanguage()

      // 各Vueモデル起動
      metroVm.KawaipianoJsSynced()
      if (this.EmbeddedMode) {
        recVm.KawaipianoJsSynced()
        playerVm.KawaipianoJsSynced()
      } else {
        musicVm.KawaipianoJsSynced()
      }
      vtVm.KawaipianoJsSynced()
      menuVm.KawaipianoJsSynced()
      statusVm.KawaipianoJsSynced()
      if (MIDI.API === 'KWMcore' && !this.EmbeddedMode) { musicVm.KawaipianoJsSynced() }

      this.getUiParams()

      this.initialized = true

      // タッチパネルの場合、デフォルトタブに応じてUI描画。アプリの場合、現在の音色設定に応じてタブを選択しUI描画。
      const tabIndex = (this.Tab) ? this.Tab : (this.UiCache.defaultTab) ? this.UiCache.defaultTab : 0
      this.selectTab(tabIndex)
    },
    setDemoMode () {
      console.log({UICache: this.UiCache, menuVmisGpDemo: menuVm.isGpDemo})
      this.initialized = false
      KawaipianoJs.invoke({
        sync: 'demo',
        json: [ { path: 'user/uicache.json', name: 'UiCache' } ],
        callback: {
          onLaodJson: (data)=> {
            console.log('DemoMode UI Cache Load', data)
            if (data.UiCache) { this.UiCache = data.UiCache }
          }
        }
      }).then(()=>{
        PIANO.Sync = false
        const initUi =()=> {
          console.log('【デモモード】  モデル:' + PIANO.Model + '  仕向地:' + PIANO.Destination.name)
          menuVm.isDemoMode = true
          this.init()
          popup.init()
          this.showDemoModeNotify()
        }
        if (this.UiCache.isGpDemo) {
          PIANO.set('Model','SCA901').then(()=>{ initUi() })
        } else {
          initUi()
        }
      })
    },
    showAppConnectionError () {
      const language = (this.lang === '') ?  this.webViewLang : this.lang
      const title = asset.messages.deviceError['title' + language]
      const msg = asset.messages.deviceError['description' + language]
      const label = asset.messages.deviceError['label' + language]
      const okCallback =()=> { menuVm.openBleConnect() }
      const cancelCallback =()=> { this.setDemoMode() }
      popup.confirm(title, msg, okCallback, cancelCallback, label, true)
    },
    showAppCoonnectedNotify () {
      const msg = asset.messages.appConnectNotify['description' + this.lang]
      const onTouch =()=> {
        PIANO.set('Sync', true, null, true)
        KawaipianoJs.allParamSync.request().then(()=>{ this.init() })
      }
      const img = '../img/APPConnect.png'
      popup.overlay(msg, img, onTouch)

      // MusicTab/Recorder Init
      this.$nextTick(()=> {
        if (PIANO.MusicMode === 'RecControl') {
          recVm.exitRecorder(true)
          if (PIANO.RecControl.Status === 'overdub') {
            recVm.overdubFileClear()
          }
        } else if (PIANO.MusicMode === 'Music') {
          if (this.EmbeddedMode) { playerVm.exitPlayer(true) }
        }
      })
    },
    showNonSupportedPianoError () {
      const title = asset.messages.noneSupportedModel['title' + this.webViewLang]
      const msg = asset.messages.noneSupportedModel['description' + this.webViewLang]
      const label = asset.messages.noneSupportedModel['label' + this.webViewLang]
      const okCallback =()=> { location.reload() }
      popup.info(title, msg, okCallback, label, true)
    },
    showPianoUpdateNotify () {
      const title = asset.messages.needFirmwareUpdate['title' + this.webViewLang]
      const msg = asset.messages.needFirmwareUpdate['description' + this.webViewLang]
      const label = asset.messages.needFirmwareUpdate['label' + this.webViewLang]
      const okCallback =()=> { location.reload() }
      popup.info(title, msg, okCallback, label, true)
      // CA49の場合、アップデート画面遷移用タッチエリアを表示
      for (const device of MIDI.DEVICES) {
        if (device.name.match('CA49')) {
          popup.updateChecker = true
        }
      }
    },
    showAppUpdateNotify () {
      const title = asset.messages.needAppUpdate['title' + this.webViewLang]
      const msg = asset.messages.needAppUpdate['description' + this.webViewLang]
      const label = asset.messages.needAppUpdate['label' + this.webViewLang]
      const okCallback =()=> { popup.init() }
      popup.info(title, msg, okCallback, label, true)
    },
    showPowerConsumptionNotify () {
      return new Promise((resolve) => {
        const title = asset.messages.powerConsumptionNotify['title' + this.lang]
        const msg = asset.messages.powerConsumptionNotify['description' + this.lang]
        popup.info(title, msg, resolve, null, true)
      })
    },
    showDemoModeNotify () {
      return new Promise((resolve) => {
        const title = (this.UiCache.isGpDemo) ? asset.messages.demoModeNotifyForSCA['title' + this.lang] : asset.messages.demoModeNotify['title' + this.lang]
        const msg = (this.UiCache.isGpDemo) ? asset.messages.demoModeNotifyForSCA['description' + this.lang] : asset.messages.demoModeNotify['description' + this.lang]
        popup.info(title, msg, resolve, null, true)
      })
    },

    // Data Binding
    getUiParams (item) {
      const renderingTimbre = PRESET.Timbre.filter(item => item.pianoParameter === 2 )
      const numOfRenderingTimbre = renderingTimbre.length
      this.isMultiRenderingTimbre = (numOfRenderingTimbre > 1) ? true : false

      if (!item) {
        // Sounds
        this.getCurrentSound()
        this.makePianoSelection()
        this.makeSoundGroup()
        this.getSoundsCategory()
        // Editor
        this.getVtPreset()
        this.getTimbreMain()
        this.getTimbreSub()
        this.getRendering()
        this.getDualBalance()
        this.getDualOctShift()
        this.getDualDynamics()
        this.getSplitBalance()
        this.getSplitPoint()
        this.getSplitOctShift()
        this.getSplitPedal()
        this.getAmbience()
        this.getAmbienceDepth()
        this.getReverb()
        this.getReverbType()
        this.getReverbTime()
        this.getReverbDepth()
        this.getEffect()
        this.getEffectType()
        this.getEffectSetting1()
        this.getEffectSetting2()
        this.getTuning()
        this.getTranspose()
      } else if (item === 'Editor') {
        this.getVtPreset()
        this.getTimbreMain()
        this.getTimbreSub()
        this.getRendering()
        this.getDualBalance()
        this.getDualOctShift()
        this.getDualDynamics()
        this.getSplitBalance()
        this.getSplitPoint()
        this.getSplitOctShift()
        this.getSplitPedal()
        this.getAmbience()
        this.getAmbienceDepth()
        this.getReverb()
        this.getReverbType()
        this.getReverbDepth()
        this.getReverbTime()
        this.getEffect()
        this.getEffectType()
        this.getEffectSetting1()
        this.getEffectSetting2()
        this.getTuning()
        this.getTranspose()
      }
    },

    // TABBAR UI EVENT
    selectTab (index) {
      if (index === this.Tab) { return }
      if (index !== undefined) { this.Tab = index }
      this.getCurrentSound()

      if (this.Tab === 0) { // PIANO Tab
        this.setPianoUi()
        this.Editor.isHidden = false
      } else if (this.Tab === 1) { // SOUNDS Tab
        this.setSoundsUi()
        this.Editor.isHidden = false
      } else if (this.Tab === 2) { // MUSIC Tab
        // トップページの場合、ナビバーテキストを非表示に
        if (this.MusicTab.listDirectory === 0) {
          this.NaviBarTitle = ''
        } else {
          this.NaviBarTitle = this.selectedCategory.name
        }
        // トップページカードデータ取得
        const card = this.getMusicCategory(PIANO.Model, PIANO.Destination.name)
        this.MusicTab = { ...this.MusicTab, categoryCard: card }
        this.getMusicCategoryCard()
        // タッチエリアセット
        this.Editor.isHidden = true
      }

      // 他のvm更新
      metroVm.SyncTab (this.Tab)
      if (this.EmbeddedMode) {
        if (['standby', 'recording', 'overdub'].includes(recVm.status)) this.Editor.isHidden = true
        recVm.SyncTab (this.Tab)
        playerVm.SyncTab (this.Tab)
      } else {
        if (['recstandby', 'recording'].includes(musicVm.m.status)) this.Editor.isHidden = true
        musicVm.SyncTab (this.Tab)
      }
    },
    onTapContentsBar (event) {
      if (event.x <= innerWidth * 3 / 4 ) {
        // コンテンツバータップ判定
        if (this.EmbeddedMode) {
          if (recVm.status === 'init' || recVm.status === 'stop') {
            this.openEditor()
          } else {
            recVm.openRecorder ()
          }
        } else {
          this.openEditor()
        }
      } else {
        // レコーダーボタンタップ判定
        if (this.EmbeddedMode) {
          if(this.isRecBtnClicked) {
            // ダブルタップ判定
            clearTimeout(this.recBtnTimer)
            recVm.openRecorder ()
            this.isRecBtnClicked = false
          } else {
            // シングルタップ判定
            this.isRecBtnClicked = true
            this.recBtnTimer = setTimeout (()=> {
              recVm.onRecBtnEvent()
              this.isRecBtnClicked = false
            }, 300)
          }
        } else {
          musicVm.onRecBtnEvent()
        }
      }
    },
    onTapEditorFooter (event) {
      if (this.CurrentSound.id && event.x <= innerWidth * 1 / 5 ) {
        this.setFavorite()
      } else if (!this.CurrentSound.id &&event.x >= innerWidth * 4 / 5) {
        this.saveSound()
      } else {
        this.closeEditor()
      }
    },

    // GLOBAL METHODS
    // Get sound obj from kawaipiano.js
    getCurrentSound () {
      const id = PIANO.get('Sound')
      const mainTimbre = PRESET.Timbre.find((item)=> { return item.id === PIANO.Parameters.Main1.Timbre.id })
      const currentSound = {
        id : id,
        name: null,
        secondary : null,
        rendering : (mainTimbre.pianoParameter === 2) ? true : false,
        favorite: PRESET.SoundPalette[4].data.includes(id),
        availableParams : mainTimbre.availableParams
      }
      if (!id) {
        currentSound.name = asset.contentsbar.notSaved['name' + this.lang]
      } else if (id.split('_')[0] === 'preset') {
        const soundObj = PRESET.Sound.find((item)=> { return item.id === id })
        const isPiano = ['SK-EX', 'EX', 'SK-5', 'Upright Piano'].includes(mainTimbre.category)
        const isSingle = (soundObj.data.Global.KeyboardMode === 0)
        if (isPiano && isSingle) {
          currentSound.name = soundObj['name' + this.lang]
          if (this.Tab ===1) {
            const categoryObj = this.PianoTab.pianoSelectionList.find((item)=> {return item.variIdList.includes(id)})
            currentSound.secondary = (categoryObj) ? categoryObj.name : soundObj['nameSecondary' + this.lang]
          }
        } else {
          currentSound.name = soundObj['name' + this.lang]
          currentSound.secondary = soundObj['nameSecondary' + this.lang]
        }
      } else {
        const soundObj = USER.Sound.find((item)=> { return item.id === id })
        currentSound.name = soundObj['name' + this.lang]
      }
      this.CurrentSound = { ...this.CurrentSound, ...currentSound }
    },
    // Add Recently Sound Category and Redraw UI
    addRecentlySound (waitTime) {
      clearInterval(this.recentlySoundTimer)
      this.recentlySoundTimer = setTimeout(()=> {
        if (!this.CurrentSound.id) { return }
        PIANO.set('Sound', 'Save')
        if (this.Tab === 1) {
          this.getSoundsCategoryCard()
          mainVm.$forceUpdate()
        }
      }, waitTime)
    },

    // UTILITY METHODS
    // Check if it's Piano
    isPiano(item) {
      const pianoKeyword = ['SK-EX', 'EX', 'SK-5', 'Upright Piano', 'Piano Style Collection', 'Piano']
      return pianoKeyword.includes (item)
    },
    // Divide Rendering Sound Name
    splitRenderingNameText (name) {
      const nameArray = name.split(' ')
      const arrange = nameArray.slice(-1)[0]
      const variant = name.replace (" " + arrange, "")
      return [variant, arrange]
    },
    // Get TimbreID from PC# obj
    getTimbreId (data) {
      const id = (data.id) ? data : PRESET.Timbre.filter((obj) => {return (obj.pc) === data.PC && (obj.msb) === data.MSB && (obj.lsb) === data.LSB })[0].id
      return id
    },

    // PIANO Tab
    makePianoSelection () {
      this.PianoTab.pianoSelectionList = []
      Object.keys(asset.pianoSelection).forEach ((key)=>{
        const name = (key === 'skexl') ? 'SK-EX Concert Grand' : asset.pianoSelection[key].name
        const filteredItem = PRESET.SoundPalette.filter(item => item.name === name)
        const data = [ ...filteredItem[0].data ]
        // 2つのSK-EXに分類
        if (key === 'skexl') {
          data.length = 0
          for (const item of PRESET.Sound) {
            if (item.tag.includes ('CompetitionGrand')) { data.push(item.id) }
          }
        } else if (key === 'skex') {
          data.length = 0
          for (const item of PRESET.Sound) {
            if (item.tag.includes ('ConcertGrand')) { data.push(item.id) }
          }
        }
        const isShown = (data.length) ? true : false

        const item = {
          isShown: isShown,
          name: asset.pianoSelection[key]['name' + this.lang],
          variIdList: [],
          variNameList: [],
          img: (this.EmbeddedMode) ? asset.pianoSelection[key].img : asset.pianoSelection[key].img_hr
        }
        for (const id of data) {
          const i = id.split('_')[1]
          item.variIdList.push(id)
          if (this.isMultiRenderingTimbre && PRESET.Timbre[i].pianoParameter === 2) {
            const names = this.splitRenderingNameText (PRESET.Timbre[i]['name' + this.lang])
            item.variNameList.push(names[0])
          } else {
            item.variNameList.push(PRESET.Timbre[i]['name' + this.lang])
          }
        }
        this.PianoTab.pianoSelectionList.push(item)
        this.PianoTab.variMemory.push(0)
      })
      const shownPiano = this.PianoTab.pianoSelectionList.filter(item => item.isShown)
      this.PianoTab.pages = shownPiano.length
    },
    async selectPiano (pianoNum, variNum, uiOnly) {
      const shownPiano = this.PianoTab.pianoSelectionList.filter(item => item.isShown)

      // 通信処理
      const id = shownPiano[pianoNum].variIdList[variNum]
      if (!uiOnly) {
        musicVm.recordSound(id)
        await PIANO.set('Sound', id)
        this.getTimbreMain()
      }

      // UI処理
      let list = []
      for (const id of PRESET.SoundPalette[pianoNum].data) {
        const i = id.split('_')[1]
        list.push(PRESET.Sound[i]['name' + this.lang])
      }

      const position = -(pianoNum * this.PianoTab.width)
      this.PianoTab = {...this.PianoTab,
        scroll: pianoNum,
        position,
        pianoSelection: shownPiano[pianoNum].name,
        variIndex: variNum,
        variList: shownPiano[pianoNum].variNameList,
      }
      this.PianoTab.variMemory[pianoNum]  = variNum
      this.NaviBarTitle = this.PianoTab.pianoSelection
      this.makePianoVariList()

      this.getCurrentSound()
      this.addRecentlySound(3000)

      Vue.nextTick(() => {
        this.updatePianoSelection()
      })
    },
    swipeStart (e) {
      const pageX = e.touches ? e.touches[0].pageX : e.pageX
      this.PianoTab.swipeDist = e.target.getClientRects()[0].width * 0.1
      this.PianoTab.isStarted = true
      this.PianoTab.width = this.$refs['piano-selection'].offsetWidth
      this.PianoTab.startX = pageX
    },
    swipeMove (e) {
      const pageX = e.touches ? e.touches[0].pageX : e.pageX
      const moveX = pageX - this.PianoTab.startX
      if (this.PianoTab.isStarted) {
        this.PianoTab.moveX = moveX
        this.$refs['piano-selection'].style.transitionDuration = "0ms"
        this.$refs['piano-selection'].style.transform = `translate3d(${ moveX + this.PianoTab.position }px, 0, 0)`
        if (Math.abs(moveX) > this.PianoTab.swipeDist) {
          this.PianoTab.shadow = false
          this.$refs['piano-selection'].style.opacity = 0.5
        }
      }
    },
    swipeEnd () {
      const isLeftEnd = () => { return this.PianoTab.scroll !== 0 }
      const isRightEnd = () => { return this.PianoTab.scroll !== this.PianoTab.pages - 1 }
      const isSwipe = () => { return Math.abs(this.PianoTab.moveX) > this.PianoTab.swipeDist }
      const isPrevSwipe = () => { return this.PianoTab.moveX > 100 && isLeftEnd() }
      const isNextSwipe = () => { return this.PianoTab.moveX < -100 && isRightEnd() }
      const isPrevTap = () => { return this.PianoTab.moveX === 0 && (this.PianoTab.width / 3) > this.PianoTab.startX && isLeftEnd() }
      const isNextTap = () => { return this.PianoTab.moveX === 0 && (this.PianoTab.width * 2 / 3) < this.PianoTab.startX && isRightEnd() }

      if (isPrevSwipe() || isPrevTap() || isNextSwipe() || isNextTap() || isSwipe()) {
        this.PianoTab.shadow = false
        this.$refs['piano-selection'].style.opacity = 0.5
      }
      setTimeout(() => {
        this.PianoTab.shadow = true
        this.$refs['piano-selection'].style.opacity = 1
      }, 400)

      if (isPrevSwipe() || isPrevTap()) {
        this.PianoTab.position = this.PianoTab.position + this.PianoTab.width
        this.PianoTab.scroll--
        this.PianoTab.isChanged = true
      } else if (isNextSwipe() || isNextTap()) {
        this.PianoTab.position = this.PianoTab.position - this.PianoTab.width
        this.PianoTab.scroll++
        this.PianoTab.isChanged = true
      }

      this.$refs['piano-selection'].style.transitionDuration = "400ms"
      this.$refs['piano-selection'].style.transform = `translate3d(${ this.PianoTab.position }px, 0, 0)`
      this.PianoTab.isStarted = false
      this.PianoTab.startX = 0
      this.PianoTab.moveX = 0
    },
    swipeTransitionEnd () {
      if (this.PianoTab.isChanged) {
        const pianoNum = this.PianoTab.scroll
        const variNum = this.PianoTab.variMemory[pianoNum]
        this.selectPiano(pianoNum, variNum)
        this.PianoTab.isChanged = false
      }
    },
    updatePianoSelection () {
      this.PianoTab.width = this.$refs['piano-selection'].offsetWidth
      this.PianoTab.position = -(this.PianoTab.width * this.PianoTab.scroll)
      this.$refs['piano-selection'].style.transitionDuration = "0ms"
      this.$refs['piano-selection'].style.transform = `translate3d(${ this.PianoTab.position }px, 0, 0)`
    },
    setPianoUi () {
      const isPiano = this.isPiano(PIANO.Parameters.Main1.Timbre.category)
      const isPSC = (PIANO.Parameters.Main1.Timbre.category === 'Piano Style Collection')
      if (!isPiano || isPSC ) {
        // MainTimbreがピアノ以外の場合、または島村専用ピアノ音色の場合、は一番目のピアノ音色に変更して、MIDI送信
        this.selectPiano (0, 0, false)
      } else {
        const isSingle = (mainVm.Editor.timbreSub.mode === 'Single')
        if (!isSingle) {
          // Dual/Splitの場合はSingleに戻した上で、音色判定
          this.setKeyboardMode(0)
          this.getCurrentSound()
        }
        // MainTimbreのPiano音色にマッチするpianoNum, variNumをセット、MIDI送信はしない
        const currentPiano = PRESET.Sound.find( item => item.data.Main1.Timbre === PIANO.Parameters.Main1.Timbre.id )
        const shownPiano = this.PianoTab.pianoSelectionList.filter(item => item.isShown)
        const pianoIndex = shownPiano.findIndex( item => item.variIdList.includes(currentPiano.id))
        const variIndex  = shownPiano[pianoIndex].variIdList.findIndex( item => item.includes(currentPiano.id))
        const pianoNum = (pianoIndex >= 0) ? pianoIndex : 0
        const variNum = (variIndex >= 0) ? variIndex : 0
        this.selectPiano (pianoNum, variNum, true)
      }
    },

    // SOUNDS Tab
    getSoundsCategory() {
      let card = []
      Object.keys(asset.soundsCategory).forEach((category)=>{
        const className = (this.EmbeddedMode) ? asset.soundsCategory[category].class : asset.soundsCategory[category].class + '--hr'
        const obj = {
          name: asset.soundsCategory[category]['name' + this.lang],
          isShown: true,
          class: className,
        }
        card.push(obj)
      })
      this.SoundsTab = { ...this.SoundsTab, categoryCard: card }
      this.getSoundsCategoryCard()

    },
    getSoundsCategoryCard () {
      const cards = [
        {i: 5, p: 6 }, // Reccomend
        {i: 2, p: 4 }, // Favorite
        {i: 3, p: 5 }, // Recently
        {i: 4, p: 10 }, // PianoStyleCollection
        {i: 9, p: 11 }, // Ensemble
        {i: 10, p: 12 }, // Historical
        {i: 11, p: 13 }, // Relax
        {i: 12, p: 14 }, // Holiday
        {i: 13, p: 15 }, // Party
        {i: 14, p: 16 } // Chillout
      ]
      for (const card of cards) {
        this.SoundsTab.categoryCard[card.i] = { ...this.SoundsTab.categoryCard[card.i], isShown: (PRESET.SoundPalette[card.p].data.length !== 0) }
      }

      // User
      this.SoundsTab.categoryCard[1] = { ...this.SoundsTab.categoryCard[1], isShown: (USER.SoundPalette[0].data.length !== 0) }
    },
    scrollSoundCategory (e) {
      const screenWidth = document.body.clientWidth
      const cardWidth = document.getElementsByClassName('sounds__card')[0].clientWidth + screenWidth * 0.04
      const scrollPosition = e.target.scrollLeft
      const scrollX = Math.ceil(scrollPosition / cardWidth * 10)/10
      if (this.SoundsTab.scrollX - scrollX > 0.7 || scrollX - this.SoundsTab.scrollX > 0.7) {
        this.SoundsTab = {...this.SoundsTab, scrollX : Math.ceil(scrollX)}
        this.makeSoundsList(this.SoundsTab.scrollX)
      }
      const category = this.SoundsTab.categoryCard.filter((obj) => { return obj.isShown })[this.SoundsTab.scrollX]
      this.NaviBarTitle = (this.lang === '') ? '' : category.name
    },
    tapSoundCategory (e) {
      const screenWidth = document.body.clientWidth
      const cardWidth = document.getElementsByClassName('sounds__card')[0].clientWidth + screenWidth * 0.04
      const tap = (e.pageX < screenWidth / 3) ? 'prev' : (e.pageX > screenWidth * 2/ 3) ? 'next' : 'none'
      const scrollPosition = (tap === 'next') ? cardWidth * (this.SoundsTab.scrollX + 1) : cardWidth * (this.SoundsTab.scrollX - 1)
      Vue.nextTick (()=>{
        document.getElementById('sounds-category').scrollTo({ left: scrollPosition, top: 0, behavior: 'smooth' })
      })
    },
    moveCategory (category) {
      if (!category) { return }
      if (category === 'all') { this.getSoundGroup() }
      this.getSoundsCategoryCard()
      const categoryName = asset.soundsCategory[category]['name' + this.lang]
      const visibleCategory = this.SoundsTab.categoryCard.filter((obj) => { return (obj.isShown) === true })
      const index = visibleCategory.findIndex((obj)=>{ return obj.name === categoryName })
      const categoryNum = (index >= 0) ? index : 0
      const name = visibleCategory[categoryNum].name
      if (this.Tab === 1) this.NaviBarTitle = (this.lang === '') ? '' : name

      // スクロール
      Vue.nextTick (()=>{
        if (!document.getElementsByClassName('sounds__card')[0]) { return }
        const cardWidth = document.getElementsByClassName('sounds__card')[0].clientWidth
        document.getElementById('sounds-category').scrollTo(cardWidth * index, 0)
        this.SoundsTab.scrollX = index
        this.makeSoundsList (categoryNum)
      })
    },
    scrollSoundList () {
      const scrollY = Math.floor(document.getElementById('sounds-list').scrollTop)
      if (this.SoundsTab.listExpandable) {
        let height = 162 - scrollY
        if ( height <= 0 ) { height = 0 }
        const objHeight = {top: height + 'px'}
        this.SoundsTab = {...this.SoundsTab, reactHeight : objHeight}

        let opacity = 1 - (scrollY / 108)
        if ( opacity <= 0 ) { opacity = 0 }
        const objOpacity = {opacity: opacity}
        this.SoundsTab = {...this.SoundsTab, reactOpacity : objOpacity}
      }
    },
    autoScroll () {
      document.getElementById('sounds-pallete').scrollTo(266, 0)
    },
    scrollSoundListReset () {
      document.getElementById('sounds-list').scrollTo(0, 0)
    },
    setListExpandable () {
      Vue.nextTick (()=>{
        const scrollHeight = document.getElementById('sounds-list').scrollHeight
        const visibleHeight = document.getElementById('sounds-list-expandable-area').clientHeight
        if (scrollHeight >= visibleHeight + 162) {
          this.SoundsTab.listExpandable = false //バギーなので停止
        }  else {
          this.SoundsTab.listExpandable = false
        }
      })
    },
    makeSoundGroup() {
      const obj = asset.timbreCategory
      Object.keys(asset.timbreCategory).forEach((category)=>{
        const matchedSound = PRESET.Sound.filter(item => item.category === asset.timbreCategory[category].name)
        if (matchedSound.length === 1) { this.SoundsTab.soundGroup = '' }
        if (!matchedSound.length && asset.timbreCategory[category].name !== 'Piano') { delete obj[category] }
      })
      this.SoundsTab = { ...this.SoundsTab, timbreCategoryList: obj }
    },
    getSoundGroup () {
      if (!this.CurrentSound.id) { return }
      if (this.CurrentSound.id.split('_')[0] === 'user') { return }
      let category = PRESET.Sound.filter (item => item.id === this.CurrentSound.id)[0].category
      if (this.isPiano(category)) { category = 'Piano' }
      if (this.SoundsTab.soundGroup === '') { category = '' }
      this.SoundsTab.soundGroup = category
    },
    selectSoundGroup (item) {
      this.SoundsTab.soundGroup = item
      this.makeSoundsList (0)
      // this.SoundsTab = {...this.SoundsTab, reactHeight : {top: '162px'}, reactOpacity : {opacity: '1.0'}}
    },
    makeSoundsList (index) {
      const category = this.SoundsTab.categoryCard.filter((obj) => { return obj.isShown })[index]
      this.SoundsTab.contents = []
      // リストに表示する音色ID配列の抽出
      const getSoundIdList =() => {
        if (category.name === asset.soundsCategory.all['name' + this.lang]) {
          // 音色カテゴリが必要かどうかの判定
          const isNeedSoundGroup =()=> {
            const objArray = Object.values(this.SoundsTab.timbreCategoryList)
            return objArray.some( item => item.name === this.SoundsTab.soundGroup )
          }
          const key = (isNeedSoundGroup()) ? this.SoundsTab.soundGroup : 'All'
          const idArray = []
          for (const item of PRESET.Sound) {
            if (key === 'Piano') {
              if (this.isPiano(item.category)) { idArray.push(item.id) }
            } else if (key === 'All') {
              const unshownCategory = ['MIDI', 'Ensemble', 'Historical', 'Relax', 'Hidden']
              if (!unshownCategory.includes (item.category)) {idArray.push(item.id) }
            } else if (key === item.category) {
              idArray.push(item.id)
            }
          }
          return idArray
        } else if (category.name === asset.soundsCategory.user['name' + this.lang]) {
          return USER.SoundPalette[0].data
        } else if (category.name === asset.soundsCategory.favorite['name' + this.lang]) {
          return PRESET.SoundPalette[4].data
        } else if (category.name === asset.soundsCategory.recently['name' + this.lang]) {
          return PRESET.SoundPalette[5].data
        } else if (category.name === asset.soundsCategory.reccomended['name' + this.lang]) {
          return PRESET.SoundPalette[6].data
        } else if (category.name === asset.soundsCategory.classic['name' + this.lang]) {
          return PRESET.SoundPalette[7].data
        } else if (category.name === asset.soundsCategory.jazz['name' + this.lang]) {
          return PRESET.SoundPalette[8].data
        } else if (category.name === asset.soundsCategory.pop['name' + this.lang]) {
          return PRESET.SoundPalette[9].data
        } else if (category.name === asset.soundsCategory.styleCollection['name' + this.lang]) {
          return PRESET.SoundPalette[10].data
        } else if (category.name === asset.soundsCategory.ensemble['name' + this.lang]) {
          return PRESET.SoundPalette[11].data
        } else if (category.name === asset.soundsCategory.histrical['name' + this.lang]) {
          return PRESET.SoundPalette[12].data
        } else if (category.name === asset.soundsCategory.relax['name' + this.lang]) {
          return PRESET.SoundPalette[13].data
        } else if (category.name === asset.soundsCategory.holiday['name' + this.lang]) {
          return PRESET.SoundPalette[14].data
        } else if (category.name === asset.soundsCategory.party['name' + this.lang]) {
          return PRESET.SoundPalette[15].data
        } else if (category.name === asset.soundsCategory.chillout['name' + this.lang]) {
          return PRESET.SoundPalette[16].data
        }
      }
      const soundIdList = getSoundIdList()

      // 音色ID配列からリスト表示用の音色情報をプッシュ
      for (const soundId of soundIdList) {
        const type = soundId.split('_')[0]
        const soundObjs = (type === 'preset') ? PRESET.Sound : USER.Sound
        const soundObj = soundObjs.find(item => item.id === soundId)
        if (!soundObj) { continue }

        const soundData = {
          id: soundObj.id,
          name: soundObj['name' + this.lang],
          secondary: soundObj['nameSecondary' + this.lang],
          availableParams: soundObj.availableParams
        }

        // ピアノ音色の場合、soundDataオブジェクトを改変
        if (['SK-EX', 'EX', 'SK-5', 'Upright Piano'].includes(soundObj.category)) {
          const categoryObj = this.PianoTab.pianoSelectionList.find((item)=> {return item.variIdList.includes(soundId)})
          if (!categoryObj) { continue }
          soundData.name = categoryObj.name
          soundData.secondary = soundObj['name' + this.lang]
        }

        // ユーザー音色の場合、リスト右側にメニューボタンを追加
        if (type === 'user') { soundData.iconR = 'KIF-option' }

        this.SoundsTab.contents.push (soundData)
      }

      this.setListExpandable ()
      this.scrollSoundListReset ()
    },
    async selectSound (item) {
      musicVm.recordSound(item.id)
      await PIANO.set ('Sound', item.id)
      this.getCurrentSound()
      if (item.id.split('_')[0] === 'preset') { this.getSoundGroup() }
      this.addRecentlySound(3000)
    },
    setSoundsUi () {
      const id = this.CurrentSound.id
      const soundInList = this.SoundsTab.contents.some( item => { return item.id === id })

      if (!soundInList) {
        if (id == null) {
          // カテゴリーを移動しない
          if (!this.SoundsTab.contents.length) {
            this.moveCategory('all')
          } else if (this.SoundsTab.scrollX) {
            const visibleCategory = this.SoundsTab.categoryCard.filter(obj => obj.isShown)
            const index = this.SoundsTab.scrollX
            const cardWidth = document.getElementsByClassName('sounds__card')[0].clientWidth
            document.getElementById('sounds-category').scrollTo(cardWidth * this.SoundsTab.scrollX, 0)
            this.NaviBarTitle = (this.lang === '') ? '' : visibleCategory[index].name
          } else {
            this.moveCategory('all')
          }
        } else if (id.split('_')[0] === 'user') {
          this.moveCategory('user')
        } else {
          this.moveCategory('all')
        }
      } else {
        const category = this.SoundsTab.categoryCard.filter((obj) => { return obj.isShown })[this.SoundsTab.scrollX]
        if (this.Tab === 1) this.NaviBarTitle = (this.lang === '') ? '' : category.name
        if (this.SoundsTab.scrollX) {
          const cardWidth = document.getElementsByClassName('sounds__card')[0].clientWidth
          document.getElementById('sounds-category').scrollTo(cardWidth * this.SoundsTab.scrollX, 0)
        }
        this.makeSoundsList(this.SoundsTab.scrollX)
      }
    },
    getTimbreName (part) {
      const timbreObj = PIANO.Parameters[part].Timbre
      const name = 'name' + this.lang
      const category = 'category' + this.lang
      const pianos = ['SK-EX', 'EX', 'SK-5', 'Upright Piano']
      const result = (timbreObj.name === 'SK-EX Rendering') ? timbreObj[name]
      : (pianos.includes (timbreObj.category)) ? timbreObj[category] + ' | ' + timbreObj[name]
      : timbreObj[name]
      return result
    },

    // MUSIC Tab
    getMusicCategory(model, dest) {
      let musicCategory = []
      Object.keys(asset.musicCategory).forEach((category)=>{
        const allModelAvailable = (asset.musicCategory[category].availableModel.length === 0) ? true : false
        const allDestAvailable = (asset.musicCategory[category].availableDest.length === 0) ? true : false
        const modelLimited = (asset.musicCategory[category].availableModel.includes(model)) ? true : false
        const destLimited = (asset.musicCategory[category].availableDest.includes(dest)) ? true : false

        if (allModelAvailable && allDestAvailable
        || modelLimited  && allDestAvailable
        || allModelAvailable && destLimited
        || modelLimited && destLimited) {
          const obj = {
            name: asset.musicCategory[category]['name' + this.lang],
            icon: asset.musicCategory[category].icon,
            bg: asset.musicCategory[category].bg,
            isShown: true,
            widebtn: asset.musicCategory[category].isWide,
          }
          musicCategory.push(obj)
        }
      })
      return musicCategory
    },
    getMusicCategoryCard () {
      // USBAudioPlayerCard
      const usbAudioIndex = this.MusicTab.categoryCard.findIndex(item=> item.name === asset.musicCategory.usb['name' + this.lang])
      this.MusicTab.categoryCard[usbAudioIndex] = { ...this.MusicTab.categoryCard[usbAudioIndex], isShown: this.EmbeddedMode }
      // FavoriteCard
      const favoriteAvailable = (PRESET.PlayList[0].data.length === 0) ? false : true
      const favoriteIndex = this.MusicTab.categoryCard.findIndex(item=> item.name === asset.musicCategory.favorite['name' + this.lang])
      this.MusicTab.categoryCard[favoriteIndex] = { ...this.MusicTab.categoryCard[favoriteIndex], isShown: favoriteAvailable }
      // RecentlyCard
      const recentlyAvailable = (PRESET.PlayList[1].data.length === 0) ? false : true
      const recentlyIndex = this.MusicTab.categoryCard.findIndex(item=> item.name === asset.musicCategory.recently['name' + this.lang])
      this.MusicTab.categoryCard[recentlyIndex] = { ...this.MusicTab.categoryCard[recentlyIndex], isShown: recentlyAvailable }
      // SoundDemoCard
      const soundDemo = PRESET.Music.filter((obj) => { return obj.sound })
      const demoAvailable = (soundDemo.length === 0) ? false : true
      const demoIndex = this.MusicTab.categoryCard.findIndex(item=> item.name === asset.musicCategory.sound['name' + this.lang])
      this.MusicTab.categoryCard[demoIndex] = { ...this.MusicTab.categoryCard[demoIndex], isShown: demoAvailable }
      // RecorderCard
      const isRecSongs =()=> {
        if (this.EmbeddedMode) {
          const result = (PIANO.RecControl.RecordedSongs.length !== 0) ? true : false
          return result
        } else {
          const result = (USER.PlayList[0].data.length !== 0) ? true : false
          return result
        }
      }
      const recorderAvailable = isRecSongs()
      const recorderIndex = this.MusicTab.categoryCard.findIndex(item=> item.name === asset.musicCategory.recorder['name' + this.lang])
      this.MusicTab.categoryCard[recorderIndex] = { ...this.MusicTab.categoryCard[recorderIndex], isShown: recorderAvailable }
      // HymnPlayerCard
      const hymnAvailable = menuVm.hymn.isOn
      const hymnIndex = this.MusicTab.categoryCard.findIndex(item=> item.name === asset.musicCategory.hymn['name' + this.lang])
      this.MusicTab.categoryCard[hymnIndex] = { ...this.MusicTab.categoryCard[hymnIndex], isShown: hymnAvailable }
    },
    selectMusicTopList (obj) {
      this.MusicTab = {...this.MusicTab, listBackTo : 0}
      this.selectedCategory = obj
      this.NaviBarTitle = obj.name
      this.MusicTab.contents = []
      let array = []
      if (obj.name === asset.musicCategory.favorite['name' + this.lang]) {
        this.MusicTab.contents = PRESET.PlayList[0].data
        this.MusicTab = {...this.MusicTab, listDirectory : 2}
      } else if (obj.name === asset.musicCategory.recently['name' + this.lang]) {
        let list = Array.from (PRESET.PlayList[1].data)
        this.MusicTab.contents = list
        this.MusicTab = {...this.MusicTab, listDirectory : 2}
      } else if (obj.name === asset.musicCategory.composer['name' + this.lang]) {
        for (const item of PRESET.Music) {if(item.composer){array.push(item.composer)}}
        this.MusicTab = {...this.MusicTab, listDirectory : 1, filter: 'composer'}
      } else if (obj.name === asset.musicCategory.lesson['name' + this.lang]) {
        for (const item of PRESET.Music) {if(item.scoreBook){array.push(item.scoreBook)}}
        this.MusicTab = {...this.MusicTab, listDirectory : 1, filter: 'scoreBook'}
      } else if (obj.name === asset.musicCategory.genre['name' + this.lang]) {
        for (const item of PRESET.Music) {if(item.genre && item.function !== 'hymn'){array.push(item.genre)}}
        this.MusicTab = {...this.MusicTab, listDirectory : 1, filter: 'genre'}
      } else if (obj.name === asset.musicCategory.sound['name' + this.lang]) {
        for (const item of PRESET.Music) {if(item.sound){array.push(item.sound)}}
        this.MusicTab = {...this.MusicTab, listDirectory : 1, filter: 'sound'}
        this.MusicTab.contents = []
        for (const item of PRESET.Music) {
          if (item.sound) {
            const content = {...item}
            content.name = item.sound
            if (item.composer) {
              content.secondary = item.composer + ' | ' + item.name
            } else {
              content.secondary = item.name
            }
            this.MusicTab.contents.push(content)
          }
        }
        this.MusicTab = {...this.MusicTab, listDirectory : 2, filter: 'sound'}
      } else if (obj.name === asset.musicCategory.recorder['name' + this.lang]) {
        if (this.EmbeddedMode) {
          this.MusicTab.contents = PIANO.RecControl.RecordedSongs
        } else {
          const list = Array.from (USER.PlayList[0].data)
          for (const item of list) {
            if (item.isRecorded) {
              const recTime = item.recTime.split('_')
              const y = recTime[1].slice(0, -4)
              const m = recTime[1].slice(4, -2)
              const d = recTime[1].slice(6)
              const time = recTime[0].slice( 0, -4 ) + ':' + recTime[0].slice( 2, -2 )
              const timeInfo = 'Recorded at ' + time + ' on ' + d + '/' + m + '/' + y
              const timeInfoJa = y + '/' + m + '/' + d + ' ' + time + ' に録音'
              item.iconR = 'KIF-option'
              item.secondary = (this.lang === 'Ja') ? timeInfoJa : timeInfo
            }
          }
          this.MusicTab.contents = list
          console.log(list)
        }
        this.MusicTab = {...this.MusicTab, listDirectory : 2}

      } else if (obj.name === asset.musicCategory.usb['name' + this.lang]) {
        this.MusicTab = {...this.MusicTab, esList: PIANO.ExternalStrage, listDirectory: 1, filter: '', isESListHidden: false, isESListBack: false}
      } else if (obj.name === asset.musicCategory.hymn['name' + this.lang]) {
        for (const item of PRESET.Music) { if (item.function === 'hymn') { array.push(item.genre) } }
        this.MusicTab = {...this.MusicTab, listDirectory : 1, filter: 'hymn'}
      } else if (obj.name === asset.musicCategory.relax['name' + this.lang]) {
        for (const item of PRESET.Music) { if (item.function === 'relax') { array.push(item.genre) } }
        this.MusicTab = {...this.MusicTab, listDirectory : 1, filter: 'relax'}
      }

      let resultArray = Array.from(new Set(array))
      this.MusicTab.category = []
      for (const item of resultArray) {
        this.MusicTab.category.push({name: item, iconR: 'KIF-navigate-next'})
      }
    },
    selectMusicCategoryList (filter) {
      this.MusicTab.contents = []
      for (const item of PRESET.Music) {
        if (this.MusicTab.filter === 'hymn') {
          if (item.genre === filter.name && item.function === 'hymn') { this.MusicTab.contents.push(item) }
        } else if (this.MusicTab.filter === 'relax') {
          if (item.genre === filter.name && item.function === 'relax') { this.MusicTab.contents.push(item) }
        } else {
          if (item[this.MusicTab.filter] === filter.name) {
            if (item.function === 'hymn') { continue }
            item.secondary = item.scoreBook ? item.scoreBook : item.composer
            this.MusicTab.contents.push(item)
          }
        }
      }
      document.getElementById('category-list').scrollIntoView(true)
      this.MusicTab = {...this.MusicTab, listBackTo : 1}
      this.MusicTab = {...this.MusicTab, listDirectory : 2}
    },
    selectMusic (item) {
      if (this.EmbeddedMode) {
        const queue = Array.from (this.MusicTab.contents)
        PIANO.set('Music', 'Queue', queue)
        PIANO.set('Music', 'Select', item).then (()=>{
          PIANO.set('Music', 'Play')
          if (item.inPiano) { recVm.exitRecorder(true) }
        }).catch(()=>{
          console.error('楽曲選択Promise関数エラー', item)
          return
        })
        this.MusicTab = {...this.MusicTab, player: true, selected: item.id}
        playerVm.isShown = true
        playerVm.getProgress()
        // touchVm.musicTouchArea = true
      } else {
        musicVm.m.queue = Array.from (this.MusicTab.contents)
        musicVm.m.select(item).then (()=>{
          if (musicVm.m.status !== 'play') { musicVm.m.play() }
          if (this.EmbeddedMode && item.inPiano) { recVm.exitRecorder(true) }
        }).catch(()=>{
          console.error('楽曲選択Promise関数エラー', item)
          return
        })
        this.MusicTab = {...this.MusicTab, player: true, selected: item.id}
        musicVm.isShown = true
      }
    },
    setListSelected (id) {
      if (!id) {
        id = (this.EmbeddedMode) ? PIANO.Music.Selected.id : musicVm.m.selected.id
      }
      this.MusicTab = {...this.MusicTab, selected: id}
    },
    selectESList (item) {
      const queue = Array.from (this.MusicTab.esList)
      this.MusicTab = { ...this.MusicTab, contents: queue }
      PIANO.set('Music', 'Queue', queue)
      PIANO.set('Music', 'Select', item).then(()=>{
        PIANO.set('Music', 'Play')
        if (item.inPiano) { recVm.exitRecorder(true) }
      }).catch(()=>{
        console.error('楽曲選択Promise関数エラー', item)
        return
      })
      this.MusicTab = {...this.MusicTab, player: true, selected: item.id}
      playerVm.isShown = true
      playerVm.getProgress()
      this.setBusy()
      return
      // Test: 階層付き表示用
      this.MusicTab.curESPath.push(item.name)
      let backTo = this.MusicTab.curESPath.length
      let directory = backTo + 1
      this.MusicTab = {...this.MusicTab, listBackTo: backTo, listDirectory: directory, isESListBack: false}
      return;
    },
    BackButtonEvent () {
      let backTo = this.MusicTab.listBackTo
      this.MusicTab = {...this.MusicTab, listDirectory: backTo, isESListBack: true}
      this.MusicTab.listBackTo = backTo -1

      // Test: USBメモリ内の現在の階層を1つ戻る（階層付き表示用: 最下層を削除）: kawa.: 2019.10.30
      this.MusicTab.curESPath.pop()

      if (this.MusicTab.listDirectory === 0) {
        this.selectedCategory = {}
        this.NaviBarTitle = ''
        this.MusicTab = {...this.MusicTab, filter: ''}
        this.getMusicCategoryCard()
        // USBメモリのファイルリストを非表示 + リスト表示用のリアクティブデータを空に
        this.MusicTab = {...this.MusicTab, esList: [], isESListHidden: true, curESPath: []}
      }
      if (this.MusicTab.listDirectory === 1) {
        document.getElementById('category-list').scrollIntoView(true)
      }
    },
    showTopPage() {
      this.MusicTab = {...this.MusicTab, listDirectory: 0, isESListBack: true}
      this.MusicTab.listBackTo = -1

      // Test: USBメモリ内の現在の階層を1つ戻る（階層付き表示用: 最下層を削除）: kawa.: 2019.10.30
      this.MusicTab.curESPath.pop()

      if (this.Tab === 2) { this.NaviBarTitle = '' }
      this.MusicTab = {...this.MusicTab, filter: ''}
      this.getMusicCategoryCard()
      // USBメモリのファイルリストを非表示 + リスト表示用のリアクティブデータを空に
      this.MusicTab = {...this.MusicTab, esList: [], isESListHidden: true, curESPath: []}
    },
    reloadList() {
      if (this.Tab === 2) {
        const currentList = this.NaviBarTitle
        this.selectMusicTopList({name: currentList})
      }
    },
    setBusy() {
      const msg = asset.messages.songLoading['description' + this.lang]
      popup.busy(msg)
      this.watchBusy()
    },
    watchBusy() {
      if (!PIANO.Music.isBusy) {
        if (popup.type === 'busy') { popup.init() }
      }　else {
        setTimeout(()=>{ this.watchBusy() }, 100)
      }
    },

    // Editor画面
    openEditor () {
      if (this.isRecBtnClicked) return
      this.getUiParams ('Editor')
      const isPiano = (this.Editor.timbreMain.category === this.SoundsTab.timbreCategoryList.piano['name' + this.lang]) ? true : false
      this.Editor = { ...this.Editor, isPianoSelected: isPiano }
      this.Bg = true
      this.Editor = {...this.Editor, isOpen : true}
    },
    closeEditor () {
      this.Editor = {...this.Editor, isOpen : false}
      this.Bg = false
      if (this.Tab === 0) {
        this.setPianoUi()
      } else if (this.Tab === 1) {
        this.setSoundsUi()
      }
    },
    getFavorite () {
      let fvt
      const index = PRESET.SoundPalette[4].data.findIndex(item => item === this.CurrentSound.id)
      if (index === -1) { fvt = false } else { fvt = true }
      this.CurrentSound = {...this.CurrentSound,
        favorite: fvt
      }
    },
    setFavorite () {
      PIANO.set('Sound', 'Favorite', this.CurrentSound.id)
      if (this.CurrentSound.favorite) {
        this.CurrentSound = { ...this.CurrentSound, favorite: false }
      } else {
        this.CurrentSound = { ...this.CurrentSound, favorite: true }
      }
      const favoriteAvailable = (PRESET.SoundPalette[4].data.length === 0) ? false : true
      this.SoundsTab.categoryCard[2] = { ...this.SoundsTab.categoryCard[2], isShown: favoriteAvailable }
    },
    saveSound() {
      const title = asset.messages.saveSound['title' + this.lang]
      const savedSound = USER.Sound.filter((item)=> { return item.isSaved})
      const lastId = (savedSound.length) ? savedSound.slice(-1)[0].id : undefined
      const lastIdNum = (lastId) ? Number(lastId.split('_')[1]) + 1 : 0

      const initName = 'Sound' + (lastIdNum + 1)
      const callback =(userinput)=> {
        console.log(userinput)
        PIANO.set('Sound', 'Save', userinput)
        this.getCurrentSound()
        this.addRecentlySound(3000)
      }
      const label = asset.messages.saveSound['label' + this.lang]
      const validator =(text)=> {
        const validation =
          (text.length === 0 ) ?  { result: false, msg: asset.messages.noNameInput['description' + this.lang] }
        : { result: true, msg: '' }
        return validation
      }
      popup.inputtext(title, initName, callback, null, label, validator)

    },

    // PianoVariation
    makePianoVariList () {
      const pianoVari = {
        idList : this.PianoTab.pianoSelectionList[this.PianoTab.scroll].variIdList,
        valueList : [],
        scondaryValueList : []
      }

      for (const id of pianoVari.idList) {
        const i = id.split('_')[1]
        const timbre = PRESET.Timbre[i]
        if (timbre.pianoParameter === 2 && this.isMultiRenderingTimbre) {
          const names = this.splitRenderingNameText(timbre['name' + this.lang])
          pianoVari.valueList.push(names[1])
          pianoVari.scondaryValueList.push(names[0])
        } else if (timbre.pianoParameter === 2  && !this.isMultiRenderingTimbre || timbre.category === 'Piano Style Collection') {
          pianoVari.valueList.push(timbre['name' + this.lang])
          pianoVari.scondaryValueList.push(null)
        } else {
          pianoVari.valueList.push(timbre['name' + this.lang])
          pianoVari.scondaryValueList.push(null)
        }
      }

      this.Editor.pianoVari = { ...this.Editor.pianoVari, ...pianoVari }
    },
    async selectPianoVari (item) {
      await this.selectPiano(this.PianoTab.scroll, item.index)
      this.getRendering()
      this.getVtPreset()
      this.getAmbience()
      this.getAmbienceDepth()
      this.getReverb()
      this.getReverbType()
      this.getReverbDepth()
      this.getReverbTime()
      this.getTuning()
      this.getTranspose()
    },
    getRendering () {
      const param = PIANO.get('RenderingCharacter')
      if (param) {
        const obj = { ...param.Main1 }
        obj.valueList = obj['valueList' + this.lang]
        this.Editor.rendering = { ...this.Editor.rendering, ...obj, isShown: true }
      } else {
        this.Editor.rendering = { ...this.Editor.rendering, isShown: false }
      }
    },
    selectRendering(item) {
      PIANO.set('RenderingCharacter', {value: item.index}, 'Main1')
      this.getRendering ()
      const fullObj = DATABASE.getPianoObj(DATABASE.getMidi('RenderingCharacter', {value: item.index}, 'Main1'))
      PIANO.set(fullObj.linkedParameter.parameter, {value: fullObj.linkedParameter.value}, 'Main1')
      this.selectAmbience({index: fullObj.linkedParameter2.value})
      this.getCurrentSound()
    },

    // Timbre
    makeTimbreList (category, part) {
      if (!category || !part) { return }

      const sound = {
        idList : [],
        valueList : [],
        scondaryValueList : []
      }

      // カテゴリーにマッチするTimbreの抽出
      const filteredTimbres = PRESET.Timbre.filter ((timbre)=> {
        if (this.isPiano(category)) {
          return this.isPiano(timbre.category)
        } else {
          return timbre.category === category
        }
      })

      // Timbreプロパティを改変しながらsoundオブジェクトにプッシュ
      for (const timbre of filteredTimbres) {
        const soundObj = PRESET.Sound.find((item) => {
          const data = item.data.Main1.Timbre
          const timbreId = (typeof data === 'object') ? this.getTimbreId(data) : data
          return timbreId === timbre.id
        })
        const categoryObj = this.PianoTab.pianoSelectionList.find((item) => { return item.variIdList.includes(soundObj.id) })
        if (this.isPiano(category) && part === 'main') {
          sound.idList.push( timbre.id )
          if (timbre.pianoParameter === 2 && this.isMultiRenderingTimbre) {
            const names = this.splitRenderingNameText(timbre['name' + this.lang])
            sound.valueList.push(names[1])
            sound.scondaryValueList.push(categoryObj.name + ' | ' + names[0])
          } else if (timbre.pianoParameter === 2  && !this.isMultiRenderingTimbre || timbre.category === 'Piano Style Collection') {
            sound.valueList.push(timbre['name' + this.lang])
            sound.scondaryValueList.push(null)
          } else {
            sound.valueList.push(timbre['name' + this.lang])
            sound.scondaryValueList.push(categoryObj.name)
          }
        } else if (this.isPiano(category) && ['sub', 'fourhandsR', 'fourhandsL'].includes(part)) {
          if (timbre.pianoParameter === 2) {
            // 追加しない
          } else if (timbre.category === 'Piano Style Collection') {
            sound.idList.push( timbre.id )
            sound.valueList.push(timbre['name' + this.lang])
            sound.scondaryValueList.push(null)
          } else {
            sound.idList.push( timbre.id )
            sound.valueList.push(timbre['name' + this.lang])
            sound.scondaryValueList.push(categoryObj.name)
          }
        } else {
          sound.idList.push( timbre.id )
          sound.valueList.push(timbre['name' + this.lang])
          sound.scondaryValueList.push(null)
        }
      }

      if (part === 'main') {
        this.Editor.timbreMain = { ...this.Editor.timbreMain, ...sound }
      } else if (part === 'sub') {
        this.Editor.timbreSub = {...this.Editor.timbreSub, ...sound}
      } else if (part === 'fourhandsR') {
        menuVm.timbreR = {...menuVm.timbreR, ...sound}
      } else if (part === 'fourhandsL') {
        menuVm.timbreL = {...menuVm.timbreL, ...sound}
      }
    },
    getTimbreMain () {
      const param = PIANO.get('Timbre')
      if (param) {
        const obj = { ...param.Main1 }
        this.makeTimbreList(obj.category, 'main')
        const i = this.Editor.timbreMain.idList.indexOf(obj.id)
        const sound = {
          value: i,
          category : obj['category' + this.lang],
          name : this.Editor.timbreMain.valueList[i],
          secondary : this.Editor.timbreMain.scondaryValueList[i]
        }
        if (this.isPiano(obj.category)) {
          sound.category = (this.lang === 'Ja') ? 'ピアノ' : (this.lang === 'Zh') ? '钢琴' : 'Piano'
        }
        this.Editor.timbreMain = { ...this.Editor.timbreMain, ...sound, isShown: true }
      } else {
        this.Editor.timbreMain = { ...this.Editor.timbreMain, isShown: false }
      }
    },
    selectTimbreCategoryMain (item) {
      const name = (item.name === 'Piano') ? 'SK-EX' : item.name
      this.makeTimbreList(name, 'main')
      this.selectTimbreMain({index: 0})
      this.openEditor()
    },
    selectTimbreMain (item) {
      const id = this.Editor.timbreMain.idList[item.index]
      PIANO.set ('Timbre', id, 'Main1')
      if (this.Editor.timbreSub.mode === 'Single') {
        PIANO.set ('Timbre', id, 'MIDI2ch')
      }
      this.getTimbreMain()
      this.getCurrentSound()
      // if (!mainVm.CurrentSound.rendering) { this.forceSendReverb() }
    },
    getTimbreSub () {
      const param = PIANO.get('KeyboardMode')
      if (param) {
        const m = param.Global
        const keyMode = (typeof m.value === 'number') ? ['Single', 'Dual', 'Split', '4Hands'][m.value] : m.value
        const obj =
            (keyMode === 'Dual') ? PIANO.get('Timbre').Layer
          : (keyMode === 'Split') ? PIANO.get('Timbre').Lower
          : undefined

        const sound = { mode: keyMode }
        if (obj) {
          this.makeTimbreList(obj.category, 'sub')
          const i = this.Editor.timbreSub.idList.indexOf(obj.id)
          sound.value = i
          sound.category = obj['category' + this.lang]
          sound.name = this.Editor.timbreSub.valueList[i]
          sound.secondary = this.Editor.timbreSub.scondaryValueList[i]
          if (this.isPiano(obj.category)) {
            sound.category = (this.lang === 'Ja') ? 'ピアノ' : (this.lang === 'Zh') ? '钢琴' : 'Piano'
          }
        }
        this.Editor.timbreSub = {...this.Editor.timbreSub, ...sound, isShown: true}
      } else {
        this.Editor.timbreSub = {...this.Editor.timbreSub,  isShown: false}
      }
    },
    selectTimbreCategorySub (item) {
      const name = (item.name === 'Piano') ? 'SK-EX' : item.name
      this.makeTimbreList(name, 'sub')
      this.selectTimbreSub({index: 0})
    },
    selectTimbreSub (item) {
      const id = this.Editor.timbreSub.idList[item.index]
      if (this.Editor.timbreSub.mode === 'Dual') {
        PIANO.set ('Timbre', id, 'Layer')
      } else if (this.Editor.timbreSub.mode === 'Split') {
        PIANO.set ('Timbre', id, 'Lower')
      }
      this.getCurrentSound()
      this.getTimbreSub()
    },
    setKeyboardMode (i) {
      PIANO.set('KeyboardMode', {value: i}, 'Global')
      const mainId = this.Editor.timbreMain.idList[this.Editor.timbreMain.value]
      PIANO.set ('Timbre', mainId, 'Main1')
      PIANO.set ('Timbre', mainId, 'MIDI2ch')
      if (this.Editor.timbreSub.value) {
        const subId = this.Editor.timbreSub.idList[this.Editor.timbreSub.value]
        if (this.Editor.timbreSub.mode === 'Dual') {
          PIANO.set ('Timbre', subId, 'Layer')
        } else if (this.Editor.timbreSub.mode === 'Split') {
          PIANO.set ('Timbre', subId, 'Lower')
        }
      }
      this.getCurrentSound()
      this.getTimbreSub ()
    },
    forceSendReverb () {
      // CA49等でリバーブを本体側で音色毎に記憶しているため、上書きするために強制送信が必要になった
      PIANO.set ('Reverb', PIANO.Parameters.Main1.Reverb.value, 'Main1', {forceSend: true})
      PIANO.set ('ReverbType', PIANO.Parameters.Main1.ReverbType.value, 'Main1', {forceSend: true})
      if (this.Editor.reverbTime.isShown) {
        PIANO.set ('ReverbTime', PIANO.Parameters.Main1.ReverbTime.value, 'Main1', {forceSend: true})
      }
      if (this.Editor.reverbDepth.isShown) {
        PIANO.set ('ReverbDepth', PIANO.Parameters.Main1.ReverbDepth.value, 'Main1', {forceSend: true})
      }
    },

    // dual parameters
    getDualBalance () {
      const param = PIANO.get('Balance')
      if (param) {
        const obj = { ...param.Layer }
        this.Editor.dualBalance = { ...this.Editor.dualBalance, ...obj, isShown: true }
      } else {
        this.Editor.dualBalance = { ...this.Editor.dualBalance, isShown: false }
      }
    },
    changeDualBalance (value) {
      PIANO.set('Balance', {value: Math.floor(value)}, 'Layer')
      this.getDualBalance ()
      this.getCurrentSound()
    },
    getDualOctShift () {
      const param = PIANO.get('OctaveShift')
      if (param) {
        const obj = { ...param.Layer }
        let incre
        let decre
        if (obj.value >= 2) { incre = false } else { incre = true }
        if (obj.value <= -2) { decre = false } else { decre = true }
        this.Editor.dualOctShift = { ...this.Editor.dualOctShift, ...obj, increbtn: incre, decrebtn: decre, isShown: true }
      } else {
        this.Editor.dualOctShift = { ...this.Editor.dualOctShift, isShown: false }
      }
    },
    incrementDualOctShift () {
      const i = this.Editor.dualOctShift.value + 1
      PIANO.set('OctaveShift', {value: i}, 'Layer')
      this.getDualOctShift ()
      this.getCurrentSound()
    },
    decrementDualOctShift () {
      const i = this.Editor.dualOctShift.value - 1
      PIANO.set('OctaveShift', {value: i}, 'Layer')
      this.getDualOctShift ()
      this.getCurrentSound()
    },
    resetDualOctShift () {
      if(this.Editor.dualOctShift.clicked) {
        PIANO.set('OctaveShift', {value: 0}, 'Layer')
        this.getDualOctShift ()
        this.getCurrentSound()
        this.Editor.dualOctShift = {...this.Editor.dualOctShift, clicked: false}
      } else {
        this.Editor.dualOctShift = {...this.Editor.dualOctShift, clicked: true}
        setTimeout (()=> {
          this.Editor.dualOctShift = {...this.Editor.dualOctShift, clicked: false}
        }, 300)
      }
    },
    getDualDynamics () {
      const param = PIANO.get('Dynamics')
      if (param) {
        const obj = { ...param.Layer }
        this.Editor.dualDynamics = { ...this.Editor.dualDynamics, ...obj, isShown: true }
      } else {
        this.Editor.dualDynamics = { ...this.Editor.dualDynamics, isShown: false }
      }
    },
    changeDualDynamics (value) {
      PIANO.set('Dynamics', {value: Math.floor(value)}, 'Layer')
      this.getDualDynamics ()
      this.getCurrentSound()
    },

    // split parameters
    getSplitBalance () {
      const param = PIANO.get('Balance')
      if (param) {
        const obj = { ...param.Lower }
        this.Editor.splitBalance = { ...this.Editor.splitBalance, ...obj, isShown: true }
      } else {
        this.Editor.splitBalance = { ...this.Editor.splitBalance, isShown: false }

      }
    },
    changeSplitBalance (value) {
      PIANO.set('Balance', {value: Math.floor(value)}, 'Lower')
      this.getSplitBalance ()
      this.getCurrentSound()
    },
    getSplitPoint () {
      const param = PIANO.get('SplitPoint')
      if (param) {
        const obj = { ...param.Lower }
        let incre
        let decre
        if (obj.value >= obj.valueMax) { incre = false } else { incre = true }
        if (obj.value <= obj.valueMin) { decre = false } else { decre = true }
        this.Editor.splitPoint = { ...this.Editor.splitPoint, ...obj, increbtn: incre, decrebtn: decre, isShown: true }
      } else {
        this.Editor.splitPoint = { ...this.Editor.splitPoint, isShown: false }
      }
    },
    incrementSplitPoint () {
      const value = this.Editor.splitPoint.value + 1
      const name = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][value % 12] + ( Math.floor ( (value / 12) - 1 ) )
      PIANO.set('SplitPoint', {value, name}, 'Lower')
      this.getSplitPoint ()
      this.getCurrentSound()
    },
    decrementSplitPoint () {
      const value = this.Editor.splitPoint.value - 1
      const name = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][value % 12] + ( Math.floor ( (value / 12) - 1 )　)
      PIANO.set('SplitPoint', {value, name}, 'Lower')
      this.getSplitPoint ()
      this.getCurrentSound()
    },
    resetSplitPoint () {
      if(this.Editor.splitPoint.clicked) {
        PIANO.set('SplitPoint', { value:60, name:'C4' }, 'Lower')
        this.getSplitPoint ()
        this.getCurrentSound()
        this.Editor.splitPoint = {...this.Editor.splitPoint, clicked: false}
      } else {
        this.Editor.splitPoint = {...this.Editor.splitPoint, clicked: true}
        setTimeout (()=> {
          this.Editor.splitPoint = {...this.Editor.splitPoint, clicked: false}
        }, 300)
      }
    },
    getSplitOctShift () {
      const param = PIANO.get('OctaveShift')
      if (param) {
        const obj = { ...param.Lower }
        let incre
        let decre
        if (obj.value >= 3) { incre = false } else { incre = true }
        if (obj.value <= 0) { decre = false } else { decre = true }
        this.Editor.splitOctShift = { ...this.Editor.splitOctShift, ...obj, increbtn: incre, decrebtn: decre, isShown: true }
      } else {
        this.Editor.splitOctShift = { ...this.Editor.splitOctShift, isShown: false }
      }
    },
    incrementSplitOctShift () {
      const i = this.Editor.splitOctShift.value + 1
      PIANO.set('OctaveShift', {value: i}, 'Lower')
      this.getSplitOctShift ()
      this.getCurrentSound()
    },
    decrementSplitOctShift () {
      const i = this.Editor.splitOctShift.value - 1
      PIANO.set('OctaveShift', {value: i}, 'Lower')
      this.getSplitOctShift ()
      this.getCurrentSound()
    },
    resetSplitOctShift () {
      if(this.Editor.splitOctShift.clicked) {
        PIANO.set('OctaveShift', {value: 0}, 'Lower')
        this.getSplitOctShift ()
        this.getCurrentSound()
        this.Editor.splitOctShift = {...this.Editor.splitOctShift, clicked: false}
      } else {
        this.Editor.splitOctShift = {...this.Editor.splitOctShift, clicked: true}
        setTimeout (()=> {
          this.Editor.splitOctShift = {...this.Editor.splitOctShift, clicked: false}
        }, 300)
      }
    },
    getSplitPedal () {
      const param = PIANO.get('LowerPedal')
      if (param) {
        const obj = { ...param.Global }
        const isOn = (obj.value === 'Off' || !obj.value) ? false : true
        const label = {
          on: asset.buttonLabel.on['name' + this.lang],
          off: asset.buttonLabel.off['name' + this.lang]
        }
        this.Editor.splitPedal = { ...this.Editor.splitPedal, isOn: isOn, label: label, isShown: true }
      } else {
        this.Editor.splitPedal = { ...this.Editor.splitPedal, isShown: false }
      }
    },
    onOffSplitPedal () {
      if (this.Editor.splitPedal.isOn) {
        PIANO.set('LowerPedal', {value: 'Off'}, 'Global')
      } else {
        PIANO.set('LowerPedal', {value: 'On'}, 'Global')
      }
      this.getSplitPedal ()
      this.getCurrentSound()
    },

    // Ambience
    getAmbience () {
      const param = PIANO.get('AmbienceType')
      if (param) {
        const obj = { ...param.Main1 }
        obj.valueList = obj['valueList' + this.lang]
        this.Editor.ambience = { ...this.Editor.ambience, ...obj, isShown: true }
      } else {
        this.Editor.ambience = { ...this.Editor.ambience, isShown: false }
      }
    },
    selectAmbience (item) {
      PIANO.set('AmbienceType', {value: item.index}, 'Main1')
      this.getAmbience ()
      const fullObj = DATABASE.getPianoObj(DATABASE.getMidi('AmbienceType', {value: item.index}, 'Main1'))
      this.changeAmbienceDepth(fullObj.linkedParameter.value)
    },
    getAmbienceDepth () {
      const param = PIANO.get('AmbienceDepth')
      if (param) {
        const obj = { ...param.Main1 }
        let isOn
        const label = {
          on: asset.buttonLabel.on['name' + this.lang],
          off: asset.buttonLabel.off['name' + this.lang]
        }
        if (obj.value === 0) { isOn = false } else { isOn = true }
        this.Editor.ambienceDepth = { ...this.Editor.ambienceDepth, ...obj, isOn: isOn, label: label, isShown: true }
      } else {
        this.Editor.ambienceDepth = { ...this.Editor.ambienceDepth, isShown: false }
      }
    },
    onOffAmbience () {
      if (this.Editor.ambienceDepth.isOn) {
        const val = this.Editor.ambienceDepth.value
        PIANO.set('AmbienceDepth', {value: 0}, 'Main1')
        this.getAmbienceDepth()
        this.Editor.ambienceDepth = {...this.Editor.ambienceDepth, isOn: false, origin: val}
      } else {
        let value
        if (this.Editor.ambienceDepth.origin) { value = this.Editor.ambienceDepth.origin} else { value = 64 }
        PIANO.set('AmbienceDepth', {value: value}, 'Main1')
        this.getAmbienceDepth()
        this.Editor.ambienceDepth = {...this.Editor.ambienceDepth, isOn: true}
      }
      this.getCurrentSound()
    },
    changeAmbienceDepth (value) {
      PIANO.set('AmbienceDepth', {value: value}, 'Main1')
      this.getAmbienceDepth ()
      this.getCurrentSound()
    },
    expandAmbienceCard() {
      if (this.Editor.ambience.expand) { this.Editor.ambience.expand = false } else { this.Editor.ambience.expand = true }
    },

    // Reverb
    getReverb () {
      const param = PIANO.get('Reverb')
      if (param) {
        const obj = { ...param.Main1 }
        const isOn = (obj.value === 'Off' || !obj.value) ? false : true
        const label = {
          on: asset.buttonLabel.on['name' + this.lang],
          off: asset.buttonLabel.off['name' + this.lang]
        }
        this.Editor.reverb = { ...this.Editor.reverb, ...obj, isOn: isOn, label: label, isShown: true }
      } else {
        this.Editor.reverb = { ...this.Editor.reverb, isShown: false }
      }
    },
    onOffReverb () {
      if (this.Editor.reverb.isOn) {
        PIANO.set('Reverb', {value: 'Off'}, 'Main1')
        this.getReverb()
      } else {
        PIANO.set('Reverb', {value: 'On'}, 'Main1')
        this.getReverb()
      }
      this.getCurrentSound()
    },
    getReverbType () {
      const param = PIANO.get('ReverbType')
      if (param) {
        const obj = { ...param.Main1 }
        obj.valueList = obj['valueList' + this.lang]
        this.Editor.reverbType = { ...this.Editor.reverbType, ...obj, isShown: true }
      } else {
        this.Editor.reverbType = { ...this.Editor.reverbType, isShown: false }
      }
    },
    selectReverbType (item) {
      PIANO.set('ReverbType', {value: item.index}, 'Main1')
      this.getReverbType ()
      if (!this.Editor.reverbDepth.isShown && !this.Editor.reverbTime.isShown) {
        this.getCurrentSound()
        return
      }
      const fullObj = DATABASE.getPianoObj(DATABASE.getMidi('ReverbType', {value: item.index}, 'Main1'))
      PIANO.set(fullObj.linkedParameter2.parameter, {value: fullObj.linkedParameter2.value}, 'Main1')
      this.getReverbTime()
      this.changeReverbDepth(fullObj.linkedParameter.value)
      this.getCurrentSound()
    },
    getReverbTime () {
      const param = PIANO.get('ReverbTime')
      if (param) {
        const obj = { ...param.Main1 }
        const array = this.Table.ReverbTime[this.Editor.reverbType.value]
        let d = 100
        let v = 0
        array.forEach ((value, index)=> {
          const diff = Math.abs(obj.value - value)
          if (d >= diff) {
            d = diff
            v = index
          }
        })
        this.Editor.reverbTime = { ...this.Editor.reverbTime, ...obj, uiValue: v, table: array, isShown: true }
      } else {
        this.Editor.reverbTime = { ...this.Editor.reverbTime, isShown: false }
      }
    },
    changeReverbTime (value) {
      const v = this.Editor.reverbTime.table[value]
      PIANO.set('ReverbTime', {value: v}, 'Main1')
      this.getReverbTime ()
      this.getCurrentSound()
    },
    getReverbDepth () {
      const param = PIANO.get('ReverbDepth')
      if (param) {
        const obj = { ...param.Main1 }
        this.Editor.reverbDepth = { ...this.Editor.reverbDepth, ...obj, isShown: true }
      } else {
        this.Editor.reverbDepth = { ...this.Editor.reverbDepth, isShown: false }
      }
    },
    changeReverbDepth (value) {
      PIANO.set('ReverbDepth', {value: value}, 'Main1')
      this.getReverbDepth ()
      this.getCurrentSound()
    },
    expandReverbCard () {
      if (this.Editor.reverb.expand) { this.Editor.reverb.expand = false } else { this.Editor.reverb.expand = true }
    },

    // Effect
    getEffect () {
      const param = PIANO.get('Effect')
      if (param) {
        const obj = { ...param.Main1 }
        const isOn = (obj.value === 'Off' || !obj.value) ? false : true
        const label = {
          on: asset.buttonLabel.on['name' + this.lang],
          off: asset.buttonLabel.off['name' + this.lang]
        }
        this.Editor.effect = { ...this.Editor.effect, ...obj, isOn: isOn, label: label, isShown: true }
      } else {
        this.Editor.effect = { ...this.Editor.effect, isShown: false }
      }
    },
    onOffEffect () {
      if (this.Editor.effect.isOn) {
        PIANO.set('Effect', {value: 'Off'}, 'Main1')
        this.getEffect()
      } else {
        PIANO.set('Effect', {value: 'On'}, 'Main1')
        this.getEffect()
      }
      this.getCurrentSound()
    },
    getEffectType () {
      const param = PIANO.get('EffectType')
      if (param) {
        const obj = { ...param.Main1 }
        const name = obj['subValueList' + this.lang][obj.value][obj.subValue]
        let itemList = []
        let valList = []
        for (let n = 0; n < obj.subValueList.length; n++) {
          for (let i = 0; i < obj.subValueList[n].length; i++) {
            itemList.push(obj['subValueList' + this.lang][n][i])
            valList.push([n, i])
          }
        }
        const index = itemList.findIndex  (item => item === name)
        this.Editor.effectType = { ...this.Editor.effectType, ...obj, index: index, itemList: itemList, valList: valList, isShown: true }
        this.getEffectSliderLabel()
        this.getEffectSetting1()
        this.getEffectSetting2()
      } else {
        this.Editor.effectType = { ...this.Editor.effectType, isShown: false }
      }
    },
    selectEffectType (item) {
      const val = this.Editor.effectType.valList[item.index]
      PIANO.set('EffectType', {value: val[0], subValue: val[1]}, 'Main1')
      this.getEffectType()
      if (!this.Editor.effectSetting1.isShown && !this.Editor.effectSetting2.isShown) {
        this.getCurrentSound()
        return
      }
      const fullObj = DATABASE.getPianoObj(DATABASE.getMidi('EffectType', {value: val[0], subValue: val[1]}, 'Main1'))
      this.changeEffectSetting1(fullObj.linkedParameter.value)
      PIANO.set(fullObj.linkedParameter2.parameter, {value: fullObj.linkedParameter2.value}, 'Main1')
      this.getEffectSetting2()
      this.getCurrentSound()
    },
    getEffectSetting1 () {
      const param = PIANO.get('EffectSetting1')
      if (param) {
        const obj = { ...param.Main1 }
        this.Editor.effectSetting1 = { ...this.Editor.effectSetting1, ...obj, isShown: true }
      } else {
        this.Editor.effectSetting1 = { ...this.Editor.effectSetting1, isShown: false }
      }
    },
    changeEffectSetting1 (value) {
      PIANO.set('EffectSetting1', {value: Math.floor(value)}, 'Main1')
      this.getEffectSetting1 ()
      this.getCurrentSound()
    },
    getEffectSetting2 () {
      const param = PIANO.get('EffectSetting2')
      if (param) {
        const obj = { ...param.Main1 }
        let index = 0
        for (let i = 0; i < this.Editor.effectType.value; i++) {
          index = index + this.Editor.effectType.subValueList[i].length
        }
        index += this.Editor.effectType.subValue
        const array = this.Table.Effect[index]
        let d = 100
        let v = 0
        array.forEach ((value, index)=> {
          const diff = Math.abs(obj.value - value)
          if (d >= diff) {
            d = diff
            v = index
          }
        })
        this.Editor.effectSetting2 = { ...this.Editor.effectSetting2, ...obj, uiValue: v, table: array, isShown: true }
      } else {
        this.Editor.effectSetting2 = { ...this.Editor.effectSetting2, isShown: false }
      }
    },
    changeEffectSetting2 (value) {
      const v = this.Editor.effectSetting2.table[value]
      PIANO.set('EffectSetting2', {value: v}, 'Main1')
      this.getEffectSetting2 ()
      this.getCurrentSound()
    },
    getEffectSliderLabel () {
      const v = this.Editor.effectType.value
      const sv = this.Editor.effectType.subValue
      let label1
      let label2
      if (v === 0) {
        label1 = asset.editor.dryWet['name' + this.lang]
        label2 = asset.editor.time['name' + this.lang]
      } else if (v === 1 && sv === 1) {
        label1 = asset.editor.monoStereo['name' + this.lang]
        label2 = asset.editor.speed['name' + this.lang]
      } else if (v === 8) {
        label1 = asset.editor.accel['name' + this.lang]
        label2 = asset.editor.rotary['name' + this.lang]
      } else {
        label1 = asset.editor.dryWet['name' + this.lang]
        label2 = asset.editor.speed['name' + this.lang]
      }
      this.Editor.effectSetting1 = {...this.Editor.effectSetting1, name: label1}
      this.Editor.effectSetting2 = {...this.Editor.effectSetting2, name: label2}
    },
    expandEffectCard () {
      if (this.Editor.effect.expand) { this.Editor.effect.expand = false } else { this.Editor.effect.expand = true }
    },

    // Tuning
    getTuning () {
      const param = PIANO.get('Tuning')
      if (param) {
        const obj = { ...param.System }
        let incre
        let decre
        if (obj.value >= obj.valueMax) { incre = false } else { incre = true }
        if (obj.value <= obj.valueMin) { decre = false } else { decre = true }
        this.Editor.tuning = { ...this.Editor.tuning, ...obj, increbtn: incre, decrebtn: decre, isShown: true }
      } else {
        this.Editor.tuning = { ...this.Editor.tuning, isShown: false }
      }
    },
    incrementTuning () {
      const i = this.Editor.tuning.value + 0.5
      PIANO.set('Tuning', {value: i}, 'System')
      this.getTuning ()
      this.getCurrentSound()
    },
    decrementTuning () {
      const i = this.Editor.tuning.value - 0.5
      PIANO.set('Tuning', {value: i}, 'System')
      this.getTuning ()
      this.getCurrentSound()
    },
    resetTuning () {
      if(this.Editor.tuning.clicked) {
        PIANO.set('Tuning', {value: 440}, 'System')
        this.getTuning ()
        this.Editor.tuning = {...this.Editor.tuning, clicked: false}
        this.getCurrentSound()
      } else {
        this.Editor.tuning = {...this.Editor.tuning, clicked: true}
        setTimeout (()=> {
          this.Editor.tuning = {...this.Editor.tuning, clicked: false}
        }, 300)
      }
    },

    // Transpose
    getTranspose () {
      const param = PIANO.get('TransposeValue')
      if (param) {
        const obj = { ...param.Global }
        let name
        if (obj.value >= 0) {
          name = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][obj.value % 12]
        } else if (obj.value < 0) {
          name = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][(24 + obj.value) % 12]
        }
        let incre
        let decre
        if (obj.value >= obj.valueMax) { incre = false } else { incre = true }
        if (obj.value <= obj.valueMin) { decre = false } else { decre = true }
        this.Editor.transpose = { ...this.Editor.transpose, ...obj, name: name, increbtn: incre, decrebtn: decre, isShown: true }
      } else {
        this.Editor.transpose = { ...this.Editor.transpose, isShown: false }
      }

    },
    incrementTranspose () {
      const i = this.Editor.transpose.value + 1
      PIANO.set('TransposeValue', {value: i}, 'Global')
      this.getTranspose ()
      this.getCurrentSound()
    },
    decrementTranspose () {
      const i = this.Editor.transpose.value - 1
      PIANO.set('TransposeValue', {value: i}, 'Global')
      this.getTranspose ()
      this.getCurrentSound()
    },
    resetTranspose () {
      if(this.Editor.transpose.clicked) {
        PIANO.set('TransposeValue', {value: 0}, 'Global')
        this.getTranspose ()
        this.Editor.transpose = {...this.Editor.transpose, clicked: false}
        this.getCurrentSound()
      } else {
        this.Editor.transpose = {...this.Editor.transpose, clicked: true}
        setTimeout (()=> {
          this.Editor.transpose = {...this.Editor.transpose, clicked: false}
        }, 300)
      }
    },

    // Virtual Technician
    getVtPreset () {
      let list = []
      for (const item of PRESET.VirtualTechnician) {
        list.push (item['name' + this.lang])
      }
      let index = PIANO.get('VirtualTechnician')
      if (index === undefined) {
        index = PRESET.VirtualTechnician.length
        PIANO.set('VirtualTechnician', 'Save')
      }
      if (USER.VirtualTechnician[0]) {
        list.push (USER.VirtualTechnician[0]['name' + this.lang])
      }
      this.Editor.vt = {...this.Editor.vt, index: index, valueList: list}
    },
    async selectVtPreset (item) {
      this.Editor.vt = {...this.Editor.vt, index: item.index}
      await PIANO.set ('VirtualTechnician', item.index)
      this.getCurrentSound()
    },
    openVtEditor () {
      vtVm.openVtEditor ()
      this.vtWindow = true
    },
    closeVtEditor () {
      this.getVtPreset()
      this.vtWindow = false
      this.getCurrentSound()
    },

    // Menu
    openMenu () {
      menuVm.openMenu()
    },
    closeMenu () {
      this.selectTab()
    },

    // ContentsMenu
    openUserSoundMenu (item) {
      const selected = this.SoundsTab.contents.find (obj=> obj.id === item)
      const contents = [
        { name: asset.contentsMenu.renameSound['name' + this.lang], item: asset.contentsMenu.renameSound.item, iconL: 'KIF-edit' },
        { name: asset.contentsMenu.deleteSound['name' + this.lang], item: asset.contentsMenu.deleteSound.item, iconL: 'KIF-delete' },
      ]
      this.ContentsMenu = { ...this.ContentsMenu, isShown: true, selected: selected, contents: contents }
    },
    openMusicMenu (item) {
      const selected = this.MusicTab.contents.find (obj=> obj.id === item)
      const contents = [
        { name: asset.contentsMenu.shareMusic['name' + this.lang], item: asset.contentsMenu.shareMusic.item, iconL: 'KIF-share' },
        { name: asset.contentsMenu.overdubMusic['name' + this.lang], item: asset.contentsMenu.overdubMusic.item, iconL: 'KIF-overdub' },
        { name: asset.contentsMenu.renameMusic['name' + this.lang], item: asset.contentsMenu.renameMusic.item, iconL: 'KIF-edit' },
        { name: asset.contentsMenu.deleteMusic['name' + this.lang], item: asset.contentsMenu.deleteMusic.item, iconL: 'KIF-delete' },
      ]
      this.ContentsMenu = { ...this.ContentsMenu, isShown: true, selected: selected, contents: contents }
    },
    closeContentsMenu () {
      this.ContentsMenu = { ...this.ContentsMenu, isShown: false, selected: null, contents: [] }
    },
    selectContentsMenu (obj) {
      const item = this.ContentsMenu.selected
      if (obj.item === 'renameSound') {
        const title = asset.messages.saveSound['title' + this.lang]
        const initName = item.name
        const okCallback =(userinput)=> {
          PIANO.set('Sound', 'Rename', item.id, userinput)
          if (this.CurrentSound.id === item.id) { this.CurrentSound.name = userinput }
          this.makeSoundsList(this.SoundsTab.scrollX)
          this.closeContentsMenu()
          KawaipianoJs.saveUserData()
        }
        const cancelCallback =()=> {}
        const label = asset.messages.saveSound['label' + this.lang]
        const validator =(text)=> {
          const validation =
            (!text || text.length === 0 ) ? { result: false, msg: asset.messages.noNameInput['description' + this.lang] }
          : { result: true, msg: '' }
          return validation
        }
        popup.inputtext(title, initName, okCallback, cancelCallback, label, validator)

      } else if(obj.item === 'deleteSound') {
        const title = asset.contentsMenu.confirmDeleteSoundTitle['name' + this.lang]
        const msg = asset.contentsMenu.confirmDeleteSound['name' + this.lang]
        const okCallback =()=> {
          PIANO.set('Sound', 'Delete', item.id)
          const index = this.SoundsTab.contents.findIndex(obj => obj.id === item.id)
          if(index >= 0) { this.SoundsTab.contents.splice(index, 1) }
          this.getSoundsCategoryCard()
          this.getCurrentSound()
          if (this.CurrentSound.id) {
            this.makeSoundsList(this.SoundsTab.scrollX)
          } else {
            this.setSoundsUi()
          }
          this.closeContentsMenu()
          KawaipianoJs.saveUserData()
        }
        const cancelCallback =()=> {}
        const label = {
          true: asset.buttonLabel.delete['name' + this.lang],
          false: asset.buttonLabel.cancel['name' + this.lang]
        }
        popup.confirm(title, msg, okCallback, cancelCallback, label, false)
      } else if(obj.item === 'shareMusic') {
        musicVm.m.openShare(item, {x: 0.5, y: 1})
      } else if (obj.item === 'overdubMusic') {
        this.closeContentsMenu()
        if (musicVm.m.status === 'play') { musicVm.m.stop() }
        musicVm.m.select(item).then (()=>{
          const mode = (item.format === 'smf0' || item.format === 'smf1') ? 'midi' : 'audio'
          const format = (item.format === 'smf0' || item.format === 'smf1') ? 'smf1' : item.format
          const soundRec = false
          const sound = item.sound
          const recSettings = { ...musicVm.recSettings, format, soundRec, sound }
          musicVm.m.record(mode, recSettings)
          this.selectTab(1)
          musicVm.openRecorder()
        })
      } else if (obj.item === 'renameMusic') {
        const title = asset.messages.saveRecorder['title' + this.lang]
        const initName = item.name
        const okCallback =(userinput)=> {
          musicVm.m.rename(userinput, item)
          mainVm.reloadList()
          this.closeContentsMenu()
        }
        const cancelCallback =()=> {}
        const label = asset.messages.saveRecorder['label' + this.lang]
        const validator =(text)=> {
          const validation =
            (text.length === 0 ) ? { result: false, msg: asset.messages.noNameInput['description' + this.lang] }
          : { result: true, msg: '' }
          return validation
        }
        popup.inputtext(title, initName, okCallback, cancelCallback, label, validator)
      } else if (obj.item === 'deleteMusic') {
        const title = asset.contentsMenu.confirmDeleteMusicTitle['name' + this.lang]
        const msg = asset.contentsMenu.confirmDeleteMusic['name' + this.lang]
        const okCallback =()=> {
          musicVm.m.delete(item).then(()=>{
            mainVm.reloadList()
            this.closeContentsMenu()
          })
        }
        const cancelCallback =()=> {}
        const label = {
          true: asset.buttonLabel.delete['name' + this.lang],
          false: asset.buttonLabel.cancel['name' + this.lang]
        }
        popup.confirm(title, msg, okCallback, cancelCallback, label, false)
      }
    },

  },
})

const metroVm = new Vue ({
  el: '#metronome',
  data: {
    r: {},
    tab: 0,
    isShown: false,
    isPianoControl: false,
    mode: 'Metronome',
    beatLabel: '♩ =',
    increBtn: true,
    decreBtn: true,
    nextTempoMarkingBtn: true,
    prevTempoMarkingBtn: true,
    volumeCache: null,
    pattern: {
      beat: '4/4',
      category: '8 Beat',
      name: '8Beat1',
      v4: '0x00'
    },
    counter: {},
    indicatorWidth: 'calc(1200% / 4)',
    metroList: [
      {name: "1/4"},
      {name: "2/4"},
      {name: "3/4"},
      {name: "4/4"},
      {name: "5/4"},
      {name: "3/8"},
      {name: "6/8"},
      {name: "7/8"},
      {name: "9/8"},
      {name: "12/8"},
    ],
    categoryList: [],
    rhythmList: [],
    tempoMarking: null,
    tempoMarkingArray: [],
    tempoMarkings: [
      {
        name: 'Grave',
        min: 10,
        max: 45
      },
      {
        name: 'Largo',
        min: 46,
        max: 51
      },
      {
        name: 'Lento',
        min: 52,
        max: 55
      },
      {
        name: 'Larghetto',
        min: 56,
        max: 59
      },
      {
        name: 'Adagio',
        min: 60,
        max: 65
      },
      {
        name: 'Adagietto',
        min: 66,
        max: 71
      },
      {
        name: 'Andante',
        min: 72,
        max: 79
      },
      {
        name: 'Andantino',
        min: 80,
        max: 87
      },
      {
        name: 'Maestoso',
        min: 88,
        max: 95
      },
      {
        name: 'Moderato',
        min: 96,
        max: 107
      },
      {
        name: 'Allegretto',
        min: 108,
        max: 119
      },
      {
        name: 'Animato',
        min: 120,
        max: 131
      },
      {
        name: 'Allegro',
        min: 132,
        max: 159
      },
      {
        name: 'Vivace',
        min: 160,
        max: 183
      },
      {
        name: 'Presto',
        min: 184,
        max: 191
      },
      {
        name: 'Vivacissimo',
        min: 192,
        max: 207
      },
      {
        name: 'Prestissimo',
        min: 208,
        max: 400
      },
    ],
    isTouchStart: false,
    touchMoveLastTime: undefined,
    touchStartPosition: { x: undefined, y: undefined },
    gestureType: undefined,
    swipeX: 0,
    swipeY: 0,
    chordDictionary: false,
    isMusicActive: false,
    beatEventListenerId: null,
  },
  computed: {
    lang: ()=> {
      return mainVm.lang
    },
    rhythmTab: ()=> {
      return asset.rhythmTab
    },
    isSecondary: ()=> {
      return mainVm.isSecondaryContentsBar
    }
  },
  methods: {
    KawaipianoJsSynced () {
      this.r = new Rhythm ()
      this.r.mute = !this.r.play

      if (this.r.isPianoControl) {
        let list = {
          rE: [],
          rER: [],
          rS: [],
          rEB: [],
          rSB: [],
          rSD: [],
          rSS: [],
          rES: [],
          rTr: [],
          rJz: [],
          rLT: [],
        }
        let list2 = []
        for (const item of DATABASE.Rhythm) {
          list2.push (item['category' + this.lang])
          if (item.category === '8 Beat') {
            list.rE.push({category: item['category' + this.lang], name: item['name' + this.lang], v4: item.v4, beat: item.beat})
          } else if (item.category === '8 Beat Rock') {
            list.rER.push({category: item['category' + this.lang], name: item['name' + this.lang], v4: item.v4, beat: item.beat})
          } else if (item.category === '16 Beat') {
            list.rS.push({category: item['category' + this.lang], name: item['name' + this.lang], v4: item.v4, beat: item.beat})
          } else if (item.category === '8 Beat Ballad') {
            list.rEB.push({category: item['category' + this.lang], name: item['name' + this.lang], v4: item.v4, beat: item.beat})
          } else if (item.category === '16 Beat Ballad') {
            list.rSB.push({category: item['category' + this.lang], name: item['name' + this.lang], v4: item.v4, beat: item.beat})
          } else if (item.category === '16 Beat Dance') {
            list.rSD.push({category: item['category' + this.lang], name: item['name' + this.lang], v4: item.v4, beat: item.beat})
          } else if (item.category === '16 Beat Swing') {
            list.rSS.push({category: item['category' + this.lang], name: item['name' + this.lang], v4: item.v4, beat: item.beat})
          } else if (item.category === '8 Beat Swing') {
            list.rES.push({category: item['category' + this.lang], name: item['name' + this.lang], v4: item.v4, beat: item.beat})
          } else if (item.category === 'Triplet') {
            list.rTr.push({category: item['category' + this.lang], name: item['name' + this.lang], v4: item.v4, beat: item.beat})
          } else if (item.category === 'Jazz') {
            list.rJz.push({category: item['category' + this.lang], name: item['name' + this.lang], v4: item.v4, beat: item.beat})
          } else if (item.category === 'Latin/Traditional') {
            list.rLT.push({category: item['category' + this.lang], name: item['name' + this.lang], v4: item.v4, beat: item.beat})
          }
        }
        this.rhythmList = list
        this.categoryList = Array.from(new Set(list2))
      }
      this.volumeCache = this.r.volume.value
    },
    SyncTab (i) {
      const isStateChange = (this.tab === 0 && i === 1 || this.tab === 1 && i === 0 ) ? false : true
      this.tab = i

      if (!isStateChange || this.isMusicActive) { return }

      if (i === 2) {
        this.r.play = false
        this.r.mute = true
        if (mainVm.EmbeddedMode) {
          playerVm.setMetroVol(playerVm.metroVol)
        } else {
          musicVm.setMetroVol(musicVm.metroVol)
        }
      }

      if (musicVm.playerWindow.mode === 'lesson' || playerVm.mode === 'Lesson') {
        this.r.mute = !this.r.mute
      }
    },
    openMetroWindow () {
      this.drawTempoUi()
      if (this.r.mode !== 'Rhythm') {
        this.drawBeatUi()
      } else {
        this.getPattern ()
      }
      this.isShown = true
      mainVm.Metronome = true
      touchVm.metroTouchArea = true
      if (this.r.isPianoControl) {
        PIANO.onBeatEvent =(event)=> { this.animateBeatIndicator(event) }
      } else {
        this.beatEventListenerId = this.r.addEventListener('beat', (event)=> {
          this.animateBeatIndicator({ count: Number(event.beatNo) + 1, type: 'mute' })
        })
      }
    },
    closeMetroWindow () {
      this.isShown = false
      mainVm.Metronome = false
      touchVm.metroTouchArea = false
      if (this.r.isPianoControl) {
        PIANO.onBeatEvent =()=> { }
      } else {
        this.r.removeEventListener(this.beatEventListenerId)
      }
    },
    playMetro (isOn) {
      this.r.volume = this.volumeCache
      if (isOn) {
        this.openMetroWindow ()
      } else {
        this.counter = { ...this.counter, count: 0 }
      }
      this.r.mute = !isOn
      this.r.play = isOn
    },
    selectMode (mode) {
      this.r.mode = mode
      if (mode === 'Metronome') {
        this.drawBeatUi()
      } else {
        this.getPattern ()
      }
    },
    drawTempoUi () {
      if (this.r.tempo.value <= 10) { this.decreBtn = false } else { this.decreBtn = true }
      if (this.r.tempo.value >= 400) { this.increBtn = false } else { this.increBtn = true }

      this.tempoMarkingArray = []
      for (let i = 0; i < this.tempoMarkings.length; i++) {
        const item = this.tempoMarkings[i]
        this.tempoMarkingArray.push (item.name)
        if (item.min <= this.r.tempo.value && item.max >= this.r.tempo.value) { this.tempoMarking = i }
      }
    },
    onTempoTouchArea (event) {
      const touchSupport = Boolean(window.ontouchstart === null)
      const isTouchEvent = 'touches' in event
      if (touchSupport !== isTouchEvent) { return }

      const touchtype =
        (event.type === 'touchstart' || event.type === 'mousedown') ? 'start' :
        (event.type === 'touchmove' || event.type === 'mousemove') ? 'move' :
        (event.type === 'touchend' || event.type === 'mouseup') ? 'end' : undefined

      const touchdata =
        (event.type === 'touchstart' || event.type === 'touchmove') ? { x: event.touches[0].clientX, y: event.touches[0].clientY } :
        (event.type === 'mousedown' || event.type === 'mousemove') ? { x: event.clientX, y: event.clientY } : { x: undefined, y: undefined }

      if (touchtype === 'start') {
        this.isTouchStart = true
        this.touchStartPosition = { ...this.touchStartPosition, ...touchdata }
        this.touchMoveLastTime = undefined

        // シングルタップ判定
        if (this.touchStartPosition.y < innerHeight * 0.4 - 114) {
          if (this.touchStartPosition.x <= 60 ) {
            this.gestureType = 'tap'
            this.decreTempo ()
          } else if (this.touchStartPosition.x >= innerWidth - 60 ) {
            this.gestureType = 'tap'
            this.increTempo ()
          }
        } else {
          if (this.touchStartPosition.x <= 120 ) {
            this.gestureType = 'tap'
            this.prevTempoMarking ()
          } else if (this.touchStartPosition.x >= innerWidth - 120 ) {
            this.gestureType = 'tap'
            this.nextTempoMarking ()
          }
        }
      } else if (touchtype === 'move') {
        if (!this.isTouchStart || this.gestureType === 'tap') { return }

        // イベント発生量制限
        let now = new Date().getTime()
        if (this.touchMoveLastTime && now - this.touchMoveLastTime < 30) { return }
        this.touchMoveLastTime = now

        // 感度調整
        let x = Math.floor( (touchdata.x - this.touchStartPosition.x) / 6 )
        let y = Math.floor( (this.touchStartPosition.y - touchdata.y) / 3 )
        if (isNaN(x)) { x = 0 }
        if (isNaN(y)) { y = 0 }

        //上下スワイプ判定
        if (Math.abs(y) > 10 && this.gestureType !== 'swipeX') {
          this.gestureType = 'swipeY'
          if (this.swipeY === y) { return }
          if (y - this.swipeY > 0 ) {
            if (this.r.tempo.value <= 390) {
              this.r.tempo = this.r.tempo.value  + 10
              this.drawTempoUi()
            }
          } else {
            if (this.r.tempo.value >= 20) {
              this.r.tempo = this.r.tempo.value  - 10
              this.drawTempoUi()
            }
          }
          this.swipeY = y
        }

        //左右スワイプ判定
        if (Math.abs(x) > 5 && this.gestureType !== 'swipeY') {
          this.gestureType = 'swipeX'
          if (this.swipeX === x) { return }
          if (x - this.swipeX > 0 ) {
            this.increTempo()
          } else {
            this.decreTempo()
          }
          this.swipeX = x
        }

      } else {
        // タッチエンド・キャンセル処理
        this.touchStartPosition = { ...this.touchStartPosition, x: undefined, y:undefined }
        this.gestureType = undefined
        this.isTouchStart = false
      }

    },
    increTempo () {
      if (this.increBtn) {
        this.r.tempo = this.r.tempo.value  + 1
        this.drawTempoUi()
      }
    },
    decreTempo () {
      if (this.decreBtn) {
        this.r.tempo = this.r.tempo.value  - 1
        this.drawTempoUi()
      }
    },
    nextTempoMarking () {
      if (this.r.tempo.value < this.tempoMarkings[this.tempoMarkings.length - 1].min) {
        const tempo = this.tempoMarkings[this.tempoMarking + 1].min
        this.r.tempo = tempo
        this.drawTempoUi()
      }
    },
    prevTempoMarking () {
      if (this.r.tempo.value >= this.tempoMarkings[0].max) {
        const tempo = this.tempoMarkings[this.tempoMarking - 1].min
        this.r.tempo = tempo
        this.drawTempoUi()
      }
    },
    changeVolume (value) {
      const v = Math.floor(value)
      this.r.volume = v
      this.volumeCache = v
    },
    drawBeatUi () {
      if (Number(this.r.beat.split('/')[1]) === 4) {
        this.beatLabel = '♩ ='
      } else {
        // this.beatLabel = '♪ ='
      }
      this.indicatorWidth = 'calc(1200% / ' + this.r.beat.split('/')[0] + ')'
    },
    selectBeat (item) {
      this.r.beat = item.name
      this.drawBeatUi()
    },
    getPattern () {
      this.pattern = {...this.pattern, ...this.r.pattern }
      this.beatLabel = '♩ = '
      this.indicatorWidth = 'calc(1200% / ' + this.pattern.beat.split('/')[0] + ')'
    },
    selectPattern (item) {
      this.r.pattern = item
      // PIANO.set('Rhythm', 'Pattern', item)
      this.getPattern ()
    },
    animateBeatIndicator (event) {
      this.counter = { ...this.counter, count: event.count, type: event.type}
      if (this.r.beat === "1/4") {
        const clearIndicator =()=> {
          this.counter = { ...this.counter, count: 0, type: event.type}
        }
        const clearTime = 60000 / this.r.tempo.value / 2
        setTimeout(()=>{
          clearIndicator()
        }, clearTime)
      }
    }
  }
})

const musicVm = new Vue ({
  el: '#music',
  data: {
    m: {},
    isSelected: undefined,
    playerWindow: {
      isShown: false,
      isOpen: false,
      isWorning: false,
      mode: undefined, // 'smfplayer', 'lesson', 'concertmagic', 'audioplayer'
    },
    recWindow: {
      isShown: false,
      isOpen: false,
      isCompleted: false,
    },

    modeSelector: {
      isShown: false,
      index: null,
      list: [],
      nameList: [],
    },
    volume: null,
    speedSlider: 50,
    metroVol: 0,
    balance: {
      value: 50,
      isShown: true
    },
    transpose: {
      increbtn: true,
      decrebtn: true,
    },
    lessonInitData: {
      speed: 50, //テンポ実数ではなくスライダーポジション
      metroVol: 0,
      balance: 50,
      transpose: 0
    },
    lessonCachedData: {
      speed: 50, //テンポ実数ではなくスライダーポジション
      metroVol: 0,
      balance: 50,
      transpose: 0
    },
    isSoundChanged: false,
    soundBeforePlay: undefined,
    progressTransitionTime: 1100,
    midiEventListenerId: null,

    //recorder
    statusText: '',
    time: '0:00',
    timer: '',
    tempVol: 0,
    tempRepeat: undefined
  },
  computed: {
    isAvailable: ()=> {
      return !mainVm.EmbeddedMode
    },
    lang: ()=> {
      return mainVm.lang
    },
    tab: ()=> {
      return mainVm.Tab
    },
    //// PLAYER ////
    lessonParams: ()=> {
      return asset.player.lessonParams
    },
    recWaringMsg: ()=> {
      return asset.messages.recordingWarning
    },
    //// RECORDER ////
    statusList: ()=> {
      return asset.recorder.status
    },
    actionBtnLabel: ()=> {
      return asset.recorder.action
    },
    recMode: ()=> {
      const mode = (menuVm.format.value === 0) ? 'midi' : 'audio'
      return mode
    },
    recSettings: ()=> {
      const obj = {
        format: ['smf1', 'wav', 'flac', 'aac'][menuVm.format.value],
        soundRec: menuVm.soundRec.value,
        sound: (menuVm.soundRec.value) ? mainVm.CurrentSound.id : undefined,
        // inputLevel: menuVm.inputVol.value / 10,
        inputLevel: menuVm.inputVol.value,
        normalize: false,
      }
      return obj
    },
    recCancel: ()=> {
      return asset.buttonLabel.recCancel
    },
    isSecondary: ()=> {
      return mainVm.isSecondaryContentsBar
    }
  },
  methods: {

    KawaipianoJsSynced () {
      this.m = new Music ()

      // Status Handler
      this.m.addEventListener('status', (status)=>{
        // console.log('MusicClass : ' + status)
        if (status === 'init') {
        } else if (status === 'stop') {
          keyboardAnimation.reset()
          if (this.playerWindow.isShown) { this.getParams() }
          if (this.recWindow.isCompleted) { this.stopRecPreview() }
        } else if (status === 'pause') {
          if (this.playerWindow.isShown) { this.getParams() }
        } else if (status === 'concertmagic') {
          if (!this.m.selected.concertMagic) { this.m.play() }
        } else if (status === 'loading') {
          this.soundBeforePlay = mainVm.CurrentSound.id
          if (this.m.selected.function === 'soundDemo' && this.tab === 2 ) {
            PIANO.set('Music', 'SoundDefault', this.m.selected)
            this.isSoundChanged = true
          }
          mainVm.setListSelected(this.m.selected.id)
          if (this.playerWindow.isShown) { this.getParams() }
        } else if (status === 'recstandby') {
          this.standby()
        } else if (status === 'recording') {
          this.recording()
        } else if (status === 'inprogress') {
        } else if (status === 'error') {
          this.init()
        }
        this.isSelected = (Object.keys(musicVm.m.selected).length) ? true : false
        this.setWindow(status)
        metroVm.isMusicActive = (['play', 'pause', 'recording', 'concertmagic'].includes(status)) ? true : false
      })
      this.m.addEventListener('smfCallback', (id)=>{
        mainVm.selectSound({ id })
        this.isSoundChanged = true
      })
      this.getParams()
    },
    async SyncTab (i) {
      if (i === 2) {
        // プレイヤー画面の表示非表示
        if (this.m.status === 'init' || this.m.status === 'reset' || this.m.status === 'stop') {
          mainVm.MusicTab.player = false
          if (this.playerWindow.isOpen) { this.closePlayer() }
        } else {
          mainVm.MusicTab.player = true
        }

      } else {
        // 楽曲によって音色変更された場合、再生開始前の音色に戻す
        if (this.isSoundChanged && this.soundBeforePlay) {
          await PIANO.set ('Sound', this.soundBeforePlay)
          this.isSoundChanged = false
          this.soundBeforePlay = undefined
          mainVm.selectTab()
        }
      }
    },

    init() {
      if (this.m.status === 'init') { return }
      if (metroVm.isMusicActive || this.recWindow.isShown) {
        metroVm.r.play = false
        metroVm.r.mute = true
      }
      this.m.init()

      mainVm.showTopPage()
      mainVm.MusicTab.player = false
      mainVm.MenuButton = true
      this.statusText = this.statusList.stop['name' + this.lang]
      this.stopTimer()
    },
    setWindow (status) {
      if (status === 'init' || status === 'error') {
        if (this.playerWindow.isShown) { this.closePlayer() }
        if (this.recWindow.isShown) { this.closeRecorder() }
        this.playerWindow = { ...this.playerWindow,
          isShown: false,
          isWorning: false
        }
        this.recWindow = { ...this.recWindow,
          isShown: false,
          isCompleted: false
        }
      } else if (status === 'stop' || status === 'pause' || status === 'play') {
        this.playerWindow = { ...this.playerWindow,
          isShown: true,
          isOpen: this.playerWindow.isOpen,
          isWorning: false
        }
        this.recWindow = { ...this.recWindow,
          isShown: this.recWindow.isShown,
          isOpen: this.recWindow.isOpen,
          isCompleted: this.recWindow.isCompleted
        }
      } else if (status === 'recstandby' || status === 'recording') {
        this.playerWindow = { ...this.playerWindow,
          isShown: false,
          isOpen: false,
          isWorning: true
        }
        this.recWindow = { ...this.recWindow,
          isShown: true,
          isOpen: this.recWindow.isOpen,
          isCompleted: false
        }
      } else if (status === 'concertmagic') {
        this.playerWindow = { ...this.playerWindow,
          isShown: true,
          isOpen: true,
          isWorning: false
        }
        this.recWindow = { ...this.recWindow,
          isShown: false,
          isOpen: false,
          isCompleted: false
        }
      }
      if (!this.isSelected) {
        this.playerWindow = { ...this.playerWindow, isShown: false, mode: undefined }
      } else if (status !== 'play') {
        this.getMode()
      }
    },
    getParams () {
      this.getMode()
      this.getBalance()
      this.volume = PIANO.Music.Volume.master
      this.tempVol = PIANO.Music.Volume.master
      if (this.playerWindow.mode === 'lesson' && !this.modeSelector.isShown) {
        const index = this.modeSelector.list.findIndex((item)=>{ item === 'smfplayer' })
        this.setMode({ index: index })
      }
    },

    //// PLAYER METHODS ////
    play () {
      if (this.m.status === 'play') {
        this.m.stop()
        this.clearProgress()
      } else {
        this.m.play()
      }
    },
    next () {
      this.m.next()
      this.clearProgress()
    },
    previous () {
      this.m.previous()
      this.clearProgress()
    },
    repeat () {
      if (!this.m.repeat && !this.m.repeatSingle) {
        this.m.repeat = true
      } else if (this.m.repeat && !this.m.repeatSingle) {
        this.m.repeatSingle = true
      } else {
        this.m.repeat = false
        this.m.repeatSingle = false
      }
    },
    shuffle () {
      this.m.shuffle = !this.m.shuffle
    },
    favorite () {
      this.m.addFavorite(this.m.selected)
      const favoriteAvailable = (PRESET.PlayList[0].data.length === 0) ? false : true
      const favoriteIndex = mainVm.MusicTab.categoryCard.findIndex(item=> item.name === asset.musicCategory.favorite['name' + this.lang])
      mainVm.MusicTab.categoryCard[favoriteIndex] = { ...mainVm.MusicTab.categoryCard[favoriteIndex], isShown: favoriteAvailable }
      mainVm.$forceUpdate()
    },
    onTapPlayerControl (event) {
      const border = (this.playerWindow.isOpen) ? 154 : 96
      const lowerTap = (innerHeight - event.y <= border) ? true : false
      if (lowerTap) {
        if (event.x <= innerWidth * 1 / 5 ) { this.shuffle() }
        else if (event.x <= innerWidth * 2/ 5 ) { this.previous() }
        else if (event.x <= innerWidth * 3/ 5 ) { this.play() }
        else if (event.x <= innerWidth * 4/ 5 ) { this.next() }
        else { this.repeat() }
      } else {
        if (event.x >= innerWidth * 3 / 4) { this.favorite() }
        else if (!this.playerWindow.isOpen) { this.openPlayer() }
      }
    },

    openPlayer () {
      this.getParams()

      this.midiEventListenerId = MIDI.addEventListener('midiMessage', (msg, id, time)=>{
        if (id === 'KWMcore') { keyboardAnimation.animate(msg, time) }
      })

      this.playerWindow = { ...this.playerWindow, isOpen: true }
      mainVm.Bg = true
    },
    closePlayer () {
      if (this.m.status === 'concertmagic') { this.m.play() }

      MIDI.removeEventListener(this.midiEventListenerId)

      this.playerWindow = { ...this.playerWindow, isOpen: false }
      mainVm.Bg = false
    },
    getMode () {

      const mode =
        (['wav', 'flac', 'aac'].includes(musicVm.m.selected.format)) ? 'audioplayer' :
        (this.m.status === 'concertmagic') ? 'concertmagic' :
        (this.playerWindow.mode === 'lesson') ? 'lesson' : 'smfplayer'
      this.playerWindow = { ...this.playerWindow, mode: mode }

      const isShown = ( this.m.selected.function === 'soundDemo' || this.playerWindow.mode === 'audioplayer') ? false : true

      if (this.m.selected.concertMagic) {
        this.modeSelector = { ...this.modeSelector,
          isShown: isShown,
          index: (this.playerWindow.mode === 'concertmagic') ? 0 : (this.playerWindow.mode === 'smfplayer') ? 1 : 2,
          list: [ 'concertmagic', 'smfplayer', 'lesson' ],
          nameList: [ asset.player.mode.concertMagic['name' + this.lang], asset.player.mode.player['name' + this.lang], asset.player.mode.lesson['name' + this.lang] ],
        }
      } else {
        this.modeSelector = { ...this.modeSelector,
          isShown: isShown,
          index: (this.playerWindow.mode === 'lesson') ? 1 : 0,
          list: [ 'smfplayer', 'lesson' ],
          nameList: [ asset.player.mode.player['name' + this.lang], asset.player.mode.lesson['name' + this.lang] ],
        }
      }

      if (this.playerWindow.mode === 'lesson' && this.modeSelector.isShown) {
        this.setLessonParams(this.lessonCachedData)
      } else {
        this.setLessonParams(this.lessonInitData)
      }

    },
    setMode (item) {
      const mode = this.modeSelector.list[item.index]
      this.playerWindow = {...this.playerWindow, mode: mode}
      this.getMode()
      keyboardAnimation.reset()

      // Set Lesson Parameters
      if (mode === 'lesson') {
        metroVm.r.mute = false
        this.setLessonParams(this.lessonCachedData)
      } else {
        metroVm.r.mute = true
        this.cacheLessonParams()
        this.initABRepeat()
        this.setLessonParams(this.lessonInitData)
      }

      // Set ConcertMagic Mode
      if (mode === 'concertmagic') {
        this.m.setConcertMagic()
        cmagicAnimation.begin()
        this.m.addEventListener('concertmagic', (obj)=> { cmagicAnimation.animate(obj) })
      } else {
        if (this.m.status === 'concertmagic') {
          cmagicAnimation.end()
          this.m.play()
        }
      }

    },
    changeVolume (value) {
      this.tempVol = value
      this.m.volume = { ...this.m.volume, master: value }
      PIANO.set('Music', 'Volume', value)
    },
    setProgress (value) {
      this.m.time = value / 100
      keyboardAnimation.reset()
    },
    clearProgress () {
      clearInterval(this.progressCounter)
      this.progressTransitionTime = 0
    },
    setSpeed (value) {
      this.speedSlider = value
      const speed = (value <= 50) ? (0.5 + (0.5 * value/50)) : (2 * value/100)
      this.m.speed = speed
      this.cacheLessonParams()
    },
    setMetroVol (value) {
      this.metroVol = value
      metroVm.r.volume = value
      this.cacheLessonParams()
    },
    getBalance () {
      if (PIANO.Music.Volume.multiTrackControl) {
        this.balance = {...this.balance, value: PIANO.Music.Balance, isShown: true }

      } else {
        this.balance = {...this.balance, isShown: false }
      }
    },
    setBalance (value) {
      if (!this.balance.isShown) { return }
      this.balance = { ...this.balance, value: value }
      PIANO.set('Music', 'Balance', value)
      this.cacheLessonParams()
    },
    setTranspose (i) {
      let incre = true
      let decre = true
      if (i >= 12) { incre = false }
      if (i <= -12) { decre = false }
      this.transpose = {...this.transpose, increbtn: incre, decrebtn: decre,}
      this.m.transpose = i
      this.cacheLessonParams()
    },
    incrementTranspose () {
      const i = this.m.transpose + 1
      this.setTranspose(i)
    },
    decrementTranspose () {
      const i = this.m.transpose - 1
      this.setTranspose(i)
    },
    resetTranspose () {
      if(this.transpose.clicked) {
        this.setTranspose(0)
        this.transpose = {...this.transpose, clicked: false}
      } else {
        this.transpose = {...this.transpose, clicked: true}
        setTimeout (()=> {
          this.transpose = {...this.transpose, clicked: false}
        }, 300)
      }
    },
    setA () {
      this.m.setRepeatA()
    },
    setB () {
      this.m.setRepeatB()
    },
    initABRepeat () {
      if (musicVm.m.time.repeatA.isActive) { this.setA() } else if (musicVm.m.time.repeatB.isActive) { this.setB() }
    },
    cacheLessonParams () {
      if (this.playerWindow.mode !== 'lesson') { return }
      this.lessonCachedData = {...this.lessonCachedData,
        speed: musicVm.speedSlider,
        metroVol: musicVm.metroVol,
        balance: PIANO.Music.Balance,
        transpose: musicVm.m.transpose
      }
    },
    setLessonParams (obj) {
      this.setSpeed(obj.speed)
      this.setMetroVol (obj.metroVol)
      this.setBalance(obj.balance)
      this.setTranspose (obj.transpose)
    },

    //// RECORDER METHODS ////
    standby() {
      if (this.timer) { this.stopTimer() }

      this.statusText = this.statusList.standby['name' + this.lang]
      this.m.volume = { ...this.m.volume, master: 100 }
      PIANO.set('Music', 'Volume', 100)
      this.tempRepeat = this.m.repeatSingle
      if (this.tempRepeat) { this.m.repeatSingle = false }
      mainVm.Editor.isHidden = true
      mainVm.MenuButton = false
      this.recWindow = { ...this.recWindow, isShown: true }
    },
    recording() {
      if (this.m.status !== 'recording') { return }
      this.statusText = this.statusList.recording['name' + this.lang]
      this.startTimer()
    },
    complete() {
      this.recWindow = { ...this.recWindow, isCompleted: true }
      this.statusText = this.statusList.complete['name' + this.lang]
      this.stopTimer()
      this.openRecorder ()
      mainVm.MenuButton = true
    },
    recordSound (id) {
      if (this.isAvailable && this.m.status === 'recording' && menuVm.soundRec.value) {
        musicVm.m.recorder.setSmfCallback(id)
      }
    },
    startRecPreview () {
      if (this.m.status === 'inprogress') { return }
      this.statusText = this.statusList.playback['name' + this.lang]
      this.m.play()
      this.startTimer()
    },
    stopRecPreview () {
      this.statusText = this.statusList.complete['name' + this.lang]
      this.m.stop()
      this.m.time = 0
      this.stopTimer()
    },
    overdub () {
      this.stopTimer()
      const mode = (this.m.selected.format === 'smf0' || this.m.selected.format === 'smf1') ? 'midi' : 'audio'
      const recSettings = { ...this.recSettings, soundRec : false, sound : musicVm.m.selected.sound }
      this.m.record(mode, recSettings)
    },
    save () {
      if (this.m.status === 'play') { this.stopRecPreview() }
      const title = asset.messages.saveRecorder['title' + this.lang]
      const initName = 'Song' + (this.m.recorded.length + 1)
      const okCallback =(userinput)=> {
        this.m.save(userinput).then (()=>{
          console.log(this.m.selected, this.m.recorded)
          this.init()
        })
      }
      const cancelCallback =()=> {}
      const label = asset.messages.saveRecorder['label' + this.lang]
      const validator =(text)=> {
        const validation =
          (text.length === 0 ) ? { result: false, msg: asset.messages.noNameInput['description' + this.lang] }
        : { result: true, msg: '' }
        return validation
      }
      popup.inputtext(title, initName, okCallback, cancelCallback, label, validator)
    },
    trash () {
      const title = asset.messages.recDeleteConfirm['title' + this.lang]
      const msg = asset.messages.recDeleteConfirm['description' + this.lang]
      const okCallback =()=> { this.init() }
      const cancelCallback =()=> {}
      const label = asset.messages.recDeleteConfirm['label' + this.lang]
      popup.confirm(title, msg, okCallback, cancelCallback, label, false)
    },
    share () {
      if (this.m.status === 'play') { this.stopRecPreview() }
      const title = asset.messages.shareRecorder['title' + this.lang]
      const initName = 'Song' + (this.m.recorded.length + 1)
      const okCallback =(userinput)=> {
        console.log(this.m.selected, this.m.recorded)
        this.m.save(userinput).then (()=>{
          const musicObj = this.m.recorded[this.m.recorded.length - 1]
          musicVm.m.openShare(musicObj, {x: 0.5, y: 1})
          this.init()
        })
      }
      const cancelCallback =()=> {}
      const label = asset.messages.shareRecorder['label' + this.lang]
      const validator =(text)=> {
        const validation =
          (text.length === 0 ) ? { result: false, msg: asset.messages.noNameInput['description' + this.lang] }
        : { result: true, msg: '' }
        return validation
      }
      popup.inputtext(title, initName, okCallback, cancelCallback, label, validator)
    },
    onTapMiniRecBar (event) {
      if (event.x <= innerWidth * 3 / 4 ) {
      // コンテンツバータップ判定
          this.openRecorder ()
      } else {
      // レコーダーボタンタップ判定
        this.onRecBtnEvent()
      }
    },
    onRecBtnEvent () {
      if (this.m.status === 'init' ) {
        this.m.record(this.recMode, this.recSettings)
      } else if (this.m.status === 'recstandby') {
        this.m.recorder.start()
      } else if (this.m.status === 'recording') {
        this.m.stop()
        this.complete()
      } else {
        this.init()
        this.m.record(this.recMode, this.recSettings)
      }
    },

    openRecorder () {
      this.recWindow = { ...this.recWindow, isShown: true, isOpen: true }
      mainVm.Bg = true
    },
    closeRecorder () {
      this.m.volume = { ...this.m.volume, master: this.tempVol }
      PIANO.set('Music', 'Volume', this.tempVol)
      mainVm.setSoundsUi()
      if (this.tempRepeat) { this.m.repeatSingle = true }
      this.tempRepeat = undefined
      this.recWindow = { ...this.recWindow, isOpen: false }
      mainVm.Bg = false
      if (this.m.status !== 'recstandby' && this.m.status !== 'recording') {
        mainVm.Editor.isHidden = false
        this.recWindow = { ...this.recWindow, isShown: false }
      }
    },
    startTimer () {
      if (this.timer) {　this.stopTimer()　}

      let m = 0
      let s = 0
      let counter =()=> {
        s++
        if (s === 60) {
          m++
          s = 0
        }
        if (s < 10) { s= '0'+s}
        this.time = m + ':' + s
      }
      this.timer = setInterval (counter, 1000)
    },
    stopTimer () {
      clearInterval(this.timer)
      this.time = '0:00'
      this.timer = ''
    },

  }
})

const recVm = new Vue ({
  el: '#recorder',
  data: {
    miniRec: true,
    isShown: false,
    isOpen: false,
    stopOpen: false,
    status: 'init',
    statusText: '',
    time: '0:00',
    timer: '',
    playback: false,
    overdub: {
      isShown: false,
      selection: false,
      songName: null,
      songListWindow: false,
    },
    overdubBtn: true,
    saveWindow: false,
    deleteWindow: false,
    chordDictionary: false,

    touchmask: false,
  },
  computed: {
    lang: ()=> {
      return mainVm.lang
    },
    EmbeddedMode: ()=> {
      return mainVm.EmbeddedMode
    },
    statusList: ()=> {
      return asset.recorder.status
    },
    actionBtnLabel: ()=> {
      return asset.recorder.action
    },
    overdubMsg: ()=> {
      return asset.recorder.overdubMsgs
    },
    completeWindow: ()=> {
      if (!mainVm.Sync) { return }
      return (['complete', 'play', 'save', 'delete'].includes(recVm.status)) ? true : false
    },
    isSecondary: ()=> {
      return mainVm.isSecondaryContentsBar
    }
  },
  methods: {
    KawaipianoJsSynced () {
      this.init()
    },
    SyncTab (i) {
      if (i === 2) {
        this.miniRec = false
        this.isShown= false
      } else {
        this.miniRec = true
        if (this.status !== 'init' && this.status !== 'stop') {
          this.isShown = true
        }
      }
    },

    init ()  {
      this.status = 'init'
      this.statusText = this.statusList.stop['name' + this.lang]
      this.overdub = {...this.overdub, isShown: true, selection: false, songName: this.overdubMsg.noSong['name' + this.lang] }
      if (this.timer) { this.stopTimer() }
    },

    onTapRecorderFooter () {
      if (['overdub', 'overdubPlay'].includes(this.status)) { mainVm.Editor.isHidden = true }
      this.closeRecorder()
    },
    stop () {
      this.status = 'stop'
      this.statusText = this.statusList.stop['name' + this.lang]
      this.stopTimer()
    },
    standby() {
      if (this.timer) { this.stopTimer() }

      // MusicTab Init
      if (playerVm.status !== 'play') { playerVm.exitPlayer(true) }

      // overdub init
      if (!this.overdub.selection) {
        this.overdub = {...this.overdub, isShown: false}
      }
      this.overdub.selection = false

      this.status = 'standby'
      this.statusText = this.statusList.standby['name' + this.lang]
      this.isShown = true
      mainVm.Editor.isHidden = true
      mainVm.MenuButton = false
    },
    recording() {
      this.status = 'recording'
      this.statusText = this.statusList.recording['name' + this.lang]
      this.startTimer()
    },
    complete() {
      this.setBusy()
      this.status = 'complete'
      this.statusText = this.statusList.complete['name' + this.lang]
      this.overdub.isShown = false
      this.stopTimer()
      this.openRecorder ()
      mainVm.MenuButton = true
      this.overdubBtn = this.isOverdubEnabled()
    },
    play () {
      if (this.status !== 'complete') { return }
      this.status = 'play'
      this.statusText = this.statusList.playback['name' + this.lang]
      const callback =()=>{ this.playStop() }
      PIANO.set('RecControl', 'play', callback)
      this.startTimer()
    },
    playStop () {
      if (this.status !== 'play') { return }
      this.status = 'complete'
      this.statusText = this.statusList.complete['name' + this.lang]
      PIANO.set('RecControl', 'complete')
      this.stopTimer()
    },
    isOverdubEnabled () {
      const status = (PIANO.RecControl.Format === 'internal' && !PIANO.RecControl.Selected.overdub || PIANO.RecControl.Format !== 'internal') ? true : false
      return status
    },
    overdubCurrent () {
      if (this.status !== 'complete') { return }
      this.status = 'overdub'
      this.overdub = {...this.overdub,
        isShown: true,
        selection: true,
        songName: this.overdubMsg.recorded['name' + this.lang]
      }
      PIANO.set('RecControl', 'overdub')
      this.stopTimer()
    },
    overdubFileSelect () {
      if (!['init', 'stop', 'overdub', 'overdubPlay'].includes(PIANO.RecControl.Status)) { return }
      const msg = this.overdubMsg.selectReq['name' + this.lang]
      const label = this.overdubMsg.deselect['name' + this.lang]
      const recordedData = PIANO.RecControl.RecordedSongs.filter((item) => {
        if (PIANO.RecControl.Format === 'internal') {
          return item.attribute === 'kso' &&  !item.overdub || item.attribute !== 'kso'
        } else {
          return item
        }
      })
      const usbSongData = PIANO.ExternalStrage.filter((item) => { return !item.isRecFile })
      const data = (PIANO.RecControl.Format === 'internal') ? recordedData : [...recordedData, ...usbSongData]
      const selectCallback =(item)=> {
        this.status = 'overdub'
        this.overdub = {...this.overdub,
          isShown: true,
          selection: true,
          songName: item.name
        }
        PIANO.set('RecControl', 'overdub', item)
        this.setBusy()
      }
      const closeCallback =()=> {
        this.overdubFileClear()
        PIANO.set('RecControl', 'stop')
        this.stop()
      }
      popup.list(msg, data, selectCallback, closeCallback, label)
      this.stopTimer()
    },
    overdubFileClear () {
      this.overdub = {...this.overdub,
        isShown: true,
        selection: false,
        songName: this.overdubMsg.noSong['name' + this.lang]
      }
      PIANO.RecControl.Selected = { ...PIANO.RecControl.Selected, overdub: false }
    },
    overdubPlay () {
      if (!this.overdub.isShown) { return }
      if (this.status === 'overdub') {
        this.status = 'overdubPlay'
        this.statusText = this.statusList.playback['name' + this.lang]
        const callback =()=>{ this.overdubPlay() }
        PIANO.set('RecControl', 'overdubPlay', callback)
        this.startTimer()
      } else {
        this.status = 'overdub'
        this.statusText = this.statusList.stop['name' + this.lang]
        PIANO.set('RecControl', 'overdub')
        this.stopTimer()
      }
    },
    save () {
      if (this.status !== 'complete' && this.status !== 'play') { return }
      if (this.playback) { this.recConfirmStop() }
      const title = asset.messages.saveRecorder['title' + this.lang]
      const initName = 'Song' + (Number(PIANO.RecControl.Selected.id.split('_')[1]) + 1)
      const okCallback =(userinput)=> {
        console.log(userinput)
        PIANO.set('RecControl', 'save', userinput)
        this.isShown = false
        this.closeRecorder ()
        this.init()
        this.setBusy()
      }
      const cancelCallback =()=> {}
      const label = asset.messages.saveRecorder['label' + this.lang]
      const validator =(text)=> {
        const duplicate = encode.tools.arrSome(PIANO.ExternalStrage, 'name', text)
        const validation =
          (text.length === 0 ) ?  { result: false, msg: asset.messages.noNameInput['description' + this.lang] }
        : (duplicate) ? { result: false, msg: asset.messages.songNameDuplicate['description' + this.lang] }
        : { result: true, msg: '' }
        return validation
      }
      popup.inputtext(title, initName, okCallback, cancelCallback, label, validator)
    },
    trash () {
      if (this.status !== 'complete' && this.status !== 'play') { return }
      const title = asset.messages.recDeleteConfirm['title' + this.lang]
      const msg = asset.messages.recDeleteConfirm['description' + this.lang]
      const okCallback =()=> {
        if (this.playback) { this.recConfirmStop() }
        PIANO.set('RecControl', 'delete', 'Current')
        this.overdub = {...this.overdub,
          isShown: true,
          selection: false,
          songName: this.overdubMsg.noSong['name' + this.lang]
        }
        this.isShown = false
        this.closeRecorder ()
        this.init()
        this.setBusy()
      }
      const cancelCallback =()=> {}
      const label = asset.messages.recDeleteConfirm['label' + this.lang]
      popup.confirm(title, msg, okCallback, cancelCallback, label, false)
    },

    onTapMiniRecBar (event) {
      if (event.x <= innerWidth * 3 / 4 ) {
      // コンテンツバータップ判定
          this.openRecorder ()
      } else {
      // レコーダーボタンタップ判定
        this.onRecBtnEvent()
      }
    },
    onRecBtnEvent () {
      if (PIANO.RecControl.isBusy || !mainVm.EmbeddedMode) { return }
      if (['init', 'stop', 'overdub', 'overdubPlay'].includes(this.status)) {
        const callback = {}
        callback.onRecording =()=>{
          this.recording()
        }
        callback.onComplete =()=>{
          this.complete()
        }
        PIANO.set('RecControl', 'standby', callback)
        this.standby()

      } else if (this.status === 'standby') {
        PIANO.set('RecControl', 'recording')
        this.recording()

      } else if (this.status === 'recording') {
        PIANO.set('RecControl', 'complete')
        this.complete()

      }
    },
    startTimer () {
      if (this.timer) { this.stopTimer() }

      let m = 0
      let s = 0
      let counter =()=> {
        s++
        if (s === 60) {
          m++
          s = 0
        }
        if (s < 10) { s= '0'+s}
        this.time = m + ':' + s
      }
      this.timer = setInterval (counter, 1000)
    },
    stopTimer () {
      clearInterval(this.timer)
      this.time = '0:00'
      this.timer = ''
    },

    openRecorder () {
      this.touchmask = true
      this.isShown = true
      this.isOpen = true
      mainVm.Bg = true
      setTimeout (()=>{
        this.touchmask = false
      }, 500)
    },
    closeRecorder () {
      if (this.status === 'overdubPlay') { this.overdubPlay() }
      this.isOpen = false
      mainVm.Bg = false
      if (!['standby', 'recording', 'overdub'].includes(this.status)) {
        if (mainVm.Tab !== 2) { mainVm.Editor.isHidden = false }
        this.isShown = false
      }
    },

    setBusy() {
      const msg = asset.messages.songLoading['description' + this.lang]
      popup.busy(msg)
      this.watchBusy()
    },
    watchBusy() {
      if (!PIANO.RecControl.isBusy) {
        if (popup.type === 'busy') { popup.init() }
      }　else {
        setTimeout(()=>{ this.watchBusy() }, 100)
      }
    },

    exitRecorder(uiOnly) {
      this.init()
      if (PIANO.MusicMode === 'RecControl') {
        if (!uiOnly) { PIANO.set('RecControl', 'init') }
        if (popup.type === 'busy') { popup.init() }
        this.overdubFileClear()
      }
      this.closeRecorder()
      mainVm.MenuButton = true
      console.warn('called exitRecorder() uiOnly: ', uiOnly)
    }
  }
})

const playerVm = new Vue ({
  el: '#player',
  data: {
    tab: 0,
    isShown: false,
    isOpen: false,
    status: '',
    isRec: false,
    name: '',
    composer: '',
    favorite: '',
    play: true,
    next: false,
    previous: false,
    repeat: false,
    shuffle: false,
    volume: null,
    mode: 'Player',
    modeSelect: true,
    modeIndex: null,
    modeList: [],
    tempoSlider: 50,
    metroVol: 0,
    balance: {
      value: 50,
      isShown: true
    },
    transpose: {
      value: 0,
      increbtn: true,
      decrebtn: true,
    },
    progress: 0,
    progressRefreshInterval: 500,
    progressTransitionTime: 1100,
    progressCounter: '',
    bar: 1,
    startBar: 1,
    endBar: 1,
    currentTime: '--:--',
    remainingTime: '--:--',
    lessonInitData: {
      tempo: 50, //テンポ実数ではなくスライダーポジション
      metroVol: 0,
      balance: 50,
      transpose: 0
    },
    lessonCachedData: {
      tempo: 50, //テンポ実数ではなくスライダーポジション
      metroVol: 0,
      balance: 50,
      transpose: 0
    },
    aBtn: true,
    bBtn: false,
    pointA: '--:--',
    pointB: '--:--',
    captureMode: false
  },
  computed: {
    lang: ()=> {
      return mainVm.lang
    },
    EmbeddedMode: ()=> {
      return mainVm.EmbeddedMode
    },
    lessonParams: ()=> {
      return asset.player.lessonParams
    },
    loadingMsg: ()=> {
      return asset.messages.songLoading
    },
    recWaringMsg: ()=> {
      return asset.messages.recordingWarning
    },
  },
  created: function () {
    const onProgress =(e)=> {
      if (e.time > PIANO.Music.Time.total)  return
      const prog = Math.ceil( ( e.time / PIANO.Music.Time.total ) * 1000 ) / 10
      if (this.progress !== prog) {
        this.progress = prog
        this.currentTime = e.elapsedTimeString
        this.remainingTime = e.remainingTimeString
      }
    }
    KWM.setSmfOutFilter(true)
    KWM.getTimeProgress(onProgress)
  },
  methods: {
    KawaipianoJsSynced () {
      this.getParams()
      PIANO.onPlayerChange =()=> { this.getParams() }
    },
    SyncTab (i) {
      this.tab = i
      if (i === 2) {
        // 録音中の操作禁止マスク表示
        if (!['init', 'stop', 'overdub'].includes(PIANO.RecControl.Status)) { this.isRec = true }

        // プレイヤー画面の表示非表示
        if (this.status === 'init' || this.status === 'reset') {
          this.isShown = false
          mainVm.MusicTab.player = false
          if (this.isOpen) { this.closePlayer() }
        } else if (this.status === 'stop' && (PIANO.Music.Mode === 'USBMusicPlayer' || PIANO.Music.Mode === 'RecorderPlayback')) {
          this.isShown = false
          mainVm.MusicTab.player = false
          if (this.isOpen) { this.closePlayer() }
        } else {
          this.isShown = true
          mainVm.MusicTab.player = true
        }
      } else {
        this.isShown = false
        if (this.isOpen) { this.closePlayer() }
        this.isRec = false
      }
    },
    getParams () {
      this.getMode()
      this.status = PIANO.Music.Status
      this.name = PIANO.Music.Selected.name
      this.composer = PIANO.Music.Selected.composer
      this.favorite = PIANO.Music.Selected.favorite
      this.play = (this.mode === 'ConcertMagic') ? false : true
      this.next = PIANO.Music.Next
      this.previous = PIANO.Music.Previous
      this.repeat = PIANO.Music.Repeat
      this.shuffle = PIANO.Music.Shuffle
      this.volume = PIANO.Music.Volume.master
      this.pointA = PIANO.Music.Time.pointA
      this.pointB = PIANO.Music.Time.pointB
      this.aBtn = PIANO.Music.RepeatA
      this.bBtn = PIANO.Music.RepeatB
      mainVm.setListSelected()
    },
    onTapPlayerControl (event) {
      const border = (this.isOpen) ? 154 : 96
      const lowerTap = (innerHeight - event.y <= border) ? true : false
      if (lowerTap) {
        if (event.x <= innerWidth * 1 / 5 ) { this.setShuffle() }
        else if (event.x <= innerWidth * 2/ 5 ) { this.setPrevious() }
        else if (event.x <= innerWidth * 3/ 5 ) { this.setPlay() }
        else if (event.x <= innerWidth * 4/ 5 ) { this.setNext() }
        else { this.setRepeat() }
      } else {
        if (event.x >= innerWidth * 3 / 4) { this.setFavorite() }
        else if (!this.isOpen) { this.openPlayer() }
      }
    },
    openPlayer () {
      this.getParams()

      this.midiEventListenerId = MIDI.addEventListener('midiMessage', (msg, id, time)=>{
        if (id === 'KWMcore') { keyboardAnimation.animate(msg, time) }
      })

      this.isOpen = true
      mainVm.Bg = true
    },
    closePlayer () {
      if (PIANO.Music.Mode !== 'USBMusicPlayer' && PIANO.Music.Mode !== 'RecorderPlayback') {
        if (PIANO.Music.ConcertMagic) {
          this.selectMode({index: 1, selected: 'Player'})
        } else {
          this.selectMode({index: 0, selected: 'Player'})
        }
      }

      this.isOpen = false
      mainVm.Bg = false
    },

    getMode () {
      this.mode = PIANO.Music.Mode
      this.modeList = (PIANO.Music.ConcertMagic)
      ? [ asset.player.mode.concertMagic['name' + this.lang], asset.player.mode.player['name' + this.lang], asset.player.mode.lesson['name' + this.lang] ]
      : [ asset.player.mode.player['name' + this.lang], asset.player.mode.lesson['name' + this.lang] ]
      if (PIANO.Music.ConcertMagic) {
        this.modeIndex = (this.mode === 'ConcertMagic') ? 0 : (this.mode === 'Player') ? 1 : 2
      } else {
        this.modeIndex = (this.mode === 'Player') ? 0 : 1
      }
      this.modeSelect = ( PIANO.Music.Selected.function === 'soundDemo' || ['RecorderPlayback','USBMusicPlayer'].includes(PIANO.Music.Mode) ) ? false : true
      if (PIANO.Music.Status === 'reset') {
        if (this.mode === 'Lesson' && this.modeSelect) {
          this.setLessonParams(this.lessonCachedData)
        } else {
          this.setLessonParams(this.lessonInitData)
        }
      }
    },
    selectMode (item) {
      this.modeIndex = item.index
      if (PIANO.Music.ConcertMagic) {
        this.mode = (item.index === 0) ? 'ConcertMagic' : (item.index === 1) ? 'Player' : 'Lesson'
      } else {
        this.mode = (item.index === 0) ? 'Player' : 'Lesson'
      }
      PIANO.set('Music', 'Mode', this.mode)
      this.play = (this.mode === 'ConcertMagic') ? false : true
      keyboardAnimation.reset()

      // Set Lesson Parameters
      if (this.mode === 'Lesson') {
        metroVm.r.mute = false
        this.setLessonParams(this.lessonCachedData)
      } else {
        metroVm.r.mute = true
        this.cacheLessonParams()
        this.initABRepeat()
        this.setLessonParams(this.lessonInitData)
      }

      // Set ConcertMagic Mode
      if (this.mode === 'ConcertMagic') {
        cmagicAnimation.begin()
      } else {
        cmagicAnimation.end()
      }

    },
    setPlay () {
      if (this.mode === 'ConcertMagic' || PIANO.Music.isBusy) { return }

      if (this.status === 'play') {
        PIANO.set('Music', 'Stop')
        this.clearProgress()
      } else {
        PIANO.set('Music', 'Play')
        this.getProgress()
      }
    },
    setNext () {
      if (PIANO.Music.isBusy) { return }
      PIANO.set('Music', 'Next')
      this.clearProgress()
      mainVm.setListSelected()
    },
    setPrevious () {
      if (PIANO.Music.isBusy) { return }
      PIANO.set('Music', 'Previous')
      this.clearProgress()
      mainVm.setListSelected()
    },
    setRepeat () {
      if (PIANO.Music.Repeat) {
        PIANO.set('Music', 'Repeat', false)
      } else {
        PIANO.set('Music', 'Repeat', true)
      }
    },
    setShuffle () {
      if (PIANO.Music.Shuffle) {
        PIANO.set('Music', 'Shuffle', false)
      } else {
        PIANO.set('Music', 'Shuffle', true)
      }
    },
    setFavorite () {
      PIANO.set('Music', 'Favorite', PIANO.Music.Selected)
      const favoriteAvailable = (PRESET.PlayList[0].data.length === 0) ? false : true
      const favoriteIndex = mainVm.MusicTab.categoryCard.findIndex(item=> item.name === asset.musicCategory.favorite['name' + this.lang])
      mainVm.MusicTab.categoryCard[favoriteIndex] = { ...mainVm.MusicTab.categoryCard[favoriteIndex], isShown: favoriteAvailable }
      mainVm.$forceUpdate()
    },
    changeVolume (value) {
      this.volume = value
      PIANO.set('Music', 'Volume', value)
    },
    changeSmfTime (value) {
      const deltaTime = PIANO.Music.Time.total * value
      PIANO.set('Music', 'Time', Math.floor(deltaTime))
    },
    changeSmfTempo (value) {
      this.tempoSlider = value
      const speed = (value <= 50) ? (0.5 + (0.5 * value/50)) : (2 * value/100)
      PIANO.set('Music', 'RelativeTempo', speed)
      this.cacheLessonParams()
    },
    setMetroVol (value) {
      this.metroVol = value
      metroVm.r.volume = value
      this.cacheLessonParams()
    },
    changeBalance (value) {
      if (!PIANO.Music.Selected.handsBalance) { return }
      this.balance = { ...this.balance, value: value }
      PIANO.set('Music', 'Balance', value)
      this.cacheLessonParams()
    },
    setTranspose (i) {
      let incre = true
      let decre = true
      if (i >= 12) { incre = false }
      if (i <= -12) { decre = false }
      this.transpose = {...this.transpose, value: i, increbtn: incre, decrebtn: decre,}
      PIANO.set('Music', 'Transpose', i)
      this.cacheLessonParams()
    },
    incrementTranspose () {
      const i = this.transpose.value + 1
      this.setTranspose(i)
    },
    decrementTranspose () {
      const i = this.transpose.value - 1
      this.setTranspose(i)
    },
    resetTranspose () {
      if(this.transpose.clicked) {
        this.setTranspose(0)
        this.transpose = {...this.transpose, clicked: false}
      } else {
        this.transpose = {...this.transpose, clicked: true}
        setTimeout (()=> {
          this.transpose = {...this.transpose, clicked: false}
        }, 300)
      }
    },
    setA () {
      PIANO.set('Music', 'RepeatA')
    },
    setB () {
      PIANO.set('Music', 'RepeatB')
    },
    initABRepeat () {
      if (PIANO.Music.RepeatA) { this.setA() } else if (PIANO.Music.RepeatB) { this.setB() }
    },
    cacheLessonParams () {
      if (this.mode !== 'Lesson') { return }
      this.lessonCachedData = {...this.lessonCachedData,
        tempo: this.tempoSlider,
        metroVol: this.metroVol,
        balance: PIANO.Music.Balance,
        transpose: PIANO.Music.Transpose
      }
    },
    setLessonParams (obj) {
      this.changeSmfTempo(obj.tempo)
      this.setMetroVol (obj.metroVol)
      this.changeBalance(obj.balance)
      this.setTranspose (obj.transpose)
    },
    getProgress () {
      const getCurrent =()=> {
        if (!['play', 'pause'].includes(this.status)) {
          this.clearProgress()
          return
        }
        let prog = Math.floor(this.progress / PIANO.Music.Time.total * 100)
        if (prog === 0 || prog < this.progress) {
          this.progressTransitionTime = 0
        } else {
          this.progressTransitionTime = this.progressRefreshInterval + 100
        }
      }
      this.progressCounter = setInterval(getCurrent, this.progressRefreshInterval)
    },
    clearProgress () {
      clearInterval(this.progressCounter)
      this.progressTransitionTime = 0
    },
    setProgress (value) {
      PIANO.set ('Music', 'Time', value / 100)
      keyboardAnimation.reset()
    },

    exitPlayer (uiOnly) {
      if (PIANO.MusicMode === 'Music'　&& !uiOnly) { PIANO.set('Music', 'Reset') }
      this.clearProgress()
      this.isShown = false
      if (this.isOpen) { this.closePlayer() }
      mainVm.showTopPage()
      mainVm.MusicTab.player = false
      playerVm.status = 'init'
      playerVm.isRec = false
      if (this.tab === 2) { mainVm.selectTab() }
      console.warn('called exitPlayer() uiOnly: ', uiOnly)
    }
  }
})

const vtVm = new Vue ({
  el: '#vt',
  data: {
    isShown: false,
    isPianoSelected: true,
    touchcurve: {},
    mintouch: {},
    voicing: {},
    resorendering: {},
    resodepth: {},
    damperreso: {},
    dampernoise: {},
    stringreso: {},
    undampedreso: {},
    cabinetreso: {},
    keyoffeffect: {},
    fallbacknoise: {},
    hammernoise: {},
    hammerdelay: {},
    topboard: {},
    decay: {},
    release: {},
    stretchtuning: {},
    temperament: {},
    keyvolume: {},
    halfpedal: {},
    softpedal: {},
    damperhold: {},
    isActive: 0,
    vtNum: 0,
    userVtEditor: false,
    selectedVtParams: {
      data: [],
      index: null,
      temp: null,
      labels: [],
      keyMin: null,
      keyMax: null,
      valMin: null,
      valMax: null
    },
    touchcurveData: {},
    touchcurveOptions: {},
    voicingData: {},
    voicingOptions: {},
    stretchtuningData: {},
    stretchtuningOptions: {},
    temperamentData: {},
    temperamentOptions: {},
    keyvolumeData: {},
    keyvolumeOptions: {},
    selectedTimbre: '',
    vtEditCommand: [
      { param: 'UserTouchCurve', start: 'StartEdit', end: 'EndEdit' },
      { param: 'PerNote', start: 'StartEditVoicing', end: 'EndEditVoicing' },
      { param: 'PerNote', start: 'StartEditTuning', end: 'EndEditTuning' },
      { param: 'PerNote', start: 'StartEditTemperament', end: 'EndEditTemperament' },
      { param: 'PerNote', start: 'StartEditKeyVolume', end: 'EndEditKeyVolume' },
    ]
  },
  created(){
    this.getUserVtParams()
  },
  computed: {
    lang: ()=> {
      return mainVm.lang
    },
    EmbeddedMode: ()=> {
      return mainVm.EmbeddedMode
    },
    TouchCurvePreset: ()=> {
      const data = Object.assign (USER.TouchCurve, PRESET.TouchCurve)
      // const data = PRESET.TouchCurve.push(USER.TouchCurve[2])
      return data
    },
    editBtnLabel: ()=> {
      return asset.buttonLabel.edit
    },
    resetBtnLabel: ()=> {
      return asset.buttonLabel.reset
    },
    rendering: ()=> {
      return mainVm.PianoTab.rendering
    },
    CurrentSound: ()=> {
      return mainVm.CurrentSound
    },
  },
  methods: {
    KawaipianoJsSynced () {
      // this.getUiParams()
    },
    getUiParams () {
      this.getTouchcurve ()
      this.getMintouch ()
      this.getVoicing ()
      this.getResorendering ()
      this.getResodepth ()
      this.getDamperreso ()
      this.getDampernoise ()
      this.getStringreso ()
      this.getUndampedreso ()
      this.getCabinetreso ()
      this.getKeyoffeffect ()
      this.getFallbacknoise ()
      this.getHammernoise ()
      this.getHammerdelay ()
      this.getTopboard ()
      this.getDecay ()
      this.getRelease ()
      this.getTemperament ()
      this.getKeyvolume ()
      this.getHalfpedal ()
      this.getSoftpedal ()
      this.getDamperhold ()
      this.getStretchtuning ()
    },
    getUserVtParams () {
      this.getUserTouchcurve()
      this.getUserVoicing()
      this.getUserStretchtuning()
      this.getUserTemperament()
      this.getUserKeyvolume()
    },
    openVtEditor () {
      const pc = ('000' + PIANO.get('Timbre').Main1.pc).slice(-3)
      const msb = ('000' + PIANO.get('Timbre').Main1.msb).slice(-3)
      const lsb = ('000' + PIANO.get('Timbre').Main1.lsb).slice(-3)
      this.selectedTimbre = pc + msb + lsb
      this.isShown = true
      this.getUiParams()
      this.getUserVtParams()
      this.isPianoSelected = mainVm.Editor.isPianoSelected
    },
    closeVtEditor () {
      this.isShown = false
      mainVm.closeVtEditor ()
    },
    // TouchCurve   Enum
    getTouchcurve () {
      const param = PIANO.get('TouchCurve')
      if (param) {
        const data = param.Main1
        let obj = {}
        obj.name = asset.virtualTechnician.touchCurve['name' + this.lang]
        obj.icon = asset.virtualTechnician.touchCurve.icon
        obj.value = data.value
        obj.valueList = data['valueList' + this.lang]
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('touchCurve') >= 0 ? true : false
        this.touchcurve = { ...this.touchcurve, ...obj }
      } else {
        this.touchcurve = { ...this.touchcurve, isShown: false }
      }
    },
    getUserTouchcurve () {
      const hasOwnProperty = USERVTDATA.TouchCurve.hasOwnProperty(this.selectedTimbre)
      if(!hasOwnProperty){
        USERVTDATA.TouchCurve[this.selectedTimbre] = {...USERVTDATA.TouchCurve[this.selectedTimbre], index: USERVTDATA.TouchCurve['default'].index, data: USERVTDATA.TouchCurve['default'].data}
      }
      const array = hasOwnProperty ? this.convTouchCurveData(USERVTDATA.TouchCurve[this.selectedTimbre].data) : this.convTouchCurveData(USERVTDATA.TouchCurve['default'].data)
      const index = hasOwnProperty ? USERVTDATA.TouchCurve[this.selectedTimbre].index : USERVTDATA.TouchCurve['default'].index
      this.touchcurveData = {
        ...this.touchcurveData,
        array: array,
        index: index,
        maxvalue: 127
      }
      this.touchcurveOptions = {
        ...this.touchcurveOptions,
        drawmode: true,
        legend: {
            fontFamily: 'Roboto',
            fontSize: 11,
            fontColor: '#a2a2a2',
            xAxis: {
                padding: 36,
                label: ['', 'ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', ''],
            },
            yAxis: {
                padding: 48,
                label: ['0', '', '', '42', '', '', '85', '', '', '127'],
            }
        },
        padding: {
            top: 8,
            bottom: 8,
            left: 8,
            right: 8
        }
      }
    },
    selectTouchcurve (item) {
      this.touchcurve.value = item.index
      PIANO.set('TouchCurve', {value: item.index}, 'Main1')
      if (mainVm.CurrentSound.availableParams.indexOf('touchCurve')) {
        this.mintouch.isShown = (item.index === 9) ? false : true
        this.hammerdelay.isShown = (item.index === 9) ? false : true
      }
    },

    // MinimumTouch   Range Direct
    getMintouch () {
      const param = PIANO.get('MinimumTouch')
      if (param  && this.touchcurve.value !== 9) {
        const obj = { ...param.Main1 }
        obj.name = asset.virtualTechnician.minimum['name' + this.lang]
        obj.icon = asset.virtualTechnician.minimum.icon
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('touchCurve') >= 0 ? true : false
        this.mintouch = { ...this.mintouch, ...obj }
      } else {
        this.mintouch = { ...this.mintouch, isShown: false }
      }
    },
    changeMintouch (value) {
      PIANO.set('MinimumTouch', {value: value}, 'Main1')
      this.mintouch = { ...this.mintouch, value: value }
    },

    // Voicing   Enum
    getVoicing () {
      const param = PIANO.get('Voicing')
      if (param) {
        const data = param.Main1
        let obj = {}
        obj.name = asset.virtualTechnician.voicing['name' + this.lang]
        obj.icon = asset.virtualTechnician.voicing.icon
        obj.value = data.value
        obj.valueList = data['valueList' + this.lang]
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('voicing') >= 0 ? true : false
        this.voicing = { ...this.voicing, ...obj }
      } else {
        this.voicing = { ...this.voicing, isShown: false }
      }
    },
    getUserVoicing () {
      const hasOwnProperty = USERVTDATA.Voicing.hasOwnProperty(this.selectedTimbre)
      if(!hasOwnProperty){
        USERVTDATA.Voicing[this.selectedTimbre] = {...USERVTDATA.Voicing[this.selectedTimbre], index: USERVTDATA.Voicing['default'].index, data: USERVTDATA.Voicing['default'].data}
      }

      const array = hasOwnProperty ? USERVTDATA.Voicing[this.selectedTimbre].data : USERVTDATA.Voicing['default'].data
      const index = hasOwnProperty ? USERVTDATA.Voicing[this.selectedTimbre].index : USERVTDATA.Voicing['default'].index
      this.voicingData = {
        ...this.voicingData,
        array: array.slice(21, 109),
        index: index,
        maxvalue: 5,
        minvalue: -5
      }
      this.voicingOptions = {
        ...this.voicingOptions,
        drawmode: true,
        legend: {
            fontFamily: 'Roboto',
            fontSize: 11,
            fontColor: '#a2a2a2',
            xAxis: {
                padding: 76,
                label: [
                    '', '', '',
                    'C1', '', '', '', '', '', '', '', '', '', '', '',
                    'C2', '', '', '', '', '', '', '', '', '', '', '',
                    'C3', '', '', '', '', '', '', '', '', '', '', '',
                    'C4', '', '', '', '', '', '', '', '', '', '', '',
                    'C5', '', '', '', '', '', '', '', '', '', '', '',
                    'C6', '', '', '', '', '', '', '', '', '', '', '',
                    'C7', '', '', '', '', '', '', '', '', '', '', '',
                    'C8',
                ],
            },
            yAxis: {
                padding: 48,
                label: ['5', '0', '-5'],
            }
        },
        padding: {
            top: 16,
            bottom: 8,
            left: 8,
            right: 24
        }
      }
    },
    selectVoicing (item) {
      this.voicing.value = item.index
      PIANO.set('Voicing', {value: item.index}, 'Main1')
    },

    // ResonanceRendering (StringResonances)   Range Direct, 0=OFF
    getResorendering () {
      const param = PIANO.get('ResonanceRendering')
      if (param) {
        const obj = { ...param.Main1 }
        obj.name = asset.virtualTechnician.resoRendering['name' + this.lang]
        obj.icon = asset.virtualTechnician.resoRendering.icon
        obj.value = (obj.value === 'Off' || !obj.value) ? 0 : obj.value
        const array = asset.valueTable.vt.resoRendering
        let d = 100
        let v = 0
        array.forEach ((value, index)=> {
          const diff = Math.abs(obj.value - value)
          if (d >= diff) {
            d = diff
            v = index
          }
        })
        obj.uiValue = v
        obj.label = (v === 0) ? asset.buttonLabel.off['name' + this.lang] : v
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('resonanceRendering') >= 0 ? true : false
        this.resorendering = { ...this.resorendering, ...obj}
      } else {
        this.resorendering = { ...this.resorendering, isShown: false }
      }
    },
    changeResorendering (value) {
      PIANO.set('ResonanceRendering', {value: value}, 'Main1')
      this.getResorendering()
    },

    // ResonanceDepth   Range Direct
    getResodepth () {
      const param = PIANO.get('ResonanceDepth')
      if (param) {
        const obj = { ...param.Main1 }
        obj.name = asset.virtualTechnician.resoDepth['name' + this.lang]
        obj.icon = asset.virtualTechnician.resoDepth.icon
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('resonanceDepth') >= 0 ? true : false
        this.resodepth = { ...this.resodepth, ...obj}
      } else {
        this.resodepth = { ...this.resodepth, isShown: false }
      }
    },
    changeResodepth (value) {
      PIANO.set('ResonanceDepth', {value: value}, 'Main1')
      this.resodepth = {...this.resodepth, value: value}
    },

    // DamperResonance   Range 0=OFF
    getDamperreso () {
      const param = PIANO.get('DamperResonance')
      if (param) {
        const obj = { ...param.Main1 }
        obj.name = asset.virtualTechnician.damperReso['name' + this.lang]
        obj.icon = asset.virtualTechnician.damperReso.icon
        obj.value = (obj.value === 'Off' || !obj.value) ? 0 : obj.value
        obj.label = (obj.value === 0) ? asset.buttonLabel.off['name' + this.lang] : obj.value
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('damperResonance') >= 0 ? true : false
        this.damperreso = { ...this.damperreso, ...obj }
      } else {
        this.damperreso = { ...this.damperreso, isShown: false }
      }
    },
    changeDamperreso (value) {
      PIANO.set('DamperResonance', {value: value}, 'Main1')
      const label = (value === 0) ? asset.buttonLabel.off['name' + this.lang] : value
      this.damperreso = {...this.damperreso, value: value, label: label}
    },

    // DamperNoise   Range 0=OFF, Table
    getDampernoise () {
      const param = PIANO.get('DamperNoise')
      if (param) {
        const obj = { ...param.Main1 }
        obj.name = asset.virtualTechnician.damperNoise['name' + this.lang]
        obj.icon = asset.virtualTechnician.damperNoise.icon
        obj.value = (obj.value === 'Off' || !obj.value) ? 0 : obj.value
        const array = asset.valueTable.vt.damperNoise
        let d = 100
        let v = 0
        array.forEach ((value, index)=> {
          const diff = Math.abs(obj.value - value)
          if (d >= diff) {
            d = diff
            v = index
          }
        })
        obj.uiValue = v
        obj.label = (v === 0) ? asset.buttonLabel.off['name' + this.lang] : v
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('damperNoise') >= 0 ? true : false
        this.dampernoise = { ...this.dampernoise, ...obj }
      } else {
        this.dampernoise = { ...this.dampernoise, isShown: false }
      }
    },
    changeDampernoise (value) {
      const v = asset.valueTable.vt.damperNoise[value]
      PIANO.set('DamperNoise', {value: v}, 'Main1')
      const label = (value === 0) ? asset.buttonLabel.off['name' + this.lang] : value
      this.dampernoise = { ...this.dampernoise, uiValue:value, label: label }
    },

    // StringResonance   Range 0=OFF, Table
    getStringreso () {
      const param = PIANO.get('StringResonance')
      if (param) {
        const obj = { ...param.Main1 }
        obj.name = asset.virtualTechnician.stringReso['name' + this.lang]
        obj.icon = asset.virtualTechnician.stringReso.icon
        obj.value = (obj.value === 'Off' || !obj.value) ? 0 : obj.value
        const array = asset.valueTable.vt.stringReso
        let d = 100
        let v = 0
        array.forEach ((value, index)=> {
          const diff = Math.abs(obj.value - value)
          if (d >= diff) {
            d = diff
            v = index
          }
        })
        obj.uiValue = v
        obj.label = (v === 0) ? asset.buttonLabel.off['name' + this.lang] : v
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('stringResonance') >= 0 ? true : false
        this.stringreso = { ...this.stringreso, ...obj }
      } else {
        this.stringreso = { ...this.stringreso, isShown: false }
      }
    },
    changeStringreso (value) {
      const v = asset.valueTable.vt.stringReso[value]
      PIANO.set('StringResonance', {value: v}, 'Main1')
      const label = (value === 0) ? asset.buttonLabel.off['name' + this.lang] : value
      this.stringreso = { ...this.stringreso, uiValue:value, label: label }
    },

    // UndampedStringResonance   Range 0=OFF, Table
    getUndampedreso () {
      const param = PIANO.get('UndampedStringResonance')
      if (param) {
        const obj = { ...param.Main1 }
        obj.name = asset.virtualTechnician.undampedReso['name' + this.lang]
        obj.icon = asset.virtualTechnician.undampedReso.icon
        obj.value = (obj.value === 'Off' || !obj.value) ? 0 : obj.value
        const array = asset.valueTable.vt.undampedReso
        let d = 100
        let v = 0
        array.forEach ((value, index)=> {
          const diff = Math.abs(obj.value - value)
          if (d >= diff) {
            d = diff
            v = index
          }
        })
        obj.uiValue = v
        obj.label = (v === 0) ? asset.buttonLabel.off['name' + this.lang] : v
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('undampedStringResonance') >= 0 ? true : false
        this.undampedreso = { ...this.undampedreso, ...obj, uiValue: v }
      } else {
        this.undampedreso = { ...this.undampedreso, isShown: false }
      }
    },
    changeUndampedreso (value) {
      const v = asset.valueTable.vt.undampedReso[value]
      PIANO.set('UndampedStringResonance', {value: v}, 'Main1')
      const label = (value === 0) ? asset.buttonLabel.off['name' + this.lang] : value
      this.undampedreso = { ...this.undampedreso, uiValue:value, label: label }
    },

    // CabinetResonance   Range 0=OFF
    getCabinetreso () {
      const param = PIANO.get('CabinetResonance')
      if (param) {
        const obj = { ...param.Main1 }
        obj.name = asset.virtualTechnician.cabinetReso['name' + this.lang]
        obj.icon = asset.virtualTechnician.cabinetReso.icon
        obj.value = (obj.value === 'Off' || !obj.value) ? 0 : obj.value
        obj.label = (obj.value === 0) ? asset.buttonLabel.off['name' + this.lang] : obj.value
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('cabinetResonance') >= 0 ? true : false
        this.cabinetreso = { ...this.cabinetreso, ...obj }
      } else {
        this.cabinetreso = { ...this.cabinetreso, isShown: false }
      }
    },
    changeCabinetreso (value) {
      PIANO.set('CabinetResonance', {value: value}, 'Main1')
      const label = (value === 0) ? asset.buttonLabel.off['name' + this.lang] : value
      this.cabinetreso = {...this.cabinetreso, value: value, label: label}
    },

    // KeyOffEffect   Range 0=OFF
    getKeyoffeffect () {
      const param = PIANO.get('KeyOffEffect')
      if (param) {
        const obj = { ...param.Main1 }
        obj.name = asset.virtualTechnician.keyOff['name' + this.lang]
        obj.icon = asset.virtualTechnician.keyOff.icon
        obj.value = (obj.value === 'Off' || !obj.value) ? 0 : obj.value
        obj.label = (obj.value === 0) ? asset.buttonLabel.off['name' + this.lang] : obj.value
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('keyOffEffect') >= 0 ? true : false
        this.keyoffeffect = { ...this.keyoffeffect, ...obj }
      } else {
        this.keyoffeffect = { ...this.keyoffeffect, isShown: false }
      }
    },
    changeKeyoffeffect (value) {
      PIANO.set('KeyOffEffect', {value: value}, 'Main1')
      const label = (value === 0) ? asset.buttonLabel.off['name' + this.lang] : value
      this.keyoffeffect = {...this.keyoffeffect, value: value, label: label}
    },

    // FallbackNoise   Range 0=OFF, Table
    getFallbacknoise () {
      const param = PIANO.get('FallbackNoise')
      if (param) {
        const obj = { ...param.Main1 }
        obj.name = asset.virtualTechnician.fallback['name' + this.lang]
        obj.icon = asset.virtualTechnician.fallback.icon
        obj.value = (obj.value === 'Off' || !obj.value) ? 0 : obj.value
        const array = asset.valueTable.vt.fallbackNoise
        let d = 100
        let v = 0
        array.forEach ((value, index)=> {
          const diff = Math.abs(obj.value - value)
          if (d >= diff) {
            d = diff
            v = index
          }
        })
        obj.uiValue = v
        obj.label = (v === 0) ? asset.buttonLabel.off['name' + this.lang] : v
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('fallbackNoise') >= 0 ? true : false
        this.fallbacknoise = { ...this.fallbacknoise, ...obj, uiValue: v }
      } else {
        this.fallbacknoise = { ...this.fallbacknoise, isShown: false }
      }
    },
    changeFallbacknoise (value) {
      const v = asset.valueTable.vt.fallbackNoise[value]
      PIANO.set('FallbackNoise', {value: v}, 'Main1')
      const label = (value === 0) ? asset.buttonLabel.off['name' + this.lang] : value
      this.fallbacknoise = { ...this.fallbacknoise, uiValue:value, label: label }
    },

    // HammerNoise   Range 0=OFF, Table
    getHammernoise () {
      const param = PIANO.get('KeyAttackNoise')
      if (param) {
        const obj = { ...param.Main1 }
        obj.name = asset.virtualTechnician.hammerNoise['name' + this.lang]
        obj.icon = asset.virtualTechnician.hammerNoise.icon
        obj.value = (obj.value === 'Off' || !obj.value) ? 0 : obj.value
        const array = asset.valueTable.vt.hammerNoise
        let d = 100
        let v = 0
        array.forEach ((value, index)=> {
          const diff = Math.abs(obj.value - value)
          if (d >= diff) {
            d = diff
            v = index
          }
        })
        obj.uiValue = v
        obj.label = (v === 0) ? asset.buttonLabel.off['name' + this.lang] : v
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('hammerNoise') >= 0 ? true : false
        this.hammernoise = { ...this.hammernoise, ...obj, uiValue: v }
      } else {
        this.hammernoise = { ...this.hammernoise, isShown: false }
      }
    },
    changeHammernoise (value) {
      const v = asset.valueTable.vt.hammerNoise[value]
      PIANO.set('KeyAttackNoise', {value: v}, 'Main1')
      const label = (value === 0) ? asset.buttonLabel.off['name' + this.lang] : value
      this.hammernoise = { ...this.hammernoise, uiValue:value, label: label }
    },

    // HammerDelay   Range 0=OFF
    getHammerdelay () {
      const param = PIANO.get('HammerDelay')
      if (param && this.touchcurve.value !== 9) {
        const obj = { ...param.Main1 }
        obj.name = asset.virtualTechnician.hammerDelay['name' + this.lang]
        obj.icon = asset.virtualTechnician.hammerDelay.icon
        obj.value = (obj.value === 'Off' || !obj.value) ? 0 : obj.value
        obj.label = (obj.value === 0) ? asset.buttonLabel.off['name' + this.lang] : obj.value
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('hammerDelay') >= 0 ? true : false
        this.hammerdelay = { ...this.hammerdelay, ...obj }
      } else {
        this.hammerdelay = { ...this.hammerdelay, isShown: false }
      }
    },
    changeHammerdelay (value) {
      PIANO.set('HammerDelay', {value: value}, 'Main1')
      const label = (value === 0) ? asset.buttonLabel.off['name' + this.lang] : value
      this.hammerdelay = {...this.hammerdelay, value: value, label: label}
    },

    // Topboad   Enum
    getTopboard () {
      const param = PIANO.get('TopboardSimulation')
      if (param) {
        const data = param.Main1
        let obj = {}
        obj.name = asset.virtualTechnician.topboard['name' + this.lang]
        obj.icon = asset.virtualTechnician.topboard.icon
        obj.value = data.value
        obj.valueList = data['valueList' + this.lang]
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('topboardSimulation') >= 0 ? true : false
        this.topboard = { ...this.topboard, ...obj }
      } else {
        this.topboard = { ...this.topboard, isShown: false }
      }
    },
    selectTopboard (item) {
      PIANO.set('TopboardSimulation', {value: item.index}, 'Main1')
    },

    // DecayTime   Range Direct
    getDecay () {
      const param = PIANO.get('DecayTime')
      if (param) {
        const obj = { ...param.Main1 }
        obj.name = asset.virtualTechnician.decay['name' + this.lang]
        obj.icon = asset.virtualTechnician.decay.icon
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('decayTime') >= 0 ? true : false
        this.decay = { ...this.decay, ...obj }
      } else {
        this.decay = { ...this.decay, isShown: false }
      }
    },
    changeDecay (value) {
      PIANO.set('DecayTime', {value: value}, 'Main1')
      this.decay = { ...this.decay, value: value }
    },

    // ReleaseTime   Range Table ±64
    getRelease () {
      const param = PIANO.get('DCAReleaseTime')
      if (param) {
        const obj = { ...param.Main1 }
        obj.name = asset.virtualTechnician.release['name' + this.lang]
        obj.icon = asset.virtualTechnician.release.icon
        const array = asset.valueTable.vt.release
        let d = 100
        let v = 0
        array.forEach ((value, index)=> {
          const diff = Math.abs(obj.value - value)
          if (d >= diff) {
            d = diff
            v = index
          }
        })
        obj.uiValue = v
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('releaseTime') >= 0 ? true : false
        this.release = { ...this.release, ...obj }
      } else {
        this.release = { ...this.release, isShown: false }
      }
    },
    changeRelease (value) {
      const v = asset.valueTable.vt.release[value]
      PIANO.set('DCAReleaseTime', {value: v}, 'Main1')
      this.release = { ...this.release, uiValue:value }
    },

    // StretchTuning   Enum
    getStretchtuning () {
      const param = PIANO.get('StretchTuning')
      if (param) {
        let obj = {}
        const data = param.Main1
        obj.name = asset.virtualTechnician.stretchTuning['name' + this.lang]
        obj.icon = asset.virtualTechnician.stretchTuning.icon
        obj.value = data.value
        obj.valueList = data['valueList' + this.lang]
        obj.isHidden =  (this.temperament.value !== 0)
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('stretchTuning') >= 0 ? true : false
        this.stretchtuning = { ...this.stretchtuning, ...obj}
      } else {
        this.stretchtuning = { ...this.stretchtuning, isShown: false }
      }
    },
    getUserStretchtuning () {
      const hasOwnProperty = USERVTDATA.Tuning.hasOwnProperty(this.selectedTimbre)
      if(!hasOwnProperty){
        USERVTDATA.Tuning[this.selectedTimbre] = {...USERVTDATA.Tuning[this.selectedTimbre], index: USERVTDATA.Tuning['default'].index, data: USERVTDATA.Tuning['default'].data}
      }

      const array = (hasOwnProperty) ? USERVTDATA.Tuning[this.selectedTimbre].data : USERVTDATA.Tuning['default'].data
      const index = (hasOwnProperty) ? USERVTDATA.Tuning[this.selectedTimbre].index : USERVTDATA.Tuning['default'].index

      this.stretchtuningData = {
        ...this.stretchtuningData,
        array: array.slice(21, 109),
        index: index,
        maxvalue: 50,
        minvalue: -50
      }
      this.stretchtuningOptions = {
        ...this.stretchtuningOptions,
        drawmode: true,
        legend: {
            fontFamily: 'Roboto',
            fontSize: 11,
            fontColor: '#a2a2a2',
            xAxis: {
                padding: 76,
                label: [
                    '', '', '',
                    'C1', '', '', '', '', '', '', '', '', '', '', '',
                    'C2', '', '', '', '', '', '', '', '', '', '', '',
                    'C3', '', '', '', '', '', '', '', '', '', '', '',
                    'C4', '', '', '', '', '', '', '', '', '', '', '',
                    'C5', '', '', '', '', '', '', '', '', '', '', '',
                    'C6', '', '', '', '', '', '', '', '', '', '', '',
                    'C7', '', '', '', '', '', '', '', '', '', '', '',
                    'C8',
                ],
            },
            yAxis: {
                padding: 48,
                label: ['50', '0', '-50'],
            }
        },
        padding: {
            top: 16,
            bottom: 8,
            left: 8,
            right: 24
        }
      }
    },
    selectStretchtuning (item) {
      this.stretchtuning.value = item.index
      PIANO.set('StretchTuning', {value: item.index}, 'Main1')
    },

    // Temperament   Enum
    getTemperament () {
      const param = PIANO.get('Temperament')
      if (param) {
        const data = param.Main1
        let obj = {}
        obj.name = asset.virtualTechnician.temperament['name' + this.lang]
        obj.icon = asset.virtualTechnician.temperament.icon
        obj.value = data.value
        obj.valueList = data['valueList' + this.lang]
        obj.subValue = data.subValue
        obj.subValueList = data['subValueList' + this.lang][0]
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('temperament') >= 0 ? true : false
        this.temperament = { ...this.temperament, ...obj}
      } else {
        this.temperament = { ...this.temperament, isShown: false }
      }
    },
    getUserTemperament () {
      const hasOwnProperty = USERVTDATA.Temperament.hasOwnProperty(this.selectedTimbre)
      if(!hasOwnProperty){
        USERVTDATA.Temperament[this.selectedTimbre] = {...USERVTDATA.Temperament[this.selectedTimbre], index: USERVTDATA.Temperament['default'].index, data: USERVTDATA.Temperament['default'].data}
      }

      const array = (hasOwnProperty) ? USERVTDATA.Temperament[this.selectedTimbre].data : USERVTDATA.Temperament['default'].data
      const index = (hasOwnProperty) ? USERVTDATA.Temperament[this.selectedTimbre].index : USERVTDATA.Temperament['default'].index
      const temp = this.temperament.subValue
      this.temperamentData = {
        ...this.temperamentData,
        array: array,
        index: index,
        temp: temp,
        maxvalue: 50,
        minvalue: -50
      }
      this.temperamentOptions = {
        ...this.temperamentOptions,
        drawmode: true,
        legend: {
            fontFamily: 'Roboto',
            fontSize: 11,
            fontColor: '#a2a2a2',
            xAxis: {
                padding: 76,
                label: [],
            },
            yAxis: {
                padding: 48,
                label: ['50', '0', '-50'],
            }
        },
        padding: {
            top: 16,
            bottom: 8,
            left: 8,
            right: 24
        }
      }
    },
    selectTemperament (item) {
      this.temperament.value = item.index
      PIANO.set('Temperament', {value: item.index, subValue: this.temperament.subValue}, 'Main1')
      this.temperament = { ...this.temperament, value: item.index }

      if (mainVm.CurrentSound.availableParams.indexOf('stretchTuning')){
        const isHidden = (item.index !== 0)
        this.stretchtuning = {...this.stretchtuning, isHidden: isHidden}
      }
    },
    selectTemperamentKey (item) {
      PIANO.set('Temperament', {value: this.temperament.value, subValue: item.index}, 'Main1')
      this.temperament = { ...this.temperament, subValue: item.index }
      this.temperamentData = { ...this.temperamentData, temp: item.index }
    },

    // KeyVolume   Enum
    getKeyvolume () {
      const param = PIANO.get('KeyVolume')
      if (param) {
        const data = param.Main1
        let obj = {}
        obj.name = asset.virtualTechnician.keyVol['name' + this.lang]
        obj.icon = asset.virtualTechnician.keyVol.icon
        obj.value = data.value
        obj.valueList = data['valueList' + this.lang]
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('keyVolume') >= 0 ? true : false
        this.keyvolume = { ...this.keyvolume, ...obj }
      } else {
        this.keyvolume = { ...this.keyvolume, isShown: false  }
      }
    },
    getUserKeyvolume () {
      const hasOwnProperty = USERVTDATA.Volume.hasOwnProperty(this.selectedTimbre)
      if(!hasOwnProperty){
        USERVTDATA.Volume[this.selectedTimbre] = {...USERVTDATA.Volume[this.selectedTimbre], index: USERVTDATA.Volume['default'].index, data: USERVTDATA.Volume['default'].data}
      }

      const array = (hasOwnProperty) ? USERVTDATA.Volume[this.selectedTimbre].data : USERVTDATA.Volume['default'].data
      const index = (hasOwnProperty) ? USERVTDATA.Volume[this.selectedTimbre].index : USERVTDATA.Volume['default'].index

      this.keyvolumeData = {
        ...this.keyvolumeData,
        array: array.slice(21, 109),
        index: index,
        maxvalue: 50,
        minvalue: -50
      }
      this.keyvolumeOptions = {
        ...this.keyvolumeOptions,
        drawmode: true,
        legend: {
            fontFamily: 'Roboto',
            fontSize: 11,
            fontColor: '#a2a2a2',
            xAxis: {
                padding: 76,
                label: [
                    '', '', '',
                    'C1', '', '', '', '', '', '', '', '', '', '', '',
                    'C2', '', '', '', '', '', '', '', '', '', '', '',
                    'C3', '', '', '', '', '', '', '', '', '', '', '',
                    'C4', '', '', '', '', '', '', '', '', '', '', '',
                    'C5', '', '', '', '', '', '', '', '', '', '', '',
                    'C6', '', '', '', '', '', '', '', '', '', '', '',
                    'C7', '', '', '', '', '', '', '', '', '', '', '',
                    'C8',
                ],
            },
            yAxis: {
                padding: 48,
                label: ['50', '0', '-50'],
            }
        },
        padding: {
            top: 16,
            bottom: 8,
            left: 8,
            right: 24
        }
      }
    },
    selectKeyvolume (item) {
      this.keyvolume.value = item.index
      PIANO.set('KeyVolume', {value: item.index}, 'Main1')
    },

    // HalfPedal   Range Direct
    getHalfpedal () {
      const param = PIANO.get('HalfPedalAdjust')
      if (param) {
        const obj = { ...param.Main1 }
        obj.name = asset.virtualTechnician.halfPedal['name' + this.lang]
        obj.icon = asset.virtualTechnician.halfPedal.icon
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('halfPedalAdjust') >= 0 ? true : false
        this.halfpedal = { ...this.halfpedal, ...obj }
      } else {
        this.halfpedal = { ...this.halfpedal, isShown: false }
      }
    },
    changeHalfpedal (value) {
      PIANO.set('HalfPedalAdjust', {value: value}, 'Main1')
      this.halfpedal = { ...this.halfpedal, value: value }
    },

    // SoftPedal   Range Direct
    getSoftpedal () {
      const param = PIANO.get('SoftPedalDepth')
      if (param) {
        const obj = { ...param.Main1 }
        obj.name = asset.virtualTechnician.softPedal['name' + this.lang]
        obj.icon = asset.virtualTechnician.softPedal.icon
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('softPedalDepth') >= 0 ? true : false
        this.softpedal = { ...this.softpedal, ...obj }
      } else {
        this.softpedal = { ...this.softpedal, isShown: false }
      }
    },
    changeSoftpedal (value) {
      PIANO.set('SoftPedalDepth', {value: value}, 'Main1')
      this.softpedal = { ...this.softpedal, value: value }
    },

    // DamperHold   On/Off
    getDamperhold () {
      const param = PIANO.get('DamperHold')
      if (param) {
        const obj = { ...param.Global }
        obj.name = asset.virtualTechnician.damperHold['name' + this.lang]
        obj.icon = asset.virtualTechnician.damperHold.icon
        if (obj.value === 'Off' || !obj.value) { obj.value = 0 } else { obj.value = 1 }
        obj.valueList = [asset.buttonLabel.off['name' + this.lang], asset.buttonLabel.on['name' + this.lang]]
        obj.isShown = mainVm.CurrentSound.availableParams.indexOf('damperHold') >= 0 ? true : false
        this.damperhold = { ...this.damperhold, ...obj }
      } else {
        this.damperhold = { ...this.damperhold, isShown: false  }
      }
    },
    selectDamperhold (item) {
      if (item.index === 0) {
        PIANO.set('DamperHold', 'Off', 'Global')
      } else {
        PIANO.set('DamperHold', 'On', 'Global')
      }
    },

    convTouchCurveData: (data)=> {
      const arr = []
      const indexArr = [0, 14, 28, 42, 56, 71, 85, 99, 113, 127]
      for(let i = 0; i < 10; i++){
        arr.push(Math.round(data[indexArr[i]]))
      }
      return arr
    },

    // UserVtEditor
    openUserVtEditor(vtNum){
      let data, index, temp, editor, key, offset, labels, keyMin, keyMax, valMin, valMax
      const command = this.vtEditCommand
      if (vtNum === 0) {
        data = this.touchcurveData.array
        index = this.touchcurveData.index
        editor = asset.virtualTechnician.touchCurve.editor['name' + this.lang]
        key = asset.virtualTechnician.touchCurve.key['name' + this.lang]
        offset = asset.virtualTechnician.touchCurve.offset['name' + this.lang]
        labels = vtUiParams.touchcurve.labels
        keyMin = vtUiParams.touchcurve.keyMin
        keyMax = vtUiParams.touchcurve.keyMax
        valMin = vtUiParams.touchcurve.valMin
        valMax = vtUiParams.touchcurve.valMax
      } else if (vtNum === 1) {
        data = this.voicingData.array
        index = this.voicingData.index
        editor = asset.virtualTechnician.voicing.editor['name' + this.lang]
        key = asset.virtualTechnician.voicing.key['name' + this.lang]
        offset = asset.virtualTechnician.voicing.offset['name' + this.lang]
        labels = vtUiParams.voicing.labels
        keyMin = vtUiParams.voicing.keyMin
        keyMax = vtUiParams.voicing.keyMax
        valMin = vtUiParams.voicing.valMin
        valMax = vtUiParams.voicing.valMax
      } else if (vtNum === 2) {
        data = this.stretchtuningData.array
        index = this.stretchtuningData.index
        editor = asset.virtualTechnician.stretchTuning.editor['name' + this.lang]
        key = asset.virtualTechnician.stretchTuning.key['name' + this.lang]
        offset = asset.virtualTechnician.stretchTuning.offset['name' + this.lang]
        labels = vtUiParams.tuning.labels
        keyMin = vtUiParams.tuning.keyMin
        keyMax = vtUiParams.tuning.keyMax
        valMin = vtUiParams.tuning.valMin
        valMax = vtUiParams.tuning.valMax
      } else if (vtNum === 3) {
        data = this.temperamentData.array
        index = this.temperamentData.index
        temp = this.temperamentData.temp
        editor = asset.virtualTechnician.temperament.editor['name' + this.lang]
        key = asset.virtualTechnician.temperament.key['name' + this.lang]
        offset = asset.virtualTechnician.temperament.offset['name' + this.lang]
        labels = vtUiParams.temperament.labels
        keyMin = vtUiParams.temperament.keyMin
        keyMax = vtUiParams.temperament.keyMax
        valMin = vtUiParams.temperament.valMin
        valMax = vtUiParams.temperament.valMax
      } else if (vtNum === 4) {
        data = this.keyvolumeData.array
        index = this.keyvolumeData.index
        editor = asset.virtualTechnician.keyVol.editor['name' + this.lang]
        key = asset.virtualTechnician.keyVol.key['name' + this.lang]
        offset = asset.virtualTechnician.keyVol.offset['name' + this.lang]
        labels = vtUiParams.volume.labels
        keyMin = vtUiParams.volume.keyMin
        keyMax = vtUiParams.volume.keyMax
        valMin = vtUiParams.volume.valMin
        valMax = vtUiParams.volume.valMax
      }

      this.selectedVtParams = {
        ...this.selectedVtParams,
        data: data,
        index: index,
        temp: temp,
        editor: editor,
        key: key,
        offset: offset,
        labels: labels,
        keyMin: keyMin,
        keyMax: keyMax,
        valMin: valMin,
        valMax: valMax
      }
      this.userVtEditor = true
      this.vtNum = vtNum
      this.setNoteOnHandler()
      this.$nextTick(()=> {
        document.getElementsByClassName('user-vt__settings__wrap')[0].scrollTo(0, 0)
      })
      if (vtNum === 3) { this.$refs.temperament.temperamentSort() }
      this.getUserVtParams()
      if (PIANO.Sync) { PIANO.set(command[this.vtNum].param, command[this.vtNum].start) }
    },
    setNoteOnHandler(){
      // this.noteOnTimer = null
      // const waitToStop = (timeout) => {
      //   return new Promise(resolve => {
      //     if (this.noteOnTimer) clearTimeout(this.noteOnTimer)
      //     this.noteOnTimer = setTimeout(resolve, timeout)
      //   })
      // }

      MIDI.IN.NoteOn = (data)=> {
        // await waitToStop(400)

        if(data.id === PIANO.DeviceID){
          if (this.vtNum === 0) {
            return
          } else if (this.vtNum === 1) {
            this.selectedVtParams = { ...this.selectedVtParams, index: data.note_num - 21 }
            USERVTDATA.Voicing[this.selectedTimbre] = {...USERVTDATA.Voicing[this.selectedTimbre], index: this.selectedVtParams.index}
            this.voicingData = { ...this.voicingData, index: data.note_num - 21 }
          } else if (this.vtNum === 2) {
            this.selectedVtParams = { ...this.selectedVtParams, index: data.note_num - 21 }
            USERVTDATA.Tuning[this.selectedTimbre] = {...USERVTDATA.Tuning[this.selectedTimbre], index: this.selectedVtParams.index}
            this.stretchtuningData = { ...this.stretchtuningData, index: data.note_num - 21 }
          } else if (this.vtNum === 3) {
            switch((data.note_num - 21) % 12){
              case 0: {
                this.selectedVtParams = { ...this.selectedVtParams, index: 9 }
                this.temperamentData = { ...this.temperamentData, index: 9 }
                break
              }
              case 1: {
                this.selectedVtParams = { ...this.selectedVtParams, index: 10 }
                this.temperamentData = { ...this.temperamentData, index: 10 }
                break
              }
              case 2: {
                this.selectedVtParams = { ...this.selectedVtParams, index: 11 }
                this.temperamentData = { ...this.temperamentData, index: 11 }
                break
              }
              case 3: {
                this.selectedVtParams = { ...this.selectedVtParams, index: 0 }
                this.temperamentData = { ...this.temperamentData, index: 0 }
                break
              }
              case 4: {
                this.selectedVtParams = { ...this.selectedVtParams, index: 1 }
                this.temperamentData = { ...this.temperamentData, index: 1 }
                break
              }
              case 5: {
                this.selectedVtParams = { ...this.selectedVtParams, index: 2 }
                this.temperamentData = { ...this.temperamentData, index: 2 }
                break
              }
              case 6: {
                this.selectedVtParams = { ...this.selectedVtParams, index: 3 }
                this.temperamentData = { ...this.temperamentData, index: 3 }
                break
              }
              case 7: {
                this.selectedVtParams = { ...this.selectedVtParams, index: 4 }
                this.temperamentData = { ...this.temperamentData, index: 4 }
                break
              }
              case 8: {
                this.selectedVtParams = { ...this.selectedVtParams, index: 5 }
                this.temperamentData = { ...this.temperamentData, index: 5 }
                break
              }
              case 9: {
                this.selectedVtParams = { ...this.selectedVtParams, index: 6 }
                this.temperamentData = { ...this.temperamentData, index: 6 }
                break
              }
              case 10: {
                this.selectedVtParams = { ...this.selectedVtParams, index: 7 }
                this.temperamentData = { ...this.temperamentData, index: 7 }
                break
              }
              case 11: {
                this.selectedVtParams = { ...this.selectedVtParams, index: 8 }
                this.temperamentData = { ...this.temperamentData, index: 8 }
                break
              }
            }
            USERVTDATA.Temperament[this.selectedTimbre] = { ...USERVTDATA.Temperament[this.selectedTimbre], index: this.selectedVtParams.index }
          } else if (this.vtNum === 4) {
            this.selectedVtParams = { ...this.selectedVtParams, index: data.note_num - 21 }
            USERVTDATA.Volume[this.selectedTimbre] = {...USERVTDATA.Volume[this.selectedTimbre], index: this.selectedVtParams.index}
            this.keyvolumeData = { ...this.keyvolumeData, index: data.note_num - 21 }
          }
          DATABASE.saveUserSettings('UserVtData', 2000)
        } else return
      }
    },
    initNoteOnHandler(){
      MIDI.IN.NoteOn =(data)=> {}
    },
    closeUserVtEditor(){
      const command = this.vtEditCommand
      this.userVtEditor = false
      this.initNoteOnHandler()
      this.getUiParams()
      setTimeout( ()=> { this.getUserVtParams() }, 300)
      if (PIANO.Sync) { PIANO.set(command[this.vtNum].param, command[this.vtNum].end) }
    },
    decrementKey(){
      if (this.vtNum === 0) {
        this.$refs.touchcurve.decrementKey()
      } else if (this.vtNum === 1) {
        this.$refs.voicing.decrementKey()
      } else if (this.vtNum === 2) {
        this.$refs.stretchtuning.decrementKey()
      } else if (this.vtNum === 3) {
        this.$refs.temperament.decrementKey()
      } else if (this.vtNum === 4) {
        this.$refs.keyvolume.decrementKey()
      }
    },
    incrementKey(){
      if (this.vtNum === 0) {
        this.$refs.touchcurve.incrementKey()
      } else if (this.vtNum === 1) {
        this.$refs.voicing.incrementKey()
      } else if (this.vtNum === 2) {
        this.$refs.stretchtuning.incrementKey()
      } else if (this.vtNum === 3) {
        this.$refs.temperament.incrementKey()
      } else if (this.vtNum === 4) {
        this.$refs.keyvolume.incrementKey()
      }
    },
    confirmResetOffset(){
      let title, msg
      const label = {
        true: asset.buttonLabel.ok['name' + this.lang],
        false: asset.buttonLabel.cancel['name' + this.lang]
      }
      const okCallback =()=> { this.resetOffsetAll() }
      if (this.vtNum === 0) {
        title = asset.virtualTechnician.touchCurve.confirmTitle['name' + this.lang]
        msg = asset.virtualTechnician.touchCurve.confirmText['name' + this.lang]
      } else if (this.vtNum === 1) {
        title = asset.virtualTechnician.voicing.confirmTitle['name' + this.lang]
        msg = asset.virtualTechnician.voicing.confirmText['name' + this.lang]
      } else if (this.vtNum === 2) {
        title = asset.virtualTechnician.stretchTuning.confirmTitle['name' + this.lang]
        msg = asset.virtualTechnician.stretchTuning.confirmText['name' + this.lang]
      } else if (this.vtNum === 3) {
        title = asset.virtualTechnician.temperament.confirmTitle['name' + this.lang]
        msg = asset.virtualTechnician.temperament.confirmText['name' + this.lang]
      } else if (this.vtNum === 4) {
        title = asset.virtualTechnician.keyVol.confirmTitle['name' + this.lang]
        msg = asset.virtualTechnician.keyVol.confirmText['name' + this.lang]
      }
      popup.confirm(title, msg, okCallback, null, label, false)
    },
    resetOffsetDbl(){
      if(this.selectedVtParams.clicked) {
        if (this.vtNum === 0) {
          this.confirmResetOffset()
        } else if (this.vtNum === 1) {
          this.$refs.voicing.resetOffset()
        } else if (this.vtNum === 2) {
          this.$refs.stretchtuning.resetOffset()
        } else if (this.vtNum === 3) {
          this.$refs.temperament.resetOffset()
        } else if (this.vtNum === 4) {
          this.$refs.keyvolume.resetOffset()
        }
        this.selectedVtParams = {...this.selectedVtParams, clicked: false}
      } else {
        this.selectedVtParams = {...this.selectedVtParams, clicked: true}
        setTimeout (()=> {
          this.selectedVtParams = {...this.selectedVtParams, clicked: false}
        }, 300)
      }
    },
    resetOffsetAll(){
      if (this.vtNum === 0) {
        this.$refs.touchcurve.resetData()
      } else if (this.vtNum === 1) {
        this.$refs.voicing.resetData()
      } else if (this.vtNum === 2) {
        this.$refs.stretchtuning.resetData()
      } else if (this.vtNum === 3) {
        this.$refs.temperament.resetData()
      } else if (this.vtNum === 4) {
        this.$refs.keyvolume.resetData()
      }
    },
    decrementOffset(){
      // this.initNoteOnHandler()
      if (this.vtNum === 0) {
        this.$refs.touchcurve.decrementOffset()
      } else if (this.vtNum === 1) {
        this.$refs.voicing.decrementOffset()
      } else if (this.vtNum === 2) {
        this.$refs.stretchtuning.decrementOffset()
      } else if (this.vtNum === 3) {
        this.$refs.temperament.decrementOffset()
      } else if (this.vtNum === 4) {
        this.$refs.keyvolume.decrementOffset()
      }
    },
    incrementOffset(){
      // this.initNoteOnHandler()
      if (this.vtNum === 0) {
        this.$refs.touchcurve.incrementOffset()
      } else if (this.vtNum === 1) {
        this.$refs.voicing.incrementOffset()
      } else if (this.vtNum === 2) {
        this.$refs.stretchtuning.incrementOffset()
      } else if (this.vtNum === 3) {
        this.$refs.temperament.incrementOffset()
      } else if (this.vtNum === 4) {
        this.$refs.keyvolume.incrementOffset()
      }
    },
    drawTouchCurve (obj, arr, isMidi) {
      this.touchcurveData = { ...this.touchcurveData, array: obj.array, index: obj.index }
      this.selectedVtParams = { ...this.selectedVtParams, data: obj.array, index: obj.index }
      USERVTDATA.TouchCurve[this.selectedTimbre] = { ...USERVTDATA.TouchCurve[this.selectedTimbre], data: arr, index: obj.index }
      DATABASE.saveUserSettings('UserVtData', 2000)
      if (isMidi) { this.sendTouchCurve(arr) }
    },
    setTouchCurve (obj, arr) {
      this.drawTouchCurve(obj, arr, false)
      this.sendTouchCurve(arr)
    },
    sendTouchCurve (arr) {
      if(PIANO.Sync){
        const array = arr.concat()
        const dataObj = {
          existOfPoint: Array(128).fill(0),
          velocityData: array
        }
        PIANO.set('UserTouchCurve', dataObj)
      }
    },
    drawVoicing (obj, arr, isMidi) {
      const array = (arr === undefined) ? obj.array : arr
      this.voicingData = { ...this.voicingData, array: obj.array, index: obj.index }
      this.selectedVtParams = { ...this.selectedVtParams, data: obj.array, index: obj.index }
      USERVTDATA.Voicing[this.selectedTimbre] = { ...USERVTDATA.Voicing[this.selectedTimbre], data: array, index: obj.index }
      // this.setNoteOnHandler()
      DATABASE.saveUserSettings('UserVtData', 2000)
      if (isMidi) { this.sendVoicing(arr) }
    },
    setVoicing (obj, arr) {
      this.drawVoicing(obj, arr, false)
      this.sendVoicing(arr)
    },
    sendVoicing (arr) {
      if(PIANO.Sync){
        const array = arr.concat()
        const dataObj = {
          value: 'PerNoteVoicingData',
          keysVoicingOfst: array
        }
        PIANO.set('PerNote', dataObj)
      }
    },
    drawStretchtuning (obj, arr, isMidi) {
      const array = (arr === undefined) ? obj.array : arr
      this.stretchtuningData = { ...this.stretchtuningData, array: obj.array, index: obj.index }
      this.selectedVtParams = { ...this.selectedVtParams, data: obj.array, index: obj.index }
      USERVTDATA.Tuning[this.selectedTimbre] = { ...USERVTDATA.Tuning[this.selectedTimbre], data: array, index: obj.index }
      // this.setNoteOnHandler()
      DATABASE.saveUserSettings('UserVtData', 2000)
      if (isMidi) { this.sendStretchtuning(arr) }
    },
    setStretchtuning (obj, arr) {
      this.drawStretchtuning(obj, arr, false)
      this.sendStretchtuning(arr)
    },
    sendStretchtuning (arr) {
      if(PIANO.Sync){
        const array = arr.concat()
        const dataObj = {
          value: 'PerNoteTuningData',
          keysTuningOfst: array
        }
        PIANO.set('PerNote', dataObj)
      }
    },
    drawTemperament (obj, arr, isMidi) {
      const array = (arr === undefined) ? obj.array : arr
      this.temperamentData = { ...this.temperamentData, array: obj.array, index: obj.index, temp: obj.temp }
      this.selectedVtParams = { ...this.selectedVtParams, data: obj.array, index: obj.index, temp: obj.temp }
      USERVTDATA.Temperament[this.selectedTimbre] = { ...USERVTDATA.Temperament[this.selectedTimbre], data: array, index: obj.index }
      DATABASE.saveUserSettings('UserVtData', 2000)
      if (isMidi) { this.sendTemperament(arr) }
    },
    setTemperament (obj, arr) {
      this.drawTemperament(obj, arr, false)
      this.sendTemperament(arr)
    },
    sendTemperament (arr) {
      if(PIANO.Sync){
        const array = arr.concat()
        const dataObj = {
          value: 'PerNoteTemperamentData',
          keysTuningOfst: array
        }
        PIANO.set('PerNote', dataObj)
      }
    },
    drawKeyvolume (obj, arr, isMidi) {
      const array = (arr === undefined) ? obj.array : arr
      this.keyvolumeData = { ...this.keyvolumeData, array: obj.array, index: obj.index }
      this.selectedVtParams = { ...this.selectedVtParams, data: obj.array, index: obj.index }
      USERVTDATA.Volume[this.selectedTimbre] = { ...USERVTDATA.Volume[this.selectedTimbre], data: array, index: obj.index }
      // this.setNoteOnHandler()
      DATABASE.saveUserSettings('UserVtData', 2000)
      if (isMidi) { this.sendKeyvolume(arr) }
    },
    setKeyvolume (obj, arr) {
      this.drawKeyvolume(obj, arr, false)
      this.sendKeyvolume(arr)
    },
    sendKeyvolume (arr) {
      if(PIANO.Sync){
        const array = arr.concat()
        const dataObj = {
          value: 'PerNoteKeyVolumeData',
          keysVolOfst: array
        }
        PIANO.set('PerNote', dataObj)
      }
    }
  }
})

const menuVm = new Vue ({
  el: '#menu',
  data: {
    isShown: false,
    isWindowShown: false,
    isBleConnectShown: false,
    isDemoMode: false,
    isGpDemo: false,
    isInitDataLoaded: false,
    title: '',
    list: [],
    // Recorder
    format: {
      isShown: true,
      value: 0,
      valueList: ['SMF', 'WAV', 'FLAC', 'AAC'],
    },
    soundRec: {
      isShown: false,
      value: true,
    },
    inputVol: {
      isShown: false,
      value: 5,
    },
    // normalize: {
    //   isShown: false,
    //   value: false,
    // },
    // Speaker/Headphones
    toneControl: {},
    brilliance: {},
    speakerCharacter: {},
    wallEq: {},
    lowVolBalance: {},
    speakerVol: {},
    shs: {},
    headphonesType: {},
    headphonesVol: {},
    lineInVol: {},
    // 4 hands mode
    fourHandsMode: {},
    timbreR: {},
    timbreL: {},
    balance: {},
    octShiftR: {},
    octShiftL: {},
    splitPoint: {
      clicked: false
    },
    // Bluetooth
    bluetooth: {},
    bleMidi: {},
    bleMidiName: {isShown: true, name: null},
    btAudio: {},
    btAudioVol: {},
    btAudiopairing: {isShown: true},
    // USB Audio IF
    usbAudio: {},
    // USB Memory
    usbRecFormat: {
      value: 0,
      valueList: []
    },
    gain: {
      value: 0,
    },
    usbSave: {},
    usbLoad: {},
    usbEdit: {},
    usbFormat: {},
    // MIDI
    midiCh: '',
    localCtrl: {},
    pcSend: {},
    multiTimbre: {},
    // User Data
    factoryReset: {},
    // System
    lcdContrast: 100,
    ViewportScale: 1,
    // ViewportDefaultScale: 3,
    displayScale: {
      value: 1
    },
    displayOff: {
      value: 0,
      isOn: false,
      time: [undefined, 30000, 60000, 120000, 180000, 240000, 300000],
    },
    displayOffTimer: '',
    backlightOffTimer: '',
    screenSaver: {
      isShown: false,
      value: 0,
      isOn: false,
      enum: ['Off', 'On'],
      enumJa: ['オフ', 'オン'],
      photo: 0,
      transition: 0,
      isStop: false,
      isActive: false
    },
    screenSaverTimer: '',
    powerOff: {},
    startUpWindow: {
      value: 0
    },
    startUpSettings: {
      value: 0
    },
    language: {},
    autoSaveTimer: undefined,
    hymn: {},
    infor: {},
    // Chord Dictionary
    chord: {},
  },
  computed: {
    lang: ()=> {
      return mainVm.lang
    },
    EmbeddedMode: ()=> {
      return mainVm.EmbeddedMode
    },
    menuText: ()=> {
      return asset.menu
    },
    menuTitle: ()=> {
      return asset.menu.title
    },
    buttonLabel: ()=> {
      return asset.buttonLabel
    },
    timbreCategoryList: ()=> {
      return mainVm.SoundsTab.timbreCategoryList
    },
    isGp: ()=> {
      return ['CA9900GP', 'SCA901', 'SCA401'].includes(PIANO.Model)
    },
    isAures: ()=> {
      return (PIANO.Model === 'AURES2GP' || PIANO.Model === 'AURES2UP' || PIANO.Model === 'ATX4GP' || PIANO.Model === 'ATX4UP') ? true : false
    },
    isLegacy: ()=> {
      const legacyModel = ['CA99', 'CA79', 'CA9900GP', 'NV10S', 'NV5S', 'NV10SPL', 'ATX4GP', 'ATX4UP', 'AURES2GP', 'AURES2UP']
      return legacyModel.includes(PIANO.Model)
    },
    photoNums: ()=> {
      return Object.keys(asset.menu.screenSaverEnum).length
    },
  },
  methods: {
    KawaipianoJsSynced () {
      if (!this.isInitDataLoaded) { this.loadSettings() }
      this.getMenuContents ()
      // this.getParams()
    },
    openMenu () {
      this.getMenuContents ()
      this.isShown = true
    },
    closeMenu () {
      this.title = ''
      this.isShown = false
      mainVm.closeMenu()
    },
    getParams () {
      // Speaker / Headphones
      this.getToneControl()
      this.getSpeakerCharacter()
      this.getWallEq()
      this.getLowVolBalance()
      this.getSpeakerVol()
      this.getShs()
      this.getHeadphonesType()
      this.getHeadphonesVol()
      this.getLineInVol()
        // Bluetooth
      if (PIANO.Destination.bluetooth) {
        this.getBluetooth()
        this.getBluetoothMidi()
        this.getBluetoothAudio()
        this.getBluetoothAudioVol()
        this.getBleMidiDeviceName()
      }
      // USB Audio IF
      this.getUsbAudio()
      // MIDI
      this.getMidiCh()
      this.getLocalCtrl()
      this.getPcSend()
      this.getMultiTimbre()
      // System
      // this.getLcdContrast()
      this.getViewportScale()
      this.getDisplayOff()
      this.getPowerOff()
      this.getStartUpWindow()
      this.getStartUpSettings()
      this.getHymn()
      this.getLanguage()
    },
    getMenuContents () {
      const isBt = this.checkBtMenuAvailable()
      const is4Hands = this.check4HandsAvailable()
      const isUsbAudio = this.checkUsbAudioAvailable()
      const isUsb = statusVm.usb
      const menuItemObj = [
        asset.menu.rec,
        asset.menu.sphp,
        asset.menu.fh,
        asset.menu.chord,
        asset.menu.bt,
        asset.menu.usbAudio,
        asset.menu.usb,
        asset.menu.midi,
        asset.menu.user,
        asset.menu.system,
        asset.menu.manual,
//        asset.menu.dev,
      ]
      this.list = []
      for (const item of menuItemObj) {
        if (!isBt && item === asset.menu.bt) {
          console.log('Destination without bluetooth')
        } else if (!isUsbAudio && item === asset.menu.usbAudio) {
        } else if (!isUsb && item === asset.menu.usb) {
        } else if (!is4Hands && item === asset.menu.fh) {
        } else if (!this.isGp && item === asset.menu.chord || this.isGp && item === asset.menu.chord && mainVm.Tab === 2) {
        } else if (this.EmbeddedMode && item === asset.menu.rec/* || this.EmbeddedMode && item === asset.menu.manual*/) {
          // 組込モードでは表示しない
        } else if (this.EmbeddedMode && item === asset.menu.manual) {
          this.list.push ({name: item['name' + this.lang], iconL: item.icon, iconR: item.iconR})
        } else {
          this.list.push ({name: item['name' + this.lang], iconL: item.icon, iconR: item.iconR})
        }
      }
    },
    rescaleMenuLabels () {
      const labels = document.querySelectorAll('.menu__label')
      const fontSize = (this.displayScale.value < 2) ? 1 : 0.84375
      labels.forEach(label => {
        label.style.fontSize = fontSize + 'rem'
      })
    },
    openMenuWindow (item) {
      if (item) { this.title = item.name }
      if ([this.menuText.fh['name' + this.lang], this.menuText.chord['name' + this.lang], this.menuText.manual['name' + this.lang]].includes (this.title)) { this.isWindowShown = false } else { this.isWindowShown = true }
      if (this.title === this.menuText.rec['name' + this.lang]) {  // Recorder
        this.getRecSettings()
      } else if (this.title === this.menuText.sphp['name' + this.lang]) {  // Speaker / Headphones
        this.getToneControl()
        this.getSpeakerCharacter()
        this.getWallEq()
        this.getLowVolBalance()
        this.getSpeakerVol()
        this.getShs()
        this.getHeadphonesType()
        this.getHeadphonesVol()
        this.getLineInVol()
      } else if (this.title === this.menuText.fh['name' + this.lang]) {  // 4 hands mode
        if (this.EmbeddedMode) { playerVm.exitPlayer() } else { musicVm.init() }
        this.set4handsMode()

      } else if (this.title === this.menuText.bt['name' + this.lang]) {  // Bluetooth
        this.getBluetooth()
        this.getBluetoothMidi()
        this.getBluetoothAudio()
        this.getBluetoothAudioVol()
        this.getBluetoothAudioPairing()
        this.getBleMidiDeviceName()
      } else if (this.title === this.menuText.usbAudio['name' + this.lang]) {  // USB Audio
        this.getUsbAudio()
      } else if (this.title === this.menuText.usb['name' + this.lang]) {  // USB
        if (this.EmbeddedMode) { playerVm.exitPlayer() } else { musicVm.init() }
        this.getFormat()
        this.getGain()

      } else if (this.title === this.menuText.midi['name' + this.lang]) {  // MIDI
        this.getMidiCh()
        this.getLocalCtrl()
        this.getPcSend()
        this.getMultiTimbre()
        PIANO.onMultiTimbralMode =()=> { this.getMultiTimbre() }
      } else if (this.title === this.menuText.user['name' + this.lang]) {  // User
        if (this.EmbeddedMode) { playerVm.exitPlayer() } else { musicVm.init() }

      } else if (this.title === this.menuText.system['name' + this.lang]) {  // System
        // this.getLcdContrast()
        this.getViewportScale()
        this.getDisplayOff()
        this.getPowerOff()
        this.getStartUpWindow()
        this.getStartUpSettings()
        this.getHymn()
        this.getLanguage()
      } else if (this.title === this.menuText.chord['name' + this.lang]) {  // Chord Dictionary
        this.setChordDictionaryMode()
      } else if (this.title === this.menuText.manual['name' + this.lang]) {  // Manual
        if (this.EmbeddedMode) {
          const qrCodeMsg = asset.messages.needScanQrCode['description' + this.lang]
          popup.qr(qrCodeMsg)
        } else {
          KWM.openURL(`https://www2.kawai.co.jp/emi-web/piano-docs/`)
        }
      }
      this.$nextTick(()=> this.rescaleMenuLabels())
    },
    closeMenuWindow () {
      this.isWindowShown = false
      if (this.title === this.menuText.fh['name' + this.lang]) {
        this.close4HandsMode()
      } else if (this.title === this.menuText.chord['name' + this.lang]) {
        this.setChordDictionaryMode()
      } else if (this.title === this.menuText.midi['name' + this.lang]) {
        PIANO.onMultiTimbralMode =()=> { }
      }
      this.title = ''
    },
    openBleConnect () {
      if (MIDI.API !== 'KWMcore') {
        location.reload()
        return
      }
      const openWindow =()=> {
        this.isBleConnectShown = true
        MIDI.bluetooth.window = true
      }
      if (!KWM.permission.ble || 
        (!KWM.permission.locationPermission && (!KWM.permission.bleConnect || !KWM.permission.bleScan))) {
        const title = asset.messages.bleIsUnavailable['title' + mainVm.webViewLang]
        const msg = asset.messages.bleIsUnavailable['description' + mainVm.webViewLang]
        const label = asset.messages.bleIsUnavailable['label' + mainVm.webViewLang]
        const okCallback =()=> { location.reload() }
        popup.info(title, msg, okCallback, label, true)
      } else {
        openWindow()
      }
    },
    closeBleConnect () {
      this.isBleConnectShown = false
      MIDI.bluetooth.window = false
      if (!MIDI.DEVICES) {
        mainVm.showAppConnectionError()
      } else {
        window.location.reload()
      }
    },
    exitDemoMode () {
      if (this.EmbeddedMode) {
        if (PIANO.Music.Status !== 'stop') { PIANO.set('Music', 'Stop') }
      } else {
        musicVm.m.init()
      }
      setTimeout(()=>{
        window.location.reload()
      }, 500)
    },

    // Recorder
    getRecSettings () {
      const label = {
        on: asset.buttonLabel.on['name' + this.lang],
        off: asset.buttonLabel.off['name' + this.lang]
      }
      if (this.format.value === 0) {
        this.soundRec = { ...this.soundRec, isShown: true, label: label }
        this.inputVol = { ...this.inputVol, isShown: false }
        // this.normalize = { ...this.normalize, isShown: false }
      } else {
        this.soundRec = { ...this.soundRec, isShown: false }
        this.inputVol = { ...this.inputVol, isShown: true }
        // this.normalize = { ...this.normalize, isShown: true, label: label }
      }
    },
    selectFormat (event) {
      console.log(event)
      this.format = { ...this.format, value: event.index }
      this.getRecSettings()
      this.saveSettings()
    },
    toggleSoundRec (event) {
      this.soundRec = { ...this.soundRec, value: event }
      this.saveSettings()
    },
    changeInputVol (event) {
      this.inputVol = { ...this.inputVol, value: event }
      this.saveSettings()
    },
    // toggleNormalize (event) {
    //   this.normalize = { ...this.normalize, value: event }
    // this.saveSettings()
    // },

    // Speaker / Headphones
    getToneControl () {
      const param = PIANO.get('ToneControl')
      if (param) {
        const curParam = param.System.valueList[param.System.value]
        const isExpanded = (curParam === 'Brilliance' || curParam === 'User') ? true : false
        this.toneControl = {
          ...this.toneControl,
          value: param.System.value,
          param: curParam,
          valueList : param.System['valueList' + this.lang],
          isExpanded: isExpanded,
          isShown: true
        }
        if (curParam === 'Brilliance') { this.getBrilliance() }
      } else {
        this.toneControl = { ...this.toneControl, isShown: false }
      }
    },
    selectToneControl (item) {
      PIANO.set('ToneControl', {value: item.index}, 'System')
      this.getToneControl()
    },
    getBrilliance () {
      const param = PIANO.get('Brilliance')
      if (param) {
        const obj = { ...param.System }
        this.brilliance = { ...this.brilliance, ...obj, isShown: true }
      } else {
        this.brilliance = { ...this.brilliance, isShown: false }
      }
    },
    changeBrilliance (value) {
      const v = Math.floor(value)
      PIANO.set('Brilliance', {value: v}, 'System')
      this.brilliance = {...this.brilliance, value: v}
    },
    openUserEqEditor () {
      eqVm.getUiParams()
      eqVm.isShown = true
    },
    getSpeakerCharacter() {
      const param = PIANO.get('SpeakerCharacter')
      if (param) {
        const obj = { ...param.System }
        obj.valueList = obj['valueList' + this.lang]
        this.speakerCharacter = { ...this.speakerCharacter, ...obj, isShown: true }
      } else {
        this.speakerCharacter = { ...this.speakerCharacter, isShown: false }
      }
    },
    selectSpeakerCharacter (item) {
      PIANO.set('SpeakerCharacter', {value: item.index}, 'System')
      this.getSpeakerCharacter()
    },
    getWallEq () {
      const param = PIANO.get('WallEQ')
      if (param) {
        const obj = { ...param.System }
        obj.valueList = obj['valueList' + this.lang]
        this.wallEq = { ...this.wallEq, ...obj, isShown: true }
      } else {
        this.wallEq = { ...this.wallEq, isShown: false }
      }
    },
    selectWallEq (item) {
      PIANO.set('WallEQ', {value: item.index}, 'System')
      this.getWallEq()
    },
    getLowVolBalance () {
      const param = PIANO.get('EqualizeMasterVolume')
      if (param) {
        const obj = { ...param.System }
        obj.valueList = obj['valueList' + this.lang]
        this.lowVolBalance = { ...this.lowVolBalance, ...obj, isShown: true }
      } else {
        this.lowVolBalance = { ...this.lowVolBalance, isShown: false }
      }
    },
    selectLowVolBalance (item) {
      PIANO.set('EqualizeMasterVolume', {value: item.index}, 'System')
      this.getLowVolBalance()
    },
    getSpeakerVol () {
      const param = PIANO.get('SpeakerVolume')
      if (param) {
        const obj = { ...param.System }
        obj.valueList = obj['valueList' + this.lang]
        this.speakerVol = { ...this.speakerVol, ...obj, isShown: true }
      } else {
        this.speakerVol = { ...this.speakerVol, isShown: false }
      }
    },
    selectSpeakerVol (item) {
      PIANO.set('SpeakerVolume', {value: item.index}, 'System')
      this.getSpeakerVol()
    },
    getShs () {
      const param = PIANO.get('SHSMode')
      if (param) {
        const obj = { ...param.System }
        obj.valueList = obj['valueList' + this.lang]
        this.shs = { ...this.shs, ...obj, isShown: true }
      } else {
        this.shs = { ...this.shs, isShown: false }
      }
    },
    selectShs (item) {
      PIANO.set('SHSMode', {value: item.index}, 'System')
      this.getShs()
    },
    getHeadphonesType () {
      const param = PIANO.get('PhonesType')
      if (param) {
        const obj = { ...param.System }
        obj.valueList = obj['valueList' + this.lang]
        this.headphonesType = {...this.headphonesType, ...obj, isShown: true }
      } else {
        this.headphonesType = {...this.headphonesType, isShown: false }
      }
    },
    selectHeadphonesType (item) {
      PIANO.set('PhonesType', {value: item.index}, 'System')
      this.getHeadphonesType()
    },
    getHeadphonesVol () {
      const param = PIANO.get('PhonesVolume')
      if (param) {
        const obj = { ...param.System }
        obj.valueList = obj['valueList' + this.lang]
        this.headphonesVol = {...this.headphonesVol, ...obj, isShown: true }
      } else {
        this.headphonesVol = {...this.headphonesVol, isShown: false }
      }
    },
    selectHeadphonesVol (item) {
      PIANO.set('PhonesVolume', {value: item.index}, 'System')
      this.getHeadphonesVol()
    },
    getLineInVol () {
      const param = PIANO.get('LineInLevel')
      if (param) {
        const obj = param.System
        // obj.valueList = obj['valueList' + this.lang]
        this.lineInVol = { ...this.lineInVol, ...obj, isShown: true }
      } else {
        this.lineInVol = { ...this.lineInVol, isShown: false }
      }
    },
    changeLineInVol (value) {
      const v = Math.floor(value)
      PIANO.set('LineInLevel', {value: v}, 'System')
      this.getLineInVol()
    },

    // 4 hands mode
    set4handsMode (i) {
      let param = PIANO.get('KeyboardMode')
      if (param) {
        const currentMode = param.Global.value
        if (currentMode === 3) {currentMode = 0}
        PIANO.set('KeyboardMode', {value: 3}, 'Global')
        this.fourHandsMode = {...this.fourHandsMode, isOn: true, modeBackTo: currentMode}
        this.getTimbreR()
        this.getTimbreL()
        this.getBalance()
        this.getOctShiftR()
        this.getOctShiftL()
        this.getSplitPoint()
      } else {
        this.fourHandsMode = { ...this.fourHandsMode, isOn: false }
      }
    },
    close4HandsMode() {
      PIANO.set('KeyboardMode', {value: this.fourHandsMode.modeBackTo}, 'Global')
      this.fourHandsMode = {...this.fourHandsMode, isOn: false, modeBackTo: ''}
    },
    getTimbreR () {
      const param = PIANO.get('Timbre')
      if (param && param.FourHandsRight) {
        const obj = { ...param.FourHandsRight }
        mainVm.makeTimbreList(obj.category,'fourhandsR')
        const i = this.timbreR.idList.indexOf(obj.id)
        const sound = {
          value: i,
          category : obj['category' + this.lang],
          name : this.timbreR.valueList[i],
          secondary : this.timbreR.scondaryValueList[i]
        }
        if (mainVm.isPiano(obj.category)) {
          sound.category = (this.lang === 'Ja') ? 'ピアノ' : (this.lang === 'Zh') ? '钢琴' : 'Piano'
        }
        this.timbreR = { ...this.timbreR, ...sound, isShown: true }
      } else {
        this.timbreR = { ...this.timbreR, isShown: false }
      }
    },
    selectTimbreCategoryR (item) {
      const name = (item.name === 'Piano') ? 'SK-EX' : item.name
      mainVm.makeTimbreList(name,'fourhandsR')
      this.selectTimbreR({index: 0})
    },
    selectTimbreR (item) {
      const id = this.timbreR.idList[item.index]
      PIANO.set ('Timbre', id, 'FourHandsRight')
      this.getTimbreR ()
    },
    getTimbreL () {
      const param = PIANO.get('Timbre')
      if (param && param.FourHandsLeft) {
        const obj = { ...param.FourHandsLeft }
        mainVm.makeTimbreList(obj.category,'fourhandsL')
        const i = this.timbreL.idList.indexOf(obj.id)
        const sound = {
          value: i,
          category : obj['category' + this.lang],
          name : this.timbreL.valueList[i],
          secondary : this.timbreL.scondaryValueList[i]
        }
        if (mainVm.isPiano(obj.category)) {
          sound.category = (this.lang === 'Ja') ? 'ピアノ' : (this.lang === 'Zh') ? '钢琴' : 'Piano'
        }
        this.timbreL = { ...this.timbreL, ...sound, isShown: true }
      } else {
        this.timbreL = { ...this.timbreL, isShown: false }
      }
    },
    selectTimbreCategoryL (item) {
      const name = (item.name === 'Piano') ? 'SK-EX' : item.name
      mainVm.makeTimbreList(name,'fourhandsL')
      this.selectTimbreL({index: 0})
    },
    selectTimbreL (item) {
      const id = this.timbreL.idList[item.index]
      PIANO.set ('Timbre', id, 'FourHandsLeft')
      this.getTimbreL ()
    },
    getBalance () {
      const param = PIANO.get('Balance')
      if (param && param.FourHandsLeft) {
        const obj = { ...param.FourHandsLeft }
        this.balance = { ...this.balance, ...obj, isShown: true }
      } else {
        this.balance = { ...this.balance, isShown: false }
      }
    },
    changeBalance (value) {
      PIANO.set('Balance', {value: Math.floor(value)}, 'FourHandsLeft')
      this.getBalance ()
    },
    getOctShiftR () {
      const param = PIANO.get('OctaveShift')
      if (param && param.FourHandsRight) {
        const obj = { ...param.FourHandsRight }
          let incre
          let decre
          if (obj.value >= 0) { incre = false } else { incre = true }
          if (obj.value <= -3) { decre = false } else { decre = true }
          this.octShiftR = { ...this.octShiftR, ...obj, increbtn: incre, decrebtn: decre, isShown: true }
      } else {
        this.octShiftR = { ...this.octShiftR, isShown: false }
      }
    },
    incrementOctShiftR () {
      const i = this.octShiftR.value + 1
      PIANO.set('OctaveShift', {value: i}, 'FourHandsRight')
      this.getOctShiftR ()
    },
    decrementOctShiftR () {
      const i = this.octShiftR.value - 1
      PIANO.set('OctaveShift', {value: i}, 'FourHandsRight')
      this.getOctShiftR ()
    },
    resetOctShiftR () {
      if(this.octShiftR.clicked) {
        PIANO.set('OctaveShift', {value: -2}, 'FourHandsRight')
        this.getOctShiftR ()
        this.octShiftR = {...this.octShiftR, clicked: false}
      } else {
        this.octShiftR = {...this.octShiftR, clicked: true}
        setTimeout (()=> {
          this.octShiftR = {...this.octShiftR, clicked: false}
        }, 300)
      }
    },
    getOctShiftL () {
      const param = PIANO.get('OctaveShift')
      if (param && param.FourHandsLeft) {
        const obj = { ...param.FourHandsLeft }
        let incre
        let decre
        if (obj.value >= 3) { incre = false } else { incre = true }
        if (obj.value <= 0) { decre = false } else { decre = true }
        this.octShiftL = { ...this.octShiftL, ...obj, increbtn: incre, decrebtn: decre, isShown: true }
      } else {
        this.octShiftL = { ...this.octShiftL, isShown: false }
      }
    },
    incrementOctShiftL () {
      const i = this.octShiftL.value + 1
      PIANO.set('OctaveShift', {value: i}, 'FourHandsLeft')
      this.getOctShiftL ()
    },
    decrementOctShiftL () {
      const i = this.octShiftL.value - 1
      PIANO.set('OctaveShift', {value: i}, 'FourHandsLeft')
      this.getOctShiftL ()
    },
    resetOctShiftL () {
      if(this.octShiftL.clicked) {
        PIANO.set('OctaveShift', {value: 2}, 'FourHandsLeft')
        this.getOctShiftL ()
        this.octShiftL = {...this.octShiftL, clicked: false}
      } else {
        this.octShiftL = {...this.octShiftL, clicked: true}
        setTimeout (()=> {
          this.octShiftL = {...this.octShiftL, clicked: false}
        }, 300)
      }
    },
    getSplitPoint () {
      const param = PIANO.get('SplitPoint')
      if (param && param.FourHandsLeft) {
        const obj = { ...param.FourHandsLeft }
        let incre
        let decre
        if (obj.value >= obj.valueMax) { incre = false } else { incre = true }
        if (obj.value <= obj.valueMin) { decre = false } else { decre = true }
        this.splitPoint = { ...this.splitPoint, ...obj, increbtn: incre, decrebtn: decre, isShown: true }
      } else {
        this.splitPoint = { ...this.splitPoint, isShown: false }
      }
    },
    incrementSplitPoint () {
      const value = this.splitPoint.value + 1
      const name = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][value % 12] + ( Math.floor ( (value / 12) - 1 ) )
      PIANO.set('SplitPoint', {value, name}, 'FourHandsLeft')
      this.getSplitPoint ()
    },
    decrementSplitPoint () {
      const value = this.splitPoint.value - 1
      const name = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][value % 12] + ( Math.floor ( (value / 12) - 1 )　)
      PIANO.set('SplitPoint', {value, name}, 'FourHandsLeft')
      this.getSplitPoint ()
    },
    resetSplitPoint () {
      if(this.splitPoint.clicked) {
        PIANO.set('SplitPoint', { value:60, name:'C4' }, 'FourHandsLeft')
        this.getSplitPoint()
        this.splitPoint = {...this.splitPoint, clicked: false}
      } else {
        this.splitPoint = {...this.splitPoint, clicked: true}
        setTimeout (()=> {
          this.splitPoint = {...this.splitPoint, clicked: false}
        }, 300)
      }
    },
    check4HandsAvailable () {
      const model = PIANO.Model
      const fh = DATABASE.SysEx.find(obj=> obj.value === '4Hands')
      let result
      Object.keys(fh).forEach(key=> { if (model === key) result = fh[key] })
      return (result) ? true : false
    },

    // Bluetooth
    getBluetooth () {
      const paramMIDI = PIANO.get('BluetoothMIDI')
      const paramAudio = PIANO.get('BluetoothAudio')

      if (this.EmbeddedMode && paramMIDI && paramAudio) {
        const obj = { ...paramMIDI.System }
        let isOn
        const label = {
          on: asset.buttonLabel.on['name' + this.lang],
          off: asset.buttonLabel.off['name' + this.lang]
        }
        if (obj.value === 'Off' || !obj.value) {
          isOn = false
          statusVm.bt = false
        } else {
          isOn = true
          statusVm.bt = true
        }
        this.bluetooth = { ...this.bluetooth, isOn: isOn, label: label, isShown: true }
      } else {
        this.bluetooth = { ...this.bluetooth, isShown: false }
      }
    },
    onOffBluetooth () {
      if (this.bluetooth.isOn) {
        PIANO.set('BluetoothMIDI', {value: 'Off'}, 'System')
        PIANO.set('BluetoothAudio', {value: 'Off'}, 'System')
      } else {
        PIANO.set('BluetoothMIDI', {value: 'On'}, 'System')
        PIANO.set('BluetoothAudio', {value: 'On'}, 'System')
      }
      this.getBluetooth()
    },
    getBluetoothMidi () {
      const param = PIANO.get('BluetoothMIDI')
      if (param) {
        const obj = param.System
        let isOn
        const label = {
          on: asset.buttonLabel.on['name' + this.lang],
          off: asset.buttonLabel.off['name' + this.lang]
        }
        if (obj.value === 'Off' || !obj.value) {
          isOn = false
          if (!this.btAudio.isOn) { statusVm.bt = false }
        } else {
          isOn = true
          statusVm.bt = true
        }
        this.bleMidi = { ...this.bleMidi, isOn: isOn, label: label, isShown: true }
      } else {
        this.bleMidi = { ...this.bleMidi, isShown: false }
      }
    },
    onOffBluetoothMidi () {
      if (this.bleMidi.isOn) {
        PIANO.set('BluetoothMIDI', {value: 'Off'}, 'System')
      } else {
        PIANO.set('BluetoothMIDI', {value: 'On'}, 'System')
      }
      this.getBluetoothMidi ()
    },
    getBluetoothAudio () {
      const param = PIANO.get('BluetoothAudio')
      if (param) {
        const obj = { ...param.System }
        let isOn
        const label = {
          on: asset.buttonLabel.on['name' + this.lang],
          off: asset.buttonLabel.off['name' + this.lang]
        }
        if (obj.value === 'Off' || !obj.value) {
          isOn = false
          if (!this.bleMidi.isOn) { statusVm.bt = false }
        } else {
          isOn = true
          statusVm.bt = true
        }
        this.btAudio = { ...this.btAudio, isOn: isOn, label: label, isShown: true }
      } else {
        this.btAudio = { ...this.btAudio, isShown: false }
      }
    },
    onOffBluetoothAudio () {
      if (this.btAudio.isOn) {
        PIANO.set('BluetoothAudio', {value: 'Off'}, 'System')
      } else {
        PIANO.set('BluetoothAudio', {value: 'On'}, 'System')
      }
      this.getBluetoothAudio ()
    },
    getBluetoothAudioPairing () {
      const noneSupportedModel = ['CA99', 'CA79', 'CA9900GP', 'NV10S', 'NV5S', 'NV10SPL', 'ATX4GP', 'ATX4UP', 'AURES2GP', 'AURES2UP']
      const isSupported = !noneSupportedModel.includes(PIANO.Model)
      this.btAudiopairing = { ...this.btAudiopairing, isShown: isSupported }
    },
    btAudioPairing () {
      const title = asset.menu.btSettings.audio['name' + this.lang]
      const msg = asset.menu.btSettings.confirmPairing['name' + this.lang]
      const label = {
        true: asset.buttonLabel.pairing['name' + this.lang],
        false: asset.buttonLabel.cancel['name' + this.lang]
      }
      const okCallback =()=> {
        PIANO.set('BluetoothPairingReset')
      }
      popup.confirm(title, msg, okCallback, null, label, false)
    },

    getBluetoothAudioVol () {
      const param = PIANO.get('BluetoothSetting')
      if (param) {
        const obj = { ...param.System }
        this.btAudioVol = { ...this.btAudioVol, ...obj, isShown: true }
      } else {
        this.btAudioVol = { ...this.btAudioVol, isShown: false }
      }
    },
    changeBluetoothAudioVol (value) {
      const v = Math.floor(value)
      PIANO.set('BluetoothSetting', {value: v}, 'System')
      this.btAudioVol = {...this.btAudioVol, value: v}
    },
    getBleMidiDeviceName () {
      const obj = DATABASE.SysEx.filter(item => item.parameter === 'BluetoothMIDIName')[0]
      const model = PIANO.Model
      if (obj[model]) {
        this.bleMidiName = { ...this.bleMidiName, isShown: true }
      } else {
        this.bleMidiName = { ...this.bleMidiName, isShown: false }
      }
    },
    editBleMidiDeviceName () {
      const title = asset.messages.saveBleMidiDeviceName['title' + this.lang]
      const initName = this.bleMidiName.name
      const callback =(userinput)=> {
        this.bleMidiName = {...this.bleMidiName, name: userinput}
        MIDI.OUT(DATABASE.getMidi('BluetoothMIDIName', {value: userinput}, 'System'), PIANO.DeviceID)
        this.saveSettings()
      }
      const validator =(text)=> {
        const maximumLength = 8
        const validation =
          (text.length === 0 ) ?  { result: false, msg: asset.messages.noNameInput['description' + this.lang] }
        : (text.length > maximumLength ) ? { result: false, msg: asset.messages.overNumOfCharacters['description' + this.lang] }
        : { result: true, msg: '' }
        return validation
      }
      const label = asset.messages.saveBleMidiDeviceName['label' + this.lang]
      popup.inputtext(title, initName, callback, null, label, validator)
    },
    checkBtMenuAvailable () {
      if (!PIANO.Destination.bluetooth) { return false }
      const checkBleMidi = (PIANO.get('BluetoothMIDI')) ? true : false
      const checkBtAudio = (PIANO.get('BluetoothAudio')) ? true : false
      const checkBtAudioSetting = (PIANO.get('BluetoothSetting')) ? true : false
      return [checkBleMidi, checkBtAudio, checkBtAudioSetting].some(v => v)
    },

    // USB Memory
    getFormat () {
      const value = (PIANO.RecControl.Format === 'internal') ? 0 : (PIANO.RecControl.Format === 'wav') ? 1 : 2
      const list = [
        asset.recorder.mode.internal['name' + this.lang],
        asset.recorder.mode.wav['name' + this.lang],
        asset.recorder.mode.mp3['name' + this.lang],
      ]
      this.usbRecFormat = {...this.usbRecFormat, value: value, valueList: list}
    },
    selectUsbRecFormat (item) {
      const format = (item.index === 0) ? 'internal' : (item.index === 1) ? 'wav' : 'mp3'
      if (format === 'internal') { recVm.overdubFileClear() }
      PIANO.set('RecControl', 'property', {Format: format})
      this.getFormat()
      this.saveSettings()
    },
    getGain () {
      const param = PIANO.get('AudioRecGain')
      if (param) {
        const obj = { ...param.System }
        this.gain = { ...this.gain, ...obj, isShown: true }
      } else {
        this.gain = { ...this.gain, isShown: false }
      }
    },
    changeGain(value) {
      PIANO.set('AudioRecGain', {value: value}, 'System')
      this.getGain()
      this.saveSettings()
    },
    saveDataToUsb () {
    },
    loadDataFromUsb () {
    },
    saveData () {
    },
    formatUsb () {
      const confirm =()=> {
        const title = asset.messages.usbFormatConfirm['title' + this.lang]
        const msg = asset.messages.usbFormatConfirm['description' + this.lang]
        const label = asset.messages.usbFormatConfirm['label' + this.lang]
        const okCallback =()=> {
          PIANO.onPianoSuccess =(event)=> { completed(); console.log(event) }
          PIANO.onPianoError =(event)=> { failed(); console.log(event)  }
          MIDI.OUT([0xF0, 0x40, 0x7F, 0x32, 0x08, 0x02, 0x51, 0x3C, 0x7F, 0x00, 0xF7], PIANO.DeviceID)
          executing()
        }
        popup.confirm(title, msg, okCallback, null, label, false)
      }
      const executing =()=> {
        const title = asset.messages.usbFormatExecuting['title' + this.lang]
        const msg = asset.messages.usbFormatExecuting['description' + this.lang]
        popup.inProgress(title, msg)
        PIANO.set('USBMemory', 'ClearUsbMusicObj')
      }
      const completed =()=> {
        const title = asset.messages.usbFormatCompleted['title' + this.lang]
        const msg = asset.messages.usbFormatCompleted['description' + this.lang]
        const label = asset.messages.usbFormatCompleted['label' + this.lang]
        const okCallback =()=> {
          PIANO.onPianoSuccess =()=> {}
          statusVm.setPianoErrorHandler()
          statusVm.detachUsbMemory()
        }
        popup.info(title, msg, okCallback, label, true)
      }
      const failed =()=> {
        const title = asset.messages.usbFormatFailed['title' + this.lang]
        const msg = asset.messages.usbFormatFailed['description' + this.lang]
        const label = asset.messages.usbFormatFailed['label' + this.lang]
        const okCallback =()=> {
          PIANO.onPianoSuccess =()=> {}
          statusVm.setPianoErrorHandler()
        }
        popup.info(title, msg, okCallback, label, true)
      }

      confirm()
    },

    // MIDI
    getMidiCh () {
      const param = PIANO.get('MIDIChannel')
      if (param) {
        const obj = { ...param.System }
        this.midiCh = { ...this.midiCh, value: obj.value, isShown: true }
      } else {
        this.midiCh = { ...this.midiCh, isShown: false }
      }
      if (this.title === this.menuText.midi['name' + this.lang]) {
        this.$nextTick(()=> {
          this.rescaleMidiCh()
        })
      }
    },
    selectMidiCh (num) {
      PIANO.set('MIDIChannel', {value: num}, 'System')
      this.getMidiCh()
    },
    rescaleMidiCh () {
      const scale = 36 / Math.sqrt(this.ViewportScale) + 'px'
      const margin = 6 * Math.sqrt(this.ViewportScale) + 'px'
      const top = document.querySelector('.midi-ch__btns__top')
      const middle = document.querySelector('.midi-ch__btns__middle')
      const bottom = document.querySelector('.midi-ch__btns__bottom')
      const btns = document.querySelectorAll('.midi-ch__btn')
      const labels = document.querySelectorAll('.midi-ch__btn-label')
      top.style.height = scale
      top.style.marginTop = margin
      top.style.marginBottom = margin
      middle.style.height = scale
      middle.style.marginBottom = margin
      bottom.style.height = scale
      bottom.style.marginBottom = margin
      btns.forEach(btn => {
        btn.style.height = scale
        btn.style.width = scale
      })
      labels.forEach(label => {
        label.style.height = scale
        label.style.width = scale
        label.style.lineHeight = scale
      })
    },
    getLocalCtrl () {
      const param = PIANO.get('LocalControl')
      if (param) {
        const obj = { ...param.System }
        let isOn
        const label = {
          on: asset.buttonLabel.on['name' + this.lang],
          off: asset.buttonLabel.off['name' + this.lang]
        }
        if (obj.value === 'Off' || !obj.value) {
          isOn = false
        } else {
          isOn = true
        }
        this.localCtrl = { ...this.localCtrl, isOn: isOn, label: label, isShown: true }
      } else {
        this.localCtrl = { ...this.localCtrl, isShown: false }
      }
    },
    onOffLocalCtrl () {
      if (this.localCtrl.isOn) {
        PIANO.set('LocalControl', {value: 'Off'}, 'System')
      } else {
        PIANO.set('LocalControl', {value: 'On'}, 'System')
      }
      this.getLocalCtrl ()
    },
    getPcSend () {
      const param = PIANO.get('TransmitProgramChange')
      if (param) {
        const obj = { ...param.System }
        let isOn
        const label = {
          on: asset.buttonLabel.on['name' + this.lang],
          off: asset.buttonLabel.off['name' + this.lang]
        }
        if (obj.subValue === 'Off' || !obj.subValue) {
          isOn = false
        } else {
          isOn = true
        }
        this.pcSend = { ...this.pcSend, isOn: isOn, label: label, isShown: true }
      } else {
        this.pcSend = { ...this.pcSend, isShown: false }
      }
    },
    onOffPcSend () {
      if (this.pcSend.isOn) {
        PIANO.set('TransmitProgramChange', {value: 0, subValue: 'Off'}, 'System')
      } else {
        PIANO.set('TransmitProgramChange', {value: 0, subValue: 'On'}, 'System')
      }
      this.getPcSend ()
    },
    getMultiTimbre () {
      const param = PIANO.get('MultiTimbralMode')
      const available = mainVm.CurrentSound.availableParams.indexOf('multiTimbre') >= 0 ? true : false
      if (param && available) {
        const obj = { ...param.System }
        this.multiTimbre = { ...this.multiTimbre, ...obj, isShown: true }
      } else {
        this.multiTimbre = { ...this.multiTimbre, isShown: false }
      }
    },
    selectMultiTimbre (item) {
      PIANO.set('MultiTimbralMode', {value: item.index}, 'System')
      this.getMultiTimbre()
    },
    nextMultiTimbre () {
      const i = this.multiTimbre.value + 1
      PIANO.set('MultiTimbralMode', {value: i}, 'System')
      this.getMultiTimbre()
    },

    // USB Audio IF
    getUsbAudio () {
      const param = PIANO.get('UsbAudioInputVolume')
      if (param) {
        const obj = { ...param.System }
        this.usbAudio = { ...this.usbAudio, ...obj, isShown: true }
      } else {
        this.usbAudio = { ...this.usbAudio, isShown: false }
      }
    },
    changeUsbAudio (value) {
      PIANO.set('UsbAudioInputVolume', { value })
      this.getUsbAudio()
    },
    checkUsbAudioAvailable () {
      const model = PIANO.Model
      const ua = DATABASE.SysEx.find(obj=> obj.parameter === 'UsbAudioInputVolume')
      let result
      Object.keys(ua).forEach(key=> { if (model === key) result = ua[key] })
      return (result) ? true : false
    },

    // User Data
    savePianoSettings () {
      const confirm =()=> {
        const title = asset.messages.confirmSaveSettings['title' + this.lang]
        const msg = asset.messages.confirmSaveSettings['description' + this.lang]
        const label = asset.messages.confirmSaveSettings['label' + this.lang]
        const okCallback =()=> {
          executing()
        }
        popup.confirm(title, msg, okCallback, null, label, false)
      }
      const executing =()=> {
        const title = asset.messages.progressSaveSettings['title' + this.lang]
        const msg = asset.messages.progressSaveSettings['description' + this.lang]
        popup.inProgress(title, msg)
        MIDI.OUT([0xF0, 0x40, 0x7F, 0x32, 0x08, 0x02, 0x51, 0x34, 0x7F, 0x07, 0x00, 0x7F, 0x7F, 0xF7], PIANO.DeviceID)
        setTimeout(()=> { completed() }, 3000)
      }
      const completed =()=> {
        const title = asset.messages.completeSaveSettings['title' + this.lang]
        const msg = asset.messages.completeSaveSettings['description' + this.lang]
        const label = asset.messages.completeSaveSettings['label' + this.lang]
        const okCallback =()=> {}
        popup.info(title, msg, okCallback, label, true)
      }
      confirm()
    },
    resetSoundFavorite () {
      const title = asset.menu.userSettings.confirmTitle['name' + this.lang]
      const msg = asset.menu.userSettings.confirmSoundFavorite['name' + this.lang]
      const okCallback =()=> {
        PIANO.set('Sound', 'ClearFavorite')
        mainVm.$forceUpdate()
        mainVm.setSoundsUi()
        mainVm.moveCategory('all')
      }
      const cancelCallback =()=> {}
      const label = {
        true: asset.buttonLabel.ok['name' + this.lang],
        false: asset.buttonLabel.cancel['name' + this.lang]
      }
      popup.confirm(title, msg, okCallback, cancelCallback, label, false)
    },
    resetSoundRecently () {
      const title = asset.menu.userSettings.confirmTitle['name' + this.lang]
      const msg = asset.menu.userSettings.confirmSoundRecently['name' + this.lang]
      const okCallback =()=> {
        PIANO.set('Sound', 'ClearRecently')
        mainVm.$forceUpdate()
        mainVm.setSoundsUi()
        mainVm.moveCategory('all')
      }
      const cancelCallback =()=> {}
      const label = {
        true: asset.buttonLabel.ok['name' + this.lang],
        false: asset.buttonLabel.cancel['name' + this.lang]
      }
      popup.confirm(title, msg, okCallback, cancelCallback, label, false)
    },
    resetSoundUser () {
      const title = asset.menu.userSettings.confirmTitle['name' + this.lang]
      const msg = asset.menu.userSettings.confirmSoundUser['name' + this.lang]
      const okCallback =()=> {
        PIANO.set('Sound', 'ClearUserCategory')
        mainVm.$forceUpdate()
        mainVm.setSoundsUi()
        mainVm.moveCategory('all')
      }
      const cancelCallback =()=> {}
      const label = {
        true: asset.buttonLabel.ok['name' + this.lang],
        false: asset.buttonLabel.cancel['name' + this.lang]
      }
      popup.confirm(title, msg, okCallback, cancelCallback, label, false)
    },
    resetMusicFavorite () {
      const title = asset.menu.userSettings.confirmTitle['name' + this.lang]
      const msg = asset.menu.userSettings.confirmMusicFavorite['name' + this.lang]
      const okCallback =()=> {
        if (this.EmbeddedMode) {
          PIANO.set('Music', 'ClearFavorite')
        } else {
          musicVm.m.clearFavorite()
        }
        mainVm.reloadList()
        mainVm.$forceUpdate()
      }
      const cancelCallback =()=> {}
      const label = {
        true: asset.buttonLabel.ok['name' + this.lang],
        false: asset.buttonLabel.cancel['name' + this.lang]
      }
      popup.confirm(title, msg, okCallback, cancelCallback, label, false)
    },
    resetMusicRecently () {
      const title = asset.menu.userSettings.confirmTitle['name' + this.lang]
      const msg = asset.menu.userSettings.confirmMusicRecently['name' + this.lang]
      const okCallback =()=> {
        if (this.EmbeddedMode) {
          PIANO.set('Music', 'ClearRecently')
        } else {
          musicVm.m.clearRecently()
        }
        mainVm.reloadList()
        mainVm.$forceUpdate()
      }
      const cancelCallback =()=> {}
      const label = {
        true: asset.buttonLabel.ok['name' + this.lang],
        false: asset.buttonLabel.cancel['name' + this.lang]
      }
      popup.confirm(title, msg, okCallback, cancelCallback, label, false)
    },
    resetMusicRecorder () {
      const title = asset.menu.userSettings.confirmTitle['name' + this.lang]
      const msg = asset.menu.userSettings.confirmMusicRecorder['name' + this.lang]
      const okCallback =()=> {
        if (this.EmbeddedMode) {
          // PIANO.set('Music', 'DeleteAll')
          PIANO.set('RecControl', 'delete', 'All', true)
          playerVm.exitPlayer(true)
          recVm.exitRecorder(true)
        } else {
          musicVm.m.deleteAll()
        }
        mainVm.reloadList()
        mainVm.$forceUpdate()
      }
      const cancelCallback =()=> {}
      const label = {
        true: asset.buttonLabel.ok['name' + this.lang],
        false: asset.buttonLabel.cancel['name' + this.lang]
      }
      popup.confirm(title, msg, okCallback, cancelCallback, label, false)
    },
    resetAll () {

      const confirm =()=> {
        const title = asset.menu.userSettings.confirmTitle['name' + this.lang]
        const msg = asset.menu.userSettings.confirmFactoryReset['name' + this.lang]
        const label = {
          true: asset.buttonLabel.ok['name' + this.lang],
          false: asset.buttonLabel.cancel['name' + this.lang]
        }
        const okCallback =()=> {
          executing()
        }
        popup.confirm(title, msg, okCallback, null, label, false)
      }
      const executing =()=> {
        const title = asset.menu.userSettings.confirmTitle['name' + this.lang]
        const msg = asset.menu.userSettings.progressFactoryReset['name' + this.lang]
        popup.inProgress(title, msg)
        MIDI.OUT([0xF0, 0x40, 0x7F, 0x32, 0x08, 0x02, 0x51, 0x36, 0x7F, 0x04, 0x7F, 0x7F, 0x7F, 0xF7], PIANO.DeviceID)
        PIANO.set('Sound', 'ClearFavorite')
        PIANO.set('Sound', 'ClearRecently')
        PIANO.set('Sound', 'ClearUserCategory')
        if (this.EmbeddedMode) {
          PIANO.set('Music', 'ClearFavorite')
          PIANO.set('Music', 'ClearRecently')
          PIANO.set('RecControl', 'delete', 'All', false)
        } else {
          musicVm.m.clearFavorite()
          musicVm.m.clearRecently()
          musicVm.m.deleteAll()
        }
        KawaipianoJs.initUserData()
        this.initSettings()
        ChordDictionary.resetType()
        setTimeout(()=> { completed() }, 3000)
      }
      const completed =()=> {
        const title = asset.menu.userSettings.confirmTitle['name' + this.lang]
        const msg = asset.menu.userSettings.completeFactoryReset['name' + this.lang]
        const label = asset.messages.usbFormatCompleted['label' + this.lang]
        const okCallback =()=> {
          popup.loading()
          setTimeout(()=>{ location.reload() }, 1000)
        }
        popup.info(title, msg, okCallback, label, true)
      }

      confirm()
    },

    // System Settings
    // getLcdContrast () {
    //   KWM.getLcdBacklight().then((result)=> {
    //     console.log('LCD JNI Value', result)
    //     this.lcdContrast = result.lcdBrightness
    //   }).catch(()=> {
    //     console.error("getLcdBacklight failed.")
    //   })
    // },
    changeLcdContrast (val) {
      const v = (Math.floor(val) > 5 ) ? Math.floor(val) : 5
      if (this.lcdContrast !== v) {
        this.lcdContrast = v
        KWM.setLcdBacklight(v)
      }
      this.saveSettings()
    },
    getViewportScale () {
      let list = []
      for (const item of asset.menu.displayScaleEnum) {
        list.push(item['name' + this.lang])
      }
      this.displayScale = { ...this.displayScale, valueList: list }
    },
    selectViewportScale (item) {
      this.displayScale = { ...this.displayScale, value: item.index }
      this.setViewportScale(item.index)
      this.getViewportScale()
    },
    setViewportScale (num) {
      if (!mainVm.EmbeddedMode) { return }
      const scale = 8 / ( 7 - Math.floor(num) )
      this.ViewportScale = scale
      this.rescaleMenuLabels()
      // this.ViewportScale = num
      document.querySelector('[name=viewport]').content = "initial-scale=" + scale + " user-scalable=no viewport-fit=cover"
      this.saveSettings()
    },
    getDisplayOff () {
      let list = []
      for (const item of asset.menu.displayOffEnum) {
        list.push(item['name' + this.lang])
      }
      this.displayOff = {...this.displayOff, valueList: list}
      this.startDisplayOffTimer()
    },
    startDisplayOffTimer () {
      const v = (this.lcdContrast) ? this.lcdContrast : 100
      KWM.setLcdBacklight(v)
      this.stopDisplayOffTimer()
      const time = this.displayOff.time[this.displayOff.value]
      this.screenSaver = { ...this.screenSaver, isActive: false }
      if (time) {
        this.displayOff = {...this.displayOff, isOn: false}
        this.displayOffTimer = setTimeout (()=>{
          this.screenSaver.isOn ? this.showScreenSaver() : this.setDisplayOff()
        }, time)
      }
    },
    stopDisplayOffTimer () {
      clearTimeout(this.backlightOffTimer)
      clearTimeout(this.displayOffTimer)
      this.stopScreenSaver()
      this.displayOffTimer = ''
      this.backlightOffTimer = ''
    },
    setDisplayOff () {
      const backlightOff =()=> {
        KWM.setLcdBacklight(0)
      }
      const timer = setTimeout (backlightOff, 2000)
      this.displayOff = {...this.displayOff, isOn: true}
      this.backlightOffTimer = timer
    },
    selectDisplayOff (item) {
      this.displayOff = {...this.displayOff, value: item.index}
      this.screenSaver.isShown = (this.isGp && item.index !== 0) ? true : false
      this.getDisplayOff()
      this.saveSettings()
    },
    selectScreenSaver (item) {
      const isOn = (item.index) ? true : false
      this.screenSaver = {...this.screenSaver, value: item.index, isOn: isOn}
      this.saveSettings()
    },
    showScreenSaver () {
      this.displayOff = { ...this.displayOff, isOn: true }
      this.screenSaver = { ...this.screenSaver, isActive: true }
      if (this.screenSaver.isStop) {
        this.stopScreenSaver()
      } else {
        this.runScreenSaver()
      }
    },
    runScreenSaver () {
      this.screenSaverTimer = setInterval(()=> { this.changeScreenSaver() }, 10000)
    },
    changeScreenSaver () {
      const photoNum = (this.screenSaver.photo >= 40) ? 0 : this.screenSaver.photo + 1
      // const photoNum = (this.screenSaver.photo >= this.photoNums - 1) ? 0 : this.screenSaver.photo + 1
        this.screenSaver = { ...this.screenSaver, photo: photoNum }
        // v-ifで画面を切り替えるとcssが効かないので、フェード効果を遅延
        setTimeout(()=> {
          this.screenSaver = {...this.screenSaver, transition: photoNum}
        }, 1000)
    },
    stopScreenSaver () {
      clearInterval(this.screenSaverTimer)
    },
    toggleScreenSaver () {
      this.showScreenSaverState()
      this.screenSaver.isStop = !this.screenSaver.isStop
      if (this.screenSaver.isStop) {
        this.stopScreenSaver()
      } else {
        this.changeScreenSaver()
        this.runScreenSaver()
      }
    },
    showScreenSaverState () {
      const el = document.querySelector('.screen-saver__state')
      if (el) {
        el.classList.add('screen-saver__state--visible')
        setTimeout(()=> { el.classList.remove('screen-saver__state--visible') }, 1000)
      } else { return }
    },
    getPowerOff () {
      const param = PIANO.get('AutoPowerOff')
      if (param) {
        const obj = { ...param.System }
        obj.valueList = obj['valueList' + this.lang]
        obj.isSafe = (param.System.value === 1)
        this.powerOff = { ...this.powerOff, ...obj, isShown: true }
      } else {
        this.powerOff = { ...this.powerOff, isShown: false }
      }
    },
    selectPowerOff (item) {
      if (this.powerOff.isSafe && item.index !== 1 && !this.isDemoMode) {
        mainVm.showPowerConsumptionNotify()
      }
      PIANO.set('AutoPowerOff', { value: item.index }, 'System')
      this.getPowerOff()
    },
    getStartUpWindow () {
      const value = this.startUpWindow.value
      let list = []
      for (const item of asset.menu.startUpWindowEnum) {
        list.push(item['name' + this.lang])
      }
      const desc = asset.menu.startUpWindowEnum[value]['description' + this.lang]
      this.startUpWindow = {...this.startUpWindow, value: value, valueList: list, description: desc}
    },
    selectStartUpWindow (item) {
      this.startUpWindow = {...this.startUpWindow, value: item.index}
      this.getStartUpWindow()
      this.saveSettings()
    },
    getStartUpSettings () {
      let val
      let list = []
      if (USER.CacheMode === 'init') {
        val = 0
      } else if (USER.CacheMode === 'user') {
        val = 1
      } else if (USER.CacheMode === 'auto') {
        val = 2
      }
      for (const item of asset.menu.startUpSettingsEnum) {
        list.push(item['name' + this.lang])
      }
      const desc = asset.menu.startUpSettingsEnum[val]['description' + this.lang]
      this.startUpSettings = {...this.startUpSettings, value: val, valueList: list, description: desc}
    },
    selectStartUpSettings (item) {
      this.startUpSettings = {...this.startUpSettings, value: item.index}
      if (this.startUpSettings.value === 0) {
        KawaipianoJs.setCacheMode('init')
      } else if (this.startUpSettings.value === 1) {
        KawaipianoJs.setCacheMode('user')
      } else if (this.startUpSettings.value === 2) {
        KawaipianoJs.setCacheMode('auto')
      }
      this.getStartUpSettings()
    },
    getLanguage () {
      let value, valueList, description, languageEnum
      if (this.EmbeddedMode) {
        value = (PIANO.Language === 'EN') ? 0 : 1
        languageEnum = asset.menu.languageEnum.filter(item => item.name !== 'Chinese')
      } else {
        value = (this.lang === '') ? 0 : (this.lang === 'Ja') ? 1 : 2
        languageEnum = asset.menu.languageEnum.map(item => item)
      }
      const keyList = (this.EmbeddedMode) ? ['name', 'nameJa'] : ['name', 'nameJa', 'nameZh']
      const keys = keyList.filter((name, index) => index !== value)
      valueList = languageEnum.map(item => item['name' + this.lang])
      description = keys.map(key => languageEnum[value][key]).join(', ')
      this.language = { ...this.language, value, valueList, description }
    },
    setLanguage (i) {
      const value = i
      const langList = (this.EmbeddedMode) ? ['EN', 'JA'] : ['EN', 'JA', 'ZH']
      const viewLangList = (this.EmbeddedMode) ? ['', 'Ja'] : ['', 'Ja', 'Zh']
      const titleList = (this.EmbeddedMode) ? ['System', 'システム'] : ['System', 'システム', '系统']
      PIANO.set('Language', langList[value])
      this.title = titleList[value]
      this.language = { ...this.language, value }
      mainVm.lang = viewLangList[value]
      const temporaryData = KawaipianoJs.makeCache()
      PIANO.Parameters = {}
      PIANO.ExternalStrage.splice(0)
      PIANO.set('All', temporaryData, false)
      mainVm.init()
      this.getParams()
      switch (mainVm.Tab) {
        case 0: {
          mainVm.setPianoUi()
          break
        }
        case 1: {
          mainVm.NaviBarTitle = ''
          mainVm.getCurrentSound()
          mainVm.setSoundsUi()
          break
        }
        case 2: {
          const card = mainVm.getMusicCategory()
          mainVm.MusicTab = { ...mainVm.MusicTab, categoryCard: card }
          mainVm.getMusicCategoryCard()
          mainVm.showTopPage()
          break
        }
      }
    },
    selectLanguage (item) {
      const fontFamily = (item.index === 2) ? "Roboto, 'Noto Sans SC', sans-serif" : "Roboto, 'Noto Sans JP', sans-serif"
      const root = document.querySelector(':root')
      root.style.setProperty('--CA-font-family', fontFamily)
      this.setLanguage(item.index)
      this.saveSettings()
    },
    getHymn () {
      const param = PIANO.get('HymnPlayer')
      if (param) {
        const obj = { ...param.System }
        let isOn
        const label = {
          on: asset.buttonLabel.on['name' + this.lang],
          off: asset.buttonLabel.off['name' + this.lang]
        }
        if (obj.value === 'Off' || !obj.value) {
          isOn = false
        } else {
          isOn = true
        }
        this.hymn = { ...this.hymn, isOn: isOn, label: label, isShown: true }
      } else {
        this.hymn = { ...this.hymn, isShown: false }
      }
    },
    onOffHymn () {
      if (this.hymn.isOn) {
        PIANO.set('HymnPlayer', {value: 'Off'}, 'System')
      } else {
        PIANO.set('HymnPlayer', {value: 'On'}, 'System')
      }
      this.getHymn ()
      mainVm.getMusicCategoryCard()
      mainVm.$forceUpdate()
    },
    openInfoWindow () {
      updateVm.isShown = true
      updateVm.getVersion ()
    },
    saveSettings () {
      if (this.isSaved || MIDI.API !== 'KWMcore') { return }
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = setTimeout(()=> {
        const obj = {
          appVersion: version,
          lcdContrast: this.lcdContrast,
          // viewportScale: this.ViewportScale,
          viewportScale: this.displayScale.value,
          displayOff: this.displayOff.value,
          defaultTab: this.startUpWindow.value,
          bleMidiName: this.bleMidiName.name,
          format: this.format.value,
          usbRecFormat: this.usbRecFormat.value,
          soundRec: this.soundRec.value,
          inputVol: this.inputVol.value,
          language: this.language.value,
          // normalize: this.normalize.value,
          isGpDemo: this.isGpDemo,
        }
        if (this.isGp) { obj.screenSaver = this.screenSaver.value }
        console.warn('saveJson', obj)
        KWM.saveJson('user/uicache.json', obj)
      }, 2000)
    },
    loadSettings () {
      if (MIDI.API !== 'KWMcore') { return }
      const obj = mainVm.UiCache
      console.log('load settings', obj)
      if (Object.keys(obj).length) {
        if (mainVm.EmbeddedMode) {
          this.changeLcdContrast(obj.lcdContrast)
          let scale = 1
          if (!obj.appVersion) {
            scale = ([0, 1, 2].includes(obj.viewportScale)) ? 0 : (obj.viewportScale === 3) ? 1 : 2
          } else {
            scale = obj.viewportScale
          }
          this.selectViewportScale({ index: scale })
          this.selectDisplayOff({ index: obj.displayOff })
          this.selectUsbRecFormat({ index: obj.usbRecFormat })
        } else {
          if (obj.format) { this.format = { ...this.format, value: obj.format } }
          if (obj.usbRecFormat) { this.usbRecFormat = { ...this.usbRecFormat, value: obj.usbRecFormat } }
          if (obj.soundRec) { this.soundRec = { ...this.soundRec, value: obj.soundRec } }
          if (obj.inputVol) { this.inputVol = { ...this.inputVol, value: obj.inputVol } }
          if (obj.bleMidiName) { this.bleMidiName = { ...this.bleMidiName, name: obj.bleMidiName } }
          // if (obj.normalize) { this.normalize = { ...this.normalize, value: obj.normalize } }
        }
        this.selectStartUpWindow({ index: obj.defaultTab })
        this.isGpDemo = obj.isGpDemo

        // ピアノ本体の言語設定と、ユーザーが設定した言語が違う場合、ユーザー設定の言語に変更
        if (obj.language !== undefined) {
          const savedlang = ['EN', 'JA', 'ZH'][obj.language]
          if (PIANO.Language !== savedlang) { this.setLanguage(obj.language) }
        }

        this.isInitDataLoaded = true
      }
      if (this.isGp && mainVm.EmbeddedMode) { this.selectScreenSaver({ index: obj.screenSaver }) }
    },

    // Chord Dictionary
    setChordDictionaryMode () {
      if (this.chord.isOn) {
        this.chord = { ...this.chord, isOn: false}
        if (this.EmbeddedMode) {
          recVm.chordDictionary = false
        } else {
          musicVm.chordDictionary = false
        }
        metroVm.chordDictionary = false
    } else {
        this.chord = {...this.chord, isOn: true}
        this.$nextTick(()=>{
          ChordDictionary.open()
          if (this.EmbeddedMode) {
            recVm.chordDictionary = true
          } else {
            musicVm.chordDictionary = true
          }
          metroVm.chordDictionary = true
        })
      }
    },

    initSettings () {
      const obj = {
        appVersion: version,
        lcdContrast: 100,
        viewportScale: 1,
        displayOff: 0,
        defaultTab: 0,
        bleMidiName: null,
        format: 0,
        usbRecFormat: 0,
        soundRec: true,
        inputVol: 0.5,
        // normalize: false,
        isGpDemo: false
      }
      console.warn('saveJson', obj)
      KWM.saveJson('user/uicache.json', obj)
    },

  }
})

const eqVm = new Vue ({
  el: '#eq',
  data: {
    isShown: false,
    gainLow: { isShown: false },
    gainMidLow: { isShown: false },
    gainMidHigh: { isShown: false },
    gainHigh: { isShown: false },
    freqMidLow: { isShown: false },
    freqMidHigh: { isShown: false },
    freqEnum : [
      '200Hz',
      '224Hz',
      '250Hz',
      '280Hz',
      '315Hz',
      '355Hz',
      '400Hz',
      '450Hz',
      '500Hz',
      '560Hz',
      '630Hz',
      '710Hz',
      '800Hz',
      '900Hz',
      '1.0kHz',
      '1.12kHz',
      '1.25kHz',
      '1.4kHz',
      '1.6kHz',
      '1.8kHz',
      '2.0kHz',
      '2.24kHz',
      '2.5kHz',
      '2.8kHz',
      '3.15kHz',
      '3.5kHz',
      '4.0kHz',
      '4.5kHz',
      '5.0kHz',
      '5.6kHz',
      '6.3kHz',
      '7.1kHz',
      '8.0kHz'
    ]
  },
  computed: {
    lang: ()=> {
      return mainVm.lang
    },
    text: ()=> {
      return asset.eq
    }
  },
  methods: {
    getParamName (item) {
      const name = 'UserEq' + item.slice(0, 1).toUpperCase () + item.slice(1)
      return name
    },
    getUiParams () {
      this.getUiParam('gainLow')
      this.getUiParam('gainMidLow')
      this.getUiParam('gainMidHigh')
      this.getUiParam('gainHigh')
      this.getUiParam('freqMidLow')
      this.getUiParam('freqMidHigh')
    },
    getUiParam(item) {
      const paramName = this.getParamName(item)
      const param = PIANO.get(paramName)
      const type = item.slice(0, 4)
      if (param) {
        const obj = { ...param.System }
        if (type === 'gain') {
          this[item] = { ...this[item],
            value: obj.value,
            valueMax: 6,
            valueMin: -6,
            valueType: obj.valueType,
            isShown: true
          }
        } else {
          const array = this.freqEnum
          let d = 100
          let v = 0
          array.forEach ((value, index)=> {
            const valueNum = (value.slice(-3) === 'kHz') ? parseFloat(value.slice(0, -3))*1000 : Number(value.slice(0, -2))
            const diff = Math.abs(obj.value - valueNum)
            if (d >= diff) {
              d = diff
              v = index
            }
          })
          this[item] = { ...this[item],
            value: v,
            valueList: this.freqEnum,
            valueType: obj.valueType,
            isShown: true
          }
        }
      } else {
        this[item] = { ...this[item], isShown: false }
      }
    },
    changeGainLow (value) {
      PIANO.set('UserEqGainLow', {value: value}, 'System')
      this.gainLow = { ...this.gainLow, value: value }
    },
    changeGainMidLow (value) {
      PIANO.set('UserEqGainMidLow', {value: value}, 'System')
      this.gainMidLow = { ...this.gainMidLow, value: value }
    },
    changeGainMidHigh (value) {
      PIANO.set('UserEqGainMidHigh', {value: value}, 'System')
      this.gainMidHigh = { ...this.gainMidHigh, value: value }
    },
    changeGainHigh (value) {
      PIANO.set('UserEqGainHigh', {value: value}, 'System')
      this.gainHigh = { ...this.gainHigh, value: value }
    },
    selectFreqMidLow (value) {
      const valueNum = (value.selected.slice(-3) === 'kHz') ? parseFloat(value.selected.slice(0, -3))*1000 : Number(value.selected.slice(0, -2))
      PIANO.set('UserEqFreqMidLow', {value: valueNum}, 'System')
    },
    selectFreqMidHigh (value) {
      const valueNum = (value.selected.slice(-3) === 'kHz') ? parseFloat(value.selected.slice(0, -3))*1000 : Number(value.selected.slice(0, -2))
      PIANO.set('UserEqFreqMidHigh', {value: valueNum}, 'System')
    },
    closeUserEqEditor () {
      this.isShown = false
    }
  }
})

const statusVm = new Vue ({
  el: '#status-bar',
  data: {
    isShown: true,
    hp: false,
    usb: false,
    bt: false,
  },
  computed: {
    EmbeddedMode: ()=> {
      return mainVm.EmbeddedMode
    },
    lang: ()=> {
      return mainVm.lang
    }
  },
  created: function () {
    PIANO.onHeadphonesStatus =(event)=> {
      this.hp = event
    }
    PIANO.onUsbStatus =(event)=> {
      const previous = this.usb
      this.usb = event
      if (menuVm.isShown) { menuVm.getMenuContents() }
      if (previous && !event) { this.detachUsbMemory() }
    }
    this.setPianoErrorHandler()
  },
  methods: {
    KawaipianoJsSynced () {
      if (!this.EmbeddedMode){ return }
      this.getHeadphoneStatus().then (this.getUsbMemoryStatus)
      if (PIANO.Destination.bluetooth) {
        menuVm.getBluetooth()
      }
    },
    getHeadphoneStatus () {
      return new Promise ((resolve, reject)=> {
        PIANO.onHandshakeEnd =(msg)=> {if (msg[0] === 0x51, msg[1] === 0x29) { resolve() }　else { reject() } }
        console.log('%cHeadphones Status Request', 'color: green')
        MIDI.OUT([0xF0, 0x40, 0x7F, 0x02, 0x08, 0x02, 0x51, 0x29, 0x7F, 0xF7], PIANO.DeviceID) // Headphones Status Request
      })
    },
    getUsbMemoryStatus () {
      return new Promise ((resolve, reject)=> {
        PIANO.onHandshakeEnd =(msg)=> {if (msg[0] === 0x51, msg[1] === 0x2E) { resolve() }　else { reject() } }
        console.log('%cUSB Memory Status Request', 'color: green')
        MIDI.OUT([0xF0, 0x40, 0x7F, 0x02, 0x08, 0x02, 0x51, 0x2E, 0x7F, 0xF7], PIANO.DeviceID) // USB Memory Status Request
      })
    },
    setPianoErrorHandler () {
      PIANO.onPianoError =(obj)=> {
        if (obj === 'musicStopWorning') {
          const title = asset.messages.musicStopWorning['title' + this.lang]
          const msg = asset.messages.musicStopWorning['description' + this.lang]
          const okCallback =()=> {
            if (this.EmbeddedMode) {
              playerVm.exitPlayer()
              recVm.exitRecorder(true)
            } else {
              musicVm.init()
            }
          }
          const cancelCallback =()=> {
            if (this.EmbeddedMode) { recVm.exitRecorder(true) } else { musicVm.init() }
          }
          const label = asset.messages.musicStopWorning['label' + this.lang]
          popup.confirm(title, msg, okCallback, cancelCallback, label, false)

        } else if (obj === 'IntMemoryFull') {
          const title = asset.messages.recMemoryFull['title' + this.lang]
          const msg = asset.messages.recMemoryFull['description' + this.lang]
          const okCallback =()=> {
            Promise.resolve().then(PIANO.set('RecControl', 'delete', 'OldestIntSong'))
            if (this.EmbeddedMode) { recVm.exitRecorder(true) } else { musicVm.init() }
          }
          const cancelCallback =()=> {
            if (this.EmbeddedMode) { recVm.exitRecorder(true) } else { musicVm.init() }
          }
          const label = asset.messages.recMemoryFull['label' + this.lang]
          popup.confirm(title, msg, okCallback, cancelCallback, label, false)
        } else if (obj === 'recWorkerError') {
          if (!this.EmbeddedMode){ return }
          console.error('recWorkerError')
          recWorker.clearBuffHandler()
          if (this.EmbeddedMode) {
            playerVm.exitPlayer()
            recVm.exitRecorder(true)
          } else {
            musicVm.init()
          }
          const title = asset.messages.pianoControlError['title' + this.lang]
          const msg = asset.messages.pianoControlError['description' + this.lang]
          const callback =()=> { }
          popup.info(title, msg, callback, null, true)

        } else {
          console.log('7E Error', obj)
          if (!this.EmbeddedMode){ return }
          //ピアノ本体からエラーが来る時は続行不可のためとりあえず初期化する
          recWorker.clearBuffHandler()
          if (this.EmbeddedMode) {
            playerVm.exitPlayer()
            recVm.exitRecorder(true)
          } else {
            musicVm.init()
          }
          const title = asset.messages.pianoControlError['title' + this.lang]
          const msg = asset.messages.pianoControlError['description' + this.lang]
          const callback =()=> { }
          popup.info(title, msg, callback, null, true)
        }
      }
    },
    detachUsbMemory () {
      if (!this.EmbeddedMode){ return }
      this.$nextTick(()=> {
        if (PIANO.MusicMode === 'RecControl') {
          if (PIANO.RecControl.Selected.isUSBMusicPlayer) {
            if (this.EmbeddedMode) { recVm.exitRecorder(true) }
          } else if (PIANO.RecControl.Status === 'overdub') {
            if (this.EmbeddedMode) { recVm.overdubFileClear() } else { musicVm.overdubFileClear() }
          }
        } else if (PIANO.MusicMode === 'Music') {
          if (PIANO.Music.Mode === 'USBMusicPlayer') { playerVm.exitPlayer(true) }
          playerVm.getParams()
          mainVm.reloadList()
        }
        if (menuVm.isWindowShown && (menuVm.title === menuVm.menuText.usb['name' + this.lang])) {
          popup.init()
          menuVm.closeMenuWindow()
        }
      })
    }
  }
})

const updateVm = new Vue ({
  el: '#update',
  data: {
    isShown: false,
    current: '',
    latest: '',
    updateAvailable: false,
    status: 'init',
    // kawa.
    ui: { ver: { current: '', latest: '', isAvailable: false } },
    apk: { ver: { current: '', latest: '', isAvailable: true } },
    maincpu: { ver: { current: '', latest: '', isAvailable: false } },
    jni: { ver: { current: '', latest: '', isAvailable: false } },
    bleMidi: { ver: { current: '', latest: '', isAvailable: false } },
    os: { ver: { current: '', latest: '', isAvailable: false } },
    cheatCode: ['上', '上', '下', '下', '左右', '左右', '左右', '左右', 'BA', 'BA'],
    inputCount: 0,
    // TODO: チェック用、本番ではトル
    BindLog: {}
  },

  computed: {
    lang: ()=> {
      return mainVm.lang
    },
    EmbeddedMode: ()=> {
      return mainVm.EmbeddedMode
    },
    versionTitle() {
      return asset.about.version.title
    },
    updateStatus() {
      return asset.about.version.status
    },

    isAures: ()=> {
      return menuVm.isAures
    },
    isDevMode() {
      // TODO: 本番では、開発者モードコメントアウトをはずす
      // return updateVm.inputCount === updateVm.cheatCode.length
      return this.inputCount === this.cheatCode.length
      // return true
    },
    uiTitle() {
      return this.versionTitle.UI['name' + this.lang]
    },
    appTitle() {
      let name = 'name' + (this.EmbeddedMode ? 'Embed' : '') + this.lang
      return this.versionTitle.app[name]
    },
    fwTitle() {
      let name = 'name' + (this.EmbeddedMode ? 'Embed' : '') + this.lang
      return this.versionTitle.firmware[name]
    },
    licenseTitle() {
      return asset.about.license.title['name' + this.lang]
    },
    licenseClose() {
      return asset.about.license.close['name' + this.lang]
    },
    updateTitle() {
      return this.updateStatus.update['title' + this.lang]
    },
    completedTitle() {
      return this.updateStatus.completed['title' + this.lang]
    },
    errorTitle() {
      return this.updateStatus.error['title' + this.lang]
    },
    updateText() {
      return this.updateStatus.update['text' + this.lang]
    },
    completedText() {
      return this.updateStatus.completed['text' + this.lang]
    },
    errorText() {
      return this.updateStatus.error['text' + this.lang]
    },

    // TODO: チェック用、本番ではトル
    bindlog: ()=> {
      return this.BindLog
    },
  },

  methods: {
    // get version
    getVersion () {
      KWM.getVersions()
      this.ui.ver = {...this.ui.ver, current: version}
      // : UI
      this.current = this.ui.ver.current
      this.latest = KWM.latestUiVersion
      if (this.latest === '' || this.latest === this.current) {
        console.log('local UI is latest')
        this.updateAvailable = false
      } else {
        console.log('UI update is available', {Current: this.current, Latest: this.latest})
        this.updateAvailable = true
      }
      this.ui.ver.isAvailable = this.updateAvailable
      // : APK
      this.apk.ver.current = KWM.localAppVersion
      this.apk.ver.latest = KWM.latestAppVersion
      if (this.apk.ver.latest === '' || this.apk.ver.latest === this.apk.ver.current) {
        console.log('local Apk is latest')
        this.updateApkAvailable = false
      } else {
        console.log('Apk update is available', {Current: this.apk.ver.current, Latest: this.apk.ver.latest})
        this.updateApkAvailable = true
      }
      this.apk.ver.isAvailable = this.updateApkAvailable
      // : MainCPU
      this.maincpu.ver.current = PIANO.Version
      // : JNI
      KWM.getJniVersion().then((result) => {
        this.jni.ver.current = result.version
      })
      // : Bluetooth
      // let id = this.selectedDeviceId // kwmcoretest > js > applicationCache.js > KWMtest11
      // let id = 0
      // KWM.getDeviceBleMidiVersion(id).then((result) => {
      //   this.bleMidi.ver.current = result
      // })
      // : OS
    },
    // : UI
    updateUi() {
      this.status = 'update'
      const update =()=> {
        KWM.downloadUiData().then(()=> {
          KWM.updateUiData().then((result)=> {
            this.status = result ? 'completed' : 'error'
          })
        }).catch(()=> { this.status = 'error' })
      }
      setTimeout(()=>{ update() }, 100)
    },
    // : APK
    updateApk() {
      this.status = 'update'
      const name = "PianoRemote.apk"
      const update =()=> {
        KWM.updateApk(name).then((result) => {
          this.status = result ? 'completed' : 'error'
        }).catch(()=> { this.status = 'error' })
      }
      setTimeout(()=>{ update() }, 100)
    },
    // : MainCPU
    // : JNI
    // : Bluetooth
    updateBleMidi() {
      // this.status = 'update'
      // KWM.downloadBleMidiFirmware().then(() => {
      //   // let id = this.selectedDeviceId
      //   let id = 0
      //   const progresscallback = function (callback) {
      //     let progress = callback.progress
      //     console.log(progress)
      //     // this.updateProgress = progress
      //   }
      //   KWM.updateBleMidiFirmware(id, progresscallback)
      // })
    },
    // : OS
    // updateOs() {},
    viewLicense() {
      const title = this.licenseTitle
      const msg = (this.EmbeddedMode) ? asset.about.license.body +  asset.about.license.embeded : asset.about.license.body
      const callback = null
      const okText = this.licenseClose
      const isAccentColor = true
      popup.info(title, msg, callback, okText, isAccentColor)
    },
    close () {
      this.isShown = false
      // this.tapCount = 0
      this.inputCount = 0
    },
    // cheat code
    tapTitle (title) {
      if (this.isDevMode) return

      if (title === this.cheatCode[this.inputCount]) {
        console.log(title + ' was input!')
        this.inputCount++
      } else {
        console.log("you input wrong code")
        this.inputCount = 0
      }
    },
    launchKwmTest () {
      location.href='../../developper/kwmcoretest/html/index.html'
    },
    launchOsSettings () {
      KWM.launchAndroidSettingsApp()
    },
    reload() {
      location.reload()
    }
  }
})


const touchVm = new Vue({
  data: {
    TouchSupport: true,
    tap: 0
  },
  created: function () {
    //タッチデバイス判定
    if (window.ontouchstart === null) { this.TouchSupport = true } else { this.TouchSupport = false }
    //タッチエリア設定
    this.setDoubleTap(this.singleTap, this.doubleTap, 300, true)
    // this.setTouchOn(this.displayOffTouchHandler, 500, true)
    this.setTouchOn(this.powerOffTouchHandler, 10000, false)
  },
  methods: {
    //Touch Detection
    setTouchOn (callback, timeFrame, eventPropagation) {
      let limiter = false
      const emitEvent =(e)=> {
        if (!limiter) {
          limiter = true
          const releaseLimiter =()=> { limiter = false }
          setTimeout (releaseLimiter, timeFrame)
          callback(e)
        }
      }
      document.addEventListener('touchend', (e)=>{
        emitEvent(e)
      },{ passive: !eventPropagation })
    },
    setDoubleTap (singleCallback, doubleCallback, timeFrame, eventPropagation) {
      const emitEvent =(e)=> {
        this.tap += 1
        const forkCallback =()=> {
          if (this.tap === 1) { singleCallback(e) }
          else if (this.tap === 2) { doubleCallback(e) }
          else return
        }
        const resetTap =()=> {
          forkCallback()
          this.tap = 0
        }
        setTimeout (resetTap, timeFrame)
      }
      document.addEventListener('touchstart', (e)=> {
        menuVm.stopDisplayOffTimer()
      }, { passive: !eventPropagation })
      document.addEventListener('touchend', (e)=> {
        emitEvent(e)
      }, { passive: !eventPropagation })
    },
    singleTap (e) {
      if (menuVm.screenSaver.isActive) { e.preventDefault() }
      menuVm.startDisplayOffTimer()
    },
    doubleTap (e) {
      if (menuVm.screenSaver.isActive) {
        e.preventDefault()
        menuVm.toggleScreenSaver()
      } else {
        menuVm.startDisplayOffTimer()
      }
    },
    //Touch Event Handler
    displayOffTouchHandler (e) {
      if(menuVm.displayOff.isOn) { e.preventDefault() }
      menuVm.startDisplayOffTimer()
      // console.log('Reset DisplayOffTimer')
    },
    powerOffTouchHandler () {
      if (PIANO.Sync && mainVm.EmbeddedMode) {
        MIDI.OUT(DATABASE.getMidi('PowerManagementTimerReset'), PIANO.DeviceID)
      }
      // console.log('Reset PowerOffTimer')
    }

  }
})

// 取説用画面キャプチャモード
const capture =()=> {
  statusVm.hp = true
  statusVm.usb = true
  statusVm.bt = true
  metroVm.counter.count = 2
  playerVm.progress = 58
  playerVm.captureMode = true
  playerVm.favorite = true
  playerVm.play = true
  playerVm.next = true
  playerVm.previous = true
  playerVm.repeat = true
  playerVm.shuffle = true
  playerVm.volume = 100
}
const eipolo =()=> {
  const eipolo= PRESET.Music.find(obj => obj.id === 1300 )
  playerVm.name = eipolo.sound
  playerVm.composer = eipolo.composer + " | " + eipolo.name
}
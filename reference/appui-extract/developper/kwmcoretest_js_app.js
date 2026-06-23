{
  const readyCallback =(result, msg)=> { console.log(msg) }
  KawaipianoJs.setOption ({ mode: 'Async', readyCallback: readyCallback })
}
//Vue.js スクリプト
new Vue({
  el: '#app',
  data: {
    PIANO: [],
    MIDI: [],
    KWM: [],
    Window: {
      Top: true,
      DeviceTest: false,
      MidiTest: false,
      JsonTest: false,
      UiUpdateTest: false,
      BtUpdateTest: false,
      EmbededdModeTest: false,
    },
    UI: {
      BackButton: false,
      Slider: '',
    },
    selectedDeviceId: "",
    time1: "",
    time2: "",
    time3: "",
    jsonName: "",
    jsonValue1: "",
    jsonValue2: "",
    jsonValue3: "",
    jsonloadName: "",
    savedJson: [],
    loadedJson: [],
    updateProgress: "",
    EmbededdMode: {
      status: '',
      statusValue: true,
      jniVer: '',
      lcd: '',
      brightness: '',
      brightnessValue: '',
      usbConnect: '',
      usbPath: '',
      appName: '',
    },
  },
  created: function(){
    this.PIANO = PIANO
    this.MIDI = MIDI
    this.KWM = KWM
  },
  mounted: function(){
    this.slider = new mdc.slider.MDCSlider(document.querySelector('.mdc-slider'))
    this.slider.value = 50
    this.slider.min = 0
    this.slider.max = 100
    this.slider.listen('MDCSlider:change', ()=> {
      this.slider.layout()
      this.EmbededdMode.brightnessValue = this.slider.value
    })
  },
  methods: {
    open(item) {
      if (!this.Window[item]) {
        this.Window[item] = true
        this.Window.Top = false
        this.UI.BackButton = true
        setTimeout(() => { this.slider.layout() }, 10)
      } else {
        this.Window[item] = false
      }
    },
    back() {
      if (KWM.isBleMidiWindowShown){
        KWM.closeBleMidiWindow()
      }
      Object.keys(this.Window).forEach((item)=>{
        this.Window[item] = false
      })
      this.Window.Top = true
      this.UI.BackButton = false
    },
    KWMtest1() {
      KWM.openBleMidiWindow()
      console.log('Bluetooth MIDI画面が開いて、UIが問題なければ合格です。')
    },
    KWMtest2() {
      KWM.closeBleMidiWindow()
      console.log('Bluetooth MIDI画面が閉じたら合格')
    },
    KWMtest3() {
      console.log('1. KWM.devicesボタンを押して接続中のデバイスを確認します。')
      console.log('2. 接続中のデバイスを接続解除、または新たなデバイスを接続します。')
      console.log('3. 再びKWM.devicesボタンを押して接続中のデバイスを確認します。')
      console.log('4. 手順2のデバイス変更が反映されていたら合格です。')
    },
    KWMtest4() {
      let time1 = Number(this.time1)
      let time2 = Number(this.time2)
      let time3 = Number(this.time3)
      let id = this.selectedDeviceId
      KWM.sendMidiMessage([144,60,120], id ,time1)
      KWM.sendMidiMessage([144,64,120], id ,time2)
      KWM.sendMidiMessage([144,67,120], id ,time3)
    },
    KWMtest5() {
      console.log('別テストの全パラリクエストが動けば合格')
    },
    KWMtest6() {
      let name = this.jsonName
      let path = String('appUI/json/' + name +'.json')
      this.savedJson = []
      this.savedJson.push({1:this.jsonValue1, 2:this.jsonValue2, 3:this.jsonValue3})
      console.log(path, this.savedJson)
      KWM.saveJson(path, this.savedJson).then(()=> {
        alert("Json save completed.", name, this.savedJson)
      }).catch(()=> {
        alert("Json save failed.")
      })
    },
    KWMtest7() {
      let name = this.jsonloadName
      let path = String('appUI/json/' + name +'.json')
      KWM.loadJson(path).then((result)=> {
        console.log(result)
        this.loadedJson = result
        alert("Json laod completed.")
      }).catch(()=> {
        alert("Json load failed.")
      })
    },
    KWMtest8() {
      KWM.getVersions()
      KWM.downloadUiData().then(()=> {
        alert("UI data download completed.")
      }).catch(()=> {
        alert("UI data download failed.")
      })
    },
    KWMtest9() {
      KWM.getVersions()
      KWM.updateUiData().then(()=> {
        alert("UI update suceeded.\n App UI be will reloaded.")
        window.location.href = "../../html/loading.html"
      }).catch(()=> {
        alert("UI update failed.")
      })
    },
    KWMtest10() {
      KWM.downloadBleMidiFirmware().then(()=> {
        alert("Bluetooth MIDI Firmware download completed.")
      }).catch(()=> {
        alert("Bluetooth MIDI Firmware download failed.")
      })
    },
    KWMtest11() {
      let id = this.selectedDeviceId
      KWM.getDeviceBleMidiVersion(id).then((result)=> {
        alert(result.version)
      }).catch(()=> {
        alert("get Bluetooth MIDI Device version failed.")
      })
    },
    KWMtest12() {
      let id = this.selectedDeviceId
      const progresscallback = function (callback) {
        let progress = callback.progress
        console.log(progress)
        this.updateProgress = progress
      }
      KWM.updateBleMidiFirmware(id, progresscallback)
    },
    KWMtest13(){
      KWM.getEmbeddedMode().then((result)=> {
        this.EmbededdMode.status = result
      }).catch(()=> {
        alert("getEmbeddedMode failed.")
      })
      KWM.getLcdInfo().then((result)=> {
        this.EmbededdMode.lcd = result
      }).catch(()=> {
        alert("getLcdInfo failed.")
      })
      KWM.getLcdBacklight().then((result)=> {
        this.EmbededdMode.brightness = result
      }).catch(()=> {
        alert("getLcdBacklight failed.")
      })
      KWM.getUsbActivity().then((result)=> {
        this.EmbededdMode.usbConnect = result
      }).catch(()=> {
        alert("getUsbActivity failed.")
      })
      KWM.getUsbPath().then((result)=> {
        this.EmbededdMode.usbPath = result
      }).catch(()=> {
        alert("getUsbPath failed.")
      })
      KWM.getJniVersion().then((result)=> {
        this.EmbededdMode.jniVer = result
      }).catch(()=> {
        alert("getJniVersion failed.")
      })
    },
    KWMtest14(boolean){
      KWM.setEmbeddedMode(boolean)
      console.log(boolean)
    },
    KWMtest15(){
      KWM.setLcdBacklight(this.EmbededdMode.brightnessValue)
    },
    KWMtest16(){
      KWM.launchAndroidSettingsApp()
    },
    KWMtest17(name){
      KWM.updateApk(name)
    },
  }
})

//MDC初期化
window.mdc.autoInit()
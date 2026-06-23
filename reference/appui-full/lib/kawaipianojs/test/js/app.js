"use strict"

//Vue.js スクリプト
const mainVm = {
  data () {
    return {
      mode: {
        selected: 'async',
        enum: ['async', 'connect', 'identify', "full", 'demo'],
      },
      update: {
        ui: false,
        ble: false,
      },
      log: {
        pianoObj: false,
        midiIn: false,
        midiOut: false,
        handshake: false,
        verifyParam: false,
      },
      bluetooth: {
        isAvailable: false,
        name: undefined,
        window: undefined,
        pairing: undefined,
        offset: 0,
      }
    }
  },
  beforeCreate () {
    MIDI.addEventListener('ready', ()=>{ this.getBleInfo() })
    MIDI.addEventListener('deviceState', ()=>{ setTimeout(this.getBleInfo, 500) })
  },
  mounted () {
    this.mdcInit()
  },
  methods: {
    invokeKpjs () {
      console.log ('invoke as ' + this.mode.selected)
      const option = {
        sync: this.mode.selected,
        updateUi: this.update.ui,
        updateBle: this.update.ble,
        json: [],
        forceSendItem: [],
        callback: {
          onEmbeddedMode: null,
          updatingUi: null,
          onLoadJson: null,
          midiReady: null,
          connected: null,
          confirmBleUpdate: (ok, cancel)=>{
            const userselect = window.confirm('BLE Updateを実行しますか？')
            if (userselect) { ok() } else { cancel() }
          },
          updatingBle: null,
          identified: null,
          synced: null,
          onUnsync: null,
        }
      }
      const successInvoke =()=> {
        console.log('kawaipiano.js 起動完了')
       }
      const errorInvoke =()=> {
        console.log('kawaipiaho.js 起動失敗')
      }
      KawaipianoJs.invoke(option).then(successInvoke).catch(errorInvoke)
    },
    mdcInit () {
      const buttons = document.querySelectorAll('.mdc-button')
      buttons.forEach(button => mdc.ripple.MDCRipple.attachTo(button))

      const radios = document.querySelectorAll('.mdc-radio')
      radios.forEach(radio => mdc.radio.MDCRadio.attachTo(radio))

      const formFields = document.querySelectorAll('.mdc-form-field')
      formFields.forEach(formField => mdc.formField.MDCFormField.attachTo(formField))
    },
    getBleInfo () {
      if (MIDI.API == 'KWMcore') {
        const isAvailable = (Object.keys(MIDI.bluetooth).length >= 0) ? true : false
        this.bluetooth = {
          isAvailable : isAvailable,
          name : MIDI.bluetooth.name,
          window : MIDI.bluetooth.window,
          pairing : MIDI.bluetooth.pairing,
          offset : MIDI.bluetooth.offset
        }
      }
    },
    onLogOptionChange (e) {
      const camelCase =(str)=> {
        str = str.charAt(0).toLowerCase() + str.slice(1)
        return str.replace(/[-_](.)/g, (match, group1)=> {
          return group1.toUpperCase()
        })
      }
      const elementName = camelCase(e.target.id)
      KawaipianoJs.log[elementName] = e.target.checked
      this.log[elementName] = e.target.checked
    },
    onBleConnectButton () {
      this.bluetooth.window = !this.bluetooth.window
      MIDI.bluetooth.window = this.bluetooth.window
    },
    onParingButton () {
      this.bluetooth.pairing = !this.bluetooth.pairing
      MIDI.bluetooth.pairing = this.bluetooth.pairing
    },
    setBleDeviceName () {
      MIDI.bluetooth.name = this.bluetooth.name
    },
    gotoBleDfuMode () {
      MIDI.bluetooth.gotoDfuMode()
    },
    gotoBleReset () {
      MIDI.bluetooth.disconnectDevices()
    },
    setBleMidiClock (on) {
      MIDI.bluetooth.clockFilter = on
    },
    setTimestampOffset () {
      MIDI.bluetooth.offset = this.bluetooth.offset
    },
  }
}

const app = Vue.createApp(mainVm)


// Component
//// MDC Checkbox
app.component ('mdc-checkbox', {
  template:
  `
    <div class="mdc-touch-target-wrapper">
      <div class="mdc-checkbox mdc-checkbox--touch">
        <input type="checkbox" class="mdc-checkbox__native-control" :id="id" @change="$emit('checked', $event)"/>
        <div class="mdc-checkbox__background">
          <svg class="mdc-checkbox__checkmark"
              viewBox="0 0 24 24">
            <path class="mdc-checkbox__checkmark-path"
                  fill="none"
                  d="M1.73,12.91 8.1,19.28 22.79,4.59"/>
          </svg>
          <div class="mdc-checkbox__mixedmark"></div>
        </div>
        <div class="mdc-checkbox__ripple"></div>
      </div>
    </div>
  `,
  props: {
    id:  { default: null },
  },
  mounted: function () {
    const checkboxes = document.querySelectorAll('.mdc-checkbox')
    checkboxes.forEach(checkbox => mdc.checkbox.MDCCheckbox.attachTo(checkbox))
  },
})


app.mount('#main')
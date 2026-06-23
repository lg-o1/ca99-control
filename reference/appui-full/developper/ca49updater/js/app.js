"use strict"

const smfPath = 'Kawai/updater/KP824usbBLE.mid'
// Kawai/default/BY001-00.mid
const asset = {
  text: {
    en: {
      greetings: {
        title: 'Thank you for purchasing this \nKawai CA49 digital piano',
        description: 'The digital piano software will be updated shortly. \n\nAfter updating, the digital piano will be able to use Kawai apps such as PianoRemote and PiaBookPlayer.',
        warning: '',
        tips: '',
      },
      beforeUpdate: {
        title: 'Please check the following points before updating',
        description: '・Ensure that the smartphone/tablet used to update the instrument is connected to a power outlet, or has at least 50% battery charge remaining.\n\n・The update will take approximately 2 minutes to complete. During this time, please ensure that the PianoRemote app remains active, and do not attempt to use any other apps.\n\n・In an environment where there may be multiple CA49 instruments, such as a classroom or musical instrument store, please ensure that only the CA49 piano to be updated is turned on.  All other CA49 pianos should be turned off.',
        warning: '',
        tips: '\nIf the smartphone/tablet battery charge expires, or a call is received during the update, it will be necessary to restart the update from the beginning. However, the CA49 piano itself will not be damaged, or become non-functional.',
      },
      turnOff: {
        title: 'Turn off the piano',
        description: 'Press and hold the [POWER] button to turn off the piano.',
        warning: '',
        tips: '',
      },
      turnOn: {
        title: 'Press and hold the panel buttons, then turn on the piano',
        description: 'Press and hold the [1], [2], and [SOUND SELECT] panel buttons, then turn on the piano. \n\nThe piano will turn on, and the [1], [2], and [SOUND SELECT] panel buttons will start to flash.',
        warning: '',
        tips: '',
      },
      connectPiano: {
        title: 'Establish a Bluetooth MIDI connection with the piano',
        description: 'Tap the [Connect] button to show the Bluetooth MIDI device list.  Then tap [CA49] to connect to the instrument.',
        warning: '',
        tips: '',
      },
      confirmUpdate: {
        title: 'Start the update',
        description: 'Tap the [Start Update] button to start the update.',
        warning: 'Please do not close this app, or turn off the piano during the update.',
        tips: '',
      },
      updating: {
        title: 'Updating...',
        description: '',
        warning: 'Please do not close this app, or turn off the piano.',
        tips: '',
      },
      completed: {
        title: 'Update Complete',
        description: 'This stage of the update has been completed successfully. \n\nPlease turn off the piano.',
        warning: 'The next stage of this update requires that the CA49 be connected to a computer. Please refer to the update instructions in order to perform the remaining updates.',
        tips: '',
      },
      buttonLabel: {
        next: 'Next',
        cancel: 'Cancel',
        confirm: 'Confirm',
        connect: 'Connect',
        update: 'Start Update',
        completed: 'Done',
      }
    },
    ja: {
      greetings: {
        title: 'CA49/CA4900GPをお買い上げ頂き、\n誠にありがとうございます。',
        description: 'ピアノ本体のアップデートを行います。 \nアップデートを行いますと、PianoRemote、PiaBookePlayer等、カワイのアプリの利用が可能となります。',
        warning: '',
        tips: '',
      },
      beforeUpdate: {
        title: 'アップデートを行う前に、\n以下をご確認ください。',
        description: '・アップデートを行うスマートフォン/タブレットの充電残量が50%以上あること。もしくは充電中であること。 \n・アップデートは2分程度時間がかかります。その間、電話やアラーム等、PianoRemote以外のアプリが動作しないこと。 \n・音楽教室や楽器店舗等、複数のCA49/CA4900GPがある環境の場合、アップデートを行うピアノ以外の電源がオフになっていること。',
        warning: '',
        tips: 'スマートフォン/タブレットの充電が無くなる、電話がかかってくる等、アップデートが中断した場合、アップデート作業を最初から行う必要はありますが、ピアノ本体が故障することはありません。',
      },
      turnOff: {
        title: 'ピアノの電源を\nオフしてください。',
        description: '電源ボタンを押して、ピアノの電源をオフします。',
        warning: '',
        tips: '',
      },
      turnOn: {
        title: '図のように鍵盤を押しながら\n電源をオンします。',
        description: 'ピアノ本体パネルの[1]、[2]、[音色]ボタンを押しながら電源ボタンをおします。\n電源が入ると[1]、[2]、[音色]ボタンのLEDが点滅します。',
        warning: '',
        tips: '',
      },
      connectPiano: {
        title: 'ピアノとBluetoothMIDI接続\nしてください。',
        description: '「接続画面を開く」ボタンを押すと、BluetoothMIDI機器リストが表示されます。「CA49」または「CA4900GP」を選択し、接続を行います。',
        warning: '',
        tips: '',
      },
      confirmUpdate: {
        title: 'アップデートを行います。',
        description: '「アップデート開始」ボタンを押すと、アップデートを実行します。',
        warning: 'アップデート中はアプリを終了したり、ピアノ本体の電源をオフしないでください。',
        tips: '',
      },
      updating: {
        title: 'アップデート中...',
        description: '',
        warning: 'アプリを終了しないでください。\n\n\nピアノ本体の電源をオフしないでください。',
        tips: '',
      },
      completed: {
        title: 'アップデート完了しました。',
        description: 'ピアノ本体の電源をオフしてください。',
        warning: '引き続き、パソコンを使ったアップデートが必要です。アップデートマニュアルをお読みになり、残りのアップデートを行って下さい。',
        tips: '',
      },
      buttonLabel: {
        next: '次へ',
        cancel: 'キャンセル',
        confirm: '確認しました',
        connect: '接続画面を開く',
        update: 'アップデート開始',
        completed: '完了',
      }
    },
  },
  img: {
    0: '../img/ca49_front.jpg',
    1: '../img/ca49_playing.jpg',
    2: '../img/ca49_buttonpanel.jpg',
    3: '../img/ca49_buttons.jpg',
    4: '../img/ca49_ipad.jpg',
  },
}

const mainVm = new Vue ({
  el: '#main',
  data: {
    page: '',
    title: '',
    description: '',
    warning: '',
    tips: '',
    btn: '',
    img: '',
    webViewLang: '',
    connectWindow: false,
    progress: 0,
    totalTime: null,
    midiEventHandlerId: null,
  },
  created: function () {

    // WebViewの言語取得
    this.webViewLang = (window.navigator.userLanguage || window.navigator.language || window.navigator.browserLanguage).substr(0,2) == "ja" ? 'ja' : 'en'

    // Kawaipiano.js起動
    MIDI.addEventListener('ready', ()=>{
      // kawaipiano.jsのイベントハンドラーを無効化
      KWM.onSmfMidiMessage =()=> { return }
      KWM.onSmfMetronome =()=> { return }

      KawaipianoJs.invoke({ sync: 'async' })
    })

    // 初期ページを表示
    this.setPage('greetings')
  },
  methods: {
    init() {
      this.title = ''
      this.description = ''
      this.warning = ''
      this.tips = ''
      this.btn = ''
      this.img = ''
      this.connectWindow = false
      this.progress = 0
    },
    setPage(page) {

      this.init()

      this.page = page
      const items = ['title', 'description', 'warning', 'tips']
      for (const item of items) {
        this[item] = asset.text[this.webViewLang][page][item]
      }

      if (page === 'greetings') {
        this.img = asset.img[0]
        this.btn = asset.text[this.webViewLang].buttonLabel.next
      } else if (page === 'beforeUpdate') {
        this.img = asset.img[2]
        this.btn = asset.text[this.webViewLang].buttonLabel.confirm
      } else if (page === 'turnOff') {
        this.img = asset.img[0]
        this.btn = asset.text[this.webViewLang].buttonLabel.next
      } else if (page === 'turnOn') {
        this.img = asset.img[3]
        this.btn = asset.text[this.webViewLang].buttonLabel.next
      } else if (page === 'connectPiano') {
        this.img = asset.img[4]
        this.btn = asset.text[this.webViewLang].buttonLabel.connect
      } else if (page === 'confirmUpdate') {
        this.img = asset.img[0]
        this.btn = asset.text[this.webViewLang].buttonLabel.update
      } else if (page === 'updating') {
        this.img = asset.img[1]
        this.btn = ''
      } else if (page === 'completed') {
        this.img = asset.img[0]
        this.btn = asset.text[this.webViewLang].buttonLabel.completed
      }

    },
    onClick() {
      const pages = ['greetings', 'beforeUpdate', 'turnOff', 'turnOn', 'connectPiano', 'confirmUpdate', 'updating', 'completed']
      const index = pages.findIndex(item => item === this.page) + 1
      const page = pages[index]
      if (this.page === 'connectPiano') {
        this.connect()
      } else if (this.page === 'confirmUpdate') {
        this.setPage(page)
        this.update()
      } else if (this.page === 'completed') {
        location.href='../../../ui/html/index.html'
      } else {
        this.setPage(page)
      }
    },
    connect() {
      this.midiEventHandlerId = MIDI.addEventListener('deviceState', ()=>{
        for (const device of MIDI.DEVICES) {
          if (device.name.match('CA49') || device.name.match('techplan')) {
            MIDI.removeEventListener(this.midiEventHandlerId)
            KWM.closeBleMidiWindow()
            this.connectWindow = false
            this.setPage('confirmUpdate')
          }
        }
      })
      this.init()
      this.connectWindow = true
      KWM.openBleMidiWindow()
    },
    update() {
      if (MIDI.API === "KWMcore") {
        KWM.setSmfOutFilter(false)
        KWM.selectSmf(smfPath).then ((smfInfo)=> {
          this.totalTime = smfInfo.totalTime
          KWM.getTimeProgress((event)=> {
            const prog = Math.ceil(( event.time / this.totalTime ) * 100)
            if (this.progress === prog) { return }
            this.progress = prog
          })
          KWM.onPlayDone (()=> {
            KWM.setSmfOutFilter(false)
            this.setPage('completed')
          })
          KWM.playStartSmf()
        }).catch ((error)=>{
          console.log(error)
        })
      }
    },
  },
})
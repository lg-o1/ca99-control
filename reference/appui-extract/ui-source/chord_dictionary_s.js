const KeyMin = 21      //  88鍵
const KeyMax = 108

var rootSelIndex = 0
var typeSelIndex = 0
var playSelIndex = 0

var keyCenter = 65
const showWhiteKeyNum = 15

var scrollLeftType

var isPlaying = false
const rootnum = 12
const whitenum = 7

const keynum = 24
const wkeynum = 14

const colorButtonOff = '#4E4E4E'
const colorButtonOn = '#10818E'
const colorPlayOff = '#10818E'
const colorPlayOn = '#106266'
const colorBase = '#222222'

var touchStartTime = 0

var noShift = false

var isTypeSelecting = false

window.onload = function() {

//    KWM.setAudioChordDetection(false);

    var type = JSON.parse(localStorage.getItem('type'))
    if (type)
        ChordDictionary.type = type;

    var rsi = JSON.parse(localStorage.getItem('rootSelIndex'))
    if (rsi)
        rootSelIndex = rsi

    var tsi = JSON.parse(localStorage.getItem('typeSelIndex'))
    if (tsi)
        typeSelIndex = tsi

    var psi = JSON.parse(localStorage.getItem('playSelIndex'))
    if (psi)
        playSelIndex = psi

    var kc = JSON.parse(localStorage.getItem('keyCenter'))
    if (kc)
        keyCenter = kc

//    ChordDictionary.open()
}



const ChordDictionary = new Vue({
//  el: '#chord_dictionary',
  data: {
      type: [
            //  順番は、最低音から順に低から高へ変化 (ES8は、ルールがありそうで無いみたいなので)
            //  隣接音程が半音の場合、不協和音 (0   4  7  0 などのコメントの隣接音に必ず1スペースが必要で、スペースが無いと不協和音)
            //  トライアドコード（３和音）
            {       //  0   4  7
                names: ' |Maj|maj|major|△',
                tones: '_123_56_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4  7
                names: 'm|min|minor|−',
                tones: '_12_456_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4> 7
                names: 'sus4',
                tones: '_1234_6_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4 <7
                names: '−5|(♭5)|alt',
                tones: '_123_5_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7>
                names: 'aug|+5|(♯5)|+',
                tones: '_123_567_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4 <7
                names: 'm−5|m(♭5)|m♭5|−(♭5)',
                tones: '_12_45_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4  7>
                names: 'm+5|m(♯5)|m♯5|−(♯5)',
                tones: '_12_4567_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0 <<4  7
                names: 'sus2',
                tones: '_1_3456_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
          　//  クォードコード（４和音）
            {       //  0   4  7  0
                names: '7',
                tones: '_123_56_89_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4  7  0
                names: 'm7|−7',
                tones: '_12_456_89_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4> 7  0
                names: '7sus4',
                tones: '_1234_6_89_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4 <7  0
                names: '7−5|7(♭5)|7♭5',
                tones: '_123_5_789_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7> 0
                names: '7+5|7+|7(♯5)|7♯5|7aug|aug7',
                tones: '_123_567_9_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7 <0
                names: '6',
                tones: '_123_56_8_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0>
                names: 'M7|maj7|△7',
                tones: '_123_56_890_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4 <7 <0
                names: '6−5|6(♭5)|6♭5',
                tones: '_123_5_78_0',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4 <7  0>
                names: 'M7−5|M7(♭5)|M7♭5｜△7(♭5)',
                tones: '_123_5_7890_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7> 0>
                names: 'M7+5|M7(♯5)|M7♯5|△7(♯5)',
                tones: '_123_567_90_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4 <7  0
                names: 'm7−5|m7(♭5)|m7♭5|φ|−7(♭5)',
                tones: '_12_45_789_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4  7> 0
                names: 'm7+5|m7(♯5)|m7♯5|−7(♯5)',
                tones: '_12_4567_9_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4  7 <0
                names: 'm6|−6',
                tones: '_12_456_8_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4  7  0>
                names: 'mM7|m maj7|−△7',
                tones: '_12_456_890_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4 <7 <0
                names: 'dim|m6−5|m6(♭5)|m6♭5|○|dim7|−6(♭5)',
                tones: '_12_45_78_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4 <7  0>
                names: 'mM7−5|mM7(♭5)|mM7♭5|dim(M7)|○maj7|−△7(♭5)',
                tones: '_12_45_7890_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4  7> 0>
                names: 'mM7+5|mM7(♯5)|mM7♯5|−△7(♯5)',
                tones: '_12_4567_90_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            //  9th以上
            {       //  0   4  7      4
                names: 'add9',
                tones: '_123_56_890123_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4  7      4
                names: 'madd9|−add9',
                tones: '_12_456_890123_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            //  テンションコード
            //  9th
            {       //  0   4  7  0   4
                names: '9',
                tones: '_123_56_89_123_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4  7  0   4
                names: 'm9|−9',
                tones: '_12_456_89_123_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4>  7  0   4
                names: '9sus4',
                tones: '_1234_6_89_123_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4 <7  0   4
                names: '9−5|9(♭5)|9♭5',
                tones: '_123_5_789_123_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7> 0   4
                names: '9+5|9(♯5)|9♯5|9aug|9+',
                tones: '_123_567_9_123_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7 <0   4
                names: '69|6(9)',
                tones: '_123_56_8_0123_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0>  4
                names: 'M9|maj9|△9',
                tones: '_123_56_890_23_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0  <4
                names: '7−9|7(♭9)|7♭9',
                tones: '_123_56_89_12_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0   4>
                names: '7+9|7(♯9)|7♯9',
                tones: '_123_56_89_1234_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4 <7  0   4
                names: 'm7(♭59)|−7(♭59)',
                tones: '_12_45_789_123_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4  7> 0   4
                names: 'm7(♯59)|−7(♯59)',
                tones: '_12_4567_9_123_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4  7 <0   4
                names: 'm69|m6(9)|−69',
                tones: '_12_456_8_0123_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4  7  0>  4
                names: 'mM9|m maj9|−△9',
                tones: '_12_456_890_23_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4 <7 <0   4
                names: 'dim9|○9',
                tones: '_12_45_78_0123_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4 <7  0  <4
                names: 'm7(♭5♭9)|−7(♭5♭9)',
                tones: '_12_45_789_12_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            //  11th
            {       //  0   4  7         7
                names: 'add11|(11)',
                tones: '_123_56_890123456_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4  7         7
                names: 'madd11|m(11)',
                tones: '_12_456_890123456_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0      7
                names: '11',
                tones: '_123_56_89_123456_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4  7  0      7
                names: 'm7(11)|−7(11)',
                tones: '_12_456_89_123456_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0      7>
                names: '7(♯11)',
                tones: '_123_56_89_1234567_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4 <7 <0      7
                names: 'dim11|○11',
                tones: '_12_45_78_0123456_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4  7  0   4  7
                names: 'm9(11)|−9(11)',
                tones: '_12_456_89_123_56_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0>  4  7
                names: 'M9(11)|△9(11)',
                tones: '_123_56_890_23_56_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0  <4  7
                names: '7(♭911)',
                tones: '_123_56_89_12_456_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4 <7  0      7
                names: 'm7(♭511)|−7(♭511)',
                tones: '_12_45_789_123456_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0>  4  7>
                names: 'M9(♯11)|△9(♯11)',
                tones: '_123_56_890_23_567_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0  <4  7>
                names: '7(♭9♯11)|7♭9♯11',
                tones: '_123_56_89_12_4567_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0   4> 7>
                names: '7(♯9♯11)|7♯9♯11',
                tones: '_123_56_89_1234_67_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            //  13th
            {       //  0   4  7             1
                names: 'add13|(13)',
                tones: '_123_56_8901234567890_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4  7             1
                names: 'madd11|m(11)',
                tones: '_12_456_8901234567890_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0          1
                names: '13',
                tones: '_123_56_89_1234567890_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0>         1
                names: 'M7(13)|△7(13)',
                tones: '_123_56_890_234567890_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0         <1
                names: '7(♭13)',
                tones: '_123_56_89_123456789_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4  7  0         <1
                names: 'm7(♭13)|−7(♭13)',
                tones: '_12_456_89_123456789_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4 <7 <0         <1
                names: 'dim(♭13)|○(♭13)',
                tones: '_12_45_78_0123456789_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0   4      1
                names: '9(13)',
                tones: '_123_56_89_123_567890_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0>  4      1
                names: 'M9(13)|△9(13)',
                tones: '_123_56_890_23_567890_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0  <4      1
                names: '7(♭913)',
                tones: '_123_56_89_12_4567890_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0   4>     1
                names: '7(♯913)',
                tones: '_123_56_89_1234_67890_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0  <4  7  0      7  <1
                names: 'm7(11♭13)|−7(11♭13)',
                tones: '_12_456_89_123456_89_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0>     7>  1
                names: 'M7(♯1113)|△7(♯1113)',
                tones: '_123_56_890_234567_90_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0   4  7   1
                names: '9(1113)',
                tones: '_123_56_89_123_56_890_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0>  4  7>  1
                names: 'M9(♯1113)|△9(♯1113)',
                tones: '_123_56_890_23_567_90_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0  <4  7   1
                names: '7(♭91113)',
                tones: '_123_56_89_12_456_890_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0   4  7>  1
                names: '9(♯1113)',
                tones: '_123_56_89_123_567_90_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0   4  7  <1
                names: '9(♭13)',
                tones: '_123_56_89_123_56789_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0  <4  7  <1
                names: '7(♭9♭13)|7♭9♭13',
                tones: '_123_56_89_12_456789_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },
            {       //  0   4  7  0   4> 7  <1
                names: '7(♯9♭13)|7♯9♭13',
                tones: '_123_56_89_1234_6789_',
                name: [], tone: [], toneNum: 0, typeSel: 0, open: false,
            },

      ],

      root: [
          {
            name: 'C'
          },
          {
            name: 'C♯/D♭'
          },
          {
            name: 'D'
          },
          {
            name: 'D♯/E♭'
          },
          {
            name: 'E'
          },
          {
            name: 'F'
          },
          {
            name: 'F♯/G♭'
          },
          {
            name: 'G'
          },
          {
            name: 'G♯/A♭'
          },
          {
            name: 'A'
          },
          {
            name: 'A♯/B♭'
          },
          {
            name: 'B'
          },
      ],
      key: [],
      inversion: [],
      openVoicing: false,
  },
  methods: {
    setType() {
       localStorage.setItem('type', JSON.stringify(this.type));
    },
  resetType() {
      for (var i = 0; i < this.type.length; i++) {
          this.type[i].typeSel = 0
      }
      this.setType()

      rootSelIndex = 0
      localStorage.setItem('rootSelIndex', JSON.stringify(rootSelIndex));
      typeSelIndex = 0
      localStorage.setItem('typeSelIndex', JSON.stringify(typeSelIndex));
      playSelIndex = 0
      localStorage.setItem('playSelIndex', JSON.stringify(playSelIndex));
      keyCenter = 64
      localStorage.setItem('keyCenter', JSON.stringify(keyCenter));
    },
    isWhite(key) {
        switch (key % 12) {
            case    0:
            case    2:
            case    4:
            case    5:
            case    7:
            case    9:
            case    11:
                return true
        }
        return  false
    },
    //  ページを閉じる
//    close() {
//    //    window.history.back(-1)  //  Androidで戻りすぎる問題あるけど・・・
//　  },
    //  ページを開く
    open() {
         var ov = JSON.parse(localStorage.getItem('openVoicing'))
         if (ov)
             this.openVoicing = ov

          //  ボイシングキーボード
          var keyboard = document.getElementById('keyboard')
          //  イベントハンドラ登録
          keyboard.addEventListener('touchstart', ChordDictionary.switchVoicing, { passive: true });
          keyboard.addEventListener('touchend', ChordDictionary.touchPlayEnd, { passive: true });

          //  ボイシングモード
          var mode = document.getElementById('voicing_mode')
          //  イベントハンドラ登録
          var invdown = document.getElementById('arrow_left')
          invdown.addEventListener('touchstart', ChordDictionary.rotateChordDown, { passive: true });
          invdown.addEventListener('touchend', ChordDictionary.touchPlayEnd, { passive: true });
          //  イベントハンドラ登録
          var invup = document.getElementById('arrow_right')
          invup.addEventListener('touchstart', ChordDictionary.rotateChordUp, { passive: true });
          invup.addEventListener('touchend', ChordDictionary.touchPlayEnd, { passive: true });
          //  イベントハンドラ登録
          mode.addEventListener('touchstart', ChordDictionary.switchVoicing, { passive: true });
          mode.addEventListener('touchend', ChordDictionary.touchPlayEnd, { passive: true });

          //   ルートボタンの構築
          var parent = document.getElementById('chord_dictionary_root')
          //   子要素を全削除
          while(parent.lastChild) {
               parent.removeChild(parent.lastChild);
          }

          var pw = parent.clientWidth
          var ph = parent.clientHeight

          var mgn = 4
          var pitch = (pw - mgn) / whitenum
          var h = (ph - mgn * 3) / 2
          var w, l, t
          var cntw = 0
          for (var k = 0; k < rootnum; k++){
            if (this.isWhite(k)) {
                l = mgn + pitch * cntw++
                t = mgn + h + mgn
                w = pitch - mgn
            }
            else {
                l = mgn + pitch * cntw - w / 2
                t = mgn
                w = pitch - mgn
            }
            //  input要素を生成
            var input = document.createElement('input')
            //  classを追加
            input.className = 'el_root'
            var elid = input.className + k
            input.setAttribute('id', elid)
            //  buttonタイプにする
            input.setAttribute('type', 'button')
            //  ボタン名
            input.setAttribute('value', this.root[k].name)
            //  生成した要素を追加
            parent.appendChild(input);
            var el = document.getElementById(elid)
            if (!el)
                return
            //  配置
            el.style.zIndex = this.isWhite(k) ? 0 : 1
            el.style.left = l + 'px'
            el.style.width = w + 'px'
            el.style.top = t + 'px'
            el.style.height = h + 'px'
            el.style.textAlign = 'center'
            el.style.verticalAlign = 'middle'
            el.style.fontSize =  Math.min(h * 0.5, w / (this.isWhite(k) ? 3 : 4)) + 'px'
            el.style.backgroundColor = colorBase
            el.style.borderBottom = 'solid 2px #4E4E4E'
           //  イベントハンドラ登録
            el.addEventListener('touchstart', ChordDictionary.rootSelect, { passive: true });
            el.addEventListener('touchend', ChordDictionary.touchPlayEnd, { passive: true });
          }




          //    タイプボタンの構築
          parent = document.getElementById('chord_dictionary_type')
          //   子要素を全削除
          while(parent.lastChild) {
               parent.removeChild(parent.lastChild);
          }

          var tline = 3
          pw = parent.clientWidth
          ph = parent.clientHeight
          var m = 5
          h = (ph - tline * m * 2) / tline
          w = pw * 0.275
          for (var i = 0; i < this.type.length; i++) {
             //  namesからname配列を生成
             var acnt = 0
             var sidx = 0
             while (true) {
                 var idx = this.type[i].names.indexOf('|', sidx)
                 if (idx < 0){
                    if (acnt == 0)
                       this.type[i].name[acnt] = this.type[i].names
                    else
                       this.type[i].name[acnt] = this.type[i].names.substr(sidx, this.type[i].names.length - sidx)
                    break
                 }
                 this.type[i].name[acnt] = this.type[i].names.substr(sidx, idx - sidx)
                 sidx = idx + 1
                 acnt++
             }
             //  tonesからtone配列を生成
             var len = 24 //  Open Voicing対応
             this.type[i].toneNum = 0
             for (var c = 0; c < len; c++) {
                var str = this.type[i].tones.substr(c, 1)
                var isTone = str == '_'
                this.type[i].tone[c] = isTone
                if (isTone){
                    if (c >= 12)
                       this.type[i].open = true
                    this.type[i].toneNum++
                }
             }

             //  input要素を生成
             var input = document.createElement('input')
             //  classを追加
             input.className = 'el_type'
             var elid = input.className + i
             input.setAttribute('id', elid)
             //  buttonタイプにする
             input.setAttribute('type', 'button')
             //  ボタン名
             input.setAttribute('value', this.type[i].name[this.type[i].typeSel])
             //  生成した要素を追加
             parent.appendChild(input);
             var el = document.getElementById(elid)
             if (!el)
                 return
             //  配置
             t = m + (i % tline) * (h + m * 2)
             l = m + Math.floor(i / tline) * (w + m * 2)
             el.style.left = l + 'px'
             el.style.width = w + 'px'
             el.style.top = t + 'px'
             el.style.height = h + 'px'
             el.style.borderRadius = h / 2 + 'px'
             el.style.textAlign = 'center'
             el.style.verticalAlign = 'middle'
             el.style.fontSize = Math.min(h * 0.4, w * 0.175) + 'px'
             //  イベントハンドラ登録
             el.addEventListener('touchstart', ChordDictionary.scrollTypeStart, { passive: true });
             el.addEventListener('touchend', ChordDictionary.typeSelect, { passive: true });
          }
          //    自動ルート選択
          if (rootSelIndex >= 0) {
             var id = 'el_root' + rootSelIndex
             var el = document.getElementById(id)
             el.style.borderBottom = 'solid 8px #10818E'
          }
          //    自動タイプ選択
          if (typeSelIndex >= 0) {
             var id = 'el_type' + typeSelIndex
             var el = document.getElementById(id)
             el.style.backgroundColor = colorButtonOn
             // 自動スクロール
             parent.scroll(el.getBoundingClientRect().left - parent.getBoundingClientRect().left, el.getBoundingClientRect().top - parent.getBoundingClientRect().top)
          }

          //   鍵盤構築
          this.createKeyboard()

          this.updateVoicing()
    },
    //  disabled double tap zooming for iOS
    disabledDoubleTapZooming(e){
        var now = +(new Date())
        if (touchStartTime + 700 > now){
            e.preventDefault()
        }
        touchStartTime = now
    },
    //  ボイシングスイッチ
    switchVoicing(e){
        this.disabledDoubleTapZooming(e)
        var mode = document.getElementById('voicing_mode')
        if (mode.style.visibility === 'hidden')
            return
        this.openVoicing = !this.openVoicing
        this.updateVoicing()
        this.touchPlayStart()
    },
    updateVoicing(){
        var mode = document.getElementById('voicing_mode')
        if (this.openVoicing){
            mode.innerText = 'Open Voicing'
        }
        else{
            mode.innerText = 'Close Voicing'
        }
        mode.style.visibility = this.type[typeSelIndex].open ? 'visible' : 'hidden'

        this.scrollKeyboard()
    },
    //  ルート選択
    rootSelect(e) {
         var elSel = e.target
         for (var k = 0; k < rootnum; k++){
           var id = 'el_root' + k
           var el = document.getElementById(id)
           var isSel = id == elSel.id
           el.style.borderBottom = isSel ? 'solid 8px #10818E' : 'solid 2px #4E4E4E'
           if (isSel) {
              rootSelIndex = k
              localStorage.setItem('rootSelIndex', JSON.stringify(rootSelIndex));
           }
         }
        this.disabledDoubleTapZooming(e)
                            
        this.scrollKeyboard()
        this.touchPlayStart()
    },
    //  タイプ選択
    scrollTypeStart(e){
        this.disabledDoubleTapZooming(e)
        var parent = document.getElementById('chord_dictionary_type')
        scrollLeftType = parent.scrollLeft
    },
    typeSelect(e) {
        //  動いたらスクロールしただけなので、何もしない
        var parent = document.getElementById('chord_dictionary_type')
        var scrollLen = Math.abs(scrollLeftType - parent.scrollLeft)
        if (scrollLen > 4)
            return

        var elSel = e.target
        var idxOld = typeSelIndex
        var num = ChordDictionary.type.length // イベントハンドラ内のthisは要注意
        for (var i = 0; i < num; i++){
           var id = 'el_type' + i
           var el = document.getElementById(id)
           var isSel = id == elSel.id
           el.style.backgroundColor = isSel ? colorButtonOn : colorButtonOff
           if (isSel) {
              typeSelIndex = i
              localStorage.setItem('typeSelIndex', JSON.stringify(typeSelIndex));
           }
        }
        //  すでに選択されていたら次のタイプ名に変更
        if (typeSelIndex == idxOld){
            this.typeForward(e)
        }
        this.updateVoicing()

        //  苦肉の策的な鳴りっぱなし防止（乱れ打ち対策）
        this.midiOutOffAllNote()


        setTimeout(this.touchPlayStart, 0)
        setTimeout(this.touchPlayEnd, 500)
    },
    //  タイプ名を次へ送る
    typeForward(e) {
        var head = 'el_type'
        var idx = e.target.id.substr(head.length, e.target.id.length - head.length)
        this.type[idx].typeSel = (this.type[idx].typeSel + 1) % this.type[idx].name.length
        //  ボタン名変更
        e.target.setAttribute('value', this.type[idx].name[this.type[idx].typeSel])
        //  タイプ情報を保存
        ChordDictionary.setType()
    },
    //  タイプ名を前に送る
    typeBack(e) {
        var head = 'el_type'
        var idx = e.target.id.substr(head.length, e.target.id.length - head.length)
        this.type[idx].typeSel = (this.type[idx].typeSel + 1 + this.type[idx].name.length) % this.type[idx].name.length
        //  ボタン名変更
        e.target.setAttribute('value', this.type[idx].name[this.type[idx].typeSel])
        //  タイプ情報を保存
        ChordDictionary.setType()
    },
    //  鍵盤の作成
    getBlackKeyOffset(key) {
        switch (key % 12){
            case 1:     return -0.594 / 6.45 // 14.00mm / -2.17mm = 6.45
            case 3:     return  0.594 / 6.45 // 14.00mm /  2.17mm = 6.45
            case 6:     return -0.594 / 4.31 // 14.00mm / -3.25mm = 4.31
            case 8:     return  0
            case 10:    return  0.594 / 4.31 // 14.00mm /  3.25mm = 4.31
        }
        return 0
    },
    createKeyboard() {
        var parent = document.getElementById('chord_dictionary_play')

        //   子要素を全削除
        while(parent.lastChild) {
             parent.removeChild(parent.lastChild);
        }

        parent.addEventListener('scroll', ChordDictionary.scrollKeyboard, false)

        keyRect = new Array(128)

        //  鍵の構築
        var pw = parent.clientWidth
        var ph = parent.clientHeight

        var wp = pw / 15
        var l, t, w, h
        var cntw = 0
        for (var k = KeyMin; k <= KeyMax; k++) {
          if (this.isWhite(k)) {
              w = wp
              h = ph
              l = wp * cntw++
              t = 0
          }
          else {
              w = wp * 0.594
              h = ph * 0.6
              l = wp * cntw - w / 2 + w * this.getBlackKeyOffset(k)
              t = 0
          }

          //  li要素を生成
          var li = document.createElement('input')
          //  classを追加
          li.className = 'el_key'
          var elid = li.className + k
          li.setAttribute('id', elid)
          //  buttonタイプにする
          li.setAttribute('type', 'button')
          //  生成した要素を追加
          parent.appendChild(li);
          var el = document.getElementById(elid)
          //  配置
          el.style.zIndex = this.isWhite(k) ? 0 : 1
          el.style.left = l + 'px'
          el.style.width = w + 'px'
          el.style.top = t - (this.isWhite(k) ? 0 : 1.5) + 'px'
          el.style.height = h + 'px'
          el.style.backgroundColor = (this.isWhite(k) ? '#C8C8C8' : '#3F3F3F')
          el.style.borderWidth = this.isWhite(k) ? '1.5px' : '3px'
          el.style.borderHeight = this.isWhite(k) ? '1.5px' : '3px'
          //  イベントハンドラ登録
          el.addEventListener('touchstart', ChordDictionary.touchPlayStart, { passive: true });
          el.addEventListener('touchend', ChordDictionary.touchPlayEnd, { passive: true });

          this.key[k] = {'l': l, 't': t, 'w': w, 'h': h, 'on': false, 'play': false};
       }
       //   コード構成音転回形フラグ
       for (var i = 0; i < 12; i++) {
          this.inversion[i] = false
       }

       var scrollLeft = this.key[keyCenter].l + this.key[keyCenter].w / 2 - pw / 2

       // 自動スクロール
       parent.scroll(scrollLeft, 0)

       this.scrollKeyboard()
    },
    //  鍵盤スクロールハンドラ
    scrollKeyboard() {
       var parent = document.getElementById('chord_dictionary_play')
       var pw = parent.clientWidth
       var lx = parent.scrollLeft
       var cx = lx + pw / 2
       var rx = lx + pw
       var kmin = -1
       var gxmin = 10000
       for (var k = KeyMin; k <= KeyMax; k++) {
           var cxk = this.key[k].l + this.key[k].w / 2
           var gx = Math.abs(cxk - cx)
           if (gxmin < gx)
              continue
           gxmin = gx
           kmin = k
       }
       keyCenter = kmin
       localStorage.setItem('keyCenter', JSON.stringify(keyCenter));
                                
       cx = this.key[keyCenter].l + this.key[keyCenter].w / 2

       //   全ての鍵をオフ
       for (var k = KeyMin; k <= KeyMax; k++) {
           this.key[k].on = false
       }
       //   コード構成音転回形フラグ
       for (var i = 0; i < 24; i++) {
           this.inversion[i] = false
       }

       var close = !this.openVoicing || !this.type[typeSelIndex].open
       if (close){
           for (var t = 0; t < 24; t++) {
              //  ルートCのタイプコード構成音フラグ
              var isOn = this.type[typeSelIndex].tone[t]
              //  ルート転回（オクターブスイッチを反映）
              var i = (t + rootSelIndex) % 12
              this.inversion[i] |= isOn
           }
           //   コード中心音高に最寄りのコード構成音をオン
           for (var i = 0; i < 12; i++) {
               if (!this.inversion[i])
                  continue

               var kc = -1
               var gxc = 10000
               for (var k = KeyMin; k <= KeyMax; k++) {
                  if (k % 12 != i)
                     continue
                  var cxk = this.key[k].l + this.key[k].w / 2
                  var gx = Math.abs(cxk - cx)
                  if (gxc < gx)
                     continue
                  gxc = gx
                  kc = k
               }
               //  クローズボイシングの場合、構成音に応じてオミットする
               if (close && this.isEnableOmit(kc))
                  continue
               this.key[kc].on = true
            }
       }
       else{
            //   コード最高音高に最寄りのコード構成音を決める
            var ks = this.getChordKeyRight()
            if (ks < 0)
                return
            //  最高構成音高のinversionインデックスを見つける
            var ti = this.getInversionIndex(ks)
            if (ti < 0)
                return
            //  最高構成音高基準でinversionをオフセットし、構成音フラグが立っている鍵をフラッシュオン
            for (var k = KeyMax; k >= KeyMin; k--) {
                var t = ((k - ks + 240) % 24 + ti) % 24
                if (!this.inversion[t])
                    continue
                if (this.key[k].l < lx)
                    continue
                if (this.key[k].l + this.key[k].w > rx)
                    continue
                this.key[k].on = true
                //  同一音高は最初に見つけた1個だけ
                this.inversion[t] = false
            }
       }
                                
       this.updateKeyFlush()
                                
       this.updateInversion()
    },
    updateKeyFlush(){
        //   鍵フラッシュ
        for (var k = KeyMin; k <= KeyMax; k++) {
           var elid = 'el_key' + k
           var el = document.getElementById(elid)
           el.style.backgroundColor = this.key[k].play ? colorPlayOn : (this.key[k].on ? colorPlayOff : (this.isWhite(k) ? '#C8C8C8' : '#3F3F3F'))
        }
    },
    //  構成音がオミットできるか
    isEnableOmit(k){
          var midx = this.type[typeSelIndex].name[0].indexOf('m', 0)
          var dimidx = this.type[typeSelIndex].name[0].indexOf('dim', 0)
          var minor = midx >= 0 && dimidx < 0
          var fifth = this.type[typeSelIndex].name[0].indexOf('5', 0) >= 0
          var add9 = this.type[typeSelIndex].name[0].indexOf('add9', 0) >= 0
          var toneNum = this.type[typeSelIndex].toneNum
          var omit5th = false   //  完全5度省略モードはオフ
          var p5th = this.isSameSemiTone(k, rootSelIndex + 7)
          //  クォードコード以上の省略（省略モードがあれば）
          if (toneNum > 3){
               //   完全5度省略モードのとき
               if (omit5th){
                   //（構成音が完全5度なら省略　ただし、4度が存在しないこと）
                   if (p5th && !fifth)
                       return true
               }
          }
          var order = (k % 12 + 12 - rootSelIndex) % 12
          //  9th
          if (toneNum == 5 || add9){
               if (p5th)
                   return  true
          }
          //  11th
          else if (toneNum == 6){
               if (p5th)
                   return true
               else if (order == 1 && !minor)
                   return true
          }
          //  13th
          else if (toneNum == 7){
               if (p5th)
                   return true
               else if (order == 1 && !minor)
                   return true
               else if (order == 2 && !fifth)
                   return true
          }
          return false
    },
    isSameSemiTone(k1, k2){
          return k1 % 12 == k2 % 12
    },
    //  タップ発音
    touchPlayStart(e) {
        isPlaying = true
        ChordDictionary.midiOutOn(e)
                            
        this.disabledDoubleTapZooming(e)
    },
    touchPlayEnd(e) {
        ChordDictionary.midiOutOff(e)
        isPlaying = false
        
        //  苦肉の策的な鳴りっぱなし防止（乱れ打ち対策）
        this.midiOutOffAllNote()
    },
    touchPlayEndByKey(e) {
        ChordDictionary.midiOutOff(e)
        isPlaying = false

        //  発音中にスクロールした鍵表示をリセットする
        this.scrollKeyboard()

        //  苦肉の策的な鳴りっぱなし防止（乱れ打ち対策）
        this.midiOutOffAllNote()
    },
    midiOutOn(e) {
       for (var k = KeyMin; k <= KeyMax; k++) {
            if (!this.key[k].on){
                this.key[k].play = false
                continue
            }
            this.key[k].play = true

            //  MIDIメッセージ送信
            var array = [];
            array.push(parseInt("90", 16));
            array.push(k);
            array.push(parseInt("5f", 16));
            KWM.sendMidiMessage(array, null, 0);
            //  鍵フラッシュオン
            var elid = 'el_key' + k
            var el = document.getElementById(elid)
            el.style.backgroundColor = colorPlayOn
        }
    },
    midiOutOff(e) {
       for (var k = KeyMin; k <= KeyMax; k++) {
            this.key[k].play = false
            if (!this.key[k].on)
                continue

            //  MIDIメッセージ送信
            var array = [];
            array.push(parseInt("80", 16));
            array.push(k);
            array.push(parseInt("00", 16));
            KWM.sendMidiMessage(array, null, 0);
            //  鍵フラッシュオフ
            var elid = 'el_key' + k
            var el = document.getElementById(elid)
            el.style.backgroundColor = colorPlayOff
        }
        this.updateKeyFlush()
    },
    midiOutOffAllNote(){
         for (var k = KeyMin; k <= KeyMax; k++) {
              //  MIDIメッセージ送信
              var array = [];
              array.push(parseInt("80", 16));
              array.push(k);
              array.push(parseInt("00", 16));
              KWM.sendMidiMessage(array, null, 0);
         }
    },
      
    getChordKeyRight() {
        var parent = document.getElementById('chord_dictionary_play')
        var pw = parent.clientWidth
        var lx = parent.scrollLeft
        var cx = lx + pw / 2
        var rx = lx + pw
        var inv = new Array(12)
        //   コード構成音転回形フラグ
        for (var i = 0; i < 24; i++) {
            this.inversion[i] = false
        }
        for (var t = 0; t < 24; t++) {
           //  ルートCのタイプコード構成音フラグ
           var isOn = this.type[typeSelIndex].tone[t]
           //  ルート転回（オクターブスイッチを反映）
           inv[(t + rootSelIndex) % 12] |= isOn
           this.inversion[(t + rootSelIndex) % 24] = isOn
        }
        //   コード最高音高に最寄りのコード構成音を決める
        var ks = -1
        var gxs = 10000
        for (var k = KeyMin; k <= KeyMax; k++) {
           var i = k % 12
           if (!inv[i])
              continue
           var cxk = this.key[k].l
           if (cxk < lx)
              continue
           if (cxk + this.key[k].w > rx)
              continue
           var gx = Math.abs(cxk - rx)
           if (gxs < gx)
              continue
           gxs = gx
           ks = k
        }
        return ks
    },
    getChordKeyCenter() {
        var parent = document.getElementById('chord_dictionary_play')
        var pw = parent.clientWidth
        var lx = parent.scrollLeft
        var cx = lx + pw / 2
        var rx = lx + pw
        var inv = new Array(12)
        for (var t = 0; t < 24; t++) {
           //  ルートCのタイプコード構成音フラグ
           var isOn = this.type[typeSelIndex].tone[t]
           //  ルート転回（オクターブスイッチを反映）
           inv[(t + rootSelIndex) % 12] |= isOn
        }
        //   コード最高音高に最寄りのコード構成音を決める
        var ks = -1
        var gxs = 10000
        for (var k = KeyMin; k <= KeyMax; k++) {
           var i = k % 12
           if (!inv[i])
              continue
           var cxk = this.key[k].l + this.key[k].w / 2
           if (cxk < lx)
              continue
           if (cxk + this.key[k].w > rx)
              continue
           var gx = Math.abs(cxk - cx)
           if (gxs < gx)
              continue
           gxs = gx
           ks = k
        }
        return ks
    },
    getInversionIndex(ks) {
        var ti = -1
        for (var t = 0; t < 24; t++) {
            var i = ks % 12
            var j = t % 12
            if (i != j)
                continue
            if (!this.inversion[t])
                continue
            ti = t
            break
        }
        return ti
    },
                                
    getChordKeyUpper(ks) {
        var inv = new Array(12)
        for (var t = 0; t < 24; t++) {
           //  ルートCのタイプコード構成音フラグ
           var isOn = this.type[typeSelIndex].tone[t]
           //  ルート転回（オクターブスイッチを反映）
           inv[(t + rootSelIndex) % 12] |= isOn
        }
        var i = ks % 12
        for (var j = 0; j < 12; j++) {
            var m = (j + i) % 12
            if (!inv[m])
                continue
            if (ks + j > KeyMax)
                return -1
            return ks + j
        }
        return -1
    },
    getChordKeyLower(ks) {
        var inv = new Array(12)
        for (var t = 0; t < 24; t++) {
           //  ルートCのタイプコード構成音フラグ
           var isOn = this.type[typeSelIndex].tone[t]
           //  ルート転回（オクターブスイッチを反映）
           inv[(t + rootSelIndex) % 12] |= isOn
        }
        var i = ks % 12
        for (var j = 0; j < 12; j++) {
            var m = (i - j + 24) % 12
            if (!inv[m])
                continue
            return ks - j
        }
        return -1
    },

    rotateChord(up) {
        var parent = document.getElementById('chord_dictionary_play')
        var pw = parent.clientWidth
        var close = !this.openVoicing || !this.type[typeSelIndex].open
        if (close) {
            var pw = parent.clientWidth
            var lx = parent.scrollLeft
            var cx = lx + pw / 2
            var rx = lx + pw
            if (up) {
                //  現状の最低構成音高を探し、オクターブ上に転回
                for (var k = KeyMin; k <= KeyMax; k++) {
                    if (!this.key[k].on)
                        continue
                    var ku = k + 12
                    if (ku > KeyMax)
                        return
                    if (this.key[ku].l + this.key[ku].w > rx)
                        return
                    this.key[k].on = false
                    this.key[ku].on = true
                    break
                }
            }
            else {
                //  現状の最高構成音高を探し、オクターブ下に転回
                for (var k = KeyMax; k >= KeyMin; k--) {
                    if (!this.key[k].on)
                        continue
                    var ku = k - 12
                    if (ku < KeyMin)
                        return
                    if (this.key[ku].l + this.key[ku].w > rx)
                        return
                    this.key[k].on = false
                    this.key[ku].on = true
                    break
                }
            }
            //   鍵フラッシュ
            var xmin = 100000
            var xmax = -100000
            for (var k = KeyMin; k <= KeyMax; k++) {
                var elid = 'el_key' + k
                var el = document.getElementById(elid)
                el.style.backgroundColor = this.key[k].play ? colorPlayOn : (this.key[k].on ? colorPlayOff : (this.isWhite(k) ? '#C8C8C8' : '#3F3F3F'))
                if (this.key[k].on) {
                    var l = this.key[k].l
                    var r = l + this.key[k].w
                    xmin = Math.min(xmin, l)
                    xmax = Math.max(xmax, r)
                }
            }
            var scrollLeft = (xmax + xmin) / 2 - pw / 2
            // 自動スクロール
            parent.scroll(scrollLeft, 0)

            this.touchPlayStart()
        }
        else {
            var ks = this.getChordKeyRight()
            var ks = up ? this.getChordKeyUpper(ks + 1) : this.getChordKeyLower(ks - 1)
            if (ks < 0)
                return
                                
            //  最高構成音高のinversionインデックスを見つける
            var ti = this.getInversionIndex(ks)
            if (ti < 0)
                return
                                
            var kn = this.getChordKeyUpper(ks + 1)
            //  右端の鍵盤矩形を含むちょっと右まで
            var scrollLeft = kn < 0 ?  this.key[ks].l + this.key[ks].w - pw + 1 : this.key[kn].l + this.key[kn].w - pw - 1
            // 自動スクロール
            parent.scroll(scrollLeft, 0)

            this.scrollKeyboard()

            this.touchPlayStart()
        }
    },
                                
    updateInversion() {
        var parent = document.getElementById('chord_dictionary_play')
        var pw = parent.clientWidth
        var close = !this.openVoicing || !this.type[typeSelIndex].open
        if (close) {
            var lx = parent.scrollLeft
            var cx = lx + pw / 2
            var rx = lx + pw
            var invdown = document.getElementById('arrow_left')
            var invup = document.getElementById('arrow_right')
            var ok = false
            //  現状の最低構成音高を探し、オクターブ上に転回
            for (var k = KeyMin; k <= KeyMax; k++) {
                if (!this.key[k].on)
                    continue
                var ku = k + 12
                if (ku > KeyMax)
                    break
                if (this.key[ku].l + this.key[ku].w > rx)
                    break
                ok = true
                break
            }
            invup.style.visibility = ok ? 'visible' : 'hidden'
            //  現状の最高構成音高を探し、オクターブ下に転回
            ok = false
            for (var k = KeyMax; k >= KeyMin; k--) {
                if (!this.key[k].on)
                    continue
                var ku = k - 12
                if (ku < KeyMin)
                    break
                if (this.key[ku].l + this.key[ku].w > rx)
                    break
                ok = true
                break
            }
            invdown.style.visibility = ok ? 'visible' : 'hidden'
        }
        else {
            var ks = this.getChordKeyRight()
            var invdown = document.getElementById('arrow_left')
            var invup = document.getElementById('arrow_right')
            var k = this.getChordKeyUpper(ks + 1)
            invup.style.visibility = k < 0 ? 'hidden' : 'visible'
            k = this.getChordKeyLower(ks - 1)
            //  右端の鍵盤矩形を含むちょっと右まで
            var scrollLeft = this.key[k].l + this.key[k].w - pw + this.key[k].w * 0.2
            invdown.style.visibility = scrollLeft < 0 ? 'hidden' : 'visible'
        }
    },
    rotateChordDown(e){
        this.disabledDoubleTapZooming(e)
        this.rotateChord(false)
        this.updateInversion()
    },
    rotateChordUp(e){
        this.disabledDoubleTapZooming(e)
        this.rotateChord(true)
        this.updateInversion()
    },
                                
                                
  },
                  
})

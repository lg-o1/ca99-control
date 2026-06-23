
const colorOn = '#a2a2a2'
const colorOffL = '#474647'
const colorOffD = '#2d2c2c'

const TextKeyboard = {

    letter: ['1','2','3','4','5','6','7','8','9','0','q','w','e','r','t','y','u','i','o','p',',','a','s','d','f','g','h','j','k','l','.','z','x','c','v','b','n','m','×',' '],
    text: '',

    open(){

        var keyboard = document.getElementById('text_keyboard')
        keyboard.textContent = null
        keyboard.style.visibility = 'hidden'

        var pw = keyboard.clientWidth
        var ph = keyboard.clientHeight

        var isX
        var m = 1
        var colm = 10
        var line = Math.floor(this.letter.length / colm) + 1
        var w = (pw - (m * (colm + 1))) / colm
        var h = (ph - (m * (line + 1))) / line
        var t, l, ww
        for (var k = 0; k < this.letter.length; k++){
             //  input要素を生成
             var input = document.createElement('input')
             //  classを追加
             input.className = 'text_key'
             var elid = input.className + k
             input.setAttribute('id', elid)
             //  buttonタイプにする
             input.setAttribute('type', 'button')
             //  ボタン名
             input.setAttribute('value', this.letter[k])
             //  生成した要素を追加
             keyboard.appendChild(input)
             var el = document.getElementById(elid)
             if (!el)
                 return

             isX = false
             //  配置
             if (k < this.letter.length - 2){
                 l = m + (w + m) * (k % colm)
                 t = m + Math.floor(k / colm) * (h + m)
                 ww = w
             }
             // X
             else if (k == this.letter.length - 2){
                 l = m + (w + m) * (k % colm)
                 t = m + Math.floor(k / colm) * (h + m)
                 ww = w * 2 + m
                 isX = true
             }
             // Space
             else if (k == this.letter.length - 1){
                 l = m
                 t = m + (line - 1) * (h + m)
                 ww = pw
             }
             el.style.left = l + 'px'
             el.style.width = ww + 'px'
             el.style.top = t + 'px'
             el.style.height = h + 'px'
             el.style.textAlign = 'center'
             el.style.verticalAlign = 'middle'
             el.style.fontSize = Math.min(h * 0.6, w * 0.5) * (isX ? 1.5 : 1) + 'px'
             el.style.backgroundColor = k < this.letter.length - 2 ? colorOffL : colorOffD
             //  イベントハンドラ登録
             el.addEventListener('touchstart', this.typeBeg, { passive: true })
             el.addEventListener('touchend', this.typeEnd, { passive: true })
        }
    },
    close(){
        const keyboard = document.getElementById('text_keyboard')
        keyboard.textContent = null
        keyboard.style.visibility = 'hidden'
    },
    inputStart(e){
        var keyboard = document.getElementById('text_keyboard')
        keyboard.style.visibility = 'visible'
        TextKeyboard.resetText()
    },
    typeBeg(e){
        var keyboard = document.getElementById('text_keyboard')
        e.target.style.backgroundColor = colorOn
        if (e.target.value === '×'){
            TextKeyboard.backspace()
        }
        else if (e.target.value === ' '){
            TextKeyboard.inputLetter(' ')
        }
        else{
            TextKeyboard.inputLetter(e.target.value)
        }
    },
    typeEnd(e){
        if (e.target.value === '×'){
            e.target.style.backgroundColor = colorOffD
        }
        else if (e.target.value === ' '){
            e.target.style.backgroundColor = colorOffD
        }
        else{
            e.target.style.backgroundColor = colorOffL
        }
    },
    inputLetter(letter){
        var text = TextKeyboard.text
        //  先頭にスペース、コロン、ピリオドは禁止
        if (text.length == 0){
            if (letter === ' ' || letter === '.' || letter ===',')
                return
        }
        text += letter
        TextKeyboard.text = text
        popup.textInput = TextKeyboard.text
    },
    backspace(){
        var text = TextKeyboard.text
        text = text.substr(0, text.length - 1)
        TextKeyboard.text = text
        popup.textInput = TextKeyboard.text
    },
    resetText(){
        TextKeyboard.text = ''
        popup.textInput = TextKeyboard.text
    },
}
/*!
 * Kawai UI Components
 * kawai-ui-components.js
 * @version v0.1.0
 * @copyright 2019-2020 Kawai Musical Instruments Manufacturing Co.,
 */

// Toggle
Vue.component ('kuic-toggle', {
  template: `
    <div class="kuic__toggle" :class="{'kuic__toggle--on' : isOn}" @click="click">
      <span class="kuic__toggle-label" :key="label">{{label}}</span>
    </div>
  `,
  props: {
    status: {
      type: Boolean,
      default: false
    },
    data: {
      type: Object,
      'default': () => ({on: '', off: ''})
    }
  },
  data: function () {
    return {
      isOn: false,
      label: ''
    }
  },
  mounted: function () {
    this.init()
  },
  methods: {
    init () {
      if (typeof this.status === 'number') {
        if (this.status === 0) { this.isOn = false } else { this.isOn = true }
      } else {
        if (this.status) {
          this.label = this.data.on
          this.isOn = true
        } else {
          this.label = this.data.off
          this.isOn = false
        }
      }
    },
    click() {
      if (this.isOn) {
        this.isOn = false
        this.$emit ('click', false)
      } else {
        this.isOn = true
        this.$emit ('click', true)
      }
    }
  },
  watch: {
    isOn: function () { this.init() },
    data: function () { this.init() },
    status: function (newVal) {
      if (newVal) {
        this.label = this.data.on
        this.isOn = true
      } else {
        this.label = this.data.off
        this.isOn = false
      }
    }
  }
})

// Selector
Vue.component ('kuic-selector', {
  template: `
    <div class="kuic__selector" :index="index" :array="array" v-show="isShown">
      <span class="kuic__selector__label" :key="label">{{label}}</span>
      <div class="kuic__selector__prev" v-show="prevBtn" @click="prev">
        <i class="KIF-navigate-before"></i>
      </div>
      <div class="kuic__selector__next" v-show="nextBtn" @click="next">
        <i class="KIF-navigate-next"></i>
      </div>
    </div>
  `,
  props: {
    index: {
      type: Number,
      default: 0
    },
    array: Array,
  },
  data: ()=> {
    return {
      isShown: true,
      i: '',
      label: '',
      prevBtn: true,
      nextBtn: true,
    }
  },
  mounted: function () {
    this.i = this.index
    this.set()
  },
  methods: {
    set () {
      if (!this.array) { return }
      this.label = this.array[this.i]
      if (this.i === 0) {this.prevBtn = false} else {this.prevBtn = true}
      if (this.i === this.array.length - 1) {this.nextBtn = false} else {this.nextBtn = true}
    },
    select () {
      let item = {}
      item.index = this.i
      item.selected = this.label
      this.$emit ('select', item)
    },
    prev () {
      this.i--
      this.set()
      this.select()
    },
    next () {
      this.i++
      this.set()
      this.select()
    },
  },
  watch: {
    index: function () {
      this.i = this.index
      this.set()
    },
    array: function () {
      this.i = this.index
      this.set()
    }
  }
})

// Slider
Vue.component ('kuic-slider', {
  template: /*html*/`
    <div class="kuic__slider" v-show="isShown" @click="dblclickHundler">
     <div class="kuic__slider__track"></div>
     <div class="kuic__slider__track--active" :style="trackPosition"></div>
     <div ref="thumb" class="kuic__slider__thumb" :style="thumbPosition"
     @pointerdown.prevent="onStart" @pointermove.prevent="onMove" @pointerup.prevent="onEnd"></div>
    </div>
  `,
  props: {
    val: {
      type: Number,
      default: 0
    },
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 127
    },
    default: {
      type: Number,
      default: null
    },
    step: {
      type: Number,
      default: 1
    },
    inputEvent: {
      type: Boolean,
      default: true
    },
    inputLimitTime: {
      type: Number,
      default: 20 // = 50fps
    },
    outputLimitTime : {
      type: Number,
      default: 50 // = 20fps
    }
  },
  data: ()=> {
    return {
      isShown: true,
      isUserTouch: false,
      position: null,
      value: null,
      inputLastTime: undefined,
      outputLastTime: undefined,
      clickLastTime: undefined,
      isTouchDevice: false,
      touchStartX: null,
    }
  },
  computed: {
    trackPosition () {
      return {
        width: this.position + '%'
      }
    },
    thumbPosition () {
      return {
        left: this.position + '%'
      }
    },
  },
  mounted: function () {
    this.value = this.val
    let position
    if (this.value === this.min) {
      position = 0
    } else if (this.value === this.max) {
      position = 100
    } else {
      if (this.min < 0 || this.min > 1) {
        position = Math.floor((this.value - this.min) / (this.max - this.min) * 100)
      } else {
        position = Math.floor(this.value / (this.max - this.min) * 100)
      }
    }
    this.setSlider(position)
  },
  methods: {
    onStart (event) {
      this.$refs.thumb.setPointerCapture(event.pointerId)
      this.isUserTouch = true
      const x = event.clientX
      this.setSlider(this.getPosition(x))
      if (this.inputEvent) { this.emitEvent(this.getValue(x)) }
    },
    onMove (event) {
      if (this.isUserTouch) {
        const x = event.clientX
        this.setSlider(this.getPosition(x))
        if (this.inputEvent) { this.emitEvent(this.getValue(x)) }
      }
    },
    onEnd (event) {
      this.$refs.thumb.releasePointerCapture(event.pointerId)
      this.isUserTouch = false
      this.setSlider(this.position)
      this.emitTouchEndEvent(this.position)
    },
    dblclickHundler () {
      const now = Date.now()
      if (this.default !== null) {
        if (now - this.lastTime < 300) {
          if (this.min < 0 || this.min > 1) {
            this.position = Math.floor((this.default - this.min) / (this.max - this.min) * 100)
          } else {
            this.position = Math.floor(this.default / (this.max - this.min) * 100)
          }
          this.emitEvent(this.default)
          this.setSlider(this.position)
          this.emitTouchEndEvent(this.position)
        }
        this.lastTime = now
      }
    },
    getPosition (x) {
      let posi
      const el = this.$el.getBoundingClientRect()
      if (x - el.left < 0) {
        posi = 0
      } else if (x - el.left > el.width) {
        posi = 100
      } else {
        posi = Math.floor((x - el.left) / el.width * 100)
      }
      return posi
    },
    getValue (x) {
      let val
      const el = this.$el.getBoundingClientRect()
      if (x - el.left < 0) {
        val = this.min
      } else if (x - el.left > el.width) {
        val = this.max
      } else {
        val = Math.floor((x - el.left) / el.width * (this.max - this.min)) + this.min
      }
      return val
    },
    setSlider (position) {
      if (position !== this.position) {
        const now = Date.now()
        if (this.inputLastTime && now - this.inputLastTime < this.inputLimitTime) { return }
        this.inputLastTime = now
        this.position = position
        // console.log('UI値', position)
      }
    },
    emitEvent (value) {
      if (value !== this.value) {
        const now = Date.now()
        if (this.outputLastTime && now - this.outputLastTime < this.outputLimitTime) { return }
        this.outputLastTime = now
        this.value = value
        this.$emit ('move', value)
        // console.log('出力値', value)
      }
    },
    emitTouchEndEvent (position) {
      let value
      if (position === 0) {
        value = this.min
      } else if (position === 100) {
        value = this.max
      } else {
        value = Math.floor(position / 100 * (this.max - this.min)) + this.min
      }
      if (value !== this.value) {
        this.value = value
        this.$emit ('move', value)
        // console.log('出力値', value)
      }
    }
  },
  watch: {
    val: function (value) {
      if (this.isUserTouch) { return }
      this.value = value
      let position
      if (value === this.min) {
        position = 0
      } else if (value === this.max) {
        position = 100
      } else {
        if (this.min < 0 || this.min > 1) {
          position = Math.floor((this.value - this.min) / (this.max - this.min) * 100)
        } else {
          position = Math.floor(this.value / (this.max - this.min) * 100)
        }
      }
      this.setSlider(position)
    },
  }
})

// Lists
Vue.component ('kuic-lists', {
  template:
  `<ul class="mdc-list" aria-orientation="vertical">
    <kuic-list v-for="item in data" :item="item" :key="item.ID" :selected="selected" :icon-only="iconOnly" @click="click(item)" @toggle="toggle(item)"></kuic-list>
  </ul>`,
  props: ['data', 'selected', 'iconOnly'],
  methods: {
    click (item) {
      this.$emit ('click', item)
    },
    toggle (item) {
      this.$emit ('toggle', item.id)
    }
  }
})
Vue.component ('kuic-list', {
  template:
  `<div :class = "{'mdc-list--two-line': item.secondary}">
    <li class="kuic__list mdc-list-item" :class = "{'kuic__list--selected': item.id === selected ||  item.name === selected}" @click="click(item)">
      <i class="kuic__list__iconL mdc-list-item__graphic" aria-hidden="true" v-if="item.iconL" :class="item.iconL"></i>
      <span class="kuic__list__text" v-if="!item.secondary" :key="item.name">{{item.name}}</span>
      <span class="mdc-list-item__text" v-if="item.secondary">
        <span class="kuic__list__text mdc-list-item__primary-text" :key="item.name">{{item.name}}</span>
        <span class="kuic__list__sub-text mdc-list-item__secondary-text" :key="item.secondary">{{item.secondary}}</span>
      </span>
      <div class="kuic__list__btnR" v-if="item.iconR" @click="toggle(item, event)"></div>
      <i class="kuic__list__iconR mdc-list-item__meta " aria-hidden="true" v-if="item.iconR" :class="item.iconR"></i>
    </li>
    <hr class="kuic__list__divider mdc-list-divider">
  </div>`,
  props: {
    item: Object,
    selected: {
      default: null
    },
    iconOnly: {
      default: false
    }
  },
  methods: {
    click (item) {
      this.$emit('click', item)
    },
    toggle (item, event) {
      if (this.iconOnly) return
      event.stopPropagation()
      this.$emit ('toggle', item)
    },
  }
})

// Curve Graph
Vue.component ('kuic-curve-graph', {
  template:
  `<svg ref="test" :view-box.camel="'0 0 '+ width + ' ' + height">
    <curve-graph-drawing :array="slicedArray" :step="step" :width="width" :height="height" :maxvalue="maxvalue"/>
  </svg>`,
  props: {
    array: Array,
    viewrange: Array,
    maxvalue: Number
  },
  data () {
    return {
      height: 0,
      width: 0,
    }
  },
  computed: {
    slicedArray () {
      if (this.viewrange === undefined) {
        return this.array
      } else {
        return this.array.slice( this.viewrange[0], this.viewrange[1] )
      }
    },
    step () {
      if (this.viewrange === undefined) {
        return this.array.length - 0
      } else {
        return this.viewrange[1] - this.viewrange[0] - 0
      }
    },
  },
  beforeUpdate () {
    const updatedWidth = document.getElementById(this.$el.id).clientWidth * 10
    const updatedHeight = document.getElementById(this.$el.id).clientHeight * 10
    if ( this.height !== updatedWidth || this.width !== updatedHeight ) {
      this.width = updatedWidth
      this.height = updatedHeight
    }
  }
})
Vue.component ('kuic-curve-graph-drawing', {
  template:
  `<g>
    <path class="curve-graph__path" :d="pathData" />
    <circle class="curve-graph__dot" v-for="(item, index) in array"
    :cx="stepWidth / 2 + ( index * stepWidth )" :cy="(height - stepHeight) - ( item * stepHeight )" :r="dotSize" />
  </g>`,
  props: {
    array: Array,
    step: Number,
    width: Number,
    height: Number,
    maxvalue: Number
  },
  computed: {
    stepWidth () {
      if ( this.width ) {
        return this.width / this.step
      } else {
        return 0
      }
    },
    stepHeight () {
      if ( this.height ) {
        return (this.height - this.dotSize) / (this.maxvalue + 2 )
      } else {
        return 0
      }
    },
    dotSize () {
      const size = Math.floor (2.5 * this.stepWidth / 10)
      if (size <= 100) {
        return size
      } else {
        return 100
      }
    },
    pathData () {
      if (this.step <= this.array.length) {
        let path = 'M' + this.stepWidth / 2 + ',' + this.height + ' '
        for (let i = 0;  i < this.step; i ++) {
          path += 'L' + ( this.stepWidth / 2 + i * this.stepWidth ) + ',' + ( ( this.height - this.stepHeight ) - this.array[i] * this.stepHeight ) + ' '
        }
        path += 'V' + this.height
        // console.log(path)
        return path
      }
    }
  }
})

// Bar Graph
Vue.component ('kuic-bar-graph', {
  template: ``,
  props: {},
  data: function () {
    return {
    }
  },
  mounted: function () {},
  methods: {},
  watch: {}
})
Vue.component ('kuic-bar-graph-drawing', {
  template: ``,
  props: {},
  data: function () {
    return {
    }
  },
  mounted: function () {},
  methods: {},
  watch: {}
})

// Page Dots
Vue.component ('kuic-pagedots', {
  template: `
    <svg :width="width" :height="height" :viewbox=viewbox>
      <circle v-for="n of pages" :key="n" :cx="span * n" :cy="size" :r="size / 2" :stroke-width="strokeWidth"
       class="kuic__pagedot" :class = "{'kuic__pagedot--active': page === n - 1}"></circle>
    </svg>
  `,
  props: {
    page: {
      type: Number,
      default: 0
    },
    pages: {
      type: Number,
      default: 0
    },
    size: {
      type: Number,
      default: 5
    },
    strokeWidth: {
      type: Number,
      default: 1.5
    }
  },
  computed: {
    width () {
      return this.size * 3 * this.pages
    },
    height () {
      return this.size * 2
    },
    span () {
      return this.width / (this.pages + 1)
    },
    viewbox () {
      return '0 0 ' + this.width + ' ' + this.height
    }
  }
})
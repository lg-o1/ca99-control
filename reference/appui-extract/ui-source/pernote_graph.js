'use strict'

Vue.component('pernote-graph', {
    template:
    /*html*/`
    <div class="pernote">
        <svg
        class="pernote__graph"
        xmlns="http://www.w3.org/2000/svg"
        :width="width"
        :height="height"
        @touchstart.passive="touchstart"
        @touchmove.passive="touchmove"
        @touchend.passive="touchend">
            <g :font-family="options.legend.fontFamily" :font-size="options.legend.fontSize" :fill="options.legend.fontColor">
                <text
                v-for="(label, i) in options.legend.xAxis.label"
                :x="options.legend.yAxis.padding + options.padding.left + graphWidth / (stepNum - 1) * i"
                :y="graphHeight + options.legend.xAxis.padding + options.padding.bottom"
                text-anchor="middle">
                {{label}}
                </text>
                <text
                v-for="(label, i) in options.legend.yAxis.label"
                :x="options.legend.yAxis.padding - options.padding.left"
                :y="graphHeight / 2 * i + options.padding.top + options.legend.fontSize / 2"
                text-anchor="end">
                {{label}}
                </text>
            </g>
            <g :style="'transform:translate(' + (options.legend.yAxis.padding + options.padding.left) + 'px,' + options.padding.top + 'px);'">
                <rect
                v-for="(n, i) in data.array"
                :x="stepWidth * (i + 0.15)"
                :y="graphHeight / 2 - 0.5"
                :width="stepWidth * 0.7"
                :height="1"
                :fill="(data.index === i) ? '#1f8c99' : '#a2a2a2'">
                </rect>
                <rect
                v-for="(n, i) in data.array"
                :x="stepWidth * (i + 0.15)"
                :y="(Math.sign(data.array[i]) === 1) ? graphHeight / 2 - data.array[i] * stepHeight : graphHeight / 2"
                :width="stepWidth * 0.7"
                :height="Math.abs(data.array[i] * stepHeight)"
                :fill="(data.index === i) ? '#1f8c99' : '#a2a2a2'">
                </rect>
                <rect
                v-for="(key, i) in whiteKeys"
                :class="'note-' + key.noteNum"
                :x="keyRefWidth * key.width * (key.index - beginOfWhite)"
                :y="graphHeight + options.padding.bottom * 2"
                :width="keyRefWidth * key.width"
                :height="keyRefWidth * key.height"
                :fill="(key.noteNum - 21 === data.index) ? '#1f8c99' : key.fill"
                :stroke="key.stroke">
                </rect>
                <rect
                v-for="(key, i) in blackKeys"
                :class="'note-' + key.noteNum"
                :x="keyRefWidth * key.interval * (key.index - beginOfWhite) - keyRefWidth * key.width / 2 + keyRefWidth * key.width * key.offset"
                :y="graphHeight + options.padding.bottom * 2"
                :width="keyRefWidth * key.width"
                :height="keyRefWidth * key.height"
                :fill="(key.noteNum - 21 === data.index) ? '#1f8c99' : key.fill"
                :stroke="key.stroke">
                </rect>
            </g>
        </svg>
    </div>
    `,
    props: {
        data: {
            type: Object,
            default () {
                return {
                    array: Array(88).fill(0),
                    index: 39,
                    maxvalue: 5,
                    minvalue: -5
                }
            }
        },
        options: {
            type: Object,
            default () {
                return {
                    drawmode: {
                        type: Boolean,
                        default: false
                    },
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
            }
        }
    },
    data () {
        return {
            graph: null,
            width: 0,
            height: 0,
            white: [],
            black: [],
            beginOfNoteNum: 21,
            endOfNoteNum: 108,
            internal: {
                array: Array(88).fill(0),
                index: 1
            },
            isMidi: false,
            touchMoveLastTime: undefined,
            timer: 200
        }
    },
    created () {
        let cntw = 0
        let cntb = 0
        const getOffset =(key)=> {
            switch(key % 12){
                case 1: return -0.594 / 6.45
                case 3: return 0.594 / 6.45
                case 6: return -0.594 / 4.31
                case 8: return 0
                case 10: return 0.594 / 4.31
            }
            return 0
        }
        for(let i = 0; i < 130; i++){
            if([0, 2, 4, 5, 7, 9, 11].includes(i % 12)){
                this.white[cntw] = {
                    index: cntw,
                    noteNum: i,
                    width: 1,
                    height: 6.45,
                    interval: 1,
                    offset: 0,
                    fill: '#a2a2a2',
                    stroke: '#2d2c2c'
                }
                cntw += 1
            }else{
                this.black[cntb] = {
                    index: cntw,
                    noteNum: i,
                    width: 0.594,
                    height: 4.31,
                    interval: 1,
                    offset: getOffset(i),
                    fill: '#2d2c2c',
                    stroke: '#2d2c2c'
                }
                cntb += 1
            }
        }
    },
    mounted () {
        this.graph = this.$el
        window.addEventListener('orientationchange', ()=> {
            setTimeout(()=> { this.getWindowSize() }, 100)
        })
    },
    beforeUpdate () {
        this.getWindowSize()
    },
    computed: {
        beginOfWhite () {
            return this.white.findIndex((el) => el.noteNum >= this.beginOfNoteNum)
        },
        endOfWhite () {
            return this.white.findIndex((el) => el.noteNum > this.endOfNoteNum)
        },
        whiteKeys () {
            return this.white.slice(this.beginOfWhite, this.endOfWhite)
        },
        beginOfBlack () {
            return this.black.findIndex((el) => el.noteNum >= this.beginOfNoteNum)
        },
        endOfBlack () {
            return this.black.findIndex((el) => el.noteNum >= this.endOfNoteNum)
        },
        blackKeys () {
            return this.black.slice(this.beginOfBlack, this.endOfBlack)
        },
        keyRefWidth () {
            return this.graphWidth / this.whiteKeys.length
        },
        graphWidth () {
            if (this.width) {
                return this.width - this.options.legend.yAxis.padding - (this.options.padding.left + this.options.padding.right)
            } else {
                return 0
            }
        },
        graphHeight () {
            if (this.height) {
                return this.height - this.options.legend.xAxis.padding - (this.options.padding.top + this.options.padding.bottom)
            } else {
                return 0
            }
        },
        stepNum () {
            return this.data.array.length
        },
        stepWidth () {
            return this.graphWidth / this.data.array.length
        },
        stepHeight () {
            return this.graphHeight / Math.abs(this.data.minvalue - this.data.maxvalue)
        },
        getFullData () {
            const arrStart = Array(21).fill(0)
            const arrEnd = Array(19).fill(0)
            const data = arrStart.concat(...this.data.array).concat(...arrEnd)
            return data
        }
    },
    methods: {
        getWindowSize () {
            const updatedWidth = this.graph.clientWidth
            const updatedHeight = this.graph.clientHeight
            if ( this.height !== updatedWidth || this.width !== updatedHeight ) {
                this.width = updatedWidth
                this.height = updatedHeight
            }
        },
        decrementKey () {
            const array = this.data.array
            const index = this.data.index - 1
            this.internal = { ...this.internal, array: array, index: index }
            this.isMidi = false
            this.$emit('draw', this.internal, this.getFullData, this.isMidi)
        },
        incrementKey () {
            const array = this.data.array
            const index = this.data.index + 1
            this.internal = { ...this.internal, array: array, index: index }
            this.isMidi = false
            this.$emit('draw', this.internal, this.getFullData, this.isMidi)
        },
        decrementOffset () {
            const array = this.data.array
            const index = this.data.index
            array[index] -= 1
            this.internal = { ...this.internal, array: array, index: index }
            this.$emit('set', this.internal, this.getFullData)
        },
        incrementOffset () {
            const array = this.data.array
            const index = this.data.index
            array[index] += 1
            this.internal = { ...this.internal, array: array, index: index }
            this.$emit('set', this.internal, this.getFullData)
        },
        resetOffset () {
            const array = this.data.array
            const index = this.data.index
            array[index] = 0
            this.internal = { ...this.internal, array: array, index: index }
            this.$emit('set', this.internal, this.getFullData)
        },
        resetData () {
            const array = Array(88).fill(0)
            const data = Array(128).fill(0)
            this.internal = { ...this.internal, array: array }
            this.$emit('set', this.internal, data)
        },
        touchstart (e) {
            const array = this.data.array
            const index = this.data.index
            const pixelY = this.graphHeight / 2 - (e.touches[0].clientY - this.graph.getBoundingClientRect().top) + this.options.padding.top
            const valueY = Math.round(pixelY / this.graphHeight * Math.abs(this.data.minvalue - this.data.maxvalue))
            if(this.data.minvalue <= valueY && valueY <= this.data.maxvalue){
                array[index] = valueY
            }else if(valueY <= this.data.minvalue){
                array[index] = this.data.minvalue
            }else if(valueY >= this.data.maxvalue){
                array[index] = this.data.maxvalue
            }
            this.internal = { ...this.internal, array: array, index: index }
            this.isMidi = false
            this.touchMoveLastTime = undefined
            this.$emit('draw', this.internal, this.getFullData, this.isMidi)
        },
        touchmove (e) {
            let now = new Date().getTime()
            const array = this.data.array
            const index = this.data.index
            const pixelY = this.graphHeight / 2 - (e.touches[0].clientY - this.graph.getBoundingClientRect().top) + this.options.padding.top
            const valueY = Math.round(pixelY / this.graphHeight * Math.abs(this.data.minvalue - this.data.maxvalue))
            if(this.data.minvalue <= valueY && valueY <= this.data.maxvalue){
                array[index] = valueY
            }else if(valueY <= this.data.minvalue){
                array[index] = this.data.minvalue
            }else if(valueY >= this.data.maxvalue){
                array[index] = this.data.maxvalue
            }
            this.internal = { ...this.internal, array: array, index: index }
            this.isMidi = (this.touchMoveLastTime && now - this.touchMoveLastTime < this.timer) ? false : true
            this.$emit('draw', this.internal, this.getFullData, this.isMidi)
            if (this.touchMoveLastTime && now - this.touchMoveLastTime < this.timer) { return }
            this.touchMoveLastTime = now
        },
        touchend () {
            this.$emit('set', this.internal, this.getFullData)
        }
    }
})
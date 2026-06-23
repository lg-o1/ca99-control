'use strict'

Vue.component('touch-curve-graph', {
    template:
    /*html*/`
    <div class="touch-curve">
        <svg
        class="touch-curve__graph"
        xmlns="http://www.w3.org/2000/svg"
        :width="width"
        :height="height"
        @touchstart.passive="touchstart"
        @touchmove.passive="touchmove"
        @touchend.passive="touchend">
            <defs>
                <linearGradient id="horizontalLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#191919"/>
                    <stop offset="30%" stop-color="#474647"/>
                    <stop offset="70%" stop-color="#474647"/>
                    <stop offset="100%" stop-color="#191919"/>
                </linearGradient>
                <linearGradient id="verticalLine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#191919"/>
                    <stop offset="30%" stop-color="#474647"/>
                    <stop offset="70%" stop-color="#474647"/>
                    <stop offset="100%" stop-color="#191919"/>
                </linearGradient>
                <linearGradient id="selectedLine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#191919"/>
                    <stop :offset="100 - data.array[data.index] + '%'" stop-color="#05b1c5"/>
                    <stop offset="100%" stop-color="#191919"/>
                </linearGradient>
            </defs>
            <g :font-family="options.legend.fontFamily" :font-size="options.legend.fontSize" :fill="options.legend.fontColor">
                <text
                v-for="(label, i) in options.legend.xAxis.label"
                :x="options.legend.yAxis.padding + options.padding.left + graphWidth / (stepNum - 1) * i"
                :y="graphHeight + options.legend.xAxis.padding - options.padding.bottom"
                text-anchor="middle">
                {{label}}
                </text>
                <text
                v-for="(label, i) in options.legend.yAxis.label"
                :x="options.legend.yAxis.padding - options.padding.left"
                :y="graphHeight - (graphHeight / (stepNum - 1) * (i - 1)) - options.padding.top"
                text-anchor="end">
                {{label}}
                </text>
            </g>
            <g :style="'transform:translate(' + (options.legend.yAxis.padding + options.padding.left) + 'px,' + options.padding.top + 'px);'">
                <rect
                v-for="(n, i) in stepNum - 2"
                :x="0"
                :y="graphHeight / (stepNum - 1) * (i + 1) - 0.5"
                :width="graphWidth"
                :height="1"
                fill="url(#horizontalLine)"/>
                <rect
                v-for="(n, i) in stepNum - 2"
                :x="graphWidth / (stepNum - 1) * (i + 1) - 0.5"
                :y="0"
                :width="1"
                :height="graphHeight"
                fill="url(#verticalLine)"/>
                <rect
                :x="barPos"
                :y="0"
                :width="2"
                :height="graphHeight"
                fill="url(#selectedLine)"/>
                <path
                :d="path"
                fill="transparent"
                stroke="#05b1c5"
                stroke-width="1.5"/>
                <circle
                v-for="(n, i) in stepNum"
                :cx="stepArray[i] * (graphWidth / data.maxvalue)"
                :cy="graphHeight - data.array[i] * (graphHeight / data.maxvalue)"
                :r="(i === data.index) ? 9 : 3"
                :fill="(i === data.index) ? '#81ced6' : '#05b1c5'"
                stroke="#05b1c5"
                stroke-width="3"/>
            </g>
        </svg>
    </div>
    `,
    props: {
        data: {
            type: Object,
            default () {
                return {
                    array: [0, 14, 28, 42, 56, 71, 85, 99, 113, 127],
                    index: 1,
                    maxvalue: 127
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
            }
        }
    },
    data () {
        return {
            graph: null,
            width: 0,
            height: 0,
            internal: {
                array: [0, 14, 28, 42, 56, 71, 85, 99, 113, 127],
                index: 1
            },
            isMidi: false,
            touchMoveLastTime: undefined,
            timer: 200
        }
    },
    created () {
    },
    mounted () {
        this.graph = this.$el
    },
    beforeUpdate () {
        const updatedWidth = this.graph.clientWidth
        const updatedHeight = this.graph.clientHeight
        if ( this.height !== updatedWidth || this.width !== updatedHeight ) {
            this.width = updatedWidth
            this.height = updatedHeight
        }
    },
    computed: {
        dataArray () {
            const xs = this.stepArray
            const ys = this.data.array
            const f = this.createInterpolant(xs, ys)
            const arr = []
            for(let i = 0; i < this.data.maxvalue + 1; i++){
                arr.push(f(i))
            }
            return arr
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
        barPos () {
            return this.graphWidth / (this.stepNum - 1) * this.data.index - 1
        },
        path () {
            const xs = this.stepArray
            const ys = this.data.array
            const f = this.createInterpolant(xs, ys)
            let path = ''
            for(let i = 0; i < this.data.maxvalue + 1; i++){
                path += (i === 0) ? 'M' : 'L'
                path += (i * this.stepWidth) + ',' + (this.graphHeight - f(i) * this.stepHeight)
            }
            return path
        },
        stepNum () {
            return this.data.array.length
        },
        stepWidth () {
            return this.graphWidth / this.data.maxvalue
        },
        stepHeight () {
            return this.graphHeight / this.data.maxvalue
        },
        stepArray () {
            const arr = []
            for(let i = 0; i < this.stepNum; i++){
                arr.push(Math.round(this.data.maxvalue / (this.stepNum - 1) * i))
            }
            return arr
        }
    },
    methods: {
        decrementKey () {
            const array = this.data.array
            const index = this.data.index - 1
            this.internal = { ...this.internal, array: array, index: index }
            this.isMidi = false
            this.$emit('draw', this.internal, this.dataArray, this.isMidi)
        },
        incrementKey () {
            const array = this.data.array
            const index = this.data.index + 1
            this.internal = { ...this.internal, array: array, index: index }
            this.isMidi = false
            this.$emit('draw', this.internal, this.dataArray, this.isMidi)
        },
        decrementOffset () {
            const array = this.data.array
            const index = this.data.index
            array[index] -= 1
            for(let i = 1; i < index; i++){
                if(array[i] > array[index]){
                    array[i] = array[index]
                }
            }
            this.internal = { ...this.internal, array: array, index: index }
            this.$emit('set', this.internal, this.dataArray)
        },
        incrementOffset () {
            const array = this.data.array
            const index = this.data.index
            array[index] += 1
            for(let i = index; i < 10; i++){
                if(array[i] > array[i+1]){
                    array[i+1] = array[index]
                }
            }
            this.internal = { ...this.internal, array: array, index: index }
            this.$emit('set', this.internal, this.dataArray)
        },
        resetData () {
            const array = this.stepArray
            this.internal = { ...this.internal, array: array}
            this.$emit('set', this.internal, [...Array(128).keys()])
        },
        touchstart (e) {
            let array = this.data.array
            let index = this.data.index
            const pixelX = e.touches[0].clientX - this.graph.getBoundingClientRect().left - (this.options.legend.yAxis.padding + this.options.padding.left)
            const pixelY = this.graphHeight - (e.touches[0].clientY - this.graph.getBoundingClientRect().top) + this.options.padding.top
            const valueX = Math.round(pixelX / this.graphWidth * this.data.maxvalue)
            const valueY = Math.round(pixelY / this.graphHeight * this.data.maxvalue)
            const stepX = Math.round(pixelX / this.graphWidth * (this.stepNum - 1))
            if(stepX <= 0){
                index = 1
            }else if(stepX >= 9){
                index = 8
            }else{
                index = stepX
            }
            if(0 < stepX && stepX < this.stepNum && 0 < valueY && valueY < this.data.maxvalue){
                array[index] = valueY
            }else if(valueY <= 0 && stepX > 0 && stepX < this.stepNum){
                array[index] = 0
            }else if(valueY >= this.data.maxvalue && stepX > 0 && stepX < this.stepNum){
                array[index] = this.data.maxvalue
            }
            array.sort(function(a, b){return a - b})
            this.internal = { ...this.internal, array: array, index: index}
            this.isMidi = false
            this.touchMoveLastTime = undefined
            this.$emit('draw', this.internal, this.dataArray, this.isMidi)
        },
        touchmove (e) {
            let now = new Date().getTime()
            let array = this.data.array
            let index = this.data.index
            const pixelX = e.touches[0].clientX - this.graph.getBoundingClientRect().left - (this.options.legend.yAxis.padding + this.options.padding.left)
            const pixelY = this.graphHeight - (e.touches[0].clientY - this.graph.getBoundingClientRect().top) + this.options.padding.top
            const valueX = Math.round(pixelX / this.graphWidth * this.data.maxvalue)
            const valueY = Math.round(pixelY / this.graphHeight * this.data.maxvalue)
            const stepX = Math.round(pixelX / this.graphWidth * (this.stepNum - 1))
            if(stepX <= 0){
                index = 1
            }else if(stepX >= 9){
                index = 8
            }else{
                index = stepX
            }
            if(0 < stepX && stepX < this.stepNum && 0 < valueY && valueY < this.data.maxvalue){
                array[index] = valueY
            }else if(valueY <= 0 && stepX > 0 && stepX < this.stepNum){
                array[index] = 0
            }else if(valueY >= this.data.maxvalue && stepX > 0 && stepX < this.stepNum){
                array[index] = this.data.maxvalue
            }
            array.sort(function(a, b){return a - b})
            this.internal = { ...this.internal, array: array, index: index}
            this.isMidi = (this.touchMoveLastTime && now - this.touchMoveLastTime < this.timer) ? false : true
            this.$emit('draw', this.internal, this.dataArray, this.isMidi)
            if (this.touchMoveLastTime && now - this.touchMoveLastTime < this.timer) { return }
            this.touchMoveLastTime = now
        },
        touchend () {
            this.$emit('set', this.internal, this.dataArray)
        },
        /*
         * chart.jsと同様の補完式を使用
         * https://en.wikipedia.org/wiki/Monotone_cubic_interpolation
         */
        createInterpolant (xs, ys) {
            var i, length = xs.length

            // Deal with length issues
            if (length != ys.length) { throw 'Need an equal count of xs and ys.' }
            if (length === 0) { return function(x) { return 0 } }
            if (length === 1) {
                // Impl: Precomputing the result prevents problems if ys is mutated later and allows garbage collection of ys
                // Impl: Unary plus properly converts values to numbers
                var result = +ys[0]
                return function(x) { return result }
            }

            // Rearrange xs and ys so that xs is sorted
            var indexes = []
            for (i = 0; i < length; i++) {
                indexes.push(i)
            }
            indexes.sort(function(a, b) {
                return xs[a] < xs[b] ? -1 : 1
            })
            var oldXs = xs, oldYs = ys
            // Impl: Creating new arrays also prevents problems if the input arrays are mutated later
            xs = []
            ys = []
            // Impl: Unary plus properly converts values to numbers
            for (i = 0; i < length; i++) {
                xs.push(+oldXs[indexes[i]])
                ys.push(+oldYs[indexes[i]])
            }

            // Get consecutive differences and slopes
            var dys = [], dxs = [], ms = []
            for (i = 0; i < length - 1; i++) {
                var dx = xs[i + 1] - xs[i], dy = ys[i + 1] - ys[i]
                dxs.push(dx)
                dys.push(dy)
                ms.push(dy/dx)
            }

            // Get degree-1 coefficients
            var c1s = [ms[0]]
            for (i = 0; i < dxs.length - 1; i++) {
                var m = ms[i], mNext = ms[i + 1]
                if (m*mNext <= 0) {
                    c1s.push(0)
                } else {
                    var dx_ = dxs[i], dxNext = dxs[i + 1], common = dx_ + dxNext
                    c1s.push(3*common/((common + dxNext)/m + (common + dx_)/mNext))
                }
            }
            c1s.push(ms[ms.length - 1])

            // Get degree-2 and degree-3 coefficients
            var c2s = [], c3s = [];
            for (i = 0; i < c1s.length - 1; i++) {
                var c1 = c1s[i], m_ = ms[i], invDx = 1/dxs[i], common_ = c1 + c1s[i + 1] - m_ - m_
                c2s.push((m_ - c1 - common_)*invDx)
                c3s.push(common_*invDx*invDx)
            }

            // Return interpolant function
            return function(x) {
                // The rightmost point in the dataset should give an exact result
                var i = xs.length - 1
                if (x == xs[i]) { return ys[i] }

                // Search for the interval x is in, returning the corresponding y if x is one of the original xs
                var low = 0, mid, high = c3s.length - 1
                while (low <= high) {
                    mid = Math.floor(0.5*(low + high))
                    var xHere = xs[mid]
                    if (xHere < x) { low = mid + 1 }
                    else if (xHere > x) { high = mid - 1 }
                    else { return ys[mid] }
                }
                i = Math.max(0, high)

                // Interpolate
                var diff = x - xs[i], diffSq = diff*diff
                return ys[i] + c1s[i]*diff + c2s[i]*diffSq + c3s[i]*diff*diffSq
            }
        },
    }
})
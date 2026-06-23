// KWMCore起動判定テスト

const performanceChecker = {
  isActive: false,
  counter: 0,
  get curTime () { return performance.now() },
  prevTime: null,
  avgFrameTime: null,
  check () {
    requestAnimationFrame(()=> {
      const frameTime = this.curTime - this.prevTime
      const curAvg = this.avgFrameTime
      const newAvg = ((curAvg * this.counter) + frameTime)/(this.counter + 1)
      this.counter ++
      this.avgFrameTime = newAvg
      this.prevTime = this.curTime
      if (this.isActive) {
        if (frameTime/curAvg < 1.5) {
          // console.log('フレーム時間　　 : ' + frameTime + 'ms')
        } else {
          console.log('フレーム時間: ' + Math.round(frameTime) + 'ms | 平均: ' + Math.round(this.avgFrameTime) + 'ms')
        }
        this.check()
      } else {
        // console.log('平均フレーム時間 : ' + Math.round(this.avgFrameTime) + 'ms')
        this.counter = 0
      }
    })  
  },
  start () {
    this.isActive = true
    this.prevTime = this.curTime
    this.check()
  },
  end () {
    this.isActive = false
  }
}
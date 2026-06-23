function convertToFilelistObj (data) {
  importScripts(data.baseURL + '../../lib/encoding.min.js')
  function decodeMidiPacket (data) {
    let auxBits
    const result = []
    for (let i = 0; i < data.length; i++) {
      if (i % 8 === 0) {
        auxBits = data[i]
      } else {
        const signBit = (auxBits << (i % 8)) & 0b10000000
        const decodedByte = signBit + data[i]
        result.push(decodedByte)
      }
    }
    return result
  }
  function sliceAttribute (path) {
    const lastDotIndex = path.lastIndexOf('.')
    if (lastDotIndex === -1) {
      return undefined
    }
    return path.slice(lastDotIndex + 1)
  }
  function sliceFilename (path) {
    const backslashIndex = path.lastIndexOf('\\')
    const dotIndex = path.lastIndexOf('.') === -1 ? undefined
      : path.lastIndexOf('.')
    if (backslashIndex === -1) {
      return path.slice(0, dotIndex)
    }
    return path.slice(backslashIndex + 1, dotIndex)
  }

  const result = []
  data.nameList.forEach((element, ind) => {
    const decodedList = decodeMidiPacket(element)
    const rawFilePath = Encoding.convert(decodedList, {
      to: 'UNICODE',
      from: 'SJIS',
      type: 'string'
    }).replace(/\0/g, '')  // Remove all null char with regular exp.
    // Format need data.
    const attribute = sliceAttribute(rawFilePath)
    const id = ind
    const name = sliceFilename(rawFilePath)
    const filePath = rawFilePath.split('\\').join('/').slice(1)
    result.push({
      attribute,
      id,
      name,
      filePath,
      inPiano: true,
      isUSBMusicPlayer: true
    })
  })
  self.postMessage(result)
}
function ping (data) {
  console.log('Worker: Connection successful.')
  self.postMessage(data.packet)
}
function is (type, obj) {
  let clas = Object.prototype.toString.call(obj).slice(8, -1);
  return obj !== undefined && obj !== null && clas === type;
}
function hasNecessaryProperties (obj, properties, option='all') {
  if (!this.is('Object', obj) || !this.is('Array', properties)) {
    console.error('hasNecessaryProperties: Invalid argument.')
    return undefined
  } else if (properties.length < 1) {
    console.error('hasNecessaryProperties: Invalid argument.')
    return undefined
  }

  if (option === 'or') {
    return properties.filter((property) => {
      return obj.hasOwnProperty(property)
    }).length > 0
  } else {
    return properties.filter((property) => {
      return obj.hasOwnProperty(property)
    }).length === properties.length
  }
}
class Handshake {
  constructor() {
    this._msgQueue = []
    this._statusQueue = []
    this._state = 'ready'
    this._mode = undefined
    this._handlingTime = 0
    this._timeout = 500
    this._nRetry = 16
    this._retryCounter = 0
    this._ackCounter = 0
    this._intervalId = undefined
    this._timerId = undefined
    this._lastMsg = undefined
    this._informedEmpty = true
  }
  get msgQueue () {
    return this._msgQueue
  }
  set msgQueue (newValue) {
    this._msgQueue = newValue
  }
  get state () {
    return this._state
  }
  set state (newValue) {
    this._state = newValue
  }
  get statusQueue () {
    return this._statusQueue
  }
  set statusQueue (newValue) {
    this._statusQueue = newValue
  }
  get mode () {
    return this._mode
  }
  set mode (newValue) {
    this._mode = newValue
  }
  get handlingTime () {
    return this._handlingTime
  }
  set handlingTime (newValue) {
    this._handlingTime = newValue
  }
  get timeout () {
    return this._timeout
  }
  set timeout (newValue) {
    this._timeout = newValue
  }
  get nRetry () {
    return this._nRetry
  }
  set nRetry (newValue) {
    this._nRetry = newValue
  }
  get retryCounter () {
    return this._retryCounter
  }
  set retryCounter (newValue) {
    this._retryCounter = newValue
  }
  get ackCounter () {
    return this._ackCounter
  }
  set ackCounter (newValue) {
    this._ackCounter = newValue
  }
  get intervalId () {
    return this._intervalId
  }
  set intervalId (newValue) {
    this._intervalId = newValue
  }
  get timerId () {
    return this._timerId
  }
  set timerId (newValue) {
    this._timerId = newValue
  }
  get lastMsg () {
    return this._lastMsg
  }
  set lastMsg (newValue) {
    this._lastMsg = newValue
  }
  get informedEmpty () {
    return this._informedEmpty
  }
  set informedEmpty (newValue) {
    this._informedEmpty = newValue
  }

  initQueue() {
    self.clearTimeout(this.timerId)
    this.informedEmpty = true
    this.msgQueue = []
    this.statusQueue = []
    this.ackCounter = 0
    this.retryCounter = 0
    this.timerId = undefined
    this.state = 'ready'
  }
  statusHandler () {
    this.intervalId = self.setInterval(() => {
      if (this.state === 'ready') { this.dequeue() }
    }, this.handlingTime)
  }
  enqueue (msg, ack=true) {
    if (!is('Array', msg)) {
      throw new Error('Worker(handshake).enqueue: Invalid type of "msg".')
    } else if (!is('Boolean', ack)) {
      throw new Error('Worker(handshake).enqueue: Invalid type of "ack".')
    }
    const is2DArray = is('Array', msg[0])
    if (is2DArray) {
      if (msg.length === ack.length) {
        this.msgQueue.push(...msg)
        this.statusQueue.push(...ack)
      } else if (ack === true) {
        this.msgQueue.push(...msg)
        msg.forEach(() => {
          this.statusQueue.push(true)
        })
      } else if (ack === false) {
        this.msgQueue.push(...msg)
        msg.forEach(() => {
          this.statusQueue.push(false)
        })
      } else {
        throw new Error('Worker(handshake).enqueue: Invalid type of "ack".')
      }
    } else {
      this.msgQueue.push(msg)
      this.statusQueue.push(ack)
    }
    this.informedEmpty = false
  }
  forceInterrupt(msg, ack=true) {
    this.msgQueue.unshift(msg)
    this.statusQueue.unshift(ack)
  }
  dequeue () {
    if (this.msgQueue.length) {
      this.state = 'busy'
      const ack = this.statusQueue.shift()
      const msg = this.msgQueue.shift()
      if (!(msg === 'dummy')) {
        postMessage({msg, ack}); console.log('Dequeue success.')
      } else {
        console.log('Dummy message received.')
      }
      this.ackCounter++
      if (ack) {
        this.lastMsg = {msg, ack}
        this.timerId = self.setTimeout(() => {
          if (this.retryCounter >= this.nRetry) {
            postMessage({error: 'retry', lastMsg: this.lastMsg.msg})
            console.warn('Worker(handshake): Retry has exceeded the specified number of times. Initialize the message queue.')
            this.initQueue()
            return
          }
          this.forceInterrupt(this.lastMsg.msg)
          this.dequeue()
          this.retryCounter++
          console.warn(`Worker(handshake): Retry dequeue. Retry: ${this.retryCounter}, Number of ack required: ${this.ackCounter}`)
        }, this.timeout)
      }
    } else {
      if (!this.informedEmpty) {
        this.informedEmpty = true
        postMessage({info: 'empty'})
      }
    }
  }
  post (msg) {
    if(!is('String', msg)) {
      throw new Error('Worker(handshake).post: Invalid type of "msg".')
    }
    if (msg === 'ack') {
      this.ackCounter--
      if (this.ackCounter < 1) {
        self.clearTimeout(this.timerId)
        this.state = 'ready'
        this.ackCounter = 0
        this.retryCounter = 0
      }
    } else if (msg === 'nack' && this.state === 'busy') {
      if (this.lastMsg) {
        self.clearTimeout(this.timerId)
        postMessage(this.lastMsg)
        this.ackCounter--
      }
    } else {
      throw new Error(`Worker(handshake): unknown post message. ${msg}`)
    }
  }
  controller (data) {
    if (data.method === 'get') {
      postMessage({get: this})
    } else if (data.method === 'set') {
      if (!data.hasOwnProperty('val')) {
        throw new Error('Property "val" is required')
      }
      const isValidProperties = !Object.keys(data.val).filter((val) => {
        return !Object.keys(inst[data.mode]).includes('_'+val)
      }).length
      if (!isValidProperties) {
        throw new Error('Property "val" is invalid.')
      }
      Object.keys(data.val).forEach((prop) => {
        const ignoreProperties = ['intervalId', 'timerId']
        if (ignoreProperties.includes(prop)) { return }
        this[prop] = data.val[prop]
        if (prop === 'handlingTime') {
          clearInterval(this.intervalId)
          this.statusHandler()
        }
      })
      this.controller({ method: 'get' })
    } else if (data.method === 'enqueue') {
      this.enqueue(data.val.msg, data.val.ack)
    // } else if (data.method === 'dequeue') {
    //   this.dequeue()
    } else if (data.method === 'post') {
      this.post(data.val.msg)
    } else if (data.method === 'instance') {
      postMessage({instance: 'Worker(handshake): Working instance: ' + Object.keys(inst)})
    } else if (data.method === 'initQueue') {
        this.initQueue()
        console.log('Worker(handshake): Done initialize handshake buff.')
    } else {
      throw new Error(`Worker(handshake): ${data.method} is invalid.`)
    }
  }
}

/** Handshake Instance.
 * User can have multiple handshake buffers in a single worker
 *   by creating multiple instances.
 **/
const inst = {}

self.addEventListener('message', function(e) {
  if (!e.data.hasOwnProperty('class')) {
    throw new Error(`"e.data" does not meet property requirements.`)
  }
  switch (e.data.class) {
    case 'convertToFilelistObj': {
      convertToFilelistObj(e.data)
      self.close()
      break
    }
    case 'ping': {
      ping(e.data)
      self.close()
      break
    }
    case 'handshake': {
      if (!hasNecessaryProperties(e.data, ['mode', 'method', 'val'])) {
        throw new Error(`"e.data" does not meet property requirements.`)
      }
      if (e.data.method === 'new') {
        inst[e.data.mode] = new Handshake()
        inst[e.data.mode].mode = e.data.mode
        inst[e.data.mode].statusHandler()
        console.log(`Worker(handshake): Instantiation succeeded.`)
      } else {
        if (!inst[e.data.mode]) {
          throw new Error(`Worker(handshake): ${e.data.mode} is invalid.`)
        }
        inst[e.data.mode].mode = e.data.mode
        inst[e.data.mode].controller(e.data)
      }
      break
    }
  }
}, false)
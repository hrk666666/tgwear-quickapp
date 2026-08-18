import interconnect from '@system.interconnect'

let conn = null
let readyState = 2 // 1=connected, 2=disconnected
const messageHandlers = new Set()
const stateHandlers = new Set()

function init() {
  if (conn) return conn
  conn = interconnect.instance()

  conn.onopen = (data) => {
    readyState = 1
    stateHandlers.forEach(h => h(1, data && data.isReconnected))
  }
  conn.onclose = (data) => {
    readyState = 2
    stateHandlers.forEach(h => h(2, data))
  }
  conn.onerror = (data) => {
    readyState = 2
    stateHandlers.forEach(h => h(2, data))
  }
  conn.onmessage = (data) => {
    let payload
    try {
      payload = (typeof data.data === 'string') ? JSON.parse(data.data) : data.data
    } catch (e) {
      console.warn('[interconn] parse message failed:', e, data && data.data)
      return
    }
    // 单个 handler 抛错不影响其他 handler
    messageHandlers.forEach(h => {
      try { h(payload) } catch (e) {
        console.error('[interconn] message handler error:', e)
      }
    })
  }
  return conn
}

export default {
  init,
  send(data) {
    if (!conn || readyState !== 1) {
      return Promise.reject({ code: 1006, msg: 'not connected' })
    }
    return new Promise((resolve, reject) => {
      conn.send({
        data: { __rpc: true, ...data },
        success: resolve,
        fail: (err, code) => reject({ code, msg: err })
      })
    })
  },
  onMessage(handler) {
    messageHandlers.add(handler)
    return () => messageHandlers.delete(handler)
  },
  onState(handler) {
    stateHandlers.add(handler)
    return () => stateHandlers.delete(handler)
  },
  getReadyState() { return readyState },
  diagnose(timeout = 10000) {
    return new Promise((resolve, reject) => {
      if (!conn) return reject({ code: 1006, msg: 'conn not init' })
      conn.diagnosis({ timeout, success: resolve, fail: reject })
    })
  }
}

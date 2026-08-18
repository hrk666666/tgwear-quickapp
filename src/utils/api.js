import interconn from './interconn'

let seq = 0
const pending = new Map() // id -> {resolve, reject, timer}
const RPC_TIMEOUT = 30000

// 简易事件总线
const listeners = {}
const eventBus = {
  on(event, handler) {
    (listeners[event] = listeners[event] || []).push(handler)
    return () => {
      listeners[event] = (listeners[event] || []).filter(h => h !== handler)
    }
  },
  emit(event, data) {
    (listeners[event] || []).forEach(h => {
      try { h(data) } catch (e) { console.warn('event handler error:', event, e) }
    })
  }
}

function call(method, params = {}) {
  const id = ++seq
  const req = { id, method, params }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        reject({ code: -1, msg: 'rpc timeout', method })
      }
    }, RPC_TIMEOUT)

    pending.set(id, { resolve, reject, timer })

    interconn.send(req).catch(err => {
      clearTimeout(timer)
      pending.delete(id)
      reject(err)
    })
  })
}

// 处理手机端 RPC 响应和事件推送
interconn.onMessage(payload => {
  if (!payload) return
  // RPC 响应
  if (payload.id !== undefined && payload.__rpc !== true) {
    const p = pending.get(payload.id)
    if (p) {
      clearTimeout(p.timer)
      pending.delete(payload.id)
      if (payload.error) p.reject(payload.error)
      else p.resolve(payload.result)
    }
    return
  }
  // 事件推送
  if (payload.__event === true) {
    eventBus.emit(payload.event, payload.data)
  }
})

export default {
  // 会话
  getDialogs(limit = 30, offsetId = 0) {
    return call('dialogs.get', { limit, offset_id: offsetId })
  },
  // 消息历史
  getHistory(peer, limit = 30, offsetId = 0) {
    return call('messages.getHistory', { peer, limit, offset_id: offsetId })
  },
  // 发送文本
  sendText(peer, text, replyTo = 0) {
    return call('messages.sendText', { peer, text, reply_to: replyTo })
  },
  // 发送 sticker
  sendSticker(peer, stickerId) {
    return call('messages.sendSticker', { peer, sticker_id: stickerId })
  },
  // 登录状态
  getAuthState() {
    return call('auth.getState')
  },
  // 退出登录
  logout() {
    return call('auth.logout')
  },
  // 已读
  markRead(peer, messageId) {
    return call('messages.markRead', { peer, max_id: messageId })
  },
  // 事件订阅
  on(event, handler) { return eventBus.on(event, handler) },
  // 触发事件（内部使用）
  _emit(event, data) { eventBus.emit(event, data) }
}

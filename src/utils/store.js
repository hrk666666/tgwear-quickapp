const state = {
  session: null,        // {user_id, name, phone}
  dialogs: [],          // 会话列表
  messages: {},         // peer -> [messages]
  connectionState: 2,   // 1=connected, 2=disconnected
  settings: {
    fontScale: 1.0,
    vibration: true,
    keepScreenOn: false
  }
}

export default {
  get(key) { return state[key] },
  set(key, value) { state[key] = value },

  getDialog(peer) { return state.messages[peer] || [] },

  appendDialog(peer, messages, prepend = false) {
    const list = state.messages[peer] || []
    state.messages[peer] = prepend ? [...messages, ...list] : [...list, ...messages]
  },

  upsertDialog(dialog) {
    const idx = state.dialogs.findIndex(d => d.peer === dialog.peer)
    if (idx >= 0) state.dialogs[idx] = dialog
    else state.dialogs.unshift(dialog)
  },

  clearDialogs() {
    state.dialogs = []
    state.messages = {}
  },

  loadSettings() {
    const storage = require('@system.storage')
    return new Promise(resolve => {
      storage.get({
        key: 'settings',
        success: (d) => {
          try { Object.assign(state.settings, JSON.parse(d || '{}')) } catch (e) {}
          resolve(state.settings)
        },
        fail: () => resolve(state.settings)
      })
    })
  },

  saveSettings() {
    const storage = require('@system.storage')
    storage.set({ key: 'settings', value: JSON.stringify(state.settings) })
  },

  clearSession() {
    state.session = null
  }
}

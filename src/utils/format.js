// 时间戳格式化：返回 "HH:MM" 或 "MM-DD" 或 "YYYY-MM-DD"
export function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const pad = n => (n < 10 ? '0' + n : '' + n)

  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return pad(date.getHours()) + ':' + pad(date.getMinutes())
  }

  const yest = new Date(now.getTime() - 86400000)
  if (date.toDateString() === yest.toDateString()) return '昨天'

  const diffDays = (now - date) / 86400000
  if (diffDays < 7) {
    const wd = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
    return '周' + wd
  }

  if (date.getFullYear() === now.getFullYear()) {
    return pad(date.getMonth() + 1) + '-' + pad(date.getDate())
  }
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

// 文本截断
export function truncate(text, max = 30) {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '…' : text
}

// 消息预览（用于会话列表）
export function messagePreview(message) {
  if (!message) return ''
  if (message.text) return truncate(message.text, 24)
  if (message.sticker) return '[' + (message.sticker.emoji || '贴纸') + ' 贴纸]'
  return '[消息]'
}

// 当前时间字符串（用于 header 时间显示）
export function nowTimeString() {
  const date = new Date()
  const pad = n => (n < 10 ? '0' + n : '' + n)
  return pad(date.getHours()) + ':' + pad(date.getMinutes())
}

// 首字母大写（用于头像占位）
export function initial(name) {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}

// 字数统计
export function charCount(text, max = 200) {
  return (text || '').length + ' / ' + max
}

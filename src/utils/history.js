import { storage } from './compat'

async function isHistoryEnabled () {
  const result = await storage.get('historyEnabled')
  return result.historyEnabled !== false // Default to enabled if not set
}

export async function getHistory () {
  try {
    const results = await storage.get('history')
    if (results.history) {
      return JSON.parse(results.history)
    }
    return []
  } catch (e) {
    console.error('error while parsing history', e)
  }
}

export async function clearHistory () {
  await storage.set({
    history: '[]'
  })
}

export async function addHistory (type, text) {
  if (type !== 'encode' && type !== 'decode') {
    return
  }

  if (!(await isHistoryEnabled())) {
    return
  }
  let history = await getHistory()
  // Don't add duplicate items
  if (history && history.length > 0) {
    if (history[history.length - 1].text === text) {
      return
    }
  }
  history = history.filter(function (item) {
    return item.text && item.text !== text
  })
  history = [...history, { type, text }]
  if (history.length > 100) {
    history = history.slice(history.length - 100, history.length)
  }

  await storage.set({
    history: JSON.stringify(history)
  })
}

export async function removeHistory (text) {
  let history = await getHistory()
  history = history.filter(function (item) {
    return item.text !== text
  })
  await storage.set({
    history: JSON.stringify(history)
  })
}

export async function toggleHistory () {
  const enabled = await isHistoryEnabled()
  await storage.set({
    historyEnabled: !enabled
  })
  return !enabled
}

export async function getHistoryState () {
  return isHistoryEnabled()
}

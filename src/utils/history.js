import Storage from './storage'

export async function getHistory () {
  try {
    const results = await Storage.get('history')
    if (results.history) {
      return JSON.parse(results.history)
    }
    return []
  } catch (e) {
    console.error('error while parsing history', e)
  }
}

export async function clearHistory () {
  await Storage.set({
    history: '[]'
  })
}

export async function addHistory (type, text) {
  if (type !== 'encode' && type !== 'decode') {
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

  await Storage.set({
    history: JSON.stringify(history)
  })
}

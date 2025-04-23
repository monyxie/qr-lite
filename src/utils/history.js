import { storage } from "./compat";
import { getSettings } from "./settings";

export async function getHistory() {
  try {
    const results = await storage("local").get("history");
    if (results.history) {
      return JSON.parse(results.history);
    }
    return [];
  } catch (e) {
    console.error("error while parsing history", e);
  }
}

export async function clearHistory() {
  await storage("local").set({
    history: "[]",
  });
}

/**
 *
 * @param {'encode'|'decode'} type
 * @param {string} text
 * @returns
 */
export async function addHistory(type, text) {
  if (type !== "encode" && type !== "decode") {
    return;
  }
  if (!(await getSettings()).historyEnabled) {
    return;
  }

  let history = await getHistory();
  // Don't add duplicate items
  if (history && history.length > 0) {
    if (history[history.length - 1].text === text) {
      return;
    }
  }
  history = history.filter(function (item) {
    return item.text && item.text !== text;
  });
  history = [...history, { type, text }];
  if (history.length > 100) {
    history = history.slice(history.length - 100, history.length);
  }

  await storage("local").set({
    history: JSON.stringify(history),
  });
}

export async function removeHistory(text) {
  let history = await getHistory();
  history = history.filter(function (item) {
    return item.text !== text;
  });
  await storage("local").set({
    history: JSON.stringify(history),
  });
}

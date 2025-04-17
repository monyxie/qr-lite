import { apiNs, storage } from "./compat";

const settingsDefinition = {
  historyEnabled: {
    normalize(value) {
      return typeof value === "undefined" || value === true;
    },
  },
  soundEnabled: {
    normalize(value) {
      return typeof value === "undefined" || value === true;
    },
  },
  ecLevel: {
    normalize(value) {
      return ["L", "M", "Q", "H"].indexOf(value) === -1 ? "L" : value;
    },
  },
};

export async function getSettings() {
  const settings = await storage.get(Object.keys(settingsDefinition));
  for (const key in settingsDefinition) {
    settings[key] = settingsDefinition[key].normalize(settings[key]);
  }
  return settings;
}

export async function saveSettings(settings) {
  for (const key in settings) {
    if (!settingsDefinition[key]) {
      throw new Error("Assertion failed");
    } else {
      settings[key] = settingsDefinition[key].normalize(settings[key]);
    }
  }
  await storage.set(settings);
}

const listeners = [];
const onChangedListener = (changes, area) => {
  if (area !== "local") {
    return;
  }

  const newValues = {};
  for (const changedKey in changes) {
    if (changedKey in settingsDefinition) {
      newValues[changedKey] = settingsDefinition[changedKey].normalize(
        changes[changedKey].newValue
      );
    }
  }

  for (const i in listeners) {
    listeners[i](newValues);
  }
};

export function addListener(listener) {
  if (listeners.includes(listener)) {
    return;
  }
  listeners.push(listener);
  if (listeners.length === 1) {
    apiNs.storage.onChanged.addListener(onChangedListener);
  }
}

export function removeListener(listener) {
  const index = listeners.indexOf(listener);
  if (index === -1) {
    return;
  }
  listeners.splice(index, 1);
  if (listeners.length === 0) {
    apiNs.storage.onChanged.removeListener(onChangedListener);
  }
}

import { apiNs, storage } from "./compat";

const settingsDefinition = {
  historyEnabled: {
    normalize(value) {
      return typeof value === "undefined" || value === true;
    },
  },
  scanSuccessSoundEnabled: {
    normalize(value) {
      return typeof value === "undefined" || value === true;
    },
  },
  ecLevel: {
    normalize(value) {
      return ["L", "M", "Q", "H"].indexOf(value) === -1 ? "L" : value;
    },
  },
  qrCodeStyle: {
    normalize(value) {
      return ["tiles", "tiles_r", "dots_s", "dots_xs_rf"].indexOf(value) === -1
        ? "tiles"
        : value;
    },
  },
  whiteOnBlackQRCodeInDarkMode: {
    normalize(value) {
      return typeof value === "undefined" ? false : value === true;
    },
  },
  pickerPauseVideosOnloadEnabled: {
    normalize(value) {
      return typeof value === "undefined" ? true : value === true;
    },
  },
};

let globalSettings = null;

export async function getSettings() {
  const settings = await storage("local").get(Object.keys(settingsDefinition));
  for (const key in settingsDefinition) {
    settings[key] = settingsDefinition[key].normalize(settings[key]);
  }
  if (globalSettings === null) {
    addListener((newValues) => {
      globalSettings = { ...(globalSettings || {}), ...newValues };
    });
  }
  globalSettings = settings;
  return settings;
}

export async function getSettingValue(key) {
  if (!globalSettings) {
    getSettings();
  }
  return globalSettings[key];
}

/**
 * Get a single setting value from storage
 * This is for use in the background script where the `globalSettings` variable
 * became `null` after the background script is suspended
 * (even though we have safe guarding in `getSettingsValue()`, why?)
 * @param {string} key
 * @returns
 */
export async function getSettingValueFromStorage(key) {
  if (!(key in settingsDefinition)) {
    throw new Error("Unknown settings key: " + key);
  }
  const settings = await storage("local").get(key);
  return settingsDefinition[key].normalize(settings[key]);
}

export async function saveSettings(settings) {
  for (const key in settings) {
    if (!settingsDefinition[key]) {
      throw new Error("Assertion failed");
    } else {
      settings[key] = settingsDefinition[key].normalize(settings[key]);
    }
  }
  await storage("local").set(settings);
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

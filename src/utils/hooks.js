import { useEffect, useState } from "react";
import { apiNs, storage } from "./compat";

const settingsKeys = ["soundEnabled"];

export function useSettings() {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    storage.get(settingsKeys).then((r) => {
      setSettings(r);
    });

    const changedListener = (changes, area) => {
      if (area !== "local") {
        return;
      }

      const newValues = {};
      for (const changedKey in changes) {
        if (settingsKeys.indexOf(changedKey) !== -1) {
          newValues[changedKey] = changes[changedKey].newValue;
        }
      }
      setSettings((prevSettings) => {
        return {
          ...prevSettings,
          ...newValues,
        };
      });
    };

    apiNs.storage.onChanged.addListener(changedListener);
    return () => {
      apiNs.storage.onChanged.removeListener(changedListener);
    };
  }, []);

  const saveSettings = (newValues) => {
    setSettings((prevSettings) => {
      return {
        ...prevSettings,
        ...newValues,
      };
    });
    storage.set(newValues);
  };

  return [settings, saveSettings];
}

export function useURLParams() {
  const [params, setParams] = useState(null);
  useEffect(() => {
    setParams(new URL(location.href).searchParams);
  }, []);
  return params;
}

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

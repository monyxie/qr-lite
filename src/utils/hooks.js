import { useEffect, useState, useRef, useCallback } from "react";
import {
  addListener,
  getSettings,
  removeListener,
  saveSettings as saveSettingsOnStorage,
} from "./settings";

export function useSettings() {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    getSettings().then((r) => {
      setSettings(r);
    });

    const changedListener = (newValues) => {
      setSettings((prevSettings) => {
        return {
          ...prevSettings,
          ...newValues,
        };
      });
    };

    addListener(changedListener);
    return () => {
      removeListener(changedListener);
    };
  }, []);

  const saveSettings = (newValues) => {
    setSettings((prevSettings) => {
      return {
        ...prevSettings,
        ...newValues,
      };
    });

    saveSettingsOnStorage(newValues);
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

export function useAudioPlayer() {
  const sounds = useRef({});
  const play = useCallback((name) => {
    if (!sounds.current[name]) {
      sounds.current[name] = new Audio(name);
    }
    sounds.current[name].play();
  }, []);
  const player = {
    play,
  };

  return player;
}

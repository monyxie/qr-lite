import { useEffect, useState, useRef, createContext, useContext } from "react";
import {
  addListener,
  getSettings,
  removeListener,
  saveSettings as saveSettingsOnStorage,
} from "./settings";

export function useSettings() {
  const [settings, setSettings] = useState(null);

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

  return { settings, saveSettings };
}

const SettingsContext = createContext(null);

export function useSettingsContext() {
  return useContext(SettingsContext);
}

export function SettingsContextProvider({ children }) {
  const { settings, saveSettings } = useSettings();
  return (
    <SettingsContext.Provider value={{ settings, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useAudioPlayer() {
  const { settings } = useSettingsContext();
  const makePlayFunc = (name) => {
    return () => {
      return new Promise((resolve) => {
        if (settings.scanSuccessSoundEnabled) {
          const audio = new Audio(name);
          audio.addEventListener(
            "ended",
            () => {
              resolve(true);
            },
            { once: true }
          );
          audio.play();
        } else {
          resolve(false);
        }
      });
    };
  };
  return { scanSuccess: makePlayFunc("/audio/success.mp3") };
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

export function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}

export function useMousePosition(throttle = 0) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const lastUpdate = useRef(0);
  useEffect(() => {
    const handleMouseEvent = (event) => {
      if (throttle > 0) {
        const now = Date.now();
        if (now - lastUpdate.current < throttle) {
          return;
        }
        lastUpdate.current = now;
      }
      setPosition({ x: event.clientX, y: event.clientY });
    };
    window.addEventListener("mouseenter", handleMouseEvent);
    window.addEventListener("mousemove", handleMouseEvent);
    window.addEventListener("mouseleave", handleMouseEvent);
    return () => {
      window.removeEventListener("mouseenter", handleMouseEvent);
      window.removeEventListener("mousemove", handleMouseEvent);
      window.removeEventListener("mouseleave", handleMouseEvent);
    };
  }, [throttle]);
  return position;
}

/**
 *
 * @return {React.RefObject<{x: number, y: number}>}
 */
export function useMousePositionRef() {
  const position = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseEvent = (event) => {
      position.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("mouseenter", handleMouseEvent);
    window.addEventListener("mousemove", handleMouseEvent);
    window.addEventListener("mouseleave", handleMouseEvent);
    return () => {
      window.removeEventListener("mouseenter", handleMouseEvent);
      window.removeEventListener("mousemove", handleMouseEvent);
      window.removeEventListener("mouseleave", handleMouseEvent);
    };
  }, []);
  return position;
}

export function useKeyPress({
  key,
  event,
  el,
  preventDefault,
  stopPropagation,
  callback,
}) {
  if (!el) {
    el = window;
  }
  useEffect(() => {
    const handleEvent = (e) => {
      if (e.key === key) {
        if (preventDefault) e.preventDefault();
        if (stopPropagation) e.stopPropagation();
        callback();
      }
    };
    el.addEventListener(event, handleEvent);
    return () => {
      el.removeEventListener(event, handleEvent);
    };
  });
}

export function useWindowMessage(callback) {
  useEffect(() => {
    const handleMessage = (event) => {
      callback(event);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  });
}

export function useTemporaryState(value, timeout) {
  const [state, setState] = useState(value);
  useEffect(() => {
    setState(value);
  }, [value]);
  useEffect(() => {
    if (state !== value) {
      const timer = setTimeout(() => {
        setState(value);
      }, timeout);
      return () => clearTimeout(timer);
    }
  }, [state, timeout, value]);
  return [state, setState];
}

export function useConsoleLog(...args) {
  useEffect(() => {
    console.log(...args);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, args);
}

export function useTimer() {
  const handles = useRef([]);

  useEffect(() => {
    return () => {
      handles.current.forEach(clearTimeout);
    };
  }, []);

  const setTimer = (callback, delay) => {
    const handle = setTimeout(callback, delay);
    handles.current.push(handle);
    return handle;
  };

  const clearTimer = (handle) => {
    clearTimeout(handle);
    handles.current = handles.current.filter((t) => t !== handle);
  };

  return { setTimer, clearTimer };
}

export function useMatchMedia(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);

    const handleChange = (e) => {
      setMatches(e.matches);
    };
    list.addEventListener("change", handleChange);
    return () => {
      list.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

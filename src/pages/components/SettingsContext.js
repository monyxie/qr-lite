import { createContext } from "preact";
import { useSettings } from "../../utils/hooks";
import { useContext } from "react";

const SettingsContext = createContext(null);

export function useSettingsContext() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }) {
  const { settings, saveSettings } = useSettings();
  if (!settings) return null;
  return (
    <SettingsContext.Provider value={{ settings, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

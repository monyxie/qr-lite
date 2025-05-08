import { createContext } from "preact";
import { useSettings } from "../../utils/hooks";
import { useContext } from "react";
import { PropTypes } from "prop-types";

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

SettingsProvider.propTypes = {
  children: PropTypes.node,
};

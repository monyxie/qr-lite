import { TT } from "../utils/i18n";
import {
  apiNs,
  openShortcutSettings,
  canOpenShortcutSettings,
} from "../utils/compat";
import { render } from "preact";
import { useMemo } from "react";
import { usePageTitle, useSettings, useURLParams } from "../utils/hooks";

function SettingsPage() {
  const showKeyboardShortcutsSetting = useMemo(canOpenShortcutSettings, []);
  const [settings, saveSettings] = useSettings();
  const params = useURLParams();

  usePageTitle(apiNs.i18n.getMessage("settings_window_title"));

  return (
    <div class="container">
      <div class="box">
        {params?.get("minimal") !== "true" && (
          <div class="header">
            <img src="../icons/qrlite.svg" class="logo" />
            <h1>{TT("settings_window_title")}</h1>
          </div>
        )}
        <form>
          <fieldset>
            <legend>{TT("settings_scanner_legend")}</legend>
            <div class="form-entry">
              <input
                id="scanSuccessSoundEnabledCheckbox"
                name="scanSuccessSoundEnabled"
                type="checkbox"
                checked={settings.scanSuccessSoundEnabled}
                onChange={(e) => {
                  saveSettings({ scanSuccessSoundEnabled: e.target.checked });
                }}
              />
              <label htmlFor="scanSuccessSoundEnabledCheckbox">
                {TT("settings_sound_enabled_label")}
              </label>
            </div>
          </fieldset>
          {showKeyboardShortcutsSetting && (
            <div class="form-entry">
              <span
                class="clickable"
                id="configKeyboardShortcutsBtn"
                onClick={openShortcutSettings}
              >
                {TT("settings_config_keyboard_shortcuts_btn_label")}
              </span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

render(<SettingsPage />, document.body);

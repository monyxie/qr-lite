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
  const { settings, saveSettings } = useSettings();
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
            <legend>{TT("settings_generator_legend")}</legend>
            <div class="form-entry">
              <div class="form-entry-line">
                <input
                  disabled={!settings}
                  id="whiteOnBlackQRCodeInDarkModeCheckbox"
                  name="whiteOnBlackQRCodeInDarkMode"
                  type="checkbox"
                  checked={settings?.whiteOnBlackQRCodeInDarkMode}
                  onChange={(e) => {
                    saveSettings({
                      whiteOnBlackQRCodeInDarkMode: e.target.checked,
                    });
                  }}
                />
                <label htmlFor="whiteOnBlackQRCodeInDarkModeCheckbox">
                  {TT("settings_white_on_black_qr_ccode_in_dark_mode_label")}
                </label>
              </div>
              <p class="form-entry-explainer">
                {TT("settings_white_on_black_qr_ccode_in_dark_mode_explainer")}
              </p>
            </div>
          </fieldset>
          <fieldset>
            <legend>{TT("settings_scanner_legend")}</legend>
            <div class="form-entry">
              <div class="form-entry-line">
                <input
                  disabled={!settings}
                  id="scanSuccessSoundEnabledCheckbox"
                  name="scanSuccessSoundEnabled"
                  type="checkbox"
                  checked={settings?.scanSuccessSoundEnabled}
                  onChange={(e) => {
                    saveSettings({ scanSuccessSoundEnabled: e.target.checked });
                  }}
                />
                <label htmlFor="scanSuccessSoundEnabledCheckbox">
                  {TT("settings_scan_success_sound_enabled_label")}
                </label>
              </div>
              <p class="form-entry-explainer">
                {TT("settings_scan_success_sound_enabled_explainer")}
              </p>
            </div>
            <div class="form-entry">
              <div class="form-entry-line">
                <input
                  disabled={!settings}
                  id="pickerPauseVideosOnloadEnabledCheckbox"
                  name="pickerPauseVideosOnloadEnabled"
                  type="checkbox"
                  checked={settings?.pickerPauseVideosOnloadEnabled}
                  onChange={(e) => {
                    saveSettings({
                      pickerPauseVideosOnloadEnabled: e.target.checked,
                    });
                  }}
                />
                <label htmlFor="pickerPauseVideosOnloadEnabledCheckbox">
                  {TT("settings_picker_pause_videos_onload_enabled_label")}
                </label>
              </div>
              <p class="form-entry-explainer">
                {TT("settings_picker_pause_videos_onload_enabled_explainer")}
              </p>
            </div>
          </fieldset>
          {showKeyboardShortcutsSetting && (
            <div class="form-entry">
              <div>
                <span
                  class="clickable"
                  id="configKeyboardShortcutsBtn"
                  onClick={openShortcutSettings}
                >
                  {TT("settings_config_keyboard_shortcuts_btn_label")}
                </span>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

render(<SettingsPage />, document.body);

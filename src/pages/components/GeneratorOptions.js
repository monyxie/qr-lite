import {
  useSettingsContext,
} from "../../utils/hooks";
import { T, TT } from "../../utils/i18n";
import { finderStyleNames, moduleStyleNames } from '../../utils/qrcode-gen';

const ecLevels = [
  ["L", T("error_correction_level_btn_low_title")],
  ["M", T("error_correction_level_btn_medium_title")],
  ["Q", T("error_correction_level_btn_quartile_title")],
  ["H", T("error_correction_level_btn_high_title")],
];

function GeneratorOptions() {
  const { settings, saveSettings } = useSettingsContext();

  return (
    <div class="generator-options">
      <label title={T("error_correction_level_label_title")}>
        {TT("error_correction_level_label")}
      </label>
      <span id="ecLevels" class="ec-levels-container">
        {ecLevels.map(([level, title]) => (
          <span
            key={level}
            class={
              "clickable ec-level " +
              (settings?.ecLevel === level ? "ec-level-active" : "")
            }
            title={title}
            onClick={() => saveSettings({ ecLevel: level })}
          >
            {level}
          </span>
        ))}
      </span>
      <label title={T("finder_style_label_title")}>
        {TT("finder_style_label")}
      </label>
      <select value={settings?.qrCodeFinderStyle || "default"} onChange={(e) => saveSettings({
        qrCodeFinderStyle: e.target.value,
      })}>
        {finderStyleNames.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
      <label title={T("module_style_label_title")}>
        {TT("module_style_label")}
      </label>
      <select value={settings?.qrCodeModuleStyle || "default"} onChange={(e) => saveSettings({
        qrCodeModuleStyle: e.target.value,
      })}>
        {moduleStyleNames.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
    </div>
  );
}

export default GeneratorOptions;
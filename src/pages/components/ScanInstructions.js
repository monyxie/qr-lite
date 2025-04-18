import { apiNs } from "../../utils/compat";

import { PropTypes } from "prop-types";

import { TT } from "../../utils/i18n";
import { useURLParams } from "../../utils/hooks";

export default function ScanInstructions({
  onClickScanRegion,
  onClickCameraScan,
}) {
  const params = useURLParams();
  const isStandalone =
    !params?.has("forcepopup") &&
    apiNs.extension.getViews({ type: "popup" }).length === 0;

  return (
    <div class="instructions instruction-screen " id="scanInstructions">
      <p>{TT("scan_instructions_html")}</p>
      <div class="divider">{TT("or")}</div>
      <p>{TT("scan_from_clipboard_instructions_html")}</p>
      {!isStandalone && (
        <>
          <div class="divider">{TT("or")}</div>
          <p class="">
            <a class="clickable" id="scanRegion" onClick={onClickScanRegion}>
              <img class="icon icon-invert" src="../icons/scan-region.svg" />
              {TT("pick_region_to_scan_btn")}
            </a>
          </p>
        </>
      )}
      <div class="divider">{TT("or")}</div>
      <p>
        <a class="clickable" id="cameraScan" onClick={onClickCameraScan}>
          <img class="icon icon-invert" src="../icons/camera.svg" />
          {TT("camera_scan_btn")}
        </a>
      </p>
    </div>
  );
}

ScanInstructions.propTypes = {
  onClickScanRegion: PropTypes.func,
  onClickCameraScan: PropTypes.func,
};

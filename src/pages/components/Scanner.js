import { apiNs } from "../../utils/compat";

import { useEffect, useState } from "react";
import { PropTypes } from "prop-types";

import ScanInstructions from "./ScanInstructions";
import CameraScanner from "./CameraScanner";
import ImageScanner from "./ImageScanner";

export default function Scanner(props) {
  const [mode, setMode] = useState(props.mode);
  const [component, setComponent] = useState(null);

  useEffect(() => {
    if (mode === "camera") {
      setComponent(<CameraScanner />);
    } else if (props.url !== undefined && props.url !== null) {
      setComponent(
        <ImageScanner
          url={props.url}
          tabId={props.tabId}
          frameId={props.frameId}
          targetElementId={props.targetElementId}
        />
      );
    } else {
      setComponent(
        <ScanInstructions
          onClickScanRegion={() => {
            apiNs.runtime.sendMessage({
              action: "BG_INJECT_PICKER_LOADER",
            });
            // close self (popup)
            window.close();
          }}
          onClickCameraScan={() => setMode("camera")}
        />
      );
    }
  }, [props.url, mode, props.tabId, props.frameId, props.targetElementId]);
  return (
    <div class="scan" id="scan">
      {component}
    </div>
  );
}

Scanner.propTypes = {
  url: PropTypes.string,
  tabId: PropTypes.any,
  frameId: PropTypes.any,
  targetElementId: PropTypes.any,
  mode: PropTypes.string,
};

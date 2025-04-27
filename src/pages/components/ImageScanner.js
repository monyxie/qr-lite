import { apiNs } from "../../utils/compat";

import { useEffect, useState, useRef } from "react";
import { PropTypes } from "prop-types";

import { T, TT } from "../../utils/i18n";
import { scan } from "../../utils/qrcode";
import { isUrl, playScanSuccessAudio } from "../../utils/misc";
import { addHistory } from "../../utils/history";
import QRPositionMarker from "./QRPositionMarker";
import PermissionPrompt from "./PermissionPrompt";

export default function ImageScanner(props) {
  const needsUrlPermission = isUrl(props.url);
  const [hasUrlPermission, setHasUrlPermission] = useState(false);
  const [error, setError] = useState(null);
  const inputImgNode = useRef(null);
  const outputContentNode = useRef(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (needsUrlPermission) {
      apiNs.permissions
        .contains({ origins: ["<all_urls>"] })
        .then(setHasUrlPermission);
    }
  }, [needsUrlPermission]);

  useEffect(() => {
    if (needsUrlPermission && !hasUrlPermission) {
      return;
    }
    if (!inputImgNode.current) {
      return;
    }

    (async () => {
      let success = false;
      let errMsg = "";
      try {
        // wait for decode to complete before scanning
        await inputImgNode.current.decode();

        /**
         * Array<{content, vertices}>
         */
        const result = await scan(inputImgNode.current);
        if (result.length < 1) {
          errMsg = T("unable_to_decode_qr_code");
        } else {
          success = true;
          setResult(result[0]);
          outputContentNode.current?.select();
          await addHistory("decode", result[0].content);
        }
      } catch (e) {
        console.error(e);
        errMsg = T("decoding_failed", e);
      }

      if (success) {
        playScanSuccessAudio();
      } else {
        setError(errMsg || T("unable_to_decode"));
      }
    })();
  }, [hasUrlPermission, needsUrlPermission, inputImgNode, props.url]);

  useEffect(() => {
    if (result && outputContentNode.current) {
      outputContentNode.current.select();
    }
  }, [result]);

  if (needsUrlPermission && !hasUrlPermission) {
    return <PermissionPrompt type="all-urls" />;
  }

  return (
    <>
      <div class="input " id="scanInput">
        <div class="input-box">
          <QRPositionMarker
            result={result}
            width={inputImgNode.current?.width || 0}
            height={inputImgNode.current?.height || 0}
          >
            <img
              class="scan-input-image"
              id="scanInputImage"
              crossOrigin="anonymous"
              ref={inputImgNode}
              src={props.url}
            ></img>
          </QRPositionMarker>
        </div>
      </div>
      <div class="necker-container"></div>
      <textarea
        class="output"
        id="scanOutput"
        title={T("content_title")}
        readOnly
        placeholder={error}
        value={result?.content}
        spellCheck="false"
        ref={outputContentNode}
      ></textarea>
      <div class="footer-container">
        <div class="footer actions1">
          {isUrl(result?.content) && (
            <span
              class="clickable"
              id="openLinkBtn"
              title={T("open_url_btn_title")}
              onClick={() => {
                window.open(result.content, "_blank");
              }}
            >
              <img class="icon icon-invert" src="../icons/open-url.svg" />
              {TT("open_url_btn")}
            </span>
          )}
        </div>
        <div class="footer actions2"></div>
        <div class="footer actions3"></div>
      </div>
    </>
  );
}

ImageScanner.propTypes = {
  url: PropTypes.string,
};

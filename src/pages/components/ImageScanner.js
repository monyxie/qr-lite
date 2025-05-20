import { apiNs } from "../../utils/compat";

import { useEffect, useState, useRef } from "react";
import { PropTypes } from "prop-types";

import { T, TT } from "../../utils/i18n";
import { scan } from "../../utils/qrcode";
import {
  isQrCodeContentLink,
  playScanSuccessAudio,
  randomStr,
} from "../../utils/misc";
import { addHistory } from "../../utils/history";
import QRPositionMarker from "./QRPositionMarker";
import { useTemporaryState } from "../../utils/hooks";

const imageRetriever = (options) => {
  (async () => {
    let dataUri = null;
    let captureParams = null;

    try {
      let imgEl = null;

      // try to get the img element using the firefox-only api getTargetElement
      if (
        globalThis.browser?.menus?.getTargetElement &&
        options.targetElementId
      ) {
        imgEl = globalThis.browser.menus.getTargetElement(
          options.targetElementId
        );
      }

      // try to get the img element with src url matching
      if (!imgEl && options.url) {
        const imageElements = document.querySelectorAll("img");
        for (const img of imageElements) {
          if (img.currentSrc === options.url) {
            imgEl = img;
            break;
          }
        }
      }

      // convert image to data URI
      if (imgEl) {
        const imgToDataUri = (img) => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const maxSize = 2000;
          const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL();
        };

        try {
          if (imgEl.complete) {
            dataUri = imgToDataUri(imgEl);
          } else {
            dataUri = await new Promise((resolve, reject) => {
              imgEl.addEventListener(
                "load",
                () => {
                  resolve(imgToDataUri(imgEl));
                },
                { once: true }
              );
              imgEl.addEventListener("error", (e) => reject(e), {
                once: true,
              });
            });
          }
        } catch (e) {
          console.error(e);
        }
      }

      // fallback: fetch the url to get image data
      if (!dataUri && options.url) {
        try {
          dataUri = await fetch(options.url, { mode: "cors" })
            .then((r) => r.blob())
            .then((blob) => {
              return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            });
        } catch (e) {
          console.error(e);
        }
      }

      // finally, if none of the above methods work, try to screenshot
      // the image via webextension api
      // we only construct the parameters needed for capturing the images here
      // the actual capturing is done elsewhere
      if (!dataUri) {
        const getNumber = (a) => parseFloat(a) || 0;
        const getContentRect = (el) => {
          const boundingClientRect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return {
            x:
              boundingClientRect.x +
              getNumber(style.borderLeftWidth) +
              getNumber(style.paddingLeft),
            y:
              boundingClientRect.y +
              getNumber(style.borderTopWidth) +
              getNumber(style.paddingTop),
            width:
              boundingClientRect.width -
              getNumber(style.borderLeftWidth) -
              getNumber(style.borderRightWidth) -
              getNumber(style.paddingLeft) -
              getNumber(style.paddingRight),
            height:
              boundingClientRect.height -
              getNumber(style.borderTopWidth) -
              getNumber(style.borderBottomWidth) -
              getNumber(style.paddingTop) -
              getNumber(style.paddingBottom),
          };
        };

        let canCapture = true;
        let rect = null;
        let scroll = null;

        try {
          rect = getContentRect(imgEl);

          let currWindow = window;
          while (currWindow !== currWindow.parent) {
            const frameRect = getContentRect(currWindow.frameElement);
            rect.x += frameRect.x;
            rect.y += frameRect.y;
            currWindow = currWindow.parent;
          }

          scroll = {
            left: currWindow.scrollX,
            top: currWindow.scrollY,
          };
        } catch (e) {
          console.error(e);
          canCapture === false;
        }

        if (canCapture && scroll && rect) {
          rect.x = Math.ceil(rect.x);
          rect.y = Math.ceil(rect.y);
          rect.width = Math.floor(rect.width);
          rect.height = Math.floor(rect.height);

          captureParams = {
            scroll,
            rect,
            devicePixelRatio: window.devicePixelRatio,
          };
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      (globalThis.browser || globalThis.chrome).runtime.sendMessage({
        action: "POPUP_RECEIVE_IMAGE",
        url: options.url,
        id: options.id,
        image: dataUri,
        captureParams,
      });
    }
  })();
  1;
};

/**
 *
 * @param {{id:string,tabId:any,frameId:any,targetElementId:any}} options
 * @returns
 */
async function injectImageRetriever(options) {
  return apiNs.scripting.executeScript({
    func: imageRetriever,
    args: [options || {}],
    target: {
      tabId: options.tabId,
      frameIds: [options.frameId],
    },
  });
}

function shouldUseImageRetriever(url, tabId, targetElementId) {
  if (/^data:/i.test(url)) {
    return false;
  }
  const hasTarget =
    tabId !== undefined &&
    tabId !== null &&
    (url || (targetElementId !== undefined && targetElementId !== null));
  return hasTarget;
}

export default function ImageScanner(props) {
  const [error, setError] = useState(null);
  const inputImgNode = useRef(null);
  const outputContentNode = useRef(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useTemporaryState(false, 3000);
  const [imgSrc, setImgSrc] = useState(null);
  const receiveImageId = useRef(null);
  useEffect(() => {
    if (
      shouldUseImageRetriever(props.url, props.tabId, props.targetElementId)
    ) {
      receiveImageId.current = randomStr(10);
      const listener = (request) => {
        if (request.action === "POPUP_RECEIVE_IMAGE") {
          if (
            request.url === props.url &&
            request.id === receiveImageId.current
          ) {
            if (request.image) {
              setImgSrc(request.image);
            } else if (request.captureParams) {
              apiNs.runtime
                .sendMessage({ action: "BG_CAPTURE", ...request.captureParams })
                .then((r) => {
                  setImgSrc(r.image);
                })
                .catch(() => {
                  setError(T("unable_to_load_image"));
                });
            } else {
              setError(T("unable_to_load_image"));
            }
            apiNs.runtime.onMessage.removeListener(listener);
          }
        }
      };

      apiNs.runtime.onMessage.addListener(listener);
      injectImageRetriever({
        url: props.url,
        tabId: props.tabId,
        frameId: props.frameId,
        targetElementId: props.targetElementId,
        id: receiveImageId.current,
      });
      return () => {
        apiNs.runtime.onMessage.removeListener(listener);
      };
    } else {
      if (props.url) {
        setImgSrc(props.url);
      } else {
        setError(T("unable_to_load_image"));
      }
    }
  }, [props.frameId, props.tabId, props.targetElementId, props.url]);

  useEffect(() => {
    setResult(null);
    setError(null);

    if (!imgSrc) {
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
        const results = await scan(inputImgNode.current);
        if (results.length < 1) {
          errMsg = T("unable_to_decode_qr_code");
        } else {
          success = true;
          setResult(results[0]);
          await addHistory("decode", results[0].content);
        }
      } catch (e) {
        console.error(e);
        errMsg = T("decoding_failed", e);
      } finally {
        // release blob: url
        if (imgSrc.startsWith("blob:")) {
          URL.revokeObjectURL(imgSrc);
        }
      }

      if (success) {
        playScanSuccessAudio();
      } else {
        setError(errMsg || T("unable_to_decode"));
      }
    })();
  }, [inputImgNode, imgSrc]);

  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => {
        if (outputContentNode.current) {
          outputContentNode.current?.select();
        }
      });
      return () => clearTimeout(timer);
    }
  }, [result]);

  return (
    <>
      <div class="input " id="scanInput">
        <div class="input-box">
          <QRPositionMarker
            result={result}
            width={inputImgNode.current?.width || 0}
            height={inputImgNode.current?.height || 0}
          >
            {imgSrc && (
              <img
                class="input-wrapper scan-input-image"
                id="scanInputImage"
                crossOrigin="anonymous"
                ref={inputImgNode}
                src={imgSrc}
              ></img>
            )}
          </QRPositionMarker>
        </div>
      </div>
      <div class="necker-container"></div>
      <textarea
        class={"output " + (result?.content ? "" : "error")}
        title={T("content_title")}
        readOnly
        placeholder={error}
        value={result?.content}
        spellCheck="false"
        ref={outputContentNode}
      ></textarea>
      <div class="footer-container">
        <div class="footer actions1">
          {isQrCodeContentLink(result?.content) && (
            <span
              class="clickable"
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
        <div class="footer actions2">
          {" "}
          {result?.content && !copied && (
            <a
              class=" clickable"
              title={T("copy_btn_title")}
              onClick={() => {
                navigator.clipboard
                  .writeText(result.content)
                  .then(() => {
                    setCopied(true);
                    return true;
                  })
                  .catch(() => false);
              }}
            >
              <img class="icon icon-invert" src="../icons/copy.svg" />
              {TT("copy_btn")}
            </a>
          )}
          {copied && <span class="clickable">{TT("copy_btn_copied")}</span>}
        </div>
        <div class="footer actions3"></div>
      </div>
    </>
  );
}

ImageScanner.propTypes = {
  url: PropTypes.string,
  tabId: PropTypes.any,
  frameId: PropTypes.any,
  targetElementId: PropTypes.any,
};

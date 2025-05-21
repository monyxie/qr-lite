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

const imageRetriever = (options, debug) => {
  (async () => {
    let dataUri = null;
    let captureParams = null;
    const debugLog = (...args) => {
      if (debug) console.log(...args);
    };

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

    const waitForImgToLoad = async (img) => {
      if (img.complete) {
        return;
      } else {
        dataUri = await new Promise((resolve, reject) => {
          img.addEventListener(
            "load",
            () => {
              resolve();
            },
            { once: true }
          );
          img.addEventListener("error", (e) => reject(e), {
            once: true,
          });
        });
      }
    };

    const getCaptureParams = (originalImg) => {
      // try to screenshot
      // the image via webextension api
      // we only construct the parameters needed for capturing the images here
      // the actual capturing is done elsewhere
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
        rect = getContentRect(originalImg);
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

        if (rect.width > 0 && rect.height > 0) {
          const params = {
            scroll,
            rect,
            devicePixelRatio: window.devicePixelRatio,
          };
          return params;
        }
      }
      return null;
    };

    try {
      let originalImg = null;

      // 1. try to get the img element using the firefox-only api getTargetElement
      if (
        globalThis.browser?.menus?.getTargetElement &&
        options.targetElementId
      ) {
        originalImg = globalThis.browser.menus.getTargetElement(
          options.targetElementId
        );
        if (originalImg) {
          debugLog("Got <img> element via getTargetElement");
        }
      }

      // 2. try to get the img element with src url matching
      if (!originalImg && options.url) {
        const imageElements = document.querySelectorAll("img");
        for (const img of imageElements) {
          if (img.currentSrc === options.url) {
            originalImg = img;
            debugLog("Got <img> element via url matching");
            break;
          }
        }
      }

      // 3. try to convert image to data URI
      if (originalImg) {
        try {
          await waitForImgToLoad(originalImg);
          dataUri = imgToDataUri(originalImg);
          if (dataUri) {
            debugLog("Converted <img> to data URI via <canvas>");
          }
        } catch (e) {
          console.error(e);
        }
      }

      // 4. get capture params
      if (!dataUri && originalImg) {
        captureParams = getCaptureParams(originalImg);
        if (captureParams) {
          debugLog("Got params for screen capture", captureParams);
        }
      }

      // 5. last resort, if the image is on a different origin and the crossOrigin attribute is not set
      // create a new <img> with crossOrigin="anonyous"
      if (!dataUri && !captureParams && options.url) {
        const isSameOrigin =
          window.location.origin === new URL(options.url).origin;
        const isLoadedViaCors = originalImg.crossOrigin !== null;

        if (!originalImg || (!isSameOrigin && !isLoadedViaCors)) {
          const newImg = new Image();
          newImg.crossOrigin = "anonymous";
          newImg.src = options.url;

          debugLog("Created new cross-origin <img> element");

          try {
            await waitForImgToLoad(newImg);
            dataUri = imgToDataUri(newImg);
          } catch (e) {
            console.error(e);
          }
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
  return await apiNs.scripting.executeScript({
    func: imageRetriever,

    args: [
      options || {},
      // eslint-disable-next-line no-undef
      QRLITE_DEBUG,
    ],
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

const STATUS = {
  UNINITIATED: 0,
  LOADING: 1,
  SUCCESS: 2,
  FAILURE: 3,
};

export default function ImageScanner(props) {
  const [error, setError] = useState(null);
  const inputImgNode = useRef(null);
  const outputContentNode = useRef(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useTemporaryState(false, 3000);
  const [imgSrc, setImgSrc] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(STATUS.UNINITIATED);

  const receiveImageId = useRef(null);
  useEffect(() => {
    if (
      shouldUseImageRetriever(props.url, props.tabId, props.targetElementId)
    ) {
      setLoadingStatus(STATUS.LOADING);
      receiveImageId.current = randomStr(10);
      const listener = (request) => {
        if (request.action === "POPUP_RECEIVE_IMAGE") {
          if (
            request.url === props.url &&
            request.id === receiveImageId.current
          ) {
            if (request.image) {
              setImgSrc(request.image);
              setLoadingStatus(STATUS.SUCCESS);
            } else if (request.captureParams) {
              apiNs.runtime
                .sendMessage({ action: "BG_CAPTURE", ...request.captureParams })
                .then((r) => {
                  setImgSrc(r.image);
                  setLoadingStatus(STATUS.SUCCESS);
                })
                .catch(() => {
                  setError(T("unable_to_load_image"));
                  setLoadingStatus(STATUS.FAILURE);
                });
            } else {
              setError(T("unable_to_load_image"));
              setLoadingStatus(STATUS.FAILURE);
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
      }).catch((e) => {
        console.error(e);
        setLoadingStatus(STATUS.FAILURE);
      });
      return () => {
        apiNs.runtime.onMessage.removeListener(listener);
      };
    } else {
      if (props.url) {
        setImgSrc(props.url);
        setLoadingStatus(STATUS.SUCCESS);
      } else {
        setError(T("unable_to_load_image"));
        setLoadingStatus(STATUS.FAILURE);
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

  if (
    loadingStatus === STATUS.FAILURE ||
    loadingStatus === STATUS.LOADING ||
    loadingStatus === STATUS.UNINITIATED // show nothing
  ) {
    return (
      <div
        class="instructions instruction-screen"
        style="width: 80%"
        id="scanInstructions"
      >
        {loadingStatus === STATUS.LOADING && (
          <p>
            <span>{TT("loading_image")}</span>
          </p>
        )}
        {loadingStatus === STATUS.FAILURE && (
          <p>
            <span>{TT("image_scanner_failed_to_load_image")}</span>
            <br />
            <br />
            <a
              class="clickable"
              id="scanRegion"
              onClick={() => {
                apiNs.runtime.sendMessage({
                  action: "BG_INJECT_PICKER_LOADER",
                });
                // close self (popup)
                window.close();
              }}
            >
              <img class="icon icon-invert" src="../icons/scan-region.svg" />
              {TT("pick_region_to_scan_btn")}
            </a>
          </p>
        )}
      </div>
    );
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
      {(result?.content || error) && (
        <textarea
          class={"output " + (result?.content ? "" : "error")}
          title={T("content_title")}
          readOnly
          placeholder={error}
          value={result?.content}
          spellCheck="false"
          ref={outputContentNode}
        ></textarea>
      )}
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

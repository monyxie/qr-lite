import { render } from "preact";
import { T, TT } from "../utils/i18n";
import {
  useKeyPress,
  useURLParams,
  useAudioPlayer,
  useTimer,
  SettingsContextProvider,
  useMousePositionRef,
  useWindowSize,
} from "../utils/hooks";
import { useEffect, useState, useCallback, useRef } from "react";
import { apiNs } from "../utils/compat";
import { PropTypes } from "prop-types";
import { useTemporaryState } from "../utils/hooks";
import { isUrl } from "../utils/misc";
import QRPositionMarker from "./components/QRPositionMarker";

const minScaleFactor = 0.2;
const maxScaleFactor = 10;
const maxScaleLevel = 30;
const distance = (maxScaleFactor - minScaleFactor) / maxScaleLevel;
const initialScanLevel = 10;
const baseScanSize = 100;

/**
 * collision detection
 * @param a {{x,y,width,height}}
 * @param b {{x,y,width,height}}
 * @return {boolean}
 */
function collides(a, b) {
  const ax1 = a.x;
  const ay1 = a.y;
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;

  const bx1 = b.x;
  const by1 = b.y;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;

  return !(ax2 < bx1 || bx2 < ax1 || ay2 < by1 || by2 < ay1);
}

function Picker({ stage, onScan, onSpotChange }) {
  const windowSize = useWindowSize();
  const [scaleLevel, setScaleLevel] = useState(initialScanLevel);
  const factor = minScaleFactor + distance * scaleLevel;
  const scanSize = baseScanSize * factor;
  const maskRef = useRef(null);
  const pathRef = useRef(null);

  const prevScanSize = useRef(null);
  const prevMousePositionRef = useRef(null);
  const mousePositionRef = useMousePositionRef();
  const animationFrameRef = useRef(null);

  useEffect(() => {
    maskRef.current?.setAttribute(
      "viewBox",
      `0 0 ${windowSize.width} ${windowSize.height}`
    );
  }, [windowSize]);

  useEffect(() => {
    cancelAnimationFrame(animationFrameRef.current);
    const updateSpotlight = () => {
      if (mousePositionRef.current && pathRef.current) {
        const ww = windowSize.width;
        const wh = windowSize.height;

        if (
          mousePositionRef.current !== prevMousePositionRef.current ||
          prevScanSize.current !== scanSize
        ) {
          prevMousePositionRef.current = mousePositionRef.current;
          prevScanSize.current = scanSize;
          const rect = {
            x: mousePositionRef.current.x - scanSize / 2,
            y: mousePositionRef.current.y - scanSize / 2,
            width: scanSize,
            height: scanSize,
          };
          onSpotChange(rect);

          let pathDef = `M 0 0 L 0 ${wh} L ${ww} ${wh} L ${ww} 0 Z`;
          pathDef += `M ${rect.x - 1} ${rect.y - 1} l 0 ${rect.height + 2} l ${
            rect.width + 2
          } 0 l 0 -${rect.height + 2} Z`;
          pathRef.current.setAttribute("d", pathDef);
        }
        if (stage === "picking") {
          animationFrameRef.current = requestAnimationFrame(
            updateSpotlight,
            1000
          );
        } else if (stage === "result") {
          let pathDef = `M 0 0 L 0 ${wh} L ${ww} ${wh} L ${ww} 0 Z`;
          pathRef.current.setAttribute("d", pathDef);
        }
      }
    };
    updateSpotlight();
  }, [
    stage,
    mousePositionRef /* make eslint happy */,
    scanSize,
    onSpotChange,
    windowSize,
  ]);

  const handleWheel = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (stage === "picking") {
      setScaleLevel((level) => {
        level = level + (event.deltaY > 0 ? -1 : 1);
        if (level < 0) {
          level = 0;
        } else if (level > maxScaleLevel) {
          level = maxScaleLevel;
        }
        return level;
      });
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (stage === "picking") {
      onScan();
    }
  };

  return (
    <svg
      class="mask"
      width="100%"
      height="100%"
      viewBox="0 0 0 0"
      xmlns="http://www.w3.org/2000/svg"
      onWheel={handleWheel}
      onClick={handleClick}
      ref={maskRef}
      style={{
        cursor:
          stage === "scanning"
            ? "wait"
            : stage === "picking"
            ? "crosshair"
            : "auto",
      }}
    >
      <path
        fill="black"
        fillOpacity="50%"
        fillRule="evenodd"
        ref={pathRef}
      ></path>
    </svg>
  );
}

Picker.propTypes = {
  stage: PropTypes.oneOf(["picking", "scanning", "result"]).isRequired,
  onScan: PropTypes.func.isRequired,
  onSpotChange: PropTypes.func.isRequired,
};

function Scanner({ port, scroll }) {
  const [stage, setStage] = useState("picking");
  const [inputImage, setInputImage] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const params = useURLParams();
  const [validated, setValidated] = useState(false);
  const [options, setOptions] = useState({ openUrlMode: "NO_OPEN" });
  const [copied, setCopied] = useTemporaryState(false, 3000);
  const resultContentNode = useRef(null);
  const audioPlayer = useAudioPlayer();
  const xMarkNode = useRef(null);
  const tipsNode = useRef(null);
  const [imagePosition, setImagePosition] = useState(null);
  const { setTimer } = useTimer();
  const [resultVisible, setResultVisible] = useState(false);
  const [spotRect, setSpotRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [inputImageSize, setInputImageSize] = useState(null);

  const collidesWithSpot = useCallback(
    function (el) {
      if (!el || !spotRect) {
        return false;
      }
      return collides(spotRect, el.getBoundingClientRect());
    },
    [spotRect]
  );

  // validate secret
  useEffect(() => {
    const secret = params?.get("secret");
    if (!secret) {
      return;
    }

    apiNs.runtime
      .sendMessage({
        action: "BG_VALIDATE_PICKER_SECRET",
        secret,
      })
      .then((res) => {
        setValidated(res);
        if (!res) {
          console.error("picker frame secret validation failed");
        }
      })
      .catch((e) => {
        console.error(e);
      });
  }, [params]);

  // get options
  useEffect(() => {
    if (!validated) {
      return;
    }
    (async () => {
      const options = Object.assign(
        { openUrlMode: "NO_OPEN" },
        await apiNs.runtime.sendMessage({ action: "PICKER_GET_OPTIONS" })
      );
      setOptions(options);
    })();
  }, [validated]);

  const close = useCallback(() => {
    if (port) {
      port.postMessage({ action: "PICKER_CLOSE" });
    }
  }, [port]);

  const copyResult = useCallback(() => {
    if (!result?.content) {
      return;
    }
    (async () => {
      let ok = false;
      if (navigator.clipboard) {
        ok = await navigator.clipboard
          .writeText(result.content)
          .then(() => {
            setCopied(true);
            return true;
          })
          .catch(() => false);
      }
      if (!ok && resultContentNode.current) {
        resultContentNode.current.select();
        if (document.execCommand("copy")) {
          setCopied(true);
        }
        resultContentNode.current.setSelectionRange(0, 0);
      }
    })();
  }, [result, setCopied]);

  const newScan = () => {
    setStage("picking");
    setInputImage(null);
    setResult(null);
    setError(null);
    setResultVisible(false);
  };

  useKeyPress({ key: "Escape", event: "keyup", callback: close });
  useKeyPress({ key: "r", event: "keyup", callback: newScan });

  const handleSpotChange = useCallback((spot) => {
    setSpotRect(spot);
  }, []);

  const cancelWheel = useCallback((e) => {
    if (e.target.tagName !== "TEXTAREA") {
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  const scan = useCallback(async () => {
    setStage("scanning");
    const x = Math.max(spotRect.x, 0);
    const y = Math.max(spotRect.y, 0);
    const width = Math.min(spotRect.x + spotRect.width, window.innerWidth) - x;
    const height =
      Math.min(spotRect.y + spotRect.height, window.innerHeight) - y;

    const rect = { x, y, width, height };
    let nextStage = "result";
    try {
      const res = await apiNs.runtime.sendMessage({
        action: "BG_CAPTURE",
        rect,
        scroll: scroll,
        devicePixelRatio: window.devicePixelRatio,
      });
      setError(res.err);
      setInputImage(res.image);
      setInputImageSize(res.imageSize);
      if (res.result.length > 0) {
        const playAudioPromise = audioPlayer.scanSuccess();
        setResult(res.result[0]);
        const content = res.result[0].content;
        if (isUrl(content)) {
          switch (options.openUrlMode) {
            case "OPEN":
              nextStage = null;
              playAudioPromise.then(() => {
                window.open(content, "_top");
                close();
              }, 0);
              break;
            case "OPEN_NEW_BG_TAB":
              nextStage = null;
              apiNs.runtime.sendMessage({
                action: "BG_CREATE_TAB",
                active: false,
                url: content,
              });
              newScan();
              break;
            case "OPEN_NEW_FG_TAB":
              nextStage = null;
              apiNs.runtime.sendMessage({
                action: "BG_CREATE_TAB",
                active: true,
                url: content,
              });
              newScan();
              break;
          }
        }
      }
    } catch (e) {
      setError(e);
    } finally {
      if (nextStage) {
        if (nextStage === "result") {
          setImagePosition({
            top: `${rect.y + rect.height / 2}px`,
            left: `${rect.x + rect.width / 2}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          });
          setTimer(() => {
            setImagePosition({
              top: "270px",
              left: "50%",
              width: "300px",
              height: "300px",
            });
          }, 100);
          setTimer(() => {
            setResultVisible(true);
          }, 100);
        }
        setStage(nextStage);
      }
    }
  }, [
    audioPlayer,
    close,
    options.openUrlMode,
    scroll,
    setTimer,
    spotRect.height,
    spotRect.width,
    spotRect.x,
    spotRect.y,
  ]);

  const tipsStyles = {
    opacity:
      stage === "picking" && collidesWithSpot(tipsNode.current) ? "0" : "1",
  };
  const xMarkStyles = {
    opacity:
      stage === "picking" && collidesWithSpot(xMarkNode.current) ? "0" : "1",
  };

  if (!validated) {
    return null;
  }

  return (
    <>
      <Picker stage={stage} onSpotChange={handleSpotChange} onScan={scan} />
      <div class="tips" id="tips" ref={tipsNode} style={tipsStyles}>
        <img
          class="logo"
          src="../icons/qrlite.svg"
          title={T("extension_name")}
        />
        {stage === "picking" && (
          <>
            <kbd>
              <img
                class="icon icon-invert"
                src="../icons/mouse-scrollwheel.svg"
                title={T("scan_region_picker_tips_scrollwheel")}
              />
            </kbd>
            <span>{TT("scan_region_picker_tips_adjust_size")}</span>
          </>
        )}
        {stage === "picking" && (
          <>
            <kbd>
              <img
                class="icon icon-invert"
                src="../icons/mouse-leftclick.svg"
                title={T("scan_region_picker_tips_leftclick")}
              />
            </kbd>
            <span>{TT("scan_region_picker_tips_scan")}</span>
          </>
        )}
        <>
          <kbd>{TT("scan_region_picker_tips_esc")}</kbd>
          <span>{TT("scan_region_picker_tips_exit")}</span>
        </>
        {stage === "picking" && (
          <select
            id="select-open-url-mode"
            title="Choose how to handle URLs in scan results"
            defaultValue={options.openUrlMode}
            onChange={(e) => {
              setOptions((old) => {
                return {
                  ...old,
                  openUrlMode: e.target.value,
                };
              });
            }}
          >
            <option value="NO_OPEN">
              {TT("picker_url_mode_auto_open_no")}
            </option>
            <option value="OPEN">
              {TT("picker_url_mode_auto_open_in_current_tab")}
            </option>
            <option value="OPEN_NEW_BG_TAB">
              {TT("picker_url_mode_auto_open_in_bg_tab")}
            </option>
            <option value="OPEN_NEW_FG_TAB">
              {TT("picker_url_mode_auto_open_in_fg_tab")}
            </option>
          </select>
        )}
      </div>
      <div
        class=" x-mark"
        id="x-mark"
        title={T("picker_close_btn_title")}
        onClick={() => {
          close();
        }}
        ref={xMarkNode}
        style={xMarkStyles}
      >
        ×
      </div>
      {stage === "result" && (
        <>
          <div
            class="input-image-container"
            style={imagePosition}
            onWheel={cancelWheel}
          >
            {inputImage && (
              <QRPositionMarker
                width={inputImageSize?.width}
                height={inputImageSize?.height}
                result={result}
                flashDelay="0.5s"
              >
                <img class="captured" id="captured" src={inputImage} />
              </QRPositionMarker>
            )}
          </div>
          <div
            class="result"
            id="result"
            style={{ opacity: resultVisible ? "1" : "0" }}
            onWheel={cancelWheel}
          >
            <textarea
              id="result-content"
              placeholder={T("unable_to_decode") + (error ? error.message : "")}
              title={T("content_title")}
              readOnly
              rows="6"
              value={result?.content || ""}
              ref={resultContentNode}
            ></textarea>
            <div class="result-actions">
              {!copied ? (
                <a
                  id="copy-btn"
                  class=" clickable"
                  title={T("copy_image_btn_title")}
                  onClick={() => {
                    copyResult();
                  }}
                >
                  <img class="icon icon-invert" src="../icons/copy.svg" />
                  {TT("copy_btn")}
                </a>
              ) : (
                <span id="copied-message" class="clickable">
                  {TT("copy_btn_copied")}
                </span>
              )}
              {isUrl(result?.content) && (
                <a
                  id="open-link-btn"
                  class=" clickable"
                  target="_blank"
                  title={T("open_url_btn_title")}
                  onClick={() => {
                    window.open(result.content, "_blank");
                  }}
                >
                  <img class="icon icon-invert" src="../icons/open-url.svg" />
                  {TT("open_url_btn")}
                </a>
              )}
              <a
                id="rescan-btn"
                class="clickable"
                title={T("rescan_btn_title")}
                onClick={newScan}
              >
                <img class="icon icon-invert" src="../icons/refresh.svg" />
                {TT("rescan_btn_label")}
              </a>
            </div>
          </div>
        </>
      )}
    </>
  );
}

Scanner.propTypes = {
  port: PropTypes.object,
  scroll: PropTypes.object,
};

// set up message handler asap so that we don't miss the message
window.onmessage = (event) => {
  switch (event.data?.action) {
    case "PICKER_SHOW":
      window.onmessage = null;
      render(
        <SettingsContextProvider>
          <Scanner port={event.ports[0]} scroll={event.data.scroll} />
        </SettingsContextProvider>,
        document.body
      );
      break;
  }
};

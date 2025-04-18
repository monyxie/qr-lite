import SanitizeFilename from "sanitize-filename";
import { apiNs, clipboard, tabs } from "../utils/compat";

import { render } from "preact";
import {
  useEffect,
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import { PropTypes } from "prop-types";

import { T, TT } from "../utils/i18n";
import {
  useAudioPlayer,
  useSettings,
  useTemporaryState,
  useURLParams,
  useMatchMedia,
} from "../utils/hooks";
import { scan } from "../utils/qrcode";
import { debouncer, isUrl, sleep } from "../utils/misc";
import {
  addHistory,
  removeHistory,
  getHistory,
  clearHistory,
} from "../utils/history";
import QRCodeSVG from "./components/QRCodeSVG";

function QRPositionMarker({ children, width, height, result, mirror }) {
  let marker = null;
  if (result?.vertices) {
    const points = result.vertices.map((v) => v.join(",")).join(" ");
    marker = (
      <svg
        aria-hidden="true"
        fill="lightgreen"
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon
          fill="green"
          fillOpacity="0.3"
          stroke="#88FF00"
          strokeWidth="1%"
          strokeLinejoin="round"
          strokeOpacity="0.9"
          points={`${points.trim()}`}
        ></polygon>
      </svg>
    );
  }

  const styles = {
    position: "relative",
    padding: 0,
    margin: 0,
    display: result ? "block" : "none",
    transform: mirror ? "scaleX(-1)" : "none",
  };

  return (
    <div style={styles}>
      {children}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          margin: 0,
          padding: 0,
          top: 0,
          left: 0,
        }}
      >
        {marker}
      </div>
    </div>
  );
}

QRPositionMarker.propTypes = {
  children: PropTypes.node,
  width: PropTypes.number,
  height: PropTypes.number,
  result: PropTypes.object,
  mirror: PropTypes.bool,
};

const Generator = forwardRef(function Generator(props, ref) {
  const [settings, saveSettings] = useSettings();
  const [content, setContent] = useState(props.content || "");
  const [title] = useState(props.title || "");
  const [copied, setCopied] = useTemporaryState(false, 3000);
  const resultNode = useRef(null);
  const addHistoryDebouncer = useRef(debouncer(1000));
  const isDarkMode = useMatchMedia("(prefers-color-scheme: dark)");

  useImperativeHandle(ref, () => ({
    setContent,
  }));

  useEffect(() => {
    if (!content) {
      return;
    }
    if (content === props.content) {
      addHistory("encode", content);
      return;
    }
    addHistoryDebouncer.current.debounce(() => {
      addHistory("encode", content);
    });
  }, [content, props.content]);

  /**
   * @returns {Promise<HTMLCanvasElement>}
   */
  const createCanvasForQrCode = (size) => {
    size = size || 500;
    return new Promise((resolve, reject) => {
      const el = document.createElement("div");
      render(
        <QRCodeSVG
          width={size}
          height={size}
          content={content}
          backgroundColor="white"
          foregroundColor="black"
        ></QRCodeSVG>,
        el
      );
      const svg = el.querySelector("svg");
      const img = document.createElement("img");
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const xml = new XMLSerializer().serializeToString(svg);
      const svg64 = btoa(xml);
      const context = canvas.getContext("2d");
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, canvas.width, canvas.height);

      img.onload = function () {
        context.drawImage(img, 0, 0);
        img.onload = null; // clean up
        img.onerror = null; // clean up
        resolve(canvas);
      };
      img.onerror = (error) => {
        img.onload = null; // clean up
        img.onerror = null; // clean up
        reject(error);
      };
      img.src = "data:image/svg+xml;base64," + svg64;
    });
  };

  const getFilenameFromTitle = (title) => {
    return SanitizeFilename(title).substr(0, 100) + ".png";
  };

  const downloadImage = () => {
    createCanvasForQrCode().then((canvas) => {
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = title ? getFilenameFromTitle(title) : "qr-code.png";
      a.click();
    });
  };

  const copyImage = () => {
    createCanvasForQrCode()
      .then((canvas) => clipboard.copyPng(canvas))
      .then(() => setCopied(true));
  };

  const ecLevels = [
    ["L", T("error_correction_level_btn_low_title")],
    ["M", T("error_correction_level_btn_medium_title")],
    ["Q", T("error_correction_level_btn_quartile_title")],
    ["H", T("error_correction_level_btn_high_title")],
  ];

  // handle dark mode & related settings
  const resultBoxStyles = {
    backgroundColor:
      isDarkMode && !settings.whiteOnBlackQRCodeInDarkMode
        ? "white"
        : "transparent",
    boxShadow:
      isDarkMode && !settings.whiteOnBlackQRCodeInDarkMode
        ? "0 0 10px rgb(0, 84, 0) inset"
        : "none",
  };
  const svgProps =
    isDarkMode && settings.whiteOnBlackQRCodeInDarkMode
      ? { foregroundColor: "white", backgroundColor: "transparent" }
      : { foregroundColor: "black", backgroundColor: "transparent" };

  return (
    <div class={"main" + (props.hidden ? " hidden" : "")} id="main">
      <textarea
        class="source"
        id="sourceInput"
        title={T("content_title")}
        spellCheck="false"
        placeholder={T("content_placeholder")}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
        }}
        onPaste={(e) => {
          // avoid getting caught by global paste event listener
          e.stopPropagation();
        }}
      ></textarea>
      <div class="necker-container">
        <div class="necker length-view">
          <span title={T("content_length_label_title")}>
            {TT("content_length_label")}
            <span class="counter" id="counter">
              {content.length}
            </span>
          </span>
        </div>
        <div class="necker ec-view">
          <span title={T("error_correction_level_label_title")}>
            {TT("error_correction_level_label")}
          </span>
          <span id="ecLevels" class="ec-levels-container">
            {ecLevels.map(([level, title]) => (
              <span
                key={level}
                class={
                  "clickable ec-level " +
                  (settings.ecLevel === level ? "ec-level-active" : "")
                }
                title={title}
                onClick={() => saveSettings({ ecLevel: level })}
              >
                {level}
              </span>
            ))}
          </span>
        </div>
      </div>
      <div class="result" id="result" ref={resultNode} style={resultBoxStyles}>
        <QRCodeSVG
          content={content}
          width={300}
          height={300}
          errorCorrectionLevel={settings.ecLevel}
          {...svgProps}
        ></QRCodeSVG>
      </div>
      <div class="footer-container">
        <div class="footer actions1">
          {content && (
            <span
              class="clickable"
              id="save"
              title={T("save_image_btn_title")}
              onClick={() => downloadImage()}
            >
              <img class="icon icon-invert" src="../icons/save.svg" />
              {TT("save_image_btn")}
            </span>
          )}
        </div>
        <div class="footer actions2">
          {content && (
            <>
              {!copied ? (
                <span
                  class="clickable"
                  id="copy"
                  title={T("copy_image_btn_title")}
                  onClick={copyImage}
                >
                  <img class="icon icon-invert" src="../icons/copy.svg" />
                  {TT("copy_image_btn")}
                </span>
              ) : (
                <span class="" id="copied">
                  {TT("copy_image_ok")}
                </span>
              )}
            </>
          )}
        </div>
        <div class="footer actions3">
          <a
            class="clickable"
            target="_blank"
            href="https://github.com/monyxie/qr-lite"
            rel="noreferrer"
            title={T("github_link_title")}
          >
            <img class="icon icon-invert" src="../icons/code.svg" />v
            {TT("version")}
          </a>
        </div>
      </div>
    </div>
  );
});

Generator.propTypes = {
  content: PropTypes.string,
  title: PropTypes.string,
  hidden: PropTypes.bool,
  ref: PropTypes.any,
};

function PermissionPrompt({ type }) {
  const permissionName =
    type === "camera"
      ? T("grant_camera_permission_name")
      : type === "all-urls"
      ? T("grant_all_urls_permission_name")
      : null;
  return (
    <div class="instructions instruction-screen" id="permissionInstructions">
      <p>
        <span id="grant-permissions-instructions">
          {TT("grant_permissions_instructions_html", permissionName)}
        </span>
        <br />
        <br />
        <a
          class="clickable"
          id="grantPermissionsBtn"
          target="_blank"
          rel="noreferrer"
          href={apiNs.runtime.getURL(`/pages/grant.html?permission=${type}`)}
        >
          <img class="icon icon-invert" src="../icons/open-url.svg" />
          {TT("grant_permissions_btn")}
        </a>
      </p>
    </div>
  );
}

PermissionPrompt.propTypes = {
  type: PropTypes.string,
};

function ImageScanner(props) {
  const needsUrlPermission = isUrl(props.url);
  const [hasUrlPermission, setHasUrlPermission] = useState(false);
  const [error, setError] = useState(null);
  const inputImgNode = useRef(null);
  const outputContentNode = useRef(null);
  const [result, setResult] = useState(null);
  const audioPlayer = useAudioPlayer();

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
        audioPlayer.scanSuccess();
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

function ScanInstructions({ onClickScanRegion, onClickCameraScan }) {
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

function CameraScanner() {
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const audioPlayer = useAudioPlayer();
  const outputContentNode = useRef(null);
  const canvasRef = useRef(null);
  const [captured, setCaptured] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: false,
      })
      .then((r) => {
        setStream(r);
        setHasCameraPermission(true);
      })
      .catch(() => {
        setHasCameraPermission(false);
      });
  }, []);

  // setting up
  useEffect(() => {
    if (!stream || !videoRef.current) {
      return;
    }
    const video = videoRef.current;
    (async () => {
      try {
        video.srcObject = stream;
        video.play();
        while (!video.videoHeight || !video.videoWidth || video.paused) {
          await sleep(100);
        }
        setIsVideoReady(true);
      } catch (err) {
        console.error(`An error occurred: ${err}`);
        setError(err + "");
      }
    })();

    return () => {
      if (stream) {
        stream.getTracks().forEach(function (track) {
          track.stop();
        });
      }
      if (video) {
        video.pause();
        video.srcObject = undefined;
      }
    };
  }, [stream]);

  // capturing
  useEffect(() => {
    if (!isVideoReady) {
      return;
    }
    if (captured) {
      return;
    }
    if (result) {
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) {
      return;
    }

    canvas.width = 300;
    canvas.height = video.videoHeight / (video.videoWidth / canvas.width);
    // Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true
    // This will affect all subsequent operations on the same canvas
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCaptured(true);
  }, [isVideoReady, captured, result]);

  // scanning
  useEffect(() => {
    (async () => {
      if (captured || canvasRef.current) {
        try {
          const results = await scan(canvasRef.current);
          if (results && results.length > 0) {
            setResult(results[0]);
            addHistory("decode", results[0].content);
            audioPlayer.scanSuccess();
          }
        } catch (e) {
          console.error(e);
        }
      }
      await sleep(100);
      setCaptured(false);
    })();
  }, [captured]);

  useEffect(() => {
    if (result && outputContentNode.current) {
      outputContentNode.current.select();
    }
  }, [result]);

  if (hasCameraPermission === null) {
    return null;
  }
  if (!hasCameraPermission) {
    return <PermissionPrompt type="camera" />;
  }

  return (
    <>
      <div class="input" id="scanInput">
        <div class="input-box">
          <video
            id="scanVideo"
            ref={videoRef}
            class={"camera " + (result ? "hidden" : "")}
          ></video>
          <QRPositionMarker
            width={canvasRef.current?.width || 0}
            height={canvasRef.current?.height || 0}
            result={result}
            mirror={true}
          >
            <canvas id="canvas" ref={canvasRef}></canvas>
          </QRPositionMarker>
        </div>
      </div>
      <div class="necker-container">
        {isVideoReady && !result && (
          <div class="necker instructions">
            <p class="" id="scanningText">
              {TT("scanning")}
            </p>
          </div>
        )}
      </div>
      <textarea
        class="output "
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
        <div class="footer actions3">
          {result && (
            <a
              class="clickable"
              id="cameraRescanBtn"
              title={T("rescan_btn_title")}
              onClick={() => {
                setResult(null);
                setError(null);
              }}
            >
              <img class="icon icon-invert" src="../icons/refresh.svg" />
              {TT("rescan_btn_label")}
            </a>
          )}
        </div>
      </div>
    </>
  );
}
CameraScanner.propTypes = {};

function Scanner(props) {
  const [mode, setMode] = useState(props.mode);
  const [component, setComponent] = useState(null);

  useEffect(() => {
    if (mode === "camera") {
      setComponent(<CameraScanner />);
    } else if (props.url) {
      setComponent(<ImageScanner url={props.url} />);
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
  }, [props.url, mode]);
  return (
    <div class="scan" id="scan">
      {component}
    </div>
  );
}

Scanner.propTypes = {
  url: PropTypes.string,
  mode: PropTypes.string,
};

function Historian(props) {
  const [history, setHistory] = useState([]);
  const [settings, saveSettings] = useSettings();

  const getData = () =>
    getHistory().then(function (history) {
      history.reverse();
      setHistory(history);
    });

  useEffect(() => {
    getData();
  }, []);

  const historyList = history.map((item) => {
    return (
      <li
        class="history-item"
        title={item.text || ""}
        key={item.text}
        onClick={() => {
          if (props.onClickItem) {
            props.onClickItem(item);
          }
        }}
      >
        <img
          class="icon icon-invert"
          src={
            item.type === "decode"
              ? "../icons/scan.svg"
              : "../icons/generate.svg"
          }
        />
        <span class="history-item-text">{item.text || ""}</span>
        <span
          class="remove-history-btn clickable"
          title={T("remove_history_btn_title")}
          onClick={(e) => {
            e.stopPropagation();
            removeHistory(item.text).then(getData);
          }}
        >
          <img class="icon icon-invert" src="../icons/trash.svg" />
        </span>
      </li>
    );
  });

  return (
    <div class="history" id="history">
      <ul class="history-items" id="history-items">
        {historyList}
      </ul>
      <div class="footer-container">
        <div class="footer actions1">
          <span
            class="clickable"
            id="clear-history-btn"
            title={T("clear_history_btn_title")}
            onClick={() => {
              clearHistory().then(getData);
            }}
          >
            <img class="icon icon-invert" src="../icons/swipe.svg" />
            {TT("clear_history_btn")}
          </span>
        </div>
        <div class="footer actions2"></div>
        <div class="footer actions3">
          {settings.historyEnabled ? (
            <a
              class="clickable"
              id="disable-history-btn"
              title={T("disable_history_btn_title")}
              onClick={() => {
                saveSettings({ historyEnabled: false });
              }}
            >
              <img class="icon icon-invert" src="../icons/pause.svg" />
              {TT("disable_history_btn_label")}
            </a>
          ) : (
            <a
              class="clickable"
              id="enable-history-btn"
              title={T("enable_history_btn_title")}
              onClick={() => {
                saveSettings({ historyEnabled: true });
              }}
            >
              <img class="icon icon-invert" src="../icons/play.svg" />
              {TT("enable_history_btn_label")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

Historian.propTypes = {
  onClickItem: PropTypes.func,
};

function Popup() {
  const [options, setOptions] = useState(null);
  const [component, setComponent] = useState(null);
  const generatorRef = useRef(null);

  const handlePaste = (e) => {
    if (e.clipboardData?.files?.length > 0) {
      const file = e.clipboardData.files[0];

      if (file?.type?.startsWith("image/")) {
        setOptions({
          action: "POPUP_DECODE",
          image: URL.createObjectURL(file),
        });
        return false;
      }
    }

    const text = e.clipboardData?.getData("text/plain");

    if (text) {
      generatorRef.current?.setContent(text);
      setOptions({ action: "POPUP_ENCODE" });
      return false;
    }

    return true;
  };

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, []);

  useEffect(() => {
    apiNs.runtime
      .sendMessage({
        action: "POPUP_GET_OPTIONS",
      })
      .then((r) => {
        if (r) {
          return r;
        }
        return tabs
          .query({ active: true, currentWindow: true })
          .then((queryTabs) => {
            if (queryTabs.length > 0) {
              return {
                action: "POPUP_ENCODE",
                text: queryTabs[0].url,
                title: queryTabs[0].title,
              };
            }
          });
      })
      .then((r) => {
        setOptions(r || { action: "POPUP_ENCODE" });
      });
  }, []);

  useEffect(() => {
    document.documentElement.classList.add(QRLITE_BROWSER);

    // needed in chrome to prevent the vertical scrollbar from showing up in the popup
    // when the default zoom level is set to a large value
    if (QRLITE_BROWSER === "chrome") {
      if (window.innerHeight < document.documentElement.scrollHeight) {
        document.documentElement.style.zoom =
          window.innerHeight / document.documentElement.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    if (options) {
      switch (options.action) {
        case "POPUP_DECODE":
          setComponent(<Scanner url={options?.image} />);
          break;
        case "POPUP_DECODE_CAMERA":
          setComponent(<Scanner mode={"camera"} />);
          break;
        case "POPUP_HISTORY":
          setComponent(
            <Historian
              onClickItem={(item) => {
                generatorRef.current?.setContent(item.text);
                setOptions({ action: "POPUP_ENCODE" });
              }}
            ></Historian>
          );
          break;
        default:
          setComponent(null);
          break;
      }
    }
  }, [options]);

  return (
    <div class="container">
      <div class="tabs-container">
        <div
          class={
            "tabs-item " + (options?.action === "POPUP_ENCODE" ? "active" : "")
          }
          id="tab-generate"
          title={T("tab_generate_title")}
          onClick={() => setOptions({ action: "POPUP_ENCODE" })}
        >
          <div class="tabs-item-label">
            <img class="icon icon-invert" src="../icons/generate.svg" />
            <span class="tabs-item-text">{TT("tab_generate_title")}</span>
          </div>
        </div>
        <div
          class={
            "tabs-item " + (options?.action === "POPUP_DECODE" ? "active" : "")
          }
          id="tab-scan"
          title={T("tab_scan_title")}
          onClick={() => setOptions({ action: "POPUP_DECODE" })}
        >
          <div class="tabs-item-label">
            <img class="icon icon-invert" src="../icons/scan.svg" />
            <span class="tabs-item-text">{TT("tab_scan_title")}</span>
          </div>
        </div>
        <div
          class={
            "tabs-item " + (options?.action === "POPUP_HISTORY" ? "active" : "")
          }
          id="tab-history"
          title={T("tab_history_title")}
          onClick={() => setOptions({ action: "POPUP_HISTORY" })}
        >
          <div class="tabs-item-label">
            <img class="icon icon-invert" src="../icons/history.svg" />
            <span class="tabs-item-text">{TT("tab_history_title")}</span>
          </div>
        </div>
        <div
          class="tabs-item"
          id="tab-settings"
          title={T("tab_settings_title")}
          onClick={() => apiNs.runtime.openOptionsPage()}
        >
          <div class="tabs-item-label">
            <img class="icon icon-invert" src="../icons/gear.svg" />
          </div>
        </div>
      </div>
      <div class="content-container" data-role="content">
        {/* keep generator mounted so that it doesn't lose its state */}
        {options && (
          <Generator
            ref={generatorRef}
            hidden={!!component}
            content={
              options.action === "POPUP_ENCODE" ? options.text || "" : ""
            }
            title={options.action === "POPUP_ENCODE" ? options.title || "" : ""}
          />
        )}
        {component}
      </div>
    </div>
  );
}

render(<Popup />, document.body);

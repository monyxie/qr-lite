import SanitizeFilename from "sanitize-filename";
import { clipboard } from "../../utils/compat";

import { render } from "preact";
import {
  useEffect,
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { PropTypes } from "prop-types";

import { T, TT } from "../../utils/i18n";
import {
  useTemporaryState,
  useMatchMedia,
  useSettingsContext,
} from "../../utils/hooks";
import { debouncer } from "../../utils/misc";
import { addHistory } from "../../utils/history";
import QRCodeSVG from "./QRCodeSVG";

/**
 * @returns {Promise<HTMLCanvasElement>}
 */
const createCanvasForQrCode = (content, size) => {
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

const getFilename = (content, title) => {
  let filename = "QR Code for ";
  filename += SanitizeFilename(title || content.replace(/^https?:\/\//, ""), {
    replacement: "_",
  }).slice(0, 100);

  return filename + ".png";
};

const downloadImage = (content, title) => {
  createCanvasForQrCode(content)
    .then((canvas) => {
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = getFilename(content, title);
      a.click();
    })
    .catch((error) => {
      console.error("Failed to download QR code image:", error);
    });
};

const Generator = forwardRef(function Generator(props, ref) {
  const { settings, saveSettings } = useSettingsContext();
  const [content, setContent] = useState(props.content || "");
  const [title, setTitle] = useState(props.title || "");
  const [copied, setCopied] = useTemporaryState(false, 3000);
  const resultNode = useRef(null);
  const addHistoryDebouncer = useRef(debouncer(1000));
  const isDarkMode = useMatchMedia("(prefers-color-scheme: dark)");

  useImperativeHandle(ref, () => ({
    setContentAndTitle: (content, title) => {
      setContent(content || "");
      setTitle(title || "");
    },
  }));

  useEffect(() => {
    if (!content) {
      return;
    }
    if (content === props.content) {
      addHistory("encode", content);
      return;
    }
    const debouncer = addHistoryDebouncer.current;
    debouncer.debounce(() => {
      addHistory("encode", content);
    });

    return () => {
      if (debouncer) debouncer.cancel();
    };
  }, [content, props.content]);

  const copyImage = useCallback(() => {
    createCanvasForQrCode(content)
      .then((canvas) => clipboard.copyPng(canvas))
      .then(() => setCopied(true))
      .catch((error) => {
        console.error("Failed to copy QR code image:", error);
      });
  }, [content, setCopied]);

  const ecLevels = [
    ["L", T("error_correction_level_btn_low_title")],
    ["M", T("error_correction_level_btn_medium_title")],
    ["Q", T("error_correction_level_btn_quartile_title")],
    ["H", T("error_correction_level_btn_high_title")],
  ];

  // handle dark mode & related settings
  const resultBoxStyles = {
    backgroundColor:
      isDarkMode && !settings?.whiteOnBlackQRCodeInDarkMode
        ? "white"
        : "transparent",
    boxShadow:
      isDarkMode && !settings?.whiteOnBlackQRCodeInDarkMode
        ? "0 0 10px rgb(0, 84, 0) inset"
        : "none",
  };
  const svgProps =
    isDarkMode && settings?.whiteOnBlackQRCodeInDarkMode
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
        onBlur={() => {
          //  skip debouncer and commit history immediately
          addHistoryDebouncer.current.cancel();
          addHistory("encode", content);
        }}
        onChange={(e) => {
          setContent(e.target.value);
          setTitle("");
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
                  (settings?.ecLevel === level ? "ec-level-active" : "")
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
          errorCorrectionLevel={settings?.ecLevel}
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
              onClick={() => downloadImage(content, title)}
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

export default Generator;

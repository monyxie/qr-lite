import { apiNs, tabs } from "../utils/compat";

import { render } from "preact";
import { useEffect, useState, useRef } from "react";

import { T, TT } from "../utils/i18n";
import Generator from "./components/Generator";
import Scanner from "./components/Scanner";
import Historian from "./components/Historian";
import { SettingsContextProvider } from "../utils/hooks";

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
        case "POPUP_ENCODE":
          if (generatorRef.current) {
            if (options.text) {
              generatorRef.current.setContent(options.text);
            }
            if (options.title) {
              generatorRef.current.setTitle(options.title || "");
            }
          }
        // fallthrough
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
        <Generator
          ref={generatorRef}
          hidden={!!component}
          content={
            options?.action === "POPUP_ENCODE" ? options?.text || "" : ""
          }
          title={options?.action === "POPUP_ENCODE" ? options?.title || "" : ""}
        />
        {component}
      </div>
    </div>
  );
}

// this, in combination with hard-coded body width and height (in popup.css)
// prevents the UI being zoomed in chrome if the browser's default zoom level is >100%
// this has to be done as fast as possible or it will cause visible flicker
if (window.innerHeight < document.documentElement.scrollHeight) {
  document.documentElement.style.zoom =
    window.innerHeight / document.documentElement.scrollHeight;
}

render(
  <SettingsContextProvider>
    <Popup />
  </SettingsContextProvider>,
  document.body
);

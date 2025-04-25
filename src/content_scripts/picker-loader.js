import { apiNs } from "../utils/compat";
import { randomStr } from "../utils/misc";

class PickerLoader {
  constructor() {
    this.identifier = null;
    this.pickerPort = null;
  }

  applyCss(isRemove) {
    const styles = `background: transparent
border: 0
border-radius: 0
box-shadow: none
color-scheme: light dark
display: block
filter: none
height: 100vh
height: 100svh
left: 0
margin: 0
max-height: none
max-width: none
min-height: unset
min-width: unset
opacity: 1
outline: 0
padding: 0
pointer-events: auto
position: fixed
top: 0
transform: none
visibility: hidden
width: 100%
z-index: 2147483647
`.replaceAll("\n", " !important;\n");

    const css = `
:root > [${this.identifier}] {
    ${styles}
}
:root > [${this.identifier}-loaded] {
    visibility: visible !important;
}
`;

    return apiNs.runtime.sendMessage({
      action: "BG_APPLY_CSS",
      add: !isRemove ? css : "",
      remove: isRemove ? css : "",
    });
  }

  handleMessage(data) {
    switch (data.action) {
      case "PICKER_CLOSE":
        this.unload();
        if (typeof data.scaleLevel === "number") {
          window.savedScaleLevel = data.scaleLevel;
        }
        break;
      case "PICKER_SAVE_SCALE_LEVEL":
        if (typeof data.scaleLevel === "number") {
          window.savedScaleLevel = data.scaleLevel;
        }
        break;
    }
  }

  async load(options) {
    this.identifier = randomStr(10);
    const cssPromise = this.applyCss();
    const url = await apiNs.runtime.sendMessage({
      action: "BG_GET_PICKER_URL",
    });
    await cssPromise;
    const iframe = document.createElement("iframe");
    iframe.setAttribute(this.identifier, "");
    iframe.setAttribute("allow", "clipboard-write");
    document.documentElement.append(iframe);
    iframe.addEventListener("load", () => {
      iframe.setAttribute(`${this.identifier}-loaded`, "");
      const channel = new MessageChannel();
      this.pickerPort = channel.port1;
      this.pickerPort.onmessage = (ev) => {
        this.handleMessage(ev.data || {});
      };
      this.pickerPort.onmessageerror = () => {
        this.unload();
      };
      const origin = apiNs.runtime.getURL("");
      iframe.contentWindow.postMessage(
        {
          action: "PICKER_SHOW",
          scroll: {
            left: document.documentElement.scrollLeft,
            top: document.documentElement.scrollTop,
          },
          options,
          scaleLevel:
            typeof window.savedScaleLevel === "number" &&
            window.savedScaleLevel >= 0
              ? window.savedScaleLevel
              : null,
        },
        origin,
        [channel.port2]
      );

      // focus on the iframe otherwise the user won't be able to press <esc> to close the picker until they
      // manually focus on the iframe by clicking in it first
      iframe.contentWindow.focus();
    });
    iframe.contentWindow.location = url;
  }

  unload() {
    document.querySelector(`iframe[${this.identifier}]`)?.remove();
    this.applyCss(true);
  }
}

window.loadPickerLoader = (options) => {
  if (typeof window.picker === "undefined") {
    window.picker = new PickerLoader();
  } else {
    window.picker.unload();
  }
  window.picker.load(options);
};

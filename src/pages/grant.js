import { TT } from "../utils/i18n";
import { apiNs } from "../utils/compat";
import { usePageTitle, useURLParams } from "../utils/hooks";
import { render } from "preact";
import { useState } from "react";

function GrantCamera() {
  usePageTitle(apiNs.i18n.getMessage("grant_permissions_window_title"));

  const [state, setState] = useState("initial");
  const [err, setErr] = useState(null);

  const requestFunction = async () => {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      setState("granted");
      stream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e.name, e.message);
      setErr(e);
      setState("failed");
    }
  };

  let errorText = "";
  if (err) {
    switch (err?.name) {
      case "NotAllowedError":
        errorText = QRLITE_BROWSER === 'firefox' ? TT("grant_camera_blocked_instructions_firefox_html") : TT("grant_camera_blocked_instructions_chrome_html");
        break;
      case "AbortError":
      case "NotReadableError":
        errorText = TT("grant_camera_unusable_instructions_html");
        break;
      default:
        errorText = TT("grant_camera_unknow_error_instructions_html");
        break;
    }
  }

  return (
    <>
      {state === "initial" && (
        <p>
          <span class="grant-camera ">
            {QRLITE_BROWSER === 'firefox' ? TT("grant_camera_initial_instructions_firefox_html") : TT("grant_camera_initial_instructions_chrome_html")}
          </span>
          <br />
          <br />
          <a class="clickable" onClick={requestFunction}>
            <img class="icon icon-invert" src="../icons/key.svg" />
            {TT("grant_permissions_btn")}
          </a>
        </p>
      )}
      {state === "failed" && (
        <p class="">
          <span class="grant-camera ">{errorText}</span>
          <br />
          <br />
          <details class="error-details-container">
            <summary>{TT("grant_permissions_error_details_summary")}</summary>
            <code>
              {err?.name}: {err?.message}
            </code>
          </details>
          <br />
          <details class="error-details-container">
            <summary>{TT("grant_page_dont_see_icon_btn_html")}</summary>
            {TT("grant_page_dont_see_icon_instructions_html")}
            <br />
            <a class="clickable" onClick={requestFunction}>
              {TT("grant_page_dont_see_icon_instructions_reveal_icon_btn_label")}
            </a>
          </details>
          <br />
          <br />
          <a class="clickable" onClick={() => window.location.reload()}>
            <img class="icon icon-invert" src="../icons/refresh.svg" />
            {TT("grant_page_refresh_btn")}
          </a>
          <br />
        </p>
      )}
      {state === "granted" && (
        <p class="">
          <span class="grant-camera ">
            {TT("grant_camera_granted_instructions_html")}
          </span>
          <br />
          <br />
          <a class="clickable" onClick={() => window.close()}>
            <img class="icon icon-invert" src="../icons/close.svg" />
            {TT("grant_page_close_btn")}
          </a>
        </p>
      )}
    </>
  );
}

function GrantPage() {
  const permission = useURLParams()?.get("permission");

  const grantComponent = permission === "camera" ? <GrantCamera /> : null;

  return (
    <div class="container">
      <div class="box">
        <img src="../icons/qrlite.svg" class="logo" />
        {grantComponent}
      </div>
    </div>
  );
}

render(<GrantPage />, document.body);

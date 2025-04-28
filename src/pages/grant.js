import { TT } from "../utils/i18n";
import { apiNs } from "../utils/compat";
import { usePageTitle, useURLParams } from "../utils/hooks";
import { render } from "preact";
import { useState } from "react";

function GrantAllUrls() {
  usePageTitle(apiNs.i18n.getMessage("grant_permissions_window_title"));

  const [state, setState] = useState("initial");
  const requestFunction = async () => {
    let ok = false;
    try {
      ok = await apiNs.permissions.request({ origins: ["<all_urls>"] });
    } catch {
      ok = false;
    }
    setState(ok ? "granted" : "blocked");
  };

  return (
    <>
      {state === "initial" && (
        <p>
          <span class="grant-all-urls ">
            {TT("grant_all_urls_initial_instructions_html")}
          </span>
          <br />
          <br />
          <a class="clickable" onClick={() => requestFunction()}>
            <img class="icon icon-invert" src="../icons/key.svg" />
            {TT("grant_permissions_btn")}
          </a>
        </p>
      )}
      {state === "blocked" && (
        <p class="">
          <span class="grant-all-urls ">
            {TT("grant_all_urls_blocked_instructions_html")}
          </span>
          <br />
          <br />
          <a class="clickable" onClick={() => window.location.reload()}>
            <img class="icon icon-invert" src="../icons/refresh.svg" />
            {TT("grant_page_refresh_btn")}
          </a>
        </p>
      )}
      {state === "granted" && (
        <p class="">
          <span class="grant-all-urls ">
            {TT("grant_all_urls_granted_instructions_html")}
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

function GrantCamera() {
  usePageTitle(apiNs.i18n.getMessage("grant_permissions_window_title"));

  const [state, setState] = useState("initial");
  const [err, setErr] = useState(null);

  const requestFunction = async () => {
    setErr(null);
    try {
      await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      setState("granted");
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
        errorText = TT("grant_camera_blocked_instructions_html");
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
            {TT("grant_camera_initial_instructions_html")}
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
          <br />
          <a class="clickable" onClick={() => window.location.reload()}>
            <img class="icon icon-invert" src="../icons/refresh.svg" />
            {TT("grant_page_refresh_btn")}
          </a>
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

  const grantComponent =
    permission === "camera" ? (
      <GrantCamera />
    ) : permission === "all-urls" ? (
      <GrantAllUrls />
    ) : null;

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

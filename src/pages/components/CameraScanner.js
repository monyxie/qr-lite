import { useEffect, useState, useRef, useCallback } from "react";

import { T, TT } from "../../utils/i18n";
import { scan } from "../../utils/qrcode";
import {
  FpsCounter,
  isQrCodeContentLink,
  playScanSuccessAudio,
} from "../../utils/misc";
import { addHistory } from "../../utils/history";
import QRPositionMarker from "./QRPositionMarker";
import PermissionPrompt from "./PermissionPrompt";
import { useTemporaryState } from "../../utils/hooks";

// max 30 fps
const SCAN_FPS = 30;
const SCAN_INTERVAL_MS = 1000 / SCAN_FPS;

// optimal image size for balanced fps & detection rate
// see `opencv/opencv_contrib/modules/wechat_qrcode/src/wechat_qrcode.cpp:WeChatQRCode::Impl::getScaleList()`
const OPTIMAL_IMAGE_SIZE = 640;

export default function CameraScanner() {
  const [cameraStatus, setCameraStatus] = useState({
    checked: false,
    access: false,
    errorMessage: null,
    granted: false,
  });
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const outputContentNode = useRef(null);
  const canvasRef = useRef(null);
  const canvasContext = useRef(null);
  const scanTimer = useRef(null);
  const [copied, setCopied] = useTemporaryState(false, 3000);
  const fpsCounter = useRef(new FpsCounter());
  const [fps, setFps] = useState(0);

  const closeStream = useCallback((stream) => {
    const tracks = stream.getTracks();

    tracks.forEach((track) => {
      track.stop();
    });

    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!result) {
      if (!stream) {
        navigator.mediaDevices
          .getUserMedia({
            video: {
              frameRate: SCAN_FPS,
              width: { ideal: OPTIMAL_IMAGE_SIZE },
              height: { ideal: OPTIMAL_IMAGE_SIZE },
              // // firefox doesn't support this
              resizeMode: "crop-and-scale",
            },
            audio: false,
          })
          .then((r) => {
            setStream(r);
            setCameraStatus({
              checked: true,
              granted: true,
              access: true,
              errorMessage: null,
            });
          })
          .catch((e) => {
            switch (e.name) {
              case "NotAllowedError":
                setCameraStatus({
                  checked: true,
                  granted: false,
                  access: false,
                  errorMessage: null,
                });
                break;
              case "AbortError":
              case "NotReadableError":
                setCameraStatus({
                  checked: true,
                  granted: true,
                  access: false,
                  errorMessage: T("unable_to_access_camera"),
                });
                break;
              default:
                setCameraStatus({
                  checked: true,
                  granted: true,
                  access: false,
                  errorMessage: T("unable_to_access_camera_unknown_error"),
                });
                break;
            }
          });
      }
    } else {
      if (stream) {
        closeStream(stream);
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        closeStream(stream);
        setStream(null);
      }
    };
  }, [stream, result, closeStream]);

  // Effect for handling video stream setup
  useEffect(() => {
    if (videoRef.current && stream && !videoRef.current.srcObject) {
      try {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => {
          console.error("Error playing video:", err);
          setError(err.message || "Failed to play video.");
        });
      } catch (err) {
        console.error(`An error occurred while setting up video: ${err}`);
        setError(err.message || "Error setting up video.");
      }
    }
  }, [stream]); // Runs when stream changes or videoRef is available

  // scanning
  useEffect(() => {
    const scanFunc = async () => {
      const startTime = Date.now();
      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (canvas && video?.srcObject && video.videoWidth && video.videoHeight) {
        if (
          video.videoWidth > OPTIMAL_IMAGE_SIZE &&
          video.videoHeight > OPTIMAL_IMAGE_SIZE
        ) {
          const f =
            OPTIMAL_IMAGE_SIZE / Math.min(video.videoWidth, video.videoHeight);
          canvas.width = Math.ceil(video.videoWidth * f);
          canvas.height = Math.ceil(video.videoHeight * f);
        } else {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        if (!canvasContext.current) {
          // Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true
          // This will affect all subsequent operations on the same canvas
          canvasContext.current = canvas.getContext("2d", {
            willReadFrequently: true,
          });
        }
        canvasContext.current.drawImage(
          video,
          0,
          0,
          canvas.width,
          canvas.height
        );

        try {
          const results = await scan(
            canvasContext.current.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            ),
            true
          );
          if (results && results.length > 0) {
            setResult(results[0]);
            addHistory("decode", results[0].content);
            playScanSuccessAudio();
          }
        } catch (e) {
          console.error(e);
          setError(e.message || "Error during QR code scan.");
        }
      }

      scanTimer.current = setTimeout(
        scanFunc,
        Math.max(0, SCAN_INTERVAL_MS - (Date.now() - startTime))
      );
      fpsCounter.current?.tick();
      setFps(fpsCounter.current?.fps());
    };

    if (!result) {
      scanTimer.current = setTimeout(scanFunc, SCAN_INTERVAL_MS);
    } else {
      fpsCounter.current?.reset();
      clearTimeout(scanTimer.current);
    }

    return () => {
      clearTimeout(scanTimer.current);
    };
  }, [result, stream]); // Removed videoRef.current from dependencies as it's stable

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

  if (!cameraStatus.checked) {
    return null;
  }
  if (!cameraStatus.granted) {
    return <PermissionPrompt type="camera" />;
  }
  if (!cameraStatus.access) {
    return (
      <div class="instructions instruction-screen">
        <p>{cameraStatus.errorMessage}</p>
      </div>
    );
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
            hidden={!result}
          >
            <canvas style="width: 100%;" ref={canvasRef}></canvas>
          </QRPositionMarker>
        </div>
      </div>
      <div class="necker-container">
        {!result && (
          <div class="scanning-indicator">
            <img
              src="/icons/spinner.svg"
              class="icon-invert"
              style="opacity: 0.5"
            ></img>
            <div class="necker instructions">
              <p class="" id="scanningText">
                {TT("scanning")}
                <br />
                <span class="fps-counter">FPS:{fps}</span>
              </p>
            </div>
          </div>
        )}
      </div>
      {result && (
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

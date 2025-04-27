import { useEffect, useState, useRef } from "react";

import { T, TT } from "../../utils/i18n";
import { useAudioPlayer } from "../../utils/hooks";
import { scan } from "../../utils/qrcode";
import { isUrl, sleep } from "../../utils/misc";
import { addHistory } from "../../utils/history";
import QRPositionMarker from "./QRPositionMarker";
import PermissionPrompt from "./PermissionPrompt";

export default function CameraScanner() {
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
  const canvasContext = useRef(null);

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
    if (!canvasContext.current) {
      // Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true
      // This will affect all subsequent operations on the same canvas
      canvasContext.current = canvas.getContext("2d", {
        willReadFrequently: true,
      });
    }
    canvasContext.current.drawImage(video, 0, 0, canvas.width, canvas.height);
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
            hidden={!result}
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

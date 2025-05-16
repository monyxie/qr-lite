import { getSettingValue } from "./settings";
import successAudio from "../audio/success.mp3";

/**
 * Determine if the scanned QR code content is URL
 * @param {string} content
 * @returns boolean
 */
export function isQrCodeContentLink(content) {
  return /^(https?:\/\/|ftp:\/\/|mailto:)/i.test(content);
}

export async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// https://stackoverflow.com/questions/12168909/blob-from-dataurl
export async function convertDataUriToBlob(dataURI) {
  // requires csp: connect-src data:
  return await (await fetch(dataURI)).blob();
}

export async function convertBlobToDataUri(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener(
      "load",
      () => {
        resolve(reader.result);
      },
      false
    );
    reader.readAsDataURL(blob);
  });
}

/**
 * @param dataURI {string}
 * @param crop {{x,y,width,height}}
 * @return {Promise<OffscreenCanvas>}
 */
export async function createCanvasFromDataUri(dataURI, crop) {
  // https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas#browser_compatibility
  const params = crop ? [crop.x, crop.y, crop.width, crop.height] : [];
  const bitmap = await createImageBitmap(
    await convertDataUriToBlob(dataURI),
    ...params
  );
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0);
  return canvas;
}

export function randomStr(len) {
  let str = "";
  const a = "a".charCodeAt(0);
  const z = "z".charCodeAt(0);
  for (let i = 0; i < len; i++) {
    str += String.fromCharCode(a + Math.floor(Math.random() * (z - a + 1)));
  }
  return str;
}

export function debouncer(delay) {
  let timer;
  const debounce = (callback) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      callback();
      timer = null;
    }, delay);
  };
  const cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return { debounce, cancel };
}

export async function playScanSuccessAudio() {
  if (await getSettingValue("scanSuccessSoundEnabled")) {
    return new Promise((resolve) => {
      const audio = new Audio(successAudio);
      audio.addEventListener(
        "canplay",
        () => {
          audio.play();
        },
        { once: true }
      );
      audio.addEventListener(
        "ended",
        () => {
          resolve(true);
        },
        { once: true }
      );
    });
  }
  return false;
}

export class FpsCounter {
  constructor() {
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fpsValue = 0;
  }

  tick() {
    const now = performance.now();
    const delta = now - this.lastFrameTime;

    if (delta > 1000) {
      this.fpsValue = Math.round((this.frameCount / delta) * 10000) / 10;
      this.frameCount = 0;
      this.lastFrameTime = now;
    } else {
      this.frameCount++;
    }
  }

  fps() {
    return this.fpsValue;
  }

  reset() {
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fpsValue = 0;
  }
}

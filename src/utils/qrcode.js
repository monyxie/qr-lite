export class QrCodeInfo {
  /**
   * @param content {string}
   * @param vertices {Array<[number,number]>}
   */
  constructor(content, vertices) {
    this.content = content;
    this.vertices = vertices;
  }
}

export class OpenCvQrCodeDecoder {
  /**
   */
  constructor(cv) {
    this.ready = this.init(cv);
  }

  /**
   * @param cv
   * @returns {Promise<void>}
   */
  async init(cv) {
    if (cv instanceof Promise) {
      cv = await cv;
      // console.log(cv.getBuildInformation())
    } else {
      cv.onRuntimeInitialized = () => {
        // console.log(cv.getBuildInformation())
      };
    }

    this.cv = cv;

    const files = [
      "detect.prototxt",
      "detect.caffemodel",
      "sr.prototxt",
      "sr.caffemodel",
    ];

    await Promise.all(
      files.map(async (file) => {
        const response = await fetch("/opencv/models/" + file);
        const content = await this.res2ArrayBuffer(response);
        this.cv.FS_createDataFile("/", file, content, true, false, false);
      })
    );

    try {
      this.qrcode_detector = new this.cv.wechat_qrcode_WeChatQRCode(
        ...files.map((a) => "/" + a)
      );
      this.fast_qrcode_detector = new this.cv.wechat_qrcode_WeChatQRCode(
        "",
        "",
        "",
        ""
      );
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * @param imageData canvas element/canvas Id/image element/ImageData
   * @param fast bool
   * @return {QrCodeInfo[]}
   */
  decode(imageData, fast = false) {
    if (!this.cv) return [];
    const detector = fast ? this.fast_qrcode_detector : this.qrcode_detector;
    let qrImage,
      qrVec,
      qrRes,
      qrSize,
      results = [];

    try {
      qrImage =
        imageData instanceof ImageData
          ? this.cv.matFromImageData(imageData)
          : this.cv.imread(imageData);
      qrVec = new this.cv.MatVector();
      qrRes = detector.detectAndDecode(qrImage, qrVec);
      qrSize = qrRes.size();
      results = [];

      for (let i = 0; i < qrSize; i++) {
        const content = qrRes.get(i);
        const points = qrVec.get(i);
        const vertices = [];
        const size = points.size();
        for (let j = 0; j < size.height; j += 1) {
          vertices.push([points.floatAt(j * 2), points.floatAt(j * 2 + 1)]);
        }
        results.push(new QrCodeInfo(content, vertices));
        points.delete();
      }
    } finally {
      // if (qrImage) qrImage.delete();
      if (qrVec) qrVec.delete();
      if (qrRes) qrRes.delete();
      if (qrImage) qrImage.delete();
    }

    return results;
  }

  async res2ArrayBuffer(response) {
    const data = await response.arrayBuffer();
    return new Uint8Array(data);
  }
}

/**
 * @type {OpenCvQrCodeDecoder|null}
 */
let decoder;

export function initDecoder() {
  if (typeof importScripts === "function") {
    // dynamic imports don't work in web workers, we have to use importScripts to load opencv
    // in chrome, this has to be at the top level of background.js
    // eslint-disable-next-line no-undef
    importScripts("opencv.js"); // must be the same name as specified by the `webpackChunkName` magic comment below
  }

  const cv = import(/* webpackChunkName: "opencv.js" */ "../opencv/opencv");
  decoder = new OpenCvQrCodeDecoder(cv);
}

/**
 * @param imageData canvas element/canvas Id/image element/ImageData
 * @param fast bool
 * @return {Promise<QrCodeInfo[]>}
 */
export async function scan(imageData, fast) {
  if (!decoder) {
    initDecoder();
  }
  await decoder.ready;
  return decoder.decode(imageData, fast);
}

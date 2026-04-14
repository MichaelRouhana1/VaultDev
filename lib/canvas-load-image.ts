/**
 * Decode an image for canvas readback (`drawImage` / `getImageData`).
 * Do not set `crossOrigin` on `blob:` / `data:` URLs — browsers often fail to load local JPEG/PNG
 * previews when `crossOrigin="anonymous"` is applied to a blob URL.
 */
export function loadImageForCanvas(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    if (src.startsWith("blob:") || src.startsWith("data:")) {
      // same-origin blob; omit crossOrigin
    } else if (/^https?:\/\//i.test(src)) {
      img.crossOrigin = "anonymous";
    }
    img.src = src;
  });
}

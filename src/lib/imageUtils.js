// Compress images to fit Firestore's ~1MB string field limit (no Storage needed).

const FIRESTORE_FIELD_LIMIT = 1_048_487;
const SAFE_MAX_CHARS = 900_000;

function compressToBlob(file, maxDim, quality) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const ratio = Math.min(maxDim / width, maxDim / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

/** Returns a base64 data URL small enough for a Firestore string field. */
export async function fileToFirestorePhoto(file) {
  let maxDim = 640;
  let quality = 0.72;

  while (maxDim >= 240) {
    const blob = await compressToBlob(file, maxDim, quality);
    const dataUrl = await blobToDataUrl(blob);
    if (dataUrl.length <= SAFE_MAX_CHARS) return dataUrl;

    maxDim -= 80;
    quality = Math.max(0.45, quality - 0.08);
  }

  throw new Error(
    "Photo is still too large. Try a smaller image or take a new photo closer up."
  );
}

export { FIRESTORE_FIELD_LIMIT, SAFE_MAX_CHARS };

const width = 32;
const height = 32;
const bitmapHeaderSize = 40;
const pixelBytes = width * height * 4;
const maskBytes = Math.ceil(width / 32) * 4 * height;
const imageBytes = bitmapHeaderSize + pixelBytes + maskBytes;
const imageOffset = 22;

function isInsideCircle(x: number, y: number, cx: number, cy: number, radius: number) {
  return ((x - cx) ** 2) + ((y - cy) ** 2) <= radius ** 2;
}

function createFavicon() {
  const bytes = new Uint8Array(imageOffset + imageBytes);
  const view = new DataView(bytes.buffer);

  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);
  bytes[6] = width;
  bytes[7] = height;
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, imageBytes, true);
  view.setUint32(18, imageOffset, true);

  view.setUint32(imageOffset, bitmapHeaderSize, true);
  view.setInt32(imageOffset + 4, width, true);
  view.setInt32(imageOffset + 8, height * 2, true);
  view.setUint16(imageOffset + 12, 1, true);
  view.setUint16(imageOffset + 14, 32, true);
  view.setUint32(imageOffset + 20, pixelBytes, true);

  const pixelOffset = imageOffset + bitmapHeaderSize;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const roundedCorner = Math.hypot(Math.max(7 - x, 0, x - 24), Math.max(7 - y, 0, y - 24)) <= 7;
      const paw = isInsideCircle(x, y, 10, 10, 3)
        || isInsideCircle(x, y, 22, 10, 3)
        || isInsideCircle(x, y, 7, 17, 2.5)
        || isInsideCircle(x, y, 25, 17, 2.5)
        || (((x - 16) / 9) ** 2) + (((y - 22) / 7) ** 2) <= 1;
      const row = height - 1 - y;
      const offset = pixelOffset + ((row * width + x) * 4);
      bytes[offset] = paw ? 255 : 131;
      bytes[offset + 1] = paw ? 255 : 127;
      bytes[offset + 2] = paw ? 255 : 8;
      bytes[offset + 3] = roundedCorner ? 255 : 0;
    }
  }

  return bytes;
}

const favicon = createFavicon();

export function GET() {
  return new Response(favicon, {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "Content-Type": "image/vnd.microsoft.icon",
    },
  });
}

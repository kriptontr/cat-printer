/**
 * @module Utils
 */

/**
 * Calculates the CRC8 checksum of a byte array.
 * @param data The byte array to calculate the CRC8 for.
 * @returns The CRC8 checksum value.
 */
export function crc8(data: Uint8Array): number {
  let crc = 0;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x80) {
        crc = (crc << 1) ^ 0x07;
      } else {
        crc <<= 1;
      }
    }
    crc &= 0xff;
  }
  return crc;
}

/**
 * Converts RGBA pixel data to a bit array (1 for black, 0 for white).
 * @param rgba The Uint32Array containing RGBA pixel data.
 * @param threshold The brightness threshold (0-255) to consider a pixel black. Default is 128.
 * @returns A Uint8Array representing the bitmap data.
 */
export function rgbaToBits(
  rgba: Uint32Array,
  threshold: number = 128
): Uint8Array {
  const bytes = new Uint8Array(Math.ceil(rgba.length / 8));
  for (let i = 0; i < rgba.length; i++) {
    const byteIndex = Math.floor(i / 8);
    const bitPosition = i % 8; // Standard bit order (LSB first)
    const pixel = rgba[i];
    const r = pixel & 0xff;
    const g = (pixel >> 8) & 0xff;
    const b = (pixel >> 16) & 0xff;
    const brightness = (r + g + b) / 3;
    // Pixel is considered black if brightness is below the threshold
    if (brightness < threshold) {
      bytes[byteIndex] |= 1 << bitPosition;
    }
  }
  return bytes;
}

/**
 * Encodes an integer as little-endian bytes.
 * @param value The integer to encode. Values outside the range are clamped.
 * @param length The number of bytes to produce. Default is 1.
 * @returns The encoded bytes.
 */
export function intToBytes(value: number, length: number = 1): Uint8Array {
  const max = 2 ** (8 * length) - 1;
  let v = Math.max(0, Math.min(max, Math.round(value)));
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = v & 0xff;
    v = Math.floor(v / 256);
  }
  return bytes;
}

/**
 * Waits for the given number of milliseconds.
 * @param ms The delay in milliseconds.
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Pixel dimensions from a PNG or baseline/progressive JPEG header. */
export function imageSize(file: Buffer): { width: number; height: number } {
  if (file.subarray(0, 8).toString('hex') === '89504e470d0a1a0a')
    return { width: file.readUInt32BE(16), height: file.readUInt32BE(20) };
  if (file[0] !== 0xff || file[1] !== 0xd8) throw new Error('Not a PNG or JPEG file');
  let offset = 2;
  while (offset + 9 < file.length) {
    if (file[offset] !== 0xff) throw new Error('Malformed JPEG marker');
    const marker = file[offset + 1];
    // SOF0–SOF15 carry the frame size; C4 (DHT), C8 (JPG) and CC (DAC) do not.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
      return { height: file.readUInt16BE(offset + 5), width: file.readUInt16BE(offset + 7) };
    offset += 2 + file.readUInt16BE(offset + 2);
  }
  throw new Error('JPEG frame size not found');
}

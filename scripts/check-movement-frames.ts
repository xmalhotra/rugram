import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { isMovementCanvas, movementMediaSpec } from '../shared/movement-media';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: npm run media:check-movement-frames -- frame1.png frame2.png ...');
  process.exitCode = 1;
}
for (const file of files) {
  try {
    const png = readFileSync(file);
    if (
      png.length < 24 ||
      png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
      png.subarray(12, 16).toString() !== 'IHDR'
    )
      throw new Error('PNG header with IHDR dimensions required.');
    const width = png.readUInt32BE(16),
      height = png.readUInt32BE(20);
    if (
      !isMovementCanvas(width, height) ||
      width !== movementMediaSpec.targetWidth ||
      height !== movementMediaSpec.targetHeight
    )
      throw new Error(`Found ${width} × ${height}; expected 1024 × 1024 (1:1).`);
    console.log(`${basename(file)}: dimensions pass (1024 × 1024).`);
  } catch (error) {
    console.error(
      `${basename(file)}: ${error instanceof Error ? error.message : 'Dimension check failed.'}`,
    );
    process.exitCode = 1;
  }
}

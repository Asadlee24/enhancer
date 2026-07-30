import test from 'node:test';
import assert from 'node:assert';
import { walkAtoms, findAtomsByType, inspectMP4, patchMP4 } from '../src/index.js';

function createSyntheticMP4Buffer(width: number, height: number): Buffer {
  // ftyp atom (16 bytes)
  const ftyp = Buffer.from([
    0x00, 0x00, 0x00, 0x10, // size 16
    0x66, 0x74, 0x79, 0x70, // 'ftyp'
    0x69, 0x73, 0x6f, 0x6d, // 'isom'
    0x00, 0x00, 0x02, 0x00  // minor version
  ]);

  // tkhd atom version 0 (92 bytes)
  const tkhdSize = 92;
  const tkhd = Buffer.alloc(tkhdSize);
  tkhd.writeUInt32BE(tkhdSize, 0);
  tkhd.write('tkhd', 4, 'ascii');
  tkhd.writeUInt8(0, 8); // version 0

  // Write matrix at offset 8 + 4 + 32 = 44
  const identityMatrix = Buffer.from([
    0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00
  ]);
  identityMatrix.copy(tkhd, 44);

  // Write width (offset 44 + 36 = 80) and height (offset 84)
  tkhd.writeUInt32BE(width * 65536, 80);
  tkhd.writeUInt32BE(height * 65536, 84);

  // trak atom wrapping tkhd (8 + 92 = 100 bytes)
  const trakSize = 8 + tkhdSize;
  const trak = Buffer.alloc(trakSize);
  trak.writeUInt32BE(trakSize, 0);
  trak.write('trak', 4, 'ascii');
  tkhd.copy(trak, 8);

  // moov atom wrapping trak (8 + 100 = 108 bytes)
  const moovSize = 8 + trakSize;
  const moov = Buffer.alloc(moovSize);
  moov.writeUInt32BE(moovSize, 0);
  moov.write('moov', 4, 'ascii');
  trak.copy(moov, 8);

  return Buffer.concat([ftyp, moov]);
}

test('walkAtoms parses ftyp and moov container trees', () => {
  const buf = createSyntheticMP4Buffer(1920, 1080);
  const atoms = walkAtoms(buf);

  assert.strictEqual(atoms.length, 2);
  assert.strictEqual(atoms[0].type, 'ftyp');
  assert.strictEqual(atoms[1].type, 'moov');
  assert.ok(atoms[1].children);
  assert.strictEqual(atoms[1].children[0].type, 'trak');
});

test('inspectMP4 extracts correct video track width and height', () => {
  const buf = createSyntheticMP4Buffer(1280, 720);
  const info = inspectMP4(buf);

  assert.strictEqual(info.hasMoov, true);
  assert.strictEqual(info.tracksCount, 1);
  assert.strictEqual(info.videoWidth, 1280);
  assert.strictEqual(info.videoHeight, 720);
});

test('patchMP4 updates track width and height in binary buffer', () => {
  const buf = createSyntheticMP4Buffer(1280, 720);
  const result = patchMP4(buf, { targetWidth: 1920, targetHeight: 1080 });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.modified, true);
  assert.strictEqual(result.info.videoWidth, 1920);
  assert.strictEqual(result.info.videoHeight, 1080);
});

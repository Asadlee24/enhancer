import { walkAtoms, findAtomsByType, MP4Atom } from './atom-walker.js';

export interface VideoMetadataInfo {
  hasMoov: boolean;
  tracksCount: number;
  videoWidth?: number;
  videoHeight?: number;
  matrixHex?: string;
  isPatched: boolean;
}

export interface PatchOptions {
  targetWidth?: number;
  targetHeight?: number;
  normalizeMatrix?: boolean;
}

export interface PatchResult {
  success: boolean;
  modified: boolean;
  warnings: string[];
  info: VideoMetadataInfo;
}

/**
 * Inspects MP4 atom headers and returns dimensions and track info.
 */
export function inspectMP4(buffer: Buffer): VideoMetadataInfo {
  const atoms = walkAtoms(buffer);
  const moovAtoms = findAtomsByType(atoms, 'moov');

  if (moovAtoms.length === 0) {
    return {
      hasMoov: false,
      tracksCount: 0,
      isPatched: false
    };
  }

  const trakAtoms = findAtomsByType(moovAtoms, 'trak');
  const tkhdAtoms = findAtomsByType(moovAtoms, 'tkhd');

  let videoWidth: number | undefined;
  let videoHeight: number | undefined;

  for (const tkhd of tkhdAtoms) {
    const parsed = parseTkhd(buffer, tkhd);
    if (parsed && parsed.width > 0 && parsed.height > 0) {
      videoWidth = parsed.width;
      videoHeight = parsed.height;
      break;
    }
  }

  return {
    hasMoov: true,
    tracksCount: trakAtoms.length,
    videoWidth,
    videoHeight,
    isPatched: false
  };
}

interface ParsedTkhd {
  version: number;
  matrixOffset: number;
  widthOffset: number;
  heightOffset: number;
  width: number;
  height: number;
}

function parseTkhd(buffer: Buffer, tkhd: MP4Atom): ParsedTkhd | null {
  const start = tkhd.start + tkhd.headerSize;
  if (start + 4 > buffer.length) return null;

  const version = buffer.readUInt8(start);

  let matrixOffset: number;
  let widthOffset: number;

  if (version === 0) {
    matrixOffset = start + 4 + 32;
    widthOffset = start + 4 + 32 + 36;
  } else if (version === 1) {
    matrixOffset = start + 4 + 48;
    widthOffset = start + 4 + 48 + 36;
  } else {
    return null;
  }

  const heightOffset = widthOffset + 4;

  if (heightOffset + 4 > tkhd.end || heightOffset + 4 > buffer.length) {
    return null;
  }

  const rawWidth = buffer.readUInt32BE(widthOffset);
  const rawHeight = buffer.readUInt32BE(heightOffset);

  const width = Math.round(rawWidth / 65536);
  const height = Math.round(rawHeight / 65536);

  return {
    version,
    matrixOffset,
    widthOffset,
    heightOffset,
    width,
    height
  };
}

/**
 * Binary patches MP4 atom headers (tkhd width/height & matrix) in-place in buffer.
 */
export function patchMP4(buffer: Buffer, options: PatchOptions = {}): PatchResult {
  const warnings: string[] = [];
  const atoms = walkAtoms(buffer);
  const moovAtoms = findAtomsByType(atoms, 'moov');

  if (moovAtoms.length === 0) {
    return {
      success: false,
      modified: false,
      warnings: ['No moov atom found in MP4 buffer. File may be streaming/fragmented or invalid.'],
      info: { hasMoov: false, tracksCount: 0, isPatched: false }
    };
  }

  const tkhdAtoms = findAtomsByType(moovAtoms, 'tkhd');
  let modified = false;

  for (const tkhd of tkhdAtoms) {
    const parsed = parseTkhd(buffer, tkhd);
    if (!parsed) continue;

    // Standard identity matrix: [1, 0, 0, 0, 1, 0, 0, 0, 16384]
    if (options.normalizeMatrix) {
      const identityMatrix = Buffer.from([
        0x00, 0x01, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,  0x00, 0x01, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,  0x00, 0x00, 0x00, 0x00,  0x40, 0x00, 0x00, 0x00
      ]);
      buffer.copy(identityMatrix, 0, 0, 36);
      identityMatrix.copy(buffer, parsed.matrixOffset);
      modified = true;
    }

    if (options.targetWidth && options.targetWidth > 0) {
      const fixedWidth = Math.round(options.targetWidth * 65536);
      buffer.writeUInt32BE(fixedWidth, parsed.widthOffset);
      modified = true;
    }

    if (options.targetHeight && options.targetHeight > 0) {
      const fixedHeight = Math.round(options.targetHeight * 65536);
      buffer.writeUInt32BE(fixedHeight, parsed.heightOffset);
      modified = true;
    }
  }

  const updatedInfo = inspectMP4(buffer);
  updatedInfo.isPatched = modified;

  return {
    success: true,
    modified,
    warnings,
    info: updatedInfo
  };
}

export interface MP4Atom {
  type: string;
  start: number;
  headerSize: number;
  size: bigint;
  end: number;
  children?: MP4Atom[];
}

const CONTAINER_ATOMS = new Set([
  'moov',
  'trak',
  'mdia',
  'minf',
  'stbl',
  'edts',
  'udta'
]);

/**
 * Parses top-level and container MP4 atoms from a Buffer.
 */
export function walkAtoms(buffer: Buffer, start: number = 0, end: number = buffer.length): MP4Atom[] {
  const atoms: MP4Atom[] = [];
  let offset = start;

  while (offset + 8 <= end) {
    const rawSize = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);

    let headerSize = 8;
    let size = BigInt(rawSize);

    if (rawSize === 1) {
      if (offset + 16 > end) break;
      size = buffer.readBigUInt64BE(offset + 8);
      headerSize = 16;
    } else if (rawSize === 0) {
      size = BigInt(end - offset);
    }

    if (size < BigInt(headerSize)) {
      break; // Corrupt atom
    }

    const atomEnd = offset + Number(size);
    if (atomEnd > end) {
      // Truncated or extended atom
      atoms.push({
        type,
        start: offset,
        headerSize,
        size,
        end: end
      });
      break;
    }

    const atom: MP4Atom = {
      type,
      start: offset,
      headerSize,
      size,
      end: atomEnd
    };

    if (CONTAINER_ATOMS.has(type) && offset + headerSize < atomEnd) {
      atom.children = walkAtoms(buffer, offset + headerSize, atomEnd);
    }

    atoms.push(atom);
    offset = atomEnd;
  }

  return atoms;
}

/**
 * Helper to find all atoms of a given type in a tree.
 */
export function findAtomsByType(atoms: MP4Atom[], targetType: string): MP4Atom[] {
  const results: MP4Atom[] = [];

  for (const atom of atoms) {
    if (atom.type === targetType) {
      results.push(atom);
    }
    if (atom.children) {
      results.push(...findAtomsByType(atom.children, targetType));
    }
  }

  return results;
}

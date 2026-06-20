export const GLB_MAGIC = 0x46546c67;
export const GLB_VERSION = 2;
export const CHUNK_TYPE_JSON = 0x4e4f534a;
export const CHUNK_TYPE_BIN = 0x004e4942;

function pad4(length) {
  return (4 - (length % 4)) % 4;
}

function encodeUtf8(text) {
  const bytes = [];
  for (let index = 0; index < text.length; index += 1) {
    let codePoint = text.charCodeAt(index);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && index + 1 < text.length) {
      const next = text.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00);
        index += 1;
      }
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
}

function writeUint32(bytes, offset, value) {
  new DataView(bytes.buffer).setUint32(offset, value >>> 0, true);
}

function buildChunk(type, data, padByte) {
  const raw = data instanceof Uint8Array ? data : new Uint8Array(data);
  const paddedLength = raw.byteLength + pad4(raw.byteLength);
  const bytes = new Uint8Array(8 + paddedLength);
  writeUint32(bytes, 0, paddedLength);
  writeUint32(bytes, 4, type);
  bytes.set(raw, 8);
  bytes.fill(padByte, 8 + raw.byteLength);
  return bytes;
}

export function createGlbFromJsonText(jsonText, bin = new Uint8Array(), options = {}) {
  const chunks = [
    buildChunk(CHUNK_TYPE_JSON, encodeUtf8(jsonText), 0x20),
    ...((bin && bin.byteLength > 0) || options.includeEmptyBin
      ? [buildChunk(CHUNK_TYPE_BIN, bin || new Uint8Array(), 0x00)]
      : []),
    ...(options.extraChunks || []),
  ];

  const totalLength = 12 + chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const bytes = new Uint8Array(totalLength);
  writeUint32(bytes, 0, options.magic ?? GLB_MAGIC);
  writeUint32(bytes, 4, options.version ?? GLB_VERSION);
  writeUint32(bytes, 8, options.declaredLength ?? totalLength);

  let offset = 12;
  chunks.forEach((chunk) => {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  });

  if (options.truncateTo !== undefined) {
    return bytes.subarray(0, options.truncateTo);
  }

  return bytes;
}

export function createGlb(json, bin = new Uint8Array(), options = {}) {
  return createGlbFromJsonText(JSON.stringify(json), bin, options);
}

export function createChunk(type, data, padByte = 0) {
  return buildChunk(type, data, padByte);
}

export function createMinimalTriangleGlb(overrides = {}) {
  const bin = new Uint8Array(36);
  const json = {
    asset: { version: "2.0" },
    buffers: [{ byteLength: bin.byteLength }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: bin.byteLength }],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [0, 0, 0],
        max: [1, 1, 0],
      },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, mode: 4 }] }],
    nodes: [{ mesh: 0, translation: [0, 0, 0] }],
    scenes: [{ nodes: [0] }],
    scene: 0,
    ...overrides,
  };
  return createGlb(json, bin);
}

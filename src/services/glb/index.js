const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const CHUNK_TYPE_JSON = 0x4e4f534a;
const CHUNK_TYPE_BIN = 0x004e4942;

const COMPONENT_BYTE_SIZE = Object.freeze({
  5120: 1,
  5121: 1,
  5122: 2,
  5123: 2,
  5125: 4,
  5126: 4,
});

const ACCESSOR_COMPONENTS = Object.freeze({
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
});

export const DEFAULT_GLB_LIMITS = Object.freeze({
  maxBytes: 50 * 1024 * 1024,
  maxJsonBytes: 5 * 1024 * 1024,
  maxBinBytes: 50 * 1024 * 1024,
  maxChunks: 16,
  maxIssues: 100,
  maxBuffers: 8,
  maxBufferViews: 4096,
  maxAccessors: 4096,
  maxImages: 1024,
  maxNodes: 8192,
  maxScenes: 128,
  maxMeshes: 4096,
  maxMaterials: 4096,
  maxTextures: 4096,
  maxCameras: 1024,
  maxSkins: 1024,
  maxAnimations: 1024,
  maxAccessorCount: 10_000_000,
  maxTriangles: 5_000_000,
});

function normalizeLimits(limits = {}) {
  const normalized = { ...DEFAULT_GLB_LIMITS };
  Object.keys(DEFAULT_GLB_LIMITS).forEach((key) => {
    const value = limits[key];
    if (Number.isSafeInteger(value) && value >= 0) {
      normalized[key] = value;
    }
  });
  normalized.maxIssues = Math.max(1, normalized.maxIssues);
  return normalized;
}

function createIssueCollector(maxIssues) {
  const issues = [];
  let truncated = false;

  function add(severity, code, message, details = {}) {
    if (issues.length < maxIssues) {
      issues.push(normalizeIssue(severity, code, message, details));
      return;
    }

    if (!truncated) {
      truncated = true;
      issues[maxIssues - 1] = normalizeIssue(
        "warning",
        "issue_limit_reached",
        `Issue count reached the configured cap of ${maxIssues}.`,
        { path: "$" }
      );
    }
  }

  return {
    issues,
    error: (code, message, details) => add("error", code, message, details),
    warning: (code, message, details) => add("warning", code, message, details),
  };
}

function normalizeIssue(severity, code, message, details = {}) {
  const issue = {
    severity,
    code,
    message,
    path: details.path || "$",
  };

  if (Number.isSafeInteger(details.offset)) issue.offset = details.offset;
  if (Number.isSafeInteger(details.length)) issue.length = details.length;
  if (details.value !== undefined) issue.value = details.value;
  if (details.limit !== undefined) issue.limit = details.limit;
  if (details.actual !== undefined) issue.actual = details.actual;
  if (details.target !== undefined) issue.target = details.target;

  return issue;
}

function toByteView(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  return null;
}

function readUint32(view, offset) {
  return new DataView(view.buffer, view.byteOffset + offset, 4).getUint32(0, true);
}

function chunkTypeName(type) {
  if (type === CHUNK_TYPE_JSON) return "JSON";
  if (type === CHUNK_TYPE_BIN) return "BIN";
  return `0x${type.toString(16).padStart(8, "0")}`;
}

function isArray(value) {
  return Array.isArray(value);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function hasArrayLength(array, length) {
  return Array.isArray(array) && array.length === length;
}

function limitArray(name, array, limit, path, issues) {
  if (array === undefined) return [];
  if (!Array.isArray(array)) {
    issues.error("invalid_type", `${name} must be an array.`, { path });
    return [];
  }
  if (array.length > limit) {
    issues.error("limit_exceeded", `${name} exceeds the configured limit.`, {
      path,
      actual: array.length,
      limit,
    });
  }
  return array;
}

function validateIndex(index, array, path, label, issues) {
  if (!isNonNegativeInteger(index)) {
    issues.error("invalid_reference", `${label} must be a non-negative integer index.`, {
      path,
      value: index,
    });
    return false;
  }
  if (index >= array.length) {
    issues.error("invalid_reference", `${label} references a missing item.`, {
      path,
      value: index,
      target: array.length,
    });
    return false;
  }
  return true;
}

function validateFiniteNumberArray(value, expectedLength, path, label, issues) {
  if (!hasArrayLength(value, expectedLength)) {
    issues.error("invalid_transform", `${label} must contain ${expectedLength} finite numbers.`, {
      path,
    });
    return;
  }

  value.forEach((entry, index) => {
    if (!isFiniteNumber(entry)) {
      issues.error("non_finite_transform", `${label} contains a non-finite value.`, {
        path: `${path}[${index}]`,
        value: entry,
      });
    }
  });
}

function validateOptionalFiniteArray(value, expectedLength, path, label, issues) {
  if (value !== undefined) {
    validateFiniteNumberArray(value, expectedLength, path, label, issues);
  }
}

function isRejectedUri(uri) {
  if (typeof uri !== "string") return null;
  if (/^\s*data:/i.test(uri)) return "data_uri";
  return "external_uri";
}

function decodeUtf8(bytes) {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  }

  let result = "";
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];
    if (byte <= 0x7f) {
      result += String.fromCharCode(byte);
    } else if (byte >= 0xc2 && byte <= 0xdf) {
      const next = bytes[index + 1];
      if ((next & 0xc0) !== 0x80) throw new Error("Invalid UTF-8");
      result += String.fromCharCode(((byte & 0x1f) << 6) | (next & 0x3f));
      index += 1;
    } else if (byte >= 0xe0 && byte <= 0xef) {
      const next = bytes[index + 1];
      const third = bytes[index + 2];
      if ((next & 0xc0) !== 0x80 || (third & 0xc0) !== 0x80) throw new Error("Invalid UTF-8");
      result += String.fromCharCode(((byte & 0x0f) << 12) | ((next & 0x3f) << 6) | (third & 0x3f));
      index += 2;
    } else if (byte >= 0xf0 && byte <= 0xf4) {
      const next = bytes[index + 1];
      const third = bytes[index + 2];
      const fourth = bytes[index + 3];
      if ((next & 0xc0) !== 0x80 || (third & 0xc0) !== 0x80 || (fourth & 0xc0) !== 0x80) {
        throw new Error("Invalid UTF-8");
      }
      let codePoint = ((byte & 0x07) << 18) | ((next & 0x3f) << 12) | ((third & 0x3f) << 6) | (fourth & 0x3f);
      codePoint -= 0x10000;
      result += String.fromCharCode(0xd800 + (codePoint >> 10), 0xdc00 + (codePoint & 0x3ff));
      index += 3;
    } else {
      throw new Error("Invalid UTF-8");
    }
  }
  return result;
}

function decodeJsonChunk(chunk, limits, issues) {
  if (!chunk) {
    issues.error("missing_json_chunk", "GLB must include a JSON chunk.", { path: "$.chunks" });
    return null;
  }

  if (chunk.length > limits.maxJsonBytes) {
    issues.error("limit_exceeded", "JSON chunk exceeds the configured byte limit.", {
      path: "$.chunks[0]",
      actual: chunk.length,
      limit: limits.maxJsonBytes,
    });
    return null;
  }

  try {
    const text = decodeUtf8(chunk.data).replace(/[\u0000\s]+$/g, "");
    const parsed = JSON.parse(text);
    if (!isPlainObject(parsed)) {
      issues.error("invalid_json_root", "glTF JSON root must be an object.", { path: "$" });
      return null;
    }
    return parsed;
  } catch (error) {
    issues.error("invalid_json", "GLB JSON chunk could not be parsed.", {
      path: "$.chunks[0]",
      offset: chunk.offset,
    });
    return null;
  }
}

export function parseGlb(input, options = {}) {
  const limits = normalizeLimits(options);
  const issues = createIssueCollector(limits.maxIssues);
  const bytes = toByteView(input);
  const chunks = [];
  const result = {
    ok: false,
    header: null,
    chunks,
    json: null,
    binChunk: null,
    issues: issues.issues,
    limits,
  };

  if (!bytes) {
    issues.error("invalid_input", "Input must be an ArrayBuffer or typed array.", { path: "$" });
    return result;
  }

  if (bytes.byteLength > limits.maxBytes) {
    issues.error("limit_exceeded", "GLB byte length exceeds the configured limit.", {
      path: "$",
      actual: bytes.byteLength,
      limit: limits.maxBytes,
    });
  }

  if (bytes.byteLength < 12) {
    issues.error("truncated_header", "GLB header requires at least 12 bytes.", {
      path: "$",
      actual: bytes.byteLength,
      limit: 12,
    });
    return result;
  }

  const magic = readUint32(bytes, 0);
  const version = readUint32(bytes, 4);
  const declaredLength = readUint32(bytes, 8);
  const header = { magic, version, declaredLength, byteLength: bytes.byteLength };
  result.header = header;

  if (magic !== GLB_MAGIC) {
    issues.error("invalid_magic", "GLB magic must be ASCII glTF.", {
      path: "$.header.magic",
      value: magic,
    });
  }

  if (version !== GLB_VERSION) {
    issues.error("unsupported_version", "Only GLB version 2 is supported.", {
      path: "$.header.version",
      value: version,
    });
  }

  if (declaredLength !== bytes.byteLength) {
    issues.error("declared_length_mismatch", "GLB declared length must match the actual byte length.", {
      path: "$.header.length",
      value: declaredLength,
      actual: bytes.byteLength,
    });
  }

  if (declaredLength < 12) {
    issues.error("invalid_declared_length", "GLB declared length must include the 12-byte header.", {
      path: "$.header.length",
      value: declaredLength,
    });
  }

  const parseEnd = declaredLength >= 12 ? Math.min(declaredLength, bytes.byteLength) : bytes.byteLength;
  let offset = 12;
  let jsonChunk = null;
  let binChunk = null;

  while (offset < parseEnd) {
    if (chunks.length >= limits.maxChunks) {
      issues.error("limit_exceeded", "GLB chunk count exceeds the configured limit.", {
        path: "$.chunks",
        actual: chunks.length + 1,
        limit: limits.maxChunks,
      });
      break;
    }

    if (offset + 8 > parseEnd) {
      issues.error("truncated_chunk_header", "GLB chunk header exceeds declared file bounds.", {
        path: `$.chunks[${chunks.length}]`,
        offset,
      });
      break;
    }

    const length = readUint32(bytes, offset);
    const type = readUint32(bytes, offset + 4);
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + length;

    if (length % 4 !== 0) {
      issues.error("misaligned_chunk", "GLB chunk length must be 4-byte aligned.", {
        path: `$.chunks[${chunks.length}].length`,
        offset,
        value: length,
      });
    }

    if (dataEnd > parseEnd || dataEnd < dataOffset) {
      issues.error("chunk_out_of_bounds", "GLB chunk exceeds declared file bounds.", {
        path: `$.chunks[${chunks.length}]`,
        offset,
        length,
      });
      break;
    }

    const chunk = {
      index: chunks.length,
      type,
      typeName: chunkTypeName(type),
      length,
      offset: dataOffset,
      data: bytes.subarray(dataOffset, dataEnd),
    };
    chunks.push(chunk);

    if (type === CHUNK_TYPE_JSON) {
      if (jsonChunk) {
        issues.error("duplicate_json_chunk", "GLB must not contain more than one JSON chunk.", {
          path: `$.chunks[${chunk.index}]`,
        });
      } else {
        jsonChunk = chunk;
      }
    } else if (type === CHUNK_TYPE_BIN) {
      if (binChunk) {
        issues.error("duplicate_bin_chunk", "GLB must not contain more than one BIN chunk.", {
          path: `$.chunks[${chunk.index}]`,
        });
      } else {
        binChunk = chunk;
      }
    } else {
      issues.warning("unknown_chunk_type", "GLB contains an unknown chunk type.", {
        path: `$.chunks[${chunk.index}].type`,
        value: type,
      });
    }

    offset = dataEnd;
  }

  if (chunks[0] && chunks[0].type !== CHUNK_TYPE_JSON) {
    issues.error("invalid_chunk_order", "The first GLB chunk must be the JSON chunk.", {
      path: "$.chunks[0].type",
      value: chunks[0].type,
    });
  }

  if (binChunk && binChunk.length > limits.maxBinBytes) {
    issues.error("limit_exceeded", "BIN chunk exceeds the configured byte limit.", {
      path: `$.chunks[${binChunk.index}]`,
      actual: binChunk.length,
      limit: limits.maxBinBytes,
    });
  }

  result.json = decodeJsonChunk(jsonChunk, limits, issues);
  result.binChunk = binChunk;
  result.ok = !issues.issues.some((issue) => issue.severity === "error");
  return result;
}

function accessorByteLength(accessor, bufferView) {
  const componentSize = COMPONENT_BYTE_SIZE[accessor.componentType];
  const componentCount = ACCESSOR_COMPONENTS[accessor.type];
  if (!componentSize || !componentCount || !isNonNegativeInteger(accessor.count)) return null;

  const elementSize = componentSize * componentCount;
  if (accessor.count === 0) return 0;
  const stride = isNonNegativeInteger(bufferView?.byteStride) ? bufferView.byteStride : elementSize;
  return stride * (accessor.count - 1) + elementSize;
}

function countAccessorTriangles(accessorCount, mode) {
  if (!isNonNegativeInteger(accessorCount)) return 0;
  if (mode === undefined || mode === 4) return Math.floor(accessorCount / 3);
  if (mode === 5 || mode === 6) return Math.max(0, accessorCount - 2);
  return 0;
}

function validateGlbDocument(document, parseResult, limits, issues) {
  const binLength = parseResult.binChunk?.length || 0;
  const buffers = limitArray("buffers", document.buffers, limits.maxBuffers, "$.buffers", issues);
  const bufferViews = limitArray("bufferViews", document.bufferViews, limits.maxBufferViews, "$.bufferViews", issues);
  const accessors = limitArray("accessors", document.accessors, limits.maxAccessors, "$.accessors", issues);
  const images = limitArray("images", document.images, limits.maxImages, "$.images", issues);
  const nodes = limitArray("nodes", document.nodes, limits.maxNodes, "$.nodes", issues);
  const scenes = limitArray("scenes", document.scenes, limits.maxScenes, "$.scenes", issues);
  const meshes = limitArray("meshes", document.meshes, limits.maxMeshes, "$.meshes", issues);
  const materials = limitArray("materials", document.materials, limits.maxMaterials, "$.materials", issues);
  const textures = limitArray("textures", document.textures, limits.maxTextures, "$.textures", issues);
  const cameras = limitArray("cameras", document.cameras, limits.maxCameras, "$.cameras", issues);
  const skins = limitArray("skins", document.skins, limits.maxSkins, "$.skins", issues);
  const animations = limitArray("animations", document.animations, limits.maxAnimations, "$.animations", issues);

  if (!isPlainObject(document.asset) || document.asset.version !== "2.0") {
    issues.error("invalid_asset", "glTF asset.version must be 2.0.", { path: "$.asset.version" });
  }

  const bufferByteLengths = buffers.map((buffer, index) => {
    const path = `$.buffers[${index}]`;
    if (!isPlainObject(buffer)) {
      issues.error("invalid_type", "Buffer must be an object.", { path });
      return 0;
    }

    const uriRejection = isRejectedUri(buffer.uri);
    if (uriRejection) {
      issues.error(uriRejection, "GLB buffers must not use external or data URIs.", {
        path: `${path}.uri`,
      });
    }

    if (!isNonNegativeInteger(buffer.byteLength)) {
      issues.error("invalid_byte_length", "Buffer byteLength must be a non-negative integer.", {
        path: `${path}.byteLength`,
        value: buffer.byteLength,
      });
      return 0;
    }

    if (index === 0) {
      if (buffer.byteLength > binLength) {
        issues.error("buffer_out_of_bounds", "Buffer byteLength exceeds the BIN chunk length.", {
          path: `${path}.byteLength`,
          actual: buffer.byteLength,
          limit: binLength,
        });
      }
    } else if (buffer.uri === undefined && buffer.byteLength > 0) {
      issues.error("buffer_without_source", "Additional GLB buffers require a URI, which is not allowed.", {
        path,
      });
    }

    return buffer.byteLength;
  });

  bufferViews.forEach((bufferView, index) => {
    const path = `$.bufferViews[${index}]`;
    if (!isPlainObject(bufferView)) {
      issues.error("invalid_type", "bufferView must be an object.", { path });
      return;
    }

    if (!validateIndex(bufferView.buffer, buffers, `${path}.buffer`, "bufferView.buffer", issues)) return;
    const byteOffset = bufferView.byteOffset ?? 0;
    if (!isNonNegativeInteger(byteOffset)) {
      issues.error("invalid_byte_offset", "bufferView byteOffset must be a non-negative integer.", {
        path: `${path}.byteOffset`,
        value: byteOffset,
      });
      return;
    }
    if (!isNonNegativeInteger(bufferView.byteLength)) {
      issues.error("invalid_byte_length", "bufferView byteLength must be a non-negative integer.", {
        path: `${path}.byteLength`,
        value: bufferView.byteLength,
      });
      return;
    }
    if (
      bufferView.byteStride !== undefined &&
      (!Number.isSafeInteger(bufferView.byteStride) || bufferView.byteStride < 4 || bufferView.byteStride > 252)
    ) {
      issues.error("invalid_byte_stride", "bufferView byteStride must be an integer from 4 to 252.", {
        path: `${path}.byteStride`,
        value: bufferView.byteStride,
      });
    }

    const bufferLength = bufferByteLengths[bufferView.buffer] || 0;
    if (byteOffset + bufferView.byteLength > bufferLength || byteOffset + bufferView.byteLength < byteOffset) {
      issues.error("buffer_view_out_of_bounds", "bufferView byte range exceeds its buffer.", {
        path,
        actual: byteOffset + bufferView.byteLength,
        limit: bufferLength,
      });
    }
  });

  accessors.forEach((accessor, index) => {
    const path = `$.accessors[${index}]`;
    if (!isPlainObject(accessor)) {
      issues.error("invalid_type", "Accessor must be an object.", { path });
      return;
    }

    if (!COMPONENT_BYTE_SIZE[accessor.componentType]) {
      issues.error("invalid_component_type", "Accessor componentType is not supported by glTF 2.0.", {
        path: `${path}.componentType`,
        value: accessor.componentType,
      });
    }
    if (!ACCESSOR_COMPONENTS[accessor.type]) {
      issues.error("invalid_accessor_type", "Accessor type is not supported by glTF 2.0.", {
        path: `${path}.type`,
        value: accessor.type,
      });
    }
    if (!isNonNegativeInteger(accessor.count)) {
      issues.error("invalid_count", "Accessor count must be a non-negative integer.", {
        path: `${path}.count`,
        value: accessor.count,
      });
    } else if (accessor.count > limits.maxAccessorCount) {
      issues.error("limit_exceeded", "Accessor count exceeds the configured limit.", {
        path: `${path}.count`,
        actual: accessor.count,
        limit: limits.maxAccessorCount,
      });
    }

    const byteOffset = accessor.byteOffset ?? 0;
    if (!isNonNegativeInteger(byteOffset)) {
      issues.error("invalid_byte_offset", "Accessor byteOffset must be a non-negative integer.", {
        path: `${path}.byteOffset`,
        value: byteOffset,
      });
    }

    ["min", "max"].forEach((key) => {
      if (accessor[key] !== undefined) {
        if (!Array.isArray(accessor[key])) {
          issues.error("invalid_accessor_bounds", `Accessor ${key} must be an array of finite numbers.`, {
            path: `${path}.${key}`,
          });
        } else {
          accessor[key].forEach((entry, entryIndex) => {
            if (!isFiniteNumber(entry)) {
              issues.error("invalid_accessor_bounds", `Accessor ${key} contains a non-finite number.`, {
                path: `${path}.${key}[${entryIndex}]`,
                value: entry,
              });
            }
          });
        }
      }
    });

    if (accessor.bufferView !== undefined) {
      if (validateIndex(accessor.bufferView, bufferViews, `${path}.bufferView`, "accessor.bufferView", issues)) {
        const bufferView = bufferViews[accessor.bufferView];
        const requiredLength = accessorByteLength(accessor, bufferView);
        if (requiredLength !== null && isNonNegativeInteger(byteOffset)) {
          const bufferViewLength = isNonNegativeInteger(bufferView.byteLength) ? bufferView.byteLength : 0;
          if (byteOffset + requiredLength > bufferViewLength || byteOffset + requiredLength < byteOffset) {
            issues.error("accessor_out_of_bounds", "Accessor byte range exceeds its bufferView.", {
              path,
              actual: byteOffset + requiredLength,
              limit: bufferViewLength,
            });
          }
        }
      }
    }

    if (isPlainObject(accessor.sparse)) {
      const sparsePath = `${path}.sparse`;
      if (!isNonNegativeInteger(accessor.sparse.count)) {
        issues.error("invalid_count", "Accessor sparse count must be a non-negative integer.", {
          path: `${sparsePath}.count`,
          value: accessor.sparse.count,
        });
      }
      if (isPlainObject(accessor.sparse.indices)) {
        validateIndex(
          accessor.sparse.indices.bufferView,
          bufferViews,
          `${sparsePath}.indices.bufferView`,
          "accessor.sparse.indices.bufferView",
          issues
        );
      }
      if (isPlainObject(accessor.sparse.values)) {
        validateIndex(
          accessor.sparse.values.bufferView,
          bufferViews,
          `${sparsePath}.values.bufferView`,
          "accessor.sparse.values.bufferView",
          issues
        );
      }
    }
  });

  images.forEach((image, index) => {
    const path = `$.images[${index}]`;
    if (!isPlainObject(image)) {
      issues.error("invalid_type", "Image must be an object.", { path });
      return;
    }

    const uriRejection = isRejectedUri(image.uri);
    if (uriRejection) {
      issues.error(uriRejection, "GLB images must not use external or data URIs.", {
        path: `${path}.uri`,
      });
    }
    if (image.uri !== undefined && image.bufferView !== undefined) {
      issues.error("ambiguous_image_source", "Image must not define both uri and bufferView.", {
        path,
      });
    }
    if (image.bufferView !== undefined) {
      validateIndex(image.bufferView, bufferViews, `${path}.bufferView`, "image.bufferView", issues);
    }
  });

  textures.forEach((texture, index) => {
    if (isPlainObject(texture) && texture.source !== undefined) {
      validateIndex(texture.source, images, `$.textures[${index}].source`, "texture.source", issues);
    }
  });

  meshes.forEach((mesh, meshIndex) => {
    const meshPath = `$.meshes[${meshIndex}]`;
    if (!isPlainObject(mesh)) {
      issues.error("invalid_type", "Mesh must be an object.", { path: meshPath });
      return;
    }
    safeArray(mesh.primitives).forEach((primitive, primitiveIndex) => {
      const primitivePath = `${meshPath}.primitives[${primitiveIndex}]`;
      if (!isPlainObject(primitive)) {
        issues.error("invalid_type", "Mesh primitive must be an object.", { path: primitivePath });
        return;
      }
      if (primitive.indices !== undefined) {
        validateIndex(primitive.indices, accessors, `${primitivePath}.indices`, "primitive.indices", issues);
      }
      if (primitive.material !== undefined) {
        validateIndex(primitive.material, materials, `${primitivePath}.material`, "primitive.material", issues);
      }
      if (isPlainObject(primitive.attributes)) {
        Object.entries(primitive.attributes).forEach(([name, accessorIndex]) => {
          validateIndex(
            accessorIndex,
            accessors,
            `${primitivePath}.attributes.${name}`,
            `primitive.attributes.${name}`,
            issues
          );
        });
      }
    });
  });

  nodes.forEach((node, index) => {
    const path = `$.nodes[${index}]`;
    if (!isPlainObject(node)) {
      issues.error("invalid_type", "Node must be an object.", { path });
      return;
    }

    validateOptionalFiniteArray(node.matrix, 16, `${path}.matrix`, "node.matrix", issues);
    validateOptionalFiniteArray(node.translation, 3, `${path}.translation`, "node.translation", issues);
    validateOptionalFiniteArray(node.rotation, 4, `${path}.rotation`, "node.rotation", issues);
    validateOptionalFiniteArray(node.scale, 3, `${path}.scale`, "node.scale", issues);
    if (node.matrix !== undefined && (node.translation !== undefined || node.rotation !== undefined || node.scale !== undefined)) {
      issues.error("invalid_transform", "Node must not combine matrix with TRS transforms.", { path });
    }

    if (node.mesh !== undefined) {
      validateIndex(node.mesh, meshes, `${path}.mesh`, "node.mesh", issues);
    }
    if (node.camera !== undefined) {
      validateIndex(node.camera, cameras, `${path}.camera`, "node.camera", issues);
    }
    if (node.skin !== undefined) {
      validateIndex(node.skin, skins, `${path}.skin`, "node.skin", issues);
    }
    if (node.children !== undefined) {
      if (!Array.isArray(node.children)) {
        issues.error("invalid_type", "node.children must be an array.", { path: `${path}.children` });
      } else {
        node.children.forEach((child, childIndex) => {
          validateIndex(child, nodes, `${path}.children[${childIndex}]`, "node.children", issues);
        });
      }
    }
  });

  scenes.forEach((scene, index) => {
    const path = `$.scenes[${index}]`;
    if (!isPlainObject(scene)) {
      issues.error("invalid_type", "Scene must be an object.", { path });
      return;
    }
    if (scene.nodes !== undefined) {
      if (!Array.isArray(scene.nodes)) {
        issues.error("invalid_type", "scene.nodes must be an array.", { path: `${path}.nodes` });
      } else {
        scene.nodes.forEach((nodeIndex, sceneNodeIndex) => {
          validateIndex(nodeIndex, nodes, `${path}.nodes[${sceneNodeIndex}]`, "scene.nodes", issues);
        });
      }
    }
  });

  if (document.scene !== undefined) {
    validateIndex(document.scene, scenes, "$.scene", "scene", issues);
  }

  skins.forEach((skin, index) => {
    const path = `$.skins[${index}]`;
    if (!isPlainObject(skin)) return;
    if (skin.inverseBindMatrices !== undefined) {
      validateIndex(skin.inverseBindMatrices, accessors, `${path}.inverseBindMatrices`, "skin.inverseBindMatrices", issues);
    }
    if (skin.skeleton !== undefined) {
      validateIndex(skin.skeleton, nodes, `${path}.skeleton`, "skin.skeleton", issues);
    }
    safeArray(skin.joints).forEach((joint, jointIndex) => {
      validateIndex(joint, nodes, `${path}.joints[${jointIndex}]`, "skin.joints", issues);
    });
  });

  validateNodeCycles(nodes, limits.maxNodes, issues);

  const metrics = calculateMetrics({
    parseResult,
    document,
    buffers,
    bufferViews,
    accessors,
    images,
    nodes,
    scenes,
    meshes,
    materials,
    textures,
    cameras,
    skins,
    animations,
    limits,
    issues,
  });

  return metrics;
}

function validateNodeCycles(nodes, maxNodes, issues) {
  const visitCount = Math.min(nodes.length, maxNodes);
  const state = new Uint8Array(visitCount);

  for (let root = 0; root < visitCount; root += 1) {
    if (state[root] !== 0) continue;

    const stack = [{ index: root, childOffset: 0 }];
    state[root] = 1;

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const node = nodes[frame.index];
      const children = isPlainObject(node) ? safeArray(node.children) : [];

      if (frame.childOffset >= children.length) {
        state[frame.index] = 2;
        stack.pop();
        continue;
      }

      const child = children[frame.childOffset];
      frame.childOffset += 1;

      if (!isNonNegativeInteger(child) || child >= visitCount) continue;
      if (state[child] === 1) {
        issues.error("node_cycle", "Node hierarchy must not contain cycles.", {
          path: `$.nodes[${frame.index}].children`,
          value: child,
        });
        continue;
      }
      if (state[child] === 0) {
        state[child] = 1;
        stack.push({ index: child, childOffset: 0 });
      }
    }
  }
}

function calculateMetrics(context) {
  const {
    parseResult,
    document,
    buffers,
    bufferViews,
    accessors,
    images,
    nodes,
    scenes,
    meshes,
    materials,
    textures,
    cameras,
    skins,
    animations,
    limits,
    issues,
  } = context;

  let estimatedTriangles = 0;
  let estimatedVertices = 0;
  let triangleLimitReported = false;

  meshes.slice(0, limits.maxMeshes).forEach((mesh) => {
    if (!isPlainObject(mesh)) return;
    safeArray(mesh.primitives).forEach((primitive) => {
      if (!isPlainObject(primitive)) return;

      let primitiveAccessorCount = 0;
      if (isNonNegativeInteger(primitive.indices) && accessors[primitive.indices]) {
        primitiveAccessorCount = accessors[primitive.indices].count;
      } else if (isPlainObject(primitive.attributes)) {
        Object.values(primitive.attributes).forEach((accessorIndex) => {
          if (isNonNegativeInteger(accessorIndex) && accessors[accessorIndex]) {
            primitiveAccessorCount = Math.max(primitiveAccessorCount, accessors[accessorIndex].count || 0);
          }
        });
      }

      if (isNonNegativeInteger(primitiveAccessorCount)) {
        estimatedVertices = Math.min(limits.maxAccessorCount, estimatedVertices + primitiveAccessorCount);
        estimatedTriangles += countAccessorTriangles(primitiveAccessorCount, primitive.mode);
        if (estimatedTriangles > limits.maxTriangles && !triangleLimitReported) {
          triangleLimitReported = true;
          issues.error("limit_exceeded", "Estimated triangle count exceeds the configured limit.", {
            path: "$.meshes",
            actual: estimatedTriangles,
            limit: limits.maxTriangles,
          });
        }
        estimatedTriangles = Math.min(estimatedTriangles, limits.maxTriangles);
      }
    });
  });

  return {
    byteLength: parseResult.header?.byteLength || 0,
    declaredLength: parseResult.header?.declaredLength || 0,
    chunkCount: parseResult.chunks.length,
    jsonBytes: parseResult.chunks.find((chunk) => chunk.type === CHUNK_TYPE_JSON)?.length || 0,
    binBytes: parseResult.binChunk?.length || 0,
    buffers: buffers.length,
    bufferViews: bufferViews.length,
    accessors: accessors.length,
    images: images.length,
    nodes: nodes.length,
    scenes: scenes.length,
    meshes: meshes.length,
    materials: materials.length,
    textures: textures.length,
    cameras: cameras.length,
    skins: skins.length,
    animations: animations.length,
    estimatedVertices,
    estimatedTriangles,
    estimatedTrianglesCapped: triangleLimitReported,
    defaultScene: isNonNegativeInteger(document.scene) ? document.scene : null,
  };
}

export function validateGlb(input, options = {}) {
  const parseResult = parseGlb(input, options);
  const issues = createIssueCollector(parseResult.limits.maxIssues);
  parseResult.issues.forEach((issue) => {
    issues[issue.severity === "warning" ? "warning" : "error"](issue.code, issue.message, issue);
  });

  let metrics = {
    byteLength: parseResult.header?.byteLength || 0,
    declaredLength: parseResult.header?.declaredLength || 0,
    chunkCount: parseResult.chunks.length,
    jsonBytes: parseResult.chunks.find((chunk) => chunk.type === CHUNK_TYPE_JSON)?.length || 0,
    binBytes: parseResult.binChunk?.length || 0,
    buffers: 0,
    bufferViews: 0,
    accessors: 0,
    images: 0,
    nodes: 0,
    scenes: 0,
    meshes: 0,
    materials: 0,
    textures: 0,
    cameras: 0,
    skins: 0,
    animations: 0,
    estimatedVertices: 0,
    estimatedTriangles: 0,
    estimatedTrianglesCapped: false,
    defaultScene: null,
  };

  if (parseResult.json) {
    metrics = validateGlbDocument(parseResult.json, parseResult, parseResult.limits, issues);
  }

  const normalizedIssues = issues.issues;
  return {
    ok: !normalizedIssues.some((issue) => issue.severity === "error"),
    issues: normalizedIssues,
    header: parseResult.header,
    chunks: parseResult.chunks.map(({ data, ...chunk }) => chunk),
    document: parseResult.json,
    metrics,
    limits: parseResult.limits,
  };
}

export const GLB_CONSTANTS = Object.freeze({
  GLB_MAGIC,
  GLB_VERSION,
  CHUNK_TYPE_JSON,
  CHUNK_TYPE_BIN,
});

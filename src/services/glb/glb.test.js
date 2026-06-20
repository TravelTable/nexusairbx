import {
  GLB_CONSTANTS,
  DEFAULT_GLB_LIMITS,
  parseGlb,
  validateGlb,
} from "./index";
import {
  CHUNK_TYPE_BIN,
  createChunk,
  createGlb,
  createGlbFromJsonText,
  createMinimalTriangleGlb,
} from "../../../test/fixtures/glb/glbFixtureFactory";

describe("NexusRBX GLB 2.0 parser", () => {
  test("parses a valid GLB header, chunks, JSON and BIN chunk without errors", () => {
    const bytes = createMinimalTriangleGlb();
    const result = parseGlb(bytes);

    expect(result.ok).toBe(true);
    expect(result.header).toMatchObject({
      magic: GLB_CONSTANTS.GLB_MAGIC,
      version: 2,
      declaredLength: bytes.byteLength,
      byteLength: bytes.byteLength,
    });
    expect(result.chunks.map((chunk) => chunk.typeName)).toEqual(["JSON", "BIN"]);
    expect(result.json.asset.version).toBe("2.0");
    expect(result.binChunk.length).toBe(36);
  });

  test("rejects invalid magic, unsupported version and declared length mismatch", () => {
    const bytes = createMinimalTriangleGlb();
    const invalid = new Uint8Array(bytes);
    new DataView(invalid.buffer).setUint32(0, 0x12345678, true);
    new DataView(invalid.buffer).setUint32(4, 1, true);
    new DataView(invalid.buffer).setUint32(8, invalid.byteLength + 4, true);

    const result = parseGlb(invalid);
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["invalid_magic", "unsupported_version", "declared_length_mismatch"])
    );
  });

  test("rejects truncated headers and chunk bounds without trusting declared lengths", () => {
    const shortHeader = parseGlb(new Uint8Array(8));
    expect(shortHeader.issues.map((issue) => issue.code)).toContain("truncated_header");

    const declaredHuge = createGlb({ asset: { version: "2.0" } }, new Uint8Array(), {
      declaredLength: 0xffffffff,
    });
    const hugeResult = parseGlb(declaredHuge);
    expect(hugeResult.issues.map((issue) => issue.code)).toContain("declared_length_mismatch");

    const chunkOutOfBounds = createGlb({ asset: { version: "2.0" } }, new Uint8Array(), {
      truncateTo: 20,
    });
    const boundsResult = parseGlb(chunkOutOfBounds);
    expect(boundsResult.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["declared_length_mismatch", "chunk_out_of_bounds"])
    );
  });

  test("rejects malformed JSON safely", () => {
    const result = parseGlb(createGlbFromJsonText("{ bad json", new Uint8Array()));
    expect(result.ok).toBe(false);
    expect(result.json).toBeNull();
    expect(result.issues.map((issue) => issue.code)).toContain("invalid_json");
  });
});

describe("NexusRBX GLB 2.0 validation", () => {
  test("returns normalized findings, bounded metrics and no binary views in validate output", () => {
    const result = validateGlb(createMinimalTriangleGlb());

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.metrics).toMatchObject({
      buffers: 1,
      bufferViews: 1,
      accessors: 1,
      meshes: 1,
      nodes: 1,
      scenes: 1,
      estimatedTriangles: 1,
      estimatedTrianglesCapped: false,
      defaultScene: 0,
    });
    expect(result.chunks[0]).not.toHaveProperty("data");
    expect(result.limits.maxBytes).toBe(DEFAULT_GLB_LIMITS.maxBytes);
  });

  test("rejects external and data URIs in buffers and images", () => {
    const result = validateGlb(
      createGlb({
        asset: { version: "2.0" },
        buffers: [
          { byteLength: 0, uri: "model.bin" },
          { byteLength: 0, uri: "data:application/octet-stream;base64,AAAA" },
        ],
        images: [
          { uri: "texture.png" },
          { uri: "data:image/png;base64,AAAA" },
        ],
      })
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["external_uri", "data_uri"])
    );
    expect(result.issues.every((issue) => typeof issue.path === "string")).toBe(true);
  });

  test("validates buffer, bufferView and accessor references and byte ranges", () => {
    const result = validateGlb(
      createGlb(
        {
          asset: { version: "2.0" },
          buffers: [{ byteLength: 8 }],
          bufferViews: [
            { buffer: 2, byteOffset: 0, byteLength: 4 },
            { buffer: 0, byteOffset: 4, byteLength: 12 },
          ],
          accessors: [
            { bufferView: 0, componentType: 5126, count: 1, type: "VEC3" },
            { bufferView: 1, componentType: 5126, count: 2, type: "VEC3" },
            { bufferView: 9, componentType: 5126, count: 1, type: "VEC3" },
          ],
        },
        new Uint8Array(8)
      )
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["invalid_reference", "buffer_view_out_of_bounds", "accessor_out_of_bounds"])
    );
  });

  test("validates image, node, scene, mesh, texture and skin references", () => {
    const result = validateGlb(
      createGlb({
        asset: { version: "2.0" },
        buffers: [{ byteLength: 0 }],
        bufferViews: [],
        accessors: [],
        images: [{ bufferView: 3 }],
        textures: [{ source: 2 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 4 }, indices: 5, material: 6 }] }],
        nodes: [{ mesh: 4, camera: 3, skin: 2, children: [9] }],
        skins: [{ inverseBindMatrices: 4, skeleton: 9, joints: [8] }],
        scenes: [{ nodes: [7] }],
        scene: 4,
      })
    );

    expect(result.ok).toBe(false);
    expect(result.issues.filter((issue) => issue.code === "invalid_reference").length).toBeGreaterThanOrEqual(10);
  });

  test("rejects node cycles", () => {
    const result = validateGlb(
      createGlb({
        asset: { version: "2.0" },
        nodes: [{ children: [1] }, { children: [2] }, { children: [0] }],
        scenes: [{ nodes: [0] }],
      })
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("node_cycle");
  });

  test("enforces finite transforms and rejects matrix plus TRS combinations", () => {
    const glb = createGlbFromJsonText(
      JSON.stringify({
        asset: { version: "2.0" },
        nodes: [
          {
            matrix: Array(16).fill(1),
            translation: [0, 0, 0],
          },
        ],
        scenes: [{ nodes: [0] }],
      }).replace("[0,0,0]", "[0,1e309,0]")
    );

    const result = validateGlb(glb);
    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["non_finite_transform", "invalid_transform"])
    );
  });

  test("estimates triangles for triangles, strips and fans and applies triangle limits", () => {
    const json = {
      asset: { version: "2.0" },
      buffers: [{ byteLength: 120 }],
      bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 120 }],
      accessors: [
        { bufferView: 0, componentType: 5126, count: 6, type: "VEC3" },
        { bufferView: 0, componentType: 5126, count: 5, type: "VEC3" },
        { bufferView: 0, componentType: 5126, count: 4, type: "VEC3" },
      ],
      meshes: [
        {
          primitives: [
            { attributes: { POSITION: 0 }, mode: 4 },
            { attributes: { POSITION: 1 }, mode: 5 },
            { attributes: { POSITION: 2 }, mode: 6 },
          ],
        },
      ],
    };

    const result = validateGlb(createGlb(json, new Uint8Array(120)), { maxTriangles: 6 });
    expect(result.ok).toBe(false);
    expect(result.metrics.estimatedTriangles).toBe(6);
    expect(result.metrics.estimatedTrianglesCapped).toBe(true);
    expect(result.issues.map((issue) => issue.code)).toContain("limit_exceeded");
  });

  test("enforces configurable structural and byte limits", () => {
    const result = validateGlb(createMinimalTriangleGlb(), {
      maxBytes: 32,
      maxBinBytes: 8,
      maxNodes: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("limit_exceeded");
    expect(result.issues.some((issue) => issue.path === "$.nodes")).toBe(true);
  });

  test("caps issue count and emits a normalized cap finding", () => {
    const badBuffers = Array.from({ length: 20 }, (_, index) => ({
      byteLength: "bad",
      uri: `buffer-${index}.bin`,
    }));
    const result = validateGlb(
      createGlb({
        asset: { version: "2.0" },
        buffers: badBuffers,
      }),
      { maxIssues: 5 }
    );

    expect(result.issues).toHaveLength(5);
    expect(result.issues[4]).toMatchObject({
      severity: "warning",
      code: "issue_limit_reached",
      path: "$",
    });
  });

  test("reports unknown chunks and chunk count limits while preserving safe parse behavior", () => {
    const unknownChunk = createChunk(0x12345678, new Uint8Array([1, 2, 3, 4]));
    const result = parseGlb(
      createGlb({ asset: { version: "2.0" } }, new Uint8Array(), {
        extraChunks: [unknownChunk, createChunk(CHUNK_TYPE_BIN, new Uint8Array())],
      }),
      { maxChunks: 1 }
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["limit_exceeded"])
    );
  });
});

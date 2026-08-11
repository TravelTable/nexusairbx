import {
  buildBaseArtifactSnapshot,
  computeArtifactRevision,
} from "./artifactState";

describe("artifactState", () => {
  test("buildBaseArtifactSnapshot captures dirty editor content", () => {
    const snapshot = buildBaseArtifactSnapshot({
      id: "artifact_1",
      title: "Workspace Artifact",
      files: [
        {
          id: "file_1",
          name: "Main",
          path: "ReplicatedStorage/Main",
          placement: "ReplicatedStorage",
          kind: "module",
          className: "ModuleScript",
          content: "return { dirty = true }",
        },
      ],
    });

    expect(snapshot.artifactId).toBe("artifact_1");
    expect(snapshot.files[0].content).toBe("return { dirty = true }");
    expect(snapshot.files[0].className).toBe("ModuleScript");
    expect(snapshot.files[0].contentHash).toBeTruthy();
  });

  test("artifact revision changes when editor content changes", () => {
    const baseFiles = [
      {
        id: "file_1",
        name: "Main",
        path: "ReplicatedStorage/Main",
        placement: "ReplicatedStorage",
        kind: "module",
        content: "return { value = 1 }",
      },
    ];

    const before = computeArtifactRevision(baseFiles);
    const after = computeArtifactRevision([
      {
        ...baseFiles[0],
        content: "return { value = 2 }",
      },
    ]);

    expect(before).not.toBe(after);
  });

  test("artifact revision and Studio snapshot preserve script class and write preconditions", () => {
    const base = {
      id: "file_1",
      path: "ServerScriptService/Main",
      placement: "ServerScriptService",
      kind: "server",
      className: "Script",
      content: "print('ready')",
      allowClassChange: true,
      inspectedClassName: "ModuleScript",
      expectedSourceHash: "source-hash-1",
    };
    const snapshot = buildBaseArtifactSnapshot({ id: "artifact_1", files: [base] });

    expect(snapshot.files[0]).toMatchObject({
      className: "Script",
      allowClassChange: true,
      inspectedClassName: "ModuleScript",
      expectedSourceHash: "source-hash-1",
    });
    expect(computeArtifactRevision([base])).not.toBe(computeArtifactRevision([{
      ...base,
      className: "ModuleScript",
    }]));
  });

  test("recomputes stale file hashes and generation revisions before Studio push", () => {
    const snapshot = buildBaseArtifactSnapshot({
      id: "artifact_stale",
      revision: "generation-revision",
      files: [{
        id: "file_1",
        path: "ServerScriptService/Main.lua",
        placement: "ServerScriptService",
        kind: "server",
        content: "print('edited')",
        contentHash: "stale-content-hash",
      }],
    });

    expect(snapshot.files[0].contentHash).not.toBe("stale-content-hash");
    expect(snapshot.revision).toBe(computeArtifactRevision(snapshot.files));
    expect(snapshot.sourceRevision).toBe("generation-revision");
  });
});

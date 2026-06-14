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
          content: "return { dirty = true }",
        },
      ],
    });

    expect(snapshot.artifactId).toBe("artifact_1");
    expect(snapshot.files[0].content).toBe("return { dirty = true }");
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
});

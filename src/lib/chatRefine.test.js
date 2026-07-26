import {
  buildRefineTargetFromWorkspace,
  messageHasRefineableFiles,
} from "./chatRefine";

describe("chatRefine", () => {
  test("detects refineable assistant messages", () => {
    expect(messageHasRefineableFiles({ files: [{ path: "A" }] })).toBe(true);
    expect(messageHasRefineableFiles({ code: "print(1)" })).toBe(true);
    expect(messageHasRefineableFiles({ content: "hello" })).toBe(false);
    expect(messageHasRefineableFiles(null)).toBe(false);
  });

  test("builds a refine target from the live workspace snapshot", () => {
    const target = buildRefineTargetFromWorkspace(
      {
        artifactId: "art_1",
        revision: "rev_1",
        title: "Lobby",
        files: [{ path: "ServerScriptService/Main", content: "print(1)" }],
      },
      { jobId: "job_9", classification: "project" }
    );
    expect(target.artifactId).toBe("art_1");
    expect(target.revision).toBe("rev_1");
    expect(target.jobId).toBe("job_9");
    expect(target.files).toHaveLength(1);
    expect(buildRefineTargetFromWorkspace({ title: "Empty" }, null)).toBeNull();
  });
});

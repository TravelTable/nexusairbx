import { messageHasArtifact } from "./normalizeArtifact";

describe("messageHasArtifact", () => {
  test("does not treat assistant prose as a generated artifact", () => {
    expect(messageHasArtifact({ role: "assistant", content: "Studio is not connected." })).toBe(false);
    expect(messageHasArtifact({ role: "assistant", explanation: "I could not inspect the project." })).toBe(false);
  });

  test("accepts explicit file and code payloads", () => {
    expect(messageHasArtifact({ role: "assistant", files: [{ path: "ServerScriptService/Main", content: "print('ok')" }] })).toBe(true);
    expect(messageHasArtifact({ role: "assistant", code: "print('ok')" })).toBe(true);
  });

  test("keeps plans out of the artifact workspace", () => {
    expect(messageHasArtifact({ role: "assistant", stage: "plan", code: "print('later')" })).toBe(false);
  });
});

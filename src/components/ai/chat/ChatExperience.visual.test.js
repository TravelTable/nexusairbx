import fs from "fs";
import path from "path";

const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

test("keeps the jump-to-latest button out of the generation stream", () => {
  const chatView = read("src/components/ai/ChatView.jsx");
  const conversation = read("src/components/ai-elements/conversation.jsx");
  const styles = read("src/components/ai/chat/ChatExperience.css");

  expect(chatView).toContain(
    '<ConversationScrollButton className="nexus-conversation-scroll-button" />',
  );
  expect(conversation).toContain('aria-label="Scroll to latest message"');
  expect(styles).toMatch(
    /\.nexus-conversation-scroll-button\s*\{[\s\S]*?right:\s*max\([\s\S]*?left:\s*auto;[\s\S]*?transform:\s*none;/,
  );
});

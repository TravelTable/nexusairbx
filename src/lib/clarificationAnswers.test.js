import { clarificationAnswerRows, formatClarificationAnswers } from "./clarificationAnswers";

const questions = [{ id: "flight_controls", question: "How should flight work?", options: [
  { id: "option_f5ff4307028dc8bd7850ec698db042616", label: "WASD and mouse" },
  { value: "controller", label: "Gamepad" },
] }];

test("resolves production option IDs while preserving custom and multiple answers", () => {
  const answers = { flight_controls: [questions[0].options[0].id, "controller", "Space to ascend"] };
  expect(formatClarificationAnswers(questions, answers)).toBe("How should flight work?: WASD and mouse, Gamepad, Space to ascend");
  expect(answers.flight_controls[0]).toBe(questions[0].options[0].id);
});

test("old transcripts never expose an opaque option ID when its label is unavailable", () => {
  const rows = clarificationAnswerRows([], { flight_controls: questions[0].options[0].id });
  expect(rows[0]).toEqual({ id: "flight_controls", question: "flight controls", answers: ["Previously selected option"] });
});

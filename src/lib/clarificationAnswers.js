const opaqueId = /^(?:option|question)_[a-f0-9]{16,}$|^[a-f0-9]{24,}$/i;

const text = (value) => typeof value === "string" || typeof value === "number" ? String(value).trim() : "";

/** Keep transport IDs out of the transcript without changing submitted values. */
export function clarificationAnswerRows(questions = [], answers = {}) {
  const questionList = Array.isArray(questions) ? questions : [];
  return Object.entries(answers || {}).flatMap(([id, answer], index) => {
    const question = questionList.find((item, i) => String(item?.id || `question-${i + 1}`) === id);
    const label = text(question?.question || question?.prompt || question?.title)
      || (opaqueId.test(id) ? `Question ${index + 1}` : id.replace(/[_-]+/g, " "));
    const values = (Array.isArray(answer) ? answer : [answer]).map((value) => {
      const raw = text(value);
      const option = (Array.isArray(question?.options) ? question.options : []).find((item) => typeof item === "string"
        ? item === raw
        : item && [item.value, item.id, item.label].some((key) => text(key) === raw));
      const resolved = typeof option === "string" ? option : text(option?.label || option?.title);
      return resolved || (opaqueId.test(raw) ? "Previously selected option" : raw);
    }).filter(Boolean);
    return values.length ? [{ id, question: label, answers: values }] : [];
  });
}

export function formatClarificationAnswers(questions, answers) {
  return clarificationAnswerRows(questions, answers)
    .map((row) => `${row.question}: ${row.answers.join(", ")}`).join("\n");
}

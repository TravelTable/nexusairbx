export function resolveGameOverview(task, run, artifact, plan) {
  const current = task?.gameOverview;
  if (current?.requestedScope?.kind === "focused_change") return null;
  const runOverview = !task?.taskId || !run?.taskId || task.taskId === run.taskId ? run?.gameOverview : null;
  if (current || runOverview) {
    const primary = runOverview || current;
    const previous = current?.deliverables || [];
    return { ...primary, deliverables: primary.deliverables.map((item) => {
      const prior = previous.find((entry) => entry.id === item.id);
      return item.status === "planned" && prior && prior.status !== "planned" ? prior : item;
    }) };
  }
  const brief = artifact?.metadata?.gameBrief || plan?.gameIntelligence?.projectBrief
    || plan?.structuredPlan?.gameIntelligence?.projectBrief;
  if (!brief) return null;
  return { ...brief, deliverables: (brief.deliverables || []).map((item) => ({ ...item, status: "planned" })) };
}

import { buildUsageSummary, filterUsageChart, groupUsageLogs } from "./UsageInsights";

test("summarizes token usage without inventing activity", () => {
  expect(buildUsageSummary([
    { date: "2026-08-27", tokens: 100 },
    { date: "2026-08-29", tokens: 500 },
  ], 1200)).toEqual({
    total: 600,
    dailyAverage: 200,
    peak: 500,
    activeDays: 2,
    calendarDays: 3,
    runwayDays: 6,
  });
});

test("filters chart records by calendar range", () => {
  const now = new Date("2026-08-29T12:00:00.000Z").getTime();
  expect(filterUsageChart([
    { date: "2026-08-01", tokens: 10 },
    { date: "2026-08-25", tokens: 20 },
  ], 7, now)).toEqual([{ date: "2026-08-25", tokens: 20 }]);
});

test("groups usage events by real request type", () => {
  expect(groupUsageLogs([
    { requestType: "code_generation", tokens: 40 },
    { requestType: "code_generation", chargedTokens: 60 },
    { requestType: "ui_generation", tokens: 25 },
  ])).toEqual([
    { key: "code_generation", tokens: 100 },
    { key: "ui_generation", tokens: 25 },
  ]);
});

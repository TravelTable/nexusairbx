export const FEATURE_FLAGS = Object.freeze({
  streamV2: process.env.REACT_APP_STREAM_V2 === "true",
  systemOnlyPremium: process.env.REACT_APP_SYSTEM_ONLY_PREMIUM === "true",
  aiPageV2: process.env.REACT_APP_AI_PAGE_V2 !== "false",
  isDev: process.env.NODE_ENV === "development",
});

export default FEATURE_FLAGS;

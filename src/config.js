/**
 * Global Configuration for NexusRBX
 */

const isDev = process.env.NODE_ENV === 'development';

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app";
export const STREAM_V2_ENABLED = process.env.REACT_APP_STREAM_V2 === "true";
export const SYSTEM_ONLY_PREMIUM_ENABLED = process.env.REACT_APP_SYSTEM_ONLY_PREMIUM === "true";

export const CONFIG = {
  BACKEND_URL,
  IS_DEV: isDev,
  STREAM_V2_ENABLED,
  SYSTEM_ONLY_PREMIUM_ENABLED,
  STRIPE_PRO_PRICE_ID: "price_1SucJPAu3NmqHUAuf44Zz9cy",
  STRIPE_TEAM_PRICE_ID: "price_1SucGXAu3NmqHUAuDM99Hs1w",
};

export default CONFIG;

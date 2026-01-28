/**
 * Global Configuration for NexusRBX
 */

const isDev = process.env.NODE_ENV === 'development';

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app";

export const CONFIG = {
  BACKEND_URL,
  IS_DEV: isDev,
  STRIPE_PRO_PRICE_ID: "price_1SucJPAu3NmqHUAuf44Zz9cy",
  STRIPE_TEAM_PRICE_ID: "price_1SucGXAu3NmqHUAuDM99Hs1w",
};

export default CONFIG;

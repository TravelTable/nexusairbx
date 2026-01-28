/**
 * Global Configuration for NexusRBX
 */

const isDev = process.env.NODE_ENV === 'development';

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://nexusrbx-backend-production.up.railway.app";

export const CONFIG = {
  BACKEND_URL,
  IS_DEV: isDev,
  STRIPE_PRO_PRICE_ID: "price_1Q...", // Should be in env
  STRIPE_TEAM_PRICE_ID: "price_1Q...", // Should be in env
};

export default CONFIG;

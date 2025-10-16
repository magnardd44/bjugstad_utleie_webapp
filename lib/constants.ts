// lib/constants.ts
// Purpose: Central place for app-wide constants.

// Whether the app is running in development mode.
export const IS_DEV = process.env.NODE_ENV === "development";

// Whether the app is running in production mode.
export const IS_PROD = process.env.NODE_ENV === "production";

// Whether to enable the Credentials provider for DEV (skips Vipps login).
export const USE_CREDENTIALS_PROVIDER_FOR_DEV_ONLY: boolean = false;

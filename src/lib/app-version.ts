// App version — update this on each deployment
// The build timestamp is auto-generated at build time via Vite's define
export const APP_VERSION = "1.0.0";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - __APP_BUILD_DATE__ is injected by Vite define
export const APP_BUILD_DATE: string = typeof __APP_BUILD_DATE__ !== "undefined" ? __APP_BUILD_DATE__ : new Date().toISOString();

/**
 * Local Zod contracts for the Thrivo backend (`/api/v1`).
 *
 * These intentionally live in the mobile repo for now. When the shared
 * `@thrivo/contracts` package (BACKEND_ARCHITECTURE §3) ships, this barrel
 * becomes the single swap point — re-export from the package here and the rest
 * of the app (which only imports `@/contracts`) is unaffected.
 */
export * from "./common";
export * from "./auth";
export * from "./user";
export * from "./foods";
export * from "./dashboard";
export * from "./metrics";
export * from "./checkins";
export * from "./subscription";
export * from "./push";

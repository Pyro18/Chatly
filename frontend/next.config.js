// next.config.mjs

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
  experimental: {
    serverActions: {
      bodySizeLimit: undefined,
      allowedOrigins: undefined
    }
  },
  serverExternalPackages: ['ws']
};

export default config;
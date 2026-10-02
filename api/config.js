import { APP_CONFIG } from "../app.config.js";

export default function handler(_request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.status(200).json({
    appId: APP_CONFIG.id,
    authProvider: APP_CONFIG.authProvider,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || "",
    cloudEnabled: Boolean(
      process.env.CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY &&
      process.env.MONGODB_URI &&
      process.env.MONGODB_DATABASE &&
      process.env.APP_ORIGINS
    ),
  });
}


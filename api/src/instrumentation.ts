export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startApiKeyRotationScheduler } = await import("./lib/apiKeyRotationScheduler");
    startApiKeyRotationScheduler();
  }
}

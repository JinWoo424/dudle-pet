const DEFAULT_PRODUCTION_URL = "https://pet.dudle.co.kr";

type DeploymentEnv = Partial<Pick<NodeJS.ProcessEnv, "NEXT_PUBLIC_SITE_URL" | "VERCEL" | "VERCEL_ENV">>;

export function productionHostname(env: DeploymentEnv = process.env) {
  try {
    return new URL(env.NEXT_PUBLIC_SITE_URL || DEFAULT_PRODUCTION_URL).hostname.toLowerCase();
  } catch {
    return new URL(DEFAULT_PRODUCTION_URL).hostname;
  }
}

export function isPreviewDeployment(env: DeploymentEnv = process.env) {
  return env.VERCEL_ENV === "preview";
}

export function isCanonicalProductionHost(hostname: string, env: DeploymentEnv = process.env) {
  return hostname.toLowerCase().replace(/\.$/, "") === productionHostname(env);
}

export function shouldNoIndexHost(hostname: string, env: DeploymentEnv = process.env) {
  if (isPreviewDeployment(env)) return true;
  return Boolean(env.VERCEL) && !isCanonicalProductionHost(hostname, env);
}

const DEFAULT_PRODUCTION_URL = "https://pet.dudle.co.kr";

export type DeploymentEnv = {
  NEXT_PUBLIC_SITE_URL?: string;
  VERCEL?: string;
  VERCEL_ENV?: string;
};

function currentDeploymentEnv(): DeploymentEnv {
  return {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
}

export function deploymentTarget(env: DeploymentEnv = currentDeploymentEnv()) {
  if (env.VERCEL_ENV === "preview") return "preview" as const;
  if (env.VERCEL_ENV === "production") return "production" as const;
  return "local" as const;
}

export function productionHostname(env: DeploymentEnv = currentDeploymentEnv()) {
  try {
    return new URL(env.NEXT_PUBLIC_SITE_URL || DEFAULT_PRODUCTION_URL).hostname.toLowerCase();
  } catch {
    return new URL(DEFAULT_PRODUCTION_URL).hostname;
  }
}

export function isPreviewDeployment(env: DeploymentEnv = currentDeploymentEnv()) {
  return deploymentTarget(env) === "preview";
}

export function isCanonicalProductionHost(hostname: string, env: DeploymentEnv = currentDeploymentEnv()) {
  return hostname.toLowerCase().replace(/\.$/, "") === productionHostname(env);
}

export function shouldNoIndexHost(hostname: string, env: DeploymentEnv = currentDeploymentEnv()) {
  if (isPreviewDeployment(env)) return true;
  return Boolean(env.VERCEL) && !isCanonicalProductionHost(hostname, env);
}

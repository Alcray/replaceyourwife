export const APP_ID = process.env.HOME_MEMORY_APP_ID ?? 'replacemywife-home-memory';
export const USER_ID = process.env.HOME_MEMORY_USER_ID ?? 'home-demo';
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'Replace My Wife: Home Memory';

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

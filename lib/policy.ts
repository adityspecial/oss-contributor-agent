const BLOCKED_PATHS = [
  ".github/", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
  "Dockerfile", "docker-compose", ".env", "terraform/"
];

export function allowedChange(path: string, content: string) {
  if (!path || path.startsWith("/") || path.includes("..")) return false;
  if (BLOCKED_PATHS.some((blocked) => path === blocked || path.startsWith(blocked))) return false;
  if (content.length > 12_000) return false;
  return /\.(ts|tsx|js|jsx|py|go|rb|java|md)$/.test(path);
}

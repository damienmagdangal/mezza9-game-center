const DEFAULT_ADMIN_PATH = "/lounge-ops";

function normalizePath(input: string | undefined) {
  if (!input) return DEFAULT_ADMIN_PATH;
  const withPrefix = input.startsWith("/") ? input : `/${input}`;
  if (withPrefix.length === 1) return DEFAULT_ADMIN_PATH;
  return withPrefix.replace(/\/+$/, "");
}

export function getAdminPath() {
  return normalizePath(process.env.ADMIN_PATH ?? process.env.NEXT_PUBLIC_ADMIN_PATH);
}

export function getPublicAdminPath() {
  return normalizePath(process.env.NEXT_PUBLIC_ADMIN_PATH);
}

export function isLegacyAdminPath(pathname: string) {
  const adminPath = getAdminPath();
  return pathname === DEFAULT_ADMIN_PATH && adminPath !== DEFAULT_ADMIN_PATH;
}

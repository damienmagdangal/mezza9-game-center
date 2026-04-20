const CSRF_COOKIE_NAME = "m9_admin_csrf";
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;

type RateEntry = {
  count: number;
  resetAt: number;
};

const rateStore = globalThis as typeof globalThis & {
  __m9AdminRateStore?: Map<string, RateEntry>;
};

function getRateMap() {
  if (!rateStore.__m9AdminRateStore) {
    rateStore.__m9AdminRateStore = new Map<string, RateEntry>();
  }
  return rateStore.__m9AdminRateStore;
}

export function getAdminCsrfCookieName() {
  return CSRF_COOKIE_NAME;
}

export function generateCsrfToken() {
  return crypto.randomUUID().replaceAll("-", "");
}

export function extractRequestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function isRateLimited(key: string) {
  const now = Date.now();
  const map = getRateMap();
  const current = map.get(key);

  if (!current || now > current.resetAt) {
    map.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  current.count += 1;
  map.set(key, current);
  return current.count > RATE_LIMIT_MAX;
}

function readCookieFromHeader(header: string | null, cookieName: string) {
  if (!header) return null;
  const parts = header.split(";").map((part) => part.trim());
  const match = parts.find((part) => part.startsWith(`${cookieName}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(cookieName.length + 1));
}

export function verifyCsrfFromForm(request: Request, formData: FormData) {
  const tokenInBody = String(formData.get("csrfToken") ?? "");
  const tokenInCookie = readCookieFromHeader(request.headers.get("cookie"), CSRF_COOKIE_NAME) ?? "";
  return Boolean(tokenInBody) && tokenInBody === tokenInCookie;
}

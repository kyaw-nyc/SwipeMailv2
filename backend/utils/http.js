export const buildRequestUrl = (req) => {
  const host = req.headers?.host ?? "localhost";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return new URL(req.url ?? "/", `${protocol}://${host}`);
};

const normalizeHeaders = (headers = {}) =>
  Object.entries(headers).reduce((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});

export const appendSetCookieHeader = (res, cookieValue) => {
  if (!cookieValue) return;
  const existing = res.getHeader?.("Set-Cookie");
  if (!existing) {
    res.setHeader?.("Set-Cookie", cookieValue);
    return;
  }
  if (Array.isArray(existing)) {
    res.setHeader?.("Set-Cookie", [...existing, cookieValue]);
    return;
  }
  res.setHeader?.("Set-Cookie", [existing, cookieValue]);
};

export const sendJson = (res, status, body, headers = {}) => {
  const payload = typeof body === "string" ? body : JSON.stringify(body ?? {});
  res.statusCode = status;
  res.setHeader?.(
    "Content-Type",
    typeof body === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8"
  );
  const normalized = normalizeHeaders(headers);
  Object.entries(normalized).forEach(([key, value]) => {
    res.setHeader?.(key, value);
  });
  res.end?.(payload);
};

export const sendError = (res, status, message) => {
  sendJson(res, status, { error: message });
};

export const redirect = (res, location, cookies = []) => {
  cookies.filter(Boolean).forEach((cookie) => appendSetCookieHeader(res, cookie));
  res.statusCode = 302;
  res.setHeader?.("Location", location);
  res.end?.();
};

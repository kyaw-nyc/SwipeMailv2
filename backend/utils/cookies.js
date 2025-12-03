const trim = (value = "") => value.trim();

export const parseCookies = (header = "") => {
  if (!header) return {};
  return header
    .split(";")
    .map(trim)
    .filter(Boolean)
    .reduce((acc, part) => {
      const [name, ...valueParts] = part.split("=");
      if (!name) {
        return acc;
      }
      const value = valueParts.join("=");
      acc[name] = decodeURIComponent(value ?? "");
      return acc;
    }, {});
};

const formatSameSite = (value) => {
  if (!value) return undefined;
  const normalized = `${value}`.toLowerCase();
  if (normalized === "strict") return "Strict";
  if (normalized === "none") return "None";
  return "Lax";
};

export const serializeCookie = (name, value, options = {}) => {
  if (!name) {
    throw new Error("Cookie name is required");
  }
  const segments = [`${name}=${encodeURIComponent(value ?? "")}`];
  if (options.maxAge !== undefined) {
    const maxAge = Number(options.maxAge);
    if (!Number.isNaN(maxAge)) {
      segments.push(`Max-Age=${Math.floor(maxAge)}`);
    }
  }
  if (options.expires) {
    const expires =
      options.expires instanceof Date ? options.expires : new Date(options.expires);
    if (!Number.isNaN(expires.valueOf())) {
      segments.push(`Expires=${expires.toUTCString()}`);
    }
  }
  segments.push(`Path=${options.path ?? "/"}`);
  if (options.domain) {
    segments.push(`Domain=${options.domain}`);
  }
  if (options.httpOnly) {
    segments.push("HttpOnly");
  }
  if (options.secure) {
    segments.push("Secure");
  }
  const sameSite = formatSameSite(options.sameSite);
  if (sameSite) {
    segments.push(`SameSite=${sameSite}`);
  }
  return segments.join("; ");
};

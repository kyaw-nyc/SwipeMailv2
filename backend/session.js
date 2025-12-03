import crypto from "node:crypto";
import { parseCookies, serializeCookie } from "./utils/cookies.js";

const SESSION_COOKIE = "swipemail_session";
const STATE_COOKIE = "swipemail_oauth_state";

const isProduction = process.env.NODE_ENV === "production";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const STATE_TTL_SECONDS = 10 * 60; // 10 minutes

const getSessionSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is missing");
  }
  if (secret.length < 16) {
    throw new Error("SESSION_SECRET must be at least 16 characters long");
  }
  return secret;
};

const createKey = () =>
  crypto.createHash("sha256").update(getSessionSecret()).digest();

const encode = (value) => {
  const key = createKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const payload = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
};

const decode = (token) => {
  const key = createKey();
  const buffer = Buffer.from(token, "base64url");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
};

const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
};

export const readSession = (req) => {
  try {
    const cookies = parseCookies(req.headers?.cookie ?? "");
    const token = cookies[SESSION_COOKIE];
    if (!token) return null;
    return decode(token);
  } catch (error) {
    console.warn("Failed to read session", error);
    return null;
  }
};

export const createSessionCookie = (session) =>
  serializeCookie(SESSION_COOKIE, encode(session), {
    ...baseCookieOptions,
    secure: isProduction,
    maxAge: SESSION_TTL_SECONDS,
  });

export const clearSessionCookie = () =>
  serializeCookie(SESSION_COOKIE, "", {
    ...baseCookieOptions,
    secure: isProduction,
    maxAge: 0,
  });

export const readStateCookie = (req) => {
  const cookies = parseCookies(req.headers?.cookie ?? "");
  return cookies[STATE_COOKIE] ?? null;
};

export const createStateCookie = (value) =>
  serializeCookie(STATE_COOKIE, value, {
    ...baseCookieOptions,
    secure: isProduction,
    maxAge: STATE_TTL_SECONDS,
  });

export const clearStateCookie = () =>
  serializeCookie(STATE_COOKIE, "", {
    ...baseCookieOptions,
    secure: isProduction,
    maxAge: 0,
  });

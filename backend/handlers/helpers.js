import { HttpError } from "../errors.js";
import { readSession, createSessionCookie } from "../session.js";
import { appendSetCookieHeader } from "../utils/http.js";
import { refreshAccessToken } from "../google/oauth.js";

const shouldRefresh = (session) => {
  const expiresAt = Number(session?.accessTokenExpiresAt ?? 0);
  if (!expiresAt) return true;
  return Date.now() >= expiresAt - 60_000;
};

export const requireSession = (req) => {
  const session = readSession(req);
  if (!session) {
    throw new HttpError(401, "Authentication required");
  }
  if (!session.refreshToken) {
    throw new HttpError(401, "Google session is incomplete. Please sign in again.");
  }
  return session;
};

export const ensureFreshAccessToken = async (req, res, session) => {
  if (!shouldRefresh(session)) {
    return session;
  }
  try {
    const refreshed = await refreshAccessToken(session.refreshToken);
    const updatedSession = {
      ...session,
      accessToken: refreshed.access_token,
      accessTokenExpiresAt: Date.now() + ((Number(refreshed.expires_in) || 3600) * 1000),
      scope: refreshed.scope ?? session.scope,
    };
    appendSetCookieHeader(res, createSessionCookie(updatedSession));
    return updatedSession;
  } catch (error) {
    console.error("Failed to refresh access token", error);
    throw new HttpError(401, "Google session expired. Please sign in again.");
  }
};

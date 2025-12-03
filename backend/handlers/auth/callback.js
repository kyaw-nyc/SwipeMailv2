import { HttpError } from "../../errors.js";
import { createSessionCookie, clearStateCookie, readStateCookie } from "../../session.js";
import { buildRequestUrl, redirect } from "../../utils/http.js";
import {
  exchangeCodeForTokens,
  fetchUserProfile,
  getFrontendBaseUrl,
} from "../../google/oauth.js";

const createErrorRedirect = (reason) => {
  const base = getFrontendBaseUrl();
  const url = new URL(base);
  url.searchParams.set("authError", reason);
  return url.toString();
};

const callbackHandler = async (req, res) => {
  const url = buildRequestUrl(req);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const storedState = readStateCookie(req);

  if (!code) {
    const target = createErrorRedirect("missing_code");
    redirect(res, target, [clearStateCookie()]);
    return;
  }

  if (!storedState || storedState !== returnedState) {
    const target = createErrorRedirect("state_mismatch");
    redirect(res, target, [clearStateCookie()]);
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      throw new HttpError(
        400,
        "Google did not return a refresh token. Try removing SwipeMail from your Google account and signing in again."
      );
    }

    const profile = await fetchUserProfile(tokens.access_token);
    const session = {
      version: 1,
      user: {
        id: profile.sub,
        email: profile.email,
        name: profile.name ?? profile.given_name ?? profile.email,
        picture: profile.picture ?? null,
      },
      scope: tokens.scope,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: Date.now() + ((Number(tokens.expires_in) || 3600) * 1000),
    };

    const target = getFrontendBaseUrl();
    redirect(res, target, [createSessionCookie(session), clearStateCookie()]);
  } catch (error) {
    console.error("OAuth callback failed", error);
    const reason = error instanceof HttpError ? "oauth_error" : "callback_failed";
    const target = createErrorRedirect(reason);
    redirect(res, target, [clearStateCookie()]);
  }
};

export default callbackHandler;

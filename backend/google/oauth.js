const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "openid",
  "email",
  "profile",
];

const getClientId = () => {
  const value = process.env.GOOGLE_CLIENT_ID;
  if (!value) {
    throw new Error("GOOGLE_CLIENT_ID is missing");
  }
  return value;
};

const getClientSecret = () => {
  const value = process.env.GOOGLE_CLIENT_SECRET;
  if (!value) {
    throw new Error("GOOGLE_CLIENT_SECRET is missing");
  }
  return value;
};

const requireBaseUrl = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is missing`);
  }
  return value.replace(/\/$/, "");
};

const getAuthBaseUrl = () =>
  (process.env.AUTH_BASE_URL ?? process.env.APP_BASE_URL)
    ? (process.env.AUTH_BASE_URL ?? process.env.APP_BASE_URL).replace(/\/$/, "")
    : requireBaseUrl("APP_BASE_URL");

export const getFrontendBaseUrl = () => requireBaseUrl("APP_BASE_URL");

export const getRedirectUri = () => `${getAuthBaseUrl()}/api/auth/callback`;

export const buildOAuthUrl = (state) => {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: SCOPES.join(" "),
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
};

const formRequest = (payload) =>
  new URLSearchParams(payload).toString();

const handleTokenResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    const message = data?.error_description || data?.error || "Google token exchange failed";
    throw new Error(message);
  }
  return data;
};

export const exchangeCodeForTokens = async (code) => {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formRequest({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
      access_type: "offline",
    }),
  });
  return handleTokenResponse(response);
};

export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formRequest({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: "refresh_token",
    }),
  });
  return handleTokenResponse(response);
};

export const fetchUserProfile = async (accessToken) => {
  const response = await fetch(USERINFO_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch Google profile");
  }
  return response.json();
};

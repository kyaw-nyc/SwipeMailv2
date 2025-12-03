import { clearSessionCookie } from "../../session.js";
import { appendSetCookieHeader, sendJson } from "../../utils/http.js";

const logoutHandler = (_req, res) => {
  appendSetCookieHeader(res, clearSessionCookie());
  sendJson(res, 200, { success: true });
};

export default logoutHandler;

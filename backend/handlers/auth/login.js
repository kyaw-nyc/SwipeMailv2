import crypto from "node:crypto";
import { buildOAuthUrl } from "../../google/oauth.js";
import { createStateCookie } from "../../session.js";
import { redirect } from "../../utils/http.js";

const createState = () => crypto.randomBytes(16).toString("hex");

const loginHandler = async (_req, res) => {
  const state = createState();
  const authUrl = buildOAuthUrl(state);
  const stateCookie = createStateCookie(state);
  redirect(res, authUrl, [stateCookie]);
};

export default loginHandler;

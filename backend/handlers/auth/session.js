import { readSession } from "../../session.js";
import { sendJson } from "../../utils/http.js";

const sessionHandler = (req, res) => {
  const session = readSession(req);
  if (!session) {
    sendJson(res, 401, { error: "Not signed in" });
    return;
  }

  sendJson(res, 200, {
    user: session.user,
    scope: session.scope,
  });
};

export default sessionHandler;

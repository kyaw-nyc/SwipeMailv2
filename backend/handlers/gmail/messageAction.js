import { HttpError } from "../../errors.js";
import { archiveEmail, GmailApiError, markAsRead, starEmail } from "../../google/gmail.js";
import { ensureFreshAccessToken, requireSession } from "../helpers.js";
import { buildRequestUrl, sendError, sendJson } from "../../utils/http.js";

const getMessageId = (req) => {
  const url = buildRequestUrl(req);
  const messageId = url.searchParams.get("messageId");
  if (!messageId) {
    throw new HttpError(400, "messageId is required");
  }
  return messageId;
};

const createActionHandler = (action) => async (req, res) => {
  try {
    let session = requireSession(req);
    session = await ensureFreshAccessToken(req, res, session);
    const messageId = getMessageId(req);
    await action(session.accessToken, messageId);
    sendJson(res, 200, { success: true });
  } catch (error) {
    if (error instanceof HttpError) {
      sendError(res, error.status, error.message);
      return;
    }
    if (error instanceof GmailApiError) {
      sendError(res, error.status ?? 500, error.message);
      return;
    }
    console.error("Failed to update Gmail message", error);
    sendError(res, 500, "Unable to update Gmail");
  }
};

export const markReadHandler = createActionHandler(markAsRead);
export const archiveHandler = createActionHandler(archiveEmail);
export const starHandler = createActionHandler(starEmail);

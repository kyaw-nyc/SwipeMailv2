import { HttpError } from "../../errors.js";
import {
  fetchEmailsByLabel,
  fetchRecentEmails,
  GmailApiError,
} from "../../google/gmail.js";
import { ensureFreshAccessToken, requireSession } from "../helpers.js";
import { buildRequestUrl, sendError, sendJson } from "../../utils/http.js";

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

const messagesHandler = async (req, res) => {
  try {
    let session = requireSession(req);
    session = await ensureFreshAccessToken(req, res, session);
    const url = buildRequestUrl(req);
    const labelId = url.searchParams.get("labelId");
    const pageToken = url.searchParams.get("pageToken");
    const maxResults = parseNumber(url.searchParams.get("maxResults"), 50);
    const unreadOnlyParam = url.searchParams.get("unreadOnly");
    const unreadOnly =
      unreadOnlyParam === null ? undefined : unreadOnlyParam !== "false";
    const options = {
      maxResults,
      pageToken,
      ...(unreadOnly === undefined ? {} : { unreadOnly }),
    };

    const payload = labelId
      ? await fetchEmailsByLabel(session.accessToken, labelId, options)
      : await fetchRecentEmails(session.accessToken, options);

    sendJson(res, 200, payload);
  } catch (error) {
    if (error instanceof HttpError) {
      sendError(res, error.status, error.message);
      return;
    }
    if (error instanceof GmailApiError) {
      sendError(res, error.status ?? 500, error.message);
      return;
    }
    console.error("Failed to fetch Gmail messages", error);
    sendError(res, 500, "Unable to fetch Gmail messages");
  }
};

export default messagesHandler;

import { HttpError } from "../../errors.js";
import { fetchLabels as gmailFetchLabels, GmailApiError } from "../../google/gmail.js";
import { ensureFreshAccessToken, requireSession } from "../helpers.js";
import { sendError, sendJson } from "../../utils/http.js";

const hiddenSystemLabels = new Set([
  "CHAT",
  "DRAFT",
  "SENT",
  "SPAM",
  "TRASH",
  "INBOX",
  "STARRED",
  "UNREAD",
  "YELLOW_STAR",
  "CATEGORY_PERSONAL",
  "CATEGORY_SOCIAL",
  "CATEGORY_UPDATES",
  "CATEGORY_FORUMS",
  "CATEGORY_PURCHASES",
  "CATEGORY_FINANCE",
  "CATEGORY_TRAVEL",
  "CATEGORY_NOTIFICATIONS",
  "CATEGORY_PRIMARY",
]);

const systemLabelNames = {
  INBOX: "Inbox",
  STARRED: "Starred",
  IMPORTANT: "Important",
  UNREAD: "Unread",
  SNOOZED: "Snoozed",
  CATEGORY_PRIMARY: "Primary",
  CATEGORY_PROMOTIONS: "Promotions",
  CATEGORY_SOCIAL: "Social",
  CATEGORY_UPDATES: "Updates",
  CATEGORY_FORUMS: "Forums",
};

const alwaysInclude = new Set(["CATEGORY_PROMOTIONS"]);

const labelsHandler = async (req, res) => {
  try {
    let session = requireSession(req);
    session = await ensureFreshAccessToken(req, res, session);
    const response = await gmailFetchLabels(session.accessToken);
    const labels = response
      .filter(
        (label) =>
          label.type === "user" ||
          alwaysInclude.has(label.id) ||
          (!hiddenSystemLabels.has(label.id) &&
            label.labelListVisibility !== "labelHide")
      )
      .map((label) => ({
        id: label.id,
        name: label.name,
        type: label.type,
        displayName:
          label.type === "system"
            ? systemLabelNames[label.id] ?? label.name ?? label.id
            : label.name ?? label.id,
      }))
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "system" ? -1 : 1;
        }
        return a.displayName.localeCompare(b.displayName);
      });

    sendJson(res, 200, labels);
  } catch (error) {
    if (error instanceof HttpError) {
      sendError(res, error.status, error.message);
      return;
    }
    if (error instanceof GmailApiError) {
      sendError(res, error.status ?? 500, error.message);
      return;
    }
    console.error("Failed to fetch Gmail labels", error);
    sendError(res, 500, "Unable to fetch Gmail labels");
  }
};

export default labelsHandler;

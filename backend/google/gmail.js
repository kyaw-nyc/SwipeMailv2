const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

const metadataHeaders = ["Subject", "From", "To", "Date"];

export class GmailApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "GmailApiError";
    this.status = status;
  }
}

const decodeBody = (payload) => {
  if (!payload) return "";
  const candidate =
    payload.body?.data ??
    payload.parts?.find((part) => part.mimeType === "text/html")?.body?.data ??
    payload.parts?.find((part) => part.mimeType === "text/plain")?.body?.data ??
    payload.parts?.[0]?.body?.data;

  if (!candidate) return "";

  try {
    const normalized = candidate.replace(/-/g, "+").replace(/_/g, "/");
    const buffer = Buffer.from(normalized, "base64");
    return buffer.toString("utf8");
  } catch (error) {
    console.warn("Failed to decode Gmail body", error);
    return "";
  }
};

const getHeaderValue = (headers, name) => {
  const found = headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase());
  return found?.value ?? "";
};

const normalizeWhitespace = (value = "") =>
  value
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const buildPreview = (text = "") =>
  text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 420);

const mapMessage = (message) => {
  const headers = message.payload?.headers ?? [];
  const rawBody = decodeBody(message.payload);
  const normalizedBody = normalizeWhitespace(rawBody);
  const snippet = message.snippet ?? "";
  const normalizedSnippet = normalizeWhitespace(snippet);
  return {
    id: message.id,
    threadId: message.threadId,
    subject: getHeaderValue(headers, "Subject") || "(No subject)",
    from: getHeaderValue(headers, "From") || "Unknown sender",
    to: getHeaderValue(headers, "To") || "",
    snippet,
    rawBody,
    plainTextBody: normalizedBody || normalizedSnippet,
    preview: buildPreview(normalizedBody || normalizedSnippet || snippet),
    date: getHeaderValue(headers, "Date"),
    internalDate: Number(message.internalDate ?? Date.now()),
    labelIds: message.labelIds ?? [],
  };
};

const gmailRequest = async (accessToken, endpoint, init = {}) => {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    ...(init.headers ?? {}),
  };
  if (init.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(`${GMAIL_API_BASE}${endpoint}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new GmailApiError(text || "Gmail API error", response.status);
  }

  return response.json();
};

const listMessages = async (
  accessToken,
  { labelId = null, maxResults = 50, pageToken = null, unreadOnly = !labelId } = {}
) => {
  if (!accessToken) {
    throw new Error("Missing Gmail access token");
  }
  const params = new URLSearchParams();
  params.set("maxResults", String(Math.max(1, Math.min(Number(maxResults) || 50, 100))));
  const filters = labelId ? [labelId] : ["INBOX", unreadOnly ? "UNREAD" : null].filter(Boolean);
  filters.forEach((label) => params.append("labelIds", label));
  if (!labelId) {
    params.set("q", "-category:promotions");
  }
  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const listResponse = await gmailRequest(accessToken, `/messages?${params.toString()}`);
  const identifiers = listResponse.messages ?? [];
  if (!identifiers.length) {
    return {
      emails: [],
      nextPageToken: listResponse.nextPageToken ?? null,
    };
  }

  const detailParams = `format=full&metadataHeaders=${metadataHeaders.join("&metadataHeaders=")}`;
  const detailPromises = identifiers.map((message) =>
    gmailRequest(accessToken, `/messages/${message.id}?${detailParams}`)
  );
  const results = await Promise.allSettled(detailPromises);
  const fulfilled = results.filter((result) => result.status === "fulfilled");
  if (fulfilled.length === 0) {
    throw new GmailApiError("Failed to load Gmail messages", 500);
  }

  return {
    emails: fulfilled
      .map((result) => mapMessage(result.value))
      .sort((a, b) => b.internalDate - a.internalDate),
    nextPageToken: listResponse.nextPageToken ?? null,
  };
};

const modifyMessage = (accessToken, messageId, body) =>
  gmailRequest(accessToken, `/messages/${messageId}/modify`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const fetchRecentEmails = (accessToken, options = {}) =>
  listMessages(accessToken, options);

export const fetchEmailsByLabel = (accessToken, labelId, options = {}) =>
  listMessages(accessToken, { ...options, labelId });

export const fetchLabels = async (accessToken) => {
  if (!accessToken) {
    throw new Error("Missing Gmail access token");
  }
  const response = await gmailRequest(accessToken, "/labels");
  return response.labels ?? [];
};

export const markAsRead = (accessToken, messageId) =>
  modifyMessage(accessToken, messageId, { removeLabelIds: ["UNREAD"] });

export const archiveEmail = (accessToken, messageId) =>
  modifyMessage(accessToken, messageId, { removeLabelIds: ["INBOX"] });

export const starEmail = (accessToken, messageId) =>
  modifyMessage(accessToken, messageId, { addLabelIds: ["STARRED"] });

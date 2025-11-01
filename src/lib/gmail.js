const GMAIL_API_ROOT = "https://gmail.googleapis.com/gmail/v1/users/me";

const metadataHeaders = ["Subject", "From", "Date"];

class GmailApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "GmailApiError";
    this.status = status;
  }
}

const getHeaderValue = (headers, name) => {
  const found = headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase());
  return found?.value ?? "";
};

const decodeBody = (payload) => {
  if (!payload) return "";
  const data =
    payload.body?.data ??
    payload.parts?.find((part) => part.mimeType === "text/plain")?.body?.data ??
    payload.parts?.[0]?.body?.data;

  if (!data) return "";

  try {
    const cleaned = data.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = window.atob(cleaned);
    try {
      return decodeURIComponent(
        decoded
          .split("")
          .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join("")
      );
    } catch {
      return decoded;
    }
  } catch (err) {
    console.warn("Failed to decode message body", err);
    return "";
  }
};

const sanitizeBody = (text) => {
  if (!text) return "";
  return text
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/=\r?\n/g, "")
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim();
};

const mapMessage = (message) => {
  const headers = message.payload?.headers ?? [];
  const subject = getHeaderValue(headers, "Subject") || "(No subject)";
  const from = getHeaderValue(headers, "From") || "Unknown sender";
  const date = getHeaderValue(headers, "Date");
  const snippet = message.snippet ?? "";
  const body = decodeBody(message.payload);
  const cleanedBody = sanitizeBody(body);
  const preview = cleanedBody ? cleanedBody.slice(0, 420) : sanitizeBody(snippet).slice(0, 240);

  return {
    id: message.id,
    threadId: message.threadId,
    subject,
    from,
    snippet,
    body,
    preview,
    date,
    internalDate: Number(message.internalDate ?? Date.now()),
    labelIds: message.labelIds ?? [],
  };
};

const gmailFetch = async (accessToken, endpoint) => {
  const response = await fetch(`${GMAIL_API_ROOT}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new GmailApiError(
      errorText || "Unknown Gmail API error",
      response.status
    );
  }

  return response.json();
};

const gmailMutate = async (accessToken, endpoint, body) => {
  const response = await fetch(`${GMAIL_API_ROOT}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new GmailApiError(
      errorText || "Unknown Gmail API error",
      response.status
    );
  }

  return response.json();
};

export const fetchRecentEmails = async (accessToken, maxResults = 50) => {
  if (!accessToken) {
    throw new Error("Missing Google access token");
  }

  const listResponse = await gmailFetch(
    accessToken,
    `/messages?maxResults=${maxResults}&labelIds=INBOX&labelIds=UNREAD`
  );

  const messageIds = listResponse.messages ?? [];
  if (messageIds.length === 0) return [];

  const params = `format=full&metadataHeaders=${metadataHeaders.join("&metadataHeaders=")}`;
  const detailPromises = messageIds.map((message) =>
    gmailFetch(accessToken, `/messages/${message.id}?${params}`)
  );

  const detailedMessages = await Promise.allSettled(detailPromises);

  return detailedMessages
    .filter((result) => result.status === "fulfilled")
    .map((result) => mapMessage(result.value))
    .sort((a, b) => b.internalDate - a.internalDate);
};

export const markAsRead = (accessToken, messageId) =>
  gmailMutate(accessToken, `/messages/${messageId}/modify`, {
    removeLabelIds: ["UNREAD"],
  });

export const archiveEmail = (accessToken, messageId) =>
  gmailMutate(accessToken, `/messages/${messageId}/modify`, {
    removeLabelIds: ["INBOX"],
  });

export const starEmail = (accessToken, messageId) =>
  gmailMutate(accessToken, `/messages/${messageId}/modify`, {
    addLabelIds: ["STARRED"],
  });

export { GmailApiError };

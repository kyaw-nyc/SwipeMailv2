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

const escapeHtml = (value = "") =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizePlainText = (text = "") =>
  text
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const renderPlainTextAsHtml = (text = "") => {
  if (!text) return "";
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
};

const ALLOWED_TAGS = new Set([
  "a",
  "abbr",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "dl",
  "dt",
  "dd",
  "em",
  "figure",
  "figcaption",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "img",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
]);

const ALLOWED_ATTRIBUTES = {
  a: ["href", "title"],
  img: ["src", "alt", "width", "height", "loading"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan"],
};

const canUseDOMParser = typeof window !== "undefined" && typeof window.DOMParser !== "undefined";

const sanitizeHtmlContent = (html) => {
  if (!canUseDOMParser) {
    return renderPlainTextAsHtml(normalizePlainText(html));
  }

  try {
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const { body } = doc;

    if (!body) return "";

    body.querySelectorAll("script, style, link, meta, title, iframe, object, embed, form").forEach((node) =>
      node.remove()
    );

    const unwrapElement = (element) => {
      const parent = element.parentNode;
      if (!parent) {
        element.remove();
        return;
      }
      const fragment = doc.createDocumentFragment();
      while (element.firstChild) {
        fragment.appendChild(element.firstChild);
      }
      parent.replaceChild(fragment, element);
    };

    body.querySelectorAll("*").forEach((element) => {
      const tag = element.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        unwrapElement(element);
        return;
      }

      const allowedAttrs = ALLOWED_ATTRIBUTES[tag] ?? [];
      Array.from(element.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (!allowedAttrs.includes(name)) {
          element.removeAttribute(attr.name);
          return;
        }

        if (tag === "a" && name === "href") {
          const value = attr.value?.trim() ?? "";
          if (!value || /^javascript:/i.test(value) || /^data:/i.test(value)) {
            element.removeAttribute(attr.name);
            return;
          }
          element.setAttribute("target", "_blank");
          element.setAttribute("rel", "noopener noreferrer");
        } else if (tag === "img" && name === "src") {
          const value = attr.value?.trim() ?? "";
          const isHttp = /^https?:\/\//i.test(value);
          const isDataImage = /^data:image\//i.test(value);
          if (!isHttp && !isDataImage) {
            element.removeAttribute(attr.name);
            return;
          }
          if (!element.getAttribute("loading")) {
            element.setAttribute("loading", "lazy");
          }
        } else if (tag === "img" && (name === "width" || name === "height")) {
          const parsed = parseInt(attr.value, 10);
          if (Number.isNaN(parsed) || parsed <= 0) {
            element.removeAttribute(attr.name);
          } else {
            element.setAttribute(attr.name, String(parsed));
          }
        } else if (tag === "img" && name === "loading") {
          const value = attr.value?.toLowerCase();
          if (value !== "lazy" && value !== "auto") {
            element.setAttribute("loading", "lazy");
          }
        }
      });
    });

    return body.innerHTML;
  } catch (error) {
    console.warn("Failed to sanitize HTML email body", error);
    return renderPlainTextAsHtml(normalizePlainText(html));
  }
};

const extractTextContent = (html) => {
  if (!html) return "";
  if (!canUseDOMParser) {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  try {
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
    return doc.body?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  } catch {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
};

export const formatBodyForDisplay = (rawBody, snippet) => {
  const trimmedBody = rawBody?.trim() ?? "";
  const fallbackSnippet = snippet ?? "";

  if (trimmedBody) {
    const looksLikeHtml = /<[^>]+>/.test(trimmedBody);
    if (looksLikeHtml) {
      const sanitizedHtml = sanitizeHtmlContent(trimmedBody);
      const textContent = extractTextContent(sanitizedHtml);

      if (sanitizedHtml) {
        return {
          html: sanitizedHtml,
          text: textContent || normalizePlainText(fallbackSnippet),
        };
      }
    }

    const normalized = normalizePlainText(trimmedBody);
    if (normalized) {
      return {
        html: renderPlainTextAsHtml(normalized),
        text: normalized,
      };
    }
  }

  const normalizedSnippet = normalizePlainText(fallbackSnippet);
  if (normalizedSnippet) {
    return {
      html: renderPlainTextAsHtml(normalizedSnippet),
      text: normalizedSnippet,
    };
  }

  return {
    html: "<p>No preview available.</p>",
    text: "",
  };
};

const buildPreview = (text) =>
  (text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 420);

const mapMessage = (message) => {
  const headers = message.payload?.headers ?? [];
  const subject = getHeaderValue(headers, "Subject") || "(No subject)";
  const from = getHeaderValue(headers, "From") || "Unknown sender";
  const date = getHeaderValue(headers, "Date");
  const snippet = message.snippet ?? "";
  const body = decodeBody(message.payload);
  const normalizedBody = normalizePlainText(body);
  const normalizedSnippet = normalizePlainText(snippet);
  const preview = buildPreview(normalizedBody || normalizedSnippet || snippet);

  return {
    id: message.id,
    threadId: message.threadId,
    subject,
    from,
    snippet,
    rawBody: body,
    plainTextBody: normalizedBody || normalizedSnippet,
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

const fetchMessages = async (accessToken, { maxResults = 50, labelIds = [], query } = {}) => {
  if (!accessToken) {
    throw new Error("Missing Google access token");
  }

  const labelQuery = labelIds
    .filter(Boolean)
    .map((labelId) => `labelIds=${encodeURIComponent(labelId)}`)
    .join("&");
  const searchQuery = query ? `&q=${encodeURIComponent(query)}` : "";
  const base = `/messages?maxResults=${maxResults}`;
  const listEndpoint = `${base}${labelQuery ? `&${labelQuery}` : ""}${searchQuery}`;

  const listResponse = await gmailFetch(accessToken, listEndpoint);

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

export const fetchRecentEmails = (accessToken, maxResults = 50) =>
  fetchMessages(accessToken, { maxResults, labelIds: ["INBOX", "UNREAD"] });

export const fetchEmailsByLabel = (accessToken, labelId, maxResults = 50) => {
  if (!labelId) {
    throw new Error("Missing label identifier");
  }
  return fetchMessages(accessToken, { maxResults, labelIds: [labelId] });
};

export const fetchLabels = async (accessToken) => {
    if (!accessToken) {
      throw new Error("Missing Google access token");
    }

    const response = await gmailFetch(accessToken, "/labels");
    const labels = response.labels ?? [];

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
      "CATEGORY_PROMOTIONS",
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
    };

    return labels
      .filter((label) => label.labelListVisibility !== "labelHide")
      .filter((label) => label.type === "user" || !hiddenSystemLabels.has(label.id))
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

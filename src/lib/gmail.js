class GmailApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "GmailApiError";
    this.status = status;
  }
}

const escapeHtml = (value = "") =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const stripZeroWidth = (value = "") =>
  value
    .replace(/&(zwj|zwnj);/gi, "")
    .replace(/&#820[45];/g, "")
    .replace(/[\u200b-\u200f\uFEFF]+/g, "");

const normalizePlainText = (text = "") =>
  stripZeroWidth(text)
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const renderPlainTextAsHtml = (text = "") => {
  if (!text) return "";
  return stripZeroWidth(text)
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

    body
      .querySelectorAll("script, style, link, meta, title, iframe, object, embed, form")
      .forEach((node) => node.remove());

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

    return stripZeroWidth(body.innerHTML);
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

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const resolveApiPath = (path) => {
  if (!path.startsWith("/")) {
    return path;
  }
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
};

const apiFetch = async (path, options = {}) => {
  const response = await fetch(resolveApiPath(path), {
    credentials: "include",
    ...options,
    headers: {
      ...(options.headers ?? {}),
    },
  });
  const contentType = response.headers?.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  let payload = null;
  try {
    payload = isJson ? await response.json() : await response.text();
  } catch (error) {
    payload = null;
    if (isJson) {
      console.warn("Failed to parse API response", error);
    }
  }

  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" ? payload.error : null) ||
      (typeof payload === "string" && payload) ||
      "Request failed";
    throw new GmailApiError(message, response.status);
  }

  return payload;
};

const buildQueryString = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
};

export const fetchRecentEmails = (maxResults = 50, pageToken = null) => {
  const query = buildQueryString({
    maxResults,
    pageToken,
  });
  return apiFetch(`/api/gmail/messages${query}`);
};

export const fetchEmailsByLabel = (labelId, maxResults = 50, pageToken = null) => {
  if (!labelId) {
    throw new Error("Label identifier is required");
  }
  const query = buildQueryString({
    labelId,
    maxResults,
    pageToken,
  });
  return apiFetch(`/api/gmail/messages${query}`);
};

export const fetchLabels = () => apiFetch("/api/gmail/labels");

const postAction = (path, messageId) => {
  if (!messageId) {
    throw new Error("messageId is required");
  }
  const query = buildQueryString({ messageId });
  return apiFetch(`${path}${query}`, {
    method: "POST",
  });
};

export const markAsRead = (messageId) =>
  postAction("/api/gmail/messages/mark-read", messageId);

export const archiveEmail = (messageId) =>
  postAction("/api/gmail/messages/archive", messageId);

export const starEmail = (messageId) => postAction("/api/gmail/messages/star", messageId);

export { GmailApiError };

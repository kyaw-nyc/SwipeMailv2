import loginHandler from "../backend/handlers/auth/login.js";
import callbackHandler from "../backend/handlers/auth/callback.js";
import sessionHandler from "../backend/handlers/auth/session.js";
import logoutHandler from "../backend/handlers/auth/logout.js";
import messagesHandler from "../backend/handlers/gmail/messages.js";
import labelsHandler from "../backend/handlers/gmail/labels.js";
import {
  archiveHandler,
  markReadHandler,
  starHandler,
} from "../backend/handlers/gmail/messageAction.js";

export const routes = [
  { method: "GET", path: "/api/auth/login", handler: loginHandler },
  { method: "GET", path: "/api/auth/callback", handler: callbackHandler },
  { method: "GET", path: "/api/auth/session", handler: sessionHandler },
  { method: "POST", path: "/api/auth/logout", handler: logoutHandler },
  { method: "GET", path: "/api/gmail/messages", handler: messagesHandler },
  { method: "GET", path: "/api/gmail/labels", handler: labelsHandler },
  { method: "POST", path: "/api/gmail/messages/mark-read", handler: markReadHandler },
  { method: "POST", path: "/api/gmail/messages/archive", handler: archiveHandler },
  { method: "POST", path: "/api/gmail/messages/star", handler: starHandler },
];

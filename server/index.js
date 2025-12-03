import http from "node:http";
import { loadEnvFile } from "./loadEnv.js";
import { routes } from "./routes.js";
import { sendError } from "../backend/utils/http.js";

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

loadEnvFile();

const PORT = Number(process.env.API_PORT || 8787);

const createServer = () =>
  http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const route = routes.find(
      (candidate) => candidate.method === req.method && candidate.path === url.pathname
    );
    if (!route) {
      sendError(res, 404, "Not found");
      return;
    }
    Promise.resolve(route.handler(req, res)).catch((error) => {
      console.error("Unhandled API error", error);
      sendError(res, 500, "Unexpected server error");
    });
  });

const server = createServer();
server.listen(PORT, () => {
  console.log(`SwipeMail API listening on http://localhost:${PORT}`);
});

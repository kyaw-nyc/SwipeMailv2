# SwipeMail

SwipeMail is a Gmail triage client that turns your inbox into a deck of cards. Flick right to archive, left to mark as read, and up to star important threads. A split Inbox view, label filtering, and a lightweight Google OAuth gateway keep it grounded enough for everyday use while still feeling fast.

🎬 Product walk-through: https://www.youtube.com/watch?v=mbp3Ko2L7WQ

## Highlights

- **Card-first triage** – swipe gestures and keyboard arrows pipe actions directly into the Gmail API (archive, mark-as-read, star).
- **Real inbox context** – unread feed, label filters, incremental loading, formatted message body preview, and action history banners.
- **Server-managed auth** – a tiny Node/Vercel OAuth backend requests the `gmail.readonly`/`gmail.modify` scopes and stores the refresh token inside an encrypted HTTP-only cookie so the browser never sees secrets.
- **Inbox fallback** – switch to a traditional list + preview pane when you want to scan instead of swipe.

## Stack

- React 19 / Vite (Rolldown build)
- Node 18 serverless functions (Vercel + local dev server) for Google OAuth + Gmail proxying
- Gmail REST API (`gmail.users.messages` family of endpoints)
- Vanilla CSS for the tactile swipe deck and landing page animation

## Getting Started

```bash
npm install              # install deps
npm run api              # start the local OAuth/Gmail API server on http://localhost:8787
npm run dev              # Vite dev server on http://localhost:5173
npm run build            # create the production bundle in dist/
npm run preview          # serve the built app locally
```
## Environment Variables

Create a `.env` in the project root. Vite reads the `VITE_*` variables; the backend/serverless functions read the rest.

```
# Frontend
VITE_API_BASE_URL=http://localhost:8787   # leave empty in production so it hits /api on the same origin

# Backend / API
APP_BASE_URL=https://your-vercel-domain.vercel.app   # user-facing origin (or http://localhost:5173 locally)
AUTH_BASE_URL=http://localhost:8787                  # optional, only needed when the API runs on another origin during dev
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=super-secret-value
SESSION_SECRET=a-long-random-string-at-least-32-chars
API_PORT=8787                                        # optional override for `npm run api`
```

- `APP_BASE_URL` is where the browser lands after OAuth completes (Vercel production domain or `http://localhost:5173` in dev).
- `AUTH_BASE_URL` points to the API origin that handles `/api/auth/callback`. In production it matches `APP_BASE_URL`; in local dev it should be `http://localhost:8787`.
- `SESSION_SECRET` encrypts the refresh/access token bundle before it is written to an HTTP-only cookie. Generate a random string with at least 32 characters.

## OAuth + API Setup

1. **Create Google OAuth credentials**
   - In the Google Cloud console create an OAuth Client ID (type: Web Application).
   - Authorized JavaScript origins: add your dev host (`http://localhost:5173`) and production host (`https://your-vercel-domain.vercel.app` or custom domain).
   - Authorized redirect URIs: add the API callback for each environment (e.g. `http://localhost:8787/api/auth/callback` locally and your production `/api/auth/callback` URL).
   - Enable the Gmail API and allow the scopes `https://www.googleapis.com/auth/gmail.readonly` plus `https://www.googleapis.com/auth/gmail.modify`.
2. **Configure OAuth consent**
   - Keep the consent screen in testing while you iterate. Google will require a verification/security review before the app can be made public with the restricted Gmail scopes.
3. **Populate env vars**
   - Copy the Google client ID/secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
   - Double-check `APP_BASE_URL` / `AUTH_BASE_URL` match the origins you registered. If any part of the URI (scheme/host/port) differs, Google blocks the callback.

The backend exchanges authorization codes for access/refresh tokens, encrypts the bundle, stores it inside an HTTP-only cookie, and proxies all Gmail requests so the frontend never handles raw tokens.

## Project Structure

```
├── src/
│   ├── App.jsx               # Swipe deck + inbox shell
│   ├── lib/gmail.js          # Gmail formatter + frontend API helpers
│   ├── lib/auth.js           # Session + login/logout utilities
│   ├── pages/SignIn.jsx      # Landing screen that kicks off the OAuth flow
│   ├── components/           # UI building blocks (Squares background, panels, etc.)
│   └── AppRouter.jsx         # Routing between landing, swipe, learn-more
├── api/                      # Vercel serverless entrypoints
├── backend/                  # Shared OAuth/Gmail helpers consumed by both API + dev server
├── server/index.js           # Local API server (`npm run api`)
├── public/                   # Favicon + static assets
└── vite.config.js
```

## Deployment Notes

- Vercel automatically builds the Vite frontend and deploys the functions under `api/`. Add every env var above in the Vercel dashboard (Production + Preview).
- Leave `VITE_API_BASE_URL` empty in production so browser requests hit `/api/*` on the same origin. Only set it locally when the API server runs on another port.
- Anytime the domain changes (new preview URL, custom domain, etc.), update the Google OAuth credentials so the redirect URI stays in sync.
- The Gmail API quotas are generous for testing but monitor usage if you batch-archive thousands of messages.

## Troubleshooting

| Symptom | Suggested fix |
| --- | --- |
| OAuth redirect loops | Make sure `APP_BASE_URL`, `AUTH_BASE_URL`, and the Google OAuth redirect URIs all match exactly (scheme + host + port). |
| Gmail calls return 401/403 | Refresh the page to request a fresh access token or click “Grant Gmail access” to restart the OAuth flow. You can revoke the old refresh token from your Google Account security page. |
| Message bodies render blank | Some messages only contain attachments or unsupported MIME parts—switch to Gmail for full context. |

Enjoy the faster inbox. 🚀

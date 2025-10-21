<PROJECT>
name: CS160 Food Delivery (cs160-project)
source: /Users/josh/Desktop/Coding/cs160-project

# Copilot instructions for contributors and AI agents

This file contains concise, actionable guidance to help an AI coding agent be immediately productive in this repository. Focus on local setup, architecture, conventions, and the most important files to change.

## Big picture (2-3 lines)
- Full-stack app: FastAPI backend (backend/) + Next.js frontend (frontend/). Backend serves JSON APIs on port 8080 and uses SQLite for development (`backend/sqlite.db`). Frontend is a TypeScript Next.js app using the app-router and React contexts.

## Key entry points & where to edit
- Backend server: `backend/app/main.py` (FastAPI app, CORS, router registration).
- Backend auth & JWT: `backend/app/auth.py` (token creation/verification, `require_user` legacy header), `backend/app/routers/auth.py` (signup/login/google flows).
- DB and models: `backend/app/database.py`, `backend/app/models.py`, `backend/app/seed.py` (seeds `sqlite.db`).
- Frontend entry: `frontend/src/app` (Next.js pages using app-router).
- Frontend auth client & context: `frontend/src/lib/api/auth.ts`, `frontend/src/contexts/auth.tsx`, `frontend/src/components/provider/provider.tsx` (AuthProvider wiring).
- Frontend API base: `frontend/src/lib/api/endpoints.ts` (internal API URL).

## Local dev & useful commands
- Backend (from repo root):
  - create venv and install: `python3 -m venv .venv && source .venv/bin/activate && pip install -r backend/requirements.txt`
  - seed DB: `PYTHONPATH=. python -m backend.app.seed`
  - run server: `PYTHONPATH=. uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8080`
- Frontend:
  - install deps and run: `cd frontend && npm install && npm run dev` (default: http://localhost:3000)
- Tests:
  - run backend tests: `PYTHONPATH=. pytest -q` from repo root.

## Important conventions & patterns
- Python import path: many scripts expect `PYTHONPATH=.`; keep this when running tests or seed commands.
- Auth flows: JWT tokens are returned in responses and also set as a cookie `access_token`. For testing, a legacy header `X-User-Id` can be used (see `auth.require_user`) — tests rely on this.
- Database: development uses SQLite at `backend/sqlite.db`. Reseeding deletes this file then runs seed script (`backend/app/seed.py`).
- Frontend uses React Contexts (auth, cart, theme) under `frontend/src/contexts`. Prefer context hooks (e.g., `useAuth()`) when adding auth logic.
- API client: frontend functions in `frontend/src/lib/api/*` call endpoints under `/api/*` on the backend. The internal dev API base is `http://localhost:8080` (see `endpoints.ts`).

## Integration & cross-component notes
- Google OAuth: backend supports both modern client-side ID token flow (`POST /api/auth/google`) and legacy redirect flows (`/api/auth/google/login` and `/api/auth/google/callback`). Client code posts the Google ID token to `/api/auth/google`.
- CORS is configured in `backend/app/main.py` to allow `http://localhost:3000` — update if frontend origin changes.

## Where tests and quick checks live
- Unit tests: `tests/test_auth.py`, `tests/test_items.py`.
- Quick auth example script: `backend/test_auth_example.py`.
- Health check: GET `/healthz` on the backend.

## Small gotchas an agent should know
- Many scripts rely on environment variables: `SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FRONTEND_URL`. If missing, Google endpoints may return 501 or fail verification.
- The backend's default port varies in docs (8080 vs 8000). Current default in top-level README and code examples is 8080; `backend/app/main.py` CORS comment mentions 3000. Prefer 8080 for dev unless otherwise configured.
- Legacy `X-User-Id` header is intentionally present to keep tests/simple flows working; do not remove without updating tests.

## Example tasks an AI can perform confidently
- Add a new protected API route: create a router under `backend/app/routers`, use `Depends(get_current_user)` from `auth.py`, add tests to `tests/` and update frontend API hooks in `frontend/src/lib/api/`.
- Update frontend auth UI: modify `frontend/src/app/login/page.tsx` and rely on `useAuth()` from `frontend/src/contexts/auth.tsx`.
- Reseed DB in CI or locally: remove `backend/sqlite.db` then run `PYTHONPATH=. python -m backend.app.seed`.

## If you edit files, run these checks
- Run backend tests: `PYTHONPATH=. pytest -q`.
- Start backend and frontend together and test flow: seed DB, run uvicorn, then run `npm run dev` and exercise login/signup flows.

</PROJECT>

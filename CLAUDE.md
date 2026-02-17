# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MemberTrack is a healthcare application for The Bays Healthcare Group. It follows the organisation's standard two-project decoupled architecture defined in `docs/reference-architecture.md`.

## Architecture

Two separate projects in one repository communicating over HTTP/JSON:

- **frontend/** — React SPA (Vite, TypeScript, Tailwind CSS, shadcn/ui)
- **backend/** — .NET 8+ Web API (Controllers, Entity Framework Core, SQL Server)

Authentication uses Microsoft Entra ID: MSAL.js on the frontend acquires JWT tokens, the .NET API validates them via Microsoft.Identity.Web. All controllers require `[Authorize]` by default.

## Common Commands

### Frontend (run from `frontend/`)
```bash
npm install              # install dependencies
npm run dev              # dev server on http://localhost:3000
npm run build            # production build to dist/
npx shadcn@latest add <component>  # add a shadcn/ui component
```

### Backend (run from repo root or `backend/`)
```bash
dotnet run --project backend/backend.csproj   # API on https://localhost:5001
dotnet build backend/backend.csproj
dotnet publish backend/backend.csproj -c Release -o ./publish

# EF Core migrations
dotnet ef migrations add <Name> --project backend
dotnet ef database update --project backend
```

### Run Both
VS Code: `Ctrl+Shift+B` → "Run All" (requires `.vscode/tasks.json`)

## Key Conventions

- **Controllers, not Minimal APIs** — one controller per domain area, handles HTTP concerns only
- **DTOs separate from Entities** — API responses use DTOs in `backend/DTOs/`, never expose EF entity classes directly
- **Centralised API services** — all frontend HTTP calls live in `frontend/src/services/`, one file per domain area, using `fetch` with bearer tokens
- **shadcn/ui components** — copied into `frontend/src/components/ui/` and freely modifiable
- **Routes in App.tsx** — React Router v6+ with routes defined in `frontend/src/App.tsx`
- **Environment config** — frontend uses `.env` with `VITE_API_URL`; backend uses `appsettings.{Environment}.json`
- **CORS required** — configured in `Program.cs` since frontend and API run on different origins
- **Middleware order in Program.cs** — `UseHttpsRedirection` → `UseCors` → `UseAuthentication` → `UseAuthorization` → `MapControllers`

## Tech Stack Constraints

Do NOT use: Blazor, Razor Pages, Next.js, MUI/Material UI, Minimal APIs, Dapper, Docker (unless explicitly requested). See `docs/reference-architecture.md` § "Technologies NOT used" for rationale.

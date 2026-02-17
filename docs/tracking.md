# MemberTrack — Tracking

## Current

(nothing in progress)

## Backlog

### Data Model & Backend
- Membership renewal logic (default to previous end date + 1 if < 30 days late, else today's date)
- Wire up lookups API in frontend pages (replace hardcoded enum values)

### Authentication & Authorisation
- Create Entra ID app registrations (API + SPA)
- Wire up MSAL.js on frontend (create src/auth/, msalConfig.ts, bearer token helper)
- Enable JWT bearer auth on backend (uncomment in Program.cs)
- Add `[Authorize]` to all controllers (except HealthController which gets `[AllowAnonymous]`)
- Restrict access to Entra ID group `b4808399-e821-47a3-a56a-3fcd8f203b4d`
- Role-based access structure for future role splits (e.g. restrict bulk edits)

### Address
- Optional: address autocompletion service integration

### Deployment
- Configure production SQL Server connection string
- Set up GitHub Actions workflows (deploy-frontend.yml, deploy-api.yml)
- Deploy frontend to Azure Static Web Apps or IIS
- Deploy backend to Azure App Service or IIS
- Configure production CORS origins

### Infrastructure
- Update EF Core tools to match runtime version (currently 9.0.8 vs 10.0.3)

## Done

- Project scaffolding (backend .NET 10 Web API, frontend Vite + React + TypeScript)
- Tailwind CSS v4 + shadcn/ui initialised
- EF Core with LocalDB — database `MemberTrack` created
- Health check endpoint (API + database connectivity)
- CORS configured (localhost:3000, localhost:5173)
- Entra ID auth scaffolded (commented out, ready to enable)
- VS Code tasks.json (Ctrl+Shift+B → Run All)
- Member entity with structured address, DonmanId (unique index), timestamps
- Membership entity with all enum fields stored as strings
- MembershipMember many-to-many join table with Role (Primary, Secondary, Dependent)
- DTOs for Member and Membership (list, detail, create, update)
- Database migration applied with indexes on DonmanId, Surname, Email
- MembersController — full CRUD with search/filter/pagination
- MembershipsController — full CRUD with member linking, member history endpoint
- LookupsController — returns all enum values for dropdowns
- Members list page with search, filters, pagination, clickable rows
- Member detail/edit page with membership history and add membership dialog
- Member create page with validation
- Navigation bar (Members, Dashboard, Import/Export)
- CSV import — file upload, DONMAN format parsing, duplicate detection, exception reporting, Australian address parsing
- CSV export — filtered download with all member + membership fields
- Bulk operations — checkbox selection on members list, floating action bar, bulk status/renewal update
- Dashboard — stat cards (total, active, renewals due), members by category + renewal status with visual bars
- Code review against reference architecture — all conventions verified

## Bugs

(none yet)

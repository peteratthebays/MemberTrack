# MemberTrack — Tracking

## Current

(nothing in progress)

## Backlog

### Your tasks (manual / portal steps)

#### Google Places API
1. Create a Google Cloud project (or use an existing one)
2. Enable **Places API** and **Maps JavaScript API** in the Google Cloud Console
3. Create an API key → restrict by HTTP referrer (`localhost:3000` for dev, plus production domain later)
4. Set `VITE_GOOGLE_PLACES_API_KEY=your-key-here` in `frontend/.env`
5. Restart the dev server — address autocomplete will activate automatically

#### Entra ID App Registrations
1. Go to **Azure Portal → Microsoft Entra ID → App registrations**
2. Register **API app** (backend):
   - Name: `MemberTrack API`
   - Supported account types: Single tenant
   - Expose an API → set Application ID URI (e.g. `api://membertrack-api`)
   - Add a scope: `access_as_user`
   - Note the **Application (client) ID** and **Tenant ID**
3. Register **SPA app** (frontend):
   - Name: `MemberTrack SPA`
   - Supported account types: Single tenant
   - Authentication → Add platform → Single-page application
   - Redirect URIs: `http://localhost:3000`, plus production URL later
   - API permissions → Add `MemberTrack API / access_as_user` (delegated)
   - Note the **Application (client) ID**
4. Provide these values to Claude Code:
   - Tenant ID
   - API client ID
   - SPA client ID
   - API scope URI (e.g. `api://membertrack-api/access_as_user`)

### Claude Code tasks (once you provide Entra IDs above)
- Wire up MSAL.js on frontend (create `src/auth/`, `msalConfig.ts`, bearer token helper)
- Enable JWT bearer auth on backend (uncomment in `Program.cs`, update `appsettings.json`)
- Add `[Authorize]` to all controllers (except HealthController → `[AllowAnonymous]`)
- Restrict access to Entra ID group `b4808399-e821-47a3-a56a-3fcd8f203b4d`
- Role-based access structure for future role splits (e.g. restrict bulk edits)

### Deployment
- Configure production SQL Server connection string
- Set up GitHub Actions workflows (`deploy-frontend.yml`, `deploy-api.yml`)
- Deploy frontend to Azure Static Web Apps or IIS
- Deploy backend to Azure App Service or IIS
- Configure production CORS origins

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
- Lookups API wired up in all frontend pages (useLookups hook with module-level cache)
- Membership renewal logic — start date defaults to previous end + 1 if ≤ 30 days late, else today; dialog pre-fills type/payType/rights/category from latest membership
- EF Core tools updated to 10.0.3 (matches runtime)
- Address autocomplete — Google Places API integration with reusable AddressAutocomplete component, graceful degradation when no API key

## Bugs

(none yet)

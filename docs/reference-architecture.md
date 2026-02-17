# The Bays Healthcare Group — Reference Architecture

## Purpose

This document defines the standard technology architecture for all new client applications at The Bays Healthcare Group. It serves as a guide for setting up new projects and should be provided to any development tool (including LLMs like Claude Code) when scaffolding a new application.

---

## Architecture Overview

All new applications follow a two-project, decoupled architecture:

1. **Front-end** — A React single-page application (SPA) that runs in the user's browser
2. **Back-end** — A .NET Web API that serves data as JSON and handles all business logic and database access

These are separate projects in the same repository. The front-end communicates with the back-end exclusively over HTTP. The front-end has no direct access to the database.

```
Browser (React SPA)
    │
    │  HTTP requests (JSON)
    │
    ▼
.NET Web API (Controllers + Entity Framework Core)
    │
    │  SQL queries
    │
    ▼
SQL Server
```

Authentication is handled via Microsoft Entra ID. Users sign in through Microsoft's login page, and the front-end passes a security token to the API with each request.

---

## Technology Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Front-end framework | React | Latest stable | UI library |
| Front-end build tool | Vite | Latest stable | Builds the React app into static files |
| Front-end language | TypeScript | Latest stable | Typed JavaScript |
| Front-end routing | React Router | Latest stable (v6+) | Page navigation within the SPA |
| UI component library | shadcn/ui | Latest | Pre-built components copied into the project |
| CSS framework | Tailwind CSS | Latest stable | Utility-class styling, required by shadcn/ui |
| Authentication (front-end) | MSAL.js (@azure/msal-browser, @azure/msal-react) | Latest stable | Microsoft authentication library for SPAs |
| Back-end framework | .NET Web API | .NET 8+ | C# with Controllers (not Minimal APIs) |
| ORM | Entity Framework Core | Latest stable for .NET version | Database access, migrations, change tracking |
| Authentication (back-end) | Microsoft.Identity.Web | Latest stable | JWT bearer token validation for Entra ID |
| Database | SQL Server | On-premises, existing licensing | Application databases |
| Data warehouse | SQL Azure | Existing | Feeds Power BI, loaded by Python ETL |
| Source control | GitHub | — | All repos hosted here |
| CI/CD | GitHub Actions | — | Automated build and deployment |

### Technologies NOT used in new projects

| Technology | Reason |
|---|---|
| Blazor / Razor Pages | Replaced by React for better LLM support and developer ecosystem |
| Next.js | Server-side rendering not needed for internal apps; adds unnecessary complexity |
| MUI (Material UI) | shadcn/ui + Tailwind preferred for transparency and LLM code generation quality |
| Minimal APIs (.NET) | Controllers provide better structure for growing applications |
| Dapper | Entity Framework Core preferred for migrations and reduced manual SQL |
| Docker | Not currently required; may be introduced later |

---

## Project Structure

A new application repo should follow this structure:

```
my-app/
├── .github/
│   └── workflows/
│       ├── deploy-frontend.yml       # GitHub Actions: build and deploy React app
│       └── deploy-api.yml            # GitHub Actions: build and deploy .NET API
├── .vscode/
│   ├── tasks.json                    # Task to start both projects with one command
│   └── launch.json                   # Debug configuration
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/               # Reusable UI components
│   │   │   └── ui/                   # shadcn/ui components live here
│   │   ├── pages/                    # One file per route/screen
│   │   ├── services/                 # API call functions
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── types/                    # TypeScript type definitions
│   │   ├── lib/
│   │   │   └── utils.ts              # shadcn/ui utility functions
│   │   ├── auth/                     # MSAL configuration and auth components
│   │   ├── App.tsx                   # Root component with routing
│   │   └── main.tsx                  # Entry point
│   ├── index.html
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── package.json
├── backend/
│   ├── Controllers/                  # One controller per domain area
│   ├── Models/                       # Entity Framework entity classes
│   ├── Data/
│   │   └── AppDbContext.cs           # EF Core database context
│   ├── DTOs/                         # Data transfer objects for API responses
│   ├── Migrations/                   # EF Core database migrations
│   ├── Program.cs                    # App startup, middleware, auth config
│   ├── appsettings.json              # Configuration (connection strings, Entra ID)
│   └── backend.csproj
└── README.md
```

---

## Front-End Conventions

### Vite + React + TypeScript

The front-end is scaffolded with Vite using the React TypeScript template:

```bash
npm create vite@latest frontend -- --template react-ts
```

### Tailwind CSS + shadcn/ui

Tailwind is configured as part of the project setup. shadcn/ui components are initialised with:

```bash
npx shadcn@latest init
```

Individual components are added as needed:

```bash
npx shadcn@latest add button table dialog form input
```

shadcn/ui components are copied into `src/components/ui/` and become part of the project source code. They can be freely modified.

### Routing

React Router is used for page navigation. Routes are defined in `App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PatientsPage } from "./pages/PatientsPage";
import { PatientDetailPage } from "./pages/PatientDetailPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PatientsPage />} />
        <Route path="/patients/:id" element={<PatientDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### API Calls

All API calls are centralised in `src/services/`. Each service file corresponds to a domain area and uses the `fetch` API to communicate with the .NET backend:

```tsx
// src/services/patientService.ts
const API_BASE = import.meta.env.VITE_API_URL;

export async function getPatients(): Promise<Patient[]> {
  const response = await fetch(`${API_BASE}/api/patients`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}
```

The API base URL is configured via environment variable (`VITE_API_URL`) so it can differ between local development and production.

### Authentication (Front-End)

MSAL.js handles the Entra ID login flow. The configuration lives in `src/auth/` and wraps the application in an `MsalProvider`:

```tsx
// src/auth/msalConfig.ts
export const msalConfig = {
  auth: {
    clientId: "YOUR_CLIENT_ID",           // From Entra ID app registration
    authority: "https://login.microsoftonline.com/YOUR_TENANT_ID",
    redirectUri: "http://localhost:3000",  // Adjust per environment
  },
};

export const apiScopes = ["api://YOUR_API_CLIENT_ID/access_as_user"];
```

The app acquires a token silently and attaches it to every API call. If the user isn't signed in, they are redirected to Microsoft's login page.

---

## Back-End Conventions

### .NET Web API with Controllers

The API is created with the standard .NET Web API template:

```bash
dotnet new webapi -n backend --use-controllers
```

### Controller Structure

One controller per domain area. Controllers handle HTTP concerns only — they receive requests, call into services or EF Core, and return responses:

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PatientsController : ControllerBase
{
    private readonly AppDbContext _context;

    public PatientsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PatientDto>>> GetPatients()
    {
        var patients = await _context.Patients
            .Select(p => new PatientDto { Id = p.Id, Name = p.Name })
            .ToListAsync();
        return Ok(patients);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PatientDto>> GetPatient(int id)
    {
        var patient = await _context.Patients.FindAsync(id);
        if (patient == null) return NotFound();
        return Ok(new PatientDto { Id = patient.Id, Name = patient.Name });
    }
}
```

### Entity Framework Core

The `AppDbContext` defines the database schema. Entity classes live in `Models/`:

```csharp
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<Patient> Patients => Set<Patient>();
}
```

Migrations are managed via the EF Core CLI:

```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```

### DTOs (Data Transfer Objects)

API responses use DTOs, not entity classes directly. This decouples the API contract from the database schema and prevents accidental exposure of internal fields:

```csharp
// Models/Patient.cs (entity — maps to database)
public class Patient
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string InternalNotes { get; set; }  // Not exposed via API
}

// DTOs/PatientDto.cs (API response)
public class PatientDto
{
    public int Id { get; set; }
    public string Name { get; set; }
}
```

### Authentication (Back-End)

The API validates JWT bearer tokens issued by Entra ID. Configuration in `Program.cs`:

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));
```

`appsettings.json` includes the Entra ID configuration:

```json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "YOUR_TENANT_ID",
    "ClientId": "YOUR_API_CLIENT_ID",
    "Audience": "api://YOUR_API_CLIENT_ID"
  }
}
```

All controllers use the `[Authorize]` attribute by default.

### CORS Configuration

Since the front-end and API run on different origins, CORS must be configured in `Program.cs`:

```csharp
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000", "https://your-app.azurestaticapps.net")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
```

### Standard Middleware Pipeline

`Program.cs` should configure middleware in this order:

```csharp
var app = builder.Build();

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

---

## Local Development

### Prerequisites

- Node.js (LTS version) — for the React front-end
- .NET 8 SDK — for the API
- SQL Server (local instance or Docker) — for the database

### Running Both Projects

VS Code is configured to start both projects simultaneously.

`.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Run API",
      "type": "process",
      "command": "dotnet",
      "args": ["run", "--project", "backend/backend.csproj"],
      "isBackground": true,
      "problemMatcher": "$msCompile"
    },
    {
      "label": "Run Frontend",
      "type": "shell",
      "command": "npm run dev",
      "options": { "cwd": "${workspaceFolder}/frontend" },
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Run All",
      "dependsOn": ["Run API", "Run Frontend"],
      "dependsOrder": "parallel",
      "problemMatcher": []
    }
  ]
}
```

Press `Ctrl+Shift+B` and select "Run All" to start both projects. The API runs on `https://localhost:5001` and the React dev server on `http://localhost:3000`.

### Environment Configuration

The front-end uses a `.env` file for local development:

```
# frontend/.env
VITE_API_URL=https://localhost:5001
```

The API uses `appsettings.Development.json` for local settings:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=MyAppDb;Trusted_Connection=True;TrustServerCertificate=True;"
  }
}
```

---

## Deployment

### Front-End — Azure Static Web Apps

The React app builds to static files (`npm run build` produces a `dist/` folder) and deploys to Azure Static Web Apps. GitHub Actions handles this automatically on push to `main`.

For on-premises hosting, the `dist/` folder can be served from IIS or any static file web server.

### Back-End — Azure App Service or IIS

The .NET API deploys to Azure App Service (Linux, .NET 8). For on-premises hosting, it runs on IIS just like any .NET web application.

GitHub Actions builds and deploys to Azure. For on-premises, publish manually:

```bash
dotnet publish backend/backend.csproj -c Release -o ./publish
```

Then copy the `publish/` folder to the IIS site.

### Deployment Flexibility

The front-end and back-end are deployed independently. Any combination works:

| Front-end | Back-end | Use case |
|---|---|---|
| Azure Static Web Apps | Azure App Service | Fully cloud-hosted |
| Azure Static Web Apps | IIS on-prem | App accessible externally, data stays internal |
| IIS on-prem | IIS on-prem | Fully on-premises |

When the front-end is hosted in Azure and the API is on-premises, it still works because the React app runs in the user's browser. The browser makes API calls directly to the on-premises server — no internet-to-intranet traffic is required as long as the user's machine can reach both.

---

## CI/CD — GitHub Actions

### Front-End Workflow

`.github/workflows/deploy-frontend.yml`:

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths: ['frontend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install and Build
        working-directory: frontend
        run: |
          npm ci
          npm run build

      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_SWA_TOKEN }}
          app_location: "frontend"
          output_location: "dist"
```

### Back-End Workflow

`.github/workflows/deploy-api.yml`:

```yaml
name: Deploy API

on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: 8.0.x

      - name: Build and Publish
        working-directory: backend
        run: |
          dotnet restore
          dotnet publish -c Release -o ./publish

      - name: Deploy to Azure App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ secrets.AZURE_APP_NAME }}
          publish-profile: ${{ secrets.AZURE_PUBLISH_PROFILE }}
          package: backend/publish
```

---

## Existing Systems (No Changes)

These systems remain as-is and are not affected by this architecture:

- **Python ETL jobs** — Continue to handle data extraction, transformation, and loading into the SQL Azure data warehouse
- **SQL Azure data warehouse** — Continues to feed Power BI reports
- **Existing Blazor/Razor applications** — Maintained but not extended; new features go into new React applications
- **Vendor-managed systems** — No changes; future replacements will follow this architecture

---

## Entra ID App Registration Checklist

For each new application, register two apps in Entra ID:

### 1. API Registration

- Register a new app in Entra ID for the API
- Under "Expose an API", add a scope (e.g., `access_as_user`)
- Note the Application (client) ID — this goes in `appsettings.json`

### 2. SPA Registration

- Register a new app in Entra ID for the front-end
- Under "Authentication", add a Single-page application redirect URI (`http://localhost:3000` for dev, production URL for prod)
- Under "API Permissions", add the scope from the API registration
- Note the Application (client) ID — this goes in `msalConfig.ts`

---

## Quick Start — New Application

1. Clone or copy this reference project
2. Rename folders, solution, and project files
3. Register two Entra ID apps (see checklist above)
4. Update `msalConfig.ts` with the SPA client ID and tenant ID
5. Update `appsettings.json` with the API client ID, tenant ID, and connection string
6. Define your Entity Framework models in `Models/`
7. Run `dotnet ef migrations add InitialCreate` and `dotnet ef database update`
8. Build controllers and DTOs for your domain
9. Build React pages in `src/pages/` and API services in `src/services/`
10. Test locally with "Run All" task
11. Set up GitHub Actions secrets and deploy

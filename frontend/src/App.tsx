import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { TooltipProvider } from "./components/ui/tooltip";
import { MembersPage } from "./pages/MembersPage";
import { MemberCreatePage } from "./pages/MemberCreatePage";
import { MemberDetailPage } from "./pages/MemberDetailPage";
import { ImportExportPage } from "./pages/ImportExportPage";
import { DashboardPage } from "./pages/DashboardPage";

function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <nav className="border-b bg-background">
          <div className="mx-auto max-w-7xl px-4 flex h-14 items-center justify-between">
            <Link to="/" className="text-lg font-semibold tracking-tight">
              MemberTrack
            </Link>
            <div className="flex items-center gap-6">
              <Link
                to="/"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Members
              </Link>
              <Link
                to="/dashboard"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                to="/import-export"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Import/Export
              </Link>
            </div>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<MembersPage />} />
          <Route path="/members/new" element={<MemberCreatePage />} />
          <Route path="/members/:id" element={<MemberDetailPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/import-export" element={<ImportExportPage />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
}

export default App;

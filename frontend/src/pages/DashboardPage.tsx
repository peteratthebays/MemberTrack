import { useEffect, useState } from "react";
import { getDashboard } from "@/services/dashboardService";
import type { Dashboard } from "@/types/dashboard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const RENEWAL_STATUS_COLORS: Record<string, string> = {
  Renewed: "bg-green-500",
  New: "bg-blue-500",
  ToRenew: "bg-yellow-500",
  Overdue: "bg-red-500",
  NotRenewing: "bg-red-700",
};

function getRenewalStatusColor(status: string): string {
  return RENEWAL_STATUS_COLORS[status] ?? "bg-gray-400";
}

export function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      setError(null);
      try {
        const result = await getDashboard();
        setData(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const maxCategoryCount = Math.max(
    ...data.membersByCategory.map((c) => c.count),
    1
  );
  const maxRenewalCount = Math.max(
    ...data.membersByRenewalStatus.map((r) => r.count),
    1
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{data.totalMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">
              {data.activeMembers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Renewals Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-amber-600">
              {data.renewalsDue}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Members by Category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.membersByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data available.</p>
          ) : (
            data.membersByCategory.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.category}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{
                      width: `${(item.count / maxCategoryCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Members by Renewal Status */}
      <Card>
        <CardHeader>
          <CardTitle>Members by Renewal Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.membersByRenewalStatus.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data available.</p>
          ) : (
            data.membersByRenewalStatus.map((item) => (
              <div key={item.renewalStatus} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.renewalStatus}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full transition-all ${getRenewalStatusColor(item.renewalStatus)}`}
                    style={{
                      width: `${(item.count / maxRenewalCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { getHealth, type HealthStatus } from "@/services/healthService";

export function HomePage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">MemberTrack</h1>
        <p className="text-muted-foreground">Connectivity check</p>

        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
            API error: {error}
          </div>
        )}

        {health && (
          <div className="rounded-md border p-4 text-sm space-y-1">
            <p>
              API: <span className="font-medium">{health.status}</span>
            </p>
            <p>
              Database:{" "}
              <span className="font-medium">{health.database}</span>
            </p>
            <p className="text-muted-foreground text-xs">
              {new Date(health.timestamp).toLocaleString()}
            </p>
          </div>
        )}

        {!health && !error && (
          <p className="text-muted-foreground text-sm">
            Connecting to API...
          </p>
        )}
      </div>
    </div>
  );
}

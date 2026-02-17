const API_BASE = import.meta.env.VITE_API_URL;

export interface HealthStatus {
  status: string;
  database: string;
  timestamp: string;
}

export async function getHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE}/api/health`);
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
  return response.json();
}

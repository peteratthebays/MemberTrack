import type { Dashboard } from "@/types/dashboard";

const API_BASE = import.meta.env.VITE_API_URL;

export async function getDashboard(): Promise<Dashboard> {
  const response = await fetch(`${API_BASE}/api/dashboard`);
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
  return response.json();
}

import type { Lookups } from '@/types/lookups';

const API_BASE = import.meta.env.VITE_API_URL;

export async function getLookups(): Promise<Lookups> {
  const response = await fetch(`${API_BASE}/api/lookups`);
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
  return response.json();
}

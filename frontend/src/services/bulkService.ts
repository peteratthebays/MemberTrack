const API_BASE = import.meta.env.VITE_API_URL;

export interface BulkUpdateStatusParams {
  memberIds: number[];
  status?: string;
  renewalStatus?: string;
}

export interface BulkUpdateResult {
  updated: number;
}

export async function bulkUpdateMembershipStatus(params: BulkUpdateStatusParams): Promise<BulkUpdateResult> {
  const response = await fetch(`${API_BASE}/api/bulk/membership-status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  return response.json();
}

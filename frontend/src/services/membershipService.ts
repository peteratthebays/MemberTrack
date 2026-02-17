import type { Membership, CreateMembership, UpdateMembership } from '@/types/membership';

const API_BASE = import.meta.env.VITE_API_URL;

export async function getMemberships(): Promise<Membership[]> {
  const response = await fetch(`${API_BASE}/api/memberships`);
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
  return response.json();
}

export async function getMembership(id: number): Promise<Membership> {
  const response = await fetch(`${API_BASE}/api/memberships/${id}`);
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
  return response.json();
}

export async function getMemberMemberships(memberId: number): Promise<Membership[]> {
  const response = await fetch(`${API_BASE}/api/members/${memberId}/memberships`);
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
  return response.json();
}

export async function createMembership(data: CreateMembership): Promise<Membership> {
  const response = await fetch(`${API_BASE}/api/memberships`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
  return response.json();
}

export async function updateMembership(id: number, data: UpdateMembership): Promise<Membership> {
  const response = await fetch(`${API_BASE}/api/memberships/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
  return response.json();
}

export async function deleteMembership(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/memberships/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
}

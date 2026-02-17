import type { Member, MemberListItem, CreateMember, UpdateMember, PagedResult } from '@/types/member';

const API_BASE = import.meta.env.VITE_API_URL;

export interface GetMembersParams {
  search?: string;
  status?: string;
  category?: string;
  renewalStatus?: string;
  page?: number;
  pageSize?: number;
}

export async function getMembers(params?: GetMembersParams): Promise<PagedResult<MemberListItem>> {
  const url = new URL(`${API_BASE}/api/members`);

  if (params) {
    if (params.search) url.searchParams.set('search', params.search);
    if (params.status) url.searchParams.set('status', params.status);
    if (params.category) url.searchParams.set('category', params.category);
    if (params.renewalStatus) url.searchParams.set('renewalStatus', params.renewalStatus);
    if (params.page !== undefined) url.searchParams.set('page', String(params.page));
    if (params.pageSize !== undefined) url.searchParams.set('pageSize', String(params.pageSize));
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
  return response.json();
}

export async function getMember(id: number): Promise<Member> {
  const response = await fetch(`${API_BASE}/api/members/${id}`);
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
  return response.json();
}

export async function createMember(data: CreateMember): Promise<Member> {
  const response = await fetch(`${API_BASE}/api/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
  return response.json();
}

export async function updateMember(id: number, data: UpdateMember): Promise<Member> {
  const response = await fetch(`${API_BASE}/api/members/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
  return response.json();
}

export async function deleteMember(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/members/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
}

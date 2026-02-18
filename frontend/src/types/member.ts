export interface Member {
  id: number;
  donmanId: number | null;
  firstName: string;
  surname: string;
  title: string | null;
  email: string | null;
  mobile: string | null;
  mailchimpName: string | null;
  addressStreet: string | null;
  addressSuburb: string | null;
  addressState: string | null;
  addressPostcode: string | null;
  notes: string | null;
  updateEpas: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberListItem {
  id: number;
  donmanId: number | null;
  firstName: string;
  surname: string;
  email: string | null;
  mobile: string | null;
  currentMembershipStatus: string | null;
  currentRenewalStatus: string | null;
  currentCategory: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

export interface CreateMember {
  donmanId: number | null;
  firstName: string;
  surname: string;
  title: string | null;
  email: string | null;
  mobile: string | null;
  mailchimpName: string | null;
  addressStreet: string | null;
  addressSuburb: string | null;
  addressState: string | null;
  addressPostcode: string | null;
  notes: string | null;
  updateEpas: string | null;
}

export interface UpdateMember {
  donmanId: number | null;
  firstName: string;
  surname: string;
  title: string | null;
  email: string | null;
  mobile: string | null;
  mailchimpName: string | null;
  addressStreet: string | null;
  addressSuburb: string | null;
  addressState: string | null;
  addressPostcode: string | null;
  notes: string | null;
  updateEpas: string | null;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Membership {
  id: number;
  type: string;
  payType: string;
  status: string;
  rights: string;
  category: string;
  renewalStatus: string;
  startDate: string;
  endDate: string | null;
  dateLastPaid: string | null;
  createdAt: string;
  updatedAt: string;
  members: MembershipMember[];
}

export interface MembershipMember {
  memberId: number;
  firstName: string;
  surname: string;
  role: string;
}

export interface CreateMembership {
  type: string;
  payType: string;
  status: string;
  rights: string;
  category: string;
  renewalStatus: string;
  startDate: string;
  endDate: string | null;
  dateLastPaid: string | null;
  members: CreateMembershipMember[];
}

export interface CreateMembershipMember {
  memberId: number;
  role: string;
}

export interface UpdateMembership {
  type: string;
  payType: string;
  status: string;
  rights: string;
  category: string;
  renewalStatus: string;
  startDate: string;
  endDate: string | null;
  dateLastPaid: string | null;
  members: CreateMembershipMember[];
}

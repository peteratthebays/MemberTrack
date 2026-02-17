export interface Dashboard {
  totalMembers: number;
  activeMembers: number;
  renewalsDue: number;
  membersByCategory: CategoryCount[];
  membersByRenewalStatus: RenewalStatusCount[];
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface RenewalStatusCount {
  renewalStatus: string;
  count: number;
}

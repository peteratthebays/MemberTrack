namespace backend.DTOs;

public class DashboardDto
{
    public int TotalMembers { get; set; }
    public int ActiveMembers { get; set; }
    public int RenewalsDue { get; set; }
    public List<CategoryCount> MembersByCategory { get; set; } = [];
    public List<RenewalStatusCount> MembersByRenewalStatus { get; set; } = [];
}

public class CategoryCount
{
    public string Category { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class RenewalStatusCount
{
    public string RenewalStatus { get; set; } = string.Empty;
    public int Count { get; set; }
}

namespace backend.DTOs;

public class MembershipDto
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string PayType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Rights { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string RenewalStatus { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? DateLastPaid { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<MembershipMemberDto> Members { get; set; } = [];
}

public class MembershipMemberDto
{
    public int MemberId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string Surname { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}

public class CreateMembershipDto
{
    public string Type { get; set; } = string.Empty;
    public string PayType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Rights { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string RenewalStatus { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? DateLastPaid { get; set; }
    public List<CreateMembershipMemberDto> Members { get; set; } = [];
}

public class CreateMembershipMemberDto
{
    public int MemberId { get; set; }
    public string Role { get; set; } = "Primary";
}

public class UpdateMembershipDto
{
    public string Type { get; set; } = string.Empty;
    public string PayType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Rights { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string RenewalStatus { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? DateLastPaid { get; set; }
    public List<CreateMembershipMemberDto> Members { get; set; } = [];
}

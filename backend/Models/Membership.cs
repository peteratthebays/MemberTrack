namespace backend.Models;

public class Membership
{
    public int Id { get; set; }

    public MembershipType Type { get; set; }
    public PayType PayType { get; set; }
    public MembershipStatus Status { get; set; }
    public MemberRights Rights { get; set; }
    public MemberCategory Category { get; set; }
    public RenewalStatus RenewalStatus { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? DateLastPaid { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<MembershipMember> MembershipMembers { get; set; } = [];
}

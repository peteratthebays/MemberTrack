namespace backend.Models;

public class MembershipMember
{
    public int MembershipId { get; set; }
    public Membership Membership { get; set; } = null!;

    public int MemberId { get; set; }
    public Member Member { get; set; } = null!;

    public MembershipRole Role { get; set; } = MembershipRole.Primary;
}

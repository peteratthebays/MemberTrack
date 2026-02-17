namespace backend.Models;

public enum PayType
{
    Auto,
    Annual,
    NotApplicable
}

public enum MembershipStatus
{
    Active,
    NonActive
}

public enum MembershipType
{
    Single,
    Couple,
    Family
}

public enum MemberRights
{
    Paid,
    Associate,
    VotingRights
}

public enum MemberCategory
{
    Community,
    Life,
    Volunteer,
    ExBoard,
    Board,
    Doctor,
    Family,
    Staff
}

public enum RenewalStatus
{
    New,
    Renewed,
    ToRenew,
    Overdue,
    NotRenewing
}

public enum MembershipRole
{
    Primary,
    Secondary,
    Dependent
}

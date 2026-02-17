namespace backend.DTOs;

public class MemberDto
{
    public int Id { get; set; }
    public int? DonmanId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string Surname { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Email { get; set; }
    public string? Mobile { get; set; }
    public string? MailchimpName { get; set; }
    public string? AddressStreet { get; set; }
    public string? AddressSuburb { get; set; }
    public string? AddressState { get; set; }
    public string? AddressPostcode { get; set; }
    public string? Notes { get; set; }
    public string? UpdateEpas { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class MemberListDto
{
    public int Id { get; set; }
    public int? DonmanId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string Surname { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Mobile { get; set; }
    public string? CurrentMembershipStatus { get; set; }
    public string? CurrentRenewalStatus { get; set; }
    public string? CurrentCategory { get; set; }
}

public class CreateMemberDto
{
    public int? DonmanId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string Surname { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Email { get; set; }
    public string? Mobile { get; set; }
    public string? MailchimpName { get; set; }
    public string? AddressStreet { get; set; }
    public string? AddressSuburb { get; set; }
    public string? AddressState { get; set; }
    public string? AddressPostcode { get; set; }
    public string? Notes { get; set; }
    public string? UpdateEpas { get; set; }
}

public class UpdateMemberDto
{
    public int? DonmanId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string Surname { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Email { get; set; }
    public string? Mobile { get; set; }
    public string? MailchimpName { get; set; }
    public string? AddressStreet { get; set; }
    public string? AddressSuburb { get; set; }
    public string? AddressState { get; set; }
    public string? AddressPostcode { get; set; }
    public string? Notes { get; set; }
    public string? UpdateEpas { get; set; }
}

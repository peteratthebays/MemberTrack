using System.ComponentModel.DataAnnotations;

namespace backend.Models;

public class Member
{
    public int Id { get; set; }

    public int? DonmanId { get; set; }

    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Surname { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Title { get; set; }

    [MaxLength(255)]
    public string? Email { get; set; }

    [MaxLength(50)]
    public string? Mobile { get; set; }

    [MaxLength(100)]
    public string? MailchimpName { get; set; }

    [MaxLength(255)]
    public string? AddressStreet { get; set; }

    [MaxLength(100)]
    public string? AddressSuburb { get; set; }

    [MaxLength(10)]
    public string? AddressState { get; set; }

    [MaxLength(10)]
    public string? AddressPostcode { get; set; }

    public string? Notes { get; set; }

    [MaxLength(50)]
    public string? UpdateEpas { get; set; }

    [MaxLength(255)]
    public string? OrgFoundation { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<MembershipMember> MembershipMembers { get; set; } = [];
}

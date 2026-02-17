namespace backend.DTOs;

public class BulkUpdateStatusDto
{
    public List<int> MemberIds { get; set; } = [];
    public string? Status { get; set; }
    public string? RenewalStatus { get; set; }
}

public class BulkUpdateResult
{
    public int Updated { get; set; }
}

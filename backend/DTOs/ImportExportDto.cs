namespace backend.DTOs;

public class ValidationError
{
    public int Row { get; set; }
    public string? DonmanId { get; set; }
    public string? Name { get; set; }
    public string Field { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class ValidationResult
{
    public int TotalRows { get; set; }
    public int ValidCount { get; set; }
    public int ErrorCount { get; set; }
    public int SkippedCount { get; set; }
    public List<ImportSkipped> Skipped { get; set; } = [];
    public List<ValidationError> Errors { get; set; } = [];
}

public class ImportSkipped
{
    public int DonmanId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
}

public class ImportResult
{
    public int Imported { get; set; }
    public List<ImportSkipped> Skipped { get; set; } = [];
}

namespace backend.DTOs;

public class ImportResult
{
    public int Imported { get; set; }
    public List<ImportSkipped> Skipped { get; set; } = [];
    public List<ImportException> Exceptions { get; set; } = [];
}

public class ImportSkipped
{
    public int DonmanId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
}

public class ImportException
{
    public int Row { get; set; }
    public string Data { get; set; } = string.Empty;
    public string Error { get; set; } = string.Empty;
}

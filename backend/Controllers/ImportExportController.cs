using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;

namespace backend.Controllers;

[ApiController]
[Route("api")]
public class ImportExportController : ControllerBase
{
    private readonly AppDbContext _context;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public ImportExportController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// POST /api/import/validate — Validate a CSV/TSV file without importing.
    /// Returns a validation report with actionable error details.
    /// </summary>
    [HttpPost("import/validate")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<ValidationResult>> ValidateCsv(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded or file is empty." });

        var lines = await ReadAllLines(file);

        if (lines.Count < 2)
            return BadRequest(new { error = "File must contain a header row and at least one data row." });

        var delimiter = CsvParsingService.DetectDelimiter(lines[0]);

        // Load existing DonmanIds for duplicate checking
        var existingDonmanIds = await _context.Members
            .Where(m => m.DonmanId != null)
            .Select(m => m.DonmanId!.Value)
            .ToHashSetAsync();

        var result = new ValidationResult();
        var seenDonmanIds = new HashSet<int>();

        for (int i = 1; i < lines.Count; i++)
        {
            var line = lines[i];
            if (string.IsNullOrWhiteSpace(line))
                continue;

            var rowNumber = i + 1;
            var parsed = CsvParsingService.ParseRow(line, delimiter, rowNumber);

            if (!parsed.IsValid)
            {
                result.Errors.AddRange(parsed.Errors);
                result.ErrorCount++;
                result.TotalRows++;
                continue;
            }

            // Check for duplicate against DB
            if (existingDonmanIds.Contains(parsed.DonmanId))
            {
                result.Skipped.Add(new ImportSkipped
                {
                    DonmanId = parsed.DonmanId,
                    Name = parsed.Name ?? "",
                    Reason = "Already exists in database"
                });
                result.SkippedCount++;
                result.TotalRows++;
                continue;
            }

            // Check for duplicate within the file
            if (!seenDonmanIds.Add(parsed.DonmanId))
            {
                result.Skipped.Add(new ImportSkipped
                {
                    DonmanId = parsed.DonmanId,
                    Name = parsed.Name ?? "",
                    Reason = "Duplicate within file"
                });
                result.SkippedCount++;
                result.TotalRows++;
                continue;
            }

            result.ValidCount++;
            result.TotalRows++;
        }

        result.ErrorCount = result.Errors.Select(e => e.Row).Distinct().Count();
        return Ok(result);
    }

    /// <summary>
    /// POST /api/import/execute — Import a validated CSV/TSV file.
    /// Re-validates for safety, imports in batches, and streams SSE progress events.
    /// </summary>
    [HttpPost("import/execute")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task ImportExecute(IFormFile file)
    {
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");

        if (file == null || file.Length == 0)
        {
            await WriteSseEvent("error", new { message = "No file uploaded or file is empty." });
            return;
        }

        var lines = await ReadAllLines(file);

        if (lines.Count < 2)
        {
            await WriteSseEvent("error", new { message = "File must contain a header row and at least one data row." });
            return;
        }

        var delimiter = CsvParsingService.DetectDelimiter(lines[0]);

        var existingDonmanIds = await _context.Members
            .Where(m => m.DonmanId != null)
            .Select(m => m.DonmanId!.Value)
            .ToHashSetAsync();

        // Parse and re-validate all rows
        var validRows = new List<CsvParsingService.ParsedRow>();
        var skipped = new List<ImportSkipped>();
        var hasErrors = false;

        for (int i = 1; i < lines.Count; i++)
        {
            var line = lines[i];
            if (string.IsNullOrWhiteSpace(line))
                continue;

            var rowNumber = i + 1;
            var parsed = CsvParsingService.ParseRow(line, delimiter, rowNumber);

            if (!parsed.IsValid)
            {
                hasErrors = true;
                continue;
            }

            if (existingDonmanIds.Contains(parsed.DonmanId) ||
                !existingDonmanIds.Add(parsed.DonmanId)) // also catches file-internal dupes
            {
                skipped.Add(new ImportSkipped
                {
                    DonmanId = parsed.DonmanId,
                    Name = parsed.Name ?? "",
                    Reason = "duplicate"
                });
                continue;
            }

            validRows.Add(parsed);
        }

        if (hasErrors)
        {
            await WriteSseEvent("error", new { message = "File contains validation errors. Please validate first." });
            return;
        }

        // Import in batches of 50
        const int batchSize = 50;
        int processed = 0;
        int total = validRows.Count;

        for (int i = 0; i < validRows.Count; i += batchSize)
        {
            var batch = validRows.GetRange(i, Math.Min(batchSize, validRows.Count - i));

            // Add members
            var members = batch.Select(r => r.Member!).ToList();
            _context.Members.AddRange(members);
            await _context.SaveChangesAsync();

            // Add memberships
            var memberships = batch.Select(r => r.Membership!).ToList();
            _context.Memberships.AddRange(memberships);
            await _context.SaveChangesAsync();

            // Add links — IDs are now populated after SaveChangesAsync
            var links = new List<MembershipMember>();
            for (int j = 0; j < batch.Count; j++)
            {
                links.Add(new MembershipMember
                {
                    MemberId = members[j].Id,
                    MembershipId = memberships[j].Id,
                    Role = MembershipRole.Primary
                });
            }
            _context.MembershipMembers.AddRange(links);
            await _context.SaveChangesAsync();

            processed += batch.Count;
            await WriteSseEvent("progress", new { processed, total });
        }

        var result = new ImportResult
        {
            Imported = processed,
            Skipped = skipped
        };

        await WriteSseEvent("complete", result);
    }

    /// <summary>
    /// GET /api/export/csv — Export members as a CSV file download.
    /// </summary>
    [HttpGet("export/csv")]
    public async Task<IActionResult> ExportCsv(
        [FromQuery] string? search,
        [FromQuery] MembershipStatus? status,
        [FromQuery] MemberCategory? category,
        [FromQuery] RenewalStatus? renewalStatus)
    {
        var query = _context.Members
            .AsNoTracking()
            .Select(m => new
            {
                Member = m,
                LatestMembership = m.MembershipMembers
                    .OrderByDescending(mm => mm.Membership.StartDate)
                    .Select(mm => mm.Membership)
                    .FirstOrDefault()
            });

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(x =>
                x.Member.FirstName.ToLower().Contains(term) ||
                x.Member.Surname.ToLower().Contains(term) ||
                (x.Member.Email != null && x.Member.Email.ToLower().Contains(term)));
        }

        if (status.HasValue)
        {
            query = query.Where(x =>
                x.LatestMembership != null && x.LatestMembership.Status == status.Value);
        }

        if (category.HasValue)
        {
            query = query.Where(x =>
                x.LatestMembership != null && x.LatestMembership.Category == category.Value);
        }

        if (renewalStatus.HasValue)
        {
            query = query.Where(x =>
                x.LatestMembership != null && x.LatestMembership.RenewalStatus == renewalStatus.Value);
        }

        var rows = await query
            .OrderBy(x => x.Member.Surname)
            .ThenBy(x => x.Member.FirstName)
            .ToListAsync();

        var sb = new StringBuilder();

        sb.AppendLine(BuildCsvRow(new[]
        {
            "DonmanId", "FirstName", "Surname", "Title", "Email", "Mobile",
            "AddressStreet", "AddressSuburb", "AddressState", "AddressPostcode",
            "Notes", "UpdateEpas",
            "Status", "Type", "PayType", "Rights", "Category", "RenewalStatus", "DateLastPaid"
        }));

        foreach (var row in rows)
        {
            var m = row.Member;
            var ms = row.LatestMembership;

            sb.AppendLine(BuildCsvRow(new[]
            {
                m.DonmanId?.ToString() ?? "",
                m.FirstName,
                m.Surname,
                m.Title ?? "",
                m.Email ?? "",
                m.Mobile ?? "",
                m.AddressStreet ?? "",
                m.AddressSuburb ?? "",
                m.AddressState ?? "",
                m.AddressPostcode ?? "",
                m.Notes ?? "",
                m.UpdateEpas ?? "",
                ms?.Status.ToString() ?? "",
                ms?.Type.ToString() ?? "",
                ms?.PayType.ToString() ?? "",
                ms?.Rights.ToString() ?? "",
                ms?.Category.ToString() ?? "",
                ms?.RenewalStatus.ToString() ?? "",
                ms?.DateLastPaid?.ToString("dd/MM/yyyy") ?? ""
            }));
        }

        var csvBytes = Encoding.UTF8.GetBytes(sb.ToString());
        var fileName = $"members-export-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";

        return File(csvBytes, "text/csv", fileName);
    }

    // ---- Private helpers ----

    private static async Task<List<string>> ReadAllLines(IFormFile file)
    {
        var lines = new List<string>();
        using var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8);
        string? line;
        while ((line = await reader.ReadLineAsync()) != null)
        {
            lines.Add(line);
        }
        return lines;
    }

    private async Task WriteSseEvent(string eventType, object data)
    {
        var json = JsonSerializer.Serialize(data, JsonOptions);
        await Response.WriteAsync($"event: {eventType}\ndata: {json}\n\n");
        await Response.Body.FlushAsync();
    }

    private static string BuildCsvRow(string[] fields)
    {
        var escaped = fields.Select(f =>
        {
            if (f.Contains(',') || f.Contains('"') || f.Contains('\n') || f.Contains('\r'))
            {
                return "\"" + f.Replace("\"", "\"\"") + "\"";
            }
            return f;
        });

        return string.Join(",", escaped);
    }
}

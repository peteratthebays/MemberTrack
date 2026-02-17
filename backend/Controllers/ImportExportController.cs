using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api")]
public class ImportExportController : ControllerBase
{
    private readonly AppDbContext _context;

    // Australian states and territories for address parsing
    private static readonly HashSet<string> AustralianStates = new(StringComparer.OrdinalIgnoreCase)
    {
        "NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"
    };

    // CSV column indices from the DONMAN export format
    private const int ColDonmanId = 0;       // DONMAN #
    private const int ColFirstName = 1;      // First Name
    private const int ColMailchimpName = 2;  // Mailchimp name
    private const int ColSurname = 3;        // Surname
    private const int ColPayType = 4;        // Pay type
    private const int ColStatus = 5;         // Status
    private const int ColType = 6;           // Type
    private const int ColRights = 7;         // Rights
    private const int ColConnectedName = 8;  // Connected Name
    private const int ColType2 = 9;          // Type2 (Category)
    private const int ColRenewalStatus = 10; // Renewal Status
    private const int ColDateLastPaid = 11;  // Date Last Paid
    private const int ColMonthLastPaid = 12; // Month Last Paid
    private const int ColNotes = 13;         // Notes
    private const int ColUpdateEpas = 14;    // Update EPAS
    private const int ColOrgFoundation = 15; // Org/Foundation
    private const int ColTitle = 16;         // TITLE
    private const int ColMail = 17;          // MAIL
    private const int ColAddress = 18;       // ADDRESS
    private const int ColMobile = 19;        // MOBILE
    private const int MinColumns = 20;

    public ImportExportController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// POST /api/import/csv — Import members from a CSV/TSV file upload.
    /// </summary>
    [HttpPost("import/csv")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB limit
    public async Task<ActionResult<ImportResult>> ImportCsv(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new { error = "No file uploaded or file is empty." });
        }

        var result = new ImportResult();
        var lines = new List<string>();

        // Read all lines from the uploaded file
        using (var reader = new StreamReader(file.OpenReadStream(), Encoding.UTF8))
        {
            string? line;
            while ((line = await reader.ReadLineAsync()) != null)
            {
                lines.Add(line);
            }
        }

        if (lines.Count < 2)
        {
            return BadRequest(new { error = "File must contain a header row and at least one data row." });
        }

        // Detect delimiter from the header row
        var delimiter = DetectDelimiter(lines[0]);

        // Load existing DonmanIds for duplicate checking
        var existingDonmanIds = await _context.Members
            .Where(m => m.DonmanId != null)
            .Select(m => m.DonmanId!.Value)
            .ToHashSetAsync();

        // Process each data row (skip header at index 0)
        for (int i = 1; i < lines.Count; i++)
        {
            var line = lines[i];
            if (string.IsNullOrWhiteSpace(line))
                continue;

            var rowNumber = i + 1; // 1-based row number for user display

            try
            {
                var fields = ParseCsvLine(line, delimiter);

                if (fields.Length < MinColumns)
                {
                    result.Exceptions.Add(new ImportException
                    {
                        Row = rowNumber,
                        Data = TruncateForDisplay(line),
                        Error = $"Expected at least {MinColumns} columns but found {fields.Length}."
                    });
                    continue;
                }

                // Parse DonmanId
                var donmanIdRaw = fields[ColDonmanId].Trim();
                if (string.IsNullOrWhiteSpace(donmanIdRaw))
                {
                    result.Exceptions.Add(new ImportException
                    {
                        Row = rowNumber,
                        Data = TruncateForDisplay(line),
                        Error = "DONMAN # is empty."
                    });
                    continue;
                }

                if (!int.TryParse(donmanIdRaw, out var donmanId))
                {
                    result.Exceptions.Add(new ImportException
                    {
                        Row = rowNumber,
                        Data = TruncateForDisplay(line),
                        Error = $"Invalid DONMAN # value: '{donmanIdRaw}'."
                    });
                    continue;
                }

                var firstName = fields[ColFirstName].Trim();
                var surname = fields[ColSurname].Trim();
                var fullName = $"{firstName} {surname}".Trim();

                // Check for duplicate
                if (existingDonmanIds.Contains(donmanId))
                {
                    result.Skipped.Add(new ImportSkipped
                    {
                        DonmanId = donmanId,
                        Name = fullName,
                        Reason = "duplicate"
                    });
                    continue;
                }

                // Parse enum fields
                var parseErrors = new List<string>();

                var payType = ParsePayType(fields[ColPayType].Trim(), parseErrors);
                var status = ParseMembershipStatus(fields[ColStatus].Trim(), parseErrors);
                var membershipType = ParseMembershipType(fields[ColType].Trim(), parseErrors);
                var rights = ParseMemberRights(fields[ColRights].Trim(), parseErrors);
                var category = ParseMemberCategory(fields[ColType2].Trim(), parseErrors);
                var renewalStatus = ParseRenewalStatus(fields[ColRenewalStatus].Trim(), parseErrors);

                // Parse DateLastPaid
                DateTime? dateLastPaid = null;
                var dateLastPaidRaw = fields[ColDateLastPaid].Trim();
                if (!string.IsNullOrWhiteSpace(dateLastPaidRaw))
                {
                    if (DateTime.TryParseExact(dateLastPaidRaw, "dd/MM/yyyy",
                            CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
                    {
                        dateLastPaid = DateTime.SpecifyKind(parsedDate, DateTimeKind.Utc);
                    }
                    else
                    {
                        parseErrors.Add($"Invalid date format for Date Last Paid: '{dateLastPaidRaw}'. Expected dd/MM/yyyy.");
                    }
                }

                if (parseErrors.Count > 0)
                {
                    result.Exceptions.Add(new ImportException
                    {
                        Row = rowNumber,
                        Data = TruncateForDisplay(line),
                        Error = string.Join(" | ", parseErrors)
                    });
                    continue;
                }

                // Parse address
                var addressRaw = fields[ColAddress].Trim();
                ParseAustralianAddress(addressRaw, out var street, out var suburb, out var state, out var postcode);

                // Build the Member entity
                var member = new Member
                {
                    DonmanId = donmanId,
                    FirstName = firstName,
                    Surname = surname,
                    Title = NullIfEmpty(fields[ColTitle].Trim()),
                    Email = NullIfEmpty(fields[ColMail].Trim()),
                    Mobile = NullIfEmpty(fields[ColMobile].Trim()),
                    MailchimpName = NullIfEmpty(fields[ColMailchimpName].Trim()),
                    AddressStreet = NullIfEmpty(street),
                    AddressSuburb = NullIfEmpty(suburb),
                    AddressState = NullIfEmpty(state),
                    AddressPostcode = NullIfEmpty(postcode),
                    Notes = NullIfEmpty(fields[ColNotes].Trim()),
                    UpdateEpas = NullIfEmpty(fields[ColUpdateEpas].Trim()),
                    OrgFoundation = NullIfEmpty(fields[ColOrgFoundation].Trim()),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Members.Add(member);
                await _context.SaveChangesAsync();

                // Build the Membership entity
                var membership = new Membership
                {
                    Type = membershipType,
                    PayType = payType,
                    Status = status,
                    Rights = rights,
                    Category = category,
                    RenewalStatus = renewalStatus,
                    StartDate = DateTime.UtcNow,
                    DateLastPaid = dateLastPaid,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.Memberships.Add(membership);
                await _context.SaveChangesAsync();

                // Link via MembershipMember with Role=Primary
                var link = new MembershipMember
                {
                    MembershipId = membership.Id,
                    MemberId = member.Id,
                    Role = MembershipRole.Primary
                };

                _context.MembershipMembers.Add(link);
                await _context.SaveChangesAsync();

                // Track this DonmanId so subsequent rows in the same file are caught as duplicates
                existingDonmanIds.Add(donmanId);
                result.Imported++;
            }
            catch (Exception ex)
            {
                result.Exceptions.Add(new ImportException
                {
                    Row = rowNumber,
                    Data = TruncateForDisplay(line),
                    Error = $"Unexpected error: {ex.Message}"
                });
            }
        }

        return Ok(result);
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
        // Build query matching the same filters as the members list
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

        // Search filter: FirstName, Surname, or Email
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(x =>
                x.Member.FirstName.ToLower().Contains(term) ||
                x.Member.Surname.ToLower().Contains(term) ||
                (x.Member.Email != null && x.Member.Email.ToLower().Contains(term)));
        }

        // Filter by current membership status
        if (status.HasValue)
        {
            query = query.Where(x =>
                x.LatestMembership != null && x.LatestMembership.Status == status.Value);
        }

        // Filter by current membership category
        if (category.HasValue)
        {
            query = query.Where(x =>
                x.LatestMembership != null && x.LatestMembership.Category == category.Value);
        }

        // Filter by current renewal status
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

        // Header row
        sb.AppendLine(BuildCsvRow(new[]
        {
            "DonmanId", "FirstName", "Surname", "Title", "Email", "Mobile",
            "AddressStreet", "AddressSuburb", "AddressState", "AddressPostcode",
            "Notes", "UpdateEpas",
            "Status", "Type", "PayType", "Rights", "Category", "RenewalStatus", "DateLastPaid"
        }));

        // Data rows
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

    /// <summary>
    /// Detects the delimiter by counting tabs vs commas in the header row.
    /// </summary>
    private static char DetectDelimiter(string headerLine)
    {
        var tabCount = headerLine.Count(c => c == '\t');
        var commaCount = headerLine.Count(c => c == ',');
        return tabCount >= commaCount ? '\t' : ',';
    }

    /// <summary>
    /// Parses a CSV/TSV line, respecting quoted fields.
    /// </summary>
    private static string[] ParseCsvLine(string line, char delimiter)
    {
        var fields = new List<string>();
        var current = new StringBuilder();
        bool inQuotes = false;

        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];

            if (inQuotes)
            {
                if (c == '"')
                {
                    // Check for escaped quote (double quote)
                    if (i + 1 < line.Length && line[i + 1] == '"')
                    {
                        current.Append('"');
                        i++; // skip the next quote
                    }
                    else
                    {
                        inQuotes = false;
                    }
                }
                else
                {
                    current.Append(c);
                }
            }
            else
            {
                if (c == '"')
                {
                    inQuotes = true;
                }
                else if (c == delimiter)
                {
                    fields.Add(current.ToString());
                    current.Clear();
                }
                else
                {
                    current.Append(c);
                }
            }
        }

        fields.Add(current.ToString());
        return fields.ToArray();
    }

    /// <summary>
    /// Builds a properly escaped CSV row from an array of field values.
    /// </summary>
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

    /// <summary>
    /// Parses an Australian address string into structured components.
    /// Expected format: "5 Smith St. Mornington VIC 3931"
    /// Last token is postcode if 4 digits, second-to-last is state if it matches AU states.
    /// </summary>
    private static void ParseAustralianAddress(string address,
        out string street, out string suburb, out string state, out string postcode)
    {
        street = "";
        suburb = "";
        state = "";
        postcode = "";

        if (string.IsNullOrWhiteSpace(address))
            return;

        var tokens = address.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        if (tokens.Length == 0)
            return;

        int postcodeIndex = -1;
        int stateIndex = -1;

        // Check if the last token is a 4-digit postcode
        if (tokens.Length >= 1 && tokens[^1].Length == 4 && tokens[^1].All(char.IsDigit))
        {
            postcode = tokens[^1];
            postcodeIndex = tokens.Length - 1;

            // Check if the second-to-last token is an Australian state
            if (tokens.Length >= 2 && AustralianStates.Contains(tokens[^2]))
            {
                state = tokens[^2].ToUpper();
                stateIndex = tokens.Length - 2;
            }
        }
        else if (tokens.Length >= 1 && AustralianStates.Contains(tokens[^1]))
        {
            // Last token is a state with no postcode
            state = tokens[^1].ToUpper();
            stateIndex = tokens.Length - 1;
        }

        // Determine the boundary between street and suburb.
        // Heuristic: look for a token that ends with a period or common street suffixes,
        // then everything after that (up to state/postcode) is the suburb.
        int endOfAddress = stateIndex >= 0 ? stateIndex : (postcodeIndex >= 0 ? postcodeIndex : tokens.Length);

        // Find the end of the street portion by looking for street-type suffixes
        int streetEnd = FindStreetEnd(tokens, endOfAddress);

        if (streetEnd > 0 && streetEnd < endOfAddress)
        {
            street = string.Join(" ", tokens.Take(streetEnd));
            suburb = string.Join(" ", tokens.Skip(streetEnd).Take(endOfAddress - streetEnd));
        }
        else
        {
            // Could not determine a split point; put everything in street
            street = string.Join(" ", tokens.Take(endOfAddress));
        }
    }

    /// <summary>
    /// Finds where the street address ends and the suburb begins.
    /// Returns the index of the first suburb token, or 0 if no split point is found.
    /// </summary>
    private static int FindStreetEnd(string[] tokens, int endOfAddress)
    {
        // Common Australian street type suffixes
        var streetSuffixes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "St", "St.", "Street", "Rd", "Rd.", "Road", "Ave", "Ave.", "Avenue",
            "Dr", "Dr.", "Drive", "Ct", "Ct.", "Court", "Pl", "Pl.", "Place",
            "Cres", "Cres.", "Crescent", "Blvd", "Blvd.", "Boulevard",
            "Ln", "Ln.", "Lane", "Tce", "Tce.", "Terrace", "Way", "Cl", "Cl.", "Close",
            "Pde", "Pde.", "Parade", "Hwy", "Hwy.", "Highway", "Cir", "Cir.", "Circle",
            "Gr", "Gr.", "Grove"
        };

        for (int i = 0; i < endOfAddress; i++)
        {
            var token = tokens[i];
            // Strip trailing period for matching
            var clean = token.TrimEnd('.');

            if (streetSuffixes.Contains(token) || streetSuffixes.Contains(clean))
            {
                return i + 1; // suburb starts after this token
            }
        }

        return 0; // no split found
    }

    /// <summary>
    /// Maps a DONMAN PayType string to the PayType enum.
    /// </summary>
    private static PayType ParsePayType(string value, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add("Pay type is empty.");
            return default;
        }

        // Handle known DONMAN mappings
        var normalized = value.Replace(" ", "");
        if (string.Equals(normalized, "ANNUAL", StringComparison.OrdinalIgnoreCase))
            return PayType.Annual;
        if (string.Equals(normalized, "AUTO", StringComparison.OrdinalIgnoreCase))
            return PayType.Auto;
        if (string.Equals(normalized, "NotApplicable", StringComparison.OrdinalIgnoreCase))
            return PayType.NotApplicable;

        if (Enum.TryParse<PayType>(normalized, true, out var result))
            return result;

        errors.Add($"Invalid Pay type: '{value}'.");
        return default;
    }

    /// <summary>
    /// Maps a DONMAN Status string to the MembershipStatus enum.
    /// </summary>
    private static MembershipStatus ParseMembershipStatus(string value, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add("Status is empty.");
            return default;
        }

        var normalized = value.Replace(" ", "");
        if (string.Equals(normalized, "Active", StringComparison.OrdinalIgnoreCase))
            return MembershipStatus.Active;
        if (string.Equals(normalized, "NonActive", StringComparison.OrdinalIgnoreCase))
            return MembershipStatus.NonActive;

        if (Enum.TryParse<MembershipStatus>(normalized, true, out var result))
            return result;

        errors.Add($"Invalid Status: '{value}'.");
        return default;
    }

    /// <summary>
    /// Maps a DONMAN Type string to the MembershipType enum.
    /// </summary>
    private static MembershipType ParseMembershipType(string value, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add("Membership type is empty.");
            return default;
        }

        var normalized = value.Replace(" ", "");
        if (Enum.TryParse<MembershipType>(normalized, true, out var result))
            return result;

        errors.Add($"Invalid membership Type: '{value}'.");
        return default;
    }

    /// <summary>
    /// Maps a DONMAN Rights string to the MemberRights enum.
    /// </summary>
    private static MemberRights ParseMemberRights(string value, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add("Rights is empty.");
            return default;
        }

        var normalized = value.Replace(" ", "");
        if (string.Equals(normalized, "VotingRights", StringComparison.OrdinalIgnoreCase))
            return MemberRights.VotingRights;

        if (Enum.TryParse<MemberRights>(normalized, true, out var result))
            return result;

        errors.Add($"Invalid Rights: '{value}'.");
        return default;
    }

    /// <summary>
    /// Maps a DONMAN Type2 (Category) string to the MemberCategory enum.
    /// </summary>
    private static MemberCategory ParseMemberCategory(string value, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add("Category (Type2) is empty.");
            return default;
        }

        var normalized = value.Replace(" ", "");
        if (string.Equals(normalized, "ExBoard", StringComparison.OrdinalIgnoreCase))
            return MemberCategory.ExBoard;

        if (Enum.TryParse<MemberCategory>(normalized, true, out var result))
            return result;

        errors.Add($"Invalid Category (Type2): '{value}'.");
        return default;
    }

    /// <summary>
    /// Maps a DONMAN Renewal Status string to the RenewalStatus enum.
    /// </summary>
    private static RenewalStatus ParseRenewalStatus(string value, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add("Renewal status is empty.");
            return default;
        }

        var normalized = value.Replace(" ", "");
        if (string.Equals(normalized, "ToRenew", StringComparison.OrdinalIgnoreCase))
            return RenewalStatus.ToRenew;
        if (string.Equals(normalized, "NotRenewing", StringComparison.OrdinalIgnoreCase))
            return RenewalStatus.NotRenewing;

        if (Enum.TryParse<RenewalStatus>(normalized, true, out var result))
            return result;

        errors.Add($"Invalid Renewal Status: '{value}'.");
        return default;
    }

    /// <summary>
    /// Returns null if the string is empty or whitespace, otherwise returns the string.
    /// </summary>
    private static string? NullIfEmpty(string value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    /// <summary>
    /// Truncates a string for safe display in error messages.
    /// </summary>
    private static string TruncateForDisplay(string value, int maxLength = 500)
    {
        if (value.Length <= maxLength)
            return value;
        return value[..maxLength] + "...";
    }
}

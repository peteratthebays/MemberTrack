using System.Globalization;
using backend.DTOs;
using backend.Models;

namespace backend.Services;

public static class CsvParsingService
{
    // CSV column indices from the DONMAN export format
    public const int ColDonmanId = 0;       // DONMAN #
    public const int ColFirstName = 1;      // First Name
    public const int ColMailchimpName = 2;  // Mailchimp name
    public const int ColSurname = 3;        // Surname
    public const int ColPayType = 4;        // Pay type
    public const int ColStatus = 5;         // Status
    public const int ColType = 6;           // Type
    public const int ColRights = 7;         // Rights
    public const int ColConnectedName = 8;  // Connected Name
    public const int ColType2 = 9;          // Type2 (Category)
    public const int ColRenewalStatus = 10; // Renewal Status
    public const int ColDateLastPaid = 11;  // Date Last Paid
    public const int ColMonthLastPaid = 12; // Month Last Paid
    public const int ColNotes = 13;         // Notes
    public const int ColUpdateEpas = 14;    // Update EPAS
    public const int ColOrgFoundation = 15; // Org/Foundation
    public const int ColTitle = 16;         // TITLE
    public const int ColMail = 17;          // MAIL
    public const int ColAddress = 18;       // ADDRESS
    public const int ColMobile = 19;        // MOBILE
    public const int MinColumns = 20;

    // Australian states and territories for address parsing
    public static readonly HashSet<string> AustralianStates = new(StringComparer.OrdinalIgnoreCase)
    {
        "NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"
    };

    // Date formats tried in order when parsing date fields
    private static readonly string[] DateFormats =
    [
        "dd/MM/yyyy", "d/MM/yyyy", "d/M/yyyy",
        "dd-MM-yyyy", "d-MM-yyyy", "d-M-yyyy",
        "yyyy-MM-dd",
        "dd/MM/yy", "d/MM/yy", "d/M/yy",
        "dd.MM.yyyy", "d.MM.yyyy"
    ];

    /// <summary>
    /// Detects the delimiter by counting tabs vs commas in the header row.
    /// </summary>
    public static char DetectDelimiter(string headerLine)
    {
        var tabCount = headerLine.Count(c => c == '\t');
        var commaCount = headerLine.Count(c => c == ',');
        return tabCount >= commaCount ? '\t' : ',';
    }

    /// <summary>
    /// RFC 4180 compliant CSV/TSV line parser handling quoted fields and escaped quotes.
    /// </summary>
    public static string[] ParseCsvLine(string line, char delimiter)
    {
        var fields = new List<string>();
        var current = new System.Text.StringBuilder();
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
                        i++; // skip the second quote
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
    /// Tries multiple date formats in order and returns a UTC DateTime on success.
    /// Adds a ValidationError if all formats fail and the value is non-empty.
    /// Returns null if the value is empty or whitespace.
    /// </summary>
    public static DateTime? ParseDate(
        string value,
        string fieldName,
        int row,
        string? donmanId,
        string? name,
        List<ValidationError> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        if (DateTime.TryParseExact(value, DateFormats, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var parsed))
        {
            return DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
        }

        errors.Add(new ValidationError
        {
            Row = row,
            DonmanId = donmanId,
            Name = name,
            Field = fieldName,
            Value = value,
            Message = $"Invalid date format for {fieldName}: '{value}'. " +
                      "Expected formats: dd/MM/yyyy, d/MM/yyyy, d/M/yyyy, dd-MM-yyyy, " +
                      "d-MM-yyyy, d-M-yyyy, yyyy-MM-dd, dd/MM/yy, d/MM/yy, d/M/yy, " +
                      "dd.MM.yyyy, d.MM.yyyy."
        });

        return null;
    }

    /// <summary>
    /// Parses an Australian address string into structured components.
    /// Expected format: "5 Smith St Mornington VIC 3931"
    /// The last token is the postcode if 4 digits; the preceding token is the state if it
    /// matches an Australian state abbreviation.
    /// </summary>
    public static void ParseAustralianAddress(
        string address,
        out string street,
        out string suburb,
        out string state,
        out string postcode)
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
        // Everything from state/postcode inward is the addressable part.
        int endOfAddress = stateIndex >= 0
            ? stateIndex
            : (postcodeIndex >= 0 ? postcodeIndex : tokens.Length);

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
    /// Finds where the street address ends and the suburb begins by scanning for
    /// a recognised street type suffix. Returns the index of the first suburb token,
    /// or 0 if no split point is found.
    /// </summary>
    public static int FindStreetEnd(string[] tokens, int endOfAddress)
    {
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
    /// Valid values: Auto, Annual, NotApplicable.
    /// </summary>
    public static PayType ParsePayType(
        string value,
        int row,
        string? donmanId,
        string? name,
        List<ValidationError> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add(new ValidationError
            {
                Row = row,
                DonmanId = donmanId,
                Name = name,
                Field = "PayType",
                Value = value,
                Message = "Pay type is empty. Expected one of: Auto, Annual, NotApplicable."
            });
            return default;
        }

        var normalized = value.Replace(" ", "");

        if (string.Equals(normalized, "ANNUAL", StringComparison.OrdinalIgnoreCase))
            return PayType.Annual;
        if (string.Equals(normalized, "AUTO", StringComparison.OrdinalIgnoreCase))
            return PayType.Auto;
        if (string.Equals(normalized, "NotApplicable", StringComparison.OrdinalIgnoreCase))
            return PayType.NotApplicable;

        if (Enum.TryParse<PayType>(normalized, true, out var result))
            return result;

        errors.Add(new ValidationError
        {
            Row = row,
            DonmanId = donmanId,
            Name = name,
            Field = "PayType",
            Value = value,
            Message = $"Invalid Pay type: '{value}'. Expected one of: Auto, Annual, NotApplicable."
        });
        return default;
    }

    /// <summary>
    /// Maps a DONMAN Status string to the MembershipStatus enum.
    /// Valid values: Active, NonActive.
    /// </summary>
    public static MembershipStatus ParseMembershipStatus(
        string value,
        int row,
        string? donmanId,
        string? name,
        List<ValidationError> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add(new ValidationError
            {
                Row = row,
                DonmanId = donmanId,
                Name = name,
                Field = "Status",
                Value = value,
                Message = "Status is empty. Expected one of: Active, NonActive."
            });
            return default;
        }

        var normalized = value.Replace(" ", "");

        if (string.Equals(normalized, "Active", StringComparison.OrdinalIgnoreCase))
            return MembershipStatus.Active;
        if (string.Equals(normalized, "NonActive", StringComparison.OrdinalIgnoreCase))
            return MembershipStatus.NonActive;

        if (Enum.TryParse<MembershipStatus>(normalized, true, out var result))
            return result;

        errors.Add(new ValidationError
        {
            Row = row,
            DonmanId = donmanId,
            Name = name,
            Field = "Status",
            Value = value,
            Message = $"Invalid Status: '{value}'. Expected one of: Active, NonActive."
        });
        return default;
    }

    /// <summary>
    /// Maps a DONMAN Type string to the MembershipType enum.
    /// Valid values: Single, Couple, Family.
    /// </summary>
    public static MembershipType ParseMembershipType(
        string value,
        int row,
        string? donmanId,
        string? name,
        List<ValidationError> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add(new ValidationError
            {
                Row = row,
                DonmanId = donmanId,
                Name = name,
                Field = "Type",
                Value = value,
                Message = "Membership type is empty. Expected one of: Single, Couple, Family."
            });
            return default;
        }

        var normalized = value.Replace(" ", "");

        if (Enum.TryParse<MembershipType>(normalized, true, out var result))
            return result;

        errors.Add(new ValidationError
        {
            Row = row,
            DonmanId = donmanId,
            Name = name,
            Field = "Type",
            Value = value,
            Message = $"Invalid membership Type: '{value}'. Expected one of: Single, Couple, Family."
        });
        return default;
    }

    /// <summary>
    /// Maps a DONMAN Rights string to the MemberRights enum.
    /// Valid values: Paid, Associate, VotingRights.
    /// </summary>
    public static MemberRights ParseMemberRights(
        string value,
        int row,
        string? donmanId,
        string? name,
        List<ValidationError> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add(new ValidationError
            {
                Row = row,
                DonmanId = donmanId,
                Name = name,
                Field = "Rights",
                Value = value,
                Message = "Rights is empty. Expected one of: Paid, Associate, VotingRights."
            });
            return default;
        }

        var normalized = value.Replace(" ", "");

        if (string.Equals(normalized, "VotingRights", StringComparison.OrdinalIgnoreCase))
            return MemberRights.VotingRights;

        if (Enum.TryParse<MemberRights>(normalized, true, out var result))
            return result;

        errors.Add(new ValidationError
        {
            Row = row,
            DonmanId = donmanId,
            Name = name,
            Field = "Rights",
            Value = value,
            Message = $"Invalid Rights: '{value}'. Expected one of: Paid, Associate, VotingRights."
        });
        return default;
    }

    /// <summary>
    /// Maps a DONMAN Type2 (Category) string to the MemberCategory enum.
    /// Valid values: Community, Life, Volunteer, ExBoard, Board, Doctor, Family, Staff.
    /// </summary>
    public static MemberCategory ParseMemberCategory(
        string value,
        int row,
        string? donmanId,
        string? name,
        List<ValidationError> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add(new ValidationError
            {
                Row = row,
                DonmanId = donmanId,
                Name = name,
                Field = "Category",
                Value = value,
                Message = "Category (Type2) is empty. Expected one of: Community, Life, Volunteer, ExBoard, Board, Doctor, Family, Staff."
            });
            return default;
        }

        var normalized = value.Replace(" ", "");

        if (string.Equals(normalized, "ExBoard", StringComparison.OrdinalIgnoreCase))
            return MemberCategory.ExBoard;

        if (Enum.TryParse<MemberCategory>(normalized, true, out var result))
            return result;

        errors.Add(new ValidationError
        {
            Row = row,
            DonmanId = donmanId,
            Name = name,
            Field = "Category",
            Value = value,
            Message = $"Invalid Category (Type2): '{value}'. Expected one of: Community, Life, Volunteer, ExBoard, Board, Doctor, Family, Staff."
        });
        return default;
    }

    /// <summary>
    /// Maps a DONMAN Renewal Status string to the RenewalStatus enum.
    /// Valid values: New, Renewed, ToRenew, Overdue, NotRenewing.
    /// </summary>
    public static RenewalStatus ParseRenewalStatus(
        string value,
        int row,
        string? donmanId,
        string? name,
        List<ValidationError> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add(new ValidationError
            {
                Row = row,
                DonmanId = donmanId,
                Name = name,
                Field = "RenewalStatus",
                Value = value,
                Message = "Renewal status is empty. Expected one of: New, Renewed, ToRenew, Overdue, NotRenewing."
            });
            return default;
        }

        var normalized = value.Replace(" ", "");

        if (string.Equals(normalized, "ToRenew", StringComparison.OrdinalIgnoreCase))
            return RenewalStatus.ToRenew;
        if (string.Equals(normalized, "NotRenewing", StringComparison.OrdinalIgnoreCase))
            return RenewalStatus.NotRenewing;

        if (Enum.TryParse<RenewalStatus>(normalized, true, out var result))
            return result;

        errors.Add(new ValidationError
        {
            Row = row,
            DonmanId = donmanId,
            Name = name,
            Field = "RenewalStatus",
            Value = value,
            Message = $"Invalid Renewal Status: '{value}'. Expected one of: New, Renewed, ToRenew, Overdue, NotRenewing."
        });
        return default;
    }

    /// <summary>
    /// Returns null if the string is empty or whitespace, otherwise returns the string as-is.
    /// </summary>
    public static string? NullIfEmpty(string value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value;
    }

    /// <summary>
    /// Parses a single CSV/TSV data row into a ParsedRow result.
    /// All field errors are collected before returning — parsing does not stop at the first failure.
    /// </summary>
    public static ParsedRow ParseRow(string line, char delimiter, int rowNumber)
    {
        var parsed = new ParsedRow { RowNumber = rowNumber };

        var fields = ParseCsvLine(line, delimiter);

        if (fields.Length < MinColumns)
        {
            parsed.Errors.Add(new ValidationError
            {
                Row = rowNumber,
                Field = "ColumnCount",
                Value = fields.Length.ToString(),
                Message = $"Expected at least {MinColumns} columns but found {fields.Length}."
            });
            parsed.IsValid = false;
            return parsed;
        }

        // Parse DonmanId — keep the raw value for error context even when parsing fails
        var donmanIdRaw = fields[ColDonmanId].Trim();
        parsed.RawDonmanId = donmanIdRaw;

        if (string.IsNullOrWhiteSpace(donmanIdRaw))
        {
            parsed.Errors.Add(new ValidationError
            {
                Row = rowNumber,
                Field = "DonmanId",
                Value = donmanIdRaw,
                Message = "DONMAN # is empty."
            });
            parsed.IsValid = false;
            return parsed;
        }

        if (!int.TryParse(donmanIdRaw, out var donmanId))
        {
            parsed.Errors.Add(new ValidationError
            {
                Row = rowNumber,
                Field = "DonmanId",
                Value = donmanIdRaw,
                Message = $"Invalid DONMAN # value: '{donmanIdRaw}'. Expected a whole number."
            });
            parsed.IsValid = false;
            return parsed;
        }

        parsed.DonmanId = donmanId;

        // Build a display name for error reporting from the name columns
        var firstName = fields[ColFirstName].Trim();
        var surname = fields[ColSurname].Trim();
        parsed.Name = $"{firstName} {surname}".Trim();

        // Parse all enum fields, collecting every error before deciding validity
        var payType = ParsePayType(
            fields[ColPayType].Trim(), rowNumber, donmanIdRaw, parsed.Name, parsed.Errors);

        var status = ParseMembershipStatus(
            fields[ColStatus].Trim(), rowNumber, donmanIdRaw, parsed.Name, parsed.Errors);

        var membershipType = ParseMembershipType(
            fields[ColType].Trim(), rowNumber, donmanIdRaw, parsed.Name, parsed.Errors);

        var rights = ParseMemberRights(
            fields[ColRights].Trim(), rowNumber, donmanIdRaw, parsed.Name, parsed.Errors);

        var category = ParseMemberCategory(
            fields[ColType2].Trim(), rowNumber, donmanIdRaw, parsed.Name, parsed.Errors);

        var renewalStatus = ParseRenewalStatus(
            fields[ColRenewalStatus].Trim(), rowNumber, donmanIdRaw, parsed.Name, parsed.Errors);

        // Parse DateLastPaid with multi-format support
        var dateLastPaid = ParseDate(
            fields[ColDateLastPaid].Trim(),
            "DateLastPaid",
            rowNumber,
            donmanIdRaw,
            parsed.Name,
            parsed.Errors);

        // Parse address (never produces validation errors; best-effort decomposition)
        ParseAustralianAddress(
            fields[ColAddress].Trim(),
            out var street, out var suburb, out var state, out var postcode);

        if (parsed.Errors.Count > 0)
        {
            parsed.IsValid = false;
            return parsed;
        }

        // All fields valid — build the entity objects
        parsed.Member = new Member
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

        parsed.Membership = new Membership
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

        parsed.IsValid = true;
        return parsed;
    }

    /// <summary>
    /// Represents the outcome of parsing a single CSV data row.
    /// </summary>
    public class ParsedRow
    {
        public bool IsValid { get; set; }
        public int RowNumber { get; set; }
        public string? RawDonmanId { get; set; }
        public int DonmanId { get; set; }
        public string? Name { get; set; }
        public Member? Member { get; set; }
        public Membership? Membership { get; set; }
        public List<ValidationError> Errors { get; set; } = [];
    }
}

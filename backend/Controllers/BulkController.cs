using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BulkController : ControllerBase
{
    private readonly AppDbContext _context;

    public BulkController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// PUT /api/bulk/membership-status — Bulk update membership status and/or renewal status.
    /// </summary>
    [HttpPut("membership-status")]
    public async Task<ActionResult<BulkUpdateResult>> UpdateMembershipStatus(BulkUpdateStatusDto dto)
    {
        if (dto.MemberIds.Count == 0)
        {
            return BadRequest("No member IDs provided.");
        }

        // Parse and validate the Status enum value if provided
        MembershipStatus? parsedStatus = null;
        if (!string.IsNullOrWhiteSpace(dto.Status))
        {
            if (!Enum.TryParse<MembershipStatus>(dto.Status, ignoreCase: true, out var s))
            {
                return BadRequest($"Invalid status value: '{dto.Status}'. Valid values: {string.Join(", ", Enum.GetNames<MembershipStatus>())}");
            }
            parsedStatus = s;
        }

        // Parse and validate the RenewalStatus enum value if provided
        RenewalStatus? parsedRenewalStatus = null;
        if (!string.IsNullOrWhiteSpace(dto.RenewalStatus))
        {
            if (!Enum.TryParse<RenewalStatus>(dto.RenewalStatus, ignoreCase: true, out var r))
            {
                return BadRequest($"Invalid renewal status value: '{dto.RenewalStatus}'. Valid values: {string.Join(", ", Enum.GetNames<RenewalStatus>())}");
            }
            parsedRenewalStatus = r;
        }

        if (parsedStatus is null && parsedRenewalStatus is null)
        {
            return BadRequest("At least one of 'status' or 'renewalStatus' must be provided.");
        }

        // For each member, find the most recent membership via MembershipMembers join
        // ordered by StartDate descending
        var latestMembershipIds = await _context.MembershipMembers
            .Where(mm => dto.MemberIds.Contains(mm.MemberId))
            .GroupBy(mm => mm.MemberId)
            .Select(g => g
                .OrderByDescending(mm => mm.Membership.StartDate)
                .Select(mm => mm.MembershipId)
                .FirstOrDefault())
            .ToListAsync();

        if (latestMembershipIds.Count == 0)
        {
            return Ok(new BulkUpdateResult { Updated = 0 });
        }

        // Load the memberships to update
        var memberships = await _context.Memberships
            .Where(m => latestMembershipIds.Contains(m.Id))
            .ToListAsync();

        foreach (var membership in memberships)
        {
            if (parsedStatus.HasValue)
            {
                membership.Status = parsedStatus.Value;
            }
            if (parsedRenewalStatus.HasValue)
            {
                membership.RenewalStatus = parsedRenewalStatus.Value;
            }
            membership.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return Ok(new BulkUpdateResult { Updated = memberships.Count });
    }
}

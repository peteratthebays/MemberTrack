using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// GET /api/dashboard — Returns dashboard statistics.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<DashboardDto>> GetDashboard()
    {
        // Total members
        var totalMembers = await _context.Members.CountAsync();

        // Build a query that gets each member's latest membership
        var membersWithLatestMembership = _context.Members
            .AsNoTracking()
            .Select(m => new
            {
                MemberId = m.Id,
                LatestMembership = m.MembershipMembers
                    .OrderByDescending(mm => mm.Membership.StartDate)
                    .Select(mm => mm.Membership)
                    .FirstOrDefault()
            })
            .Where(x => x.LatestMembership != null);

        // Active members: latest membership has Status = Active
        var activeMembers = await membersWithLatestMembership
            .CountAsync(x => x.LatestMembership!.Status == MembershipStatus.Active);

        // Renewals due: latest membership has RenewalStatus = ToRenew or Overdue
        var renewalsDue = await membersWithLatestMembership
            .CountAsync(x =>
                x.LatestMembership!.RenewalStatus == RenewalStatus.ToRenew ||
                x.LatestMembership!.RenewalStatus == RenewalStatus.Overdue);

        // Members by category (grouped count from latest membership)
        var membersByCategory = await membersWithLatestMembership
            .GroupBy(x => x.LatestMembership!.Category)
            .Select(g => new CategoryCount
            {
                Category = g.Key.ToString(),
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .ToListAsync();

        // Members by renewal status (grouped count from latest membership)
        var membersByRenewalStatus = await membersWithLatestMembership
            .GroupBy(x => x.LatestMembership!.RenewalStatus)
            .Select(g => new RenewalStatusCount
            {
                RenewalStatus = g.Key.ToString(),
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .ToListAsync();

        var dashboard = new DashboardDto
        {
            TotalMembers = totalMembers,
            ActiveMembers = activeMembers,
            RenewalsDue = renewalsDue,
            MembersByCategory = membersByCategory,
            MembersByRenewalStatus = membersByRenewalStatus
        };

        return Ok(dashboard);
    }
}

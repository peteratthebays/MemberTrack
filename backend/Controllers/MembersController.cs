using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MembersController : ControllerBase
{
    private readonly AppDbContext _context;

    public MembersController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// GET /api/members — List all members with search, filter, and pagination.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<MemberListDto>>> GetMembers(
        [FromQuery] string? search,
        [FromQuery] MembershipStatus? status,
        [FromQuery] MemberCategory? category,
        [FromQuery] RenewalStatus? renewalStatus,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 25;
        if (pageSize > 100) pageSize = 100;

        // Start with all members, including their most recent membership info
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

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderBy(x => x.Member.Surname)
            .ThenBy(x => x.Member.FirstName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new MemberListDto
            {
                Id = x.Member.Id,
                DonmanId = x.Member.DonmanId,
                FirstName = x.Member.FirstName,
                Surname = x.Member.Surname,
                Email = x.Member.Email,
                Mobile = x.Member.Mobile,
                CurrentMembershipStatus = x.LatestMembership != null
                    ? x.LatestMembership.Status.ToString()
                    : null,
                CurrentRenewalStatus = x.LatestMembership != null
                    ? x.LatestMembership.RenewalStatus.ToString()
                    : null,
                CurrentCategory = x.LatestMembership != null
                    ? x.LatestMembership.Category.ToString()
                    : null
            })
            .ToListAsync();

        var result = new PagedResult<MemberListDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };

        return Ok(result);
    }

    /// <summary>
    /// GET /api/members/{id} — Get a single member with full details.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<MemberDto>> GetMember(int id)
    {
        var member = await _context.Members
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == id);

        if (member is null)
        {
            return NotFound();
        }

        return Ok(MapToMemberDto(member));
    }

    /// <summary>
    /// POST /api/members — Create a new member.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<MemberDto>> CreateMember(CreateMemberDto dto)
    {
        var member = new Member
        {
            DonmanId = dto.DonmanId,
            FirstName = dto.FirstName,
            Surname = dto.Surname,
            Title = dto.Title,
            Email = dto.Email,
            Mobile = dto.Mobile,
            MailchimpName = dto.MailchimpName,
            AddressStreet = dto.AddressStreet,
            AddressSuburb = dto.AddressSuburb,
            AddressState = dto.AddressState,
            AddressPostcode = dto.AddressPostcode,
            Notes = dto.Notes,
            UpdateEpas = dto.UpdateEpas,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Members.Add(member);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMember), new { id = member.Id }, MapToMemberDto(member));
    }

    /// <summary>
    /// PUT /api/members/{id} — Update an existing member.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<MemberDto>> UpdateMember(int id, UpdateMemberDto dto)
    {
        var member = await _context.Members.FindAsync(id);

        if (member is null)
        {
            return NotFound();
        }

        member.DonmanId = dto.DonmanId;
        member.FirstName = dto.FirstName;
        member.Surname = dto.Surname;
        member.Title = dto.Title;
        member.Email = dto.Email;
        member.Mobile = dto.Mobile;
        member.MailchimpName = dto.MailchimpName;
        member.AddressStreet = dto.AddressStreet;
        member.AddressSuburb = dto.AddressSuburb;
        member.AddressState = dto.AddressState;
        member.AddressPostcode = dto.AddressPostcode;
        member.Notes = dto.Notes;
        member.UpdateEpas = dto.UpdateEpas;
        member.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(MapToMemberDto(member));
    }

    /// <summary>
    /// DELETE /api/members/{id} — Delete a member.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteMember(int id)
    {
        var member = await _context.Members.FindAsync(id);

        if (member is null)
        {
            return NotFound();
        }

        _context.Members.Remove(member);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static MemberDto MapToMemberDto(Member member)
    {
        return new MemberDto
        {
            Id = member.Id,
            DonmanId = member.DonmanId,
            FirstName = member.FirstName,
            Surname = member.Surname,
            Title = member.Title,
            Email = member.Email,
            Mobile = member.Mobile,
            MailchimpName = member.MailchimpName,
            AddressStreet = member.AddressStreet,
            AddressSuburb = member.AddressSuburb,
            AddressState = member.AddressState,
            AddressPostcode = member.AddressPostcode,
            Notes = member.Notes,
            UpdateEpas = member.UpdateEpas,
            CreatedAt = member.CreatedAt,
            UpdatedAt = member.UpdatedAt
        };
    }
}

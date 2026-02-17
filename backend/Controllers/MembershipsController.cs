using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.DTOs;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MembershipsController : ControllerBase
{
    private readonly AppDbContext _context;

    public MembershipsController(AppDbContext context)
    {
        _context = context;
    }

    // GET /api/memberships
    [HttpGet]
    public async Task<ActionResult<List<MembershipDto>>> GetAll()
    {
        var memberships = await _context.Memberships
            .Include(m => m.MembershipMembers)
                .ThenInclude(mm => mm.Member)
            .AsNoTracking()
            .ToListAsync();

        var dtos = memberships.Select(MapToDto).ToList();
        return Ok(dtos);
    }

    // GET /api/memberships/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<MembershipDto>> GetById(int id)
    {
        var membership = await _context.Memberships
            .Include(m => m.MembershipMembers)
                .ThenInclude(mm => mm.Member)
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == id);

        if (membership == null)
            return NotFound();

        return Ok(MapToDto(membership));
    }

    // GET /api/members/{memberId}/memberships
    [HttpGet("/api/members/{memberId}/memberships")]
    public async Task<ActionResult<List<MembershipDto>>> GetByMember(int memberId)
    {
        var memberExists = await _context.Members.AnyAsync(m => m.Id == memberId);
        if (!memberExists)
            return NotFound();

        var memberships = await _context.Memberships
            .Include(m => m.MembershipMembers)
                .ThenInclude(mm => mm.Member)
            .Where(m => m.MembershipMembers.Any(mm => mm.MemberId == memberId))
            .OrderByDescending(m => m.StartDate)
            .AsNoTracking()
            .ToListAsync();

        var dtos = memberships.Select(MapToDto).ToList();
        return Ok(dtos);
    }

    // POST /api/memberships
    [HttpPost]
    public async Task<ActionResult<MembershipDto>> Create(CreateMembershipDto dto)
    {
        if (!TryParseEnums(dto.Type, dto.PayType, dto.Status, dto.Rights, dto.Category, dto.RenewalStatus,
                out var type, out var payType, out var status, out var rights, out var category, out var renewalStatus,
                out var errors))
        {
            return BadRequest(new { errors });
        }

        var memberRoles = new List<(int MemberId, MembershipRole Role)>();
        foreach (var memberDto in dto.Members)
        {
            if (!Enum.TryParse<MembershipRole>(memberDto.Role, true, out var role))
            {
                return BadRequest(new { errors = new[] { $"Invalid MembershipRole value: '{memberDto.Role}'" } });
            }
            memberRoles.Add((memberDto.MemberId, role));
        }

        var now = DateTime.UtcNow;

        var membership = new Membership
        {
            Type = type,
            PayType = payType,
            Status = status,
            Rights = rights,
            Category = category,
            RenewalStatus = renewalStatus,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            DateLastPaid = dto.DateLastPaid,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Memberships.Add(membership);
        await _context.SaveChangesAsync();

        foreach (var (memberId, role) in memberRoles)
        {
            _context.MembershipMembers.Add(new MembershipMember
            {
                MembershipId = membership.Id,
                MemberId = memberId,
                Role = role
            });
        }

        await _context.SaveChangesAsync();

        // Reload with navigation properties
        var created = await _context.Memberships
            .Include(m => m.MembershipMembers)
                .ThenInclude(mm => mm.Member)
            .AsNoTracking()
            .FirstAsync(m => m.Id == membership.Id);

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, MapToDto(created));
    }

    // PUT /api/memberships/{id}
    [HttpPut("{id}")]
    public async Task<ActionResult<MembershipDto>> Update(int id, UpdateMembershipDto dto)
    {
        var membership = await _context.Memberships
            .Include(m => m.MembershipMembers)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (membership == null)
            return NotFound();

        if (!TryParseEnums(dto.Type, dto.PayType, dto.Status, dto.Rights, dto.Category, dto.RenewalStatus,
                out var type, out var payType, out var status, out var rights, out var category, out var renewalStatus,
                out var errors))
        {
            return BadRequest(new { errors });
        }

        var memberRoles = new List<(int MemberId, MembershipRole Role)>();
        foreach (var memberDto in dto.Members)
        {
            if (!Enum.TryParse<MembershipRole>(memberDto.Role, true, out var role))
            {
                return BadRequest(new { errors = new[] { $"Invalid MembershipRole value: '{memberDto.Role}'" } });
            }
            memberRoles.Add((memberDto.MemberId, role));
        }

        membership.Type = type;
        membership.PayType = payType;
        membership.Status = status;
        membership.Rights = rights;
        membership.Category = category;
        membership.RenewalStatus = renewalStatus;
        membership.StartDate = dto.StartDate;
        membership.EndDate = dto.EndDate;
        membership.DateLastPaid = dto.DateLastPaid;
        membership.UpdatedAt = DateTime.UtcNow;

        // Remove old member links
        _context.MembershipMembers.RemoveRange(membership.MembershipMembers);

        // Add new member links
        foreach (var (memberId, role) in memberRoles)
        {
            _context.MembershipMembers.Add(new MembershipMember
            {
                MembershipId = membership.Id,
                MemberId = memberId,
                Role = role
            });
        }

        await _context.SaveChangesAsync();

        // Reload with navigation properties
        var updated = await _context.Memberships
            .Include(m => m.MembershipMembers)
                .ThenInclude(mm => mm.Member)
            .AsNoTracking()
            .FirstAsync(m => m.Id == membership.Id);

        return Ok(MapToDto(updated));
    }

    // DELETE /api/memberships/{id}
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
        var membership = await _context.Memberships.FindAsync(id);

        if (membership == null)
            return NotFound();

        _context.Memberships.Remove(membership);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // --- Private helpers ---

    private static MembershipDto MapToDto(Membership membership)
    {
        return new MembershipDto
        {
            Id = membership.Id,
            Type = membership.Type.ToString(),
            PayType = membership.PayType.ToString(),
            Status = membership.Status.ToString(),
            Rights = membership.Rights.ToString(),
            Category = membership.Category.ToString(),
            RenewalStatus = membership.RenewalStatus.ToString(),
            StartDate = membership.StartDate,
            EndDate = membership.EndDate,
            DateLastPaid = membership.DateLastPaid,
            CreatedAt = membership.CreatedAt,
            UpdatedAt = membership.UpdatedAt,
            Members = membership.MembershipMembers.Select(mm => new MembershipMemberDto
            {
                MemberId = mm.MemberId,
                FirstName = mm.Member.FirstName,
                Surname = mm.Member.Surname,
                Role = mm.Role.ToString()
            }).ToList()
        };
    }

    private static bool TryParseEnums(
        string typeStr, string payTypeStr, string statusStr,
        string rightsStr, string categoryStr, string renewalStatusStr,
        out MembershipType type, out PayType payType, out MembershipStatus status,
        out MemberRights rights, out MemberCategory category, out RenewalStatus renewalStatus,
        out List<string> errors)
    {
        type = default;
        payType = default;
        status = default;
        rights = default;
        category = default;
        renewalStatus = default;
        errors = [];

        if (!Enum.TryParse(typeStr, true, out type))
            errors.Add($"Invalid MembershipType value: '{typeStr}'");

        if (!Enum.TryParse(payTypeStr, true, out payType))
            errors.Add($"Invalid PayType value: '{payTypeStr}'");

        if (!Enum.TryParse(statusStr, true, out status))
            errors.Add($"Invalid MembershipStatus value: '{statusStr}'");

        if (!Enum.TryParse(rightsStr, true, out rights))
            errors.Add($"Invalid MemberRights value: '{rightsStr}'");

        if (!Enum.TryParse(categoryStr, true, out category))
            errors.Add($"Invalid MemberCategory value: '{categoryStr}'");

        if (!Enum.TryParse(renewalStatusStr, true, out renewalStatus))
            errors.Add($"Invalid RenewalStatus value: '{renewalStatusStr}'");

        return errors.Count == 0;
    }
}

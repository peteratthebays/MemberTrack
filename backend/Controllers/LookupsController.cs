using Microsoft.AspNetCore.Mvc;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LookupsController : ControllerBase
{
    [HttpGet]
    public IActionResult GetAll()
    {
        var lookups = new
        {
            PayTypes = Enum.GetNames<PayType>(),
            MembershipStatuses = Enum.GetNames<MembershipStatus>(),
            MembershipTypes = Enum.GetNames<MembershipType>(),
            MemberRights = Enum.GetNames<MemberRights>(),
            MemberCategories = Enum.GetNames<MemberCategory>(),
            RenewalStatuses = Enum.GetNames<RenewalStatus>(),
            MembershipRoles = Enum.GetNames<MembershipRole>()
        };

        return Ok(lookups);
    }
}

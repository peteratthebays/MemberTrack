using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _context;

    public HealthController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult> Get()
    {
        var canConnect = await _context.Database.CanConnectAsync();
        return Ok(new
        {
            status = "healthy",
            database = canConnect ? "connected" : "unavailable",
            timestamp = DateTime.UtcNow
        });
    }
}

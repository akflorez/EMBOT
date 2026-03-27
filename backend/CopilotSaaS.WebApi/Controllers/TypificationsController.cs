using System;
using System.Linq;
using System.Threading.Tasks;
using CopilotSaaS.Domain.Entities;
using CopilotSaaS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CopilotSaaS.WebApi.Controllers
{
    [ApiController]
    [Route("api/v1/typifications")]
    public class TypificationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TypificationsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetTypifications([FromQuery] Guid companyId)
        {
            if (companyId == Guid.Empty) return BadRequest("companyId es requerido");

            var typifications = await _context.Typifications
                .Where(t => t.CompanyId == companyId)
                .OrderBy(t => t.Name)
                .ToListAsync();

            return Ok(typifications);
        }

        [HttpPost]
        public async Task<IActionResult> CreateTypification([FromBody] CreateTypificationDto dto)
        {
            var typification = new Typification
            {
                CompanyId = dto.CompanyId,
                Name = dto.Name,
                ColorHex = dto.ColorHex,
                RequiresFollowup = dto.RequiresFollowup
            };

            _context.Typifications.Add(typification);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTypifications), new { id = typification.Id }, typification);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTypification(Guid id, [FromBody] UpdateTypificationDto dto)
        {
            var typification = await _context.Typifications.FindAsync(id);
            if (typification == null) return NotFound();

            typification.Name = dto.Name;
            typification.ColorHex = dto.ColorHex;
            typification.RequiresFollowup = dto.RequiresFollowup;
            typification.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(typification);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTypification(Guid id)
        {
            var typification = await _context.Typifications.FindAsync(id);
            if (typification == null) return NotFound();

            _context.Typifications.Remove(typification);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    public class CreateTypificationDto
    {
        public Guid CompanyId { get; set; }
        public string Name { get; set; }
        public string ColorHex { get; set; } = "#cccccc";
        public bool RequiresFollowup { get; set; }
    }

    public class UpdateTypificationDto
    {
        public string Name { get; set; }
        public string ColorHex { get; set; }
        public bool RequiresFollowup { get; set; }
    }
}

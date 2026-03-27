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
    [Route("api/v1/agreements")]
    public class AgreementsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AgreementsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAgreements([FromQuery] Guid companyId)
        {
            if (companyId == Guid.Empty) return BadRequest("companyId es requerido");

            var agreements = await _context.Agreements
                .Include(a => a.Contact)
                .Where(a => a.CompanyId == companyId)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            return Ok(agreements);
        }

        [HttpPost]
        public async Task<IActionResult> CreateAgreement([FromBody] CreateAgreementDto dto)
        {
            var agreement = new Agreement
            {
                CompanyId = dto.CompanyId,
                ContactId = dto.ContactId,
                ConversationId = dto.ConversationId,
                AgentId = dto.AgentId,
                Amount = dto.Amount,
                PaymentDate = dto.PaymentDate,
                Status = dto.Status,
                Origin = dto.Origin,
                Observations = dto.Observations
            };

            _context.Agreements.Add(agreement);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAgreements), new { id = agreement.Id }, agreement);
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateAgreementStatus(Guid id, [FromBody] UpdateAgreementStatusDto dto)
        {
            var agreement = await _context.Agreements.FindAsync(id);
            if (agreement == null) return NotFound("Acuerdo no encontrado");

            agreement.Status = dto.Status;
            agreement.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(agreement);
        }
    }

    public class CreateAgreementDto
    {
        public Guid CompanyId { get; set; }
        public Guid ContactId { get; set; }
        public string ConversationId { get; set; }
        public Guid? AgentId { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public string Status { get; set; } = "GENERATED";
        public string Origin { get; set; } = "HUMAN";
        public string Observations { get; set; }
    }

    public class UpdateAgreementStatusDto
    {
        public string Status { get; set; }
    }
}

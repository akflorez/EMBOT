using CopilotSaaS.Application.Interfaces;
using CopilotSaaS.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace CopilotSaaS.WebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SettingsController : ControllerBase
    {
        private readonly ICompanySettingsRepository _settingsRepository;

        public SettingsController(ICompanySettingsRepository settingsRepository)
        {
            _settingsRepository = settingsRepository;
        }

        [HttpGet("{companyId}")]
        public async Task<IActionResult> GetSettings(Guid companyId, CancellationToken cancellationToken)
        {
            var settings = await _settingsRepository.GetByCompanyIdAsync(companyId, cancellationToken);
            if (settings == null)
            {
                // Return default settings if none exist
                return Ok(new CompanySettings { CompanyId = companyId, BaseSystemPrompt = "Actúa como un Asistente Inteligente..." });
            }
            return Ok(settings);
        }

        [HttpPost]
        public async Task<IActionResult> SaveSettings([FromBody] CompanySettings settings, CancellationToken cancellationToken)
        {
            var existing = await _settingsRepository.GetByCompanyIdAsync(settings.CompanyId, cancellationToken);
            if (existing == null)
            {
                await _settingsRepository.AddAsync(settings, cancellationToken);
            }
            else
            {
                // Update existing
                existing.BaseSystemPrompt = settings.BaseSystemPrompt;
                existing.WhatsAppPhoneId = settings.WhatsAppPhoneId;
                existing.WhatsAppBusinessAccountId = settings.WhatsAppBusinessAccountId;
                existing.WhatsAppAccessToken = settings.WhatsAppAccessToken;
                existing.WhatsAppVerifyToken = settings.WhatsAppVerifyToken;
                existing.WhatsAppMode = settings.WhatsAppMode;
                existing.WhatsAppNumber = settings.WhatsAppNumber;
                await _settingsRepository.UpdateAsync(existing, cancellationToken);
            }
            return Ok(settings);
        }
    }
}

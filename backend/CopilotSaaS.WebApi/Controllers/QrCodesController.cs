using CopilotSaaS.Application.DTOs;
using CopilotSaaS.Application.Interfaces;
using CopilotSaaS.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace CopilotSaaS.WebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QrCodesController : ControllerBase
    {
        private readonly IQrCodeRepository _qrCodeRepository;

        public QrCodesController(IQrCodeRepository qrCodeRepository)
        {
            _qrCodeRepository = qrCodeRepository;
        }

        [HttpGet("{companyId}")]
        public async Task<IActionResult> GetByCompany(Guid companyId, CancellationToken cancellationToken)
        {
            var qrCodes = await _qrCodeRepository.GetByCompanyIdAsync(companyId, cancellationToken);
            return Ok(qrCodes);
        }

        [HttpPost]
        public async Task<IActionResult> CreateQrCode([FromBody] CreateQrCodeDto dto, CancellationToken cancellationToken)
        {
            var newQr = new QrCode
            {
                CompanyId = dto.CompanyId,
                Name = dto.Name,
                QrType = dto.QrType,
                DestinationUrl = dto.DestinationUrl,
                DestinationChannel = dto.DestinationChannel
            };

            var createdQr = await _qrCodeRepository.AddAsync(newQr, cancellationToken);
            return CreatedAtAction(nameof(GetByCompany), new { companyId = createdQr.CompanyId }, createdQr);
        }

        [HttpGet("{id}/scan")]
        public async Task<IActionResult> ScanQrCode(Guid id, CancellationToken cancellationToken)
        {
            var qrCode = await _qrCodeRepository.GetByIdAsync(id, cancellationToken);
            
            if (qrCode == null) return NotFound();

            qrCode.TotalScans++;
            qrCode.LastScanAt = DateTime.UtcNow;
            await _qrCodeRepository.UpdateAsync(qrCode, cancellationToken);

            // Redirect user to the destination logic (WhatsApp wa.me link with pre-filled message based on QrType)
            string redirectUrl = $"{qrCode.DestinationUrl}?text=Hola,%20vengo%20del%20QR%20{qrCode.QrType}";
            return Redirect(redirectUrl);
        }
    }
}

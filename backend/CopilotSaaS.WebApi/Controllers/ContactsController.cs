using System;
using System.Threading.Tasks;
using CopilotSaaS.Application.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using CopilotSaaS.Infrastructure.Persistence;

namespace CopilotSaaS.WebApi.Controllers
{
    [ApiController]
    [Route("api/v1/contacts")]
    public class ContactsController : ControllerBase
    {
        private readonly IContactImportService _importService;

        public ContactsController(IContactImportService importService)
        {
            _importService = importService;
        }

        [HttpPost("upload")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadContactsCsv(IFormFile file, [FromForm] Guid companyId)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "El archivo está vacío o no fue enviado." });

            if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "El archivo debe ser un .csv" });

            if (companyId == Guid.Empty)
                return BadRequest(new { message = "El companyId es obligatorio." });

            try
            {
                using var stream = file.OpenReadStream();
                var result = await _importService.ImportContactsCsvAsync(companyId, stream);

                return Ok(new
                {
                    message = "Archivo procesado",
                    result.TotalProcessed,
                    result.SuccessCount,
                    result.ErrorCount,
                    result.Errors
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Ocurrió un error procesando el archivo.", details = ex.Message });
            }
        }

        [HttpPatch("{id}/typification")]
        public async Task<IActionResult> UpdateContactTypification(
            Guid id, 
            [FromBody] UpdateContactTypificationDto dto, 
            [FromServices] AppDbContext context)
        {
            var contact = await context.Contacts.FindAsync(id);
            if (contact == null) return NotFound(new { message = "Contacto no encontrado" });

            contact.CurrentTypificationId = dto.TypificationId;
            contact.UpdatedAt = DateTime.UtcNow;

            await context.SaveChangesAsync();

            return Ok(new { message = "Tipificación actualizada", contact });
        }
    }

    public class UpdateContactTypificationDto
    {
        public Guid TypificationId { get; set; }
    }
}

using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace CopilotSaaS.Application.Services
{
    public interface IContactImportService
    {
        Task<ImportResultDto> ImportContactsCsvAsync(Guid companyId, Stream csvStream);
    }

    public class ImportResultDto
    {
        public int TotalProcessed { get; set; }
        public int SuccessCount { get; set; }
        public int ErrorCount { get; set; }
        public List<string> Errors { get; set; } = new();
    }
}

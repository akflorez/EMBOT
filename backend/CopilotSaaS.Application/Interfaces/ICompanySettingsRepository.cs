using CopilotSaaS.Domain.Entities;

namespace CopilotSaaS.Application.Interfaces
{
    public interface ICompanySettingsRepository
    {
        Task<CompanySettings?> GetByCompanyIdAsync(Guid companyId, CancellationToken cancellationToken);
        Task UpdateAsync(CompanySettings settings, CancellationToken cancellationToken);
        Task<CompanySettings> AddAsync(CompanySettings settings, CancellationToken cancellationToken);
    }
}

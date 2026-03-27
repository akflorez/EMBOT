using CopilotSaaS.Application.Interfaces;
using CopilotSaaS.Domain.Entities;
using System.Collections.Concurrent;

namespace CopilotSaaS.Infrastructure.Repositories
{
    public class DummyCompanySettingsRepository : ICompanySettingsRepository
    {
        private static readonly ConcurrentDictionary<Guid, CompanySettings> _db = new();

        public Task<CompanySettings> AddAsync(CompanySettings settings, CancellationToken cancellationToken)
        {
            settings.Id = Guid.NewGuid();
            _db[settings.CompanyId] = settings;
            return Task.FromResult(settings);
        }

        public Task<CompanySettings?> GetByCompanyIdAsync(Guid companyId, CancellationToken cancellationToken)
        {
            _db.TryGetValue(companyId, out var settings);
            return Task.FromResult(settings);
        }

        public Task UpdateAsync(CompanySettings settings, CancellationToken cancellationToken)
        {
            _db[settings.CompanyId] = settings;
            return Task.CompletedTask;
        }
    }
}

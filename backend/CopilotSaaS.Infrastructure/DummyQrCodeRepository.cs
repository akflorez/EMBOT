using CopilotSaaS.Application.Interfaces;
using CopilotSaaS.Domain.Entities;
using System.Collections.Concurrent;

namespace CopilotSaaS.Infrastructure.Repositories
{
    public class DummyQrCodeRepository : IQrCodeRepository
    {
        private static readonly ConcurrentDictionary<Guid, QrCode> _db = new();

        public Task<QrCode> AddAsync(QrCode qrCode, CancellationToken cancellationToken)
        {
            qrCode.Id = Guid.NewGuid();
            _db[qrCode.Id] = qrCode;
            return Task.FromResult(qrCode);
        }

        public Task<IEnumerable<QrCode>> GetByCompanyIdAsync(Guid companyId, CancellationToken cancellationToken)
        {
            var results = _db.Values.Where(q => q.CompanyId == companyId);
            return Task.FromResult(results);
        }

        public Task<QrCode?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
        {
            _db.TryGetValue(id, out var qrCode);
            return Task.FromResult(qrCode);
        }

        public Task UpdateAsync(QrCode qrCode, CancellationToken cancellationToken)
        {
            _db[qrCode.Id] = qrCode;
            return Task.CompletedTask;
        }
    }
}

using CopilotSaaS.Domain.Entities;

namespace CopilotSaaS.Application.Interfaces
{
    public interface IQrCodeRepository
    {
        Task<QrCode?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
        Task<IEnumerable<QrCode>> GetByCompanyIdAsync(Guid companyId, CancellationToken cancellationToken);
        Task<QrCode> AddAsync(QrCode qrCode, CancellationToken cancellationToken);
        Task UpdateAsync(QrCode qrCode, CancellationToken cancellationToken);
    }
}

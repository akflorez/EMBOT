namespace CopilotSaaS.Application.DTOs
{
    public class CreateQrCodeDto
    {
        public Guid CompanyId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string QrType { get; set; } = string.Empty;
        public string DestinationUrl { get; set; } = string.Empty;
        public string DestinationChannel { get; set; } = string.Empty;
    }
}

namespace CopilotSaaS.Domain.Entities
{
    public class QrCode : BaseEntity
    {
        public Guid CompanyId { get; set; }
        public Company? Company { get; set; }

        public Guid? CampaignId { get; set; }
        public Campaign? Campaign { get; set; }

        public string Name { get; set; } = string.Empty;
        public string QrType { get; set; } = string.Empty; 
        public string DestinationUrl { get; set; } = string.Empty;
        public string DestinationChannel { get; set; } = string.Empty;
        public string Status { get; set; } = "Active";
        
        public int TotalScans { get; set; } = 0;
        public DateTime? LastScanAt { get; set; }
    }
}

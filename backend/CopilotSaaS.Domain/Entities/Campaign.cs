namespace CopilotSaaS.Domain.Entities
{
    public class Campaign : BaseEntity
    {
        public Guid CompanyId { get; set; }
        public Company? Company { get; set; }

        public string Name { get; set; } = string.Empty;
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string Status { get; set; } = "Active";
        public decimal? Budget { get; set; }

        public ICollection<QrCode> QrCodes { get; set; } = new List<QrCode>();
    }
}

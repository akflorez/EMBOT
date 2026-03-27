namespace CopilotSaaS.Domain.Entities
{
    public class ResponseTemplate : BaseEntity
    {
        public Guid CompanyId { get; set; }
        public Company? Company { get; set; }

        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string ContentText { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public Guid? CreatedById { get; set; }
    }
}

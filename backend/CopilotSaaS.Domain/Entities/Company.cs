using System.Text.Json.Nodes;

namespace CopilotSaaS.Domain.Entities
{
    public class Company : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }
        public string? Description { get; set; }
        public string? Industry { get; set; }
        public string? MainEmail { get; set; }
        public string? MainPhone { get; set; }
        public string? Address { get; set; }
        public string? BusinessHours { get; set; }
        public string? Timezone { get; set; }
        public bool IsActive { get; set; } = true;

        public CompanySettings? Settings { get; set; }
        public ICollection<User> Users { get; set; } = new List<User>();
        public ICollection<Role> Roles { get; set; } = new List<Role>();
        public ICollection<ResponseTemplate> Templates { get; set; } = new List<ResponseTemplate>();
        public ICollection<QrCode> QrCodes { get; set; } = new List<QrCode>();
    }
}

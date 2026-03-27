namespace CopilotSaaS.Domain.Entities
{
    public class User : BaseEntity
    {
        public Guid CompanyId { get; set; }
        public Company? Company { get; set; }

        public Guid RoleId { get; set; }
        public Role? Role { get; set; }

        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }
}

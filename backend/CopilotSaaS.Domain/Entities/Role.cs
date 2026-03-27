using System;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace CopilotSaaS.Domain.Entities
{
    public class Role : BaseEntity
    {
        public Guid? CompanyId { get; set; }
        public Company? Company { get; set; }

        public string Name { get; set; } = string.Empty;
        public JsonDocument? Permissions { get; set; }
    }
}

using System;
using System.Collections.Generic;
using System.Text.Json;

namespace CopilotSaaS.Domain.Entities
{
    public class Typification : BaseEntity
    {
        public Guid CompanyId { get; set; }
        public Company Company { get; set; }

        public string Name { get; set; } = string.Empty;
        public string ColorHex { get; set; } = "#cccccc";
        public bool RequiresFollowup { get; set; } = false;

        public ICollection<Contact> Contacts { get; set; } = new List<Contact>();
    }
}

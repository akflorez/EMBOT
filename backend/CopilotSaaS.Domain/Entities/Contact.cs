using System;
using System.Text.Json;

namespace CopilotSaaS.Domain.Entities
{
    public class Contact : BaseEntity
    {
        public Guid CompanyId { get; set; }
        public Company Company { get; set; }

        public Guid? CurrentTypificationId { get; set; }
        public Typification CurrentTypification { get; set; }

        public string PhoneNumber { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string DocumentId { get; set; } = string.Empty;
        
        public bool IsActive { get; set; } = true;
        public DateTime? LastInteractionAt { get; set; }

        // Mapeo dinámico de campos extra del excel
        public JsonDocument Metadata { get; set; }
    }
}

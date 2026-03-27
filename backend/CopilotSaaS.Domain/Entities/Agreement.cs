using System;

namespace CopilotSaaS.Domain.Entities
{
    public class Agreement : BaseEntity
    {
        public Guid CompanyId { get; set; }
        public Company Company { get; set; }

        public Guid ContactId { get; set; }
        public Contact Contact { get; set; }

        public string ConversationId { get; set; } = string.Empty; // WhatsApp Number o ID de Hilo

        public Guid? AgentId { get; set; }
        public User Agent { get; set; }

        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        
        // GENERATED, PENDING, PAID, BROKEN, CANCELED
        public string Status { get; set; } = "GENERATED";
        
        // BOT, HUMAN, MIXED
        public string Origin { get; set; } = "HUMAN";
        
        public string Observations { get; set; } = string.Empty;
    }
}

using System.Text.Json.Nodes;
using System.Text.Json;

namespace CopilotSaaS.Domain.Entities
{
    public class CompanySettings : BaseEntity
    {
        public Guid CompanyId { get; set; }
        public Company? Company { get; set; }

        public JsonDocument? ActiveModules { get; set; }
        public string[]? AllowedChannels { get; set; }
        public string? BotWorkingHours { get; set; }
        public string? OfflineMessage { get; set; }
        
        // Custom prompts per module
        public string BaseSystemPrompt { get; set; } = string.Empty;
        public JsonDocument? EscalationRules { get; set; }
        
        // Timezone and locales
        public string TimeZone { get; set; } = "UTC";
        public string Locale { get; set; } = "es-MX";
        
        // Customization
        public string? BotName { get; set; }
        public string? ToneOfVoice { get; set; }
        public string? GreetingMessage { get; set; }
        public string? FarewellMessage { get; set; }
        public string? FallbackMessage { get; set; }
        public string? DefaultCta { get; set; }
        
        // Brand logic
        public string BrandName { get; set; } = string.Empty;
        public string BrandLogoUrl { get; set; } = string.Empty;
        public JsonDocument? BrandColors { get; set; }

        public string BusinessHours { get; set; } = string.Empty;

        // Prompt Config
        public JsonDocument? KnowledgeRules { get; set; }
        public JsonDocument? LeadCaptureFields { get; set; }
        public JsonDocument? ClassificationRules { get; set; }

        // WhatsApp Cloud API Config
        public string? WhatsAppPhoneId { get; set; }
        public string? WhatsAppBusinessAccountId { get; set; }
        public string? WhatsAppAccessToken { get; set; }
        public string? WhatsAppVerifyToken { get; set; }
        public string? WhatsAppMode { get; set; } = "Redirect"; // "Redirect" or "CloudAPI"
        public string? WhatsAppNumber { get; set; } // For QR/Click-to-chat mode
    }
}

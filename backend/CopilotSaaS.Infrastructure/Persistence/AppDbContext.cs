using CopilotSaaS.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CopilotSaaS.Infrastructure.Persistence
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<Company> Companies { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<CompanySettings> CompanySettings { get; set; }
        public DbSet<ResponseTemplate> ResponseTemplates { get; set; }
        public DbSet<QrCode> QrCodes { get; set; }
        public DbSet<Campaign> Campaigns { get; set; }
        
        // CRM Module
        public DbSet<Contact> Contacts { get; set; }
        public DbSet<Typification> Typifications { get; set; }
        public DbSet<Agreement> Agreements { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure multi-tenant isolation query filters globally
            // Note: In a real app, 'tenantId' is usually passed through a scoped service
            // This is a simplification. To fully isolate, you would inject a ITenantProvider 
            // and use it here.

            modelBuilder.Entity<Company>().HasKey(c => c.Id);
            
            // User -> Company Relation
            modelBuilder.Entity<User>()
                .HasOne(u => u.Company)
                .WithMany(c => c.Users)
                .HasForeignKey(u => u.CompanyId);

            // QrCode -> Company Relation
            modelBuilder.Entity<QrCode>()
                .HasOne(q => q.Company)
                .WithMany(c => c.QrCodes)
                .HasForeignKey(q => q.CompanyId);

            // Campaign -> QrCode Relation
            modelBuilder.Entity<QrCode>()
                .HasOne(q => q.Campaign)
                .WithMany(c => c.QrCodes)
                .HasForeignKey(q => q.CampaignId);

            // Typification -> Company
            modelBuilder.Entity<Typification>()
                .HasOne(t => t.Company)
                .WithMany()
                .HasForeignKey(t => t.CompanyId);

            // Contact -> Company
            modelBuilder.Entity<Contact>()
                .HasOne(c => c.Company)
                .WithMany()
                .HasForeignKey(c => c.CompanyId);

            // Contact -> Typification
            modelBuilder.Entity<Contact>()
                .HasOne(c => c.CurrentTypification)
                .WithMany(t => t.Contacts)
                .HasForeignKey(c => c.CurrentTypificationId)
                .OnDelete(DeleteBehavior.SetNull);

            // Contact unique constraint per company + phone
            modelBuilder.Entity<Contact>()
                .HasIndex(c => new { c.CompanyId, c.PhoneNumber })
                .IsUnique();

            modelBuilder.Entity<Agreement>(entity =>
            {
                entity.HasOne(e => e.Company)
                      .WithMany()
                      .HasForeignKey(e => e.CompanyId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Contact)
                      .WithMany()
                      .HasForeignKey(e => e.ContactId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Agent)
                      .WithMany()
                      .HasForeignKey(e => e.AgentId)
                      .OnDelete(DeleteBehavior.SetNull);
            });
        }
    }
}

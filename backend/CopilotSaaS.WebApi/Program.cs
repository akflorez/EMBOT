using CopilotSaaS.Infrastructure.Persistence;
using CopilotSaaS.Infrastructure.Repositories;
using CopilotSaaS.Application.Interfaces;
using CopilotSaaS.Application.Services;
using CopilotSaaS.Infrastructure.Services;
using Scalar.AspNetCore;
using CopilotSaaS.Application.Interfaces;
using Microsoft.EntityFrameworkCore;
using CopilotSaaS.Domain.Entities;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();

// Configure Neon PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("NeonPostgresConnection");
if (!string.IsNullOrEmpty(connectionString) && connectionString != "Host=localhost;Database=dummy")
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(connectionString));
}
else
{
    // Dummy DbContext for now so it doesn't crash before the user provides it
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseInMemoryDatabase("DummyDb"));
}

builder.Services.AddScoped<IQrCodeRepository, DummyQrCodeRepository>();
builder.Services.AddScoped<ICompanySettingsRepository, DummyCompanySettingsRepository>();
builder.Services.AddScoped<IContactImportService, ContactImportService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.MapOpenApi();
app.MapScalarApiReference();

// app.UseHttpsRedirection(); // Removed to avoid local HTTPS issues
app.UseAuthorization();
app.MapControllers();

app.Run();

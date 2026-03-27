using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CopilotSaaS.Domain.Entities;
using CopilotSaaS.Infrastructure.Persistence;
using CopilotSaaS.Application.Services;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.EntityFrameworkCore;

namespace CopilotSaaS.Infrastructure.Services
{
    public class ContactImportService : IContactImportService
    {
        private readonly AppDbContext _context;

        public ContactImportService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<ImportResultDto> ImportContactsCsvAsync(Guid companyId, Stream csvStream)
        {
            var result = new ImportResultDto();
            
            using var reader = new StreamReader(csvStream);
            using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                BadDataFound = null
            });

            var records = new List<dynamic>();
            try
            {
                records = csv.GetRecords<dynamic>().ToList();
            }
            catch (Exception ex)
            {
                result.Errors.Add($"Error al parsear el archivo CSV: {ex.Message}");
                return result;
            }

            // Precarga tipificaciones de la compañia para mapeo rápido
            var typifications = await _context.Typifications
                .Where(t => t.CompanyId == companyId)
                .ToDictionaryAsync(t => t.Name.ToLowerInvariant(), t => t.Id);

            foreach (var row in records)
            {
                result.TotalProcessed++;
                try
                {
                    var recordDict = (IDictionary<string, object>)row;
                    
                    // Buscar campos obligatorios (case-insensitive)
                    var phoneKey = recordDict.Keys.FirstOrDefault(k => k.Equals("telefono", StringComparison.OrdinalIgnoreCase) || k.Equals("phone", StringComparison.OrdinalIgnoreCase) || k.Equals("numero", StringComparison.OrdinalIgnoreCase));
                    if (phoneKey == null || string.IsNullOrWhiteSpace(recordDict[phoneKey]?.ToString()))
                    {
                        result.Errors.Add($"Fila {result.TotalProcessed}: Teléfono es obligatorio.");
                        result.ErrorCount++;
                        continue;
                    }

                    var phoneNumber = recordDict[phoneKey].ToString()!.Trim();
                    
                    var nameKey = recordDict.Keys.FirstOrDefault(k => k.Equals("nombre", StringComparison.OrdinalIgnoreCase) || k.Equals("name", StringComparison.OrdinalIgnoreCase));
                    var fullName = nameKey != null ? recordDict[nameKey]?.ToString()?.Trim() ?? string.Empty : string.Empty;

                    var documentKey = recordDict.Keys.FirstOrDefault(k => k.Equals("cedula", StringComparison.OrdinalIgnoreCase) || k.Equals("document", StringComparison.OrdinalIgnoreCase) || k.Equals("nit", StringComparison.OrdinalIgnoreCase));
                    var documentId = documentKey != null ? recordDict[documentKey]?.ToString()?.Trim() ?? string.Empty : string.Empty;

                    var typificationKey = recordDict.Keys.FirstOrDefault(k => k.Equals("tipificacion", StringComparison.OrdinalIgnoreCase) || k.Equals("estado", StringComparison.OrdinalIgnoreCase));
                    var typificationName = typificationKey != null ? recordDict[typificationKey]?.ToString()?.Trim() ?? string.Empty : string.Empty;
                    Guid? typificationId = null;

                    if (!string.IsNullOrEmpty(typificationName) && typifications.TryGetValue(typificationName.ToLowerInvariant(), out var tId))
                    {
                        typificationId = tId;
                    }

                    // Metadata dinámica (El resto de las columnas no estándar)
                    var metadataDict = new Dictionary<string, string>();
                    var standardKeys = new[] { phoneKey, nameKey, documentKey, typificationKey };
                    foreach (var key in recordDict.Keys)
                    {
                        if (key != null && !standardKeys.Contains(key))
                        {
                            metadataDict[key] = recordDict[key]?.ToString() ?? string.Empty;
                        }
                    }

                    var metadataJson = JsonSerializer.SerializeToDocument(metadataDict);

                    // Buscar si existe para hacer UPSERT
                    var existingContact = await _context.Contacts
                        .FirstOrDefaultAsync(c => c.CompanyId == companyId && c.PhoneNumber == phoneNumber);

                    if (existingContact != null)
                    {
                        // Update
                        if (!string.IsNullOrEmpty(fullName)) existingContact.FullName = fullName;
                        if (!string.IsNullOrEmpty(documentId)) existingContact.DocumentId = documentId;
                        if (typificationId.HasValue) existingContact.CurrentTypificationId = typificationId;
                        existingContact.Metadata = metadataJson;
                        existingContact.UpdatedAt = DateTime.UtcNow;
                        
                        _context.Contacts.Update(existingContact);
                    }
                    else
                    {
                        // Insert
                        var newContact = new Contact
                        {
                            CompanyId = companyId,
                            PhoneNumber = phoneNumber,
                            FullName = fullName,
                            DocumentId = documentId,
                            CurrentTypificationId = typificationId,
                            Metadata = metadataJson,
                            IsActive = true
                        };
                        
                        await _context.Contacts.AddAsync(newContact);
                    }
                    
                    result.SuccessCount++;
                }
                catch (Exception ex)
                {
                    result.ErrorCount++;
                    result.Errors.Add($"Fila {result.TotalProcessed}: Error inesperado - {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();
            return result;
        }
    }
}

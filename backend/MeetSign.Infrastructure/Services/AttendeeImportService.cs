using System.Text;
using ClosedXML.Excel;
using MeetSign.Application.DTOs.Sessions;
using MeetSign.Application.Interfaces;
using MeetSign.Application.Services;
using MeetSign.Domain.Entities;
using MeetSign.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace MeetSign.Infrastructure.Services;

public class AttendeeImportService : IAttendeeImportService
{
    private readonly AppDbContext _db;

    public AttendeeImportService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<int> GetAttendeeCountAsync(Guid ownerId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        await EnsureOwnedSessionAsync(ownerId, sessionId, cancellationToken);
        return await _db.Attendees.CountAsync(a => a.SessionId == sessionId, cancellationToken);
    }

    public async Task<ImportResultDto> ImportAsync(Guid ownerId, Guid sessionId, Stream stream, string fileName, CancellationToken cancellationToken = default)
    {
        var session = await GetSessionWithFieldsAsync(ownerId, sessionId, cancellationToken);
        var fields = session.Event.FieldDefinitions.OrderBy(f => f.SortOrder).ToList();
        var rows = fileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase)
            ? ParseCsv(stream)
            : ParseExcel(stream);

        return await ImportRowsAsync(sessionId, fields, rows, cancellationToken);
    }

    public async Task<ImportResultDto> ImportTextAsync(Guid ownerId, Guid sessionId, string text, CancellationToken cancellationToken = default)
    {
        var session = await GetSessionWithFieldsAsync(ownerId, sessionId, cancellationToken);
        var fields = session.Event.FieldDefinitions.OrderBy(f => f.SortOrder).ToList();
        var rows = ParseTsvText(text, fields);
        return await ImportRowsAsync(sessionId, fields, rows, cancellationToken);
    }

    private async Task<ImportResultDto> ImportRowsAsync(
        Guid sessionId,
        IReadOnlyList<FieldDefinition> fields,
        List<Dictionary<string, string>> rows,
        CancellationToken cancellationToken)
    {
        var errors = new List<string>();
        var imported = 0;
        var skipped = 0;

        foreach (var (lineNo, row) in rows.Select((r, i) => (i + 2, r)))
        {
            try
            {
                var values = MapRowToValues(row, fields);
                if (values.Values.All(string.IsNullOrWhiteSpace))
                {
                    skipped++;
                    continue;
                }

                _db.Attendees.Add(new Attendee
                {
                    Id = Guid.NewGuid(),
                    SessionId = sessionId,
                    FieldValuesJson = TemplateRenderer.ToJson(values)
                });
                imported++;
            }
            catch (Exception ex)
            {
                errors.Add($"第 {lineNo} 行: {ex.Message}");
                skipped++;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
        return new ImportResultDto(imported, skipped, errors);
    }

    private async Task<CheckInSession> GetSessionWithFieldsAsync(Guid ownerId, Guid sessionId, CancellationToken cancellationToken)
    {
        return await _db.CheckInSessions
            .Include(s => s.Event).ThenInclude(e => e.FieldDefinitions)
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.Event.OwnerId == ownerId, cancellationToken)
            ?? throw new KeyNotFoundException("场次不存在。");
    }

    private static Dictionary<string, string> MapRowToValues(Dictionary<string, string> row, IReadOnlyList<FieldDefinition> fields)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var field in fields)
        {
            if (row.TryGetValue(field.Label, out var byLabel) || row.TryGetValue(field.Key, out byLabel))
                result[field.Key] = byLabel?.Trim() ?? "";
            else
                result[field.Key] = "";
        }
        return result;
    }

    internal static List<Dictionary<string, string>> ParseTsvText(string text, IReadOnlyList<FieldDefinition> fields)
    {
        if (string.IsNullOrWhiteSpace(text))
            return [];

        var lines = text
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Replace('\r', '\n')
            .Split('\n')
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .ToList();

        if (lines.Count == 0)
            return [];

        var firstCells = SplitTsvLine(lines[0]);
        var hasHeader = firstCells.Any(cell =>
            fields.Any(f =>
                string.Equals(f.Label, cell.Trim(), StringComparison.OrdinalIgnoreCase) ||
                string.Equals(f.Key, cell.Trim(), StringComparison.OrdinalIgnoreCase)));

        if (hasHeader)
        {
            var headers = firstCells.Select(c => c.Trim()).ToList();
            var rows = new List<Dictionary<string, string>>();
            for (var i = 1; i < lines.Count; i++)
            {
                var cells = SplitTsvLine(lines[i]);
                var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                for (var c = 0; c < headers.Count; c++)
                    row[headers[c]] = c < cells.Count ? cells[c].Trim() : "";
                rows.Add(row);
            }
            return rows;
        }

        return lines.Select(line =>
        {
            var cells = SplitTsvLine(line);
            var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (var c = 0; c < fields.Count; c++)
            {
                var field = fields[c];
                row[field.Label] = c < cells.Count ? cells[c].Trim() : "";
            }
            return row;
        }).ToList();
    }

    private static List<string> SplitTsvLine(string line) =>
        line.Split('\t').ToList();

    private static List<Dictionary<string, string>> ParseExcel(Stream stream)
    {
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.First();
        var headers = new List<string>();
        var lastCol = sheet.LastColumnUsed()?.ColumnNumber() ?? 0;
        for (var c = 1; c <= lastCol; c++)
            headers.Add(sheet.Cell(1, c).GetString().Trim());

        var rows = new List<Dictionary<string, string>>();
        var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;
        for (var r = 2; r <= lastRow; r++)
        {
            var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (var c = 0; c < headers.Count; c++)
                row[headers[c]] = sheet.Cell(r, c + 1).GetString().Trim();
            rows.Add(row);
        }
        return rows;
    }

    private static List<Dictionary<string, string>> ParseCsv(Stream stream)
    {
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        var lines = new List<string>();
        while (!reader.EndOfStream)
        {
            var line = reader.ReadLine();
            if (!string.IsNullOrWhiteSpace(line))
                lines.Add(line);
        }

        if (lines.Count == 0)
            return [];

        var headers = SplitCsvLine(lines[0]);
        var rows = new List<Dictionary<string, string>>();
        for (var i = 1; i < lines.Count; i++)
        {
            var cells = SplitCsvLine(lines[i]);
            var row = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (var c = 0; c < headers.Count; c++)
                row[headers[c]] = c < cells.Count ? cells[c] : "";
            rows.Add(row);
        }
        return rows;
    }

    private static List<string> SplitCsvLine(string line)
    {
        var result = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;
        for (var i = 0; i < line.Length; i++)
        {
            var ch = line[i];
            if (ch == '"')
            {
                inQuotes = !inQuotes;
                continue;
            }
            if (ch == ',' && !inQuotes)
            {
                result.Add(current.ToString().Trim());
                current.Clear();
                continue;
            }
            current.Append(ch);
        }
        result.Add(current.ToString().Trim());
        return result;
    }

    public async Task DeleteAttendeeAsync(Guid ownerId, Guid sessionId, Guid attendeeId, CancellationToken cancellationToken = default)
    {
        var session = await _db.CheckInSessions
            .Include(s => s.Event)
            .Include(s => s.Attendees)
            .Include(s => s.Records)
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.Event.OwnerId == ownerId, cancellationToken)
            ?? throw new KeyNotFoundException("场次不存在。");

        var attendee = session.Attendees.FirstOrDefault(a => a.Id == attendeeId)
            ?? throw new KeyNotFoundException("名单记录不存在。");

        var attendeeValues = TemplateRenderer.ParseJsonValues(attendee.FieldValuesJson);
        var duplicateNames = session.Attendees
            .Select(a => GetNormalizedName(TemplateRenderer.ParseJsonValues(a.FieldValuesJson)))
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .GroupBy(name => name!, StringComparer.OrdinalIgnoreCase)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var name = GetNormalizedName(attendeeValues);
        var requiresOrganization = !string.IsNullOrWhiteSpace(name) && duplicateNames.Contains(name);

        var hasCheckInRecord = session.Records.Any(record =>
        {
            var recordValues = TemplateRenderer.ParseJsonValues(record.SubmittedValuesJson);
            return RecordMatchesAttendee(recordValues, attendeeValues, requiresOrganization);
        });

        if (hasCheckInRecord)
            throw new InvalidOperationException("该人员已有签到记录，无法删除。");

        _db.Attendees.Remove(attendee);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static string? GetNormalizedName(Dictionary<string, string> values) =>
        values.TryGetValue("name", out var name) ? name.Trim() : null;

    private static bool RecordMatchesAttendee(
        Dictionary<string, string> recordValues,
        Dictionary<string, string> attendeeValues,
        bool requiresOrganization)
    {
        var recordName = GetNormalizedName(recordValues);
        var attendeeName = GetNormalizedName(attendeeValues);
        if (string.IsNullOrWhiteSpace(recordName) || string.IsNullOrWhiteSpace(attendeeName))
            return false;
        if (!string.Equals(recordName, attendeeName, StringComparison.OrdinalIgnoreCase))
            return false;
        if (!requiresOrganization)
            return true;

        recordValues.TryGetValue("organization", out var recordOrg);
        attendeeValues.TryGetValue("organization", out var attendeeOrg);
        return string.Equals(recordOrg?.Trim(), attendeeOrg?.Trim(), StringComparison.OrdinalIgnoreCase);
    }

    private async Task EnsureOwnedSessionAsync(Guid ownerId, Guid sessionId, CancellationToken cancellationToken)
    {
        if (!await _db.CheckInSessions.AnyAsync(s => s.Id == sessionId && s.Event.OwnerId == ownerId, cancellationToken))
            throw new KeyNotFoundException("场次不存在。");
    }
}

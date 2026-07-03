using MeetSign.Application.DTOs.Sessions;
using MeetSign.Application.Interfaces;
using MeetSign.Application.Services;
using MeetSign.Domain.Entities;
using MeetSign.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace MeetSign.Infrastructure.Services;

public class SessionService : ISessionService
{
    private readonly AppDbContext _db;
    private readonly IQrCodeService _qrCodeService;
    private readonly string _publicCheckInBaseUrl;

    public SessionService(AppDbContext db, IQrCodeService qrCodeService, IConfiguration configuration)
    {
        _db = db;
        _qrCodeService = qrCodeService;
        _publicCheckInBaseUrl = configuration["PublicCheckInBaseUrl"]?.TrimEnd('/') ?? "http://localhost:5174";
    }

    public async Task<IReadOnlyList<SessionListItemDto>> ListByEventAsync(Guid ownerId, Guid eventId, CancellationToken cancellationToken = default)
    {
        await EnsureEventOwnedAsync(ownerId, eventId, cancellationToken);

        return await _db.CheckInSessions
            .Where(s => s.EventId == eventId)
            .OrderByDescending(s => s.OpenStart)
            .Select(s => new SessionListItemDto(
                s.Id,
                s.EventId,
                s.Event.Name,
                s.Name,
                s.OpenStart,
                s.OpenEnd,
                s.PublicToken,
                s.Attendees.Count,
                s.Records.Count))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SessionListItemDto>> ListAllAsync(Guid ownerId, CancellationToken cancellationToken = default)
    {
        return await _db.CheckInSessions
            .Where(s => s.Event.OwnerId == ownerId)
            .OrderByDescending(s => s.OpenStart)
            .Select(s => new SessionListItemDto(
                s.Id,
                s.EventId,
                s.Event.Name,
                s.Name,
                s.OpenStart,
                s.OpenEnd,
                s.PublicToken,
                s.Attendees.Count,
                s.Records.Count))
            .ToListAsync(cancellationToken);
    }

    public async Task<SessionDetailDto> GetAsync(Guid ownerId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        var session = await GetOwnedSessionQuery(ownerId, sessionId)
            .Include(s => s.Event)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("场次不存在。");

        return MapDetail(session);
    }

    public async Task<SessionDetailDto> CreateAsync(Guid ownerId, Guid eventId, CreateSessionRequest request, CancellationToken cancellationToken = default)
    {
        await EnsureEventOwnedAsync(ownerId, eventId, cancellationToken);

        var session = new CheckInSession
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            Name = request.Name.Trim(),
            OpenStart = request.OpenStart,
            OpenEnd = request.OpenEnd,
            PublicToken = Guid.NewGuid().ToString("N")
        };

        _db.CheckInSessions.Add(session);
        await _db.SaveChangesAsync(cancellationToken);
        return await GetAsync(ownerId, session.Id, cancellationToken);
    }

    public async Task<SessionDetailDto> UpdateAsync(Guid ownerId, Guid sessionId, UpdateSessionRequest request, CancellationToken cancellationToken = default)
    {
        var session = await GetOwnedSessionAsync(ownerId, sessionId, cancellationToken);
        session.Name = request.Name.Trim();
        session.OpenStart = request.OpenStart;
        session.OpenEnd = request.OpenEnd;
        await _db.SaveChangesAsync(cancellationToken);
        return await GetAsync(ownerId, sessionId, cancellationToken);
    }

    public async Task DeleteAsync(Guid ownerId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        var session = await GetOwnedSessionAsync(ownerId, sessionId, cancellationToken);
        _db.CheckInSessions.Remove(session);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<SessionUrlDto> GetUrlAsync(Guid ownerId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        var session = await GetOwnedSessionAsync(ownerId, sessionId, cancellationToken);
        return new SessionUrlDto(BuildPublicUrl(session.PublicToken));
    }

    public async Task<byte[]> GetQrCodeAsync(Guid ownerId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        var session = await GetOwnedSessionAsync(ownerId, sessionId, cancellationToken);
        return _qrCodeService.GeneratePng(BuildPublicUrl(session.PublicToken));
    }

    public async Task<PagedResult<CheckInRecordDto>> GetRecordsAsync(Guid ownerId, Guid sessionId, int page, int pageSize, bool? isSuccess, CancellationToken cancellationToken = default)
    {
        await GetOwnedSessionAsync(ownerId, sessionId, cancellationToken);

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var query = _db.CheckInRecords.Where(r => r.SessionId == sessionId);
        if (isSuccess.HasValue)
            query = query.Where(r => r.IsSuccess == isSuccess.Value);

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(r => r.CheckedInAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<CheckInRecordDto>(
            items.Select(MapRecord).ToList(),
            total,
            page,
            pageSize);
    }

    public async Task<(IReadOnlyList<FieldColumnDto> Columns, PagedResult<AttendanceOverviewItemDto> Data)> GetAttendanceAsync(
        Guid ownerId,
        Guid sessionId,
        string? keyword,
        string? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var session = await GetOwnedSessionQuery(ownerId, sessionId)
            .Include(s => s.Event).ThenInclude(e => e.FieldDefinitions)
            .Include(s => s.Attendees)
            .Include(s => s.Records)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("场次不存在。");

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var fields = session.Event.FieldDefinitions.OrderBy(f => f.SortOrder).ToList();
        var columns = fields.Select(f => new FieldColumnDto(f.Key, f.Label)).ToList();

        var attendees = session.Attendees
            .Select(a => new { Entity = a, Values = TemplateRenderer.ParseJsonValues(a.FieldValuesJson) })
            .ToList();
        var records = session.Records
            .Select(r => new { Entity = r, Values = TemplateRenderer.ParseJsonValues(r.SubmittedValuesJson) })
            .ToList();

        var duplicateNames = attendees
            .Select(a => GetNormalizedName(a.Values))
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .GroupBy(name => name!, StringComparer.OrdinalIgnoreCase)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var items = new List<AttendanceOverviewItemDto>();
        var matchedRecordIds = new HashSet<Guid>();

        foreach (var attendee in attendees)
        {
            var name = GetNormalizedName(attendee.Values);
            var requiresOrganization = !string.IsNullOrWhiteSpace(name) && duplicateNames.Contains(name);
            var matched = records
                .Where(r => RecordMatchesAttendee(r.Values, attendee.Values, requiresOrganization))
                .Select(r => r.Entity)
                .ToList();

            foreach (var record in matched)
                matchedRecordIds.Add(record.Id);

            items.Add(BuildOverviewItem(
                attendee.Entity.Id.ToString(),
                attendee.Entity.Id,
                true,
                attendee.Values,
                matched));
        }

        var unmatchedGroups = records
            .Where(r => !matchedRecordIds.Contains(r.Entity.Id))
            .GroupBy(r => BuildIdentityKey(r.Values))
            .ToList();

        foreach (var group in unmatchedGroups)
        {
            var latestValues = group
                .OrderByDescending(x => x.Entity.CheckedInAt)
                .First().Values;
            var groupRecords = group.Select(x => x.Entity).ToList();
            items.Add(BuildOverviewItem(
                $"submission:{group.Key}",
                null,
                false,
                latestValues,
                groupRecords));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            items = items.Where(i => string.Equals(i.Status, status, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var q = keyword.Trim();
            items = items.Where(i =>
                i.FieldValues.Values.Any(v => v.Contains(q, StringComparison.OrdinalIgnoreCase)) ||
                (i.ResultMessage?.Contains(q, StringComparison.OrdinalIgnoreCase) ?? false))
                .ToList();
        }

        var total = items.Count;
        var pagedItems = items
            .OrderByDescending(i => i.LatestCheckedInAt ?? DateTime.MinValue)
            .ThenBy(i => i.FieldValues.GetValueOrDefault("name", ""))
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return (columns, new PagedResult<AttendanceOverviewItemDto>(pagedItems, total, page, pageSize));
    }

    public async Task<byte[]> ExportRecordsAsync(Guid ownerId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        var session = await GetOwnedSessionQuery(ownerId, sessionId)
            .Include(s => s.Event).ThenInclude(e => e.FieldDefinitions)
            .Include(s => s.Records)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("场次不存在。");

        using var workbook = new ClosedXML.Excel.XLWorkbook();
        var sheet = workbook.Worksheets.Add("签到记录");

        var fields = session.Event.FieldDefinitions.OrderBy(f => f.SortOrder).ToList();
        var col = 1;
        sheet.Cell(1, col++).Value = "签到时间";
        sheet.Cell(1, col++).Value = "状态";
        sheet.Cell(1, col++).Value = "提交序号";
        sheet.Cell(1, col++).Value = "结果消息";
        foreach (var field in fields)
            sheet.Cell(1, col++).Value = field.Label;

        var row = 2;
        foreach (var record in session.Records.OrderByDescending(r => r.CheckedInAt))
        {
            var values = Application.Services.TemplateRenderer.ParseJsonValues(record.SubmittedValuesJson);
            col = 1;
            sheet.Cell(row, col++).Value = record.CheckedInAt.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss");
            sheet.Cell(row, col++).Value = record.IsSuccess ? "成功" : "失败";
            sheet.Cell(row, col++).Value = record.SubmitIndex;
            sheet.Cell(row, col++).Value = record.ResultMessage;
            foreach (var field in fields)
                sheet.Cell(row, col++).Value = values.GetValueOrDefault(field.Key, "");
            row++;
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static AttendanceOverviewItemDto BuildOverviewItem(
        string rowKey,
        Guid? attendeeId,
        bool inPresetList,
        Dictionary<string, string> fieldValues,
        IReadOnlyList<CheckInRecord> matchedRecords)
    {
        var successRecords = matchedRecords.Where(r => r.IsSuccess).OrderByDescending(r => r.CheckedInAt).ToList();
        if (successRecords.Count > 0)
        {
            var latest = successRecords[0];
            return new AttendanceOverviewItemDto(
                rowKey,
                attendeeId,
                inPresetList,
                "success",
                latest.CheckedInAt,
                matchedRecords.Count,
                latest.ResultMessage,
                fieldValues);
        }

        if (matchedRecords.Count > 0)
        {
            var latest = matchedRecords.OrderByDescending(r => r.CheckedInAt).First();
            return new AttendanceOverviewItemDto(
                rowKey,
                attendeeId,
                inPresetList,
                "failed",
                latest.CheckedInAt,
                matchedRecords.Count,
                latest.ResultMessage,
                fieldValues);
        }

        return new AttendanceOverviewItemDto(
            rowKey,
            attendeeId,
            inPresetList,
            "not_checked_in",
            null,
            0,
            null,
            fieldValues);
    }

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

    private static string? GetNormalizedName(Dictionary<string, string> values) =>
        values.TryGetValue("name", out var name) ? name.Trim() : null;

    private static string BuildIdentityKey(Dictionary<string, string> values)
    {
        values.TryGetValue("name", out var name);
        values.TryGetValue("organization", out var org);
        return $"{name?.Trim().ToLowerInvariant()}|{org?.Trim().ToLowerInvariant()}";
    }

    private string BuildPublicUrl(string token) => $"{_publicCheckInBaseUrl}/c/{token}";

    private SessionDetailDto MapDetail(CheckInSession session) =>
        new(session.Id, session.EventId, session.Event.Name, session.Name, session.OpenStart, session.OpenEnd, session.PublicToken, BuildPublicUrl(session.PublicToken));

    private static CheckInRecordDto MapRecord(CheckInRecord record) =>
        new(record.Id, record.CheckedInAt, record.IsSuccess, record.SubmitIndex, record.ResultMessage, record.ClientFingerprint,
            Application.Services.TemplateRenderer.ParseJsonValues(record.SubmittedValuesJson));

    private IQueryable<CheckInSession> GetOwnedSessionQuery(Guid ownerId, Guid sessionId) =>
        _db.CheckInSessions.Where(s => s.Id == sessionId && s.Event.OwnerId == ownerId);

    private async Task<CheckInSession> GetOwnedSessionAsync(Guid ownerId, Guid sessionId, CancellationToken cancellationToken) =>
        await GetOwnedSessionQuery(ownerId, sessionId).FirstOrDefaultAsync(cancellationToken)
        ?? throw new KeyNotFoundException("场次不存在。");

    private async Task EnsureEventOwnedAsync(Guid ownerId, Guid eventId, CancellationToken cancellationToken)
    {
        if (!await _db.Events.AnyAsync(e => e.Id == eventId && e.OwnerId == ownerId, cancellationToken))
            throw new KeyNotFoundException("活动不存在。");
    }
}

using MeetSign.Application.DTOs.Events;
using MeetSign.Application.DTOs.Public;
using MeetSign.Application.Interfaces;
using MeetSign.Application.Services;
using MeetSign.Domain.Entities;
using MeetSign.Domain.Enums;
using MeetSign.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace MeetSign.Infrastructure.Services;

public class CheckInService : ICheckInService
{
    private readonly AppDbContext _db;

    public CheckInService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<PublicSessionConfigDto> GetPublicConfigAsync(string token, CancellationToken cancellationToken = default)
    {
        var session = await GetSessionByToken(token, cancellationToken);
        var now = DateTime.UtcNow;
        var isOpen = session.OpenStart <= now && now <= session.OpenEnd;

        return new PublicSessionConfigDto(
            session.Event.Name,
            session.Name,
            session.Event.CheckInMode,
            session.Event.BackgroundUrl,
            session.Event.LogoUrl,
            session.Event.FooterHtml,
            isOpen,
            isOpen ? null : $"签到尚未开放或已结束。开放时间：{session.OpenStart.ToLocalTime():yyyy-MM-dd HH:mm} - {session.OpenEnd.ToLocalTime():yyyy-MM-dd HH:mm}",
            session.Event.FieldDefinitions.OrderBy(f => f.SortOrder).Select(f => new PublicFieldDto(f.Key, f.Label, f.FieldType, f.Required)).ToList(),
            session.Event.FormLayoutItems.OrderBy(f => f.Row).ThenBy(f => f.Col).Select(f => new PublicLayoutItemDto(f.FieldKey, f.Row, f.Col, f.ColSpan)).ToList(),
            session.Event.FieldConditions.Select(c => new PublicConditionDto(c.TargetFieldKey, c.ConditionJson)).ToList());
    }

    public async Task<EvaluateResponse> EvaluateAsync(string token, EvaluateRequest request, CancellationToken cancellationToken = default)
    {
        var session = await GetSessionByToken(token, cancellationToken);
        var layoutKeys = session.Event.FormLayoutItems.Select(f => f.FieldKey).ToList();
        var conditions = session.Event.FieldConditions.Select(c => new FieldConditionDto(c.TargetFieldKey, c.ConditionJson)).ToList();

        Func<string, bool>? duplicateChecker = session.Event.CheckInMode == CheckInMode.PresetList
            ? value => IsNameDuplicate(session.Id, value)
            : null;

        var visible = ConditionEvaluator.GetVisibleFields(layoutKeys, conditions, request.PartialValues, duplicateChecker);
        return new EvaluateResponse(visible.ToList());
    }

    public async Task<SubmitResponse> SubmitAsync(string token, SubmitRequest request, CancellationToken cancellationToken = default)
    {
        var session = await GetSessionByToken(token, cancellationToken);
        var now = DateTime.UtcNow;
        if (session.OpenStart > now || session.OpenEnd < now)
            throw new InvalidOperationException("当前不在签到开放时段。");

        var layoutKeys = session.Event.FormLayoutItems.Select(f => f.FieldKey).ToList();
        var conditions = session.Event.FieldConditions.Select(c => new FieldConditionDto(c.TargetFieldKey, c.ConditionJson)).ToList();
        Func<string, bool>? duplicateChecker = session.Event.CheckInMode == CheckInMode.PresetList
            ? value => IsNameDuplicate(session.Id, value)
            : null;

        var visibleFields = ConditionEvaluator.GetVisibleFields(layoutKeys, conditions, request.Values, duplicateChecker);
        var fields = session.Event.FieldDefinitions.Where(f => visibleFields.Contains(f.Key)).ToList();

        foreach (var field in fields.Where(f => f.Required))
        {
            if (!request.Values.TryGetValue(field.Key, out var val) || string.IsNullOrWhiteSpace(val))
                throw new InvalidOperationException($"{field.Label} 为必填项。");
        }

        var submitIndex = await _db.CheckInRecords
            .Where(r => r.SessionId == session.Id && r.ClientFingerprint == request.ClientFingerprint)
            .CountAsync(cancellationToken) + 1;

        var mergedValues = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var key in visibleFields)
            mergedValues[key] = request.Values.GetValueOrDefault(key, "").Trim();

        bool isSuccess;
        if (session.Event.CheckInMode == CheckInMode.PresetList)
        {
            var matched = MatchAttendee(session.Id, mergedValues);
            isSuccess = matched != null;
            if (matched != null)
            {
                foreach (var kv in TemplateRenderer.ParseJsonValues(matched.FieldValuesJson))
                    mergedValues[kv.Key] = kv.Value;
            }
        }
        else
        {
            UpsertAttendee(session.Id, mergedValues);
            isSuccess = true;
        }

        var template = isSuccess ? session.Event.SuccessTemplate : session.Event.FailureTemplate;
        var message = TemplateRenderer.Render(template, mergedValues);

        var record = new CheckInRecord
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            SubmittedValuesJson = TemplateRenderer.ToJson(mergedValues),
            IsSuccess = isSuccess,
            ResultMessage = message,
            CheckedInAt = DateTime.UtcNow,
            SubmitIndex = submitIndex,
            ClientFingerprint = request.ClientFingerprint
        };

        _db.CheckInRecords.Add(record);
        await _db.SaveChangesAsync(cancellationToken);

        return new SubmitResponse(isSuccess, message, submitIndex, mergedValues);
    }

    public async Task<CachedResultDto?> GetLatestResultAsync(string token, string clientFingerprint, CancellationToken cancellationToken = default)
    {
        var session = await GetSessionByToken(token, cancellationToken);
        var record = await _db.CheckInRecords
            .Where(r => r.SessionId == session.Id && r.ClientFingerprint == clientFingerprint)
            .OrderByDescending(r => r.CheckedInAt)
            .FirstOrDefaultAsync(cancellationToken);

        return record == null
            ? null
            : new CachedResultDto(record.IsSuccess, record.ResultMessage, record.SubmitIndex, record.CheckedInAt);
    }

    private Attendee? MatchAttendee(Guid sessionId, Dictionary<string, string> values)
    {
        var attendees = _db.Attendees.Where(a => a.SessionId == sessionId).AsEnumerable()
            .Select(a => new { Entity = a, Values = TemplateRenderer.ParseJsonValues(a.FieldValuesJson) })
            .ToList();

        if (!values.TryGetValue("name", out var name) || string.IsNullOrWhiteSpace(name))
            return null;

        var nameMatches = attendees.Where(a =>
            a.Values.TryGetValue("name", out var n) &&
            string.Equals(n?.Trim(), name.Trim(), StringComparison.OrdinalIgnoreCase)).ToList();

        if (nameMatches.Count == 0)
            return null;

        if (nameMatches.Count == 1)
            return nameMatches[0].Entity;

        if (!values.TryGetValue("organization", out var org) || string.IsNullOrWhiteSpace(org))
            return null;

        return nameMatches.FirstOrDefault(a =>
            a.Values.TryGetValue("organization", out var o) &&
            string.Equals(o?.Trim(), org.Trim(), StringComparison.OrdinalIgnoreCase))?.Entity;
    }

    private void UpsertAttendee(Guid sessionId, Dictionary<string, string> values)
    {
        if (!values.TryGetValue("name", out var name) || string.IsNullOrWhiteSpace(name))
        {
            _db.Attendees.Add(new Attendee
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                FieldValuesJson = TemplateRenderer.ToJson(values)
            });
            return;
        }

        var existing = _db.Attendees.Where(a => a.SessionId == sessionId).AsEnumerable()
            .FirstOrDefault(a =>
            {
                var fv = TemplateRenderer.ParseJsonValues(a.FieldValuesJson);
                return fv.TryGetValue("name", out var n) &&
                       string.Equals(n?.Trim(), name.Trim(), StringComparison.OrdinalIgnoreCase);
            });

        if (existing == null)
        {
            _db.Attendees.Add(new Attendee
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                FieldValuesJson = TemplateRenderer.ToJson(values)
            });
        }
        else
        {
            existing.FieldValuesJson = TemplateRenderer.ToJson(values);
        }
    }

    private bool IsNameDuplicate(Guid sessionId, string name)
    {
        var count = _db.Attendees.Where(a => a.SessionId == sessionId).AsEnumerable()
            .Count(a =>
            {
                var fv = TemplateRenderer.ParseJsonValues(a.FieldValuesJson);
                return fv.TryGetValue("name", out var n) &&
                       string.Equals(n?.Trim(), name.Trim(), StringComparison.OrdinalIgnoreCase);
            });
        return count > 1;
    }

    private async Task<CheckInSession> GetSessionByToken(string token, CancellationToken cancellationToken)
    {
        return await _db.CheckInSessions
            .Include(s => s.Event).ThenInclude(e => e.FieldDefinitions)
            .Include(s => s.Event).ThenInclude(e => e.FormLayoutItems)
            .Include(s => s.Event).ThenInclude(e => e.FieldConditions)
            .FirstOrDefaultAsync(s => s.PublicToken == token, cancellationToken)
            ?? throw new KeyNotFoundException("签到链接无效。");
    }
}

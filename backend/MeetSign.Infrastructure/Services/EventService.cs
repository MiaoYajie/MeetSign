using MeetSign.Application.DTOs.Events;
using MeetSign.Application.Interfaces;
using MeetSign.Domain.Entities;
using MeetSign.Domain.Enums;
using MeetSign.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace MeetSign.Infrastructure.Services;

public class EventService : IEventService
{
    private readonly AppDbContext _db;

    public EventService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<EventListItemDto>> ListAsync(Guid ownerId, CancellationToken cancellationToken = default)
    {
        return await _db.Events
            .Where(e => e.OwnerId == ownerId)
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => new EventListItemDto(
                e.Id,
                e.Name,
                e.CheckInMode,
                e.CreatedAt,
                e.Sessions.Count))
            .ToListAsync(cancellationToken);
    }

    public async Task<EventDetailDto> GetAsync(Guid ownerId, Guid eventId, CancellationToken cancellationToken = default)
    {
        var entity = await GetOwnedEventQuery(ownerId, eventId)
            .Include(e => e.FieldDefinitions.OrderBy(f => f.SortOrder))
            .Include(e => e.FormLayoutItems.OrderBy(f => f.Row).ThenBy(f => f.Col))
            .Include(e => e.FieldConditions)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("活动不存在。");

        return MapDetail(entity);
    }

    public async Task<EventDetailDto> CreateAsync(Guid ownerId, CreateEventRequest request, CancellationToken cancellationToken = default)
    {
        var entity = new Event
        {
            Id = Guid.NewGuid(),
            OwnerId = ownerId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            CheckInMode = CheckInMode.PresetList,
            SuccessTemplate = "欢迎 {{name}} 签到成功！",
            FailureTemplate = "签到失败，请核对 {{name}} 等信息后重试。"
        };

        entity.FieldDefinitions = CreateDefaultFields(entity.Id);
        entity.FormLayoutItems = CreateDefaultLayout(entity.Id);

        _db.Events.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetAsync(ownerId, entity.Id, cancellationToken);
    }

    public async Task<EventDetailDto> UpdateAsync(Guid ownerId, Guid eventId, UpdateEventRequest request, CancellationToken cancellationToken = default)
    {
        var entity = await GetOwnedEventAsync(ownerId, eventId, cancellationToken);
        entity.Name = request.Name.Trim();
        entity.Description = request.Description?.Trim();
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return await GetAsync(ownerId, eventId, cancellationToken);
    }

    public async Task DeleteAsync(Guid ownerId, Guid eventId, CancellationToken cancellationToken = default)
    {
        var entity = await GetOwnedEventAsync(ownerId, eventId, cancellationToken);
        _db.Events.Remove(entity);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<EventDetailDto> UpdateBrandingAsync(Guid ownerId, Guid eventId, UpdateBrandingRequest request, string? backgroundUrl, string? logoUrl, CancellationToken cancellationToken = default)
    {
        var entity = await GetOwnedEventAsync(ownerId, eventId, cancellationToken);
        if (backgroundUrl != null) entity.BackgroundUrl = backgroundUrl;
        if (logoUrl != null) entity.LogoUrl = logoUrl;
        entity.FooterHtml = request.FooterHtml;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return await GetAsync(ownerId, eventId, cancellationToken);
    }

    public async Task<EventDetailDto> UpdateFieldsAsync(Guid ownerId, Guid eventId, UpdateFieldsRequest request, CancellationToken cancellationToken = default)
    {
        var entity = await GetOwnedEventQuery(ownerId, eventId)
            .Include(e => e.FieldDefinitions)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("活动不存在。");

        _db.FieldDefinitions.RemoveRange(entity.FieldDefinitions);

        var sort = 0;
        foreach (var field in request.Fields)
        {
            _db.FieldDefinitions.Add(new FieldDefinition
            {
                Id = field.Id ?? Guid.NewGuid(),
                EventId = eventId,
                Key = field.Key.Trim(),
                Label = field.Label.Trim(),
                FieldType = field.FieldType,
                IsBuiltIn = field.IsBuiltIn,
                Required = field.Required,
                SortOrder = sort++
            });
        }

        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return await GetAsync(ownerId, eventId, cancellationToken);
    }

    public async Task<EventDetailDto> UpdateFormLayoutAsync(Guid ownerId, Guid eventId, UpdateFormLayoutRequest request, CancellationToken cancellationToken = default)
    {
        var entity = await GetOwnedEventQuery(ownerId, eventId)
            .Include(e => e.FormLayoutItems)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("活动不存在。");

        _db.FormLayoutItems.RemoveRange(entity.FormLayoutItems);

        foreach (var item in request.Items)
        {
            _db.FormLayoutItems.Add(new FormLayoutItem
            {
                Id = Guid.NewGuid(),
                EventId = eventId,
                FieldKey = item.FieldKey,
                Row = item.Row,
                Col = item.Col,
                ColSpan = item.ColSpan
            });
        }

        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return await GetAsync(ownerId, eventId, cancellationToken);
    }

    public async Task<EventDetailDto> UpdateConditionsAsync(Guid ownerId, Guid eventId, UpdateConditionsRequest request, CancellationToken cancellationToken = default)
    {
        var entity = await GetOwnedEventQuery(ownerId, eventId)
            .Include(e => e.FieldConditions)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("活动不存在。");

        _db.FieldConditions.RemoveRange(entity.FieldConditions);

        foreach (var item in request.Conditions)
        {
            _db.FieldConditions.Add(new FieldCondition
            {
                Id = Guid.NewGuid(),
                EventId = eventId,
                TargetFieldKey = item.TargetFieldKey,
                ConditionJson = item.ConditionJson
            });
        }

        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return await GetAsync(ownerId, eventId, cancellationToken);
    }

    public async Task<EventDetailDto> UpdateTemplatesAsync(Guid ownerId, Guid eventId, UpdateTemplatesRequest request, CancellationToken cancellationToken = default)
    {
        var entity = await GetOwnedEventAsync(ownerId, eventId, cancellationToken);
        entity.SuccessTemplate = request.SuccessTemplate;
        entity.FailureTemplate = request.FailureTemplate;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return await GetAsync(ownerId, eventId, cancellationToken);
    }

    public async Task<EventDetailDto> UpdateModeAsync(Guid ownerId, Guid eventId, UpdateModeRequest request, CancellationToken cancellationToken = default)
    {
        var entity = await GetOwnedEventAsync(ownerId, eventId, cancellationToken);
        entity.CheckInMode = request.CheckInMode;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return await GetAsync(ownerId, eventId, cancellationToken);
    }

    private IQueryable<Event> GetOwnedEventQuery(Guid ownerId, Guid eventId) =>
        _db.Events.Where(e => e.OwnerId == ownerId && e.Id == eventId);

    private async Task<Event> GetOwnedEventAsync(Guid ownerId, Guid eventId, CancellationToken cancellationToken) =>
        await GetOwnedEventQuery(ownerId, eventId).FirstOrDefaultAsync(cancellationToken)
        ?? throw new KeyNotFoundException("活动不存在。");

    private static List<FieldDefinition> CreateDefaultFields(Guid eventId) =>
    [
        new() { Id = Guid.NewGuid(), EventId = eventId, Key = "name", Label = "姓名", FieldType = FieldType.Text, IsBuiltIn = true, Required = true, SortOrder = 0 },
        new() { Id = Guid.NewGuid(), EventId = eventId, Key = "organization", Label = "单位", FieldType = FieldType.Text, IsBuiltIn = true, Required = false, SortOrder = 1 },
        new() { Id = Guid.NewGuid(), EventId = eventId, Key = "seatNumber", Label = "座位号码", FieldType = FieldType.Text, IsBuiltIn = true, Required = false, SortOrder = 2 }
    ];

    private static List<FormLayoutItem> CreateDefaultLayout(Guid eventId) =>
    [
        new() { Id = Guid.NewGuid(), EventId = eventId, FieldKey = "name", Row = 0, Col = 0, ColSpan = 12 },
        new() { Id = Guid.NewGuid(), EventId = eventId, FieldKey = "organization", Row = 1, Col = 0, ColSpan = 12 },
        new() { Id = Guid.NewGuid(), EventId = eventId, FieldKey = "seatNumber", Row = 2, Col = 0, ColSpan = 12 }
    ];

    private static EventDetailDto MapDetail(Event entity) =>
        new(
            entity.Id,
            entity.Name,
            entity.Description,
            entity.CheckInMode,
            entity.BackgroundUrl,
            entity.LogoUrl,
            entity.FooterHtml,
            entity.SuccessTemplate,
            entity.FailureTemplate,
            entity.FieldDefinitions.OrderBy(f => f.SortOrder).Select(f => new FieldDefinitionDto(
                f.Id, f.Key, f.Label, f.FieldType, f.IsBuiltIn, f.Required, f.SortOrder)).ToList(),
            entity.FormLayoutItems.OrderBy(f => f.Row).ThenBy(f => f.Col).Select(f => new FormLayoutItemDto(
                f.FieldKey, f.Row, f.Col, f.ColSpan)).ToList(),
            entity.FieldConditions.Select(c => new FieldConditionDto(c.TargetFieldKey, c.ConditionJson)).ToList(),
            entity.CreatedAt,
            entity.UpdatedAt);
}

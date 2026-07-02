using MeetSign.Domain.Enums;

namespace MeetSign.Application.DTOs.Events;

public record EventListItemDto(Guid Id, string Name, CheckInMode CheckInMode, DateTime CreatedAt, int SessionCount);

public record EventDetailDto(
    Guid Id,
    string Name,
    string? Description,
    CheckInMode CheckInMode,
    string? BackgroundUrl,
    string? LogoUrl,
    string? FooterHtml,
    string SuccessTemplate,
    string FailureTemplate,
    IReadOnlyList<FieldDefinitionDto> Fields,
    IReadOnlyList<FormLayoutItemDto> FormLayout,
    IReadOnlyList<FieldConditionDto> Conditions,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record CreateEventRequest(string Name, string? Description);
public record UpdateEventRequest(string Name, string? Description);

public record FieldDefinitionDto(
    Guid? Id,
    string Key,
    string Label,
    FieldType FieldType,
    bool IsBuiltIn,
    bool Required,
    int SortOrder);

public record FormLayoutItemDto(string FieldKey, int Row, int Col, int ColSpan);

public record FieldConditionDto(string TargetFieldKey, string ConditionJson);

public record UpdateBrandingRequest(string? FooterHtml);
public record UpdateFieldsRequest(IReadOnlyList<FieldDefinitionDto> Fields);
public record UpdateFormLayoutRequest(IReadOnlyList<FormLayoutItemDto> Items);
public record UpdateConditionsRequest(IReadOnlyList<FieldConditionDto> Conditions);
public record UpdateTemplatesRequest(string SuccessTemplate, string FailureTemplate);
public record UpdateModeRequest(CheckInMode CheckInMode);

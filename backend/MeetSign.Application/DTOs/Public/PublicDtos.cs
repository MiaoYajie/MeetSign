using MeetSign.Application.DTOs.Events;
using MeetSign.Domain.Enums;

namespace MeetSign.Application.DTOs.Public;

public record PublicSessionConfigDto(
    string EventName,
    string SessionName,
    CheckInMode CheckInMode,
    string? BackgroundUrl,
    string? LogoUrl,
    string? FooterHtml,
    PanelConfigDto PanelConfig,
    bool IsOpen,
    string? ClosedMessage,
    IReadOnlyList<PublicFieldDto> Fields,
    IReadOnlyList<PublicLayoutItemDto> FormLayout,
    IReadOnlyList<PublicConditionDto> Conditions);

public record PublicFieldDto(string Key, string Label, FieldType FieldType, bool Required);

public record PublicLayoutItemDto(string FieldKey, int Row, int Col, int ColSpan);

public record PublicConditionDto(string TargetFieldKey, string ConditionJson);

public record EvaluateRequest(Dictionary<string, string> PartialValues);

public record EvaluateResponse(IReadOnlyList<string> VisibleFields);

public record SubmitRequest(
    Dictionary<string, string> Values,
    string ClientFingerprint);

public record SubmitResponse(
    bool IsSuccess,
    string ResultMessage,
    int SubmitIndex,
    Dictionary<string, string> MergedValues);

public record CachedResultDto(
    bool IsSuccess,
    string ResultMessage,
    int SubmitIndex,
    DateTime CheckedInAt);

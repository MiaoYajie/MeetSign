namespace MeetSign.Application.DTOs.Sessions;

public record SessionListItemDto(
    Guid Id,
    Guid EventId,
    string EventName,
    string Name,
    DateTime OpenStart,
    DateTime OpenEnd,
    string PublicToken,
    int AttendeeCount,
    int RecordCount);

public record SessionDetailDto(
    Guid Id,
    Guid EventId,
    string EventName,
    string Name,
    DateTime OpenStart,
    DateTime OpenEnd,
    string PublicToken,
    string PublicUrl);

public record CreateSessionRequest(string Name, DateTime OpenStart, DateTime OpenEnd);
public record UpdateSessionRequest(string Name, DateTime OpenStart, DateTime OpenEnd);

public record SessionUrlDto(string PublicUrl);
public record ImportResultDto(int ImportedCount, int SkippedCount, IReadOnlyList<string> Errors);

public record ImportTextRequest(string Text);

public record CheckInRecordDto(
    Guid Id,
    DateTime CheckedInAt,
    bool IsSuccess,
    int SubmitIndex,
    string ResultMessage,
    string ClientFingerprint,
    Dictionary<string, string> SubmittedValues);

public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

public record FieldColumnDto(string Key, string Label);

public record AttendanceOverviewItemDto(
    string RowKey,
    Guid? AttendeeId,
    bool InPresetList,
    string Status,
    DateTime? LatestCheckedInAt,
    int SubmitCount,
    string? ResultMessage,
    Dictionary<string, string> FieldValues);

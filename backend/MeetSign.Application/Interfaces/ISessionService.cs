using MeetSign.Application.DTOs.Sessions;

namespace MeetSign.Application.Interfaces;

public interface ISessionService
{
    Task<IReadOnlyList<SessionListItemDto>> ListByEventAsync(Guid ownerId, Guid eventId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SessionListItemDto>> ListAllAsync(Guid ownerId, CancellationToken cancellationToken = default);
    Task<SessionDetailDto> GetAsync(Guid ownerId, Guid sessionId, CancellationToken cancellationToken = default);
    Task<SessionDetailDto> CreateAsync(Guid ownerId, Guid eventId, CreateSessionRequest request, CancellationToken cancellationToken = default);
    Task<SessionDetailDto> UpdateAsync(Guid ownerId, Guid sessionId, UpdateSessionRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid ownerId, Guid sessionId, CancellationToken cancellationToken = default);
    Task<SessionUrlDto> GetUrlAsync(Guid ownerId, Guid sessionId, CancellationToken cancellationToken = default);
    Task<byte[]> GetQrCodeAsync(Guid ownerId, Guid sessionId, CancellationToken cancellationToken = default);
    Task<PagedResult<CheckInRecordDto>> GetRecordsAsync(Guid ownerId, Guid sessionId, int page, int pageSize, bool? isSuccess, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<FieldColumnDto> Columns, PagedResult<AttendanceOverviewItemDto> Data)> GetAttendanceAsync(
        Guid ownerId,
        Guid sessionId,
        string? keyword,
        string? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);
    Task<byte[]> ExportRecordsAsync(Guid ownerId, Guid sessionId, CancellationToken cancellationToken = default);
}

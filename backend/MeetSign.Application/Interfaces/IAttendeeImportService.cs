using MeetSign.Application.DTOs.Sessions;

namespace MeetSign.Application.Interfaces;

public interface IAttendeeImportService
{
    Task<ImportResultDto> ImportAsync(Guid ownerId, Guid sessionId, Stream stream, string fileName, CancellationToken cancellationToken = default);
    Task<ImportResultDto> ImportTextAsync(Guid ownerId, Guid sessionId, string text, CancellationToken cancellationToken = default);
    Task<int> GetAttendeeCountAsync(Guid ownerId, Guid sessionId, CancellationToken cancellationToken = default);
    Task DeleteAttendeeAsync(Guid ownerId, Guid sessionId, Guid attendeeId, CancellationToken cancellationToken = default);
}

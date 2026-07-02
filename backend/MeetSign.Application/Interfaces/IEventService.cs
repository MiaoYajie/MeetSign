using MeetSign.Application.DTOs.Events;

namespace MeetSign.Application.Interfaces;

public interface IEventService
{
    Task<IReadOnlyList<EventListItemDto>> ListAsync(Guid ownerId, CancellationToken cancellationToken = default);
    Task<EventDetailDto> GetAsync(Guid ownerId, Guid eventId, CancellationToken cancellationToken = default);
    Task<EventDetailDto> CreateAsync(Guid ownerId, CreateEventRequest request, CancellationToken cancellationToken = default);
    Task<EventDetailDto> UpdateAsync(Guid ownerId, Guid eventId, UpdateEventRequest request, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid ownerId, Guid eventId, CancellationToken cancellationToken = default);
    Task<EventDetailDto> UpdateBrandingAsync(Guid ownerId, Guid eventId, UpdateBrandingRequest request, string? backgroundUrl, string? logoUrl, CancellationToken cancellationToken = default);
    Task<EventDetailDto> UpdateFieldsAsync(Guid ownerId, Guid eventId, UpdateFieldsRequest request, CancellationToken cancellationToken = default);
    Task<EventDetailDto> UpdateFormLayoutAsync(Guid ownerId, Guid eventId, UpdateFormLayoutRequest request, CancellationToken cancellationToken = default);
    Task<EventDetailDto> UpdateConditionsAsync(Guid ownerId, Guid eventId, UpdateConditionsRequest request, CancellationToken cancellationToken = default);
    Task<EventDetailDto> UpdateTemplatesAsync(Guid ownerId, Guid eventId, UpdateTemplatesRequest request, CancellationToken cancellationToken = default);
    Task<EventDetailDto> UpdateModeAsync(Guid ownerId, Guid eventId, UpdateModeRequest request, CancellationToken cancellationToken = default);
}

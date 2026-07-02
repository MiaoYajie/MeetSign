using MeetSign.Application.DTOs.Public;

namespace MeetSign.Application.Interfaces;

public interface ICheckInService
{
    Task<PublicSessionConfigDto> GetPublicConfigAsync(string token, CancellationToken cancellationToken = default);
    Task<EvaluateResponse> EvaluateAsync(string token, EvaluateRequest request, CancellationToken cancellationToken = default);
    Task<SubmitResponse> SubmitAsync(string token, SubmitRequest request, CancellationToken cancellationToken = default);
    Task<CachedResultDto?> GetLatestResultAsync(string token, string clientFingerprint, CancellationToken cancellationToken = default);
}

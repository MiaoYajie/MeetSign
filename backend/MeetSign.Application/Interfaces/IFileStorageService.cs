namespace MeetSign.Application.Interfaces;

public interface IFileStorageService
{
    Task<string> SaveImageAsync(Stream stream, string fileName, CancellationToken cancellationToken = default);
    string GetPublicUrl(string storedPath);
    string? NormalizeUrl(string? url);
}

using MeetSign.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace MeetSign.Infrastructure.Services;

public class LocalFileStorageService : IFileStorageService
{
    private readonly string _uploadRoot;
    private readonly string _publicBaseUrl;

    public LocalFileStorageService(IHostEnvironment env, IConfiguration configuration)
    {
        _uploadRoot = Path.Combine(env.ContentRootPath, "wwwroot", "uploads");
        Directory.CreateDirectory(_uploadRoot);
        _publicBaseUrl = configuration["PublicApiBaseUrl"]?.TrimEnd('/') ?? "http://localhost:5000";
    }

    public async Task<string> SaveImageAsync(Stream stream, string fileName, CancellationToken cancellationToken = default)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png" or ".webp"))
            throw new InvalidOperationException("仅支持 jpg、png、webp 图片。");

        var storedName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(_uploadRoot, storedName);
        await using var file = File.Create(fullPath);
        await stream.CopyToAsync(file, cancellationToken);
        return storedName;
    }

    public string GetPublicUrl(string storedPath) => $"{_publicBaseUrl}/uploads/{storedPath}";
}

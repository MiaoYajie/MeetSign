using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using MeetSign.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace MeetSign.Infrastructure.Services;

public class AzureBlobStorageService : IFileStorageService
{
    private readonly Lazy<BlobContainerClient> _containerClient;
    private readonly string? _configuredPublicBaseUrl;
    private readonly ILogger<AzureBlobStorageService> _logger;

    public AzureBlobStorageService(IConfiguration configuration, ILogger<AzureBlobStorageService> logger)
    {
        _logger = logger;
        var connectionString = configuration["AzureStorage:ConnectionString"]
            ?? throw new InvalidOperationException("未配置 AzureStorage:ConnectionString。");
        var containerName = configuration["AzureStorage:ContainerName"] ?? "uploads";

        var configuredBaseUrl = configuration["AzureStorage:PublicBaseUrl"];
        _configuredPublicBaseUrl = string.IsNullOrWhiteSpace(configuredBaseUrl)
            ? null
            : configuredBaseUrl.TrimEnd('/');

        _containerClient = new Lazy<BlobContainerClient>(() =>
        {
            var client = new BlobContainerClient(connectionString, containerName);
            try
            {
                client.CreateIfNotExists(PublicAccessType.Blob);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize blob container {ContainerName}.", containerName);
                throw;
            }

            return client;
        });
    }

    public async Task<string> SaveImageAsync(Stream stream, string fileName, CancellationToken cancellationToken = default)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png" or ".webp"))
            throw new InvalidOperationException("仅支持 jpg、png、webp 图片。");

        var storedName = $"{Guid.NewGuid():N}{ext}";
        var blobClient = _containerClient.Value.GetBlobClient(storedName);

        var contentType = ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };

        await blobClient.UploadAsync(
            stream,
            new BlobHttpHeaders { ContentType = contentType },
            cancellationToken: cancellationToken);

        return storedName;
    }

    public string GetPublicUrl(string storedPath)
    {
        var baseUrl = _configuredPublicBaseUrl ?? _containerClient.Value.Uri.ToString().TrimEnd('/');
        return $"{baseUrl}/{storedPath.TrimStart('/')}";
    }

    public string? NormalizeUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return url;

        if (Uri.TryCreate(url, UriKind.Absolute, out var absolute) &&
            (absolute.Scheme == Uri.UriSchemeHttp || absolute.Scheme == Uri.UriSchemeHttps))
            return url;

        var path = url.Trim().TrimStart('/');
        if (path.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase))
            path = path["uploads/".Length..];

        return GetPublicUrl(path);
    }
}

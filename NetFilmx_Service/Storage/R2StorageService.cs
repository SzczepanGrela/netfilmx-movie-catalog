using Amazon.S3;
using Amazon.S3.Transfer;
using Microsoft.Extensions.Configuration;

namespace NetFilmx_Service.Storage;

public sealed class R2StorageService : ICloudStorageService, IDisposable
{
    private readonly IAmazonS3? _client;
    private readonly ITransferUtility? _transfer;
    private readonly string? _bucket;
    private readonly string? _publicOrigin;

    public bool IsConfigured => _transfer != null;

    public R2StorageService(IConfiguration configuration)
    {
        var accessKey = configuration["CloudflareR2:AccessKey"];
        var secretKey = configuration["CloudflareR2:SecretKey"];
        var accountId = configuration["CloudflareR2:AccountId"];
        _bucket = configuration["CloudflareR2:BucketName"];
        var publicUrl = configuration["CloudflareR2:PublicUrl"];
        if (new[] { accessKey, secretKey, accountId, _bucket, publicUrl }.Any(string.IsNullOrWhiteSpace))
            return;

        _publicOrigin = ValidateOrigin(publicUrl!);
        _client = new AmazonS3Client(accessKey, secretKey, new AmazonS3Config
        {
            ServiceURL = $"https://{accountId}.r2.cloudflarestorage.com",
            AuthenticationRegion = "auto"
        });
        _transfer = new TransferUtility(_client);
    }

    internal R2StorageService(ITransferUtility transfer, string bucket, string publicOrigin)
    {
        _transfer = transfer;
        _bucket = bucket;
        _publicOrigin = ValidateOrigin(publicOrigin);
    }

    public async Task<string> UploadPosterAsync(string filePath, string contentType)
    {
        EnsureConfigured();
        string extension = contentType switch
        {
            "image/jpeg" => ".jpg",
            "image/png" => ".png",
            "image/webp" => ".webp",
            _ => throw new ArgumentException("Posters must use JPEG, PNG or WebP.", nameof(contentType))
        };
        // Do not use the client-supplied filename or a database ID as an object key.
        string key = $"uploads/posters/{Guid.NewGuid():N}{extension}";
        await _transfer!.UploadAsync(new TransferUtilityUploadRequest
        {
            FilePath = filePath,
            Key = key,
            BucketName = _bucket,
            ContentType = contentType,
            DisablePayloadSigning = true
        });
        return $"{_publicOrigin}/{key}";
    }

    public async Task<string> UploadHlsAsync(string directoryPath, CancellationToken token = default)
    {
        EnsureConfigured();
        if (!File.Exists(Path.Combine(directoryPath, "master.m3u8")))
            throw new IOException("HLS output has no master playlist.");

        // Each attempt publishes into a fresh namespace, including retries for the same video.
        string prefix = $"uploads/videos/{Guid.NewGuid():N}/hls";
        await _transfer!.UploadDirectoryAsync(new TransferUtilityUploadDirectoryRequest
        {
            Directory = directoryPath,
            BucketName = _bucket,
            KeyPrefix = prefix,
            SearchOption = SearchOption.AllDirectories
        }, token);
        return $"{_publicOrigin}/{prefix}/master.m3u8";
    }

    private void EnsureConfigured()
    {
        if (!IsConfigured)
            throw new InvalidOperationException("R2 uploads require complete configuration, including the public media origin.");
    }

    private static string ValidateOrigin(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.Scheme != "https"
            || string.IsNullOrEmpty(uri.Host) || !string.IsNullOrEmpty(uri.UserInfo)
            || uri.AbsolutePath != "/" || !string.IsNullOrEmpty(uri.Query)
            || !string.IsNullOrEmpty(uri.Fragment))
            throw new ArgumentException("The public media URL must be an HTTPS origin without credentials, path, query or fragment.");
        return uri.GetLeftPart(UriPartial.Authority);
    }

    public void Dispose()
    {
        _transfer?.Dispose();
        _client?.Dispose();
    }
}

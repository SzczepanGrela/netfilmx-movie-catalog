namespace NetFilmx_Service.Storage;

// Uploads allocate their own keys. Catalogue deletion has no storage-delete capability.
public interface ICloudStorageService
{
    bool IsConfigured { get; }
    Task<string> UploadPosterAsync(string filePath, string contentType, CancellationToken token = default);
    Task<string> UploadHlsAsync(string directoryPath, CancellationToken token = default);
}

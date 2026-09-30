using System.Threading.Tasks;

namespace NetFilmx_Service.Storage
{
    public interface ICloudStorageService
    {
        bool IsConfigured { get; }
        Task<string> UploadFileAsync(string filePath, string objectKey, string contentType = "application/octet-stream");
        Task UploadDirectoryAsync(string directoryPath, string targetPrefix);
        Task DeleteFileAsync(string objectKey);
        Task DeleteDirectoryAsync(string targetPrefix);
    }
}

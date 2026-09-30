using Amazon.S3;
using Amazon.S3.Transfer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Threading.Tasks;

namespace NetFilmx_Service.Storage
{
    public class R2StorageService : ICloudStorageService
    {
        public bool IsConfigured => _s3Client != null && !string.IsNullOrEmpty(_bucketName);

        private readonly IAmazonS3? _s3Client;
        private readonly string? _bucketName;
        private readonly string _publicUrl;
        private readonly ILogger<R2StorageService>? _logger;

        public R2StorageService(IConfiguration configuration, ILogger<R2StorageService>? logger = null)
        {
            _logger = logger;
            var accessKey = configuration["CloudflareR2:AccessKey"];
            var secretKey = configuration["CloudflareR2:SecretKey"];
            var accountId = configuration["CloudflareR2:AccountId"];
            _bucketName = configuration["CloudflareR2:BucketName"];
            _publicUrl = configuration["CloudflareR2:PublicUrl"]?.TrimEnd('/') ?? "https://netfilmx-assets.grela.dev";

            if (!string.IsNullOrEmpty(accessKey) && !string.IsNullOrEmpty(secretKey) && !string.IsNullOrEmpty(accountId) && !string.IsNullOrEmpty(_bucketName))
            {
                var config = new AmazonS3Config
                {
                    ServiceURL = $"https://{accountId}.r2.cloudflarestorage.com",
                    AuthenticationRegion = "auto"
                };

                _s3Client = new AmazonS3Client(accessKey, secretKey, config);
            }
            else
            {
                _s3Client = null;
                _logger?.LogWarning("Cloudflare R2 nie jest w pełni skonfigurowane w appsettings.json. Usługa działa w trybie bezpiecznym.");
            }
        }

        public async Task<string> UploadFileAsync(string filePath, string objectKey, string contentType = "application/octet-stream")
        {
            if (_s3Client == null || string.IsNullOrEmpty(_bucketName))
            {
                _logger?.LogWarning("Pominięto upload do R2 (brak konfiguracji). Zwrócono publiczny URL: {Key}", objectKey);
                return $"{_publicUrl}/{objectKey}";
            }

            try
            {
                var transferUtility = new TransferUtility(_s3Client);
                var request = new TransferUtilityUploadRequest
                {
                    FilePath = filePath,
                    Key = objectKey,
                    BucketName = _bucketName,
                    ContentType = contentType,
                    DisablePayloadSigning = true
                };
                
                await transferUtility.UploadAsync(request);
                return $"{_publicUrl}/{objectKey}";
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Błąd podczas uploadu pliku do R2: {Key}", objectKey);
                throw new IOException($"Failed to upload file to R2: {ex.Message}", ex);
            }
        }

        public async Task UploadDirectoryAsync(string directoryPath, string targetPrefix)
        {
            if (_s3Client == null || string.IsNullOrEmpty(_bucketName))
            {
                _logger?.LogWarning("Pominięto upload katalogu do R2 (brak konfiguracji): {Prefix}", targetPrefix);
                return;
            }

            try
            {
                var transferUtility = new TransferUtility(_s3Client);
                var request = new TransferUtilityUploadDirectoryRequest
                {
                    Directory = directoryPath,
                    BucketName = _bucketName,
                    KeyPrefix = targetPrefix,
                    SearchOption = SearchOption.AllDirectories
                };
                
                await transferUtility.UploadDirectoryAsync(request);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Błąd podczas uploadu katalogu do R2: {Prefix}", targetPrefix);
                throw new IOException($"Failed to upload directory to R2: {ex.Message}", ex);
            }
        }

        public async Task DeleteFileAsync(string objectKey)
        {
            if (_s3Client == null || string.IsNullOrEmpty(_bucketName))
            {
                return;
            }

            try
            {
                var request = new Amazon.S3.Model.DeleteObjectRequest
                {
                    BucketName = _bucketName,
                    Key = objectKey
                };
                await _s3Client.DeleteObjectAsync(request);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Nie udało się usunąć pliku z R2: {Key}", objectKey);
                // Non-blocking warning so DB deletes succeed
            }
        }

        public async Task DeleteDirectoryAsync(string targetPrefix)
        {
            if (_s3Client == null || string.IsNullOrEmpty(_bucketName))
            {
                return;
            }
            
            try
            {
                var request = new Amazon.S3.Model.ListObjectsV2Request
                {
                    BucketName = _bucketName,
                    Prefix = targetPrefix
                };
                
                Amazon.S3.Model.ListObjectsV2Response response;
                do
                {
                    response = await _s3Client.ListObjectsV2Async(request);
                    
                    if (response?.S3Objects != null && response.S3Objects.Count > 0)
                    {
                        foreach (var obj in response.S3Objects)
                        {
                            try
                            {
                                await _s3Client.DeleteObjectAsync(_bucketName, obj.Key);
                            }
                            catch (Exception ex)
                            {
                                _logger?.LogWarning(ex, "Nie udało się usunąć obiektu R2: {Key}", obj.Key);
                            }
                        }
                    }
                    
                    request.ContinuationToken = response?.NextContinuationToken;
                } while (response != null && response.IsTruncated == true);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Błąd podczas usuwania katalogu z R2: {Prefix}", targetPrefix);
                // Non-blocking so DB deletes succeed
            }
        }
    }
}

using Amazon.S3;
using Amazon.S3.Transfer;
using Microsoft.Extensions.Configuration;
using System.IO;
using System.Threading.Tasks;

namespace NetFilmx_Service.Storage
{
    public class R2StorageService : ICloudStorageService
    {
        private readonly IAmazonS3 _s3Client;
        private readonly string _bucketName;
        private readonly string _publicUrl;

        public R2StorageService(IConfiguration configuration)
        {
            var accessKey = configuration["CloudflareR2:AccessKey"];
            var secretKey = configuration["CloudflareR2:SecretKey"];
            var accountId = configuration["CloudflareR2:AccountId"];
            _bucketName = configuration["CloudflareR2:BucketName"];
            _publicUrl = configuration["CloudflareR2:PublicUrl"]?.TrimEnd('/') ?? "https://netfilmx-assets.grela.dev";

            var config = new AmazonS3Config
            {
                ServiceURL = $"https://{accountId}.r2.cloudflarestorage.com",
                AuthenticationRegion = "auto"
            };

            _s3Client = new AmazonS3Client(accessKey, secretKey, config);
        }

        public async Task<string> UploadFileAsync(string filePath, string objectKey, string contentType = "application/octet-stream")
        {
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
                // Log exception in a real app, rethrow for now so it's not swallowed silently
                throw new IOException($"Failed to upload file to R2: {ex.Message}", ex);
            }
        }

        public async Task UploadDirectoryAsync(string directoryPath, string targetPrefix)
        {
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
                throw new IOException($"Failed to upload directory to R2: {ex.Message}", ex);
            }
        }

        public async Task DeleteFileAsync(string objectKey)
        {
            if (_s3Client == null) return;
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
                throw new IOException($"Failed to delete file from R2: {ex.Message}", ex);
            }
        }

        public async Task DeleteDirectoryAsync(string targetPrefix)
        {
            if (_s3Client == null) return;
            
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
                    
                    if (response?.S3Objects != null)
                    {
                        foreach(var obj in response.S3Objects)
                        {
                            await _s3Client.DeleteObjectAsync(_bucketName, obj.Key);
                        }
                    }
                    
                    request.ContinuationToken = response?.NextContinuationToken;
                } while (response != null && response.IsTruncated);
            }
            catch (Exception ex)
            {
                throw new IOException($"Failed to delete directory from R2: {ex.Message}", ex);
            }
        }
    }
}

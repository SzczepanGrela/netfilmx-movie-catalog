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
        private readonly string _accountId;

        public R2StorageService(IConfiguration configuration)
        {
            var accessKey = configuration["CloudflareR2:AccessKey"];
            var secretKey = configuration["CloudflareR2:SecretKey"];
            _accountId = configuration["CloudflareR2:AccountId"];
            _bucketName = configuration["CloudflareR2:BucketName"];

            var config = new AmazonS3Config
            {
                ServiceURL = $"https://{_accountId}.r2.cloudflarestorage.com",
                AuthenticationRegion = "auto"
            };

            _s3Client = new AmazonS3Client(accessKey, secretKey, config);
        }

        public async Task<string> UploadFileAsync(string filePath, string objectKey, string contentType = "application/octet-stream")
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
            
            return $"https://netfilmx-assets.grela.dev/{objectKey}";
        }

        public async Task UploadDirectoryAsync(string directoryPath, string targetPrefix)
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
    }
}

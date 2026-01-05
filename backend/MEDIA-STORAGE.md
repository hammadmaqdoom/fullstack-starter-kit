# Media Storage Configuration

This application supports two storage options for media files: **AWS S3** (cloud storage) and **Local File System** (fallback).

## Storage Options

### 1. AWS S3 Storage (Primary)

When AWS S3 credentials are properly configured, all media files will be uploaded to S3.

**Required Environment Variables:**
```bash
AWS_REGION=us-east-1
AWS_KEY=your-access-key-id
AWS_SECRET=your-secret-access-key
AWS_S3_BUCKET=your-bucket-name
```

**Advantages:**
- Scalable cloud storage
- CDN integration
- High availability
- Automatic backups

### 2. Local File Storage (Fallback)

When S3 credentials are not configured or S3 upload fails, the system automatically falls back to local file storage.

**Configuration:**
- Files are stored in: `backend/uploads/`
- Accessible via: `http://your-domain/uploads/`
- Default folder structure: `uploads/media/`

**Advantages:**
- No external dependencies
- Works immediately without configuration
- Good for development and testing
- No additional costs

## How It Works

The `MediaService` automatically detects which storage method to use:

1. **On Startup:**
   - Checks if all AWS S3 environment variables are set
   - Logs which storage method will be used

2. **On Upload:**
   - If S3 is configured: Attempts to upload to S3
   - If S3 fails or not configured: Falls back to local storage
   - Stores `storageType` field in database ('s3' or 'local')

3. **On Access:**
   - S3 files: Direct URL to S3 bucket
   - Local files: Served via `/uploads/` endpoint

## Database Schema

The `media` table includes a `storageType` column to track where each file is stored:

```typescript
@Column({ type: 'varchar', length: 20, default: 'local' })
storageType: string; // 's3' or 'local'
```

## Development Setup

### Without S3 (Local Storage Only)

Simply don't set AWS environment variables. The system will automatically use local storage.

```bash
# No AWS configuration needed
pnpm run start:dev
```

### With S3

Set the AWS environment variables in your `.env` file:

```bash
AWS_REGION=us-east-1
AWS_KEY=your-access-key-id
AWS_SECRET=your-secret-access-key
AWS_S3_BUCKET=your-bucket-name
```

## Production Deployment

### Recommended: Use S3

For production, we recommend using AWS S3 for:
- Better scalability
- CDN integration
- Automatic backups
- High availability

### Alternative: Local Storage with Volume Mounts

If using local storage in production:

1. **Docker:** Mount a persistent volume for the uploads directory
   ```yaml
   volumes:
     - ./uploads:/app/uploads
   ```

2. **Kubernetes:** Use a PersistentVolumeClaim
   ```yaml
   volumeMounts:
     - name: uploads
       mountPath: /app/uploads
   ```

3. **Regular Server:** Ensure the uploads directory is backed up regularly

## File Access

### S3 Files
```
https://your-bucket.s3.amazonaws.com/path/to/file.jpg
```

### Local Files
```
http://your-domain/uploads/media/filename.jpg
```

## Migration Between Storage Types

If you need to migrate from local storage to S3 (or vice versa):

1. Upload files to the new storage location
2. Update the `url` and `storageType` fields in the database
3. Optionally delete old files from the previous storage

## Troubleshooting

### S3 Upload Fails

If S3 upload fails, check:
- AWS credentials are correct
- S3 bucket exists and is accessible
- IAM permissions include `s3:PutObject`
- Network connectivity to AWS

The system will automatically fall back to local storage if S3 fails.

### Local Storage Issues

If local storage fails, check:
- `uploads/` directory exists and is writable
- Sufficient disk space available
- File permissions are correct

### Files Not Accessible

If files are not accessible via URL:
- Check static file serving is configured in `main.ts`
- Verify CORS settings allow file access
- Check file permissions

## Security Considerations

### S3
- Use IAM roles instead of access keys when possible
- Enable bucket encryption
- Configure appropriate bucket policies
- Use CloudFront for CDN and additional security

### Local Storage
- Ensure uploads directory is not publicly writable
- Implement file type validation
- Scan uploaded files for malware
- Set appropriate file size limits
- Use HTTPS in production

## Code Examples

### Uploading a File

```typescript
// In your service
const media = await this.mediaService.uploadMedia(
  file,
  userId,
  {
    altText: 'Profile picture',
    caption: 'User avatar',
    title: 'Avatar',
  }
);

console.log(media.url); // URL to access the file
console.log(media.storageType); // 's3' or 'local'
```

### Checking Storage Type

```typescript
const media = await this.mediaService.findById(mediaId);

if (media.storageType === 's3') {
  // Handle S3 file
} else {
  // Handle local file
}
```

## Monitoring

### Logs

The system logs storage operations:

```
[MediaService] Using AWS S3 for media storage
[MediaService] File uploaded to S3: path/to/file.jpg
[MediaService] S3 upload failed, falling back to local storage: Error message
[MediaService] File uploaded to local storage: media/filename.jpg
```

### Metrics to Track

- Upload success/failure rates
- Storage type distribution (S3 vs local)
- File sizes and storage usage
- Upload latency

## Best Practices

1. **Development:** Use local storage for simplicity
2. **Staging:** Use S3 with a separate bucket
3. **Production:** Use S3 with CDN
4. **Testing:** Mock storage services in unit tests
5. **Backup:** Regular backups regardless of storage type
6. **Monitoring:** Track storage usage and costs
7. **Cleanup:** Implement file cleanup for deleted records

## Future Enhancements

Potential improvements:
- Support for Google Cloud Storage
- Support for Azure Blob Storage
- Automatic migration between storage types
- Image optimization and resizing
- Video transcoding
- CDN integration for local storage


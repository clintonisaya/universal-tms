import logging
import os
import shutil
from pathlib import Path
import boto3
from botocore.exceptions import ClientError
from botocore.config import Config
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LocalStorageClient:
    def __init__(self):
        # Resolve path relative to this file (backend/app/core/storage.py)
        # We want backend/uploads
        self.upload_dir = Path(__file__).parent.parent.parent / "uploads"
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.bucket_name = "local"
        logger.info(f"Initialized Local Storage at {self.upload_dir}")

    def upload_file(self, file_content: bytes, object_name: str, content_type: str = None) -> str | None:
        try:
            file_path = self.upload_dir / object_name
            # Ensure parent directories exist for nested keys
            file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(file_path, "wb") as buffer:
                buffer.write(file_content)
            logger.info(f"File saved locally to {file_path}")
            return object_name
        except Exception as e:
            logger.error(f"Error saving file locally: {e}")
            return None

    def get_presigned_url(self, object_name: str, expiration: int = 3600) -> str | None:
        # Return a relative URL that the frontend can use.
        # This assumes we will serve these files via an endpoint.
        # Note: Frontend must prepend backend URL if needed, but since we use proxy, relative is fine.
        # However, `get_trip_attachments` returns full URL usually.
        # Let's return path relative to API root for now, or full URL if possible.
        # Since we don't know the host, let's return a path that our new endpoint will handle.
        # e.g., /api/v1/files/{object_name}
        return f"{settings.API_V1_STR}/files/{object_name}"

    def delete_file(self, object_name: str) -> bool:
        try:
            file_path = self.upload_dir / object_name
            if file_path.exists():
                file_path.unlink()
                logger.info(f"File deleted locally: {file_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting local file: {e}")
            return False

class StorageClient:
    def __init__(self):
        self.s3_client = None
        self.bucket_name = settings.R2_BUCKET_NAME
        
        if settings.R2_ACCESS_KEY_ID and settings.R2_SECRET_ACCESS_KEY:
            # Determine endpoint URL
            endpoint_url = settings.S3_ENDPOINT or settings.R2_ENDPOINT
            if not endpoint_url and settings.R2_ACCOUNT_ID:
                endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
            
            logger.info(f"Initializing Storage Client with Endpoint: {endpoint_url}, Region: {settings.R2_REGION}, Bucket: {self.bucket_name}")

            if endpoint_url:
                try:
                    self.s3_client = boto3.client(
                        service_name='s3',
                        endpoint_url=endpoint_url,
                        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                        region_name=settings.R2_REGION,
                        config=Config(signature_version='s3v4')
                    )
                    logger.info("Storage Client initialized successfully.")
                except Exception as e:
                    logger.error(f"Failed to initialize Storage Client: {e}")
            else:
                logger.warning("Storage endpoint URL could not be determined. Missing S3_ENDPOINT, R2_ENDPOINT or R2_ACCOUNT_ID.")
        else:
            logger.warning("Storage credentials are missing in configuration. Storage operations will fail.")

    def upload_file(self, file_content: bytes, object_name: str, content_type: str = None) -> str | None:
        """Upload a file to an R2 bucket
        
        :param file_content: Bytes of the file to upload
        :param object_name: S3 object name (key).
        :param content_type: MIME type of the file (optional)
        :return: The object key if file was uploaded, else None
        """
        if not self.s3_client:
            logger.error("R2 client is not initialized.")
            return None

        if not self.bucket_name:
             logger.error("R2 bucket name is not configured.")
             return None

        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            logger.info(f"Attempting to upload file to {self.bucket_name}/{object_name}...")
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=object_name,
                Body=file_content,
                **extra_args
            )
            logger.info(f"File uploaded successfully to {self.bucket_name}/{object_name}")
            return object_name
        except ClientError as e:
            logger.error(f"Error uploading file to R2: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error uploading file to R2: {e}")
            return None

    def get_presigned_url(self, object_name: str, expiration: int = 3600) -> str | None:
        """Generate a presigned URL to share an S3 object

        :param object_name: string
        :param expiration: Time in seconds for the presigned URL to remain valid
        :return: Presigned URL as string. If error, returns None.
        """
        if not self.s3_client:
             logger.error("R2 client is not initialized.")
             return None
        
        if not self.bucket_name:
             logger.error("R2 bucket name is not configured.")
             return None

        try:
            response = self.s3_client.generate_presigned_url('get_object',
                                                        Params={'Bucket': self.bucket_name,
                                                                'Key': object_name},
                                                        ExpiresIn=expiration)
            return response
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            return None

    def delete_file(self, object_name: str) -> bool:
        """Delete a file from an R2 bucket
        
        :param object_name: S3 object name.
        :return: True if file was deleted, else False
        """
        if not self.s3_client:
            logger.error("R2 client is not initialized.")
            return False

        if not self.bucket_name:
             logger.error("R2 bucket name is not configured.")
             return False

        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=object_name)
            logger.info(f"File deleted successfully: {self.bucket_name}/{object_name}")
            return True
        except ClientError as e:
            logger.error(f"Error deleting file from R2: {e}")
            return False

if settings.R2_ACCESS_KEY_ID:
    storage = StorageClient()
else:
    storage = LocalStorageClient()

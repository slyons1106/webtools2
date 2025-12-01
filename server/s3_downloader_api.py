import boto3
import json
import os
import sys
import base64
import io
from botocore.exceptions import BotoCoreError, ClientError
from PIL import Image

def human_error(e: Exception) -> str:
    return f"{type(e).__name__}: {str(e) or 'No details'}"

def get_s3_client(profile_name: str = None, region_name: str = None):
    try:
        if profile_name:
            session = boto3.Session(profile_name=profile_name, region_name=region_name)
        else:
            session = boto3.Session(region_name=region_name)
        s3 = session.client("s3")
        # Test connection by listing buckets, but gracefully handle the error.
        s3.list_buckets()
        return s3
    except BotoCoreError as e:
        # Catch more specific BotoCoreError for connection issues
        raise ConnectionError(f"AWS BotoCoreError: {human_error(e)}")
    except ClientError as e:
        # Catch ClientError for permissions or non-existent bucket (e.g., if list_buckets() fails)
        error_code = e.response.get("Error", {}).get("Code")
        error_message = e.response.get("Error", {}).get("Message")
        raise ConnectionError(f"AWS ClientError [{error_code}]: {error_message}")
    except Exception as e:
        # Generic catch-all for any other unexpected connection errors
        raise ConnectionError(f"S3 connection error: {human_error(e)}")

def list_s3_contents(bucket: str, prefix: str = "", profile: str = None, region: str = None):
    try:
        s3 = get_s3_client(profile, region)
        folders = set()
        files = []
        paginator = s3.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix, Delimiter="/"):
            for common in page.get("CommonPrefixes", []):
                name = common["Prefix"][len(prefix):]
                folders.add(name)
            for item in page.get("Contents", []):
                key = item["Key"]
                if key == prefix:
                    continue
                remainder = key[len(prefix):]
                if "/" in remainder:
                    continue
                files.append(key)
        return {"folders": sorted(list(folders)), "files": sorted(files)}
    except ConnectionError as e: # Catch our custom connection error
        raise e
    except (ClientError, BotoCoreError) as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        error_message = e.response.get("Error", {}).get("Message", human_error(e))
        raise ValueError(f"S3 List Error [{error_code}]: {error_message}")
    except Exception as e:
        raise ValueError(f"An unexpected error occurred while listing S3 contents: {human_error(e)}")

def search_s3_newest_first(bucket: str, prefix: str, term: str, profile: str = None, region: str = None):
    try:
        s3 = get_s3_client(profile, region)
        paginator = s3.get_paginator("list_objects_v2")

        files_with_last_modified = []
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
            for item in page.get("Contents", []):
                key = item["Key"]
                if key.lower().endswith(".png") and term.lower() in key.lower():
                    files_with_last_modified.append((key, item.get("LastModified")))

        # Sort by LastModified, newest first
        files_with_last_modified.sort(key=lambda x: (x[1] is None, x[1]), reverse=True)

        for key, _ in files_with_last_modified:
            return {"key": key} # Return the first (newest) match

        return None
    except ConnectionError as e: # Catch our custom connection error
        raise e
    except (ClientError, BotoCoreError) as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        error_message = e.response.get("Error", {}).get("Message", human_error(e))
        raise ValueError(f"S3 Search Error [{error_code}]: {error_message}")
    except Exception as e:
        raise ValueError(f"An unexpected error occurred while searching S3: {human_error(e)}")

def get_s3_image_data(bucket: str, key: str, profile: str = None, region: str = None):
    try:
        s3 = get_s3_client(profile, region)
        obj = s3.get_object(Bucket=bucket, Key=key)
        raw = obj["Body"].read()

        img_bytes = None
        try:
            text = raw.decode("utf-8", errors="strict").strip()
        except UnicodeDecodeError:
            text = None

        if raw.startswith(b"\x89PNG\r\n\x1a\n"):
            img_bytes = raw
        elif text is not None:
            if text.startswith("data:image/png;base64,"):
                text = text.split(",", 1)[1].strip()
            b64 = "".join(text.split())
            try:
                img_bytes = base64.b64decode(b64, validate=True)
            except (base64.binascii.Error, ValueError):
                img_bytes = base64.b64decode(b64, validate=False)
        else:
            try:
                img_bytes = base64.b64decode(raw, validate=True)
            except Exception:
                img_bytes = raw
        
        # Verify it's a valid image and convert to PNG if necessary
        image = Image.open(io.BytesIO(img_bytes))
        
        # Convert to PNG format in base64
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        return {"image_data": f"data:image/png;base64,{img_str}", "width": image.width, "height": image.height}

    except ConnectionError as e: # Catch our custom connection error
        raise e
    except (ClientError, BotoCoreError, OSError, ValueError) as e:
        if isinstance(e, (ClientError, BotoCoreError)):
            error_code = e.response.get("Error", {}).get("Code", "Unknown") if hasattr(e, 'response') else "Unknown"
            error_message = e.response.get("Error", {}).get("Message", human_error(e)) if hasattr(e, 'response') else human_error(e)
            raise ValueError(f"S3 Image Error [{error_code}]: {error_message}")
        else: # OSError, ValueError from PIL or base64
            raise ValueError(f"Image processing error: {human_error(e)}")
    except Exception as e:
        raise ValueError(f"An unexpected error occurred while getting S3 image: {human_error(e)}")

if __name__ == "__main__":
    command = sys.argv[1]
    
    profile = os.environ.get("AWS_PROFILE")
    region = os.environ.get("AWS_REGION")

    try:
        if command == "list":
            bucket = sys.argv[2]
            prefix = sys.argv[3] if len(sys.argv) > 3 else ""
            result = list_s3_contents(bucket, prefix, profile, region)
        elif command == "search":
            bucket = sys.argv[2]
            prefix = sys.argv[3]
            term = sys.argv[4]
            result = search_s3_newest_first(bucket, prefix, term, profile, region)
        elif command == "get_image":
            bucket = sys.argv[2]
            key = sys.argv[3]
            result = get_s3_image_data(bucket, key, profile, region)
        else:
            result = {"error": "Invalid command"}
        
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": human_error(e)}))
        sys.exit(1)

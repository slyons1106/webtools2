import boto3
import json
import os
import sys

def get_s3_summary():
    """
    Connects to AWS S3 and returns a summary of buckets and object counts.
    """
    try:
        # Use the profile passed from the Node.js environment
        aws_profile = os.environ.get('AWS_PROFILE', 'default')
        session = boto3.Session(profile_name=aws_profile)
        s3 = session.client('s3')

        response = s3.list_buckets()
        buckets = []
        for bucket in response['Buckets']:
            bucket_name = bucket['Name']
            try:
                # For each bucket, get the object count
                obj_count_response = s3.list_objects_v2(Bucket=bucket_name)
                obj_count = obj_count_response.get('KeyCount', 0)
                buckets.append({'name': bucket_name, 'objectCount': obj_count})
            except Exception as e:
                # If we can't access a bucket, note it and move on
                buckets.append({'name': bucket_name, 'objectCount': 'Access Denied', 'error': str(e)})

        return {"buckets": buckets}

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    summary = get_s3_summary()
    # Print the JSON summary to stdout for the Node.js process to capture
    print(json.dumps(summary))

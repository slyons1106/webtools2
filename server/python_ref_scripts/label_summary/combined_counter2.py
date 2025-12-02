import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))
# This appends the project root to sys.path

import boto3
from datetime import datetime, timedelta
from math import ceil
import requests # Keeping requests just in case it was used for something else, although not for
from server import settings # Assuming settings will be managed locally for non-secret vars

# SLACK_WEBHOOK_URL and related logic were removed as per user instruction.
# No hardcoded secrets should be present.


def init_s3_client():
    session = boto3.Session(profile_name="gateway")
    return session.client("s3")


def count_png_files(s3_client, bucket_name, prefix):
    paginator = s3_client.get_paginator("list_objects_v2")
    operation_parameters = {"Bucket": bucket_name, "Prefix": prefix}
    total_count = 0

    for page in paginator.paginate(**operation_parameters):
        for obj in page.get("Contents", []):
            if obj["Key"].endswith(".png"):
                total_count += 1

    return total_count


def get_folder_breakdown(s3_client, bucket_name, base_prefix):
    """
    Returns a dict of {subfolder_name: png_count} for the given prefix.
    """
    paginator = s3_client.get_paginator("list_objects_v2")
    operation_parameters = {
        "Bucket": bucket_name,
        "Prefix": base_prefix,
        "Delimiter": "/"
    }

    subfolders = []
    for page in paginator.paginate(**operation_parameters):
        subfolders.extend(page.get("CommonPrefixes", []))

    breakdown = {}

    for folder in subfolders:
        prefix = folder["Prefix"]
        count = count_png_files(s3_client, bucket_name, prefix)
        subfolder_name = prefix.replace(base_prefix, "").strip("/")
        breakdown[subfolder_name] = count

    return breakdown


def generate_report(date_str=None):
    s3_client = init_s3_client()
    bucket_name = "pat-labels"

    if date_str:
        target_date = datetime.strptime(date_str, "%Y-%m-%d")
    else:
        target_date = datetime.now()

    selected_date = target_date.strftime("%Y/%m/%d")
    prefix = f"{selected_date}/"

    # Define the folders to check under the date
    initial_folders = {
        "Anomaly": f"{prefix}Anomaly/",
        "CoV": f"{prefix}CoV/",
        "Manifests": f"{prefix}Manifests/",
        "NewSales": f"{prefix}NewSales/",
        "ReplacementCradle": f"{prefix}ReplacementCradle/",
        "ReplacementChargingCable": f"{prefix}ReplacementChargingCable/",
        "ReplacementDevice": f"{prefix}ReplacementDevice/",
        "ReturnQR": f"{prefix}ReturnQR/",
        "Powerbank": f"{prefix}Powerbank/",
        "Returns": f"{prefix}Returns/"
    }

    # Count PNGs in all top-level folders
    counts = {label: count_png_files(s3_client, bucket_name, path) for label, path in initial_folders.items()}

    # Get breakdowns
    newsales_breakdown = get_folder_breakdown(s3_client, bucket_name, initial_folders["NewSales"])
    anomalies_breakdown = get_folder_breakdown(s3_client, bucket_name, initial_folders["Anomaly"])

    # Totals
    newsales_total = sum(newsales_breakdown.values())
    anomalies_total = sum(anomalies_breakdown.values())

    # Transform counts into combined categories
    combined_counts = {
        "NewSales": newsales_total,
        "ReplacementCradles": counts["CoV"] + counts["ReplacementCradle"],
        "Returns": ceil(counts["Returns"] / 2),
        "Anomalies": ceil(anomalies_total / 2),
        "API": counts["ReplacementDevice"],
        "Powerbank": counts["Powerbank"],
        "ReplacementChargingCable": counts["ReplacementChargingCable"]
    }

    # Format output
    output_lines = [f"Label Summary for {selected_date}:", "-" * 30]
    for label, count in combined_counts.items():
        output_lines.append(f"{label:<25}: {count}")

        # Detailed breakdowns
        if label == "NewSales":
            for subfolder, subcount in sorted(newsales_breakdown.items()):
                output_lines.append(f"  - {subfolder:<22}: {subcount}")

        elif label == "Anomalies":
            for subfolder, subcount in sorted(anomalies_breakdown.items()):
                output_lines.append(f"  - {subfolder:<22}: {ceil(subcount / 2)}")

    output_text = "\n".join(output_lines)

    return output_text

if __name__ == "__main__":
    date_arg = None
    if "--screen" in sys.argv:
        try:
            # Check if a date is provided after --screen
            index = sys.argv.index("--screen") + 1
            if index < len(sys.argv):
                date_arg = sys.argv[index]
        except (ValueError, IndexError):
            pass  # No date provided, will use current date

        report = generate_report(date_str=date_arg)
        print(report)
    else:
        print("This script is intended to be run with the --screen argument.")

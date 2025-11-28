import boto3
from datetime import datetime
from math import ceil
# import schedule # Removed as not needed for web-integrated version
import time
import requests
import sys

import os
# Slack webhook URL
SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL")


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


def generate_report(report_date_str=None): # Added optional parameter
    s3_client = init_s3_client()
    bucket_name = "pat-labels"
    
    if report_date_str:
        prefix = f"{report_date_str}/"
        display_date = report_date_str
    else:
        selected_date = datetime.now().strftime("%Y/%m/%d")
        prefix = f"{selected_date}/"
        display_date = selected_date

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
    output_lines = [f"Label Summary for {display_date}:", "-" * 30]
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

    # Write to file
    with open("label.txt", "w") as file:
        file.write(output_text)

    return output_text


def send_to_slack(message):
    payload = {"text": message}
    response = requests.post(SLACK_WEBHOOK_URL, json=payload)
    if response.status_code == 200:
        print("Message sent to Slack successfully.")
    else:
        print(f"Failed to send message to Slack: {response.status_code} - {response.text}")


# Entry point
if __name__ == "__main__":
    date_arg = None
    if "--date" in sys.argv:
        try:
            date_index = sys.argv.index("--date")
            date_arg = sys.argv[date_index + 1]
            # Basic validation of date format YYYY/MM/DD
            datetime.strptime(date_arg, "%Y/%m/%d")
        except (ValueError, IndexError):
            print("Error: --date argument requires a date in YYYY/MM/DD format.")
            sys.exit(1)

    if "--test" in sys.argv:
        print("Running in test mode... (Slack enabled)")
        report = generate_report(date_arg)
        send_to_slack(report)

    elif "--screen" in sys.argv:
        # print(f"Label Count for {date_arg if date_arg else 'today'}") # Changed message - removed as it breaks JSON output
        report = generate_report(date_arg)
        print(report)

    else:
        # If run without arguments, it might be the scheduled version or just a direct execution
        # For the web context, it will always be run with --screen
        print(f"Generating report for {date_arg if date_arg else 'today'} for direct execution or web context...")
        report = generate_report(date_arg)
        print(report)
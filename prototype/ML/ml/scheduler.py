import os
import sys
import json
import argparse
import subprocess
from pathlib import Path

BASE_DIR = Path(os.path.dirname(os.path.abspath(__file__))).parent
ML_DIR = BASE_DIR / "ml"
CONFIG_FILE = ML_DIR / "config.json"
TASK_NAME = "Skyrate_Airfare_Scraper"
PIPELINE_SCRIPT = ML_DIR / "daily_pipeline.py"

def load_config():
    if not CONFIG_FILE.exists():
        print(f"Error: Config file not found at {CONFIG_FILE}")
        return None
    with open(CONFIG_FILE, 'r') as f:
        return json.load(f)

def install_task():
    config = load_config()
    if not config:
        return
        
    schedule = config.get("schedule", {})
    if not schedule.get("enabled"):
        print("Schedule is disabled in config.json. Task will not be installed.")
        return
        
    start_time = schedule.get("start_time")
    if not start_time:
        print("Error: No start_time found in config.json.")
        return
        
    # Windows Task Scheduler expects time in HH:MM format (24-hour)
    # The command to execute python with our pipeline
    python_exe = sys.executable
    cmd = f"{python_exe} {PIPELINE_SCRIPT} --run-now"
    
    # We create a bat script to run the task silently and correctly in the right directory
    bat_file = ML_DIR / "run_pipeline.bat"
    with open(bat_file, "w") as f:
        f.write(f"@echo off\ncd /d \"{BASE_DIR}\"\n{python_exe} \"{PIPELINE_SCRIPT}\" --run-now\n")
        
    print(f"Installing Windows Task Scheduler task '{TASK_NAME}' for {start_time} daily...")
    
    # Build schtasks command
    schtasks_cmd = [
        "schtasks", "/Create", 
        "/TN", TASK_NAME,
        "/TR", str(bat_file),
        "/SC", "DAILY",
        "/ST", start_time,
        "/F" # Force override if exists
    ]
    
    try:
        subprocess.run(schtasks_cmd, check=True)
        print("Successfully installed/updated the scheduled task.")
    except subprocess.CalledProcessError as e:
        print(f"Error installing task: {e}")
        print("Please ensure you run this script as Administrator if required.")

def uninstall_task():
    print(f"Removing Windows Task Scheduler task '{TASK_NAME}'...")
    schtasks_cmd = ["schtasks", "/Delete", "/TN", TASK_NAME, "/F"]
    try:
        subprocess.run(schtasks_cmd, check=True)
        print("Successfully removed the scheduled task.")
    except subprocess.CalledProcessError as e:
        print(f"Error removing task (it might not exist): {e}")

def check_status():
    print(f"Checking status for Windows Task Scheduler task '{TASK_NAME}'...")
    schtasks_cmd = ["schtasks", "/Query", "/TN", TASK_NAME, "/FO", "LIST", "/V"]
    try:
        result = subprocess.run(schtasks_cmd, check=True, capture_output=True, text=True)
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Task '{TASK_NAME}' not found or could not be queried.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Skyrate Windows Task Scheduler Manager")
    parser.add_argument("--install", action="store_true", help="Install/Update the daily scheduled task")
    parser.add_argument("--uninstall", action="store_true", help="Remove the scheduled task")
    parser.add_argument("--status", action="store_true", help="Check the status of the scheduled task")
    
    args = parser.parse_args()
    
    if args.install:
        install_task()
    elif args.uninstall:
        uninstall_task()
    elif args.status:
        check_status()
    else:
        parser.print_help()

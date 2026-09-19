import yfinance as yf
import pandas as pd
from datetime import datetime
import json
import os

OIL_DB_FILE = "macro_indicators_db.json"

def fetch_daily_oil_prices():
    """
    Fetches the latest Brent Crude Oil closing price from Yahoo Finance.
    (Ticker: BZ=F for Brent Crude)
    """
    print("🛢️ Fetching latest Brent Crude Oil prices...")
    
    try:
        # Download the last 5 days of data just to ensure we catch a trading day
        brent = yf.download("BZ=F", period="5d", progress=False)
        
        if brent.empty:
            print("❌ Failed to fetch oil data.")
            return
            
        # Get the most recent closing price
        latest_date = brent.index[-1]
        
        # In newer versions of yfinance, Close might be a multi-index column, so we extract carefully
        latest_price = float(brent['Close'].iloc[-1].item() if isinstance(brent['Close'].iloc[-1], pd.Series) else brent['Close'].iloc[-1])
        
        print(f"✅ Latest Brent Crude Price ({latest_date.strftime('%Y-%m-%d')}): ${latest_price:.2f} per barrel")
        
        # Prepare the record for the database
        record = {
            "date": latest_date.strftime('%Y-%m-%d'),
            "brent_crude_usd": round(latest_price, 2),
            "fetch_timestamp": datetime.now().isoformat()
        }
        
        update_database(record)
        
    except Exception as e:
        print(f"❌ Error fetching oil prices: {e}")

def update_database(new_record):
    """
    Appends the new daily oil record to our macro indicators database.
    """
    db_data = []
    
    # Load existing database if it exists
    if os.path.exists(OIL_DB_FILE):
        with open(OIL_DB_FILE, 'r') as f:
            try:
                db_data = json.load(f)
            except json.JSONDecodeError:
                pass
                
    # Prevent duplicate entries for the same date
    dates_in_db = [entry['date'] for entry in db_data]
    if new_record['date'] in dates_in_db:
        print(f"⚠️ Data for {new_record['date']} already exists in the database. Skipping.")
        return
        
    # Append and Save
    db_data.append(new_record)
    
    with open(OIL_DB_FILE, 'w') as f:
        json.dump(db_data, f, indent=4)
        
    print(f"💾 Successfully saved to {OIL_DB_FILE}")

if __name__ == "__main__":
    fetch_daily_oil_prices()

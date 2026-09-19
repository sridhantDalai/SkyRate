import asyncio
import urllib.parse
import urllib.request
import re
from datetime import datetime, timedelta
from .base import BaseSource

class CleartripPlaywrightSource(BaseSource):
    name = "Cleartrip"
    TOKEN = "67b1aa47e95942009a80584ed148ffa2f0066c7fbe2"

    def __init__(self, browser=None, proxy_manager=None, session_manager=None):
        super().__init__(browser)

    async def fetch_fares(self, origin: str, dest: str, t_window: str, offset_days: int) -> list[dict]:
        # Format the date required for Cleartrip's URL
        target_date = (datetime.now() + timedelta(days=offset_days)).strftime("%d/%m/%Y")
        
        target_url = f"https://www.cleartrip.com/flights/results?adults=1&childs=0&infants=0&class=Economy&depart_date={target_date}&from={origin}&to={dest}"
        encoded_url = urllib.parse.quote(target_url)
        
        # Append render=true to execute JS on Scrape.do's browsers
        api_url = f"http://api.scrape.do?token={self.TOKEN}&render=true&url={encoded_url}"
        
        print(f"[INFO] Cleartrip: Fetching {origin}-{dest} for {t_window} via Scrape.do API...")
        
        # Run the HTTP request in a separate thread so it doesn't freeze the async engine
        loop = asyncio.get_event_loop()
        try:
            req = urllib.request.Request(api_url)
            response = await loop.run_in_executor(None, urllib.request.urlopen, req)
            html = response.read().decode('utf-8')
        except Exception as e:
            print(f"[ERROR] Cleartrip API request failed: {e}")
            return []
            
        return self.normalize(html, origin, dest, t_window)

    def normalize(self, html: str, origin: str, dest: str, t_window: str) -> list[dict]:
        records = []
        # DOM Parsing: Extract all numbers next to a Rupee symbol
        prices = re.findall(r'₹\s*([\d,]+)', html)
        
        valid_prices = []
        for p in prices:
            try:
                clean_val = int(p.replace(',', ''))
                # Filter out small UI numbers (like 600 INR baggage fees). Flight prices are > 2000
                if clean_val > 2000:
                    valid_prices.append(clean_val)
            except:
                pass
                
        # Remove duplicate prices (which happen often when the same price is listed on mobile and desktop views in HTML)
        valid_prices = list(set(valid_prices))
        
        for price in valid_prices:
            # Because we are scraping raw DOM without specific CSS mapping, we generalize the metadata
            records.append({
                "route": f"{origin}-{dest}",
                "carrier": "Multiple (Cleartrip)",
                "flight_number": "Unknown",
                "is_non_stop": True, # Assumption for prototype DOM parsing
                "departure_time": "Unknown",
                "t_window": t_window,
                "base_fare": int(price * 0.8), # Back-calculate an estimated base fare
                "taxes": int(price * 0.2), # Back-calculate estimated taxes
                "udf_fee": 0,
                "convenience_fee": 0,
                "gross_fare": price,
                "status": "Available",
                "source": self.name
            })
            
        print(f"[SUCCESS] Cleartrip: Extracted {len(records)} unique flight prices!")
        return records

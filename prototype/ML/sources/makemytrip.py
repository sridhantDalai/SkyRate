import asyncio
import json
from datetime import datetime, timedelta
from .base import BaseSource
from .browser import SessionManager, is_allowed
from config import STRICT_ETHICAL_MODE
from .proxy_manager import ProxyManager
from playwright_stealth.stealth import Stealth

class MakeMyTripPlaywrightSource(BaseSource):
    name = "MakeMyTrip"

    # MMT URL format: itinerary=DEL-BOM-DD/MM/YYYY
    SEARCH_URL_TEMPLATE = (
        "https://www.makemytrip.com/flight/search?itinerary={origin}-{dest}-{dd}/{mm}/{yyyy}"
        "&tripType=O&paxType=A-1_C-0_I-0&intl=false&cabinClass=E&ccde=IN&lang=eng"
    )

    def __init__(self, browser, proxy_manager=None, session_manager=None):
        super().__init__(browser)
        self.proxy_manager = proxy_manager or ProxyManager()
        self.session_manager = session_manager or SessionManager()

    async def fetch_fares(self, origin: str, dest: str, t_window: str, offset_days: int) -> list[dict]:
        target_date = datetime.now() + timedelta(days=offset_days)
        year = str(target_date.year)
        month = f"{target_date.month:02d}"
        day = f"{target_date.day:02d}"

        url = self.SEARCH_URL_TEMPLATE.format(
            origin=origin, dest=dest, dd=day, mm=month, yyyy=year
        )

        if STRICT_ETHICAL_MODE and not is_allowed(url):
            print(f"[WARNING] robots.txt disallows fetching {url}. Skipping to remain ethical/legal.")
            return []

        context_args = {
            "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        proxy = self.proxy_manager.get_next_proxy()
        if proxy:
            context_args["proxy"] = proxy
            
        if self.session_manager.has_session(self.name):
            context_args["storage_state"] = self.session_manager.get_session_path(self.name)

        context = await self.browser.new_context(**context_args)
        page = await context.new_page()
        await Stealth().apply_stealth_async(page)
        
        result = {}
        
        # --- NETWORK PAYLOAD INTERCEPTION ARCHITECTURE ---
        async def on_response(response):
            if "search/v1" in response.url or "flight/search" in response.url:
                try:
                    data = await response.json()
                    # MMT JSON payloads are massive, grab it if it looks like flight data
                    if data:
                        result["payload"] = data
                except Exception:
                    pass

        page.on("response", on_response)
        
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            await asyncio.sleep(8) # Wait for MMT background API calls
            
            html = await page.content()
            if "Access Denied" in html or "captcha" in html.lower():
                print(f"[WARNING] MakeMyTrip CAPTCHA detected for {origin}-{dest}. (Proxy rotation required)")
            
            await context.storage_state(path=self.session_manager.get_session_path(self.name))
        except Exception as e:
            await context.close()
            raise RuntimeError(f"MakeMyTrip navigation failed: {e}")
            
        await context.close()

        # Normalization Step
        if "payload" in result:
            return self.normalize(result["payload"], origin, dest, t_window)
        
        # Fallback if the endpoint name has changed or payload wasn't caught
        print(f"[INFO] MakeMyTrip API payload not intercepted for {origin}-{dest}. Endpoint name may have updated.")
        return []

    def normalize(self, raw_payload: dict, origin: str, dest: str, t_window: str) -> list[dict]:
        # Structural parsing stub - Since MMT schema varies, we wrap in try/except 
        # to ensure it fails safely if they change the JSON structure.
        records = []
        try:
            # Example structural extraction (requires active payload tuning)
            flights = raw_payload.get("data", {}).get("flights", [])
            for flight in flights:
                records.append({
                    "route": f"{origin}-{dest}",
                    "carrier": flight.get("airlineName", "Unknown"),
                    "flight_number": flight.get("flightNumber", "Unknown"),
                    "is_non_stop": True, # Placeholder
                    "departure_time": "Unknown", # Placeholder
                    "t_window": t_window,
                    "base_fare": float(flight.get("price", {}).get("baseFare", 0)),
                    "taxes": float(flight.get("price", {}).get("tax", 0)),
                    "udf_fee": 0.0, 
                    "convenience_fee": 0.0,
                    "gross_fare": float(flight.get("price", {}).get("totalFare", 0)),
                    "status": "Available",
                    "source": self.name,
                })
        except Exception as e:
            print(f"[ERROR] Failed to normalize MakeMyTrip payload: {e}")
        return records

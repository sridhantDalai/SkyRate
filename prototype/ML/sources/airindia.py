import asyncio
import json
from datetime import datetime, timedelta
from .base import BaseSource
from .browser import SessionManager, is_allowed
from config import STRICT_ETHICAL_MODE
from .proxy_manager import ProxyManager
from playwright_stealth.stealth import Stealth

class AirIndiaPlaywrightSource(BaseSource):
    name = "AirIndia"

    SEARCH_URL_TEMPLATE = "https://www.airindia.com/"

    def __init__(self, browser, proxy_manager=None, session_manager=None):
        super().__init__(browser)
        self.proxy_manager = proxy_manager or ProxyManager()
        self.session_manager = session_manager or SessionManager()

    async def fetch_fares(self, origin: str, dest: str, t_window: str, offset_days: int) -> list[dict]:
        url = self.SEARCH_URL_TEMPLATE

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
            if "searchFlights" in response.url or "shopping" in response.url:
                try:
                    data = await response.json()
                    if data:
                        result["payload"] = data
                except Exception:
                    pass

        page.on("response", on_response)
        
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            await asyncio.sleep(5) 
            
            await context.storage_state(path=self.session_manager.get_session_path(self.name))
        except Exception as e:
            await context.close()
            raise RuntimeError(f"Air India navigation failed: {e}")
            
        await context.close()

        if "payload" in result:
            return self.normalize(result["payload"], origin, dest, t_window)
            
        print(f"[INFO] Air India API payload not intercepted for {origin}-{dest}.")
        return []

    def normalize(self, raw_payload: dict, origin: str, dest: str, t_window: str) -> list[dict]:
        records = []
        try:
            # Structural parsing stub for Air India JSON
            flights = raw_payload.get("flights", [])
            for flight in flights:
                records.append({
                    "route": f"{origin}-{dest}",
                    "carrier": "Air India",
                    "flight_number": flight.get("flightNumber", "Unknown"),
                    "is_non_stop": True,
                    "departure_time": "Unknown",
                    "t_window": t_window,
                    "base_fare": float(flight.get("baseFare", 0)),
                    "taxes": float(flight.get("tax", 0)),
                    "udf_fee": 0.0, 
                    "convenience_fee": 0.0,
                    "gross_fare": float(flight.get("totalFare", 0)),
                    "status": "Available",
                    "source": self.name,
                })
        except Exception as e:
            print(f"[ERROR] Failed to normalize Air India payload: {e}")
        return records

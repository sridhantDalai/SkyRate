import asyncio
import uuid
from datetime import datetime, timedelta
from .base import BaseSource
from .browser import is_allowed, SessionManager
from .proxy_manager import ProxyManager
from city_codes import IATA_TO_CITY
from playwright_stealth.stealth import Stealth

# Standardized User Development Fees (UDF) for major Indian Airports
UDF_RATES = {
    "DEL": 77, "BOM": 120, "BLR": 250, "HYD": 281, "CCU": 150,
    "MAA": 100, "GOI": 80, "PNQ": 50, "AMD": 110, "SXR": 0,
    "COK": 170, "JAI": 150,
}

class EaseMyTripPlaywrightSource(BaseSource):
    name = "EaseMyTrip"

    SEARCH_URL_TEMPLATE = (
        "https://www.easemytrip.com/flight-search/listing"
        "?srch={origin}-{origin_city}-India%7C{dest}-{dest_city}-India%7C{dd}%2F{mm}%2F{yyyy}"
        "&px=1-0-0"
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

        origin_city = IATA_TO_CITY.get(origin, origin)
        dest_city = IATA_TO_CITY.get(dest, dest)

        url = self.SEARCH_URL_TEMPLATE.format(
            origin=origin,
            origin_city=origin_city,
            dest=dest,
            dest_city=dest_city,
            dd=day, mm=month, yyyy=year,
        )

        if not is_allowed(url):
            raise PermissionError(f"robots.txt disallows fetching {url}")

        # Set up Context with Proxy, Session, and User-Agent
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
        
        # Apply Playwright Stealth to evade bot detection
        await Stealth().apply_stealth_async(page)
        
        result = {}
        
        async def on_response(response):
            if "AirBus_New" in response.url:
                try:
                    result["payload"] = await response.json()
                except Exception:
                    pass

        page.on("response", on_response)
        
        try:
            await page.goto(url, wait_until="networkidle", timeout=45000)
            await asyncio.sleep(5) # Wait for Background XHRs
            
            # CAPTCHA Detection Architecture Stub
            html = await page.content()
            if "cf-turnstile" in html or "g-recaptcha" in html or "Access Denied" in html:
                # Stub: In production, pass page to 2captcha/Anti-Captcha resolver here
                print(f"[WARNING] CAPTCHA detected for {origin}-{dest}. Initiating bypass architecture (stub).")
                # await solve_captcha(page)
                # await asyncio.sleep(5)
                
            # If successful, save state for session management
            await context.storage_state(path=self.session_manager.get_session_path(self.name))
            
        except Exception as e:
            await context.close()
            raise RuntimeError(f"Failed to load page for {origin}-{dest}: {e}")

        if "payload" not in result:
            await context.close()
            raise RuntimeError(f"AirBus_New response not captured for {origin}-{dest} at {target_date.strftime('%Y-%m-%d')}")

        await context.close()
        return self.normalize(result["payload"], origin, dest, t_window)

    def normalize(self, raw_payload: dict, origin: str, dest: str, t_window: str) -> list[dict]:
        carrier_names = raw_payload.get("C", {})       
        flight_details = raw_payload.get("dctFltDtl", {})  
        route = f"{origin}-{dest}"
        records = []

        for group in raw_payload.get("j", []):
            for flight_option in group.get("s", []):
                carrier_code = None
                actual_flight_number = None
                for leg in flight_option.get("b", []):
                    fl_indices = leg.get("FL", [])
                    if fl_indices:
                        detail = flight_details.get(str(fl_indices[0]), {})
                        carrier_code = detail.get("AC")
                        fn_code = detail.get("FN")
                        if carrier_code and fn_code:
                            actual_flight_number = f"{carrier_code}-{fn_code}"
                        break
                carrier = carrier_names.get(carrier_code, carrier_code or "Unknown")
                flight_number = actual_flight_number or flight_option.get("FN", "Unknown")
                is_non_stop = (len(flight_option.get("b", [])) == 1)

                for fare in flight_option.get("lstFr", []):
                    base_fare = float(fare.get("BF", 0))
                    gross_fare = float(fare.get("TF", 0))
                    raw_tax = float(fare.get("TTX", fare.get("TTXMP", gross_fare - base_fare)))
                    
                    udf = float(UDF_RATES.get(origin, 100.0))
                    tax = max(0.0, raw_tax - udf)
                    
                    status = "Available"
                    if flight_option.get("isSO", False):
                        status = "Sold Out"
                        
                    unique_id = uuid.uuid4().hex[:8]

                    records.append({
                        "ID": unique_id,
                        "route": route,
                        "carrier": carrier,
                        "flight_number": flight_number,
                        "is_non_stop": is_non_stop,
                        "t_window": t_window,
                        "base_fare": base_fare,
                        "taxes": tax,
                        "udf_fee": udf, 
                        "gross_fare": gross_fare,
                        "status": status,
                        "source": self.name,
                    })

        return records
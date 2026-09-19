import asyncio
from datetime import datetime, timedelta
from .base import BaseSource
from .browser import SessionManager, is_allowed
from config import STRICT_ETHICAL_MODE
from .proxy_manager import ProxyManager
from playwright_stealth.stealth import Stealth

class AirIndiaExpressPlaywrightSource(BaseSource):
    name = "AirIndiaExpress"
    SEARCH_URL_TEMPLATE = "https://www.airindiaexpress.com/"

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
        
        async def on_response(response):
            if "flight" in response.url.lower() or "search" in response.url.lower() or "api" in response.url.lower():
                try:
                    data = await response.json()
                    if data:
                        result["payload"] = data
                except Exception:
                    pass

        page.on("response", on_response)
        
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            await asyncio.sleep(8) 
            await context.storage_state(path=self.session_manager.get_session_path(self.name))
        except Exception as e:
            await context.close()
            raise RuntimeError(f"Air India Express navigation failed: {e}")
            
        await context.close()

        if "payload" in result:
            return self.normalize(result["payload"], origin, dest, t_window)
            
        print(f"[INFO] Air India Express API payload not intercepted for {origin}-{dest}.")
        return []

    def normalize(self, raw_payload: dict, origin: str, dest: str, t_window: str) -> list[dict]:
        records = []
        try:
            # Stub for structural normalization
            flights = raw_payload.get("data", [])
            pass
        except Exception as e:
            print(f"[ERROR] Failed to normalize payload: {e}")
        return records

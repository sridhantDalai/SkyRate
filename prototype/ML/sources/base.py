from abc import ABC, abstractmethod
from playwright.async_api import Browser

class BaseSource(ABC):
    name: str

    def __init__(self, browser: Browser):
        self.browser = browser

    @abstractmethod
    async def fetch_fares(self, origin: str, dest: str, t_window: str, offset_days: int) -> list[dict]:
        """
        Fetch fares for a given route and timeframe, returning a list of dictionaries 
        that can map to the FarePayload model.
        """
        pass

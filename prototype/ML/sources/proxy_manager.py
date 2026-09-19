import random

class ProxyManager:
    """
    Manages IP Rotation via a proxy pool.
    For the hackathon prototype, if the pool is empty, it falls back to a direct connection.
    In production, you can inject thousands of proxies into this list.
    """
    def __init__(self, proxies: list[str] = None):
        self.proxies = []
        self._index = 0

    def get_next_proxy(self) -> dict | None:
        """
        Returns the next proxy in a round-robin fashion, formatted for Playwright.
        """
        if not self.proxies:
            return None # Direct connection
        
        # Round-robin selection
        proxy_url = self.proxies[self._index]
        self._index = (self._index + 1) % len(self.proxies)
        
        # Parse the proxy string because Playwright prefers explicit username/password
        if "@" in proxy_url:
            creds, server = proxy_url.split("@")
            creds = creds.replace("http://", "").replace("https://", "")
            username, password = creds.split(":", 1)
            return {
                "server": f"http://{server}",
                "username": username,
                "password": password
            }
            
        return {
            "server": proxy_url
        }

    def get_random_proxy(self) -> dict | None:
        if not self.proxies:
            return None
        return {
            "server": random.choice(self.proxies)
        }

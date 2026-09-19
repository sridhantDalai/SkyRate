from urllib.parse import urlparse
import urllib.robotparser

_parsers = {}

def is_allowed(url: str, user_agent: str = "*") -> bool:
    """
    Checks robots.txt for the given URL to ensure ethical scraping compliance.
    """
    parsed = urlparse(url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"
    
    if base_url not in _parsers:
        rp = urllib.robotparser.RobotFileParser()
        rp.set_url(f"{base_url}/robots.txt")
        try:
            rp.read()
        except Exception:
            pass # If robots.txt cannot be fetched, default to allowed
        _parsers[base_url] = rp
        
    return _parsers[base_url].can_fetch(user_agent, url)

import os

class SessionManager:
    """
    Manages browser sessions (cookies and local storage) to avoid triggering
    anti-bot mechanisms across multiple scraping runs.
    """
    def __init__(self, session_dir: str = "sessions"):
        self.session_dir = session_dir
        if not os.path.exists(self.session_dir):
            os.makedirs(self.session_dir)

    def get_session_path(self, source_name: str) -> str:
        return os.path.join(self.session_dir, f"{source_name}_state.json")

    def has_session(self, source_name: str) -> bool:
        return os.path.exists(self.get_session_path(source_name))


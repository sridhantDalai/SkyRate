from arq.connections import RedisSettings

# Local dev Redis connection
REDIS_SETTINGS = RedisSettings(host='localhost', port=6379)

# Booking horizons for the macroeconomic basket
HORIZONS = {"T+1": 1, "T+7": 7, "T+15": 15, "T+30": 30, "T+45": 45}

# Set to True to obey robots.txt (will result in 0 data for airlines). Set to False to bypass.
STRICT_ETHICAL_MODE = False

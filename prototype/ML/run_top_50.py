import asyncio
import sys
import pandas as pd
from datetime import datetime
from playwright.async_api import async_playwright
from sources import SOURCE_REGISTRY
from routes import load_dgca_routes
from tqdm import tqdm

# Standardized User Development Fees (UDF) for major Indian Airports
UDF_RATES = {
    "DEL": 77, "BOM": 120, "BLR": 250, "HYD": 281, "CCU": 150,
    "MAA": 100, "GOI": 80, "PNQ": 50, "AMD": 110, "SXR": 0,
    "COK": 170, "JAI": 150,
}

async def run_50_routes():
    # 1. Load the Top 50 DGCA Routes
    try:
        route_pairs = load_dgca_routes("dgca_routes.json")[:50]
    except Exception as e:
        print(f"[ERROR] Failed to load routes: {e}")
        return

    all_fares = []
    
    # 2. Launch Browser
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        
        scrapers = [cls(browser) for cls in SOURCE_REGISTRY.values()]
        
        route_iterator = tqdm(route_pairs, desc="Scraping Top 50 Routes", unit="route")
        time_horizons = [("T", 0), ("T+1", 1)]

        # 3. Extract data for 50 routes
        for origin, dest in route_iterator:
            for t_label, offset in time_horizons:
                for scraper in scrapers:
                    route_iterator.set_postfix(source=scraper.name, origin=origin, dest=dest, t=t_label)
                    
                    try:
                        fares = await scraper.fetch_fares(origin, dest, t_label, offset)
                        if fares:
                            all_fares.extend(fares)
                    except Exception as e:
                        print(f"\nFailed extracting {origin}-{dest} for {t_label} on {scraper.name}: {e}")
                
        await browser.close()
        
    # 4. Save to Excel
    if all_fares:
        df = pd.DataFrame(all_fares)
        filename = f"skyrate_top_50_routes_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
        df.to_excel(filename, index=False)
        print(f"\nSuccess: Exported {len(all_fares)} total fare tiers to {filename}")
    else:
        print("\nNo data extracted.")

if __name__ == "__main__":
    asyncio.run(run_50_routes())

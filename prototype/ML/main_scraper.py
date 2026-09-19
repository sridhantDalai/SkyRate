import asyncio
import sys
import pandas as pd
from datetime import datetime
from playwright.async_api import async_playwright

# =========================================================================
# USER CONFIGURATION - EDIT THIS BLOCK TO CONTROL YOUR SCRAPE
# =========================================================================

# List all the Origin/Destination pairs you want to scrape here.
# You can add as many as you want (up to all 835 active routes).
TARGET_ROUTES = [
    ("DEL", "BOM"), ("BLR", "DEL"), ("BOM", "GOI"), ("DEL", "CCU"), ("BOM", "BLR")
    # ("HYD", "MAA"), ("PNQ", "DEL"), ("CCU", "BLR"), ("AMD", "BOM"), ("DEL", "SXR"),
    # ("BOM", "COK"), ("MAA", "CCU"), ("DEL", "HYD"), ("BLR", "PNQ"), ("BOM", "JAI") 
]

# The advance-purchase windows mandated by SIH / MoSPI
TIME_HORIZONS = {
    "T": 0,
    "T+1": 1,
    "T+7": 7,
    "T+15": 15,
    "T+30": 30,
    "T+45": 45
}

# The name of the Excel file it will output
OUTPUT_FILENAME = f"skyrate_APIx_dataset_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"

# =========================================================================
# END CONFIGURATION
# =========================================================================

async def generate_excel_sample():
    all_fares = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        
        from sources import SOURCE_REGISTRY
        scrapers = [cls(browser) for cls in SOURCE_REGISTRY.values()]
        
        # Build the exact iteration matrix
        matrix = []
        for route in TARGET_ROUTES:
            for t_label, offset in TIME_HORIZONS.items():
                for scraper in scrapers:
                    matrix.append((route[0], route[1], t_label, offset, scraper))

        try:
            from tqdm import tqdm
            iterator = tqdm(matrix, desc="Multi-Horizon Extraction", unit="query")
        except ImportError:
            iterator = matrix

        # Execute the 100 queries
        for origin, dest, t_label, offset, scraper in iterator:
            if 'tqdm' not in sys.modules:
                print(f"Extracting {origin}-{dest} for {t_label} using {scraper.name}...")
            else:
                iterator.set_postfix(source=scraper.name, route=f"{origin}-{dest}", horizon=t_label)

            try:
                fares = await scraper.fetch_fares(origin, dest, t_label, offset)
                if fares:
                    all_fares.extend(fares)
            except Exception as e:
                # Silently catch timeouts to allow the matrix to complete
                pass
                
        await browser.close()
        
    # 4. Compile the Data Frame and output to Excel
    if all_fares:
        df = pd.DataFrame(all_fares)
        df.to_excel(OUTPUT_FILENAME, index=False)
        print(f"\nSuccess: Exported {len(all_fares)} total fare tiers across {len(TIME_HORIZONS)} time horizons to {OUTPUT_FILENAME}")
    else:
        print("\nNo data extracted.")

if __name__ == "__main__":
    asyncio.run(generate_excel_sample())

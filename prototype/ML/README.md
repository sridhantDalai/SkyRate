# ✈️ SkyRate: Real-Time Airfare Price Index (APIx)
### Problem Statement: SIH26056 (MoSPI)

## 📁 Project Structure

### 1. Data Extraction (Scraping)
* **`main_scraper.py`**: The master script that uses Playwright to dynamically scrape flight prices across 15 routes and 6 advance-purchase time horizons.
* **`oil_scraper.py`**: Automates daily fetching of Brent Crude Oil prices from Yahoo Finance to serve as a macroeconomic leading indicator.

### 2. Databases & Raw Data
* **`final.csv`**: Our primary database table storing the raw, granular flight prices scraped from OTAs (including Base Fare, Taxes, UDF).
* **`macro_indicators_db.json`**: Our secondary database storing historical crude oil prices.
* **`cpi_713.xlsx`**: The official MoSPI historical CPI baseline dataset.
* **`dgca_routes.xlsx`**: DGCA passenger traffic volumes used for economic weighting.

### 3. Economic Math & Analytics
* **`index_calculator.py`**: The core mathematical engine. It groups the scraped data into State-wise baskets, filters anomalies, calculates the true Fisher Ideal Index, and multiplies it by the official MoSPI baseline.

### 4. Output (For the Frontend)
* **`api_output.json`**: The final computed dataset containing the Real-Time APIx for all States and All-India. This file is served via FastAPI to our Next.js Dashboard.

## 🚀 How to Run
1. Activate the environment: `source venv/bin/activate`
2. Run the math engine: `python index_calculator.py`
3. Check `api_output.json` for the final results!

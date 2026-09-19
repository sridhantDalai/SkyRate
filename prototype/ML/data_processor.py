import pandas as pd
import numpy as np

# Standardized User Development Fees (UDF) for major Indian Airports
# MoSPI Requirement: Calculate UDF separately
UDF_RATES = {
    "DEL": 77,   # Delhi
    "BOM": 120,  # Mumbai
    "BLR": 250,  # Bangalore
    "HYD": 281,  # Hyderabad
    "CCU": 150,  # Kolkata
    "MAA": 100,  # Chennai
    "GOI": 80,   # Goa
    "PNQ": 50,   # Pune
    "AMD": 110,  # Ahmedabad
    "SXR": 0,    # Srinagar
    "COK": 170,  # Kochi
    "JAI": 150,  # Jaipur
}

def process_dataset(input_excel: str, output_excel: str):
    print(f"Loading raw dataset: {input_excel}")
    df = pd.read_excel(input_excel)
    
    # 1. CALCULATE UDF (User Development Fee)
    print("Calculating UDF based on departure airports...")
    # Extract origin from the route (e.g. "DEL-BOM" -> "DEL")
    df['origin'] = df['route'].apply(lambda x: x.split('-')[0])
    
    # Map the UDF, default to 100 if airport not in dict
    df['udf_fee'] = df['origin'].map(UDF_RATES).fillna(100)
    
    # FIX: UDF is actually bundled inside the Total 'taxes' field by OTAs. 
    # To make the math perfectly sum up (Base + Taxes + UDF = Gross), we must separate UDF from Taxes!
    df['taxes'] = df['taxes'] - df['udf_fee']
    # Ensure taxes don't drop below 0 if there was an anomaly
    df['taxes'] = df['taxes'].apply(lambda x: max(x, 0) if pd.notnull(x) else x)
    
    # 2. IDENTIFY SOLD OUT / CANCELLED FLIGHTS
    print("Analyzing flight availability across time horizons to detect Sold Out/Cancelled flights...")
    
    # We want to find flights that existed in advance (e.g. T+30) but disappeared closer to departure (e.g. T+1)
    # First, get all unique flights (route + carrier + flight_num)
    unique_flights = df[['route', 'carrier', 'flight_number']].drop_duplicates()
    
    # The time horizons we checked
    all_horizons = ["T+1", "T+3", "T+7", "T+15", "T+30", "T+45"]
    
    missing_records = []
    
    # Group by route and flight number
    grouped = df.groupby(['route', 'carrier', 'flight_number'])
    
    for (route, carrier, flight_number), group_df in grouped:
        # What horizons did this specific flight actually appear in?
        found_horizons = set(group_df['t_window'].unique())
        
        # If it appeared in T+30 or T+15, but is missing in T+1 or T+3, it is sold out/cancelled!
        if ("T+30" in found_horizons or "T+15" in found_horizons) and "T+1" not in found_horizons:
            missing_records.append({
                "route": route,
                "carrier": carrier,
                "flight_number": flight_number,
                "is_non_stop": True,
                "t_window": "T+1",
                "departure_time": "Unknown",
                "base_fare": np.nan,
                "taxes": np.nan,
                "udf_fee": UDF_RATES.get(route.split('-')[0], 100),
                "gross_fare": np.nan,
                "status": "Sold Out / Cancelled",
                "source": "Analytics Engine"
            })
            
    if missing_records:
        missing_df = pd.DataFrame(missing_records)
        df = pd.concat([df, missing_df], ignore_index=True)
        print(f"Detected and appended {len(missing_records)} Sold Out / Cancelled flights!")
    
    # Clean up temporary column and drop convenience_fee
    df = df.drop(columns=['origin'])
    if 'convenience_fee' in df.columns:
        df = df.drop(columns=['convenience_fee'])
    
    # Save the processed analytics dataset
    df.to_excel(output_excel, index=False)
    print(f"Successfully saved Analytics-Ready Dataset to {output_excel}")

if __name__ == "__main__":
    # Point this to the 24,000 row file we just created!
    input_file = "skyrate_5_routes_100_queries_20260915_2023.xlsx"
    output_file = "skyrate_FINAL_ANALYTICS.xlsx"
    process_dataset(input_file, output_file)

import streamlit as st
import pandas as pd
import plotly.express as px

st.set_page_config(page_title="SkyRate APIx Dashboard", layout="wide")

st.title("✈️ SkyRate: Airfare Price Index (APIx) Dashboard")
st.markdown("### MoSPI / SIH26056 Prototype")

# 1. Load Data
@st.cache_data
def load_data():
    try:
        # Load the final analytics dataset
        df = pd.read_excel("skyrate_FINAL_ANALYTICS.xlsx")
        return df
    except Exception as e:
        st.error(f"Could not load data. Ensure skyrate_FINAL_ANALYTICS.xlsx exists. Error: {e}")
        return pd.DataFrame()

df = load_data()

if df.empty:
    st.warning("No data found. Please run main_scraper.py and data_processor.py first.")
    st.stop()

# 2. Sidebar Filters
st.sidebar.header("Filter Data")
selected_route = st.sidebar.selectbox("Select Route", df['route'].unique())
selected_carrier = st.sidebar.selectbox("Select Carrier", ["All"] + list(df['carrier'].unique()))

# 3. Filter the DataFrame
filtered_df = df[df['route'] == selected_route]
if selected_carrier != "All":
    filtered_df = filtered_df[filtered_df['carrier'] == selected_carrier]

# 4. Top Metrics
st.markdown(f"### Route Analytics: {selected_route}")
col1, col2, col3, col4 = st.columns(4)

# Filter out cancelled flights for average calculations
active_flights = filtered_df[filtered_df['status'] != 'Sold Out / Cancelled']
cancelled_count = len(filtered_df[filtered_df['status'] == 'Sold Out / Cancelled'])

if not active_flights.empty:
    avg_fare = active_flights['gross_fare'].mean()
    min_fare = active_flights['gross_fare'].min()
    max_fare = active_flights['gross_fare'].max()
else:
    avg_fare = min_fare = max_fare = 0

col1.metric("Average Gross Fare", f"₹ {avg_fare:,.2f}")
col2.metric("Lowest Fare Found", f"₹ {min_fare:,.2f}")
col3.metric("Highest Fare Found", f"₹ {max_fare:,.2f}")
col4.metric("Sold Out / Cancelled", f"{cancelled_count} Flights", delta_color="inverse")

# 5. Price Elasticity Graph (Surge Pricing)
st.markdown("### 📈 Price Elasticity (Surge Pricing across Time Horizons)")
# Calculate average price per horizon
horizon_order = ["T+1", "T+3", "T+7", "T+15", "T+30", "T+45", "T+60", "T+90"]
agg_df = active_flights.groupby('t_window')['gross_fare'].mean().reset_index()
# Sort categorically
agg_df['t_window'] = pd.Categorical(agg_df['t_window'], categories=horizon_order, ordered=True)
agg_df = agg_df.sort_values('t_window')

if not agg_df.empty:
    fig1 = px.line(agg_df, x='t_window', y='gross_fare', markers=True, 
                   title=f"Average Surge Pricing for {selected_route}",
                   labels={'t_window': 'Days to Departure', 'gross_fare': 'Avg Gross Fare (₹)'})
    st.plotly_chart(fig1, use_container_width=True)

# 6. Component Breakdown (Base vs Taxes vs UDF)
st.markdown("### 📊 Fare Component Breakdown (MoSPI Requirement)")
breakdown_df = active_flights[['base_fare', 'taxes', 'udf_fee']].mean().reset_index()
breakdown_df.columns = ['Component', 'Average Amount (₹)']
fig2 = px.pie(breakdown_df, values='Average Amount (₹)', names='Component', hole=0.4,
              title=f"Fare Composition for {selected_route}")
st.plotly_chart(fig2, use_container_width=True)

# 7. Raw Data
st.markdown("### 🗄️ Raw Extracted Data")
st.dataframe(filtered_df.style.format(na_rep="N/A"))

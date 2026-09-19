from datetime import datetime
dt = datetime.now()
s = dt.strftime('%d_%m_%Y')
print(f'-- Copy and run this SQL in Supabase SQL Editor to create today tables ({s})')
print()
sql = f'''CREATE TABLE IF NOT EXISTS public."scraped_on_{s}" (
    "ID"           TEXT,
    route          TEXT,
    carrier        TEXT,
    flight_number  TEXT,
    is_non_stop    BOOLEAN,
    t_window       TEXT,
    base_fare      NUMERIC,
    taxes          NUMERIC,
    udf_fee        NUMERIC,
    gross_fare     NUMERIC,
    status         TEXT,
    source         TEXT
);
GRANT ALL ON public."scraped_on_{s}" TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public."index_for_{s}" (
    "State"            TEXT,
    "Time_Horizon"     TEXT,
    "MoSPI_Base"       NUMERIC,
    "Basket_Inflation" TEXT,
    "RealTime_APIx"    NUMERIC
);
GRANT ALL ON public."index_for_{s}" TO anon, authenticated, service_role;'''
print(sql)

import os
import pandas as pd
import numpy as np

DATA_DIR = r"c:\Users\gjins\Desktop\lnu-ai-society\data_raw\energy_hackathon_participants"

# Load cleaned data
readings = pd.read_csv(os.path.join(DATA_DIR, "energy_readings.csv"))
context = pd.read_csv(os.path.join(DATA_DIR, "hourly_context.csv"))
flats = pd.read_csv(os.path.join(DATA_DIR, "flats.csv"))
prices = pd.read_csv(os.path.join(DATA_DIR, "hourly_prices.csv"))

readings['dt_utc'] = pd.to_datetime(readings['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)
context['dt_utc'] = pd.to_datetime(context['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)
prices['dt_utc'] = pd.to_datetime(prices['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)

# Clean readings
clean_readings = readings.copy()
clean_readings['clean_app'] = clean_readings['appliance_id'].str.strip().str.upper()
clean_readings['clean_flat'] = clean_readings['flat_id'].str.strip().str.upper()
clean_readings['clean_unit'] = clean_readings['energy_unit'].str.strip().str.upper()
clean_readings['val_num'] = pd.to_numeric(clean_readings['energy_value'].astype(str).str.replace(',', '.'), errors='coerce')

is_mismatch = (clean_readings['clean_flat'] != clean_readings['clean_app'].apply(lambda x: x.split('-')[0])) & (clean_readings['clean_app'] != 'F999-A01')
clean_readings.loc[is_mismatch, 'clean_flat'] = clean_readings.loc[is_mismatch, 'clean_app'].apply(lambda x: x.split('-')[0])

f999_map = {
    'R0032484': 'F001-A04', 'R0030219': 'F005-A07', 'R0009798': 'F008-A05',
    'R0023991': 'F004-A02', 'R0031733': 'F006-A02', 'R0027692': 'F004-A07',
    'R0019485': 'F008-A04', 'R0027113': 'F002-A02', 'R0028571': 'F002-A04',
    'R0000486': 'F006-A03', 'R0006795': 'F003-A05', 'R0028012': 'F002-A05'
}
for rid, target_app in f999_map.items():
    clean_readings.loc[clean_readings['reading_id'] == rid, 'clean_app'] = target_app
    clean_readings.loc[clean_readings['reading_id'] == rid, 'clean_flat'] = target_app.split('-')[0]

clean_readings['kwh'] = np.where(clean_readings['clean_unit'] == 'WH', clean_readings['val_num'] / 1000.0, clean_readings['val_num'])
clean_readings['kwh'] = np.where(clean_readings['kwh'] > 2.0, clean_readings['kwh'] / 1000.0, clean_readings['kwh'])
clean_readings['kwh'] = np.where(clean_readings['kwh'] < 0, 0.0, clean_readings['kwh'])

clean_readings = clean_readings.sort_values(['clean_flat', 'clean_app', 'dt_utc', 'kwh'])
clean_readings = clean_readings.drop_duplicates(subset=['clean_flat', 'clean_app', 'dt_utc'], keep='first')

df = clean_readings.merge(context, left_on=['clean_flat', 'dt_utc'], right_on=['flat_id', 'dt_utc'], how='left')
df['channel'] = df['clean_app'].apply(lambda x: x.split('-')[1])

print("=== ACTIVE HIGH-POWER LOADS (A02, A03, A04, A07) WHEN OCCUPANTS == 0 ===")
unocc_active = df[(df['occupants_home'] == 0) & (df['channel'].isin(['A02', 'A03', 'A04', 'A07'])) & (df['kwh'] > 0.1)]
print(f"Total instances of high-power load when empty: {len(unocc_active)}")
print(unocc_active[['clean_flat', 'clean_app', 'dt_utc', 'kwh', 'occupants_home']])


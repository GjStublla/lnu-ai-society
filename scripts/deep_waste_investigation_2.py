import os
import pandas as pd
import numpy as np

DATA_DIR = r"c:\Users\gjins\Desktop\lnu-ai-society\data_raw\energy_hackathon_participants"

# Let's inspect A05 and other appliances during unoccupied periods
readings = pd.read_csv(os.path.join(DATA_DIR, "energy_readings.csv"))
context = pd.read_csv(os.path.join(DATA_DIR, "hourly_context.csv"))
flats = pd.read_csv(os.path.join(DATA_DIR, "flats.csv"))
prices = pd.read_csv(os.path.join(DATA_DIR, "hourly_prices.csv"))

readings['dt_utc'] = pd.to_datetime(readings['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)
context['dt_utc'] = pd.to_datetime(context['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)
prices['dt_utc'] = pd.to_datetime(prices['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)

# Clean context
clean_context = context.copy()
outdoor_map = clean_context[clean_context['outdoor_temp_c'] != -99].groupby('dt_utc')['outdoor_temp_c'].mean()
clean_context['outdoor_temp_c'] = clean_context.apply(
    lambda r: outdoor_map[r['dt_utc']] if r['outdoor_temp_c'] == -99 else r['outdoor_temp_c'], axis=1
)

# Impute prices
clean_prices = prices.copy().sort_values('dt_utc')
clean_prices['spot_sek_per_kwh_interp'] = clean_prices['spot_sek_per_kwh'].interpolate(method='linear')

# Clean readings
clean_readings = readings.copy()
clean_readings['clean_app'] = clean_readings['appliance_id'].str.strip().str.upper()
clean_readings['clean_flat'] = clean_readings['flat_id'].str.strip().str.upper()
clean_readings['clean_unit'] = clean_readings['energy_unit'].str.strip().str.upper()
clean_readings['val_num'] = pd.to_numeric(clean_readings['energy_value'].astype(str).str.replace(',', '.'), errors='coerce')

# Map cross-flat mismatches
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

df = clean_readings.merge(clean_context, left_on=['clean_flat', 'dt_utc'], right_on=['flat_id', 'dt_utc'], how='left')
df = df.merge(clean_prices[['dt_utc', 'spot_sek_per_kwh_interp', 'carbon_gco2e_per_kwh']], on='dt_utc', how='left')
df = df.merge(flats[['flat_id', 'residents', 'floor_area_m2']], left_on='clean_flat', right_on='flat_id', how='left')
df['cost_sek'] = df['kwh'] * df['spot_sek_per_kwh_interp']
df['carbon_kg'] = df['kwh'] * df['carbon_gco2e_per_kwh'] / 1000.0
df['channel'] = df['clean_app'].apply(lambda x: x.split('-')[1])

print("=== A05 (LIGHTING/ENTERTAINMENT) WHEN OCCUPANTS == 0 ===")
a05 = df[df['channel'] == 'A05']
a05_unocc = a05[a05['occupants_home'] == 0]
print(a05_unocc.groupby('clean_flat')['kwh'].agg(['count', 'sum', 'mean', 'max']))

print("\n=== A02 (DISHWASHER / WASHING MACHINE) LOAD TIMING ===")
# When does A02 run?
a02 = df[(df['channel'] == 'A02') & (df['kwh'] > 0.1)].copy()
a02['hour'] = a02['dt_utc'].dt.hour
# Check spot price during A02 operation vs daily average spot price
print("A02 runs by hour of day (UTC):")
print(a02['hour'].value_counts().sort_index())
print("\nA02 runs by flat:")
print(a02.groupby('clean_flat')['kwh'].agg(['count', 'sum', 'mean']))

# Calculate cost of A02 currently vs if shifted to cheapest night hours (01:00-05:00)
print("\nA02 Load Shifting Potential:")
# For each day and flat where A02 ran, what was the price at the actual run hour vs the cheapest hour between 00:00 and 06:00 on the same date?
a02['date'] = a02['dt_utc'].dt.date
cheapest_night_price = df[(df['dt_utc'].dt.hour >= 1) & (df['dt_utc'].dt.hour <= 5)].groupby(df['dt_utc'].dt.date)['spot_sek_per_kwh_interp'].min()
cheapest_night_carbon = df[(df['dt_utc'].dt.hour >= 1) & (df['dt_utc'].dt.hour <= 5)].groupby(df['dt_utc'].dt.date)['carbon_gco2e_per_kwh'].min()

a02['night_price'] = a02['date'].map(cheapest_night_price)
a02['night_carbon'] = a02['date'].map(cheapest_night_carbon)
a02['actual_cost'] = a02['kwh'] * a02['spot_sek_per_kwh_interp']
a02['shifted_cost'] = a02['kwh'] * a02['night_price']
a02['cost_saving'] = a02['actual_cost'] - a02['shifted_cost']

a02['actual_carbon'] = a02['kwh'] * a02['carbon_gco2e_per_kwh'] / 1000.0
a02['shifted_carbon'] = a02['kwh'] * a02['night_carbon'] / 1000.0
a02['carbon_saving'] = a02['actual_carbon'] - a02['shifted_carbon']

print(f"Total A02 actual cost: {a02['actual_cost'].sum():.2f} SEK")
print(f"Total A02 shifted cost: {a02['shifted_cost'].sum():.2f} SEK")
print(f"Total A02 financial savings from shifting: {a02['cost_saving'].sum():.2f} SEK ({(a02['cost_saving'].sum() / a02['actual_cost'].sum())*100:.1f}%)")
print(f"Total A02 actual carbon: {a02['actual_carbon'].sum():.2f} kg")
print(f"Total A02 shifted carbon: {a02['shifted_carbon'].sum():.2f} kg")
print(f"Total A02 carbon savings from shifting: {a02['carbon_saving'].sum():.2f} kg")

print("\nA02 shifting by flat:")
print(a02.groupby('clean_flat')[['kwh', 'actual_cost', 'cost_saving', 'carbon_saving']].sum().round(2))

print("\n=== NIGHTTIME CONSUMPTION (01:00 - 05:00 UTC) ===")
night = df[(df['dt_utc'].dt.hour >= 1) & (df['dt_utc'].dt.hour <= 5)]
night_summary = night.groupby(['clean_flat', 'channel'])['kwh'].agg(['sum', 'mean']).round(3)
print("Nighttime consumption by flat and channel (sum kWh > 5):")
print(night_summary[night_summary['sum'] > 5.0])


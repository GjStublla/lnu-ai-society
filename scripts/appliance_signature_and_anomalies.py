import os
import pandas as pd
import numpy as np

DATA_DIR = r"c:\Users\gjins\Desktop\lnu-ai-society\data_raw\energy_hackathon_participants"

readings = pd.read_csv(os.path.join(DATA_DIR, "energy_readings.csv"))
readings['dt_utc'] = pd.to_datetime(readings['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)
readings['clean_app'] = readings['appliance_id'].str.strip().str.upper()
readings['clean_flat'] = readings['flat_id'].str.strip().str.upper()
readings['clean_unit'] = readings['energy_unit'].str.strip().str.upper()
readings['val_num'] = pd.to_numeric(readings['energy_value'].astype(str).str.replace(',', '.'), errors='coerce')
readings['kwh'] = np.where(readings['clean_unit'] == 'WH', readings['val_num'] / 1000.0, readings['val_num'])

print("=== 1. NULL VALUES ANALYSIS ===")
nulls = readings[readings['energy_value'].isnull() | readings['energy_value'].isin(['', ' ', 'N/A', 'nan', 'None'])]
print(f"Total nulls in energy_value: {len(nulls)}")
print("Null count by flat:")
print(nulls['clean_flat'].value_counts())
print("Null count by appliance:")
print(nulls['clean_app'].value_counts())
print("Null count by date:")
print(nulls['dt_utc'].dt.date.value_counts().sort_index())

print("\n=== 2. NEGATIVE VALUES ANALYSIS ===")
negs = readings[readings['val_num'] < 0]
print(f"Total negative readings: {len(negs)}")
# Let's inspect surrounding values for these 36 negative readings
for idx, r in negs.head(10).iterrows():
    app = r['clean_app']
    t = r['dt_utc']
    surr = readings[(readings['clean_app'] == app) & (readings['dt_utc'] >= t - pd.Timedelta(hours=2)) & (readings['dt_utc'] <= t + pd.Timedelta(hours=2))].sort_values('dt_utc')
    print(f"\nNegative reading {r['reading_id']} for {app} at {t}: val={r['val_num']}")
    print(surr[['reading_id', 'dt_utc', 'val_num']])

print("\n=== 3. APPLIANCE LOAD SIGNATURES (INFERRING APPLIANCE TYPES) ===")
# Aggregate across all 8 flats for A01 to A07
# Let's see if A01..A07 represent consistent appliance types across flats!
readings_clean_sub = readings[readings['kwh'].notnull() & (readings['kwh'] >= 0)].copy()
readings_clean_sub['channel'] = readings_clean_sub['clean_app'].apply(lambda x: x.split('-')[1] if '-' in x else 'UNK')

channel_stats = readings_clean_sub.groupby('channel')['kwh'].agg([
    'count', 'mean', 'std', 'min', 
    lambda x: np.percentile(x, 50),
    lambda x: np.percentile(x, 90),
    lambda x: np.percentile(x, 99),
    'max',
    lambda x: (x == 0).mean() * 100, # zero percentage
    lambda x: (x > 0).mean() * 100   # active percentage
])
channel_stats.columns = ['count', 'mean', 'std', 'min', 'p50', 'p90', 'p99', 'max', 'pct_zero', 'pct_active']
print("Overall channel statistics (A01 - A07):")
print(channel_stats)

print("\nChannel statistics per flat (mean kWh / hour):")
pivot_mean = readings_clean_sub.pivot_table(index='clean_flat', columns='channel', values='kwh', aggfunc='mean')
print(pivot_mean)

print("\nChannel max per flat (max kWh / hour):")
pivot_max = readings_clean_sub.pivot_table(index='clean_flat', columns='channel', values='kwh', aggfunc='max')
print(pivot_max)

print("\nChannel percent zero per flat:")
pivot_zero = readings_clean_sub.pivot_table(index='clean_flat', columns='channel', values='kwh', aggfunc=lambda x: (x == 0).mean() * 100)
print(pivot_zero)


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

print("=== INSPECTING READINGS WITH kWh > 2.0 ===")
spikes = readings[readings['kwh'] > 2.0].sort_values('kwh', ascending=False)
print(f"Total readings with kwh > 2.0: {len(spikes)}")
print(spikes[['reading_id', 'clean_flat', 'clean_app', 'dt_utc', 'energy_value', 'energy_unit', 'kwh']])

print("\nDistribution of kwh across all rows:")
print(readings['kwh'].describe(percentiles=[0.5, 0.9, 0.95, 0.99, 0.995, 0.999]))

print("\nLet's check values between 1.0 and 50.0:")
print(readings[(readings['kwh'] >= 1.0) & (readings['kwh'] <= 50.0)][['clean_app', 'kwh', 'energy_value', 'energy_unit']].sort_values('kwh', ascending=False).head(30))


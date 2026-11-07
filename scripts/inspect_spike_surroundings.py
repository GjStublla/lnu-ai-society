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

spikes = readings[readings['kwh'] > 2.0].sort_values('kwh', ascending=False)
print("=== SURROUNDING READINGS FOR SPIKES ===")
for idx, r in spikes.head(10).iterrows():
    app = r['clean_app']
    t = r['dt_utc']
    surr = readings[(readings['clean_app'] == app) & (readings['dt_utc'] >= t - pd.Timedelta(hours=2)) & (readings['dt_utc'] <= t + pd.Timedelta(hours=2))].sort_values('dt_utc')
    print(f"\n--- Spike reading {r['reading_id']} on {app} at {t}: val={r['energy_value']} {r['energy_unit']} ---")
    print(surr[['reading_id', 'dt_utc', 'energy_value', 'energy_unit', 'kwh']])


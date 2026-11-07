import os
import pandas as pd
import numpy as np

DATA_DIR = r"c:\Users\gjins\Desktop\lnu-ai-society\data_raw\energy_hackathon_participants"

flats = pd.read_csv(os.path.join(DATA_DIR, "flats.csv"))
prices = pd.read_csv(os.path.join(DATA_DIR, "hourly_prices.csv"))
context = pd.read_csv(os.path.join(DATA_DIR, "hourly_context.csv"))
readings = pd.read_csv(os.path.join(DATA_DIR, "energy_readings.csv"))

print("=== PARSING TIMESTAMPS ===")
readings['dt_utc'] = pd.to_datetime(readings['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)
prices['dt_utc'] = pd.to_datetime(prices['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)
context['dt_utc'] = pd.to_datetime(context['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)

print("Readings min dt:", readings['dt_utc'].min(), "max dt:", readings['dt_utc'].max())
print("Prices min dt:", prices['dt_utc'].min(), "max dt:", prices['dt_utc'].max())
print("Context min dt:", context['dt_utc'].min(), "max dt:", context['dt_utc'].max())

print("\n=== INVESTIGATING APPLIANCE & FLAT MISMATCHES & F999 ===")
readings['clean_app'] = readings['appliance_id'].str.strip().str.upper()
readings['clean_flat'] = readings['flat_id'].str.strip().str.upper()
readings['app_prefix'] = readings['clean_app'].apply(lambda x: x.split('-')[0] if '-' in x else 'UNKNOWN')

mismatches = readings[readings['clean_flat'] != readings['app_prefix']]
print(f"Total prefix mismatches: {len(mismatches)}")
print(mismatches[['reading_id', 'flat_id', 'appliance_id', 'clean_flat', 'clean_app', 'app_prefix', 'dt_utc', 'energy_value', 'energy_unit']])

print("\n=== INVESTIGATING DUPLICATES ===")
dup_reading_id = readings[readings['reading_id'].duplicated(keep=False)].sort_values('reading_id')
print(f"Rows with duplicated reading_id: {len(dup_reading_id)}")
print("Are duplicated reading_ids exact duplicate rows?")
exact_dup_count = readings.duplicated().sum()
print(f"Exact full duplicate rows: {exact_dup_count}")

# Check duplicates by (clean_flat, clean_app, dt_utc)
dup_triplet = readings[readings.duplicated(subset=['clean_flat', 'clean_app', 'dt_utc'], keep=False)].sort_values(['clean_flat', 'clean_app', 'dt_utc'])
print(f"Rows with duplicated (clean_flat, clean_app, dt_utc): {len(dup_triplet)}")
print("Sample dup triplet:")
print(dup_triplet[['reading_id', 'clean_flat', 'clean_app', 'dt_utc', 'energy_value', 'energy_unit']].head(10))

print("\n=== INVESTIGATING NEGATIVE VALUES ===")
# Normalize energy_value with comma replacement
val_num = pd.to_numeric(readings['energy_value'].astype(str).str.replace(',', '.'), errors='coerce')
readings['val_num'] = val_num
negs = readings[readings['val_num'] < 0]
print(f"Total negative readings: {len(negs)}")
print(negs.groupby('clean_flat')['val_num'].agg(['count', 'min', 'mean', 'max']))
print(negs.groupby('clean_app')['val_num'].agg(['count', 'min', 'mean', 'max']))
print("Negative values sample:")
print(negs[['reading_id', 'clean_flat', 'clean_app', 'dt_utc', 'energy_value', 'energy_unit']].head(15))

print("\n=== INVESTIGATING ENERGY UNITS ===")
print(readings['energy_unit'].value_counts())
clean_unit = readings['energy_unit'].str.strip().str.upper()
print(clean_unit.value_counts())
# Check max values per unit
readings['clean_unit'] = clean_unit
print("Stats for clean_unit == KWH:")
print(readings[readings['clean_unit'] == 'KWH']['val_num'].describe())
print("Stats for clean_unit == WH:")
print(readings[readings['clean_unit'] == 'WH']['val_num'].describe())

# After converting Wh to kWh (/1000):
readings['kwh_converted'] = np.where(readings['clean_unit'] == 'WH', readings['val_num'] / 1000.0, readings['val_num'])
print("Stats for kwh_converted (all non-null):")
print(readings['kwh_converted'].describe())

print("\n=== INVESTIGATING CONTEXT NULLS & OUTLIERS ===")
print("Context nulls:")
print(context.isnull().sum())
print("Context -99 count in outdoor_temp_c:", (context['outdoor_temp_c'] == -99).sum())
bad_outdoor = context[context['outdoor_temp_c'] == -99]
print("Bad outdoor temp timestamps/flats:")
print(bad_outdoor[['flat_id', 'dt_utc', 'outdoor_temp_c']].head(10))
print("Unique timestamps with bad outdoor temp:", bad_outdoor['dt_utc'].unique())

print("\nOccupants home analysis:")
ctx_flat = context.merge(flats, on='flat_id')
print("Occupants > residents count:", (ctx_flat['occupants_home'] > ctx_flat['residents']).sum())
if (ctx_flat['occupants_home'] > ctx_flat['residents']).sum() > 0:
    print(ctx_flat[ctx_flat['occupants_home'] > ctx_flat['residents']][['flat_id', 'residents', 'dt_utc', 'occupants_home']].head(20))

print("\n=== INVESTIGATING NULL PRICES ===")
null_p = prices[prices['spot_sek_per_kwh'].isnull()]
print(f"Null prices count: {len(null_p)}")
print(null_p[['dt_utc', 'spot_sek_per_kwh', 'carbon_gco2e_per_kwh']])


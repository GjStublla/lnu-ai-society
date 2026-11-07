import os
import pandas as pd
import numpy as np

DATA_DIR = r"c:\Users\gjins\Desktop\lnu-ai-society\data_raw\energy_hackathon_participants"

print("=== 1. FLATS.CSV ===")
flats = pd.read_csv(os.path.join(DATA_DIR, "flats.csv"))
print(flats.info())
print(flats)

print("\n=== 2. HOURLY_PRICES.CSV ===")
prices = pd.read_csv(os.path.join(DATA_DIR, "hourly_prices.csv"))
print(prices.info())
print("Prices shape:", prices.shape)
print("Unique timestamps:", prices['timestamp_utc'].nunique())
print("Price areas:", prices['price_area'].unique())
print("Price stats:\n", prices[['spot_sek_per_kwh', 'carbon_gco2e_per_kwh']].describe())
print("Negative prices count:", (prices['spot_sek_per_kwh'] < 0).sum())

print("\n=== 3. HOURLY_CONTEXT.CSV ===")
context = pd.read_csv(os.path.join(DATA_DIR, "hourly_context.csv"))
print(context.info())
print("Context shape:", context.shape)
print("Unique flats in context:", context['flat_id'].unique())
print("Context null counts:\n", context.isnull().sum())
print("Context stats:\n", context[['outdoor_temp_c', 'indoor_temp_c', 'occupants_home']].describe())

print("\n=== 4. ENERGY_READINGS.CSV ===")
readings = pd.read_csv(os.path.join(DATA_DIR, "energy_readings.csv"))
print(readings.info())
print("Readings shape:", readings.shape)
print("Unique reading_id count:", readings['reading_id'].nunique())
print("Duplicate reading_ids:", readings['reading_id'].duplicated().sum())
print("Unique flat_ids in readings:", readings['flat_id'].unique())
print("Unique appliance_ids:", readings['appliance_id'].unique())
print("Unique energy_units:", readings['energy_unit'].value_counts(dropna=False))
print("Energy value null count:", readings['energy_value'].isnull().sum())
print("Energy value stats:\n", readings['energy_value'].describe())
print("Negative energy values:", (readings['energy_value'] < 0).sum())
if (readings['energy_value'] < 0).sum() > 0:
    print(readings[readings['energy_value'] < 0].head(10))

# Timestamp analysis
print("\nTimestamp sample in energy_readings:")
print(readings['timestamp_utc'].head(10))


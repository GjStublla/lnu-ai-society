import os
import pandas as pd
import numpy as np

DATA_DIR = r"c:\Users\gjins\Desktop\lnu-ai-society\data_raw\energy_hackathon_participants"

flats = pd.read_csv(os.path.join(DATA_DIR, "flats.csv"))
prices = pd.read_csv(os.path.join(DATA_DIR, "hourly_prices.csv"))
context = pd.read_csv(os.path.join(DATA_DIR, "hourly_context.csv"))
readings = pd.read_csv(os.path.join(DATA_DIR, "energy_readings.csv"))

print("=================== DEEP AUDIT ===================")

# 1. energy_value non-numeric values
print("\n--- 1. Non-numeric energy_value ---")
non_numeric = pd.to_numeric(readings['energy_value'], errors='coerce')
is_null_orig = readings['energy_value'].isnull()
is_coerced_null = non_numeric.isnull()
string_issues = readings[~is_null_orig & is_coerced_null]
print(f"Total rows in readings: {len(readings)}")
print(f"Original nulls in energy_value: {is_null_orig.sum()}")
print(f"Non-null string values that couldn't convert to numeric: {len(string_issues)}")
print("Sample of non-numeric string values:")
print(string_issues['energy_value'].value_counts())

# 2. Check numeric range of energy_value
readings['num_energy'] = non_numeric
print("\n--- 2. Energy value numeric stats ---")
print(readings['num_energy'].describe(percentiles=[0.01, 0.05, 0.5, 0.95, 0.99, 0.999]))
negatives = readings[readings['num_energy'] < 0]
print(f"Negative values count: {len(negatives)}")
if len(negatives) > 0:
    print(negatives[['reading_id', 'flat_id', 'appliance_id', 'timestamp_utc', 'num_energy', 'energy_unit']])

huge_values = readings[readings['num_energy'] > 50]
print(f"\nValues > 50: {len(huge_values)}")
print(huge_values[['reading_id', 'flat_id', 'appliance_id', 'timestamp_utc', 'num_energy', 'energy_unit']].head(20))

# 3. Units analysis
print("\n--- 3. Energy units ---")
print(readings['energy_unit'].value_counts(dropna=False))
# Look at values when unit is Wh
wh_rows = readings[readings['energy_unit'].str.strip() == 'Wh']
print(f"Wh rows count: {len(wh_rows)}")
print(wh_rows[['reading_id', 'flat_id', 'appliance_id', 'num_energy', 'energy_unit']].head(10))

# 4. Appliance IDs and Flat IDs
print("\n--- 4. Appliance IDs and Flat IDs ---")
print("Dirty appliance_ids:", readings['appliance_id'].unique())
# Cleaned appliance_ids:
cleaned_app = readings['appliance_id'].str.strip().str.upper()
print("Cleaned unique appliance_ids count:", cleaned_app.nunique())
print("Cleaned unique appliance_ids:", sorted(cleaned_app.unique()))
f999 = readings[cleaned_app.str.startswith('F999')]
print(f"F999 rows count: {len(f999)}")
print(f999)

# Check flat_id consistency
print("Dirty flat_ids:", readings['flat_id'].unique())
cleaned_flat = readings['flat_id'].str.strip().str.upper()
print("Cleaned unique flat_ids:", sorted(cleaned_flat.unique()))
# Check mismatch between flat_id and appliance_id prefix
app_prefix = cleaned_app.apply(lambda x: x.split('-')[0] if '-' in x else 'UNKNOWN')
mismatches = readings[cleaned_flat != app_prefix]
print(f"Mismatches between flat_id and appliance_id prefix: {len(mismatches)}")
if len(mismatches) > 0:
    print(mismatches[['reading_id', 'flat_id', 'appliance_id', 'timestamp_utc']].head(10))

# 5. Duplicates
print("\n--- 5. Duplicates ---")
print("Duplicate reading_id count:", readings['reading_id'].duplicated().sum())
# Duplicates on (flat_id, appliance_id, timestamp_utc)
dup_keys = readings.duplicated(subset=['flat_id', 'appliance_id', 'timestamp_utc'], keep=False)
print("Duplicates on raw (flat, app, time):", dup_keys.sum())

# Let's standardize time first
def parse_utc(ts_series):
    # handle both ISO (2026-10-01T00:00:00Z or 2026-10-01 00:00:00) and legacy 2026/10/01 00:00
    return pd.to_datetime(ts_series.str.replace('/', '-'), utc=True)

readings['dt_utc'] = parse_utc(readings['timestamp_utc'])
readings['clean_app'] = cleaned_app
readings['clean_flat'] = cleaned_flat

dup_clean_keys = readings.duplicated(subset=['clean_flat', 'clean_app', 'dt_utc'], keep=False)
print("Duplicates on clean (flat, app, dt_utc):", dup_clean_keys.sum())
if dup_clean_keys.sum() > 0:
    dup_samples = readings[dup_clean_keys].sort_values(['clean_flat', 'clean_app', 'dt_utc'])
    print("Sample duplicates:")
    print(dup_samples[['reading_id', 'clean_flat', 'clean_app', 'dt_utc', 'energy_value', 'energy_unit']].head(20))

# 6. Context anomalies
print("\n--- 6. Context anomalies ---")
print("outdoor_temp_c == -99 count:", (context['outdoor_temp_c'] == -99).sum())
print("outdoor_temp_c other negatives:", context[(context['outdoor_temp_c'] < -10) & (context['outdoor_temp_c'] != -99)])
print("outdoor_temp_c stats excluding -99:\n", context[context['outdoor_temp_c'] != -99]['outdoor_temp_c'].describe())

print("Occupants nulls:", context['occupants_home'].isnull().sum())
# Join context with flats to compare occupants_home with flats.residents
m_ctx = context.merge(flats[['flat_id', 'residents']], on='flat_id')
print("Occupants > residents count:", (m_ctx['occupants_home'] > m_ctx['residents']).sum())
if (m_ctx['occupants_home'] > m_ctx['residents']).sum() > 0:
    print(m_ctx[m_ctx['occupants_home'] > m_ctx['residents']][['flat_id', 'timestamp_utc', 'occupants_home', 'residents']].head(10))

# 7. Prices anomalies
print("\n--- 7. Prices anomalies ---")
print("Null prices count:", prices['spot_sek_per_kwh'].isnull().sum())
null_prices = prices[prices['spot_sek_per_kwh'].isnull()]
print("Timestamps with null prices:", null_prices['timestamp_utc'].tolist())


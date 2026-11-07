import os
import pandas as pd
import numpy as np

DATA_DIR = r"c:\Users\gjins\Desktop\lnu-ai-society\data_raw\energy_hackathon_participants"

flats = pd.read_csv(os.path.join(DATA_DIR, "flats.csv"))
prices = pd.read_csv(os.path.join(DATA_DIR, "hourly_prices.csv"))
context = pd.read_csv(os.path.join(DATA_DIR, "hourly_context.csv"))
readings = pd.read_csv(os.path.join(DATA_DIR, "energy_readings.csv"))

readings['dt_utc'] = pd.to_datetime(readings['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)
prices['dt_utc'] = pd.to_datetime(prices['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)
context['dt_utc'] = pd.to_datetime(context['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)

readings['clean_app'] = readings['appliance_id'].str.strip().str.upper()
readings['clean_flat'] = readings['flat_id'].str.strip().str.upper()
readings['clean_unit'] = readings['energy_unit'].str.strip().str.upper()
readings['val_num'] = pd.to_numeric(readings['energy_value'].astype(str).str.replace(',', '.'), errors='coerce')

# Check the 36 prefix mismatches
mismatches = readings[readings['clean_flat'] != readings['clean_app'].apply(lambda x: x.split('-')[0])]
print("=== MISMATCHES INVESTIGATION ===")
print("Mismatch counts by flat_id and appliance_id prefix:")
print(pd.crosstab(mismatches['clean_flat'], mismatches['clean_app']))

# For each mismatch row, does the target flat already have a reading for that appliance and timestamp?
# E.g. for reading 338: flat F008, app F003-A03 at 2026-10-26 17:00:00.
# Does F003 have a reading for F003-A03 at that time?
print("\nChecking if mismatch rows fill missing slots in their respective appliance's flat or if they collide:")
for idx, row in mismatches.head(10).iterrows():
    app = row['clean_app']
    target_flat = app.split('-')[0]
    t = row['dt_utc']
    existing = readings[(readings['clean_flat'] == target_flat) & (readings['clean_app'] == app) & (readings['dt_utc'] == t)]
    print(f"Row {row['reading_id']}: reported flat={row['clean_flat']}, app={app}, time={t} | Target {target_flat} has {len(existing)} records for {app} at {t}")

print("\nWhat about F999-A01 rows?")
f999 = readings[readings['clean_app'] == 'F999-A01']
print(f999[['reading_id', 'clean_flat', 'clean_app', 'dt_utc', 'val_num', 'clean_unit']])

# Check the exact duplicates
dup_reading_ids = readings[readings['reading_id'].duplicated(keep=False)].sort_values('reading_id')
print(f"\nTotal rows with duplicate reading_ids: {len(dup_reading_ids)}")
# Are all fields identical in duplicate reading_ids?
dup_diffs = []
for rid, group in dup_reading_ids.groupby('reading_id'):
    if len(group) == 2:
        r1, r2 = group.iloc[0], group.iloc[1]
        diffs = {}
        for col in ['flat_id', 'appliance_id', 'timestamp_utc', 'energy_value', 'energy_unit']:
            if str(r1[col]) != str(r2[col]):
                diffs[col] = (r1[col], r2[col])
        if diffs:
            dup_diffs.append((rid, diffs))
print(f"Number of duplicate reading_id pairs with differing values: {len(dup_diffs)}")
if len(dup_diffs) > 0:
    print("Differing duplicate sample:", dup_diffs[:5])

# Check duplicate triplets (flat, app, dt_utc)
dup_triplets = readings[readings.duplicated(subset=['clean_flat', 'clean_app', 'dt_utc'], keep=False)]
print(f"Number of rows with duplicate (clean_flat, clean_app, dt_utc): {len(dup_triplets)}")

# What about the outdoor temperature: is outdoor_temp_c identical across all flats at the same timestamp when not -99?
print("\n=== OUTDOOR TEMPERATURE CONSISTENCY ===")
valid_outdoor = context[context['outdoor_temp_c'] != -99]
outdoor_spread = valid_outdoor.groupby('dt_utc')['outdoor_temp_c'].agg(['nunique', 'min', 'max'])
print("Are there timestamps where non -99 outdoor temps differ across flats?")
print(outdoor_spread[outdoor_spread['nunique'] > 1])

# Can we impute the -99 outdoor temps from other flats at the same hour?
bad_outdoor = context[context['outdoor_temp_c'] == -99]
imputable = bad_outdoor['dt_utc'].isin(valid_outdoor['dt_utc'])
print(f"Are all {len(bad_outdoor)} bad outdoor temp hours present in valid_outdoor of other flats? {imputable.all()}")


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
readings['app_flat'] = readings['clean_app'].apply(lambda x: x.split('-')[0])

print("=== 1. DIFFERING DUPLICATE READING_IDS ===")
dup_rids = readings[readings['reading_id'].duplicated(keep=False)].sort_values('reading_id')
for rid, grp in dup_rids.groupby('reading_id'):
    if grp['energy_value'].nunique() > 1 or grp['clean_unit'].nunique() > 1:
        print(f"\nReading {rid}:")
        print(grp[['reading_id', 'flat_id', 'appliance_id', 'dt_utc', 'energy_value', 'energy_unit']])

print("\n=== 2. GRID COMPLETENESS ANALYSIS ===")
# Expected grid: 8 flats * 7 appliances = 56 appliances, each 672 hours = 37,632 slots
flats_list = [f"F00{i}" for i in range(1, 9)]
apps_list = [f"{f}-A0{j}" for f in flats_list for j in range(1, 8)]
times_list = pd.date_range("2026-10-01 00:00:00", "2026-10-28 23:00:00", freq="1h", tz="UTC")

grid = pd.MultiIndex.from_product([apps_list, times_list], names=['clean_app', 'dt_utc']).to_frame().reset_index(drop=True)
grid['app_flat'] = grid['clean_app'].apply(lambda x: x.split('-')[0])

print(f"Total expected slots: {len(grid)}")

# Check against readings
# Case A: If we map flat by clean_flat vs Case B: If we map flat by app_flat (appliance prefix)
print("\nCheck 24 cross-flat mismatch rows:")
mismatches_known = readings[(readings['clean_flat'] != readings['app_flat']) & (readings['app_flat'] != 'F999')]
print(f"Count of cross-flat mismatch rows: {len(mismatches_known)}")
print(mismatches_known[['reading_id', 'clean_flat', 'clean_app', 'app_flat', 'dt_utc', 'energy_value']])

# If we reassign clean_flat = app_flat for these 24 rows:
readings_reassigned = readings.copy()
readings_reassigned.loc[mismatches_known.index, 'clean_flat'] = readings_reassigned.loc[mismatches_known.index, 'app_flat']

# Now let's see which slots in the expected grid have 0, 1, or >1 readings!
slot_counts = readings_reassigned.groupby(['clean_app', 'dt_utc']).size()
print(f"\nSlots with 0 readings: {(len(grid) - len(slot_counts))}")
print(f"Slots with exactly 1 reading: {(slot_counts == 1).sum()}")
print(f"Slots with 2 readings: {(slot_counts == 2).sum()}")
print(f"Slots with >2 readings: {(slot_counts > 2).sum()}")

# What are the missing slots?
grid_set = set(zip(grid['clean_app'], grid['dt_utc']))
read_set = set(zip(readings_reassigned['clean_app'], readings_reassigned['dt_utc']))
missing_slots = grid_set - read_set
print(f"Missing slot count: {len(missing_slots)}")
print("Sample missing slots:")
for s in list(missing_slots)[:15]:
    print(s)

print("\nWhat about F999 rows? Where do their timestamps land?")
f999_rows = readings[readings['clean_app'] == 'F999-A01']
for idx, r in f999_rows.iterrows():
    # Are these timestamps among the missing slots of the reported flat?
    rep_flat = r['clean_flat']
    # check which appliance of rep_flat is missing at r['dt_utc']
    missing_for_flat = [s for s in missing_slots if s[0].startswith(rep_flat) and s[1] == r['dt_utc']]
    print(f"F999 row {r['reading_id']} in {rep_flat} at {r['dt_utc']}: missing apps in {rep_flat} at this time: {missing_for_flat}")


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

# Convert Wh to kWh
readings['kwh'] = np.where(readings['clean_unit'] == 'WH', readings['val_num'] / 1000.0, readings['val_num'])

print("=== INSPECTING THE 25 DIFFERING DUPLICATE PAIRS ===")
dup_rids = readings[readings['reading_id'].duplicated(keep=False)].sort_values('reading_id')
diff_rids = []
for rid, grp in dup_rids.groupby('reading_id'):
    if grp['kwh'].nunique() > 1:
        diff_rids.append(rid)

print(f"Number of duplicate reading_ids with differing kwh: {len(diff_rids)}")
for rid in diff_rids[:10]:
    grp = dup_rids[dup_rids['reading_id'] == rid]
    r1, r2 = grp.iloc[0], grp.iloc[1]
    app = r1['clean_app']
    t = r1['dt_utc']
    # Look at surrounding readings for this appliance around t
    surrounding = readings[(readings['clean_app'] == app) & (readings['dt_utc'] >= t - pd.Timedelta(hours=2)) & (readings['dt_utc'] <= t + pd.Timedelta(hours=2))].sort_values('dt_utc')
    print(f"\nRID: {rid}, App: {app}, Time: {t}")
    print("Duplicates:")
    print(grp[['reading_id', 'energy_value', 'energy_unit', 'kwh']])
    print("Surrounding readings for this app:")
    print(surrounding[['reading_id', 'dt_utc', 'energy_value', 'energy_unit', 'kwh']])

print("\n=== INSPECTING THE REMAINING 42 MISSING SLOTS ===")
flats_list = [f"F00{i}" for i in range(1, 9)]
apps_list = [f"{f}-A0{j}" for f in flats_list for j in range(1, 8)]
times_list = pd.date_range("2026-10-01 00:00:00", "2026-10-28 23:00:00", freq="1h", tz="UTC")
grid = pd.MultiIndex.from_product([apps_list, times_list], names=['clean_app', 'dt_utc']).to_frame().reset_index(drop=True)

# Map 24 cross-flat mismatch rows to app_flat
readings_fixed = readings.copy()
mismatches_known = readings_fixed[(readings_fixed['clean_flat'] != readings_fixed['clean_app'].apply(lambda x: x.split('-')[0])) & (readings_fixed['clean_app'] != 'F999-A01')]
readings_fixed.loc[mismatches_known.index, 'clean_flat'] = readings_fixed.loc[mismatches_known.index, 'clean_app'].apply(lambda x: x.split('-')[0])

# Map 12 F999 rows:
# Earlier we found each F999 row matched the exact missing app for that flat at that hour
# Let's verify and fix them
f999_map = {
    'R0032484': 'F001-A04',
    'R0030219': 'F005-A07',
    'R0009798': 'F008-A05',
    'R0023991': 'F004-A02',
    'R0031733': 'F006-A02',
    'R0027692': 'F004-A07',
    'R0019485': 'F008-A04',
    'R0027113': 'F002-A02',
    'R0028571': 'F002-A04',
    'R0000486': 'F006-A03',
    'R0006795': 'F003-A05',
    'R0028012': 'F002-A05'
}
for rid, target_app in f999_map.items():
    readings_fixed.loc[readings_fixed['reading_id'] == rid, 'clean_app'] = target_app
    readings_fixed.loc[readings_fixed['reading_id'] == rid, 'clean_flat'] = target_app.split('-')[0]

# Now find missing slots
grid_set = set(zip(grid['clean_app'], grid['dt_utc']))
read_set = set(zip(readings_fixed['clean_app'], readings_fixed['dt_utc']))
missing_after_f999 = grid_set - read_set
print(f"Missing slots after assigning cross-flats and F999: {len(missing_after_f999)}")
df_missing = pd.DataFrame(list(missing_after_f999), columns=['clean_app', 'dt_utc']).sort_values(['clean_app', 'dt_utc'])
print(df_missing)
print("\nMissing by flat:")
print(df_missing['clean_app'].apply(lambda x: x.split('-')[0]).value_counts())
print("\nMissing by timestamp:")
print(df_missing['dt_utc'].value_counts())


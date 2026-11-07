import os
import pandas as pd
import numpy as np

DATA_DIR = r"c:\Users\gjins\Desktop\lnu-ai-society\data_raw\energy_hackathon_participants"

# Load data
flats = pd.read_csv(os.path.join(DATA_DIR, "flats.csv"))
prices = pd.read_csv(os.path.join(DATA_DIR, "hourly_prices.csv"))
context = pd.read_csv(os.path.join(DATA_DIR, "hourly_context.csv"))
readings = pd.read_csv(os.path.join(DATA_DIR, "energy_readings.csv"))

# Standardize timestamps
readings['dt_utc'] = pd.to_datetime(readings['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)
prices['dt_utc'] = pd.to_datetime(prices['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)
context['dt_utc'] = pd.to_datetime(context['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)

# Clean context: impute outdoor_temp_c == -99 from other flats at same hour
clean_context = context.copy()
outdoor_map = clean_context[clean_context['outdoor_temp_c'] != -99].groupby('dt_utc')['outdoor_temp_c'].mean()
clean_context['outdoor_temp_c'] = clean_context.apply(
    lambda r: outdoor_map[r['dt_utc']] if r['outdoor_temp_c'] == -99 else r['outdoor_temp_c'], axis=1
)

# Impute prices: 8 null spot prices
# Let's inspect where the null spot prices are and how to impute (linear interpolation or forward fill)
clean_prices = prices.copy().sort_values('dt_utc')
clean_prices['spot_sek_per_kwh_interp'] = clean_prices['spot_sek_per_kwh'].interpolate(method='linear')

# Clean readings:
clean_readings = readings.copy()
clean_readings['clean_app'] = clean_readings['appliance_id'].str.strip().str.upper()
clean_readings['clean_flat'] = clean_readings['flat_id'].str.strip().str.upper()
clean_readings['clean_unit'] = clean_readings['energy_unit'].str.strip().str.upper()
clean_readings['val_num'] = pd.to_numeric(clean_readings['energy_value'].astype(str).str.replace(',', '.'), errors='coerce')

# Map 24 cross-flat mismatches where app prefix is valid flat
is_mismatch = (clean_readings['clean_flat'] != clean_readings['clean_app'].apply(lambda x: x.split('-')[0])) & (clean_readings['clean_app'] != 'F999-A01')
clean_readings.loc[is_mismatch, 'clean_flat'] = clean_readings.loc[is_mismatch, 'clean_app'].apply(lambda x: x.split('-')[0])

# Map 12 F999 rows
f999_map = {
    'R0032484': 'F001-A04', 'R0030219': 'F005-A07', 'R0009798': 'F008-A05',
    'R0023991': 'F004-A02', 'R0031733': 'F006-A02', 'R0027692': 'F004-A07',
    'R0019485': 'F008-A04', 'R0027113': 'F002-A02', 'R0028571': 'F002-A04',
    'R0000486': 'F006-A03', 'R0006795': 'F003-A05', 'R0028012': 'F002-A05'
}
for rid, target_app in f999_map.items():
    clean_readings.loc[clean_readings['reading_id'] == rid, 'clean_app'] = target_app
    clean_readings.loc[clean_readings['reading_id'] == rid, 'clean_flat'] = target_app.split('-')[0]

# Units fix
# If clean_unit == 'WH', /1000
clean_readings['kwh'] = np.where(clean_readings['clean_unit'] == 'WH', clean_readings['val_num'] / 1000.0, clean_readings['val_num'])
# Spike fix: values > 2.0 kWh are unit-mislabeled Wh!
clean_readings['kwh'] = np.where(clean_readings['kwh'] > 2.0, clean_readings['kwh'] / 1000.0, clean_readings['kwh'])

# Negatives fix: check if abs or 0 or interpolate
# Let's inspect the 36 negatives again:
# If negative, let's see if 0.0 makes the most sense (sensor offset drift)
clean_readings['kwh'] = np.where(clean_readings['kwh'] < 0, 0.0, clean_readings['kwh'])

# Deduplicate:
# For duplicates on (clean_flat, clean_app, dt_utc), keep first or take mean?
# Earlier we saw the 25 differing duplicates were offset by +0.13 in one of the copies!
# The lower copy matched the true baseline (0.0 or 0.004 or 0.053)!
# So min() or the uncorrupted copy is the true reading!
clean_readings = clean_readings.sort_values(['clean_flat', 'clean_app', 'dt_utc', 'kwh'])
clean_readings = clean_readings.drop_duplicates(subset=['clean_flat', 'clean_app', 'dt_utc'], keep='first')

print(f"Clean readings total rows: {len(clean_readings)}")

# Join everything together
df = clean_readings.merge(clean_context, left_on=['clean_flat', 'dt_utc'], right_on=['flat_id', 'dt_utc'], how='left')
df = df.merge(clean_prices[['dt_utc', 'spot_sek_per_kwh_interp', 'carbon_gco2e_per_kwh']], on='dt_utc', how='left')
df = df.merge(flats[['flat_id', 'residents', 'floor_area_m2']], left_on='clean_flat', right_on='flat_id', how='left')

df['cost_sek'] = df['kwh'] * df['spot_sek_per_kwh_interp']
df['carbon_kg'] = df['kwh'] * df['carbon_gco2e_per_kwh'] / 1000.0

print("\n=== TOTALS BY APARTMENT (4-WEEK PERIOD) ===")
flat_totals = df.groupby('clean_flat').agg(
    total_kwh=('kwh', 'sum'),
    total_cost_sek=('cost_sek', 'sum'),
    total_carbon_kg=('carbon_kg', 'sum'),
    residents=('residents', 'first'),
    floor_area=('floor_area_m2', 'first')
)
flat_totals['kwh_per_resident'] = flat_totals['total_kwh'] / flat_totals['residents']
flat_totals['cost_per_resident'] = flat_totals['total_cost_sek'] / flat_totals['residents']
flat_totals['daily_kwh_per_resident'] = flat_totals['kwh_per_resident'] / 28.0
flat_totals['kwh_per_m2'] = flat_totals['total_kwh'] / flat_totals['floor_area']
print(flat_totals.round(2))

print("\n=== TOTALS BY APPLIANCE CHANNEL ===")
app_totals = df.groupby('clean_app').agg(
    flat=('clean_flat', 'first'),
    channel=('clean_app', lambda x: x.iloc[0].split('-')[1]),
    total_kwh=('kwh', 'sum'),
    total_cost_sek=('cost_sek', 'sum'),
    total_carbon_kg=('carbon_kg', 'sum'),
    active_hours=('kwh', lambda x: (x > 0).sum())
).sort_values('total_kwh', ascending=False)
print("Top 15 most consuming appliances:")
print(app_totals.head(15).round(2))

print("\nChannel summary across all flats:")
ch_summary = df.groupby('clean_app'.split('-')[-1]).agg(
    total_kwh=('kwh', 'sum'),
    total_cost_sek=('cost_sek', 'sum'),
    total_carbon_kg=('carbon_kg', 'sum')
)
# Let's extract channel
df['channel'] = df['clean_app'].apply(lambda x: x.split('-')[1])
ch_summary = df.groupby('channel').agg(
    total_kwh=('kwh', 'sum'),
    total_cost_sek=('cost_sek', 'sum'),
    total_carbon_kg=('carbon_kg', 'sum')
)
ch_summary['pct_total_kwh'] = ch_summary['total_kwh'] / ch_summary['total_kwh'].sum() * 100
print(ch_summary.round(2))

print("\n=== UNOCCUPIED CONSUMPTION (occupants_home == 0) ===")
# Note: occupants_home == 9 was a missing sentinel; let's treat occupants_home == 0
unocc = df[df['occupants_home'] == 0]
print(f"Total unoccupied flat-hours: {len(unocc) // 7}")
unocc_by_app = unocc.groupby(['clean_flat', 'channel'])['kwh'].agg(['sum', 'mean', lambda x: (x > 0).sum()]).round(3)
unocc_by_app.columns = ['unocc_kwh', 'mean_kwh', 'active_hours']
print("Unoccupied consumption by flat and channel:")
print(unocc_by_app.loc[unocc_by_app['unocc_kwh'] > 1.0])

print("\n=== TEMPERATURE VS HEATING (A07) IN F001 AND F007 ===")
for f in ['F001', 'F007']:
    f_sub = df[(df['clean_flat'] == f) & (df['channel'] == 'A07')]
    print(f"\n{f} A07 Heating Stats:")
    print(f"Total heating kWh: {f_sub['kwh'].sum():.1f}")
    print(f"Total heating Cost (SEK): {f_sub['cost_sek'].sum():.1f}")
    print(f"Total heating Carbon (kg): {f_sub['carbon_kg'].sum():.1f}")
    print(f"Heating correlation with outdoor temp: {f_sub['kwh'].corr(f_sub['outdoor_temp_c']):.3f}")
    print(f"Heating correlation with indoor temp: {f_sub['kwh'].corr(f_sub['indoor_temp_c']):.3f}")
    print(f"Heating when occupants == 0: {f_sub[f_sub['occupants_home'] == 0]['kwh'].sum():.1f} kWh")
    print(f"Indoor temp stats for {f}: min={f_sub['indoor_temp_c'].min():.1f}, mean={f_sub['indoor_temp_c'].mean():.1f}, max={f_sub['indoor_temp_c'].max():.1f}")

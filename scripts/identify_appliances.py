import os
import pandas as pd
import numpy as np

DATA_DIR = r"c:\Users\gjins\Desktop\lnu-ai-society\data_raw\energy_hackathon_participants"

readings = pd.read_csv(os.path.join(DATA_DIR, "energy_readings.csv"))
context = pd.read_csv(os.path.join(DATA_DIR, "hourly_context.csv"))
flats = pd.read_csv(os.path.join(DATA_DIR, "flats.csv"))
prices = pd.read_csv(os.path.join(DATA_DIR, "hourly_prices.csv"))

readings['dt_utc'] = pd.to_datetime(readings['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)
context['dt_utc'] = pd.to_datetime(context['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)
prices['dt_utc'] = pd.to_datetime(prices['timestamp_utc'].str.replace('/', '-'), format='mixed', utc=True)

readings['clean_app'] = readings['appliance_id'].str.strip().str.upper()
readings['clean_flat'] = readings['flat_id'].str.strip().str.upper()
readings['clean_unit'] = readings['energy_unit'].str.strip().str.upper()
readings['val_num'] = pd.to_numeric(readings['energy_value'].astype(str).str.replace(',', '.'), errors='coerce')

# Fix unit conversion: Wh -> /1000. Also values > 2.0 kWh are unit-mislabeled Wh!
readings['kwh'] = np.where(readings['clean_unit'] == 'WH', readings['val_num'] / 1000.0, readings['val_num'])
# Note the unit-mislabeled rows:
readings['kwh_fixed'] = np.where(readings['kwh'] > 2.0, readings['kwh'] / 1000.0, readings['kwh'])

# Merge with context
readings['channel'] = readings['clean_app'].apply(lambda x: x.split('-')[1] if '-' in x else 'UNK')
df = readings.merge(context, on=['flat_id', 'dt_utc'], how='left')

print("=== APPLIANCE CHANNEL PROFILES ACROSS ALL FLATS ===")
for ch in sorted(df['channel'].unique()):
    sub = df[df['channel'] == ch]
    print(f"\n================ Channel {ch} ================")
    print(f"Total readings: {len(sub)}")
    print(f"Mean kWh: {sub['kwh_fixed'].mean():.4f}, Std: {sub['kwh_fixed'].std():.4f}, Max: {sub['kwh_fixed'].max():.4f}")
    print(f"Zero %: {(sub['kwh_fixed'] == 0).mean()*100:.1f}%, Active %: {(sub['kwh_fixed'] > 0).mean()*100:.1f}%")
    
    # Active values stats (when > 0)
    act = sub[sub['kwh_fixed'] > 0]['kwh_fixed']
    if len(act) > 0:
        print(f"When active: Mean={act.mean():.4f}, Median={act.median():.4f}, P90={act.quantile(0.9):.4f}, Max={act.max():.4f}")
    
    # Hourly pattern (UTC)
    hourly = sub.groupby(sub['dt_utc'].dt.hour)['kwh_fixed'].mean()
    peak_hr = hourly.idxmax()
    min_hr = hourly.idxmin()
    print(f"Peak hour: {peak_hr}:00 ({hourly.max():.4f} kWh), Min hour: {min_hr}:00 ({hourly.min():.4f} kWh)")
    
    # Correlation with outdoor temp, indoor temp, occupants_home
    valid = sub[(sub['outdoor_temp_c'] != -99) & sub['kwh_fixed'].notnull()]
    corr_outdoor = valid['kwh_fixed'].corr(valid['outdoor_temp_c'])
    corr_indoor = valid['kwh_fixed'].corr(valid['indoor_temp_c'])
    corr_occ = valid['kwh_fixed'].corr(valid['occupants_home'])
    print(f"Correlations: outdoor_temp={corr_outdoor:.3f}, indoor_temp={corr_indoor:.3f}, occupants={corr_occ:.3f}")

print("\n=== PER-FLAT BREAKDOWN OF APPLIANCES ===")
# Let's inspect each flat's 7 channels
for f in sorted(df['clean_flat'].unique()):
    if f.startswith('F999'): continue
    print(f"\n--- Flat {f} ---")
    flat_sub = df[df['clean_flat'] == f]
    p_ch = flat_sub.groupby('channel')['kwh_fixed'].agg(['mean', 'max', lambda x: (x == 0).mean()*100, lambda x: (x > 0).mean()*100])
    p_ch.columns = ['mean_kwh', 'max_kwh', 'pct_zero', 'pct_active']
    print(p_ch)


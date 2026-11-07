import os
import json
import pandas as pd
import numpy as np

CLEAN_DIR = r"c:\Users\gjins\Desktop\lnu-ai-society\data_cleaned"

flats = pd.read_csv(os.path.join(CLEAN_DIR, "clean_flats.csv"))
prices = pd.read_csv(os.path.join(CLEAN_DIR, "clean_hourly_prices.csv"))
context = pd.read_csv(os.path.join(CLEAN_DIR, "clean_hourly_context.csv"))
readings = pd.read_csv(os.path.join(CLEAN_DIR, "clean_energy_readings.csv"))
top10 = pd.read_csv(os.path.join(CLEAN_DIR, "top_10_waste_opportunities.csv"))

prices['dt_utc'] = pd.to_datetime(prices['dt_utc'])
context['dt_utc'] = pd.to_datetime(context['dt_utc'])
readings['dt_utc'] = pd.to_datetime(readings['dt_utc'])

df = readings.merge(context, on=['flat_id', 'dt_utc'], how='left')
df = df.merge(prices[['dt_utc', 'spot_sek_per_kwh', 'carbon_gco2e_per_kwh']], on='dt_utc', how='left')
df = df.merge(flats[['flat_id', 'residents', 'floor_area_m2']], on='flat_id', how='left')
df['channel'] = df['appliance_id'].apply(lambda x: x.split('-')[1])
df['cost_sek'] = df['kwh'] * df['spot_sek_per_kwh']
df['full_cost_sek'] = (df['spot_sek_per_kwh'] + 0.778) * 1.25 * df['kwh']
df['carbon_kg'] = df['kwh'] * df['carbon_gco2e_per_kwh'] / 1000.0

# 1. Flat summaries
flat_summary = df.groupby('flat_id').agg(
    residents=('residents', 'first'),
    floor_area_m2=('floor_area_m2', 'first'),
    total_kwh=('kwh', 'sum'),
    spot_cost_sek=('cost_sek', 'sum'),
    full_cost_sek=('full_cost_sek', 'sum'),
    carbon_kg=('carbon_kg', 'sum')
).reset_index()
flat_summary['kwh_per_res'] = flat_summary['total_kwh'] / flat_summary['residents']
flat_summary['daily_kwh_per_res'] = flat_summary['kwh_per_res'] / 28.0

# 2. Hourly profiles
hourly_profile = df.groupby(df['dt_utc'].dt.hour).agg(
    mean_kwh=('kwh', 'mean'),
    spot_price=('spot_sek_per_kwh', 'mean'),
    carbon_factor=('carbon_gco2e_per_kwh', 'mean')
).reset_index()

# 3. Channel breakdown by flat
channel_pivot = df.pivot_table(index='flat_id', columns='channel', values='kwh', aggfunc='sum').round(2).to_dict(orient='index')

dashboard_data = {
    'flats': flat_summary.round(2).to_dict(orient='records'),
    'channels': channel_pivot,
    'hourly': hourly_profile.round(3).to_dict(orient='records'),
    'top10': top10.to_dict(orient='records'),
    'annual_pitch': {
        'avg_kwh_student': 216.8,
        'avg_sek_spot_student': 160.7,
        'avg_sek_full_student': 411.7,
        'avg_co2_student': 9.8,
        'high_kwh_student': 955.9,
        'high_sek_full_student': 1514.9
    }
}

with open(os.path.join(CLEAN_DIR, "dashboard_data.json"), 'w') as f:
    json.dump(dashboard_data, f, indent=2)

print("Dashboard data JSON successfully exported!")


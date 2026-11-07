import os
import pandas as pd
import numpy as np

CLEAN_DIR = r"c:\Users\gjins\Desktop\lnu-ai-society\data_cleaned"
OUTPUT_DIR = r"c:\Users\gjins\Desktop\lnu-ai-society\data_cleaned"

prices = pd.read_csv(os.path.join(CLEAN_DIR, "clean_hourly_prices.csv"))
context = pd.read_csv(os.path.join(CLEAN_DIR, "clean_hourly_context.csv"))
readings = pd.read_csv(os.path.join(CLEAN_DIR, "clean_energy_readings.csv"))
flats = pd.read_csv(os.path.join(CLEAN_DIR, "clean_flats.csv"))

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

print("=== CALCULATING PRECISE SAVINGS FOR TOP 10 OPPORTUNITIES ===")

# Opportunity 1: F007 Space Heating Elimination / District Heat Transition
opp1_sub = df[(df['flat_id'] == 'F007') & (df['channel'] == 'A07')]
opp1_kwh = opp1_sub['kwh'].sum()
opp1_spot = opp1_sub['cost_sek'].sum()
opp1_full = opp1_sub['full_cost_sek'].sum()
opp1_co2 = opp1_sub['carbon_kg'].sum()

# Opportunity 2: F001 Space Heating Elimination / District Heat Transition
opp2_sub = df[(df['flat_id'] == 'F001') & (df['channel'] == 'A07')]
opp2_kwh = opp2_sub['kwh'].sum()
opp2_spot = opp2_sub['cost_sek'].sum()
opp2_full = opp2_sub['full_cost_sek'].sum()
opp2_co2 = opp2_sub['carbon_kg'].sum()

# Opportunity 3: F007 Unoccupied Space Heating (subset of opp1, but isolated behavior)
opp3_sub = df[(df['flat_id'] == 'F007') & (df['channel'] == 'A07') & (df['occupants_home'] == 0)]
opp3_kwh = opp3_sub['kwh'].sum()
opp3_spot = opp3_sub['cost_sek'].sum()
opp3_full = opp3_sub['full_cost_sek'].sum()
opp3_co2 = opp3_sub['carbon_kg'].sum()

# Opportunity 4: Load Shifting A02 across all flats (Dishwasher/Washing)
a02 = df[(df['channel'] == 'A02') & (df['kwh'] > 0.1)].copy()
a02['date'] = a02['dt_utc'].dt.date
cheapest_night_price = df[(df['dt_utc'].dt.hour >= 1) & (df['dt_utc'].dt.hour <= 5)].groupby(df['dt_utc'].dt.date)['spot_sek_per_kwh'].min()
cheapest_night_carbon = df[(df['dt_utc'].dt.hour >= 1) & (df['dt_utc'].dt.hour <= 5)].groupby(df['dt_utc'].dt.date)['carbon_gco2e_per_kwh'].min()
a02['night_price'] = a02['date'].map(cheapest_night_price)
a02['night_carbon'] = a02['date'].map(cheapest_night_carbon)
opp4_kwh = 0.0 # 0 kWh avoided (it is shifted!)
opp4_shifted_kwh = a02['kwh'].sum()
opp4_spot = (a02['kwh'] * (a02['spot_sek_per_kwh'] - a02['night_price'])).sum()
opp4_full = (a02['kwh'] * (a02['spot_sek_per_kwh'] - a02['night_price']) * 1.25).sum() # VAT on energy diff
opp4_co2 = (a02['kwh'] * (a02['carbon_gco2e_per_kwh'] - a02['night_carbon']) / 1000.0).sum()

# Opportunity 5: F005 Workstation A06 idle power reduction (excess over 45W baseline)
f5_a06 = df[(df['flat_id'] == 'F005') & (df['channel'] == 'A06')].copy()
# Excess consumption above cohort baseline of 0.045 kWh/h:
f5_a06['excess_kwh'] = np.maximum(0, f5_a06['kwh'] - 0.045)
opp5_kwh = f5_a06['excess_kwh'].sum()
opp5_spot = (f5_a06['excess_kwh'] * f5_a06['spot_sek_per_kwh']).sum()
opp5_full = (f5_a06['excess_kwh'] * (f5_a06['spot_sek_per_kwh'] + 0.778) * 1.25).sum()
opp5_co2 = (f5_a06['excess_kwh'] * f5_a06['carbon_gco2e_per_kwh'] / 1000.0).sum()

# Opportunity 6: F002 Refrigerator A01 degradation / overcooling (excess over 52W baseline)
f2_a01 = df[(df['flat_id'] == 'F002') & (df['channel'] == 'A01')].copy()
f2_a01['excess_kwh'] = np.maximum(0, f2_a01['kwh'] - 0.052)
opp6_kwh = f2_a01['excess_kwh'].sum()
opp6_spot = (f2_a01['excess_kwh'] * f2_a01['spot_sek_per_kwh']).sum()
opp6_full = (f2_a01['excess_kwh'] * (f2_a01['spot_sek_per_kwh'] + 0.778) * 1.25).sum()
opp6_co2 = (f2_a01['excess_kwh'] * f2_a01['carbon_gco2e_per_kwh'] / 1000.0).sum()

# Opportunity 7: F004 Unoccupied Lighting A05 (excess over 4W standby)
f4_a05 = df[(df['flat_id'] == 'F004') & (df['channel'] == 'A05') & (df['occupants_home'] == 0)].copy()
f4_a05['excess_kwh'] = np.maximum(0, f4_a05['kwh'] - 0.004)
opp7_kwh = f4_a05['excess_kwh'].sum()
opp7_spot = (f4_a05['excess_kwh'] * f4_a05['spot_sek_per_kwh']).sum()
opp7_full = (f4_a05['excess_kwh'] * (f4_a05['spot_sek_per_kwh'] + 0.778) * 1.25).sum()
opp7_co2 = (f4_a05['excess_kwh'] * f4_a05['carbon_gco2e_per_kwh'] / 1000.0).sum()

# Opportunity 8: Unattended Cooking / Kitchen Appliances When Vacant (A03/A04 across cohort)
unocc_cook = df[(df['occupants_home'] == 0) & (df['channel'].isin(['A03', 'A04'])) & (df['kwh'] > 0.1)].copy()
opp8_kwh = unocc_cook['kwh'].sum()
opp8_spot = unocc_cook['cost_sek'].sum()
opp8_full = unocc_cook['full_cost_sek'].sum()
opp8_co2 = unocc_cook['carbon_kg'].sum()

# Opportunity 9: F001 Nighttime Space Heating Setback (01:00-05:00 UTC)
# If F001 heater is turned down at night (saving 50% of night heating load)
f1_night = df[(df['flat_id'] == 'F001') & (df['channel'] == 'A07') & (df['dt_utc'].dt.hour >= 1) & (df['dt_utc'].dt.hour <= 5)].copy()
opp9_kwh = f1_night['kwh'].sum() * 0.5
opp9_spot = (f1_night['cost_sek'].sum()) * 0.5
opp9_full = (f1_night['full_cost_sek'].sum()) * 0.5
opp9_co2 = (f1_night['carbon_kg'].sum()) * 0.5

# Opportunity 10: Nighttime Vampire / Standby Loads on Lighting & Peripherals (A05, 01:00-05:00 UTC across cohort)
# Smart strips cutting standby by 50% during deep sleep hours
a05_night = df[(df['channel'] == 'A05') & (df['dt_utc'].dt.hour >= 1) & (df['dt_utc'].dt.hour <= 5)].copy()
# Excess above 15W essential standby
a05_night['excess_kwh'] = np.maximum(0, a05_night['kwh'] - 0.015)
opp10_kwh = a05_night['excess_kwh'].sum()
opp10_spot = (a05_night['excess_kwh'] * a05_night['spot_sek_per_kwh']).sum()
opp10_full = (a05_night['excess_kwh'] * (a05_night['spot_sek_per_kwh'] + 0.778) * 1.25).sum()
opp10_co2 = (a05_night['excess_kwh'] * a05_night['carbon_gco2e_per_kwh'] / 1000.0).sum()

opportunities = [
    {
        'Rank': 1,
        'Flat_ID': 'F007',
        'Appliance': 'A07: Portable Electric Heater',
        'Issue_Type': 'Overheating & Fuel Switching (District Heat)',
        'Scope': 'Flat F007 (4 residents)',
        '4W_Avoided_kWh': round(opp1_kwh, 1),
        '4W_Shifted_kWh': 0.0,
        '4W_Spot_SEK': round(opp1_spot, 1),
        '4W_Full_SEK': round(opp1_full, 1),
        '4W_Carbon_kg': round(opp1_co2, 2),
        'Confidence': 'High (r = -0.98 outdoor temp; indoor 22.5°C avg)'
    },
    {
        'Rank': 2,
        'Flat_ID': 'F001',
        'Appliance': 'A07: Portable Electric Heater',
        'Issue_Type': 'Avoidable Electric Heating (District Heat)',
        'Scope': 'Flat F001 (2 residents)',
        '4W_Avoided_kWh': round(opp2_kwh, 1),
        '4W_Shifted_kWh': 0.0,
        '4W_Spot_SEK': round(opp2_spot, 1),
        '4W_Full_SEK': round(opp2_full, 1),
        '4W_Carbon_kg': round(opp2_co2, 2),
        'Confidence': 'High (67.4% of flat load; r = -0.88 outdoor)'
    },
    {
        'Rank': 3,
        'Flat_ID': 'All Flats',
        'Appliance': 'A02: Dishwasher / Washing Machine',
        'Issue_Type': 'Peak Load Shifting to Night (01-05 UTC)',
        'Scope': 'All 8 Flats (25 residents)',
        '4W_Avoided_kWh': 0.0,
        '4W_Shifted_kWh': round(opp4_shifted_kwh, 1),
        '4W_Spot_SEK': round(opp4_spot, 1),
        '4W_Full_SEK': round(opp4_full, 1),
        '4W_Carbon_kg': round(opp4_co2, 2),
        'Confidence': 'High (384 cycles run at peak hours; 73% spot savings)'
    },
    {
        'Rank': 4,
        'Flat_ID': 'F005',
        'Appliance': 'A06: Workstation / Desktop / Server',
        'Issue_Type': '24/7 Idle Power / Standby (150W continuous)',
        'Scope': 'Flat F005 (5 residents)',
        '4W_Avoided_kWh': round(opp5_kwh, 1),
        '4W_Shifted_kWh': 0.0,
        '4W_Spot_SEK': round(opp5_spot, 1),
        '4W_Full_SEK': round(opp5_full, 1),
        '4W_Carbon_kg': round(opp5_co2, 2),
        'Confidence': 'High (3.3x higher baseload than cohort)'
    },
    {
        'Rank': 5,
        'Flat_ID': 'F007',
        'Appliance': 'A07: Portable Electric Heater',
        'Issue_Type': 'Heating Empty Apartment (56 unocc hrs)',
        'Scope': 'Flat F007 (4 residents)',
        '4W_Avoided_kWh': round(opp3_kwh, 1),
        '4W_Shifted_kWh': 0.0,
        '4W_Spot_SEK': round(opp3_spot, 1),
        '4W_Full_SEK': round(opp3_full, 1),
        '4W_Carbon_kg': round(opp3_co2, 2),
        'Confidence': 'High (direct correlation with sensor-verified absence)'
    },
    {
        'Rank': 6,
        'Flat_ID': 'F002',
        'Appliance': 'A01: Refrigerator / Freezer',
        'Issue_Type': 'Degraded Appliance / Seal Failure / Overcooling',
        'Scope': 'Flat F002 (3 residents)',
        '4W_Avoided_kWh': round(opp6_kwh, 1),
        '4W_Shifted_kWh': 0.0,
        '4W_Spot_SEK': round(opp6_spot, 1),
        '4W_Full_SEK': round(opp6_full, 1),
        '4W_Carbon_kg': round(opp6_co2, 2),
        'Confidence': 'Medium-High (86.8W continuous vs 52.5W cohort)'
    },
    {
        'Rank': 7,
        'Flat_ID': 'All Flats',
        'Appliance': 'A05: Lighting & Media Standby',
        'Issue_Type': 'Nighttime Vampire Standby (01-05 UTC)',
        'Scope': 'All 8 Flats (25 residents)',
        '4W_Avoided_kWh': round(opp10_kwh, 1),
        '4W_Shifted_kWh': 0.0,
        '4W_Spot_SEK': round(opp10_spot, 1),
        '4W_Full_SEK': round(opp10_full, 1),
        '4W_Carbon_kg': round(opp10_co2, 2),
        'Confidence': 'Medium (requires smart plug or habit intervention)'
    },
    {
        'Rank': 8,
        'Flat_ID': 'F001',
        'Appliance': 'A07: Portable Electric Heater',
        'Issue_Type': 'Overnight Heating (744W all night)',
        'Scope': 'Flat F001 (2 residents)',
        '4W_Avoided_kWh': round(opp9_kwh, 1),
        '4W_Shifted_kWh': 0.0,
        '4W_Spot_SEK': round(opp9_spot, 1),
        '4W_Full_SEK': round(opp9_full, 1),
        '4W_Carbon_kg': round(opp9_co2, 2),
        'Confidence': 'High (sleep hygiene setback to 18°C)'
    },
    {
        'Rank': 9,
        'Flat_ID': 'Cohort',
        'Appliance': 'A03/A04: Oven / Hob / Kitchen',
        'Issue_Type': 'Unattended High-Power Cooking / Fire Risk',
        'Scope': 'Flats F001, F007, F008',
        '4W_Avoided_kWh': round(opp8_kwh, 1),
        '4W_Shifted_kWh': 0.0,
        '4W_Spot_SEK': round(opp8_spot, 1),
        '4W_Full_SEK': round(opp8_full, 1),
        '4W_Carbon_kg': round(opp8_co2, 2),
        'Confidence': 'Medium (safety hazard vs slow cooker ambiguity)'
    },
    {
        'Rank': 10,
        'Flat_ID': 'F004',
        'Appliance': 'A05: Lighting & Entertainment',
        'Issue_Type': 'Lights Left ON in Empty Apartment (152 hrs)',
        'Scope': 'Flat F004 (2 residents)',
        '4W_Avoided_kWh': round(opp7_kwh, 1),
        '4W_Shifted_kWh': 0.0,
        '4W_Spot_SEK': round(opp7_spot, 1),
        '4W_Full_SEK': round(opp7_full, 1),
        '4W_Carbon_kg': round(opp7_co2, 2),
        'Confidence': 'High (41.6W vs 4.0W cohort unoccupied baseline)'
    }
]

df_opp = pd.DataFrame(opportunities)
df_opp.to_csv(os.path.join(OUTPUT_DIR, "top_10_waste_opportunities.csv"), index=False)
print(df_opp.to_string())


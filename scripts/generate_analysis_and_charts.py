import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

CLEAN_DIR = r"c:\Users\gjins\Desktop\lnu-ai-society\data_cleaned"
CHARTS_DIR = r"c:\Users\gjins\Desktop\lnu-ai-society\charts"
ARTIFACTS_DIR = r"C:\Users\gjins\.gemini\antigravity\brain\27769ef1-e022-4101-9304-f5363b447d25"

os.makedirs(CHARTS_DIR, exist_ok=True)
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

# Set matplotlib style
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['font.sans-serif'] = 'Arial'
plt.rcParams['font.size'] = 10
plt.rcParams['figure.titlesize'] = 12

# 1. Load cleaned datasets
flats = pd.read_csv(os.path.join(CLEAN_DIR, "clean_flats.csv"))
prices = pd.read_csv(os.path.join(CLEAN_DIR, "clean_hourly_prices.csv"))
context = pd.read_csv(os.path.join(CLEAN_DIR, "clean_hourly_context.csv"))
readings = pd.read_csv(os.path.join(CLEAN_DIR, "clean_energy_readings.csv"))

# Parse datetimes
prices['dt_utc'] = pd.to_datetime(prices['dt_utc'])
context['dt_utc'] = pd.to_datetime(context['dt_utc'])
readings['dt_utc'] = pd.to_datetime(readings['dt_utc'])

# Merge everything into a master analytical frame
df = readings.merge(context, on=['flat_id', 'dt_utc'], how='left')
df = df.merge(prices[['dt_utc', 'spot_sek_per_kwh', 'carbon_gco2e_per_kwh']], on='dt_utc', how='left')
df = df.merge(flats[['flat_id', 'residents', 'floor_area_m2']], on='flat_id', how='left')

df['channel'] = df['appliance_id'].apply(lambda x: x.split('-')[1])
df['cost_sek'] = df['kwh'] * df['spot_sek_per_kwh']
df['carbon_kg'] = df['kwh'] * df['carbon_gco2e_per_kwh'] / 1000.0

# Swedish full retail cost calculation:
# Spot price + typical Swedish grid fee (0.35 SEK/kWh) + energy tax (0.428 SEK/kWh) + 25% VAT
# (0.35 + 0.428 = 0.778 SEK pre-VAT adders)
df['full_cost_sek'] = (df['spot_sek_per_kwh'] + 0.778) * 1.25 * df['kwh']

print("=================== PHASE 3 CALCULATIONS ===================")

# 1. Total electricity consumption by apartment
flat_agg = df.groupby('flat_id').agg(
    total_kwh=('kwh', 'sum'),
    spot_cost_sek=('cost_sek', 'sum'),
    full_cost_sek=('full_cost_sek', 'sum'),
    carbon_kg=('carbon_kg', 'sum'),
    residents=('residents', 'first'),
    floor_area_m2=('floor_area_m2', 'first')
)
flat_agg['kwh_per_resident'] = flat_agg['total_kwh'] / flat_agg['residents']
flat_agg['daily_kwh_per_resident'] = flat_agg['kwh_per_resident'] / 28.0
flat_agg['spot_cost_per_resident'] = flat_agg['spot_cost_sek'] / flat_agg['residents']
flat_agg['full_cost_per_resident'] = flat_agg['full_cost_sek'] / flat_agg['residents']
flat_agg['carbon_kg_per_resident'] = flat_agg['carbon_kg'] / flat_agg['residents']
flat_agg['kwh_per_m2'] = flat_agg['total_kwh'] / flat_agg['floor_area_m2']

print("\n--- 1. TOTALS BY APARTMENT ---")
print(flat_agg.round(2))

# 2. Total consumption by appliance channel
channel_names = {
    'A01': 'A01: Refrigerator/Baseload',
    'A02': 'A02: Dishwasher/Washing',
    'A03': 'A03: Cooking/Stove',
    'A04': 'A04: Oven/Kitchen App',
    'A05': 'A05: Lighting & Devices',
    'A06': 'A06: Workstation/PC/Vent',
    'A07': 'A07: Portable Electric Heater'
}
df['appliance_type'] = df['channel'].map(channel_names)

ch_agg = df.groupby('appliance_type').agg(
    total_kwh=('kwh', 'sum'),
    spot_cost_sek=('cost_sek', 'sum'),
    full_cost_sek=('full_cost_sek', 'sum'),
    carbon_kg=('carbon_kg', 'sum')
)
ch_agg['pct_total_kwh'] = ch_agg['total_kwh'] / ch_agg['total_kwh'].sum() * 100
print("\n--- 2. TOTALS BY APPLIANCE CHANNEL ---")
print(ch_agg.sort_values('total_kwh', ascending=False).round(2))

# 3. Average daily consumption per student across all flats
total_students = flats['residents'].sum() # 25
total_kwh_all = df['kwh'].sum()
avg_daily_kwh_student = total_kwh_all / total_students / 28.0
avg_monthly_kwh_student = total_kwh_all / total_students
print(f"\n--- 3. PER STUDENT AVERAGES ---")
print(f"Total students: {total_students}")
print(f"Total 4-week kWh: {total_kwh_all:.2f} kWh")
print(f"Average daily kWh per student: {avg_daily_kwh_student:.2f} kWh/day")
print(f"Average 4-week kWh per student: {avg_monthly_kwh_student:.2f} kWh")
print(f"Average 4-week spot spend per student: {df['cost_sek'].sum()/total_students:.2f} SEK")
print(f"Average 4-week full retail spend per student: {df['full_cost_sek'].sum()/total_students:.2f} SEK")
print(f"Average 4-week carbon per student: {df['carbon_kg'].sum()/total_students:.2f} kg CO2e")

# 4. Hourly consumption patterns
hourly_flat = df.pivot_table(index=df['dt_utc'].dt.hour, columns='flat_id', values='kwh', aggfunc='mean')
hourly_ch = df.pivot_table(index=df['dt_utc'].dt.hour, columns='channel', values='kwh', aggfunc='mean')

# 5. Peak electricity usage periods
hourly_total = df.groupby(df['dt_utc'].dt.hour)['kwh'].sum()
print("\n--- 5. HOURLY PEAK PERIODS ---")
print(hourly_total.sort_values(ascending=False).head(5))

# 6. Unoccupied electricity consumption
unocc_df = df[df['occupants_home'] == 0]
occ_df = df[df['occupants_home'] > 0]
print(f"\n--- 6. UNOCCUPIED CONSUMPTION ---")
print(f"Total unoccupied flat-hours: {len(unocc_df) // 7} hrs (out of 5,376 flat-hours = {len(unocc_df)//7/53.76:.1f}%)")
print(f"Total kWh when unoccupied: {unocc_df['kwh'].sum():.2f} kWh ({(unocc_df['kwh'].sum() / total_kwh_all)*100:.1f}% of all electricity!)")
print(f"Total spot spend when unoccupied: {unocc_df['cost_sek'].sum():.2f} SEK")
print(f"Total full spend when unoccupied: {unocc_df['full_cost_sek'].sum():.2f} SEK")

unocc_by_flat = unocc_df.groupby('flat_id')['kwh'].sum()
unocc_by_ch = unocc_df.groupby('appliance_type')['kwh'].sum()
print("Unoccupied kWh by flat:\n", unocc_by_flat.round(2))
print("Unoccupied kWh by appliance:\n", unocc_by_ch.sort_values(ascending=False).round(2))

# 7. Continuous standby / baseload
# Minimum hourly consumption for each appliance across all 672 hours
min_hourly = df.groupby(['flat_id', 'channel'])['kwh'].min()
p10_hourly = df.groupby(['flat_id', 'channel'])['kwh'].quantile(0.1)
mean_hourly = df.groupby(['flat_id', 'channel'])['kwh'].mean()
baseload_summary = pd.DataFrame({'p10_kwh': p10_hourly, 'mean_kwh': mean_hourly}).round(4)
print("\n--- 7. CONTINUOUS BASELOAD APPLIANCES ---")
print(baseload_summary[baseload_summary['p10_kwh'] > 0.01])

# 8. Weather, indoor temperature, heating demand
print("\n--- 8. WEATHER & HEATING DEMAND ---")
for f in ['F001', 'F007']:
    sub_heat = df[(df['flat_id'] == f) & (df['channel'] == 'A07')]
    print(f"\nFlat {f} Heating Analysis:")
    print(f"Total heating kWh: {sub_heat['kwh'].sum():.2f}")
    print(f"Heating % of flat total: {(sub_heat['kwh'].sum() / flat_agg.loc[f, 'total_kwh'])*100:.1f}%")
    print(f"Heating correlation with outdoor temp: {sub_heat['kwh'].corr(sub_heat['outdoor_temp_c']):.4f}")
    print(f"Heating correlation with indoor temp: {sub_heat['kwh'].corr(sub_heat['indoor_temp_c']):.4f}")
    print(f"Indoor temp mean: {sub_heat['indoor_temp_c'].mean():.2f}°C (min: {sub_heat['indoor_temp_c'].min():.1f}, max: {sub_heat['indoor_temp_c'].max():.1f})")

# 9. Spend and 10. Carbon totals
print("\n--- 9 & 10. SPEND AND CARBON ---")
print(f"Grand Total 4-Week Spot Spend: {df['cost_sek'].sum():.2f} SEK")
print(f"Grand Total 4-Week Full Retail Spend: {df['full_cost_sek'].sum():.2f} SEK")
print(f"Grand Total 4-Week Carbon Emissions: {df['carbon_kg'].sum():.2f} kg CO2e")

# Save detailed analytical summary to CSV
flat_agg.to_csv(os.path.join(CLEAN_DIR, "apartment_consumption_summary.csv"))
ch_agg.to_csv(os.path.join(CLEAN_DIR, "appliance_channel_summary.csv"))

print("\n=================== GENERATING PLOTS ===================")

# PLOT 1: Total Consumption by Apartment & Appliance Breakdown
fig, ax = plt.subplots(figsize=(10, 6))
flat_ch_pivot = df.pivot_table(index='flat_id', columns='channel', values='kwh', aggfunc='sum')
colors = ['#2b5c8f', '#4682b4', '#5cb85c', '#f0ad4e', '#d9534f', '#9370db', '#e74c3c']
flat_ch_pivot.plot(kind='bar', stacked=True, ax=ax, color=colors, edgecolor='white', width=0.65)
ax.set_title('Total Electricity Consumption by Flat and Appliance Channel (4 Weeks)', fontsize=14, fontweight='bold', pad=15)
ax.set_xlabel('Flat ID (Residents in parentheses)', fontsize=11, labelpad=10)
ax.set_ylabel('Total Electricity Consumption (kWh)', fontsize=11)
res_labels = [f"{f}\n({flats.loc[flats['flat_id']==f, 'residents'].values[0]} res)" for f in flat_ch_pivot.index]
ax.set_xticklabels(res_labels, rotation=0)
legend_labels = [f"{k}: {channel_names[k].split(': ')[1]}" for k in flat_ch_pivot.columns]
ax.legend(legend_labels, title='Appliance Channels', bbox_to_anchor=(1.02, 1), loc='upper left', frameon=True)
plt.tight_layout()
p1_path = os.path.join(ARTIFACTS_DIR, "plot1_consumption_by_flat.png")
p1_local = os.path.join(CHARTS_DIR, "plot1_consumption_by_flat.png")
plt.savefig(p1_path, dpi=300)
plt.savefig(p1_local, dpi=300)
plt.close()
print("Saved Plot 1")

# PLOT 2: Daily Consumption per Student
fig, ax = plt.subplots(figsize=(9, 5))
bar_colors = ['#e74c3c' if x > 4 else '#3498db' for x in flat_agg['daily_kwh_per_resident']]
bars = ax.bar(flat_agg.index, flat_agg['daily_kwh_per_resident'], color=bar_colors, width=0.6, edgecolor='black', linewidth=0.5)
ax.axhline(avg_daily_kwh_student, color='#e67e22', linestyle='--', linewidth=2, label=f'Cohort Average: {avg_daily_kwh_student:.2f} kWh/day')
ax.set_title('Average Daily Electricity Consumption per Student by Apartment', fontsize=13, fontweight='bold', pad=15)
ax.set_xlabel('Apartment ID', fontsize=11)
ax.set_ylabel('Daily Consumption per Resident (kWh/day)', fontsize=11)
ax.legend(frameon=True)
for bar in bars:
    yval = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2.0, yval + 0.15, f'{yval:.2f}', ha='center', va='bottom', fontsize=9, fontweight='bold')
plt.tight_layout()
p2_path = os.path.join(ARTIFACTS_DIR, "plot2_daily_kwh_per_student.png")
p2_local = os.path.join(CHARTS_DIR, "plot2_daily_kwh_per_student.png")
plt.savefig(p2_path, dpi=300)
plt.savefig(p2_local, dpi=300)
plt.close()
print("Saved Plot 2")

# PLOT 3: Diurnal Load Curves (Hour of Day)
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
hourly_avg = df.groupby(df['dt_utc'].dt.hour)['kwh'].mean()
hourly_prices = prices.groupby(prices['dt_utc'].dt.hour)['spot_sek_per_kwh'].mean()
hourly_carbon = prices.groupby(prices['dt_utc'].dt.hour)['carbon_gco2e_per_kwh'].mean()

ax1.plot(hourly_avg.index, hourly_avg.values, marker='o', color='#2980b9', linewidth=2.5, label='Mean Electricity Load')
ax1.set_title('Average Diurnal Electricity Demand Profile (Cohort)', fontsize=12, fontweight='bold')
ax1.set_xlabel('Hour of Day (UTC)', fontsize=10)
ax1.set_ylabel('Average Consumption per Flat-Hour (kWh)', fontsize=10)
ax1.set_xticks(range(0, 24, 2))
ax1.grid(True, linestyle=':')

ax2_twin = ax2.twinx()
p1 = ax2.plot(hourly_prices.index, hourly_prices.values, marker='s', color='#d35400', linewidth=2, label='Spot Price (SEK/kWh)')
p2 = ax2_twin.plot(hourly_carbon.index, hourly_carbon.values, marker='^', color='#27ae60', linewidth=2, linestyle='--', label='Carbon Factor (gCO2e/kWh)')
ax2.set_title('Hourly Spot Price & Carbon Intensity Profile', fontsize=12, fontweight='bold')
ax2.set_xlabel('Hour of Day (UTC)', fontsize=10)
ax2.set_ylabel('Spot Price (SEK/kWh)', fontsize=10, color='#d35400')
ax2_twin.set_ylabel('Carbon Intensity (gCO2e/kWh)', fontsize=10, color='#27ae60')
ax2.set_xticks(range(0, 24, 2))
ax2.grid(True, linestyle=':')
lines = p1 + p2
labels = [l.get_label() for l in lines]
ax2.legend(lines, labels, loc='upper left')
plt.tight_layout()
p3_path = os.path.join(ARTIFACTS_DIR, "plot3_diurnal_profiles.png")
p3_local = os.path.join(CHARTS_DIR, "plot3_diurnal_profiles.png")
plt.savefig(p3_path, dpi=300)
plt.savefig(p3_local, dpi=300)
plt.close()
print("Saved Plot 3")

# PLOT 4: Heating vs Outdoor Temperature in F001 and F007
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5))
f1_heat = df[(df['flat_id'] == 'F001') & (df['channel'] == 'A07')]
f7_heat = df[(df['flat_id'] == 'F007') & (df['channel'] == 'A07')]

ax1.scatter(f1_heat['outdoor_temp_c'], f1_heat['kwh'], alpha=0.4, color='#3498db', edgecolors='none', s=25)
# Trendline
z1 = np.polyfit(f1_heat['outdoor_temp_c'], f1_heat['kwh'], 1)
p_poly1 = np.poly1d(z1)
x_vals = np.linspace(f1_heat['outdoor_temp_c'].min(), f1_heat['outdoor_temp_c'].max(), 50)
ax1.plot(x_vals, p_poly1(x_vals), color='#1b4f72', linewidth=2.5, label=f'Trend (r = {f1_heat["kwh"].corr(f1_heat["outdoor_temp_c"]):.2f})')
ax1.set_title('Flat F001: Electric Heating vs Outdoor Temp', fontsize=11, fontweight='bold')
ax1.set_xlabel('Outdoor Temperature (°C)', fontsize=10)
ax1.set_ylabel('Electric Heater Load (kWh/h)', fontsize=10)
ax1.legend(frameon=True)

ax2.scatter(f7_heat['outdoor_temp_c'], f7_heat['kwh'], alpha=0.4, color='#e74c3c', edgecolors='none', s=25)
z7 = np.polyfit(f7_heat['outdoor_temp_c'], f7_heat['kwh'], 1)
p_poly7 = np.poly1d(z7)
ax2.plot(x_vals, p_poly7(x_vals), color='#78281f', linewidth=2.5, label=f'Trend (r = {f7_heat["kwh"].corr(f7_heat["outdoor_temp_c"]):.2f})')
ax2.set_title('Flat F007: Electric Heating vs Outdoor Temp (Overheating!)', fontsize=11, fontweight='bold')
ax2.set_xlabel('Outdoor Temperature (°C)', fontsize=10)
ax2.set_ylabel('Electric Heater Load (kWh/h)', fontsize=10)
ax2.legend(frameon=True)
plt.tight_layout()
p4_path = os.path.join(ARTIFACTS_DIR, "plot4_heating_vs_temp.png")
p4_local = os.path.join(CHARTS_DIR, "plot4_heating_vs_temp.png")
plt.savefig(p4_path, dpi=300)
plt.savefig(p4_local, dpi=300)
plt.close()
print("Saved Plot 4")

# PLOT 5: Breakdown of Avoidable Waste vs Necessary Electricity
fig, ax = plt.subplots(figsize=(10, 5))
# Breakdown categories:
# 1. Electric Heating in F001 & F007 (District heat available): 292.2 + 336.2 = 628.4 kWh
# 2. Overcooling/Degraded Fridge F002 (excess over 52W baseline): (0.086 - 0.052) * 672 = 22.8 kWh
# 3. Workstation/PC 24/7 idle in F005 (excess over 45W baseline): (0.149 - 0.045) * 672 = 69.9 kWh
# 4. Empty Flat Lighting in F004: 6.3 kWh
# 5. Dishwasher/Washing Machine peak timing (shiftable load, not avoidable kWh): 294.0 kWh
# 6. Legitimate Essential Consumption: Remaining kWh
total_waste_kwh = 628.4 + 22.8 + 69.9 + 6.3
essential_kwh = total_kwh_all - total_waste_kwh

waste_categories = ['Electric Space Heating\n(Flats F001 & F007)', 'Workstation Standby 24/7\n(Flat F005)', 'Degraded Fridge Baseload\n(Flat F002)', 'Unoccupied Lighting\n(Flat F004)', 'Shiftable Appliance Cycles\n(Dishwasher/Washing A02)', 'Essential Base & Living\nElectricity']
kwh_amounts = [628.4, 69.9, 22.8, 6.3, 294.0, essential_kwh - 294.0]
colors_waste = ['#e74c3c', '#e67e22', '#f39c12', '#d35400', '#3498db', '#2ecc71']

wedges, texts, autotexts = ax.pie(kwh_amounts, labels=waste_categories, autopct='%1.1f%%', startangle=140, colors=colors_waste, explode=(0.08, 0.05, 0.05, 0.05, 0.03, 0), textprops=dict(color="black", fontsize=9))
for at in autotexts:
    at.set_fontsize(9)
    at.set_weight('bold')
ax.set_title(f'Electricity Allocation & Waste Map (Total Cohort: {total_kwh_all:.1f} kWh / 4 Weeks)', fontsize=13, fontweight='bold', pad=20)
plt.tight_layout()
p5_path = os.path.join(ARTIFACTS_DIR, "plot5_waste_map.png")
p5_local = os.path.join(CHARTS_DIR, "plot5_waste_map.png")
plt.savefig(p5_path, dpi=300)
plt.savefig(p5_local, dpi=300)
plt.close()
print("Saved Plot 5")

print("All plots successfully generated and saved to artifact directory!")

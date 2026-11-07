import os
import pandas as pd
import numpy as np

CLEAN_DIR = r"c:\Users\gjins\Desktop\lnu-ai-society\data_cleaned"

# Let's build a mutually exclusive, non-overlapping savings model for the cohort (25 students across 8 flats)
# 4-week measured figures:

# 1. Mutually Exclusive Avoided Electricity:
# Category A: Space Heating Fuel Switching (Transitioning from electric heaters to building district heating in F001 and F007)
# Total measured A07 in F001 + F007 = 297.6 + 342.9 = 640.5 kWh
# 4-week spot savings: 124.9 + 155.4 = 280.3 SEK
# 4-week full retail savings (incl grid, tax, VAT): 445.6 + 527.8 = 973.4 SEK
# 4-week carbon savings: 10.14 + 12.06 = 22.20 kg CO2e

# Category B: Continuous PC/Workstation Power Management in F005 (Sleep modes/smart plug for excess 105W)
# Excess A06 in F005 = 70.6 kWh
# 4-week spot savings: 34.3 SEK
# 4-week full retail savings: 111.5 SEK
# 4-week carbon savings: 2.65 kg CO2e

# Category C: Refrigerator Maintenance & Seal/Defrost Fix in F002
# Excess A01 in F002 = 24.9 kWh
# 4-week spot savings: 12.2 SEK
# 4-week full retail savings: 39.5 SEK
# 4-week carbon savings: 0.84 kg CO2e

# Category D: Unoccupied Lighting & Appliance Standby (F004 unoccupied lights 5.9 kWh + Cohort night standby A05 56.4 kWh)
# Total = 62.3 kWh
# 4-week spot savings: 2.3 + 22.2 = 24.5 SEK
# 4-week full retail savings: 8.6 + 82.6 = 91.2 SEK
# 4-week carbon savings: 0.20 + 1.93 = 2.13 kg CO2e

# TOTAL NON-OVERLAPPING AVOIDED ELECTRICITY (4 WEEKS):
total_avoided_kwh_4w = 640.5 + 70.6 + 24.9 + 62.3 # 798.3 kWh
total_avoided_spot_4w = 280.3 + 34.3 + 12.2 + 24.5 # 351.3 SEK
total_avoided_full_4w = 973.4 + 111.5 + 39.5 + 91.2 # 1215.6 SEK
total_avoided_co2_4w = 22.20 + 2.65 + 0.84 + 2.13 # 27.82 kg CO2e

# 2. Mutually Exclusive Load Shifting (A02 Dishwasher/Washing):
# Does NOT reduce kWh, reduces cost & carbon
# 4-week shifted kWh: 295.0 kWh
# 4-week spot cost savings: 162.5 SEK
# 4-week full retail cost savings (VAT on energy diff): 203.1 SEK
# 4-week carbon reduction: 5.44 kg CO2e

# TOTAL 4-WEEK COMBINED BENEFITS ACROSS COHORT (25 STUDENTS):
cohort_total_kwh_avoided_4w = total_avoided_kwh_4w # 798.3 kWh (41.3% of total cohort consumption!)
cohort_total_spot_savings_4w = total_avoided_spot_4w + 162.5 # 513.8 SEK
cohort_total_full_savings_4w = total_avoided_full_4w + 203.1 # 1418.7 SEK
cohort_total_co2_savings_4w = total_avoided_co2_4w + 5.44 # 33.26 kg CO2e

# PER STUDENT (4 WEEKS):
student_kwh_avoided_4w = cohort_total_kwh_avoided_4w / 25.0
student_spot_savings_4w = cohort_total_spot_savings_4w / 25.0
student_full_savings_4w = cohort_total_full_savings_4w / 25.0
student_co2_savings_4w = cohort_total_co2_savings_4w / 25.0

print("=== 4-WEEK COHORT & PER-STUDENT TOTALS ===")
print(f"Cohort Avoided Electricity: {cohort_total_kwh_avoided_4w:.1f} kWh")
print(f"Cohort Spot Cost Savings: {cohort_total_spot_savings_4w:.1f} SEK")
print(f"Cohort Full Retail Cost Savings: {cohort_total_full_savings_4w:.1f} SEK")
print(f"Cohort Carbon Emissions Avoided: {cohort_total_co2_savings_4w:.2f} kg CO2e")
print(f"\nPer Student Avoided Electricity (4w): {student_kwh_avoided_4w:.1f} kWh")
print(f"Per Student Spot Savings (4w): {student_spot_savings_4w:.1f} SEK")
print(f"Per Student Full Retail Savings (4w): {student_full_savings_4w:.1f} SEK")
print(f"Per Student Carbon Savings (4w): {student_co2_savings_4w:.2f} kg CO2e")

# === ANNUAL EXTRAPOLATION MODEL ===
# Assumptions:
# 1. Academic Year Occupancy: 40 active weeks per year (10 months, excluding summer vacation).
# 2. Heating Season: Heating demand occurs over ~28 weeks (Oct - Apr).
#    October average outdoor temp in dataset: 7.4°C.
#    Swedish winter (Dec-Feb) average outdoor temp: ~ -1°C. Heating Degree Days (HDD) in winter are ~1.8x higher than October.
#    Early spring/late autumn (Nov, Mar, Apr): HDD ~1.2x October.
#    Annual space heating multiplier:
#    Instead of 10 months * 640 kWh, heating only occurs during heating season.
#    Equivalent full-load heating weeks: ~24 effective weeks at October equivalent load (accounting for colder winter and zero summer).
#    Annual heating waste = 640.5 kWh / 4w * 24w = 3,843 kWh for the two affected flats.
# 3. Baseload, Refrigerator, Standby (F005 PC, F002 fridge, F004 lighting, night standby):
#    Occurs whenever students reside: 40 academic weeks.
#    Annual baseload waste = (70.6 + 24.9 + 62.3) kWh / 4w * 40w = 1,578 kWh.
# 4. Load Shifting (A02):
#    Occurs 40 academic weeks per year.
#    Annual shifted load = 295.0 kWh / 4w * 40w = 2,950 kWh.
#    Annual shifting cost savings = 203.1 SEK / 4w * 40w = 2,031 SEK retail (1,625 SEK spot).
#    Annual shifting carbon savings = 5.44 kg / 4w * 40w = 54.4 kg CO2e.

annual_heating_avoided_kwh = (640.5 / 4.0) * 24.0
annual_heating_spot_sek = (280.3 / 4.0) * 24.0
annual_heating_full_sek = (973.4 / 4.0) * 24.0
annual_heating_co2_kg = (22.20 / 4.0) * 24.0

annual_base_avoided_kwh = ((70.6 + 24.9 + 62.3) / 4.0) * 40.0
annual_base_spot_sek = ((34.3 + 12.2 + 24.5) / 4.0) * 40.0
annual_base_full_sek = ((111.5 + 39.5 + 91.2) / 4.0) * 40.0
annual_base_co2_kg = ((2.65 + 0.84 + 2.13) / 4.0) * 40.0

annual_shift_spot_sek = (162.5 / 4.0) * 40.0
annual_shift_full_sek = (203.1 / 4.0) * 40.0
annual_shift_co2_kg = (5.44 / 4.0) * 40.0

# Total Annual Cohort:
annual_total_cohort_kwh = annual_heating_avoided_kwh + annual_base_avoided_kwh
annual_total_cohort_spot_sek = annual_heating_spot_sek + annual_base_spot_sek + annual_shift_spot_sek
annual_total_cohort_full_sek = annual_heating_full_sek + annual_base_full_sek + annual_shift_full_sek
annual_total_cohort_co2_kg = annual_heating_co2_kg + annual_base_co2_kg + annual_shift_co2_kg

# Total Annual Per Student (Cohort Average across 25 students):
annual_student_kwh = annual_total_cohort_kwh / 25.0
annual_student_spot_sek = annual_total_cohort_spot_sek / 25.0
annual_student_full_sek = annual_total_cohort_full_sek / 25.0
annual_student_co2_kg = annual_total_cohort_co2_kg / 25.0

# In flats with heating waste (e.g. F001 - 2 students, F007 - 4 students):
annual_f1_resident_kwh = (297.6 / 4.0 * 24.0) / 2.0 + (annual_base_avoided_kwh / 25.0)
annual_f1_resident_full_sek = (445.6 / 4.0 * 24.0) / 2.0 + (annual_base_full_sek / 25.0) + (annual_shift_full_sek / 25.0)

print("\n=== ANNUAL COHORT TOTALS (25 STUDENTS) ===")
print(f"Annual Avoided Electricity: {annual_total_cohort_kwh:.1f} kWh/year")
print(f"Annual Spot Cost Savings: {annual_total_cohort_spot_sek:.1f} SEK/year")
print(f"Annual Full Retail Cost Savings: {annual_total_cohort_full_sek:.1f} SEK/year")
print(f"Annual Carbon Emissions Avoided: {annual_total_cohort_co2_kg:.1f} kg CO2e/year")

print("\n=== ANNUAL PER-STUDENT PITCH METRICS (AVERAGE ACROSS COHORT) ===")
print(f"Annual Electricity Savings per Student: {annual_student_kwh:.1f} kWh/year")
print(f"Annual Financial Savings per Student (Spot): {annual_student_spot_sek:.1f} SEK/year")
print(f"Annual Financial Savings per Student (Full Retail): {annual_student_full_sek:.1f} SEK/year")
print(f"Annual Carbon Savings per Student: {annual_student_co2_kg:.1f} kg CO2e/year")

print("\n=== ANNUAL HIGH-IMPACT APARTMENT (e.g. Flat F001 Resident) ===")
print(f"Electricity Savings per F001 Resident: {annual_f1_resident_kwh:.1f} kWh/year")
print(f"Financial Savings per F001 Resident (Full Retail): {annual_f1_resident_full_sek:.1f} SEK/year")


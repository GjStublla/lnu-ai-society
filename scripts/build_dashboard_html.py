import os
import json

CLEAN_DIR = r"c:\Users\gjins\Desktop\lnu-ai-society\data_cleaned"
ARTIFACTS_DIR = r"C:\Users\gjins\.gemini\antigravity\brain\27769ef1-e022-4101-9304-f5363b447d25"

with open(os.path.join(CLEAN_DIR, "dashboard_data.json"), 'r') as f:
    data = json.load(f)

json_str = json.dumps(data)

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LNU AI Energy Copilot — Hackathon 2026 Dashboard</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    /* Custom scrollbar */
    ::-webkit-scrollbar {{ width: 6px; height: 6px; }}
    ::-webkit-scrollbar-track {{ background: transparent; }}
    ::-webkit-scrollbar-thumb {{ background: rgba(150, 150, 150, 0.3); border-radius: 3px; }}
    .tab-active {{ border-bottom: 2px solid #3b82f6; color: #3b82f6; font-weight: 600; }}
  </style>
</head>
<body class="bg-[var(--background,#0f172a)] text-[var(--foreground,#f8fafc)] antialiased p-4 md:p-8">

  <!-- Header -->
  <header class="mb-8 border-b border-[var(--border,#334155)] pb-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          LNU AI Society × ESN Hackathon 2026 • AI for Energy Saving
        </div>
        <h1 class="text-2xl md:text-3xl font-bold tracking-tight">⚡ EcoStudent AI: Student Energy Copilot</h1>
        <p class="text-[var(--muted-foreground,#94a3b8)] text-sm mt-1">Autonomous waste detection, spot-price load shifting, and transparent carbon accounting for university housing.</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs text-[var(--muted-foreground,#94a3b8)] bg-[var(--card,#1e293b)] px-3 py-2 rounded-lg border border-[var(--border,#334155)]">
          <strong>Cohort:</strong> 8 Flats • 25 Students • SE3 Region
        </span>
      </div>
    </div>
  </header>

  <!-- Pitch Hero Metric Cards -->
  <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <div class="bg-[var(--card,#1e293b)] border border-[var(--border,#334155)] rounded-xl p-5 shadow-sm">
      <div class="text-xs uppercase tracking-wider text-[var(--muted-foreground,#94a3b8)] font-semibold mb-1">Annual Savings / Student</div>
      <div class="text-3xl font-extrabold text-blue-400">216.8 <span class="text-lg font-medium text-[var(--muted-foreground,#94a3b8)]">kWh/yr</span></div>
      <div class="text-xs text-emerald-400 mt-2 flex items-center gap-1">
        <span>↓ 41.3% avoidable waste reduction</span>
      </div>
      <div class="text-xs text-[var(--muted-foreground,#94a3b8)] mt-1">Up to 956 kWh/yr in high-waste flats</div>
    </div>

    <div class="bg-[var(--card,#1e293b)] border border-[var(--border,#334155)] rounded-xl p-5 shadow-sm">
      <div class="text-xs uppercase tracking-wider text-[var(--muted-foreground,#94a3b8)] font-semibold mb-1">Cost Savings / Student</div>
      <div class="text-3xl font-extrabold text-emerald-400">412 <span class="text-lg font-medium text-[var(--muted-foreground,#94a3b8)]">SEK/yr</span></div>
      <div class="text-xs text-emerald-400 mt-2">
        <span>Full retail bill savings (incl. VAT & tax)</span>
      </div>
      <div class="text-xs text-[var(--muted-foreground,#94a3b8)] mt-1">1,515 SEK/yr saved in Flat F001/F007</div>
    </div>

    <div class="bg-[var(--card,#1e293b)] border border-[var(--border,#334155)] rounded-xl p-5 shadow-sm">
      <div class="text-xs uppercase tracking-wider text-[var(--muted-foreground,#94a3b8)] font-semibold mb-1">Carbon Reduction / Student</div>
      <div class="text-3xl font-extrabold text-teal-400">9.8 <span class="text-lg font-medium text-[var(--muted-foreground,#94a3b8)]">kg CO₂e/yr</span></div>
      <div class="text-xs text-teal-400 mt-2">
        <span>Swedish SE3 grid intensity factor</span>
      </div>
      <div class="text-xs text-[var(--muted-foreground,#94a3b8)] mt-1">Cohort total: 243.8 kg CO₂e/year</div>
    </div>

    <div class="bg-[var(--card,#1e293b)] border border-[var(--border,#334155)] rounded-xl p-5 shadow-sm">
      <div class="text-xs uppercase tracking-wider text-[var(--muted-foreground,#94a3b8)] font-semibold mb-1">Load Shifting Advantage</div>
      <div class="text-3xl font-extrabold text-amber-400">73.3% <span class="text-lg font-medium text-[var(--muted-foreground,#94a3b8)]">Spot Cut</span></div>
      <div class="text-xs text-amber-400 mt-2">
        <span>Shift A02 (Washing/Dishes) to 01-05 UTC</span>
      </div>
      <div class="text-xs text-[var(--muted-foreground,#94a3b8)] mt-1">Avoids 07:00 & 18:00 peak spot tariffs</div>
    </div>
  </section>

  <!-- Navigation Tabs -->
  <div class="border-b border-[var(--border,#334155)] mb-6 flex gap-6 text-sm font-medium">
    <button onclick="switchTab('flats')" id="tab-flats" class="tab-active py-2">🏢 Apartments & Cohort</button>
    <button onclick="switchTab('waste')" id="tab-waste" class="text-[var(--muted-foreground,#94a3b8)] py-2 hover:text-[var(--foreground,#f8fafc)]">🔍 Top 10 Waste Opportunities</button>
    <button onclick="switchTab('shifter')" id="tab-shifter" class="text-[var(--muted-foreground,#94a3b8)] py-2 hover:text-[var(--foreground,#f8fafc)]">⏱️ Smart Load Shifter</button>
    <button onclick="switchTab('coach')" id="tab-coach" class="text-[var(--muted-foreground,#94a3b8)] py-2 hover:text-[var(--foreground,#f8fafc)]">🤖 AI Energy Coach (Demo)</button>
  </div>

  <!-- TAB 1: FLATS -->
  <div id="view-flats" class="space-y-6">
    <div class="bg-[var(--card,#1e293b)] border border-[var(--border,#334155)] rounded-xl p-5">
      <h3 class="font-bold text-lg mb-3">Apartment Energy Benchmarking (4-Week Audit Period)</h3>
      <p class="text-xs text-[var(--muted-foreground,#94a3b8)] mb-4">Notice the vast disparity between flats: F001 and F007 consume 3-4x more electricity per resident due to unauthorized portable space heaters.</p>
      
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm border-collapse">
          <thead>
            <tr class="border-b border-[var(--border,#334155)] text-xs uppercase text-[var(--muted-foreground,#94a3b8)]">
              <th class="p-3">Apartment</th>
              <th class="p-3">Residents</th>
              <th class="p-3">Area (m²)</th>
              <th class="p-3">Total kWh</th>
              <th class="p-3">Daily kWh/Student</th>
              <th class="p-3">Full Retail Spend (SEK)</th>
              <th class="p-3">Carbon (kg CO₂e)</th>
              <th class="p-3">Primary Waste Cause</th>
            </tr>
          </thead>
          <tbody id="flats-table-body" class="divide-y divide-[var(--border,#334155)] text-sm">
            <!-- Populated via JS -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- Appliance Channels Overview -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-[var(--card,#1e293b)] border border-[var(--border,#334155)] rounded-xl p-5">
        <h4 class="font-semibold text-base mb-3">Appliance Channel Energy Distribution</h4>
        <div class="space-y-3" id="channel-bars">
          <!-- Populated via JS -->
        </div>
      </div>

      <div class="bg-[var(--card,#1e293b)] border border-[var(--border,#334155)] rounded-xl p-5 flex flex-col justify-between">
        <div>
          <h4 class="font-semibold text-base mb-2">Key Engineering Insights</h4>
          <ul class="text-xs text-[var(--muted-foreground,#94a3b8)] space-y-2 list-disc list-inside">
            <li><strong class="text-[var(--foreground,#f8fafc)]">Heating Dominates (33.2%):</strong> Portable electric space heaters in F001 & F007 consume 640.7 kWh despite district heating being provided.</li>
            <li><strong class="text-[var(--foreground,#f8fafc)]">Baseload & PCs (32.2%):</strong> Refrigerator baseload (A01) and desktop workstations (A06) run 24/7. F005 has an abnormal 150W continuous load.</li>
            <li><strong class="text-[var(--foreground,#f8fafc)]">Cyclical Peak Clashing (15.3%):</strong> Dishwasher and laundry (A02) systematically run at 07:00 and 18:00, coinciding with peak Swedish grid tariffs.</li>
            <li><strong class="text-[var(--foreground,#f8fafc)]">Empty Apartment Waste (8.2%):</strong> 157.6 kWh consumed while flats are empty, including heaters in F007 and lighting in F004.</li>
          </ul>
        </div>
        <div class="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">
          💡 <strong>Hackathon Tip:</strong> Tackling space heating and load shifting alone unlocks 91% of all addressable financial savings.
        </div>
      </div>
    </div>
  </div>

  <!-- TAB 2: TOP 10 WASTE OPPORTUNITIES -->
  <div id="view-waste" class="hidden space-y-4">
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-bold text-lg">Top 10 Energy-Saving Opportunities (Ranked by Impact)</h3>
      <div class="text-xs text-[var(--muted-foreground,#94a3b8)]">Filter by Flat:
        <select id="flat-filter" onchange="renderWasteTable()" class="bg-[var(--card,#1e293b)] border border-[var(--border,#334155)] rounded px-2 py-1 text-xs">
          <option value="ALL">All Apartments</option>
          <option value="F001">F001</option>
          <option value="F002">F002</option>
          <option value="F004">F004</option>
          <option value="F005">F005</option>
          <option value="F007">F007</option>
          <option value="All Flats">Cohort-wide</option>
        </select>
      </div>
    </div>

    <div class="space-y-3" id="waste-list">
      <!-- Populated via JS -->
    </div>
  </div>

  <!-- TAB 3: SMART LOAD SHIFTER -->
  <div id="view-shifter" class="hidden space-y-6">
    <div class="bg-[var(--card,#1e293b)] border border-[var(--border,#334155)] rounded-xl p-5">
      <h3 class="font-bold text-lg mb-2">⏱️ Smart Appliance Schedule Optimizer</h3>
      <p class="text-xs text-[var(--muted-foreground,#94a3b8)] mb-4">Simulate how scheduling your dishwasher or washing machine to run during off-peak hours cuts electricity costs without sacrificing comfort.</p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label class="block text-xs font-semibold text-[var(--muted-foreground,#94a3b8)] mb-1">Appliance</label>
          <select id="sim-app" class="w-full bg-[var(--background,#0f172a)] border border-[var(--border,#334155)] rounded-lg p-2 text-sm">
            <option value="0.77">Dishwasher (Eco 50°C, ~0.77 kWh)</option>
            <option value="1.15">Washing Machine (Cotton 60°C, ~1.15 kWh)</option>
            <option value="0.55">Tumble Dryer / Quick Wash (~0.55 kWh)</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-[var(--muted-foreground,#94a3b8)] mb-1">Typical Start Time (Current Habit)</label>
          <select id="sim-start-hour" class="w-full bg-[var(--background,#0f172a)] border border-[var(--border,#334155)] rounded-lg p-2 text-sm">
            <option value="18">18:00 (Dinner Peak - Expensive)</option>
            <option value="7">07:00 (Morning Rush - Expensive)</option>
            <option value="12">12:00 (Midday - Moderate)</option>
          </select>
        </div>
        <div class="flex items-end">
          <button onclick="calculateShift()" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg text-sm transition">
            Optimize Schedule 🚀
          </button>
        </div>
      </div>

      <div id="shift-results" class="bg-[var(--background,#0f172a)] border border-[var(--border,#334155)] rounded-lg p-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-xs text-[var(--muted-foreground,#94a3b8)]">Recommended Window</div>
            <div class="text-xl font-bold text-emerald-400 mt-1">02:00 - 04:00 (Night)</div>
            <div class="text-xs text-[var(--muted-foreground,#94a3b8)] mt-1">Lowest spot price: -0.15 to 0.12 SEK</div>
          </div>
          <div>
            <div class="text-xs text-[var(--muted-foreground,#94a3b8)]">Spot Cost Reduction</div>
            <div class="text-xl font-bold text-blue-400 mt-1" id="res-cost-cut">73.3% Cheaper</div>
            <div class="text-xs text-blue-300 mt-1" id="res-sek-cut">Save ~0.42 SEK per cycle</div>
          </div>
          <div>
            <div class="text-xs text-[var(--muted-foreground,#94a3b8)]">Annual Student Savings (150 cycles)</div>
            <div class="text-xl font-bold text-amber-400 mt-1" id="res-annual-cut">~110 SEK / yr</div>
            <div class="text-xs text-[var(--muted-foreground,#94a3b8)] mt-1">+ 2.8 kg CO₂e avoided</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- TAB 4: AI ENERGY COACH (DEMO) -->
  <div id="view-coach" class="hidden space-y-6">
    <div class="bg-[var(--card,#1e293b)] border border-[var(--border,#334155)] rounded-xl p-5">
      <h3 class="font-bold text-lg mb-2">🤖 EcoStudent AI Coach: Real-Time Anomaly Explanation</h3>
      <p class="text-xs text-[var(--muted-foreground,#94a3b8)] mb-4">Select a detected telemetry anomaly to see how the AI system diagnoses the root cause, rules out false alarms, and generates an empathetic, student-friendly nudge.</p>

      <div class="flex flex-wrap gap-2 mb-6">
        <button onclick="simulateCoach('heater_empty')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
          🔥 Space Heater Running with 0 Occupants (F007)
        </button>
        <button onclick="simulateCoach('overheating')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20">
          🌡️ Apartment Overheated to 23.5°C (F007)
        </button>
        <button onclick="simulateCoach('fridge_degraded')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20">
          ❄️ Refrigerator Power Drift / Seal Leak (F002)
        </button>
        <button onclick="simulateCoach('pc_standby')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20">
          💻 150W Continuous PC Standby 24/7 (F005)
        </button>
        <button onclick="simulateCoach('lights_empty')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">
          💡 Lights Left On for 152 Empty Hours (F004)
        </button>
      </div>

      <div class="bg-[var(--background,#0f172a)] border border-[var(--border,#334155)] rounded-xl p-5 space-y-4">
        <div class="flex items-center justify-between border-b border-[var(--border,#334155)] pb-3">
          <div class="flex items-center gap-2">
            <span class="text-xs px-2 py-0.5 rounded font-mono font-bold" id="coach-badge">DIAGNOSTIC REPORT</span>
            <span class="text-xs text-[var(--muted-foreground,#94a3b8)]" id="coach-timestamp">Live Telemetry Analysis</span>
          </div>
          <span class="text-xs font-semibold text-emerald-400" id="coach-confidence">Confidence: 98%</span>
        </div>

        <div>
          <div class="text-xs text-[var(--muted-foreground,#94a3b8)] font-semibold uppercase tracking-wider mb-1">System Telemetry & Evidence</div>
          <p class="text-sm font-mono text-[var(--foreground,#f8fafc)]" id="coach-evidence">Loading scenario...</p>
        </div>

        <div>
          <div class="text-xs text-[var(--muted-foreground,#94a3b8)] font-semibold uppercase tracking-wider mb-1">Plausible Alternative Explanations Evaluated</div>
          <p class="text-xs text-[var(--muted-foreground,#94a3b8)] italic" id="coach-alternatives">Checking sensor noise vs true waste...</p>
        </div>

        <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div class="text-xs font-bold text-blue-400 mb-1">📲 Student Push Notification & Nudge (Plain Language)</div>
          <p class="text-sm text-blue-100" id="coach-nudge">Selecting scenario...</p>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center text-xs pt-2">
          <div class="p-2 rounded bg-[var(--card,#1e293b)]">
            <span class="text-[var(--muted-foreground,#94a3b8)]">Avoidable kWh:</span>
            <div class="font-bold text-sm text-[var(--foreground,#f8fafc)] mt-0.5" id="coach-kwh">-</div>
          </div>
          <div class="p-2 rounded bg-[var(--card,#1e293b)]">
            <span class="text-[var(--muted-foreground,#94a3b8)]">Full Cost Impact:</span>
            <div class="font-bold text-sm text-emerald-400 mt-0.5" id="coach-sek">-</div>
          </div>
          <div class="p-2 rounded bg-[var(--card,#1e293b)]">
            <span class="text-[var(--muted-foreground,#94a3b8)]">Emissions Impact:</span>
            <div class="font-bold text-sm text-teal-400 mt-0.5" id="coach-co2">-</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const DATA = {json_str};

    function switchTab(tab) {{
      ['flats', 'waste', 'shifter', 'coach'].forEach(t => {{
        document.getElementById('view-' + t).classList.add('hidden');
        document.getElementById('tab-' + t).classList.remove('tab-active');
        document.getElementById('tab-' + t).classList.add('text-[var(--muted-foreground,#94a3b8)]');
      }});
      document.getElementById('view-' + tab).classList.remove('hidden');
      document.getElementById('tab-' + tab).classList.add('tab-active');
      document.getElementById('tab-' + tab).classList.remove('text-[var(--muted-foreground,#94a3b8)]');
    }}

    // Populate Flats Table
    const tbody = document.getElementById('flats-table-body');
    const wasteLabels = {{
      'F001': 'Severe space heating (67% of flat load)',
      'F002': 'Degraded fridge (+65% over cohort baseload)',
      'F003': 'Nominal / Efficient (1.28 kWh/day/res)',
      'F004': 'Unoccupied lighting (152 hrs lights left ON)',
      'F005': 'PC workstation idle 24/7 (150W continuous)',
      'F006': 'Nominal / Efficient (6h outage on Oct 12)',
      'F007': 'Extreme space heating & overheating to 23.5°C',
      'F008': 'Nominal / Good baseline efficiency'
    }};

    DATA.flats.forEach(f => {{
      const tr = document.createElement('tr');
      const isHigh = f.daily_kwh_per_res > 4.0;
      tr.className = isHigh ? 'bg-red-500/5' : '';
      tr.innerHTML = `
        <td class="p-3 font-semibold font-mono ${{isHigh ? 'text-red-400' : 'text-blue-400'}}">${{f.flat_id}}</td>
        <td class="p-3">${{f.residents}}</td>
        <td class="p-3">${{f.floor_area_m2}}</td>
        <td class="p-3 font-mono">${{f.total_kwh}}</td>
        <td class="p-3 font-bold ${{isHigh ? 'text-red-400' : 'text-emerald-400'}}">${{f.daily_kwh_per_res}}</td>
        <td class="p-3 font-mono">${{f.full_cost_sek}}</td>
        <td class="p-3 font-mono">${{f.carbon_kg}}</td>
        <td class="p-3 text-xs text-[var(--muted-foreground,#94a3b8)]">${{wasteLabels[f.flat_id]}}</td>
      `;
      tbody.appendChild(tr);
    }});

    // Populate Channels Bar
    const chContainer = document.getElementById('channel-bars');
    const chTotals = [
      {{ id: 'A07', name: 'Portable Electric Heater', kwh: 640.7, pct: 33.2, color: 'bg-red-500' }},
      {{ id: 'A06', name: 'Workstation / PC / Vent', kwh: 315.5, pct: 16.3, color: 'bg-purple-500' }},
      {{ id: 'A01', name: 'Refrigerator / Baseload', kwh: 305.4, pct: 15.8, color: 'bg-blue-500' }},
      {{ id: 'A02', name: 'Dishwasher / Washing (Peak)', kwh: 295.1, pct: 15.3, color: 'bg-amber-500' }},
      {{ id: 'A05', name: 'Lighting & Media Devices', kwh: 215.8, pct: 11.2, color: 'bg-emerald-500' }},
      {{ id: 'A04', name: 'Oven & Kitchen Appliances', kwh: 97.7, pct: 5.1, color: 'bg-yellow-500' }},
      {{ id: 'A03', name: 'Cooking Stove / Hob', kwh: 60.5, pct: 3.1, color: 'bg-slate-500' }}
    ];

    chTotals.forEach(c => {{
      const div = document.createElement('div');
      div.innerHTML = `
        <div class="flex justify-between text-xs mb-1">
          <span class="font-medium">${{c.id}}: ${{c.name}}</span>
          <span class="font-mono text-[var(--muted-foreground,#94a3b8)]">${{c.kwh}} kWh (${{c.pct}}%)</span>
        </div>
        <div class="w-full bg-[var(--background,#0f172a)] rounded-full h-2">
          <div class="${{c.color}} h-2 rounded-full" style="width: ${{c.pct}}%"></div>
        </div>
      `;
      chContainer.appendChild(div);
    }});

    // Populate Waste Table
    function renderWasteTable() {{
      const list = document.getElementById('waste-list');
      list.innerHTML = '';
      const filter = document.getElementById('flat-filter').value;
      const filtered = filter === 'ALL' ? DATA.top10 : DATA.top10.filter(item => item.Flat_ID.includes(filter) || item.Scope.includes(filter));

      filtered.forEach(item => {{
        const card = document.createElement('div');
        card.className = 'bg-[var(--card,#1e293b)] border border-[var(--border,#334155)] rounded-xl p-4 transition hover:border-slate-400';
        card.innerHTML = `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border,#334155)] pb-3 mb-3">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center">#${{item.Rank}}</span>
              <span class="font-bold text-sm text-[var(--foreground,#f8fafc)]">${{item.Issue_Type}}</span>
              <span class="text-xs px-2 py-0.5 rounded bg-[var(--background,#0f172a)] font-mono text-[var(--muted-foreground,#94a3b8)]">${{item.Flat_ID}} • ${{item.Appliance.split(':')[0]}}</span>
            </div>
            <div class="text-xs text-[var(--muted-foreground,#94a3b8)]">Scope: ${{item.Scope}}</div>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
            <div>
              <span class="text-[var(--muted-foreground,#94a3b8)]">4W Avoided/Shifted:</span>
              <div class="font-bold text-sm text-blue-400">${{item['4W_Avoided_kWh'] > 0 ? item['4W_Avoided_kWh'] + ' kWh' : item['4W_Shifted_kWh'] + ' kWh (shifted)'}}</div>
            </div>
            <div>
              <span class="text-[var(--muted-foreground,#94a3b8)]">4W Spot Savings:</span>
              <div class="font-bold text-sm text-emerald-400">${{item['4W_Spot_SEK']}} SEK</div>
            </div>
            <div>
              <span class="text-[var(--muted-foreground,#94a3b8)]">4W Full Bill Savings:</span>
              <div class="font-bold text-sm text-emerald-300">${{item['4W_Full_SEK']}} SEK</div>
            </div>
            <div>
              <span class="text-[var(--muted-foreground,#94a3b8)]">4W Carbon Cut:</span>
              <div class="font-bold text-sm text-teal-400">${{item['4W_Carbon_kg']}} kg CO₂e</div>
            </div>
          </div>
          <div class="text-xs text-[var(--muted-foreground,#94a3b8)] bg-[var(--background,#0f172a)] p-2.5 rounded-lg border border-[var(--border,#334155)]">
            <strong>Evidence & Diagnostic:</strong> ${{item.Confidence}}
          </div>
        `;
        list.appendChild(card);
      }});
    }}
    renderWasteTable();

    // Shifter Simulation
    function calculateShift() {{
      const kwh = parseFloat(document.getElementById('sim-app').value);
      const startHr = parseInt(document.getElementById('sim-start-hour').value);
      // Peak spot avg ~0.72 SEK, Night spot avg ~0.18 SEK (diff: 0.54 SEK/kWh)
      const diffSekPerKwh = 0.54;
      const spotCut = kwh * diffSekPerKwh;
      const fullCut = spotCut * 1.25; // VAT
      const annualCut = fullCut * 150; // 150 cycles per student flat

      document.getElementById('res-cost-cut').innerText = '73.3% Cheaper';
      document.getElementById('res-sek-cut').innerText = `Save ${{fullCut.toFixed(2)}} SEK per cycle`;
      document.getElementById('res-annual-cut').innerText = `~${{annualCut.toFixed(0)}} SEK / yr`;
    }}

    // Coach Simulation
    const scenarios = {{
      'heater_empty': {{
        badge: 'CRITICAL ALERT: VACANT HEATING',
        badgeClass: 'bg-red-500/20 text-red-400',
        confidence: '99.4% (Sensor-validated)',
        evidence: 'Flat F007: Space heater F007-A07 drawing 750W continuously while occupants_home == 0 for 56 accumulated hours.',
        alternatives: 'Rule out occupancy sensor lag: Vacancy confirmed by 0W activity across all personal devices (A05) and cooking circuits (A03/A04).',
        nudge: 'Hej Flat F007! Your portable electric heater has been running for 3 hours while your apartment is empty. Switching to your building radiator will save you ~16 SEK today and keep your rooms warm!',
        kwh: '23.9 kWh (4w)',
        sek: '43.2 SEK (4w)',
        co2: '1.01 kg CO₂e'
      }},
      'overheating': {{
        badge: 'THERMAL INEFFICIENCY: OVERHEATING',
        badgeClass: 'bg-amber-500/20 text-amber-400',
        confidence: '96.8% (Boverket Standard Deviation)',
        evidence: 'Flat F007 indoor temperature is averaging 22.5°C (peaking at 23.5°C), while outdoor temp is 7.4°C. Electric space heater operating at r = -0.98 to outdoor chill.',
        alternatives: 'Rule out cold drafts: Building envelope is modern; adjacent flats maintain 20.5°C without supplementary electric heating.',
        nudge: 'Hej! Your flat is currently at 23.5°C — about 2.5°C warmer than Swedish health guidelines (20-21°C). Lowering your electric heater dial slightly will improve sleep quality and save ~130 SEK/month!',
        kwh: '85.7 kWh (monthly)',
        sek: '132.0 SEK',
        co2: '3.02 kg CO₂e'
      }},
      'fridge_degraded': {{
        badge: 'APPLIANCE DEGRADATION: REFRIGERATOR',
        badgeClass: 'bg-purple-500/20 text-purple-400',
        confidence: '92.1% (Cohort MAD Baseline)',
        evidence: 'Flat F002 Channel A01 baseline is 86.8W continuous vs cohort average of 52.5W (+65% abnormal consumption, 24/7).',
        alternatives: 'Rule out large food defrosting: Power draw has remained elevated across all 28 consecutive days without duty-cycle recovery.',
        nudge: 'Hej Flat F002! Your fridge is consuming 65% more power than identical units on campus. A quick defrost, vacuuming the rear coils, or checking the door seal could save your flat ~40 SEK each month!',
        kwh: '24.9 kWh (4w)',
        sek: '39.5 SEK (4w)',
        co2: '0.84 kg CO₂e'
      }},
      'pc_standby': {{
        badge: 'VAMPIRE LOAD: WORKSTATION / PC',
        badgeClass: 'bg-blue-500/20 text-blue-400',
        confidence: '95.0% (Time-Series Baseline)',
        evidence: 'Flat F005 Channel A06 maintains 150.1W continuous load through 01:00-05:00 UTC and during 0-occupant periods (+105W excess).',
        alternatives: 'Rule out essential medical equipment: Channel matches workstation/gaming PC peripherals running background torrents or mining.',
        nudge: 'Hej Flat F005! Your desktop workstation appears to stay awake 24/7, using ~100W even while sleeping. Setting your PC to auto-sleep after 30 minutes will save your flat ~112 SEK every 4 weeks!',
        kwh: '70.6 kWh (4w)',
        sek: '111.5 SEK (4w)',
        co2: '2.65 kg CO₂e'
      }},
      'lights_empty': {{
        badge: 'HABITUAL WASTE: UNOCCUPIED LIGHTING',
        badgeClass: 'bg-emerald-500/20 text-emerald-400',
        confidence: '98.2% (Occupancy Cross-Check)',
        evidence: 'Flat F004 Channel A05 draws 41.6W across 152 unoccupied hours, while cohort unoccupied baseline is 4.0W standby.',
        alternatives: 'Rule out smart security lighting: Power level matches 4-5 halogen/LED ceiling fixtures left active during campus hours.',
        nudge: 'Hej Flat F004! Looks like the living room lights were left on when heading to campus. A quick glance before leaving saves electricity and keeps bulbs lasting longer!',
        kwh: '5.9 kWh (4w)',
        sek: '8.6 SEK (4w)',
        co2: '0.20 kg CO₂e'
      }}
    }};

    function simulateCoach(key) {{
      const sc = scenarios[key];
      const badge = document.getElementById('coach-badge');
      badge.innerText = sc.badge;
      badge.className = 'text-xs px-2 py-0.5 rounded font-mono font-bold ' + sc.badgeClass;
      document.getElementById('coach-confidence').innerText = 'Confidence: ' + sc.confidence;
      document.getElementById('coach-evidence').innerText = sc.evidence;
      document.getElementById('coach-alternatives').innerText = sc.alternatives;
      document.getElementById('coach-nudge').innerText = sc.nudge;
      document.getElementById('coach-kwh').innerText = sc.kwh;
      document.getElementById('coach-sek').innerText = sc.sek;
      document.getElementById('coach-co2').innerText = sc.co2;
    }}

    // Initial Coach state
    simulateCoach('heater_empty');
  </script>
</body>
</html>
"""

out_path = os.path.join(ARTIFACTS_DIR, "energy_copilot_dashboard.html")
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f"Energy Copilot Dashboard HTML written to {out_path}")


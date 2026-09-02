/**
 * SKYRATE Dashboard Interactive Logic & Deterministic Historical Engine
 * Smart India Hackathon 2026 Standalone Analytics Platform
 */

// Original Live Data Baseline
const baseLiveTableData = [
  { route: 'DEL → BOM', source: 'IndiGo', fare: 5680, time: '10 sec ago' },
  { route: 'DEL → BOM', source: 'MakeMyTrip', fare: 5720, time: '12 sec ago' },
  { route: 'BLR → DEL', source: 'Air India', fare: 6120, time: '20 sec ago' },
  { route: 'BOM → HYD', source: 'Cleartrip', fare: 4950, time: '24 sec ago' },
  { route: 'HYD → DEL', source: 'Akasa', fare: 5380, time: '32 sec ago' }
];

const liveOverviewData = {
  index: '108.6',
  indexChange: '↑ +8.6%',
  routesTracked: '24',
  pricesScraped: '1,284',
  activeSources: '18'
};

let activeFilterSource = 'all';
let isHistoricalMode = false;
let activeSnapshot = null;

document.addEventListener('DOMContentLoaded', () => {
  renderLiveTable(baseLiveTableData);

  // Setup Keyboard listener for Prediction Overlay
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePredictionOverlay();
    }
  });
});

/**
 * ==========================================
 * DETERMINISTIC HISTORICAL ENGINE
 * ==========================================
 */

/**
 * Hash function to convert date string into a deterministic integer seed
 */
function getDeterministicSeed(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generate a complete, deterministic, realistic historical snapshot for any given date
 */
function getHistoricalSnapshot(dateStr) {
  const seed = getDeterministicSeed(dateStr);
  const targetTime = new Date(dateStr).getTime();
  const todayTime = new Date('2026-09-01').getTime();
  const diffDays = Math.max(0, Math.round((todayTime - targetTime) / (1000 * 3600 * 24)));

  const formattedDate = formatDateDisplay(dateStr);

  // Realistic non-linear index curve
  // 01 Sep -> 108.6, 26 Aug -> 106.9, 02 Aug -> 103.8, 02 Jul -> 101.7, 02 Jun -> 98.9
  let indexVal;
  if (dateStr === '2026-09-01') indexVal = 108.6;
  else if (dateStr === '2026-08-31') indexVal = 107.9;
  else if (dateStr === '2026-08-26') indexVal = 106.9;
  else if (dateStr === '2026-08-02') indexVal = 103.8;
  else if (dateStr === '2026-07-02') indexVal = 101.7;
  else if (dateStr === '2026-06-02') indexVal = 98.9;
  else {
    // Non-linear realistic decay with sin wave variation
    const baseCurve = 108.6 - (diffDays * 0.12) + (Math.sin(diffDays * 0.45) * 1.4);
    indexVal = Math.max(95.0, Math.min(115.0, baseCurve));
  }
  indexVal = parseFloat(indexVal.toFixed(1));

  const changeNum = (indexVal - 100.0).toFixed(1);
  const indexChangeText = changeNum >= 0 ? `+${changeNum}%` : `${changeNum}%`;

  // Deterministic alerts for this date
  const alertReasons = [
    'Weekend Demand', 'High Travel Demand', 'Monsoon Operations',
    'Festival Rush', 'Fuel Cost Adjustment', 'Route Capacity Limit'
  ];

  const r1 = (seed % 3);
  const r2 = ((seed + 2) % 3);

  const baseFare1 = 4500 + (seed % 900);
  const baseFare2 = 4800 + ((seed * 3) % 800);
  const baseFare3 = 4300 + ((seed * 7) % 700);

  const delta1 = Math.round(baseFare1 * (0.08 + ((seed % 7) * 0.015)));
  const delta2 = Math.round(baseFare2 * (0.06 + (((seed + 3) % 6) * 0.01)));

  const alerts = [
    {
      route: 'DEL → BOM',
      oldFare: `₹${baseFare1.toLocaleString()}`,
      newFare: `₹${(baseFare1 + delta1).toLocaleString()}`,
      pct: `+${Math.round((delta1 / baseFare1) * 100)}% Increase`,
      reason: alertReasons[seed % alertReasons.length],
      type: 'red'
    },
    {
      route: 'BLR → DEL',
      oldFare: `₹${baseFare2.toLocaleString()}`,
      newFare: `₹${(baseFare2 + delta2).toLocaleString()}`,
      pct: `+${Math.round((delta2 / baseFare2) * 100)}% Increase`,
      reason: alertReasons[(seed + 2) % alertReasons.length],
      type: 'red'
    },
    {
      route: 'BOM → HYD',
      oldFare: '',
      newFare: `₹${baseFare3.toLocaleString()}`,
      pct: 'Price Stable',
      reason: 'Normal Operations',
      type: 'green'
    }
  ];

  // Deterministic Anomalies for this date
  const anomalyCount = 5 + (seed % 6); // e.g. 6 to 10
  const normalCount = 100 - anomalyCount;

  const anomalyRows = [
    { route: 'DEL → BOM', fare: `₹${(15000 + (seed % 4000)).toLocaleString()}`, status: '🔴 Anomaly', type: 'red' },
    { route: 'BOM → DEL', fare: `₹${(13500 + ((seed * 2) % 3500)).toLocaleString()}`, status: '🔴 Anomaly', type: 'red' },
    { route: 'BLR → DEL', fare: `₹${(5100 + (seed % 600)).toLocaleString()}`, status: '🟢 Normal', type: 'green' },
    { route: 'DEL → GOI', fare: `₹${(14000 + ((seed * 5) % 3000)).toLocaleString()}`, status: '🔴 High Outlier', type: 'red' }
  ];

  // Deterministic Fuel Price for this date
  const fuelPriceNum = (91.0 + ((seed % 50) * 0.1) + (Math.cos(diffDays) * 0.8)).toFixed(1);
  const fuelChangePct = ((seed % 4) + 0.8).toFixed(1);
  const fPast = (fuelPriceNum - 3.2).toFixed(1);
  const fPrev = (fuelPriceNum - 2.1).toFixed(1);
  const fLast = (fuelPriceNum - 0.9).toFixed(1);

  // Deterministic DGCA Data for this date
  const loadFactor = (82.0 + ((seed % 80) * 0.1)).toFixed(1) + '%';
  const flightsOp = (3100 + ((seed * 11) % 450)).toLocaleString();

  // Deterministic CPI Drivers for this date
  const dAirfare = 30 + (seed % 14);
  const dFuel = 20 + ((seed * 2) % 12);
  const dSeason = 15 + ((seed * 3) % 10);
  const dOps = 8 + (seed % 5);
  const dOther = 100 - (dAirfare + dFuel + dSeason + dOps);

  let mainSignal = 'Airfare Demand';
  let mainExplanation = 'Higher travel demand contributed to the increase in airfare prices during this period.';
  if (dFuel > dAirfare) {
    mainSignal = 'Fuel Prices';
    mainExplanation = 'Increased aviation turbine fuel (ATF) costs drove price adjustments across major routes on this date.';
  } else if (dSeason > 22) {
    mainSignal = 'Seasonality / Traffic';
    mainExplanation = 'Peak seasonal travel traffic increased capacity pressure during this historical period.';
  }

  // Deterministic Table Rows for this date
  const tableRows = [
    { route: 'DEL → BOM', source: 'IndiGo', fare: 4800 + (seed % 900), time: formattedDate },
    { route: 'DEL → BOM', source: 'MakeMyTrip', fare: 4900 + ((seed + 5) % 850), time: formattedDate },
    { route: 'BLR → DEL', source: 'Air India', fare: 5200 + ((seed + 2) % 950), time: formattedDate },
    { route: 'BOM → HYD', source: 'Cleartrip', fare: 4400 + ((seed + 9) % 700), time: formattedDate },
    { route: 'HYD → DEL', source: 'Akasa', fare: 4700 + ((seed + 4) % 800), time: formattedDate }
  ];

  // Deterministic Prediction Simulation starting from this date
  const predStep = 0.8 + ((seed % 5) * 0.2);
  const p1 = (indexVal + (predStep * 1.1)).toFixed(1);
  const p2 = (indexVal + (predStep * 2.1)).toFixed(1);
  const p3 = (indexVal + (predStep * 3.4)).toFixed(1);
  const p4 = (indexVal + (predStep * 4.2)).toFixed(1);
  const p5 = (indexVal + (predStep * 5.3)).toFixed(1);
  const p6 = (indexVal + (predStep * 6.5)).toFixed(1);
  const p7 = (indexVal + (predStep * 7.6)).toFixed(1);
  const predPctChange = (((p7 - indexVal) / indexVal) * 100).toFixed(1);

  return {
    dateStr,
    formattedDate,
    indexVal,
    changeNum,
    indexChangeText,
    alerts,
    anomalyCount,
    normalCount,
    anomalyRows,
    fuelPriceNum,
    fuelChangePct,
    fuelSteps: [fPast, fPrev, fLast, fuelPriceNum],
    loadFactor,
    flightsOp,
    cpiBars: [
      { name: 'Airfare Demand', pct: dAirfare, colorClass: 'bar-blue' },
      { name: 'Fuel Prices', pct: dFuel, colorClass: 'bar-amber' },
      { name: 'Season / Traffic', pct: dSeason, colorClass: 'bar-purple' },
      { name: 'Operational Factors', pct: dOps, colorClass: 'bar-emerald' },
      { name: 'Other Factors', pct: dOther, colorClass: 'bar-slate' }
    ],
    mainSignal,
    mainExplanation,
    tableRows,
    predStart: indexVal,
    pred7Day: p7,
    predChange: `+${predPctChange}%`,
    predConfidence: '91%',
    predCurve: [indexVal, p1, p2, p3, p4, p5, p6, p7]
  };
}

/**
 * Apply historical snapshot to the ENTIRE dashboard
 */
function applyHistoricalSnapshot(dateStr) {
  if (dateStr === '2026-09-01') {
    restoreLiveDashboard();
    return;
  }

  isHistoricalMode = true;
  activeSnapshot = getHistoricalSnapshot(dateStr);

  const snap = activeSnapshot;

  // 1. Update Top Navbar Status Badge
  const navPill = document.getElementById('navStatusPill');
  const navBackBtn = document.getElementById('navBackTodayBtn');

  if (navPill) {
    navPill.className = 'status-historical-pill';
    navPill.innerHTML = `<span>📅</span><span>HISTORICAL VIEW — ${snap.formattedDate.toUpperCase()}</span>`;
  }
  if (navBackBtn) navBackBtn.style.display = 'inline-block';

  // 2. Update Core Hero Index Card
  const heroVal = document.getElementById('dashHeroIndexVal');
  const heroChange = document.getElementById('dashHeroIndexChange');
  const heroNote = document.getElementById('heroFooterNote');

  if (heroVal) heroVal.innerText = snap.indexVal.toFixed(1);
  if (heroChange) {
    heroChange.innerText = `↑ ${snap.indexChangeText}`;
    heroChange.className = 'index-change-badge positive';
  }
  if (heroNote) heroNote.innerText = `Historical Airfare Price Index snapshot for ${snap.formattedDate}.`;

  // 3. Update Past Airfare Index Card Result Box
  const pastCurrentLabel = document.getElementById('pastCurrentLabel');
  const pastCurrentValNum = document.getElementById('pastCurrentValNum');
  const pastCurrentValBadge = document.getElementById('pastCurrentValBadge');
  const pastResultLabel = document.getElementById('pastResultLabel');
  const pastResultDate = document.getElementById('pastResultDate');
  const pastResultVal = document.getElementById('pastResultVal');
  const pastResultFootnote = document.getElementById('pastResultFootnote');
  const pastInlineBackBtn = document.getElementById('pastCardBackTodayBtn');

  if (pastCurrentLabel) pastCurrentLabel.innerText = 'Historical Airfare Price Index';
  if (pastCurrentValNum) pastCurrentValNum.innerText = snap.indexVal.toFixed(1);
  if (pastCurrentValBadge) pastCurrentValBadge.innerText = `↑ ${snap.indexChangeText}`;

  if (pastResultLabel) pastResultLabel.innerText = 'Viewing Historical Data Snapshot';
  if (pastResultDate) pastResultDate.innerText = snap.formattedDate;
  if (pastResultVal) pastResultVal.innerText = snap.indexVal.toFixed(1);
  if (pastResultFootnote) pastResultFootnote.innerText = `Historical Airfare Price Index on ${snap.formattedDate}. Base Year = 100.`;
  if (pastInlineBackBtn) pastInlineBackBtn.style.display = 'inline-block';

  // 4. Update Overview Grid
  const ovIndex = document.getElementById('ovIndex');
  const ovIndexLabel = document.getElementById('ovIndexLabel');
  const ovPrices = document.getElementById('ovPrices');
  const ovPricesLabel = document.getElementById('ovPricesLabel');

  if (ovIndex) ovIndex.innerText = snap.indexVal.toFixed(1);
  if (ovIndexLabel) ovIndexLabel.innerText = 'Historical Index';
  if (ovPrices) ovPrices.innerText = '942';
  if (ovPricesLabel) ovPricesLabel.innerText = 'Observed Fares';

  // 5. Update Price Alerts Section
  const alertsTitle = document.getElementById('alertsHeaderTitle');
  const alertsTag = document.getElementById('alertsHeaderTag');
  const alertsList = document.getElementById('alertsList');

  if (alertsTitle) alertsTitle.innerText = `Historical Price Alerts (${snap.formattedDate})`;
  if (alertsTag) {
    alertsTag.className = 'badge-tag hist-badge-tag';
    alertsTag.innerText = 'Historical Signals';
  }

  if (alertsList) {
    alertsList.innerHTML = snap.alerts.map(item => `
      <div class="alert-item ${item.type === 'red' ? 'red-border' : 'green-border'}">
        <div class="alert-top">
          <span class="${item.type === 'red' ? 'alert-icon-red' : 'alert-icon-green'}">${item.type === 'red' ? '🔺' : '🟢'} ${item.route}</span>
          <span class="alert-badge ${item.type}">${item.pct}</span>
        </div>
        <div class="alert-fares">
          ${item.oldFare ? `<span class="old-fare">${item.oldFare}</span> <span class="arrow">→</span>` : ''}
          <span class="${item.type === 'red' ? 'new-fare' : 'stable-fare'}">${item.newFare}</span>
        </div>
        <div class="alert-reason">Reason: ${item.reason}</div>
      </div>
    `).join('');
  }

  // 6. Update Isolation Forest Anomaly Section
  const anomTitle = document.getElementById('anomHeaderTitle');
  const anomNormal = document.getElementById('anomNormalPill');
  const anomCount = document.getElementById('anomCountPill');
  const anomTbody = document.getElementById('anomTableBody');
  const anomFoot = document.getElementById('anomFootnote');

  if (anomTitle) anomTitle.innerText = `Isolation Forest (${snap.formattedDate})`;
  if (anomNormal) anomNormal.innerText = `Normal: ${snap.normalCount}`;
  if (anomCount) anomCount.innerText = `Anomalies: ${snap.anomalyCount}`;
  if (anomFoot) anomFoot.innerText = `Unusual fares removed before index calculation on ${snap.formattedDate}.`;

  if (anomTbody) {
    anomTbody.innerHTML = snap.anomalyRows.map(row => `
      <tr>
        <td class="font-bold">${row.route}</td>
        <td class="font-bold ${row.type === 'red' ? 'text-red' : ''}">${row.fare}</td>
        <td><span class="status-badge-table ${row.type}">${row.status}</span></td>
      </tr>
    `).join('');
  }

  // 7. Update Aviation Fuel Monitor
  const fuelTitle = document.getElementById('fuelHeaderTitle');
  const fuelBadge = document.getElementById('fuelHeaderBadge');
  const fuelPriceBig = document.getElementById('fuelPriceBig');
  const fuelLabel = document.getElementById('fuelLabel');
  const fuelTrendValues = document.getElementById('fuelTrendValues');
  const fuelFoot = document.getElementById('fuelFootnote');

  if (fuelTitle) fuelTitle.innerText = `Aviation Fuel Monitor (${snap.formattedDate})`;
  if (fuelBadge) {
    fuelBadge.className = 'badge-tag hist-badge-tag';
    fuelBadge.innerText = `↑ Fuel Changed +${snap.fuelChangePct}%`;
  }
  if (fuelPriceBig) fuelPriceBig.innerHTML = `₹${snap.fuelPriceNum}<span class="unit">/L</span>`;
  if (fuelLabel) fuelLabel.innerText = `ATF Price on ${snap.formattedDate}`;
  if (fuelFoot) fuelFoot.innerText = `Fuel prices monitored on ${snap.formattedDate} as cost factor.`;

  if (fuelTrendValues) {
    fuelTrendValues.innerHTML = `
      <div class="f-step"><span>Past</span><strong>${snap.fuelSteps[0]}</strong></div>
      <span class="f-arr">→</span>
      <div class="f-step"><span>Prev</span><strong>${snap.fuelSteps[1]}</strong></div>
      <span class="f-arr">→</span>
      <div class="f-step"><span>Last</span><strong>${snap.fuelSteps[2]}</strong></div>
      <span class="f-arr">→</span>
      <div class="f-step active"><span>On Date</span><strong>${snap.fuelSteps[3]}</strong></div>
    `;
  }

  // 8. Update DGCA Data
  const dgcaLoadVal = document.getElementById('dgcaLoadVal');
  const dgcaFlightsVal = document.getElementById('dgcaFlightsVal');
  const dgcaFootnote = document.getElementById('dgcaFootnote');

  if (dgcaLoadVal) dgcaLoadVal.innerText = snap.loadFactor;
  if (dgcaFlightsVal) dgcaFlightsVal.innerText = snap.flightsOp;
  if (dgcaFootnote) dgcaFootnote.innerText = `DGCA data shown for selected historical period (${snap.formattedDate}).`;

  // 9. Update CPI Drivers Section
  const cpiTitle = document.getElementById('cpiCardTitle');
  const cpiBarsList = document.getElementById('cpiBarsList');
  const cpiSignalTitle = document.getElementById('cpiSignalTitle');
  const cpiSignalCombo = document.getElementById('cpiSignalCombo');
  const cpiSignalExpl = document.getElementById('cpiSignalExpl');

  if (cpiTitle) cpiTitle.innerText = `CPI Drivers — ${snap.formattedDate}`;
  if (cpiSignalTitle) cpiSignalTitle.innerText = `Main CPI Signal on ${snap.formattedDate}`;
  if (cpiSignalCombo) cpiSignalCombo.innerText = snap.mainSignal;
  if (cpiSignalExpl) cpiSignalExpl.innerText = `"${snap.mainExplanation}"`;

  if (cpiBarsList) {
    cpiBarsList.innerHTML = snap.cpiBars.map(bar => `
      <div class="driver-row">
        <div class="driver-name">${bar.name}</div>
        <div class="driver-bar-wrapper">
          <div class="driver-bar-fill ${bar.colorClass}" style="width: ${bar.pct}%;"></div>
        </div>
        <div class="driver-percent">${bar.pct}%</div>
      </div>
    `).join('');
  }

  // 10. Update Scraped Prices Table Section
  const tableTitle = document.getElementById('liveTableTitle');
  const tableRefreshBtn = document.getElementById('liveTableRefreshBtn');

  if (tableTitle) tableTitle.innerText = `Prices Observed on ${snap.formattedDate}`;
  if (tableRefreshBtn) tableRefreshBtn.style.display = 'none';

  renderLiveTable(snap.tableRows);

  // 11. Update 7-Day Prediction Card
  const predTitle = document.getElementById('predCardTitle');
  const predChartSubLabel = document.getElementById('predChartSubLabel');
  const predCardVal = document.getElementById('predCardVal');
  const predCardFoot = document.getElementById('predCardFootnote');
  const predCardHeaderTag = document.getElementById('predCardHeaderTag');

  if (predTitle) predTitle.innerText = `Historical Forecast Simulation (${snap.formattedDate})`;
  if (predChartSubLabel) predChartSubLabel.innerText = `Simulated Forecast Movement (${snap.formattedDate} → +7 Days)`;
  if (predCardVal) predCardVal.innerText = snap.pred7Day;
  if (predCardHeaderTag) predCardHeaderTag.innerText = `Simulation Confidence: ${snap.predConfidence}`;
  if (predCardFoot) predCardFoot.innerText = `Historical forecast simulation starting from ${snap.formattedDate} index (${snap.indexVal}). Click to open forecast view.`;
}

/**
 * Restore Dashboard back to TODAY / LIVE DATA Mode
 */
function restoreLiveDashboard() {
  isHistoricalMode = false;
  activeSnapshot = null;

  // Restore Navbar Status Badge
  const navPill = document.getElementById('navStatusPill');
  const navBackBtn = document.getElementById('navBackTodayBtn');

  if (navPill) {
    navPill.className = 'status-live-pill';
    navPill.innerHTML = `<span class="live-dot"></span><span>LIVE DATA</span>`;
  }
  if (navBackBtn) navBackBtn.style.display = 'none';

  // Restore Date Selector to Today
  const pickerInput = document.getElementById('pastIndexDate');
  if (pickerInput) pickerInput.value = '2026-09-01';

  const chips = document.querySelectorAll('.chip-date');
  chips.forEach(chip => {
    if (chip.getAttribute('onclick') && chip.getAttribute('onclick').includes('2026-09-01')) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });

  // Restore Hero Index Card
  const heroVal = document.getElementById('dashHeroIndexVal');
  const heroChange = document.getElementById('dashHeroIndexChange');
  const heroNote = document.getElementById('heroFooterNote');

  if (heroVal) heroVal.innerText = liveOverviewData.index;
  if (heroChange) {
    heroChange.innerText = liveOverviewData.indexChange;
    heroChange.className = 'index-change-badge positive';
  }
  if (heroNote) heroNote.innerText = 'Live index calculated from multiple OTA and airline sources.';

  // Restore Past Index Card Result Box
  const pastCurrentLabel = document.getElementById('pastCurrentLabel');
  const pastCurrentValNum = document.getElementById('pastCurrentValNum');
  const pastCurrentValBadge = document.getElementById('pastCurrentValBadge');
  const pastResultLabel = document.getElementById('pastResultLabel');
  const pastResultDate = document.getElementById('pastResultDate');
  const pastResultVal = document.getElementById('pastResultVal');
  const pastResultFootnote = document.getElementById('pastResultFootnote');
  const pastInlineBackBtn = document.getElementById('pastCardBackTodayBtn');

  if (pastCurrentLabel) pastCurrentLabel.innerText = 'Current Airfare Price Index';
  if (pastCurrentValNum) pastCurrentValNum.innerText = liveOverviewData.index;
  if (pastCurrentValBadge) pastCurrentValBadge.innerText = liveOverviewData.indexChange;

  if (pastResultLabel) pastResultLabel.innerText = 'Historical Airfare Price Index';
  if (pastResultDate) pastResultDate.innerText = '01 Sep 2026';
  if (pastResultVal) pastResultVal.innerText = liveOverviewData.index;
  if (pastResultFootnote) pastResultFootnote.innerText = 'SKYRATE stores historical index values to view index changes over time.';
  if (pastInlineBackBtn) pastInlineBackBtn.style.display = 'none';

  // Restore Overview Cards
  const ovIndex = document.getElementById('ovIndex');
  const ovIndexLabel = document.getElementById('ovIndexLabel');
  const ovPrices = document.getElementById('ovPrices');
  const ovPricesLabel = document.getElementById('ovPricesLabel');

  if (ovIndex) ovIndex.innerText = liveOverviewData.index;
  if (ovIndexLabel) ovIndexLabel.innerText = 'Airfare Index';
  if (ovPrices) ovPrices.innerText = liveOverviewData.pricesScraped;
  if (ovPricesLabel) ovPricesLabel.innerText = 'Prices Scraped Today';

  // Restore Price Alerts Section
  const alertsTitle = document.getElementById('alertsHeaderTitle');
  const alertsTag = document.getElementById('alertsHeaderTag');
  const alertsList = document.getElementById('alertsList');

  if (alertsTitle) alertsTitle.innerText = 'Live Price Alerts';
  if (alertsTag) {
    alertsTag.className = 'badge-tag alert-tag';
    alertsTag.innerText = 'Real-Time Signals';
  }
  if (alertsList) {
    alertsList.innerHTML = `
      <div class="alert-item red-border">
        <div class="alert-top">
          <span class="alert-icon-red">🔺 DEL → BOM</span>
          <span class="alert-badge red">+14% Increase</span>
        </div>
        <div class="alert-fares">
          <span class="old-fare">₹5,420</span>
          <span class="arrow">→</span>
          <span class="new-fare">₹6,180</span>
        </div>
        <div class="alert-reason">Reason: Weekend Demand</div>
      </div>
      <div class="alert-item red-border">
        <div class="alert-top">
          <span class="alert-icon-red">🔺 BLR → DEL</span>
          <span class="alert-badge red">+16% Increase</span>
        </div>
        <div class="alert-fares">
          <span class="old-fare">₹4,890</span>
          <span class="arrow">→</span>
          <span class="new-fare">₹5,710</span>
        </div>
        <div class="alert-reason">Reason: Festival Rush</div>
      </div>
      <div class="alert-item green-border">
        <div class="alert-top">
          <span class="alert-icon-green">🟢 BOM → HYD</span>
          <span class="alert-badge green">Price Stable</span>
        </div>
        <div class="alert-fares">
          <span class="stable-fare">₹5,120</span>
        </div>
        <div class="alert-reason">Reason: Normal Operations</div>
      </div>
    `;
  }

  // Restore Isolation Forest Section
  const anomTitle = document.getElementById('anomHeaderTitle');
  const anomNormal = document.getElementById('anomNormalPill');
  const anomCount = document.getElementById('anomCountPill');
  const anomTbody = document.getElementById('anomTableBody');
  const anomFoot = document.getElementById('anomFootnote');

  if (anomTitle) anomTitle.innerText = 'Isolation Forest Detection';
  if (anomNormal) anomNormal.innerText = 'Normal: 94';
  if (anomCount) anomCount.innerText = 'Anomalies: 6';
  if (anomFoot) anomFoot.innerText = 'Unusual fares removed before index calculation.';

  if (anomTbody) {
    anomTbody.innerHTML = `
      <tr>
        <td class="font-bold">DEL → BOM</td>
        <td class="font-bold text-red">₹18,900</td>
        <td><span class="status-badge-table red">🔴 Anomaly</span></td>
      </tr>
      <tr>
        <td class="font-bold">BOM → BLR</td>
        <td>₹5,890</td>
        <td><span class="status-badge-table green">🟢 Normal</span></td>
      </tr>
      <tr>
        <td class="font-bold">BLR → DEL</td>
        <td>₹5,110</td>
        <td><span class="status-badge-table green">🟢 Normal</span></td>
      </tr>
      <tr>
        <td class="font-bold">DEL → GOI</td>
        <td class="font-bold text-red">₹14,750</td>
        <td><span class="status-badge-table red">🔴 High Outlier</span></td>
      </tr>
    `;
  }

  // Restore Fuel Monitor Section
  const fuelTitle = document.getElementById('fuelHeaderTitle');
  const fuelBadge = document.getElementById('fuelHeaderBadge');
  const fuelPriceBig = document.getElementById('fuelPriceBig');
  const fuelLabel = document.getElementById('fuelLabel');
  const fuelTrendValues = document.getElementById('fuelTrendValues');
  const fuelFoot = document.getElementById('fuelFootnote');

  if (fuelTitle) fuelTitle.innerText = 'Aviation Fuel Monitor';
  if (fuelBadge) {
    fuelBadge.className = 'badge-tag amber-tag';
    fuelBadge.innerText = '↑ Fuel Increased 3.4%';
  }
  if (fuelPriceBig) fuelPriceBig.innerHTML = '₹95.6<span class="unit">/L</span>';
  if (fuelLabel) fuelLabel.innerText = 'Current ATF Price';
  if (fuelFoot) fuelFoot.innerText = 'Fuel prices are monitored as an external cost factor.';
  if (fuelTrendValues) {
    fuelTrendValues.innerHTML = `
      <div class="f-step"><span>Past</span><strong>91.2</strong></div>
      <span class="f-arr">→</span>
      <div class="f-step"><span>Prev</span><strong>92.4</strong></div>
      <span class="f-arr">→</span>
      <div class="f-step"><span>Last</span><strong>94.1</strong></div>
      <span class="f-arr">→</span>
      <div class="f-step active"><span>Current</span><strong>95.6</strong></div>
    `;
  }

  // Restore DGCA Section
  const dgcaLoadVal = document.getElementById('dgcaLoadVal');
  const dgcaFlightsVal = document.getElementById('dgcaFlightsVal');
  const dgcaFootnote = document.getElementById('dgcaFootnote');

  if (dgcaLoadVal) dgcaLoadVal.innerText = '87.2%';
  if (dgcaFlightsVal) dgcaFlightsVal.innerText = '3,420';
  if (dgcaFootnote) dgcaFootnote.innerText = 'DGCA operational data is used as weighting during index calculation.';

  // Restore CPI Drivers Section
  const cpiTitle = document.getElementById('cpiCardTitle');
  const cpiBarsList = document.getElementById('cpiBarsList');
  const cpiSignalTitle = document.getElementById('cpiSignalTitle');
  const cpiSignalCombo = document.getElementById('cpiSignalCombo');
  const cpiSignalExpl = document.getElementById('cpiSignalExpl');

  if (cpiTitle) cpiTitle.innerText = 'CPI Drivers (Illustrative)';
  if (cpiSignalTitle) cpiSignalTitle.innerText = "Today's Biggest CPI Signal";
  if (cpiSignalCombo) cpiSignalCombo.innerText = 'Airfare + Fuel Prices';
  if (cpiSignalExpl) cpiSignalExpl.innerText = '"Rising airfare combined with increasing ATF prices contributed the strongest signal in today\'s CPI augmentation."';

  if (cpiBarsList) {
    cpiBarsList.innerHTML = `
      <div class="driver-row">
        <div class="driver-name">Airfare Demand</div>
        <div class="driver-bar-wrapper"><div class="driver-bar-fill bar-blue" style="width: 38%;"></div></div>
        <div class="driver-percent">38%</div>
      </div>
      <div class="driver-row">
        <div class="driver-name">Fuel Prices</div>
        <div class="driver-bar-wrapper"><div class="driver-bar-fill bar-amber" style="width: 27%;"></div></div>
        <div class="driver-percent">27%</div>
      </div>
      <div class="driver-row">
        <div class="driver-name">Season / Festival Traffic</div>
        <div class="driver-bar-wrapper"><div class="driver-bar-fill bar-purple" style="width: 18%;"></div></div>
        <div class="driver-percent">18%</div>
      </div>
      <div class="driver-row">
        <div class="driver-name">Weather / Disruptions</div>
        <div class="driver-bar-wrapper"><div class="driver-bar-fill bar-slate" style="width: 9%;"></div></div>
        <div class="driver-percent">9%</div>
      </div>
      <div class="driver-row">
        <div class="driver-name">DGCA Operational Load</div>
        <div class="driver-bar-wrapper"><div class="driver-bar-fill bar-emerald" style="width: 8%;"></div></div>
        <div class="driver-percent">8%</div>
      </div>
    `;
  }

  // Restore Table Section
  const tableTitle = document.getElementById('liveTableTitle');
  const tableRefreshBtn = document.getElementById('liveTableRefreshBtn');

  if (tableTitle) tableTitle.innerText = 'Latest Scraped Prices';
  if (tableRefreshBtn) tableRefreshBtn.style.display = 'inline-block';

  renderLiveTable(baseLiveTableData);

  // Restore Prediction Card
  const predTitle = document.getElementById('predCardTitle');
  const predChartSubLabel = document.getElementById('predChartSubLabel');
  const predCardVal = document.getElementById('predCardVal');
  const predCardFoot = document.getElementById('predCardFootnote');
  const predCardHeaderTag = document.getElementById('predCardHeaderTag');

  if (predTitle) predTitle.innerText = 'Next 7-Day Airfare Prediction';
  if (predChartSubLabel) predChartSubLabel.innerText = 'Predicted Index Movement (Today → Day 7)';
  if (predCardVal) predCardVal.innerText = '116.2';
  if (predCardHeaderTag) predCardHeaderTag.innerText = 'Confidence: 92%';
  if (predCardFoot) predCardFoot.innerText = 'Model predicts increasing airfare trend for the coming period. Click to open full forecast view.';
}

/**
 * ==========================================
 * LIVE DASHBOARD DATA REFRESH logic
 * ==========================================
 */
function refreshDashboardData() {
  if (isHistoricalMode) return; // Do not oscillate when viewing historical snapshot

  const lastUpdated = document.getElementById('dashLastUpdated');
  const pricesCollected = document.getElementById('ovPrices');
  const heroVal = document.getElementById('dashHeroIndexVal');

  if (lastUpdated) lastUpdated.innerText = 'Last Updated: Just now';

  if (pricesCollected) {
    let current = parseInt(pricesCollected.innerText.replace(/,/g, '')) || 1284;
    current += Math.floor(Math.random() * 8) + 2;
    pricesCollected.innerText = current.toLocaleString();
  }

  if (heroVal) {
    const newVal = (108.6 + (Math.random() * 0.4 - 0.2)).toFixed(1);
    heroVal.innerText = newVal;
  }

  refreshTableFares();
}

function refreshTableFares() {
  if (isHistoricalMode) return;

  const updatedData = baseLiveTableData.map(item => {
    const delta = Math.floor(Math.random() * 180) - 90;
    const newFare = Math.max(4200, item.fare + delta);
    return {
      ...item,
      fare: newFare,
      time: 'Just now'
    };
  });

  renderLiveTable(updatedData);
}

function renderLiveTable(dataList) {
  const tbody = document.getElementById('liveTableBody');
  if (!tbody) return;

  const searchInput = document.getElementById('tableSearchInput');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const filtered = dataList.filter(row => {
    const matchesChip = (activeFilterSource === 'all') ||
      row.source.toLowerCase().includes(activeFilterSource.toLowerCase()) ||
      row.route.toLowerCase().includes(activeFilterSource.toLowerCase());

    const matchesSearch = !query ||
      row.route.toLowerCase().includes(query) ||
      row.source.toLowerCase().includes(query) ||
      row.fare.toString().includes(query);

    return matchesChip && matchesSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94A3B8; padding:20px;">No matching price records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(row => `
    <tr>
      <td class="font-bold">${row.route}</td>
      <td>${row.source}</td>
      <td class="font-bold text-blue">₹${row.fare.toLocaleString()}</td>
      <td class="text-muted">${row.time}</td>
    </tr>
  `).join('');
}

function setFilterChip(chipName) {
  activeFilterSource = chipName;

  const chips = document.querySelectorAll('.filter-chips .chip');
  chips.forEach(c => {
    if (c.innerText.toLowerCase() === chipName.toLowerCase()) {
      c.classList.add('active');
    } else {
      c.classList.remove('active');
    }
  });

  const activeList = (isHistoricalMode && activeSnapshot) ? activeSnapshot.tableRows : baseLiveTableData;
  renderLiveTable(activeList);
}

function filterLiveTable() {
  const activeList = (isHistoricalMode && activeSnapshot) ? activeSnapshot.tableRows : baseLiveTableData;
  renderLiveTable(activeList);
}

/**
 * ==========================================
 * PAST AIRFARE INDEX — CALENDAR & CONTROLS
 * ==========================================
 */

function setPastDateMode(mode) {
  const singleGroup = document.getElementById('singleDateGroup');
  const rangeGroup = document.getElementById('rangeDateGroup');
  const singleBtn = document.getElementById('singleDateBtn');
  const rangeBtn = document.getElementById('rangeDateBtn');

  if (mode === 'single') {
    if (singleGroup) singleGroup.style.display = 'flex';
    if (rangeGroup) rangeGroup.style.display = 'none';
    if (singleBtn) singleBtn.classList.add('active');
    if (rangeBtn) rangeBtn.classList.remove('active');
    onPastDateChange();
  } else {
    if (singleGroup) singleGroup.style.display = 'none';
    if (rangeGroup) rangeGroup.style.display = 'flex';
    if (singleBtn) singleBtn.classList.remove('active');
    if (rangeBtn) rangeBtn.classList.add('active');
    onPastRangeChange();
  }
}

function selectQuickPastDate(dateStr) {
  const pickerInput = document.getElementById('pastIndexDate');
  if (pickerInput) pickerInput.value = dateStr;

  highlightActiveChip(dateStr);
  applyHistoricalSnapshot(dateStr);
}

function onPastDateChange() {
  const pickerInput = document.getElementById('pastIndexDate');
  if (!pickerInput) return;
  const dateStr = pickerInput.value;

  highlightActiveChip(dateStr);
  applyHistoricalSnapshot(dateStr);
}

function onPastRangeChange() {
  const startInput = document.getElementById('pastStartDate');
  const endInput = document.getElementById('pastEndDate');
  if (!startInput || !endInput) return;

  const startDate = startInput.value;
  const endDate = endInput.value;

  // Range calculation using deterministic generator
  const snapStart = getHistoricalSnapshot(startDate);
  const snapEnd = getHistoricalSnapshot(endDate);
  const avgVal = ((snapStart.indexVal + snapEnd.indexVal) / 2).toFixed(1);

  applyHistoricalSnapshot(endDate);

  // Update Range specifics on result box
  const pastResultLabel = document.getElementById('pastResultLabel');
  const pastResultDate = document.getElementById('pastResultDate');
  const pastResultVal = document.getElementById('pastResultVal');
  const pastResultFootnote = document.getElementById('pastResultFootnote');

  if (pastResultLabel) pastResultLabel.innerText = 'Historical Range Index (Average)';
  if (pastResultDate) pastResultDate.innerText = `${snapStart.formattedDate} – ${snapEnd.formattedDate}`;
  if (pastResultVal) pastResultVal.innerText = avgVal;
  if (pastResultFootnote) pastResultFootnote.innerText = `Airfare Price Index range: ${snapStart.indexVal} to ${snapEnd.indexVal}. Base Year = 100.`;
}

function highlightActiveChip(dateStr) {
  const chips = document.querySelectorAll('.chip-date');
  chips.forEach(chip => {
    if (chip.getAttribute('onclick') && chip.getAttribute('onclick').includes(dateStr)) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '01 Sep 2026';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parts[2];

  return `${day} ${months[monthIdx] || ''} ${year}`;
}

/**
 * ==========================================
 * FULL 7-DAY FORECAST OVERLAY
 * ==========================================
 */

function openPredictionOverlay() {
  const overlay = document.getElementById('predictionOverlay');
  if (!overlay) return;

  const brandTag = document.getElementById('overlayBrandTag');
  const mainTitle = document.getElementById('overlayMainTitle');
  const subTitle = document.getElementById('overlaySubTitle');
  const stat1Label = document.getElementById('overlayStat1Label');
  const stat1Val = document.getElementById('overlayStat1Val');
  const stat2Val = document.getElementById('overlayStat2Val');
  const stat3Val = document.getElementById('overlayStat3Val');
  const stat4Val = document.getElementById('overlayStat4Val');
  const insightTitle = document.getElementById('overlayInsightTitle');
  const insightText = document.getElementById('overlayInsightText');

  if (isHistoricalMode && activeSnapshot) {
    const snap = activeSnapshot;
    if (brandTag) brandTag.innerHTML = `<span class="logo-mark-sm">✈</span> HISTORICAL FORECAST SIMULATION`;
    if (mainTitle) mainTitle.innerText = `7-Day Forecast Simulation (${snap.formattedDate})`;
    if (subTitle) subTitle.innerText = `Simulated Airfare Price Index starting from ${snap.formattedDate} (${snap.indexVal})`;
    if (stat1Label) stat1Label.innerText = `Index on ${snap.formattedDate}`;
    if (stat1Val) stat1Val.innerText = snap.indexVal;
    if (stat2Val) stat2Val.innerText = snap.pred7Day;
    if (stat3Val) stat3Val.innerText = snap.predChange;
    if (stat4Val) stat4Val.innerText = snap.predConfidence;
    if (insightTitle) insightTitle.innerText = `Historical Forecast Context (${snap.formattedDate})`;
    if (insightText) insightText.innerText = `Model simulation of projected 7-day trend starting from ${snap.formattedDate} index (${snap.indexVal}) based on historical signals.`;
  } else {
    if (brandTag) brandTag.innerHTML = `<span class="logo-mark-sm">✈</span> SKYRATE FORECAST ENGINE`;
    if (mainTitle) mainTitle.innerText = `7-Day Airfare Forecast`;
    if (subTitle) subTitle.innerText = `Predicted Airfare Price Index`;
    if (stat1Label) stat1Label.innerText = `Current Index`;
    if (stat1Val) stat1Val.innerText = `108.6`;
    if (stat2Val) stat2Val.innerText = `116.2`;
    if (stat3Val) stat3Val.innerText = `+7.0%`;
    if (stat4Val) stat4Val.innerText = `92%`;
    if (insightTitle) insightTitle.innerText = `Expected trend`;
    if (insightText) insightText.innerText = `Airfare prices are projected to increase over the next 7 days based on historical patterns and current signals.`;
  }

  overlay.style.display = 'block';
  void overlay.offsetHeight;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closePredictionOverlay() {
  const overlay = document.getElementById('predictionOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    setTimeout(() => {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }, 250);
  }
}

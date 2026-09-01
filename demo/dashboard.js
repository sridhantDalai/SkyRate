/**
 * SKYRATE Dashboard Interactive Logic
 * Smart India Hackathon 2026 Standalone Analytics Platform
 */

const baseLiveTableData = [
  { route: 'DEL → BOM', source: 'IndiGo', fare: 5680, time: '10 sec ago' },
  { route: 'DEL → BOM', source: 'MakeMyTrip', fare: 5720, time: '12 sec ago' },
  { route: 'BLR → DEL', source: 'Air India', fare: 6120, time: '20 sec ago' },
  { route: 'BOM → HYD', source: 'Cleartrip', fare: 4950, time: '24 sec ago' },
  { route: 'HYD → DEL', source: 'Akasa', fare: 5380, time: '32 sec ago' }
];

let activeFilterSource = 'all';

document.addEventListener('DOMContentLoaded', () => {
  renderLiveTable(baseLiveTableData);
});

/**
 * Refresh main dashboard metrics & timestamps
 */
function refreshDashboardData() {
  const lastUpdated = document.getElementById('dashLastUpdated');
  const pricesCollected = document.getElementById('ovPrices');
  const heroVal = document.getElementById('dashHeroIndexVal');

  if (lastUpdated) lastUpdated.innerText = 'Last Updated: Just now';
  
  if (pricesCollected) {
    let current = parseInt(pricesCollected.innerText.replace(/,/g, '')) || 1284;
    current += Math.floor(Math.random() * 8) + 2;
    pricesCollected.innerText = current.toLocaleString();
  }

  // Slightly oscillate index
  if (heroVal) {
    const newVal = (108.6 + (Math.random() * 0.4 - 0.2)).toFixed(1);
    heroVal.innerText = newVal;
  }

  refreshTableFares();
}

/**
 * Randomly update live fare values in the table
 */
function refreshTableFares() {
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

/**
 * Render filtered live table rows
 */
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

/**
 * Handle filter chip selection
 */
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

  renderLiveTable(baseLiveTableData);
}

/**
 * Search input handler
 */
function filterLiveTable() {
  renderLiveTable(baseLiveTableData);
}

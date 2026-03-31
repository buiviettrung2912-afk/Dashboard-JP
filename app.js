const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1UftvLAg15xIAjHGBAwtB8dP0wCJgTWFMtgONrTDqjzM/export?format=csv&gid=0';
const PROXY_URL = 'https://api.allorigins.win/raw?url=';
let charts = {};
document.getElementById('syncBtn').addEventListener('click', fetchData);
document.getElementById('csvFile').addEventListener('change', (e) => {
      const reader = new FileReader();
      reader.onload = (ev) => processData(ev.target.result);
      reader.readAsText(e.target.files[0]);
});
async function fetchData() {
      showLoading(true);
      try {
                const resp = await fetch(PROXY_URL + encodeURIComponent(SHEET_URL));
                if (resp.ok) { processData(await resp.text()); showLoading(false); return; }
      } catch (e) {}
      try {
                const resp = await fetch('data.csv');
                if (resp.ok) processData(await resp.text());
      } catch (e) {}
      showLoading(false);
}
function processData(csv) {
      Papa.parse(csv, { header: true, skipEmptyLines: true, complete: (res) => renderDashboard(res.data) });
}
function getKey(obj, s) { return Object.keys(obj).find(k => k.toLowerCase().replace(/[^a-z0-9]/g,'').includes(s)) || s; }
function renderDashboard(data) {
      const container = document.getElementById('dashboard');
      if (!data || !data.length) return;
      const sKey = getKey(data[0], 'trangthai');
      const pKey = getKey(data[0], 'tinhthanh');
      container.innerHTML = `<div class="bg-white p-6 rounded shadow border-l-4 border-blue-500"><p class="text-sm uppercase text-gray-500">Tong don</p><p class="text-3xl font-bold">${data.length}</p></div><div class="bg-white p-6 rounded shadow border-l-4 border-green-500"><p class="text-sm uppercase text-gray-500">Da giao</p><p class="text-3xl font-bold">${data.filter(d => (d[sKey]||'').includes('giao') || (d[sKey]||'').includes('Success')).length}</p></div>`;
      updateCharts(data);
}
function updateCharts(data) {
      const sKey = getKey(data[0], 'trangthai');
      const pKey = getKey(data[0], 'tinhthanh');
      const dKey = getKey(data[0], 'ngay');
      const sCounts = countBy(data, sKey);
      renderChart('statusChart', 'pie', Object.keys(sCounts), Object.values(sCounts));
      const pCounts = countBy(data, pKey);
      const pSorted = Object.entries(pCounts).sort((a,b) => b[1]-a[1]).slice(0,10);
      renderChart('provinceChart', 'bar', pSorted.map(p=>p[0]), pSorted.map(p=>p[1]));
      const dCounts = countBy(data, dKey);
      const dSorted = Object.entries(dCounts).sort((a,b) => new Date(a[0])-new Date(b[0]));
      renderChart('trendChart', 'line', dSorted.map(d=>d[0]), dSorted.map(d=>d[1]));
}
function countBy(data, key) {
      return data.reduce((acc, o) => { const v = o[key] || 'N/A'; acc[v] = (acc[v]||0)+1; return acc; }, {});
}
function renderChart(id, type, labels, values) {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      if (charts[id]) charts[id].destroy();
      charts[id] = new Chart(canvas.getContext('2d'), {
                type: type,
                data: { labels: labels, datasets: [{ data: values, backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'] }] },
                options: { responsive: true, maintainAspectRatio: false }
      });
}
function showLoading(s) { document.getElementById('loading').classList.toggle('hidden', !s); }
fetchData();

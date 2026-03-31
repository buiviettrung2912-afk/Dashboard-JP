// Utility functions
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

const formatNumber = (num) => {
    return new Intl.NumberFormat('vi-VN').format(num || 0);
};

// Global State
let rawData = [];
let filteredData = [];
let channels = new Set();
let products = new Set();

let charts = {
    products: null,
    channels: null,
    time: null
};

// DOM Elements
const eList = {
    lastUpdated: document.getElementById('lastUpdated'),
    fromDate: document.getElementById('fromDate'),
    toDate: document.getElementById('toDate'),
    channelFilter: document.getElementById('channelFilter'),
    productFilter: document.getElementById('productFilter'),
    applyFilterBtn: document.getElementById('applyFilterBtn'),
    presetButtons: document.querySelectorAll('.preset-btn'),
    loading: document.getElementById('loadingIndicator'),
    content: document.getElementById('dashboardContent'),
    
    valRevenue: document.getElementById('valRevenue'),
    valOrders: document.getElementById('valOrders'),
    valOrdersBreakdown: document.getElementById('valOrdersBreakdown'),
    valTickets: document.getElementById('valTickets'),
    valAvgTicket: document.getElementById('valAvgTicket'),
    
    tableProductsBody: document.getElementById('tableProductsBody'),
    tableOrdersBody: document.getElementById('tableOrdersBody'),
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log("App Initializing...");
        initRealtimeClock();
        setupEventListeners();

        // Tự động tải dữ liệu nếu chạy trên web (GitHub Pages/Vercel)
        if (window.location.protocol !== 'file:') {
            loadDataFromSource('data.csv');
        }
    } catch (err) {
        console.error("Initialization error:", err);
    }
});

function loadDataFromSource(source) {
    toggleLoading(true);
    Papa.parse(source, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            processData(results.data);
            toggleLoading(false);
        },
        error: function(err) {
            console.error('Error loading data:', err);
            toggleLoading(false);
        }
    });
}

function initRealtimeClock() {
    const update = () => {
        try {
            // Fix for dateFns global name if needed
            const dFns = window.dateFns || dateFns;
            eList.lastUpdated.innerText = dFns.format(new Date(), 'dd/MM/yyyy HH:mm:ss');
        } catch(e) {
            eList.lastUpdated.innerText = new Date().toLocaleString();
        }
    };
    update();
    setInterval(update, 1000);
}



function toggleLoading(isLoading) {
    if(isLoading) {
        eList.loading.classList.remove('hidden');
        eList.content.classList.add('hidden', 'opacity-50');
    } else {
        eList.loading.classList.add('hidden');
        eList.content.classList.remove('hidden', 'opacity-50');
    }
}

function processData(data) {
    if (!data || data.length === 0) {
        alert("Dữ liệu nhận được trống hoặc không đúng định dạng.");
        return;
    }

    console.log("Processing columns:", Object.keys(data[0]));

    // Map and normalize fields
    rawData = data.map(item => {
        const keys = Object.keys(item);
        
        // Robust detection using fuzzy match or index fallback
        const keyOrder = keys.find(k => /đơn|MA|Mã|Order/i.test(k)) || keys[0];
        const keyDate = keys.find(k => /NgA|Ngày|Date/i.test(k)) || keys[1];
        const keyTime = keys.find(k => /Giờ|Time/i.test(k)) || keys[2];
        const keyStatusDel = keys.find(k => /giao|Delivery|fulfilled/i.test(k)) || keys[3];
        const keyStatusPay = keys.find(k => /thanh to|Payment|paid/i.test(k)) || keys[4];
        const keyCustomer = keys.find(k => /KhA|Khách|Customer/i.test(k)) || keys[5];
        const keyProduct = keys.find(k => /PhA|Sản Phẩm|Product/i.test(k)) || keys[8];
        const keyQty = keys.find(k => /lượng|mua|Qty/i.test(k)) || keys[9];
        const keyAmount = keys.find(k => /tiền|Amount|Total/i.test(k)) || keys[10];
        const keyChannel = keys.find(k => /nh BA|Kênh|Channel/i.test(k)) || keys[11];

        let dt = null;
        try {
            if(item[keyDate] && item[keyTime]){
                let dStr = item[keyDate].trim();
                let tStr = item[keyTime].trim();
                dt = new Date(dStr + 'T' + tStr);
            } else if (item[keyDate]) {
                dt = new Date(item[keyDate].trim());
            }
        } catch(e) {}
        
        if (!dt || isNaN(dt.getTime())) dt = new Date();

        const channelRaw = (item[keyChannel] || 'Unknown').trim();
        const channelSimple = channelRaw.toLowerCase().includes('pos') ? 'POS' : (channelRaw.toLowerCase().includes('web') ? 'WEB' : channelRaw);

        channels.add(channelSimple);
        if(item[keyProduct]) products.add(item[keyProduct].trim());

        // Parse amount correctly (remove commas, currency symbols, and spaces)
        let amtStr = (item[keyAmount] || '0').toString().replace(/[^\d]/g, '');
        let qtyStr = (item[keyQty] || '0').toString().replace(/[^\d]/g, '');

        return {
            id: item[keyOrder] ? item[keyOrder].trim() : '',
            date: item[keyDate] ? item[keyDate].trim() : '',
            time: item[keyTime] ? item[keyTime].trim() : '',
            datetime: dt,
            deliveryStatus: (item[keyStatusDel] || '').trim(),
            paymentStatus: (item[keyStatusPay] || '').trim(),
            customer: (item[keyCustomer] || '').trim(),
            product: (item[keyProduct] || 'Unknown').trim(),
            qty: parseFloat(qtyStr) || 0,
            amount: parseFloat(amtStr) || 0,
            channelRaw: channelRaw,
            channel: channelSimple,
            isPaid: /đã thanh toán|paid|thanh to/i.test(item[keyStatusPay] || '')
        };
    });

    // Sort by datetime desc
    rawData.sort((a,b) => b.datetime - a.datetime);

    populateFilters();
    selectPreset('all');
}

function populateFilters() {
    // Populate channels
    eList.channelFilter.innerHTML = '<option value="all">Tất cả</option>';
    Array.from(channels).sort().forEach(c => {
        let opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        eList.channelFilter.appendChild(opt);
    });

    // Populate products
    eList.productFilter.innerHTML = '<option value="all">Tất cả</option>';
    Array.from(products).sort().forEach(p => {
        let opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        eList.productFilter.appendChild(opt);
    });
}

function setupEventListeners() {
    eList.applyFilterBtn.addEventListener('click', applyFilters);
    
    eList.presetButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectPreset(e.target.getAttribute('data-preset'));
        });
    });

    // 1. Live API Sync (using JSONP to bypass local file CORS)
    const syncApiBtn = document.getElementById('syncApiBtn');
    if (syncApiBtn) {
        syncApiBtn.addEventListener('click', () => {
            toggleLoading(true);
            
            const sheetId = '1UftvLAg15xIAjHGBAwtB8dP0wCJgTWFMtgONrTDqjzM';
            const gid = '0';
            const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
            
            // Define a global callback for JSONP
            window.handleJsonpResponse = function(response) {
                try {
                    if (response && response.contents) {
                        const csvText = response.contents;
                        Papa.parse(csvText, {
                            header: true,
                            skipEmptyLines: true,
                            complete: function(results) {
                                processData(results.data);
                                toggleLoading(false);
                                setTimeout(() => alert("Đã đồng bộ dữ liệu mới nhất thành công!"), 100);
                            },
                            error: function(pErr) {
                                throw new Error("Lỗi xử lý CSV: " + pErr);
                            }
                        });
                    } else {
                        throw new Error("Không nhận được dữ liệu từ Proxy");
                    }
                } catch (err) {
                    alert("Lỗi đồng bộ: " + err.message);
                    toggleLoading(false);
                } finally {
                    // Clean up script tag
                    const scriptTag = document.getElementById('jsonp-bridge');
                    if (scriptTag) scriptTag.remove();
                    delete window.handleJsonpResponse;
                }
            };

            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(sheetUrl)}&callback=handleJsonpResponse`;
            
            const script = document.createElement('script');
            script.id = 'jsonp-bridge';
            script.src = proxyUrl;
            script.onerror = () => {
                alert("Không thể kết nối tới máy chủ Proxy. Vui lòng kiểm tra lại mạng.");
                toggleLoading(false);
            };
            document.body.appendChild(script);
        });
    }

    // 2. Offline File sync

    const fileInput = document.getElementById('csvFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(file) {
                toggleLoading(true);
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: function(results) {
                        processData(results.data);
                        toggleLoading(false);
                    },
                    error: function(err) {
                        console.error('Error parsing CSV:', err);
                        alert("Lỗi khi đọc file CSV.");
                        toggleLoading(false);
                    }
                });
            }
        });
    }
}

function selectPreset(preset) {
    eList.presetButtons.forEach(b => b.classList.remove('active'));
    document.querySelector(`.preset-btn[data-preset="${preset}"]`).classList.add('active');

    const today = new Date();
    let from, to;

    switch(preset) {
        case 'today':
            from = dateFns.startOfDay(today);
            to = dateFns.endOfDay(today);
            break;
        case 'yesterday':
            const yesterday = dateFns.subDays(today, 1);
            from = dateFns.startOfDay(yesterday);
            to = dateFns.endOfDay(yesterday);
            break;
        case 'thisWeek':
            from = dateFns.startOfWeek(today, {weekStartsOn: 1});
            to = dateFns.endOfWeek(today, {weekStartsOn: 1});
            break;
        case 'last7Days':
            from = dateFns.startOfDay(dateFns.subDays(today, 6));
            to = dateFns.endOfDay(today);
            break;
        case 'thisMonth':
            from = dateFns.startOfMonth(today);
            to = dateFns.endOfMonth(today);
            break;
        case 'lastMonth':
            const lastMonth = dateFns.subMonths(today, 1);
            from = dateFns.startOfMonth(lastMonth);
            to = dateFns.endOfMonth(lastMonth);
            break;
        case 'all':
            from = null;
            to = null;
            break;
    }

    if (from && to) {
        eList.fromDate.value = dateFns.format(from, 'yyyy-MM-dd');
        eList.toDate.value = dateFns.format(to, 'yyyy-MM-dd');
    } else {
        eList.fromDate.value = '';
        eList.toDate.value = '';
    }

    applyFilters();
}

function applyFilters() {
    const fFrom = eList.fromDate.value;
    const fTo = eList.toDate.value;
    const fChannel = eList.channelFilter.value;
    const fProduct = eList.productFilter.value;

    filteredData = rawData.filter(item => {
        // Date match
        let passDate = true;
        let itemDateStr = dateFns.format(item.datetime, 'yyyy-MM-dd');
        if (fFrom && itemDateStr < fFrom) passDate = false;
        if (fTo && itemDateStr > fTo) passDate = false;

        // Channel match
        let passChan = (fChannel === 'all') ? true : (item.channel === fChannel || item.channelRaw === fChannel);
        
        // Product match
        let passProd = (fProduct === 'all') ? true : (item.product === fProduct);

        return passDate && passChan && passProd;
    });

    updateDashboard();
}

function updateDashboard() {
    updateSummaryCards();
    updateCharts();
    updateTables();
}

function updateSummaryCards() {
    let revPaid = 0;
    let totalTick = 0;
    
    // For unique orders count and getting proper details per channel
    let orderSet = new Set();
    let posOrders = new Set();
    let webOrders = new Set();
    let totalOrdCount = 0;

    filteredData.forEach(item => {
        if(item.isPaid) {
            revPaid += item.amount;
        }
        totalTick += item.qty;
        
        if(!orderSet.has(item.id)) {
            orderSet.add(item.id);
            totalOrdCount++;
            if(item.channel.toUpperCase() === 'POS') posOrders.add(item.id);
            if(item.channel.toUpperCase() === 'WEB') webOrders.add(item.id);
        }
    });

    let avg = totalOrdCount > 0 ? (revPaid / totalOrdCount) : 0;

    eList.valRevenue.innerText = formatCurrency(revPaid);
    eList.valOrders.innerText = formatNumber(totalOrdCount);
    eList.valOrdersBreakdown.innerText = `POS: ${posOrders.size} | WEB: ${webOrders.size} | Khác: ${totalOrdCount - posOrders.size - webOrders.size}`;
    eList.valTickets.innerText = formatNumber(totalTick);
    eList.valAvgTicket.innerText = formatCurrency(avg);
}

function updateCharts() {
    // 1. Bar Chart: Revenue by Product
    const prodMap = {};
    filteredData.forEach(item => {
        if(item.isPaid){
            if(!prodMap[item.product]) prodMap[item.product] = 0;
            prodMap[item.product] += item.amount;
        }
    });

    const sortedProds = Object.entries(prodMap)
        .sort((a,b) => b[1] - a[1]) // highest first
        .slice(0, 8); // Top 8
    
    // Sort ascending for bottom-to-top rendering in Apex horizontal bar
    sortedProds.sort((a,b) => a[1] - b[1]); 

    renderProductsChart(
        sortedProds.map(x => x[0]),
        sortedProds.map(x => x[1])
    );

    // 2. Donut Chart: Revenue by Channel
    const chanMap = {};
    filteredData.forEach(item => {
        if(item.isPaid){
            if(!chanMap[item.channel]) chanMap[item.channel] = 0;
            chanMap[item.channel] += item.amount;
        }
    });

    renderChannelsChart(
        Object.keys(chanMap),
        Object.values(chanMap)
    );

    // 3. Line Chart: Revenue over Time (by Date)
    // Group by Date
    const dateMap = {};
    filteredData.forEach(item => {
        if(item.isPaid && item.date){
            if(!dateMap[item.date]) dateMap[item.date] = 0;
            dateMap[item.date] += item.amount;
        }
    });

    const sortedDates = Object.entries(dateMap).sort((a,b) => new Date(a[0]) - new Date(b[0]));

    renderTimeChart(
        sortedDates.map(x => x[0]),
        sortedDates.map(x => x[1])
    );
}

function renderProductsChart(categories, data) {
    if(charts.products) charts.products.destroy();
    if(categories.length === 0) categories = ['N/A'], data = [0];

    var options = {
        series: [{ name: 'Doanh thu', data: data }],
        chart: { type: 'bar', height: 300, toolbar: {show: false}, fontFamily: 'Inter, sans-serif' },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, dataLabels: { position: 'top', } } },
        dataLabels: { 
            enabled: true, 
            textAnchor: 'start', 
            offsetX: 5,
            formatter: (val) => formatCurrency(val),
            style: { fontSize: '11px', colors: ['#4b5563'], fontWeight: 500 }
        },
        colors: ['#338eda'],
        xaxis: { categories: categories, labels: { show: false } },
        yaxis: { labels: { style: { fontSize: '12px' }, maxWidth: 200 } },
        tooltip: { y: { formatter: function (val) { return formatCurrency(val) } } }
    };
    charts.products = new ApexCharts(document.querySelector("#chartProducts"), options);
    charts.products.render();
}

function renderChannelsChart(labels, series) {
    if(charts.channels) charts.channels.destroy();
    if(series.length === 0) labels = ['N/A'], series = [0];

    var options = {
        series: series,
        labels: labels,
        chart: { type: 'donut', height: 300, fontFamily: 'Inter, sans-serif' },
        plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Tổng', formatter: (w) => formatCurrency(w.globals.seriesTotals.reduce((a, b) => a + b, 0)) }}}}},
        dataLabels: { enabled: false },
        colors: ['#3b82f6', '#f97316', '#10b981', '#8b5cf6'],
        tooltip: { y: { formatter: function (val) { return formatCurrency(val) } } },
        legend: { position: 'bottom' }
    };
    charts.channels = new ApexCharts(document.querySelector("#chartChannels"), options);
    charts.channels.render();
}

function renderTimeChart(categories, data) {
    if(charts.time) charts.time.destroy();
    
    var options = {
        series: [{ name: 'Doanh thu', data: data }],
        chart: { type: 'area', height: 300, toolbar: {show: false}, fontFamily: 'Inter, sans-serif' },
        colors: ['#338eda'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        xaxis: { 
            categories: categories, 
            labels: { style: { fontSize: '12px' }, rotate: -45, rotateAlways: false },
            tickPlacement: 'on'
        },
        yaxis: { labels: { formatter: (val) => { return formatNumber(val); } } },
        tooltip: { x: { format: 'dd/MM/yy hh:mm' }, y: { formatter: function (val) { return formatCurrency(val) } } }
    };
    charts.time = new ApexCharts(document.querySelector("#chartTime"), options);
    charts.time.render();
}

function updateTables() {
    // 1. Product Details
    const prodMap = {};
    filteredData.forEach(item => {
        if(!prodMap[item.product]){
            prodMap[item.product] = { qty: 0, rev: 0 };
        }
        prodMap[item.product].qty += item.qty;
        if(item.isPaid) prodMap[item.product].rev += item.amount;
    });

    let prodHtml = '';
    const sortedP = Object.entries(prodMap).sort((a,b) => b[1].rev - a[1].rev);
    if(sortedP.length === 0){
        prodHtml = '<tr><td colspan="4" class="px-6 py-4 text-center text-sm text-gray-500">Không có dữ liệu</td></tr>';
    } else {
        sortedP.forEach(([name, data]) => {
            let avg = data.qty > 0 ? (data.rev / data.qty) : 0;
            prodHtml += `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 text-sm font-medium text-gray-900">${name}</td>
                    <td class="px-6 py-4 text-sm text-right text-gray-500">${formatNumber(data.qty)}</td>
                    <td class="px-6 py-4 text-sm text-right text-gray-900 font-medium">${formatCurrency(data.rev)}</td>
                    <td class="px-6 py-4 text-sm text-right text-gray-500">${formatCurrency(avg)}</td>
                </tr>
            `;
        });
    }
    eList.tableProductsBody.innerHTML = prodHtml;

    // 2. Recent Orders (unique orders)
    // We only want the unique latest 20 orders, but we also want to summarize products for each order
    const oMap = new Map();
    filteredData.forEach(item => {
        if(!oMap.has(item.id)){
            oMap.set(item.id, {
                id: item.id,
                dt: item.datetime,
                dateStr: `${item.date} ${item.time}`,
                cust: item.customer,
                ch: item.channel,
                status: item.paymentStatus,
                isPaid: item.isPaid,
                amount: 0,
                products: []
            });
        }
        let o = oMap.get(item.id);
        o.amount += item.amount;
        o.products.push(`${item.product} (x${item.qty})`);
    });

    const aMap = Array.from(oMap.values()).sort((a,b) => b.dt - a.dt).slice(0, 20);

    let ordHtml = '';
    if(aMap.length === 0){
        ordHtml = '<tr><td colspan="6" class="px-6 py-4 text-center text-sm text-gray-500">Không có dữ liệu</td></tr>';
    } else {
        aMap.forEach(o => {
            let badgeCh = '';
            if(o.ch.toUpperCase() === 'POS') badgeCh = `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">POS</span>`;
            else badgeCh = `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">WEB</span>`;
            
            let badgeStT = o.isPaid ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
            
            ordHtml += `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 text-sm font-medium text-gray-900">${o.id}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">${o.dateStr}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">${o.cust}</td>
                    <td class="px-4 py-3 text-sm text-gray-500 truncate max-w-xs pr-20" title="${o.products.join(', ')}">${o.products.join(', ')}</td>
                    <td class="px-4 py-3 text-sm text-right text-gray-900 font-medium">${formatCurrency(o.amount)}</td>
                    <td class="px-4 py-3 text-sm text-center">
                        <div class="flex flex-col gap-1 items-center justify-center">
                            ${badgeCh}
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeStT}">${o.status || 'Chưa XĐ'}</span>
                        </div>
                    </td>
                </tr>
            `;
        });
    }
    eList.tableOrdersBody.innerHTML = ordHtml;
}

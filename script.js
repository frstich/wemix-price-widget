document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTS ---
    const priceElement = document.getElementById('price');
    const priceChangeElement = document.getElementById('price-change');
    const lastUpdatedElement = document.getElementById('last-updated');
    const closeAppElement = document.getElementById('close-app');
    const refreshBtn = document.getElementById('refresh-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const backBtn = document.getElementById('back-btn');
    const headerLink = document.getElementById('header-link');
    const flipper = document.querySelector('.widget-flipper');
    const sparklineCanvas = document.getElementById('sparkline');
    const sparklineCtx = sparklineCanvas.getContext('2d');

    // Settings Elements
    const themeSelect = document.getElementById('theme-select');
    const currencySelect = document.getElementById('currency-select');
    const refreshSelect = document.getElementById('refresh-select');
    const alwaysOnTopCheck = document.getElementById('always-on-top');

    // --- STATE ---
    let priceInterval;
    let currentSettings = {};

    const currencySymbols = {
        usd: '$',
        eur: '€',
        jpy: '¥'
    };

    // --- API & DATA ---
    const fetchWemixData = async () => {
        try {
            const currency = currentSettings.currency || 'usd';
            const priceResponse = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=wemix-token&vs_currencies=${currency}&include_24hr_change=true`);
            const priceData = await priceResponse.json();
            
            const chartResponse = await fetch(`https://api.coingecko.com/api/v3/coins/wemix-token/market_chart?vs_currency=${currency}&days=1`);
            const chartData = await chartResponse.json();

            updateUI(priceData['wemix-token'], chartData.prices);

        } catch (error) {
            console.error('Error fetching WEMIX data:', error);
            priceElement.textContent = 'Error';
        }
    };

    // --- UI UPDATES ---
    const updateUI = (priceData, chartData) => {
        if (priceData) {
            const currency = currentSettings.currency;
            const symbol = currencySymbols[currency];
            const price = priceData[currency];
            const change = priceData[`${currency}_24h_change`];

            priceElement.textContent = `${symbol}${price.toFixed(4)}`;
            priceChangeElement.textContent = `${change.toFixed(2)}%`;

            priceChangeElement.classList.remove('positive', 'negative', 'neutral');
            if (change > 0) priceChangeElement.classList.add('positive');
            else if (change < 0) priceChangeElement.classList.add('negative');
            else priceChangeElement.classList.add('neutral');

            const now = new Date();
            lastUpdatedElement.textContent = `Updated: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            
            drawSparkline(chartData);
        } else {
            priceElement.textContent = 'N/A';
        }
    };

    const drawSparkline = (data) => {
        const prices = data.map(p => p[1]);
        const max = Math.max(...prices);
        const min = Math.min(...prices);
        const width = sparklineCanvas.width;
        const height = sparklineCanvas.height;

        sparklineCtx.clearRect(0, 0, width, height);
        sparklineCtx.beginPath();
        sparklineCtx.strokeStyle = priceChangeElement.classList.contains('positive') ? '#4caf50' : '#f44336';
        sparklineCtx.lineWidth = 2;

        prices.forEach((price, index) => {
            const x = (index / (prices.length - 1)) * width;
            const y = height - ((price - min) / (max - min)) * height;
            if (index === 0) {
                sparklineCtx.moveTo(x, y);
            } else {
                sparklineCtx.lineTo(x, y);
            }
        });
        sparklineCtx.stroke();
    };

    // --- SETTINGS ---
    const loadSettings = () => {
        const savedSettings = JSON.parse(localStorage.getItem('wemixWidgetSettings'));
        const defaultSettings = {
            theme: 'dark',
            currency: 'usd',
            refreshRate: 60000,
            alwaysOnTop: true
        };
        currentSettings = { ...defaultSettings, ...savedSettings };
        applySettings();
    };

    const saveSettings = () => {
        localStorage.setItem('wemixWidgetSettings', JSON.stringify(currentSettings));
    };

    const applySettings = () => {
        // Theme
        document.querySelector('.widget-front .widget-container').className = `widget-container ${currentSettings.theme}-theme`;
        document.querySelector('.widget-back .widget-container').className = `widget-container ${currentSettings.theme}-theme`;
        themeSelect.value = currentSettings.theme;

        // Currency
        currencySelect.value = currentSettings.currency;

        // Refresh Rate
        refreshSelect.value = currentSettings.refreshRate;
        if (priceInterval) clearInterval(priceInterval);
        priceInterval = setInterval(fetchWemixData, currentSettings.refreshRate);

        // Always on Top
        alwaysOnTopCheck.checked = currentSettings.alwaysOnTop;
        if (window.electron) {
            window.electron.send('set-always-on-top', currentSettings.alwaysOnTop);
        }
    };

    // --- EVENT LISTENERS ---
    headerLink.addEventListener('click', () => {
        if (window.electron) {
            window.electron.send('open-external-link', 'https://coinmarketcap.com/currencies/wemix-token/');
        }
    });

    closeAppElement.addEventListener('click', () => window.electron.send('close-app'));
    refreshBtn.addEventListener('click', fetchWemixData);
    settingsBtn.addEventListener('click', () => flipper.classList.add('is-flipped'));
    backBtn.addEventListener('click', () => {
        flipper.classList.remove('is-flipped');
        saveSettings();
        fetchWemixData(); // Refresh data on settings change
    });

    themeSelect.addEventListener('change', (e) => {
        currentSettings.theme = e.target.value;
        applySettings();
    });

    currencySelect.addEventListener('change', (e) => {
        currentSettings.currency = e.target.value;
    });

    refreshSelect.addEventListener('change', (e) => {
        currentSettings.refreshRate = parseInt(e.target.value, 10);
        applySettings();
    });

    alwaysOnTopCheck.addEventListener('change', (e) => {
        currentSettings.alwaysOnTop = e.target.checked;
        applySettings();
    });

    // --- INITIALIZATION ---
    loadSettings();
    fetchWemixData();
});
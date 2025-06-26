document.addEventListener("DOMContentLoaded", () => {
  // --- ELEMENTS ---
  const priceElement = document.getElementById("price");
  const priceChangeElement = document.getElementById("price-change");
  const lastUpdatedElement = document.getElementById("last-updated");
  const closeAppElement = document.getElementById("close-app");
  const refreshBtn = document.getElementById("refresh-btn");
  const settingsBtn = document.getElementById("settings-btn");
  const backBtn = document.getElementById("back-btn");
  const headerLink = document.getElementById("header-link");
  const flipper = document.querySelector(".widget-flipper");
  const sparklineCanvas = document.getElementById("sparkline");
  const sparklineCtx = sparklineCanvas.getContext("2d");

  // Settings Elements
  const themeSelect = document.getElementById("theme-select");
  const currencySelect = document.getElementById("currency-select");
  const refreshSelect = document.getElementById("refresh-select");
  const showGraphCheck = document.getElementById("show-graph");
  const alwaysOnTopCheck = document.getElementById("always-on-top");

  // Control Elements
  const menuBtn = document.getElementById("menu-btn");
  const dropdownMenu = document.getElementById("dropdown-menu");

  // --- STATE ---
  let priceInterval;
  let currentSettings = {};
  let isFetching = false; // To prevent multiple simultaneous fetches

  const currencySymbols = {
    usd: "$",
    eur: "€",
    jpy: "¥",
  };

  // --- API & DATA ---
  const fetchWemixData = async () => {
    if (isFetching) {
      return; // Don't fetch if a request is already in progress
    }
    isFetching = true;

    try {
      // Add subtle loading indication
      priceElement.style.opacity = "0.6";

      const currency = currentSettings.currency || "usd";
      const priceResponse = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=wemix-token&vs_currencies=${currency}&include_24hr_change=true`
      );
      if (!priceResponse.ok)
        throw new Error(`Price API failed: ${priceResponse.status}`);
      const priceData = await priceResponse.json();

      const chartResponse = await fetch(
        `https://api.coingecko.com/api/v3/coins/wemix-token/market_chart?vs_currency=${currency}&days=1`
      );
      if (!chartResponse.ok)
        throw new Error(`Chart API failed: ${chartResponse.status}`);
      const chartData = await chartResponse.json();

      // Only update the UI if the API returned valid data for WEMIX.
      // This prevents "N/A" from showing if we get rate-limited.
      if (priceData["wemix-token"] && chartData.prices) {
        updateUI(priceData["wemix-token"], chartData.prices);
      } else {
        console.warn(
          "API did not return WEMIX data, possibly rate-limited. Retaining old data."
        );
      }
    } catch (error) {
      console.error("Error fetching WEMIX data:", error);
      priceElement.textContent = "Error";
    } finally {
      priceElement.style.opacity = "1";
      isFetching = false; // Release the lock, allowing for a new fetch
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

      priceChangeElement.classList.remove("positive", "negative", "neutral");
      if (change > 0) priceChangeElement.classList.add("positive");
      else if (change < 0) priceChangeElement.classList.add("negative");
      else priceChangeElement.classList.add("neutral");

      const now = new Date();
      lastUpdatedElement.textContent = `Updated: ${now
        .getHours()
        .toString()
        .padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

      drawSparkline(chartData);
    } else {
      priceElement.textContent = "N/A";
    }
  };

  const resizeCanvas = () => {
    const container = document.querySelector(".price-container");
    const containerWidth = container.offsetWidth - 40; // Account for padding
    sparklineCanvas.width = Math.max(200, containerWidth);
    sparklineCanvas.height = 50;
  };

  const drawSparkline = (data) => {
    // Only draw if graph is enabled
    if (!currentSettings.showGraph) {
      return;
    }

    resizeCanvas(); // Ensure canvas is properly sized

    const prices = data.map((p) => p[1]);
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    const width = sparklineCanvas.width;
    const height = sparklineCanvas.height;

    sparklineCtx.clearRect(0, 0, width, height);
    sparklineCtx.beginPath();
    sparklineCtx.strokeStyle = priceChangeElement.classList.contains("positive")
      ? "#4caf50"
      : "#f44336";
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
    const savedSettings = JSON.parse(
      localStorage.getItem("wemixWidgetSettings")
    );
    const defaultSettings = {
      theme: "dark",
      currency: "usd",
      refreshRate: 60000,
      showGraph: true,
      alwaysOnTop: true,
    };
    currentSettings = { ...defaultSettings, ...savedSettings };
    applySettings();
  };

  const saveSettings = () => {
    localStorage.setItem(
      "wemixWidgetSettings",
      JSON.stringify(currentSettings)
    );
  };

  const applySettings = () => {
    // Theme - Apply to both front and back containers
    const frontContainer = document.querySelector(
      ".widget-front .widget-container"
    );
    const backContainer = document.querySelector(
      ".widget-back .widget-container"
    );

    frontContainer.className = `widget-container ${currentSettings.theme}-theme`;
    backContainer.className = `widget-container ${currentSettings.theme}-theme`;
    themeSelect.value = currentSettings.theme;

    // Currency
    currencySelect.value = currentSettings.currency;

    // Refresh Rate
    refreshSelect.value = currentSettings.refreshRate;
    if (priceInterval) clearInterval(priceInterval);
    priceInterval = setInterval(fetchWemixData, currentSettings.refreshRate);

    // Show Graph
    showGraphCheck.checked = currentSettings.showGraph;
    sparklineCanvas.classList.toggle("hidden", !currentSettings.showGraph);

    // Always on Top
    alwaysOnTopCheck.checked = currentSettings.alwaysOnTop;
    if (window.electron) {
      window.electron.send("set-always-on-top", currentSettings.alwaysOnTop);
    }
  };

  // --- MENU FUNCTIONALITY ---
  let menuOpen = false;

  const toggleMenu = () => {
    menuOpen = !menuOpen;
    dropdownMenu.classList.toggle("show", menuOpen);
  };

  const closeMenu = () => {
    if (menuOpen) {
      menuOpen = false;
      dropdownMenu.classList.remove("show");
    }
  };

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".control-buttons")) {
      closeMenu();
    }
  });

  // Keyboard accessibility
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
    }
  });

  // --- EVENT LISTENERS ---
  headerLink.addEventListener("click", () => {
    if (window.electron) {
      window.electron.send(
        "open-external-link",
        "https://coinmarketcap.com/currencies/wemix-token/"
      );
    }
  });

  // Menu Controls
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  closeAppElement.addEventListener("click", () => {
    closeMenu();
    if (window.electron) {
      window.electron.send("close-app");
    }
  });

  refreshBtn.addEventListener("click", () => {
    closeMenu();
    fetchWemixData();
  });

  settingsBtn.addEventListener("click", () => {
    closeMenu();
    flipper.classList.add("is-flipped");
  });

  backBtn.addEventListener("click", () => {
    flipper.classList.remove("is-flipped");
    saveSettings();
    fetchWemixData(); // Refresh data on settings change
  });

  themeSelect.addEventListener("change", (e) => {
    currentSettings.theme = e.target.value;
    applySettings();
  });

  currencySelect.addEventListener("change", (e) => {
    currentSettings.currency = e.target.value;
    // Apply currency change immediately
    fetchWemixData();
  });

  refreshSelect.addEventListener("change", (e) => {
    currentSettings.refreshRate = parseInt(e.target.value, 10);
    applySettings();
  });

  showGraphCheck.addEventListener("change", (e) => {
    currentSettings.showGraph = e.target.checked;
    applySettings();
  });

  alwaysOnTopCheck.addEventListener("change", (e) => {
    currentSettings.alwaysOnTop = e.target.checked;
    applySettings();
  });

  // --- WINDOW RESIZE HANDLING ---
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resizeCanvas();
      // Redraw sparkline if we have data
      const ctx = sparklineCanvas.getContext("2d");
      const imageData = ctx.getImageData(
        0,
        0,
        sparklineCanvas.width,
        sparklineCanvas.height
      );
      const hasContent = imageData.data.some((pixel) => pixel !== 0);

      if (hasContent) {
        fetchWemixData();
      }
    }, 150);
  });

  // --- INITIALIZATION ---
  loadSettings();
  fetchWemixData();
});

const fetchElectricityPrices = async (start, end) => {
  const apiUrl = `https://sahkotin.fi/prices?fix&vat&start=${start}&end=${end}`;
  
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    const data = await response.json();
    return data.prices.map(item => item.value / 10);
  } catch (error) {
    console.error("Error fetching electricity price:", error.message);
    return [];
  }
};

const calculateAverage = (prices) => {
  return prices.reduce((total, price) => total + price, 0) / prices.length;
};

const fetchElectricityComparison = async () => {
  const getThreeMonthAverage = async () => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(today.getMonth() - 3);

    const start = startDate.toISOString().split("T")[0] + "T00:00:00.000Z";
    const end = today.toISOString().split("T")[0] + "T23:59:59.999Z";

    const prices = await fetchElectricityPrices(start, end);
    if (prices.length === 0) return null;

    return calculateAverage(prices);
  };

  const getTodayAverage = async () => {
    const today = new Date().toISOString().split("T")[0];
    const start = `${today}T00:00:00.000Z`;
    const end = `${today}T23:59:59.999Z`;

    const prices = await fetchElectricityPrices(start, end);
    if (prices.length === 0) return null;

    return calculateAverage(prices);
  };

  const threeMonthAverage = await getThreeMonthAverage();
  const todayAverage = await getTodayAverage();

  if (threeMonthAverage === null || todayAverage === null) {
    console.log("Not enough data available");
    return "Ei tarpeeksi dataa";
  }

  const difference = todayAverage - threeMonthAverage;
  const threshold = threeMonthAverage * 0.05;

  if (difference > threshold) return "tavallista korkeampi";
  if (difference < -threshold) return "tavallista matalampi";
  return "normaalilla tasolla";
};

const fetchElectricityTrend = async (period = 30) => {
  const fetchElectricityPrice = async () => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - period);

    const start = `${startDate.toISOString().split("T")[0]}T00:00:00.000Z`;
    const end = `${today.toISOString().split("T")[0]}T23:59:59.999Z`;

    const apiUrl = `https://sahkotin.fi/prices?fix&vat&start=${start}&end=${end}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();
      return data.prices.map(item => item.value / 10);
    } catch (error) {
      console.error("Error fetching electricity price:", error.message);
      return [];
    }
  };

  const electricityTrend = (prices, period) => {
    if (prices.length < period) return "Ei tarpeeksi dataa";

    const recentPrices = prices.slice(-period);
    const average = recentPrices.reduce((total, price) => total + price, 0) / period;

    const lastPrice = prices[prices.length - 1];
    return lastPrice > average ? "nouseva" : "laskeva";
  };
  const prices = await fetchElectricityPrice();
  if (prices.length === 0) {
    console.log("No price data available");
    return "Ei tarpeeksi dataa";
  }
  return electricityTrend(prices, period);
};


const getTodayAveragePrice = async () => {
  const today = new Date().toISOString().split("T")[0];
  const start = `${today}T00:00:00.000Z`;
  const end = `${today}T23:59:59.999Z`;

  const prices = await fetchElectricityPrices(start, end);
  if (prices.length === 0) return null;

  return calculateAverage(prices);
};

module.exports = { fetchElectricityComparison, fetchElectricityTrend, getTodayAveragePrice };
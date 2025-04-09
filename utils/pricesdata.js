const fetchElectricityTrend = async (period = 15) => {
  const fetchElectricityPrice = async () => {
    const today = new Date().toISOString().split("T")[0];
    const start = `${today}T00:00:00.000Z`;
    const end = `${today}T23:59:59.999Z`;

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

module.exports = { fetchElectricityTrend };
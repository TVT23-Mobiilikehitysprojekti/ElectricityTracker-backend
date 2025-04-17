const express = require("express");
const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");

const router = express.Router();

if (!process.env.GEOAPIFY_KEY || !process.env.OPENWEATHER_KEY || !process.env.ENTSOE_API_KEY) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const handleError = (res, error, message) => {
  console.error(message, error);
  res.status(500).json({error: message});
};

router.get("/location", async (req, res) => {
  const { latitude, longitude } = req.query;
  const GEOAPIFY_API_KEY = process.env.GEOAPIFY_KEY;

  if (!latitude || !longitude) {
    return res.status(400).json({error: "Latitude and longitude are required."});
  }

  const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${GEOAPIFY_API_KEY}`;

  try {
    const response = await axios.get(url);
    const cityName = response.data.features[0]?.properties.city || "Unknown city";
    res.json({city: cityName});
  } catch (error) {
    handleError(res, error, "Error fetching reverse geocode data.");
  }
});

router.get("/weather", async (req, res) => {
  const { city, cities } = req.query; 
  const WEATHER_API_KEY = process.env.OPENWEATHER_KEY;

  if (!city && !cities) {
    return res.status(400).json({ error: "City name(s) are required." });
  }

  const fetchWeather = async (cityName) => {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&lang=fi&appid=${WEATHER_API_KEY}`;
    try {
      const response = await axios.get(url);
      return {
        city: cityName,
        temperature: Number((response.data.main.temp - 273.15).toFixed(2)),
        windSpeed: response.data.wind.speed,
        weather: response.data.weather[0].description,
      };
    } catch (error) {
      console.error(`Error fetching weather for ${cityName}:`, error);
      return { city: cityName, error: "Failed to fetch weather data." };
    }
  };

  try {
    const cityList = city ? [city] : cities.split(',');
    const weatherPromises = cityList.map((cityName) => fetchWeather(cityName));
    const weatherData = await Promise.all(weatherPromises);
    res.status(200).json(weatherData);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

const AREAS = {
  EE: "10Y1001A1001A39I",
  FI: "10YFI-1--------U",
};

const parser = new XMLParser();

const getTodayPeriod = () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const format = (date) => {
    const pad = (n) => (n < 10 ? "0" + n : n);
    return (
      date.getUTCFullYear().toString() +
      pad(date.getUTCMonth() + 1) +
      pad(date.getUTCDate()) +
      "0000"
    );
  };

  return {
    start: format(today),
    end: format(tomorrow),
  };
};

const fetchElectricityPrices = async (areaCode, start, end) => {
  const ENTSOE_API_KEY = process.env.ENTSOE_API_KEY;
  const url = `https://web-api.tp.entsoe.eu/api?documentType=A44&in_Domain=${areaCode}&out_Domain=${areaCode}&periodStart=${start}&periodEnd=${end}&securityToken=${ENTSOE_API_KEY}`;
  const res = await axios.get(url);
  return parser.parse(res.data);
};

const parseTodayPrices = (jsonData) => {
  const series = jsonData.Publication_MarketDocument?.TimeSeries;
  if (!series) return Array(24).fill(0);
  const prices = Array(24).fill(null);
  const timeSeries = Array.isArray(series) ? series[0] : series;
  const period = timeSeries.Period;
  const points = Array.isArray(period.Point) ? period.Point : [period.Point];

  points.forEach((point) => {
    const hour = parseInt(point.position, 10) - 1;
    if (hour >= 0 && hour < 24) {
      prices[hour] = parseFloat(point["price.amount"]) / 10;
    }
  });

  return prices;
};

router.get("/electricity-prices", async (req, res) => {
  const { start, end } = getTodayPeriod();
  try {
    const [eeData, fiData] = await Promise.all([
      fetchElectricityPrices(AREAS.EE, start, end),
      fetchElectricityPrices(AREAS.FI, start, end),
    ]);

    res.json({
      EE: parseTodayPrices(eeData),
      FI: parseTodayPrices(fiData),
    });
  } catch (err) {
    console.error("Failed to fetch today's electricity prices:", err);
    res.status(500).json({
      EE: Array(24).fill(0),
      FI: Array(24).fill(0),
    });
  }
});

const getPastDateISO = (daysAgo) => {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - daysAgo);

  const year = pastDate.getUTCFullYear();
  const month = String(pastDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(pastDate.getUTCDate()).padStart(2, "0");

  return `${year}${month}${day}0000`;
};

const parseHistoricalPriceData = (jsonData) => {
  const series = jsonData.Publication_MarketDocument?.TimeSeries;
  if (!series) return [];

  const allPrices = [];
  const timeSeriesArray = Array.isArray(series) ? series : [series];

  timeSeriesArray.forEach((timeSeries) => {
    const period = timeSeries.Period;
    const startDate = period.timeInterval.start;
    const points = Array.isArray(period.Point) ? period.Point : [period.Point];

    points.forEach((point) => {
      allPrices.push({
        date: startDate,
        hour: parseInt(point.position, 10) - 1,
        price: parseFloat(point["price.amount"]) / 10,
      });
    });
  });

  return allPrices;
};

router.get("/electricity-price-history", async (req, res) => {
  const days = parseInt(req.query.days || "30", 10);

  try {
    const start = getPastDateISO(days);
    const end = getTodayPeriod().end;

    const [eeData, fiData] = await Promise.all([
      fetchElectricityPrices(AREAS.EE, start, end),
      fetchElectricityPrices(AREAS.FI, start, end),
    ]);

    res.json({
      EE: parseHistoricalPriceData(eeData),
      FI: parseHistoricalPriceData(fiData),
    });
  } catch (err) {
    console.error("Failed to fetch historical electricity prices:", err);
    res.status(500).json({
      EE: [],
      FI: [],
    });
  }
});

module.exports = router;

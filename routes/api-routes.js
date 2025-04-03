const express = require("express");
const axios = require("axios");
const { cities } = require("../utils/weatherdata");

const router = express.Router();

if (!process.env.GEOAPIFY_KEY || !process.env.OPENWEATHER_KEY || !process.env.NEWSDATA_KEY) {
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
  const { city } = req.query;
  const WEATHER_API_KEY = process.env.OPENWEATHER_KEY;

  if (!city) {
    return res.status(400).json({ error: "City name is required." });
  }

  const fetchWeather = async (cityName) => {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${WEATHER_API_KEY}`;

    try {
      const response = await axios.get(url);
      return {
        temperature: Number((response.data.main.temp - 273.15).toFixed(2)),
        tempMax: Number((response.data.main.temp_max - 273.15).toFixed(2)),
        tempMin: Number((response.data.main.temp_min - 273.15).toFixed(2)),
        windSpeed: response.data.wind.speed,
        weather: response.data.weather[0].description,
        city: cityName,
      };
    } catch (error) {
      console.error("Error fetching weather:", error);
      throw new Error("Error fetching weather data.");
    }
  };

  try {
    const weatherData = await fetchWeather(city);

    cities.forEach((item) => {
      if (item.name === city) {
        item.temperature = weatherData.temperature;
      }
    });

    console.log(cities);

    res.status(200).json(weatherData);
  } catch (error) {
    handleError(res, error, "Error fetching weather data.");
  }
});

router.get("/news", async (req, res) => {
  const NEWS_API_KEY = process.env.NEWSDATA_KEY;

  try {
    const response = await axios.get(`https://newsdata.io/api/1/news?apikey=${NEWS_API_KEY}&q=electricity&country=fi`);
    res.json(response.data.results);
  } catch (error) {
    handleError(res, error, "Failed to fetch news.");
  }
});

module.exports = router;

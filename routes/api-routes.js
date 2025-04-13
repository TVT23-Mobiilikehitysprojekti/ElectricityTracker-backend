const express = require("express");
const axios = require("axios");

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

module.exports = router;

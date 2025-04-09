import axios from 'axios';

const WEATHER_API_KEY = process.env.OPENWEATHER_KEY;

let siikajokiWeather = {};
let lestijärviWeather = {};
let kristinestadWeather = {};
let helsinkiWeather = {};
let rigaWeather = {};
let osloWeather = {};
let berlinWeather = {};

export const fetchWeatherForCities = async () => {
  const cities = [
    { name: "Siikajoki", variable: "siikajokiWeather" },
    { name: "Lestijärvi", variable: "lestijärviWeather" },
    { name: "Kristinestad", variable: "kristinestadWeather" },
    { name: "Helsinki", variable: "helsinkiWeather" },
    { name: "Riga", variable: "rigaWeather" },
    { name: "Oslo", variable: "osloWeather" },
    { name: "Berlin", variable: "berlinWeather" },
  ];

  try {
    for (const city of cities) {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${city.name}&appid=${WEATHER_API_KEY}`;
      const response = await axios.get(url);

      switch (city.name) {
        case "Siikajoki":
          siikajokiWeather = {
            tempMin: Number((response.data.main.temp_min - 273.15).toFixed(2)),
            windSpeed: response.data.wind.speed,
          };
          break;
        case "Lestijärvi":
          lestijärviWeather = { windSpeed: response.data.wind.speed };
          break;
        case "Kristinestad":
          kristinestadWeather = { windSpeed: response.data.wind.speed };
          break;
        case "Helsinki":
          helsinkiWeather = { tempMin: Number((response.data.main.temp_min - 273.15).toFixed(2)) };
          break;
        case "Riga":
          rigaWeather = { tempMin: Number((response.data.main.temp_min - 273.15).toFixed(2)) };
          break;
        case "Oslo":
          osloWeather = { tempMin: Number((response.data.main.temp_min - 273.15).toFixed(2)) };
          break;
        case "Berlin":
          berlinWeather = { tempMin: Number((response.data.main.temp_min - 273.15).toFixed(2)) };
          break;
        default:
          break;
      }
    }

  } catch (error) {
    console.error("Error fetching weather data:", error);
    throw new Error("Unable to fetch weather data for the cities.");
  }
};

export const analyzeWeather = () => {
  const freezingTemperatures = {
    "Pohjois-Suomi": siikajokiWeather.tempMin < 0,
    "Etelä-Suomi": helsinkiWeather.tempMin < 0,
    "Baltian maat": rigaWeather.tempMin < 0,
    "Skandinavia": osloWeather.tempMin < 0,
    "Keski-Eurooppa": berlinWeather.tempMin < 0,
  };

  const windSpeeds = [
    siikajokiWeather.windSpeed,
    lestijärviWeather.windSpeed,
    kristinestadWeather.windSpeed,
  ];
  const validWindSpeeds = windSpeeds.filter(speed => speed !== undefined);
  const averageWindSpeed = validWindSpeeds.reduce((sum, speed) => sum + speed, 0) / validWindSpeeds.length;

  let windSpeedCategory;
  if (averageWindSpeed > 10) {
    windSpeedCategory = "HIGH";
  } else if (averageWindSpeed > 5) {
    windSpeedCategory = "NORMAL";
  } else {
    windSpeedCategory = "LOW";
  }

  return { freezingTemperatures, windSpeedCategory };
};
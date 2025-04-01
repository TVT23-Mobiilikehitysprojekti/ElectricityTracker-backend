const express = require("express");
const storage = require("node-persist");
const axios = require("axios");
const { HfInference } = require("@huggingface/inference");
const { firestore } = require("./firebase/config");
const { collection, getDocs, query, orderBy, limit } = require("firebase/firestore");
require("dotenv").config();

const app = express();
app.use(express.json());

const inference = new HfInference(process.env.HUGGINGFACE_API_KEY);

(async () => {
  await storage.init();
})();

const rateLimiter = async () => {
  const now = Date.now();
  try {
    const lastRequestTimestamp = await storage.getItem("lastRequestTimestamp");
    if (!lastRequestTimestamp || now - lastRequestTimestamp >= 24 * 60 * 60 * 1000) {
      await storage.setItem("lastRequestTimestamp", now);
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

app.get("/latest-summary", async (req, res) => {
  try {
    const summariesCollection = collection(firestore, "summaries");
    const querySnapshot = await getDocs(
      query(summariesCollection, orderBy("timestamp", "desc"), limit(1))
    );

    if (querySnapshot.empty) {
      return res.status(404).json({ error: "No entries found in the database." });
    }

    const latestDoc = querySnapshot.docs[0].data();

    let cleanedSummary = latestDoc.summary;
    if (cleanedSummary.startsWith(latestDoc.input)) {
      cleanedSummary = cleanedSummary.slice(latestDoc.input.length).trim();
    }

    res.json({
      summary: cleanedSummary,
      timestamp: latestDoc.timestamp.toDate(),
    });
  } catch (error) {
    console.error("Error fetching the latest summary:", error);
    res.status(500).json({ error: "Error fetching the latest summary from Firestore." });
  }
});


app.post("/summarize", async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({"error": "Text is required for summarization."});
  }
  if (!(await rateLimiter())) {
    return res.status(429).json({"error": "Rate limit exceeded. Try again after 24 hours."});
  }
  try {
    const response = await inference.textGeneration({
      model: "Finnish-NLP/Ahma-3B-Instruct",
      inputs: text,
      parameters: {
        max_new_tokens: 200,
        temperature: 0.5,
        repetition_penalty: 1.2,
      },
    });

    const generatedText = response.generated_text || "No summary available.";

    const docRef = await addDoc(collection(firestore, "summaries"), {
      input: text,
      summary: generatedText,
      timestamp: new Date(),
    });

    console.log("Document written with ID: ", docRef.id);

    res.json({"message": "Summary saved to Firestore successfully!", "documentId": docRef.id});
  } catch (error) {
    console.error("Error writing to Firestore:", error);
    res.status(500).json({"error": "Error processing text or saving to Firestore."});
  }
});

app.get('/location', async (req, res) => {
  const {latitude, longitude} = req.query;
  const GEOAPIFY_API_KEY = process.env.GEOAPIFY_KEY;

  if (!latitude || !longitude) {
      return res.status(400).json({error: "Latitude and longitude are required"});
  }

  const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${GEOAPIFY_API_KEY}`;

  try {
      const response = await axios.get(url);
      const cityName = response.data.features[0]?.properties.city || "Unknown city";
      res.json({city: cityName});
  } catch (error) {
      console.error("Error fetching reverse geocode data:", error);
      res.status(500).json({error: "Error fetching reverse geocode data"});
  }
});

app.get("/weather", async (req, res) => {
  const cityName = req.query.city;
  const WEATHER_API_KEY = process.env.OPENWEATHER_KEY;

  const fetchWeather = async (cityName) => {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${WEATHER_API_KEY}`;

    try {
      const response = await axios.get(url);
      return {
        temperature: (response.data.main.temp - 273.15).toFixed(2),
        windSpeed: response.data.wind.speed,
        weather: response.data.weather[0].description,
        city: cityName,
      };
    } catch (error) {
      console.error("Error fetching weather:", error);
      throw new Error("Error fetching weather data");
    }
  };

  try {
    const weatherData = await fetchWeather(cityName);
    res.status(200).json(weatherData);
  } catch (error) {
    res.status(500).json({error: error.message});
  }
});

router.get("/news", async (req, res) => {
    const NEWS_API_KEY = process.env.NEWSDATA_KEY;
    try {
        const response = await axios.get(`https://newsdata.io/api/1/news?apikey=${NEWS_API_KEY}&q=electricity&country=fi`);
        
        res.json(response.data.results);
    } catch (error) {
        console.error("Error fetching news:", error.message);
        res.status(500).json({error: "Failed to fetch news"});
    }
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

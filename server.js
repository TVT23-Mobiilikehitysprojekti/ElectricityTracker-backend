const express = require("express");
const storage = require("node-persist");
const { HfInference } = require("@huggingface/inference");
const { firestore } = require("./firebase/config");
const { collection, addDoc } = require("firebase/firestore");
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

app.post("/summarize", async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ "error": "Text is required for summarization." });
  }
  if (!(await rateLimiter())) {
    return res.status(429).json({ "error": "Rate limit exceeded. Try again after 24 hours." });
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

    res.json({ "message": "Summary saved to Firestore successfully!", "documentId": docRef.id });
  } catch (error) {
    console.error("Error writing to Firestore:", error);
    res.status(500).json({ "error": "Error processing text or saving to Firestore." });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

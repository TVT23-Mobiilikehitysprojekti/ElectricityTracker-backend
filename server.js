const express = require("express");
const storage = require("node-persist");
require("dotenv").config();

const apiroutes = require("./routes/api-routes");
const huggingfaceroutes = require("./routes/huggingface-routes");
const voteroutes = require("./routes/vote-routes");

const app = express();
app.use(express.json());

(async () => {
  await storage.init();
})();

app.use("/api", apiroutes);
app.use("/huggingface", huggingfaceroutes);
app.use("/vote", voteroutes)

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

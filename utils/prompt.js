const { fetchWeatherForCities, analyzeWeather } = require("./weatherdata");
const { fetchElectricityComparison, fetchElectricityTrend, getTodayAveragePrice } = require("./pricesdata");
const { getElectricityData } = require("./pricesabroad");

let promptDataArray = [];

function addTextToPromptData(newText) {
  promptDataArray.push(newText);
}

async function buildPrompt() {
  try {
    await fetchWeatherForCities();
    const { freezingTemperatures, windSpeedCategory } = analyzeWeather();

    const freezingRegions = Object.entries(freezingTemperatures)
      .filter(([region, isFreezing]) => isFreezing)
      .map(([region]) => region);

    if (freezingRegions.length > 0) {
      const freezingStatement = `Pakkaslämpötilat ovat vallitsevia seuraavissa alueissa: ${freezingRegions.join(", ")}. Tämä voi nostaa sähkön kysyntää markkinoilla.`;
      addTextToPromptData(freezingStatement);
    } else {
      const nonFreezingStatement = "Lämpötiloilla ei todennäköisesti ole sähkön kysyntää lisäävää vaikutusta tällä hetkellä.";
      addTextToPromptData(nonFreezingStatement);
    }

    let windStatement = "";
    switch (windSpeedCategory) {
      case "HIGH":
        windStatement = "Tuulennopeus on korkea koko Suomessa, mikä voi edistää uusiutuvan energian saatavuutta.";
        break;
      case "NORMAL":
        windStatement = "Tuulennopeus on normaali koko Suomessa, jolla voi olla neutraali vaikutus uusiutuvan energian saatavuuteen.";
        break;
      case "LOW":
        windStatement = "Tuulennopeus on matala koko Suomessa, vaikuttaa uusiutuvan energian saatavuuteen.";
        break;
    }
    addTextToPromptData(windStatement);

    const prices = await fetchElectricityComparison();
    const pricesTrend = await fetchElectricityTrend();
    
    const finlandAveragePrice = await getTodayAveragePrice();

    const { estonianPrice, swedishPrice } = await getElectricityData(finlandAveragePrice);

    const foreignPrices = `Ulkomailla sähkön hinta on Virossa ${estonianPrice} ja Ruotsissa ${swedishPrice}, jolla voi olla epäsuora vaikutus sähkön hintaan Suomessa.`;
    addTextToPromptData(foreignPrices);

    const promptData = promptDataArray.join(" ");

    return {
      text: `Pörssisähkön hinta on tällä hetkellä ${prices}, ollen tänään ${finlandAveragePrice.toFixed(2)} snt/kWh ja hintojen trendi kuukauden ajalta on ollut ${pricesTrend}. Huomioi seuraavat tekijät: ${promptData} Ottaen huomioon nämä tekijät, selitä miten ne voivat vaikuttaa markkinoiden tilanteeseen. Muista, että hinta on muuttuva ja se voi nousta tai laskea olosuhteiden mukaan. Pyri selittämään ilmiön taustalla olevat syyt selkeästi ja yksinkertaisesti. Vastaa vain suomeksi, älä käytä muita kieliä.`,
    };
  } catch (error) {
    console.error("Error in buildPrompt:", error.message);
    return undefined;
  }
}

module.exports = { addTextToPromptData, buildPrompt };
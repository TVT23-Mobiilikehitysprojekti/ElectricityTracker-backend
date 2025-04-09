const { fetchWeatherForCities, analyzeWeather } = require("./weatherdata");

let promptDataArray = [];

function addTextToPromptData(newText) {
  promptDataArray.push(newText);
}

async function buildPrompt(prices) {
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

    const promptData = promptDataArray.join(" ");
    return {
      text: `Pörssisähkön hinta on tällä hetkellä ${prices}. Huomioi seuraavat tekijät: ${promptData} Ottaen huomioon nämä tekijät, selitä, miksi sähkön hinta on ${prices} ja miten ne voivat vaikuttaa markkinoiden tilanteeseen. Muista, että hinta on muuttuva ja se voi nousta tai laskea olosuhteiden mukaan. Pyri selittämään ilmiön taustalla olevat syyt selkeästi ja yksinkertaisesti. Vastaa vain suomeksi, älä käytä muita kieliä.`,
    };
  } catch (error) {
    console.error("Error in buildPrompt:", error.message);
    return undefined;
  }
}

module.exports = { addTextToPromptData, buildPrompt };
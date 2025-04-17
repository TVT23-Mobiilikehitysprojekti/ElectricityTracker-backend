const { XMLParser } = require("fast-xml-parser");

const ENTSOE_API_KEY = process.env.ENTSOE_API_KEY;

const AREAS = {
  EE: "10Y1001A1001A39I",
  SE3: "10Y1001A1001A46L",
};

const getYesterdayPeriod = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const format = (date) => {
    const pad = (n) => (n < 10 ? "0" + n : n);
    return `${date.getUTCFullYear()}${pad(yesterday.getUTCMonth() + 1)}${pad(yesterday.getUTCDate())}0000`;
  };

  return {
    start: format(yesterday),
    end: format(new Date()),
  };
};

const fetchPrices = async (domainCode, start, end) => {
  const url = `https://web-api.tp.entsoe.eu/api?documentType=A44&in_Domain=${domainCode}&out_Domain=${domainCode}&periodStart=${start}&periodEnd=${end}&securityToken=${ENTSOE_API_KEY}`;

  const parser = new XMLParser({ ignoreAttributes: false });

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Error fetching prices: ${response.status} - ${response.statusText}`);
      return null;
    }

    const xmlText = await response.text();

    const parsed = parser.parse(xmlText);
    return parsePriceData(parsed);
  } catch (error) {
    console.error(`Error fetching prices for ${domainCode}:`, error.message);
    return null;
  }
};

const parsePriceData = (jsonData) => {
  const timeSeriesArray = jsonData.Publication_MarketDocument?.TimeSeries;
  if (!timeSeriesArray) return [];

  const extractedPrices = [];
  const seriesList = Array.isArray(timeSeriesArray) ? timeSeriesArray : [timeSeriesArray];

  seriesList.forEach((series) => {
    const period = series.Period;
    const points = Array.isArray(period.Point) ? period.Point : [period.Point];

    points.forEach((point) => {
      extractedPrices.push(parseFloat(point["price.amount"]) / 10);
    });
  });

  return extractedPrices.length ? extractedPrices : null;
};

const comparePrices = (referencePrice, otherPrice) => {
  if (typeof referencePrice !== "number" || typeof otherPrice !== "number") {
    return "(vertailu ei mahdollinen)";
  }
  return otherPrice > referencePrice ? "korkeampi" : "matalampi";
};

const getElectricityData = async (finlandAveragePrice) => {
  try {
    const { start, end } = getYesterdayPeriod();

    const [estoniaPrices, swedenPrices] = await Promise.all([
      fetchPrices(AREAS.EE, start, end),
      fetchPrices(AREAS.SE3, start, end),
    ]);

    const estoniaAveragePrice = estoniaPrices && estoniaPrices.length
      ? estoniaPrices.reduce((sum, price) => sum + price, 0) / estoniaPrices.length
      : "(ei saatavilla)";

    const swedenAveragePrice = swedenPrices && swedenPrices.length
      ? swedenPrices.reduce((sum, price) => sum + price, 0) / swedenPrices.length
      : "(ei saatavilla)";

    return {
      estonianPrice: typeof estoniaAveragePrice === "number"
        ? comparePrices(finlandAveragePrice, estoniaAveragePrice)
        : estoniaAveragePrice,
      swedishPrice: typeof swedenAveragePrice === "number"
        ? comparePrices(finlandAveragePrice, swedenAveragePrice)
        : swedenAveragePrice,
    };
  } catch (error) {
    console.error("Error fetching electricity data:", error.message);
    return {
      estonianPrice: "(ei saatavilla)",
      swedishPrice: "(ei saatavilla)",
    };
  }
};

module.exports = { getElectricityData };

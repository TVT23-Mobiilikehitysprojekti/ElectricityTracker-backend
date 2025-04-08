const prices = "nouseva";
let promptDataArray = [];

function addTextToPromptData(newText) {
  promptDataArray.push(newText);
}

addTextToPromptData("Tuulennopeus on matala koko Suomessa, vaikuttaa uusiutuvan energian saatavuuteen.");
addTextToPromptData("Lämpötilat ovat pakkasella myös Länsi- ja Keski-Euroopassa joka voi nostaa sähkön kysyntää markkinoilla.");

const promptData = promptDataArray.join(" ");

const promptText = {
  text: `Pörssisähkön hinta on tällä hetkellä ${prices}. Huomioi seuraavat tekijät: ${promptData}. Ottaen huomioon nämä tekijät, selitä, miksi sähkön hinta on ${prices} ja miten ne voivat vaikuttaa markkinoiden tilanteeseen. (Muista, että hinta on muuttuva ja se voi nousta tai laskea olosuhteiden mukaan. Pyri selittämään ilmiön taustalla olevat syyt selkeästi ja yksinkertaisesti. Vastaa vain suomeksi, älä käytä muita kieliä.)`
};

module.exports = promptText;
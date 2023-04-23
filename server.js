require("dotenv").config();
const Alpaca = require("@alpacahq/alpaca-trade-api");
const alpaca = new Alpaca();
const WebSocket = require("ws");
const axios = require("axios");

const wss = new WebSocket("wss://stream.data.alpaca.markets/v1beta1/news");

wss.on("open", () => {
  console.log("Websocket connected!");

  const authMsg = {
    action: "auth",
    key: process.env.APCA_API_KEY_ID,
    secret: process.env.APCA_API_SECRET_KEY,
  };

  wss.send(JSON.stringify(authMsg));

  const subscribeMsg = {
    action: "subscribe",
    news: ["*"],
  };
  wss.send(JSON.stringify(subscribeMsg));
});

wss.on("message", async (message) => {
  console.log("Message is " + message);
  const currentEvent = JSON.parse(message)[0];

  if (currentEvent.T === "n") {
    let tickerSymbol;

    if (currentEvent.symbols && currentEvent.symbols.length > 0) {
      tickerSymbol = currentEvent.symbols[0];
    } else {
      return;
    }

    const apiRequestBody = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Forget all your previous instructions. Pretend you are a financial expert.
           You are a financial expert with stock recommendation experience. 
           Answer “YES” if good news, “NO” if bad news, or “UNKNOWN” if uncertain in the first line. 
           On the next line answer with "STRONG BUY", "STRONG SELL", "BUY", "SELL" or "UNKNOWN". 
           Then elaborate with one short and concise sentence on the next line.`,
        },
        {
          role: "user",
          content: `Given the headline '${currentEvent.headline}', Answer “YES” if good news, “NO” if bad news, or “UNKNOWN” if uncertain in the first line. On the next line answer with "STRONG BUY", "STRONG SELL", "BUY", "SELL" or "UNKNOWN". Then elaborate with one short and concise sentence on the next line.'`,
        },
      ],
    };

    try {
      const response = await axios.post("https://api.openai.com/v1/chat/completions", apiRequestBody, {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      const data = response.data;
      const messageContent = data.choices[0].message.content;
      const lines = messageContent.split("\n");
      const signal = lines[1].trim();

      console.log(`Signal for ${tickerSymbol} ${currentEvent.headline}: ${signal}`);

      if (signal === "STRONG BUY") {
        const order = await alpaca.createOrder({
          symbol: tickerSymbol,
          qty: 1,
          side: "buy",
          type: "market",
          time_in_force: "day",
        });
      } else if (signal === "STRONG SELL") {
        const closedPosition = await alpaca.closePosition(tickerSymbol);
      }
    } catch (error) {
      console.error(`Error executing trade`, error.message);
    }
  }
});

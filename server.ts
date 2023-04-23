import Alpaca from "@alpacahq/alpaca-trade-api";
import WebSocket from "ws";
// import fetch from "node-fetch";
// import * as dotenv from "dotenv";

// dotenv.config();

const alpaca = new Alpaca(); // Environment Variables

// Server < -- > Data Source
// Communication can go both ways
// Data source can send us information
// Send data to the data source (Authenticate, ask what data we want)

// WebSockets are like push notifications on your phone
// Whenever an event happens (texts you, snapchat, anything) you get a notification

const wss = new WebSocket("wss://stream.data.alpaca.markets/v1beta1/news");

wss.on("open", function () {
  console.log("Websocket connected!");

  // We now have to log in to the data source
  const authMsg = {
    action: "auth",
    key: process.env.APCA_API_KEY_ID,
    secret: process.env.APCA_API_SECRET_KEY,
  };

  wss.send(JSON.stringify(authMsg)); // Send auth data to ws, "log us in"

  // Subscribe to all news feeds
  const subscribeMsg = {
    action: "subscribe",
    news: ["*"], // ["TSLA"]
  };
  wss.send(JSON.stringify(subscribeMsg)); // Connecting us to the live data source of news
});

interface Event {
  T: string;
  headline: string;
  symbols: string[];
}

wss.on("message", async function (message: string) {
const { default: fetch, Response } = await import("node-fetch");

  console.log("Message is " + message);
  // message is a STRING
  const currentEvent: Event = JSON.parse(message)[0];
  // "T": "n" newsEvent
  if (currentEvent.T === "n") {
    // This is a news event
    let companyImpact = 0;

    // Ask ChatGPT its thoughts on the headline
    const apiRequestBody = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Only respond with a number from 1-100 detailing the impact of the headline.",
        },
        {
          role: "user",
          content: `Given the headline '${currentEvent.headline}', show me a number from 1-100 detailing the impact of this headline.`,
        },
      ],
    };

    await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiRequestBody),
    })
    .then((data: any) => {
        return data.json();
    })
    .then((data: any) => {
        console.log(data);
        console.log(data.choices[0].message);
        companyImpact = parseInt(data.choices[0].message.content);
    });

    // Make trades based on the output (of the impact saved in companyImpact)
    const tickerSymbol = currentEvent.symbols[0];
    // 1 - 100, 1 being the most negative, 100 being the most positive impact on a company.
    if (companyImpact >= 70) {
        // if score >= 70 : BUY STOCK
        // Buy stock
        let order = await alpaca.createOrder({
        symbol: tickerSymbol,
        qty: 1,
        side: "buy",
        type: "market",
        time_in_force: "day", // day ends, it won't trade.
        });
    } else if (companyImpact <= 30) {
        // else if impact <= 30: SELL ALL OF STOCK
        // Sell stock
        let closedPosition = await alpaca.closePosition(tickerSymbol);
    }
}
})

  
  
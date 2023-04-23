require('dotenv').config();
const Alpaca = require('@alpacahq/alpaca-trade-api');
const alpaca = new Alpaca();
const axios = require('axios');

const getNews = async () => {
  try {
    const newsUrl = 'https://data.alpaca.markets/v1beta1/news';
    const response = await axios.get(newsUrl, {
      headers: {
        'APCA-API-KEY-ID': process.env.APCA_API_KEY_ID,
        'APCA-API-SECRET-KEY': process.env.APCA_API_SECRET_KEY,
      },
    });

    const newsData = response.data.news;
    for (const currentEvent of newsData) {
    //   console.log(currentEvent);
    //   if (currentEvent.type === 'n') {
        let companyImpact = 0;
        let tickerSymbol = '';

        const apiRequestBody = {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `Forget all your previous instructions. Pretend you are a financial expert.
               You are a financial expert with stock recommendation experience. 
               Answer “YES” if good news, “NO” if bad news, or “UNKNOWN” if uncertain in the first line. 
               On the next line answer with "STRONG BUY", "STRONG SELL", "BUY", "SELL" or "UNKNOWN". 
               Then elaborate with one short and concise sentence on the next line.`,
            },
            {
              role: 'user',
              content: `Given the headline '${currentEvent.headline}', Answer “YES” if good news, “NO” if bad news, or “UNKNOWN” if uncertain in the first line. On the next line answer with "STRONG BUY", "STRONG SELL", "BUY", "SELL" or "UNKNOWN". Then elaborate with one short and concise sentence on the next line.'`,
            },
          ],
        };


        const response = await axios.post('https://api.openai.com/v1/chat/completions', apiRequestBody, {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        const data = response.data;
        
        // Extract the message content from the ChatGPT response
        const messageContent = data.choices[0].message.content;
        
        // Split the message content into lines
        const lines = messageContent.split('\n');
        
        // Get the second line, which contains the signal (STRONG BUY, STRONG SELL, etc.)
        const signal = lines[1].trim(); // .trim() removes any leading or trailing whitespace
        
        // Process the signal, e.g., log it or use it for trading decisions
        console.log(`Signal for ${currentEvent.headline}: ${signal}`);

        if (currentEvent.symbols && currentEvent.symbols.length > 0) {
            tickerSymbol = currentEvent.symbols[0];
        } else {
            continue;
        }


        try {
            if (signal === 'STRONG BUY') {
                const order = await alpaca.createOrder({
                  symbol: tickerSymbol,
                  qty: 1,
                  side: 'buy',
                  type: 'market',
                  time_in_force: 'day',
                });
              } else if (signal === 'STRONG SELL')  {
                  const closedPosition = await alpaca.closePosition(tickerSymbol);
              }

        } catch (error) {
            console.error(`Error executing`);
        }
    }
  } catch (error) {
    console.error(`Error fetching news data: ${error}`);
  }
};  

getNews();

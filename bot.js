require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN;
const apiEndpoint = 'https://api.dreaded.site/api/chatgpt';

const bot = new TelegramBot(token, { polling: true });

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userInput = msg.text;

  try {
    const response = await axios.post(apiEndpoint, {
      messages: [{ role: 'user', content: userInput }]
    });
    const aiMessage = response.data.choices[0].message.content;
    bot.sendMessage(chatId, aiMessage);
  } catch (error) {
    console.error('API error:', error);
    bot.sendMessage(chatId, '⚠️ Error processing your request.');
  }
});

console.log('Bot is running...');

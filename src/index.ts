import { Telegraf, Markup } from 'telegraf';

import { about } from './commands';
import { greeting } from './text';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';
import { InlineQueryResult } from "telegraf/types";

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ENVIRONMENT = process.env.NODE_ENV || '';

const bot = new Telegraf(BOT_TOKEN);

const question = ""
const keyboard = Markup.keyboard([
	Markup.button.text("BONK"),
	Markup.button.text("SOL"),
	Markup.button.text("BTC"),
	Markup.button.text("ETH"),
]);

// play will show next to reveal if ready, otherwise continue to ask
// wallet will display balance and let user withdraw and export key
bot.start(ctx => ctx.reply(question, keyboard));

bot.command("play", async ctx =>{
	await ctx.replyWithPhoto({ url: "https://github.com/gator-labs/chomp/blob/main/public/images/chomp-graphic.png?raw=true"})
  // await ctx.replyWithMarkdownV2("Hey I\\'m ChompBot\\. I'll ask you some questions and you can win BONK if you get them right\\. Are you ready to play?", keyboard)
  await ctx.replyWithMarkdownV2("Which would you HODL through a bear?", keyboard)
  // await ctx.intli
});



bot.command("reveal", async ctx =>{
  await ctx.replyWithMarkdownV2("You need 10,000 BONK to reveal the answer\\. Send 10,000 BONK or 0\\.01 SOL to the address below to reveal the answer\\.")
  ctx.replyWithMarkdownV2("ip5UyE6cXhy6cmxuaHWzW2pWmkFAZuDg8mjXCSroeA4")
});

bot.on("message", async ctx => {
  const txt = ctx.message as any
  console.log(txt.text)

  if (txt.text === "BONK") {
    await ctx.replyWithMarkdownV2("How likely are people to agree with you?", Markup.removeKeyboard())
  } else {
    ctx.replyWithMarkdownV2("Great, I'll let you know when that question is ready to reveal\\. What do you want to do next?")
  }
})

//prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
  await production(req, res, bot);
};

//dev mode
ENVIRONMENT !== 'production' && development(bot);

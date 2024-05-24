import { Telegraf, Markup } from 'telegraf';

import { about } from './commands';
import { greeting } from './text';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';
import { InlineQueryResult } from "telegraf/types";

import { createClient } from '@supabase/supabase-js'
import { Database } from './supabase/database.types';
import { EBotUserState, IBotUser } from './interfaces/bot-users';

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_KEY!

const supabase = createClient<Database>(supabaseUrl, supabaseKey)

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ENVIRONMENT = process.env.NODE_ENV || '';

const bot = new Telegraf(BOT_TOKEN);

const question = "What do you want to do today?"
// const keyboard = Markup.keyboard([
// 	Markup.button.c("BONK"),
// 	Markup.button.text("SOL"),
// 	Markup.button.text("BTC"),
// 	Markup.button.text("ETH"),
// ]);

bot.start(async ctx => {
  console.log("Someone started")
  const newUser: IBotUser = {
    tg_id: ctx.from?.id!,
    tg_first_name: ctx.from?.first_name!,
    tg_username: ctx.from?.username!,
    tg_is_bot: ctx.from?.is_bot!,
    tg_language_code: ctx.from?.language_code!,
    state: EBotUserState.NEW,
    // TODO use chomp API to get an ID
    chomp_id: "TODO"
  }
  console.log(newUser)

  const a = await supabase
    .from('bot_users')
    .insert(newUser).select()

    console.log(a)

  // now - save tg info to DB
  // next - use turnkey to crea
  // future - call create user on chomp
  ctx.reply(question)
});

// bot.command("play", async ctx =>{
// 	await ctx.replyWithPhoto({ url: "https://github.com/gator-labs/chomp/blob/main/public/images/chomp-graphic.png?raw=true"})
//   // await ctx.replyWithMarkdownV2("Hey I\\'m ChompBot\\. I'll ask you some questions and you can win BONK if you get them right\\. Are you ready to play?", keyboard)
//   await ctx.replyWithMarkdownV2("Which would you HODL through a bear?", keyboard)
//   // await ctx.intli
// });



// bot.command("reveal", async ctx =>{
//   await ctx.replyWithMarkdownV2("You need 10,000 BONK to reveal the answer\\. Send 10,000 BONK or 0\\.01 SOL to the address below to reveal the answer\\.")
//   ctx.replyWithMarkdownV2("ip5UyE6cXhy6cmxuaHWzW2pWmkFAZuDg8mjXCSroeA4")
// });

// bot.on("message", async ctx => {
//   const txt = ctx.message as any
//   console.log(txt.text)
//   console.log(ctx)
//   const {update: {message: {from}}} = ctx
//   console.log(from)

//   if (txt.text === "BONK") {
//     await ctx.replyWithMarkdownV2("How likely are people to agree with you?", Markup.removeKeyboard())
//   } else {
//     ctx.replyWithMarkdownV2("Great, I'll let you know when that question is ready to reveal\\. What do you want to do next?")
//   }
// })

//prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
  await production(req, res, bot);
};

//dev mode
ENVIRONMENT !== 'production' && development(bot);

import { Telegraf, Markup } from 'telegraf';

import { about } from './commands';
import { greeting } from './text';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';
import { InlineQueryResult } from "telegraf/types";

import { createClient } from '@supabase/supabase-js'
import { Database } from './supabase/database.types';
import { EBotUserState, IBotUser } from './interfaces/bot-users';
import { adaptCtx2User } from './lib/utils';

/*
  SETUP
*/

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_KEY!

const supabase = createClient<Database>(supabaseUrl, supabaseKey)

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ENVIRONMENT = process.env.NODE_ENV || '';

const bot = new Telegraf(BOT_TOKEN);

//prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
  await production(req, res, bot);
};

//dev mode
ENVIRONMENT !== 'production' && development(bot);

/*
  ENTRYPOINT - START
*/
bot.start(async ctx => {
  console.log("Start command received")
  const newUser: IBotUser = adaptCtx2User(ctx)

  const {data, error} = await supabase
    .from('bot_users')
    .insert(newUser).select()

  // now - save tg info to DB
  // next - use turnkey to crea
  // future - call create user on chomp
  const prompt = "What do you want to do today?"
  const buttonOptions: {[k: string]: string }= {
    "new.quickstart": "Start answering 🎲",
    "new.reveal": "Reveal Answers 💵"
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
});

/*
  ANSWERING FIRST ORDER
*/
bot.action("new.quickstart", async ctx =>{
  const user: IBotUser = adaptCtx2User(ctx)

  const prompt = "Which of the following is NOT a DEX?"
  const buttonOptions: {[k: string]: string }= {
    "answering-first-order.1": "Jupiter",
    "answering-first-order.2": "Raydium",
    "answering-first-order.3": "Orca",
    "answering-first-order.4": "Phoenix",
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
});

/*
  ANSWERING SECOND ORDER
*/
const secondPrompt = "What percentage of people do you think answered NO?"
const secondButtonOptions: {[k: string]: string }= {
  "answering-second-order.0": "0%",
  "answering-second-order.10": "10%",
  "answering-second-order.20": "20%",
  "answering-second-order.30": "30%",
  "answering-second-order.40": "40%",
  "answering-second-order.50": "50%",
  "answering-second-order.60": "60%",
  "answering-second-order.70": "70%",
  "answering-second-order.80": "80%",
  "answering-second-order.90": "90%",
  "answering-second-order.100": "100%",
}
const secondButtons = Object.keys(secondButtonOptions).map(key => Markup.button.callback(secondButtonOptions[key], key))
const formattedSecondButtons = [
  secondButtons.slice(0, 5),  // Elements 0-4
  secondButtons.slice(5, 6),  // Element 5
  secondButtons.slice(6)      // Elements 6 and beyond
];

bot.action("answering-first-order.1", async ctx =>{
  ctx.reply(secondPrompt, Markup.inlineKeyboard(formattedSecondButtons))
})

bot.action("answering-first-order.2", async ctx =>{
  ctx.reply(secondPrompt, Markup.inlineKeyboard(formattedSecondButtons))
})

bot.action("answering-first-order.3", async ctx =>{
  ctx.reply(secondPrompt, Markup.inlineKeyboard(formattedSecondButtons))
})

bot.action("answering-first-order.4", async ctx =>{
  ctx.reply(secondPrompt, Markup.inlineKeyboard(formattedSecondButtons))
})

bot.on("message", async ctx => {
  const txt = ctx.message as any
  console.log("Got message " + txt.text)
})

/*
  COMPLETED ANSWERING
*/

bot.action("answering-second-order.0", async ctx =>{
  const prompt = "Well done! You just chomped a question.\n\nWhat do you want to do next?"
  const buttonOptions: {[k: string]: string }= {
    "completed-answering.more": "Answer more 🎲",
    "completed-answering.home": "Go home 🏡",
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
})

bot.action("answering-second-order.10", async ctx =>{
  const prompt = "Well done! You just chomped a question.\n\nWhat do you want to do next?"
  const buttonOptions: {[k: string]: string }= {
    "completed-answering.more": "Answer more 🎲",
    "completed-answering.home": "Go home 🏡",
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
})

bot.action("answering-second-order.20", async ctx =>{
  const prompt = "Well done! You just chomped a question.\n\nWhat do you want to do next?"
  const buttonOptions: {[k: string]: string }= {
    "completed-answering.more": "Answer more 🎲",
    "completed-answering.home": "Go home 🏡",
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
})

bot.action("answering-second-order.30", async ctx =>{
  const prompt = "Well done! You just chomped a question.\n\nWhat do you want to do next?"
  const buttonOptions: {[k: string]: string }= {
    "completed-answering.more": "Answer more 🎲",
    "completed-answering.home": "Go home 🏡",
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
})

bot.action("answering-second-order.40", async ctx =>{
  const prompt = "Well done! You just chomped a question.\n\nWhat do you want to do next?"
  const buttonOptions: {[k: string]: string }= {
    "completed-answering.more": "Answer more 🎲",
    "completed-answering.home": "Go home 🏡",
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
})

bot.action("answering-second-order.50", async ctx =>{
  const prompt = "Well done! You just chomped a question.\n\nWhat do you want to do next?"
  const buttonOptions: {[k: string]: string }= {
    "completed-answering.more": "Answer more 🎲",
    "completed-answering.home": "Go home 🏡",
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
})

bot.action("answering-second-order.60", async ctx =>{
  const prompt = "Well done! You just chomped a question.\n\nWhat do you want to do next?"
  const buttonOptions: {[k: string]: string }= {
    "completed-answering.more": "Answer more 🎲",
    "completed-answering.home": "Go home 🏡",
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
})

bot.action("answering-second-order.70", async ctx =>{
  const prompt = "Well done! You just chomped a question.\n\nWhat do you want to do next?"
  const buttonOptions: {[k: string]: string }= {
    "completed-answering.more": "Answer more 🎲",
    "completed-answering.home": "Go home 🏡",
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
})

bot.action("answering-second-order.80", async ctx =>{
  const prompt = "Well done! You just chomped a question.\n\nWhat do you want to do next?"
  const buttonOptions: {[k: string]: string }= {
    "completed-answering.more": "Answer more 🎲",
    "completed-answering.home": "Go home 🏡",
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
})

bot.action("answering-second-order.90", async ctx =>{
  const prompt = "Well done! You just chomped a question.\n\nWhat do you want to do next?"
  const buttonOptions: {[k: string]: string }= {
    "completed-answering.more": "Answer more 🎲",
    "completed-answering.home": "Go home 🏡",
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
})

bot.action("answering-second-order.100", async ctx =>{
  const prompt = "Well done! You just chomped a question.\n\nWhat do you want to do next?"
  const buttonOptions: {[k: string]: string }= {
    "completed-answering.more": "Answer more 🎲",
    "completed-answering.home": "Go home 🏡",
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
})

bot.action("completed-answering.more", async ctx =>{
  const prompt = "Which of the following is NOT a DEX?"
  const buttonOptions: {[k: string]: string }= {
    "answering-first-order.1": "Jupiter",
    "answering-first-order.2": "Raydium",
    "answering-first-order.3": "Orca",
    "answering-first-order.4": "Phoenix",
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
})

bot.action("completed-answering.home", async ctx =>{
  const prompt = "What do you want to do today?"
  const buttonOptions: {[k: string]: string }= {
    "new.quickstart": "Start answering 🎲",
    "new.reveal": "Reveal Answers 💵"
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
})


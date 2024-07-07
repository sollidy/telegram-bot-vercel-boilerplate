import { Telegraf, Markup } from 'telegraf';

import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';

import { createClient } from '@supabase/supabase-js'
import { Database } from './supabase/database.types';
import { IBotUser } from './interfaces/bot-users';
import { adaptCtx2User } from './lib/utils';



/*
  SETUP
*/

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_KEY!

const supabase = createClient<Database>(supabaseUrl, supabaseKey)
// console.log(supabase)

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ENVIRONMENT = process.env.NODE_ENV || '';

const bot = new Telegraf(BOT_TOKEN);

//prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
  await production(req, res, bot);
};

//dev mode
ENVIRONMENT !== 'production' && development(bot);

const doesUserExist = async (tgId: number) => {
  const { count, error } = await supabase
    .from('bot_users')
    .select('*', { count: 'exact', head: true })
    .eq('tg_id', tgId)

  return !!count && count > 0
}

const WEB_APP_URL = process.env.WEB_APP_URL || ''


bot.on("inline_query", ctx =>

{
  console.log(ctx, 'butotn')
  ctx.answerInlineQuery([], {
		button: { text: "Launch", web_app: { url: WEB_APP_URL } },
	})}
);

const replyWithPrimaryOptions = async (ctx: any) => {

  const prompt = "What do you want to do today?"
  const buttonOptions: {[k: string]: string }= {
    "new.quickstart": "Answer questions 🎲",
    "new.reveal": "Reveal & claim 💵"
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
}

/*
  ENTRYPOINT - START
*/
bot.start(async ctx => {
  console.log("Start command received")
  console.log(ctx.from)
  console.log(ctx.chat.id)
  const newUser: IBotUser = adaptCtx2User(ctx)
  const {tg_id: tgId} = newUser

  // check if user exists
  const userExists = await doesUserExist(tgId)
  console.log(userExists)


  // ctx.reply(
	// 	"Launch mini app from inline keyboard!",
	// 	Markup.inlineKeyboard([Markup.button.webApp("Launch", WEB_APP_URL)]),
	// )

  // return

  
  // if not, create user in DB and ask for email address
  if (!userExists) {
    // TODO: Create user and store in DB API
  }

  // console.log(ctx)z
  replyWithPrimaryOptions(ctx)
});


/*
  NEW -> ANSWERING FIRST ORDER
*/
bot.action("new.quickstart", async ctx =>{
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
  ANSWERING FIRST ORDER -> ANSWERING SECOND ORDER
*/
const secondPrompt = "What percentage of people do you think answered Raydium?"
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


/*
  NEW -> SELECTED REVEAL
*/
bot.action("new.reveal", async ctx =>{
  const prompt = "You have 8 questions available to reveal. Reveal all?"
  const buttonOptions: {[k: string]: string }= {
    "selected-reveal.no": "Maybe Later",
    "selected-reveal.yes": "Yes",
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
});

bot.action("selected-reveal.no", async ctx =>{
  const prompt = "What do you want to do today?"
  const buttonOptions: {[k: string]: string }= {
    "new.quickstart": "Start answering 🎲",
    "new.reveal": "Reveal Answers 💵"
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
})

bot.action("revealed.0", async ctx =>{
	// ctx.answerInlineQuery([], {
	// 	button: { text: "Launch", web_app: { url: WEB_APP_URL } },
	// })
  ctx.reply(
		"Congratulations you just claimed 37,292 BONK!",
	)

  replyWithPrimaryOptions(ctx)
})


bot.action("selected-reveal.yes", async ctx =>{
  ctx.reply(
		"Follow the link to burn BONK and reveal!",
		Markup.inlineKeyboard([Markup.button.webApp("Launch", WEB_APP_URL)]),
	)
  // const prompt = `You revealed 8 questions. Click the ones with 💰 to claim.`

  // const revealOptions: {[k: string]: string }= {
  //   "revealed.0": "💰💰💰 Claim all rewards 💰💰💰",
  //   "revealed.1": "BTC will break its current ATH...",
  //   "revealed.2": "💰 $WIF will flip $SHIB...",
  //   "revealed.3": "Which of the following is NOT a DEX?",
  //   "revealed.4": "Perps are called 'Perpetuals...",
  //   "revealed.5": "💰 Would (or have) you purchased...",
  //   "revealed.6": "💰 Have you told any normies...",
  //   "revealed.7": "More creators would be supportive...",
  //   "revealed.8": "💰 DAOs are the ideal decentralized...",
  // }
  // const revealButtons = Object.keys(revealOptions).map(key => Markup.button.callback(revealOptions[key], key))
  
  // const menuOptions: {[k: string]: string }= {
  //   "completed-answering.more": "Answer more 🎲",
  //   "completed-answering.home": "Go home 🏡",
  // }
  // const menuButtons = Object.keys(menuOptions).map(key => Markup.button.callback(menuOptions[key], key))

  // const buttons = revealButtons.map(button => [button]).slice(0, 9)
  
  // // Add the menu buttons as a single array at the end
  // buttons.push(menuButtons)

  // ctx.reply(prompt, Markup.inlineKeyboard(buttons))
})

bot.on("message", async ctx => {
  const txt = ctx.text as any
  console.log(ctx, txt)
  ctx.reply("You said: " + txt + WEB_APP_URL);
  // ctx.reply("Send /start to begin");
})

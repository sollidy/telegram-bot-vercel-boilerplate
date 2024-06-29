import { Telegraf, Markup } from 'telegraf';

import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';

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

const WEB_APP_URL = "https://chomp-7y896yvj8-gator-labs.vercel.app/bot"

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
    "new.quickstart": "Start answering 🎲",
    "new.reveal": "Reveal Answers 💵"
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
    // await supabase.from('bot_users').insert(newUser)
    const moreInfoKeyboard = Markup.inlineKeyboard([Markup.button.callback("Why do you need my email?", "new.email-info")])
    ctx.reply("Welcome to Chomp! 🦷\n\nPlease provide your email address so Chomp Bot can generate a Solana wallet for you.", moreInfoKeyboard)
    return
  }

  // console.log(ctx)z
  replyWithPrimaryOptions(ctx)
});

/*
  NEW -> ENTERING_EMAIL
*/
bot.action("new.email-info", async ctx =>{
  // const paragraphs = [
  //   `Chomp Bot uses your email to create a new Solana wallet for you to play\\. Your email address will be the owner of the wallet and Chomp Bot will be granted limited permissions to move SOL & BONK as part of normal game play\\.`,
  //   `Chomp Bot never stores your email associated with the wallet\\. It is used by exclusively in secure enclave Chomp Bot cannot access\\. [Learn more](https://gator\\.fyi)\\.`,
  //   `This step is required to play\\. Please respond with your email address to continue\\.`
  // ]
  // const prompt = paragraphs.join("\n")
  const prompt = `Chomp Bot uses your email to create a new Solana wallet for you to play\\. Your email address will be the owner and sole custodian of the wallet\\. [Learn more](https://gator\\.fyi)\\.

*Please respond with your email address to continue\\.*`
  ctx.replyWithMarkdownV2(prompt)
});


/*
  Message received
*/
// https://stackoverflow.com/questions/201323/how-can-i-validate-an-email-address-using-a-regular-expression
const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/
bot.hears(emailRegex, async ctx => {
  console.log("Got email")
  const newUser: IBotUser = adaptCtx2User(ctx)
  const {tg_id: tgId} = newUser

  // check if user exists
  const userExists = await doesUserExist(tgId)

  if (userExists) {
    ctx.reply("You already have an account. Please type /start to continue.")
    return
  } else {
    const {match: emailAddresses} = ctx
    const emailAddress = emailAddresses[0]
    console.log(emailAddress)
    newUser.original_email_address = emailAddress
    newUser.state = EBotUserState.NEW

    const headers = {
      Authorization: `Bearer ${process.env.DYNAMIC_TOKEN}`,
      'Content-Type': 'application/json'
    }

    const newUserData = {
      chain: "SOL",
      type: "email",
      identifier: emailAddress
    }

    const newUserOptions = {
      method: 'POST',
      headers,
      body: JSON.stringify(newUserData)
    };

    const baseUrl = `https://app.dynamicauth.com/api/v0`
    const newUserUrl = `${baseUrl}/environments/${process.env.DYNAMIC_ENVIRONMENT_ID}/embeddedWallets`
    console.log("making request to " + newUserUrl)
    console.log(newUserOptions)
    const dynamicUser = await fetch(newUserUrl, newUserOptions)
      .then(response => response.json())

      console.log("Created user")
      console.log(dynamicUser)

    //   const emailData = {
    //     email: emailAddress,
    //   }

      // const emailVerifyOptions = {
      //   method: 'POST',
      //   headers,
      //   body: JSON.stringify(emailData)
      // };
      
    // const verifyEmailUrl = `${baseUrl}/sdk/${process.env.DYNAMIC_ENVIRONMENT_ID}/emailVerifications/create`
    //   console.log("making request to " + verifyEmailUrl)
    // const {verificationUUID} = await fetch(verifyEmailUrl, emailVerifyOptions)
    //     .then(response => response.json())
    //     .catch(err => console.error(err));
    
    //   newUser.dynamic_verification_token = verificationUUID
    //     console.log(newUser)
     console.log('bot')
     const supa=  await supabase.from('bot_users').insert(newUser)
     console.log(supa, newUser)

      replyWithPrimaryOptions(ctx)
    // ctx.reply("Awesome. We just sent you an email. Please respond with the code from the email.")
  }
})


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
  ctx.reply("You said: " + txt);
  // ctx.reply("Send /start to begin");
})

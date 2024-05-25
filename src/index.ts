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

import { Turnkey } from "@turnkey/sdk-server";
import { TCreateSubOrganizationBody, TCreateSubOrganizationInput } from '@turnkey/sdk-server/dist/__generated__/sdk_api_types';



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

const doesUserExist = async (tgId: number) => {
  const { count, error } = await supabase
  .from('bot_users')
  .select('*', { count: 'exact', head: true })
  .eq('tg_id', tgId)

  return !!count && count > 0
}

/*
  ENTRYPOINT - START
*/
bot.start(async ctx => {
  console.log("Start command received")
  const newUser: IBotUser = adaptCtx2User(ctx)
  const {tg_id: tgId} = newUser

  // check if user exists
  const userExists = await doesUserExist(tgId)

  // if not, create user in DB and ask for email address
  if (!userExists) {
    const moreInfoKeyboard = Markup.inlineKeyboard([Markup.button.callback("Why do you need my email?", "new.email-info")])
    ctx.reply("Welcome to Chomp! 🦷\n\nPlease provide your email address so Chomp Bot can generate a Solana wallet for you.", moreInfoKeyboard)
    return
  }

  const prompt = "What do you want to do today?"
  const buttonOptions: {[k: string]: string }= {
    "new.quickstart": "Start answering 🎲",
    "new.reveal": "Reveal Answers 💵"
  }
  const buttons = Object.keys(buttonOptions).map(key => Markup.button.callback(buttonOptions[key], key))
  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
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
  const prompt = `Chomp Bot uses your email to create a new Solana wallet for you to play\\. Your email address will be the owner of the wallet and Chomp Bot will be granted limited permissions to move SOL & BONK as part of normal game play\\. [Learn more](https://gator\\.fyi)\\.

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

    const subOrganizationConfig: TCreateSubOrganizationBody = {
      subOrganizationName: emailAddress,
      rootUsers: [
        // User is permanent owner with access via email.
        {
          userName: emailAddress,
          userEmail: emailAddress,
          apiKeys: [],
          authenticators: [],
        },
        // Chomp user. Will be removed from root after policies granted.
        {
          userName: process.env.TURNKEY_POLICIES_USERNAME!,
          apiKeys: [{apiKeyName: process.env.TURNKEY_POLICIES_LABEL!, publicKey: process.env.TURNKEY_POLICIES_API_PUBLIC_KEY!}],
          authenticators: [],
        },
      ],
      rootQuorumThreshold: 1,
      wallet: {
        walletName: process.env.TURNKEY_POLICIES_USERNAME!,
        // https://github.com/tkhq/sdk/blob/b04de6258b2617b4c303c2b9797d4b30322461a3/packages/sdk-browser/src/turnkey-helpers.ts#L33
        accounts: [{
          pathFormat: "PATH_FORMAT_BIP32",
          path: `m/44'/501'/0'/0'`,
          curve: "CURVE_ED25519",
          addressFormat: "ADDRESS_FORMAT_SOLANA",
        }],
      },
    };

    const turnkey = new Turnkey({
      apiBaseUrl: process.env.TURNKEY_API_BASE_URL!,
      apiPrivateKey: process.env.TURNKEY_API_KEY_PRIVATE!,
      apiPublicKey: process.env.TURNKEY_API_KEY_PUBLIC!,
      defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!
    });
    
    const turnkeyClient = turnkey.apiClient();
    console.log("Creating sub organization")
    const subOrganizationResponse = await turnkeyClient.createSubOrganization(subOrganizationConfig);
    console.log(subOrganizationResponse)


    // create user
    // const {data, error} = await supabase
    // .from('bot_users')
    // .insert(newUser).select()
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

bot.action("selected-reveal.yes", async ctx =>{
  const prompt = `You revealed 8 questions. Click the ones with 💰 to claim.`

  const revealOptions: {[k: string]: string }= {
    "revealed.0": "💰💰💰 Claim all rewards 💰💰💰",
    "revealed.1": "Lorem ipsum dolor sit amet",
    "revealed.2": "💰 Lorem ipsum dolor sit amet",
    "revealed.3": "Lorem ipsum dolor sit amet",
    "revealed.4": "Lorem ipsum dolor sit amet",
    "revealed.5": "💰 Lorem ipsum dolor sit amet",
    "revealed.6": "💰 Lorem ipsum dolor sit amet",
    "revealed.7": "Lorem ipsum dolor sit amet",
    "revealed.8": "💰 Humans have more than 5 senses",
  }
  const revealButtons = Object.keys(revealOptions).map(key => Markup.button.callback(revealOptions[key], key))
  
  const menuOptions: {[k: string]: string }= {
    "completed-answering.more": "Answer more 🎲",
    "completed-answering.home": "Go home 🏡",
  }
  const menuButtons = Object.keys(menuOptions).map(key => Markup.button.callback(menuOptions[key], key))

  const buttons = revealButtons.map(button => [button]).slice(0, 9)
  
  // Add the menu buttons as a single array at the end
  buttons.push(menuButtons)

  ctx.reply(prompt, Markup.inlineKeyboard(buttons))
})

bot.on("message", async ctx => {
  const txt = ctx.message as any
  ctx.reply("Send /start to begin");
})

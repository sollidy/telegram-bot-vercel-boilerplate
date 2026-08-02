// src/bot.ts
import { Telegraf } from "telegraf";
import { funnelToInbox } from "./funnel";

const OWNER_CHAT_ID = (process.env.OWNER_CHAT_ID ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const bot = new Telegraf(process.env.BOT_TOKEN!);

bot.use((ctx, next) => {
  const userId = String(ctx.from?.id ?? "");
  if (OWNER_CHAT_ID.length === 0) {
    return ctx.reply("Бот заблокирован: не задан OWNER_CHAT_ID.");
  }
  if (!OWNER_CHAT_ID.includes(userId)) {
    return ctx.reply("Доступ только для владельца.");
  }
  return next();
});

bot.on("text", async (ctx) => {
  const from = ctx.from;
  try {
    const path = await funnelToInbox({
      text: ctx.message.text,
      chatId: ctx.chat.id,
      fromId: from?.id,
      fromName: from?.username,
    });
    await ctx.reply(`Принято. Записал в ${path}`);
  } catch (err) {
    console.error("Funnel error", err);
    await ctx.reply(
      `Ошибка записи: ${err instanceof Error ? err.message : String(err)}`
    );
  }
});

export default bot;

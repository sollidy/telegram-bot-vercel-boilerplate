import { Context } from "telegraf";
import { EBotUserState, IBotUser } from "../interfaces/bot-users";

export const adaptCtx2User = (ctx: Context) => {
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

    return newUser
}
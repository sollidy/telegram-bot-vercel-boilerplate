export enum EBotUserState {
    NEW = "NEW",
}

export type IBotUser = {
    id?: string
    tg_id: number
    tg_first_name: string
    tg_last_name?: string
    tg_username: string
    tg_is_bot: boolean
    tg_language_code: string
    state: string
    chomp_id?: string
    created_at?: string
}
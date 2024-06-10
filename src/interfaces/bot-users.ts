export enum EBotUserState {
    NEW = "NEW",
    EMAIL_VERIFIED = "EMAIL_VERIFIED",
}

export type IBotUser = {
    id?: string
    tg_id: number
    tg_first_name: string
    tg_last_name?: string
    tg_username: string
    tg_is_bot: boolean
    tg_language_code: string
    original_email_address?: string,
    state: EBotUserState,
    created_at?: string
    dynamic_verification_token?: string
}
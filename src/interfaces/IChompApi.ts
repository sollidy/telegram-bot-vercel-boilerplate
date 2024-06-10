interface IChompUser {
    chompUserId: string
    tgId: string
    solanaAddress: string
}

interface ITelegramUser {
    tgId: string
    firstName: string
    lastName: string
    username: string
    isBot: boolean
    languageCode: string
}

interface IChompApi {
    getOrCreateChompUser(telegramUser: ITelegramUser): Promise<IChompUser>
}
export default IChompApi
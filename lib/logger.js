import moment from 'moment'
import chalk from 'chalk'

export function LoggerUpdate(update, DisconnectReason) {
    const { connection, lastDisconnect } = update

if (connection === 'close') {
    const shouldReconnect = !(lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut)
    const messageColor = shouldReconnect ? chalk.green : chalk.white
    console.log('Conexión cerrada. Reconectando:', messageColor(shouldReconnect))
    
    return { action: 'reconnect', shouldReconnect }
}

    if (connection === 'open') {
        console.log(chalk.greenBright('\n╭──────╮'))
        console.log(chalk.greenBright('│ ❝ℂ𝕠𝕟𝕖𝕔𝕥𝕒𝕕𝕠 𝔼𝕩𝕚𝕥𝕠𝕤𝕒𝕞𝕖𝕟𝕥𝕖❞ ( ✅ )'))
        console.log(chalk.greenBright('╰──╮⸙; " ᴷᵒᵐᵒᵈᵒᴮᵒᵗ⁻ᴶˢ ᴾᴼᵂᴱᴿᴱᴰ ᴮʸ ᵀᴼˣᴵᴾᴬᴵᴺ "\n'))
        console.log(chalk.yellow('Version 1.0.2 --- @Github: https://github.com/ToxiPain\n'))
        console.log(chalk.yellow(' '))
        return { action: 'open' }
    }

    return { action: 'none' }
}

export function LogMessage(msg, sock) {
    const from = msg.key.remoteJid
    const sender = (msg.key.participant || msg.key.remoteJid || '').replace('@s.whatsapp.net', '')
    const isGroup = from.endsWith('@g.us')
    const time = moment().format('HH:mm:ss DD/MM/YYYY')
    const type = Object.keys(msg.message)[0]

    let content = ''
    try {
        if (msg.message.conversation) content = msg.message.conversation
        else if (msg.message.extendedTextMessage?.text) content = msg.message.extendedTextMessage.text
        else if (msg.message.imageMessage) content = '[Imagen]'
        else if (msg.message.videoMessage) content = '[Video]'
        else if (msg.message.stickerMessage) content = '[Sticker]'
        else if (msg.message.documentMessage) content = `[Documento: ${msg.message.documentMessage.fileName || 'sin nombre'}]`
        else if (msg.message.audioMessage) content = msg.message.audioMessage.ptt ? '[PTT]' : '[Audio]'
        else if (msg.message.contactMessage) content = `[Contacto: ${msg.message.contactMessage.displayName || 'sin nombre'}]`
        else if (msg.message.contactsArrayMessage) content = '[Lista de contactos]'
        else content = '[Mensaje no soportado]'
    } catch {
        content = '[Error al leer mensaje]'
    }

    // Tamaño del logger en la cmd: (250 caracteres)
    if (content.length > 250) content = content.slice(0, 250) + '...'

    const mdRegex = /([*_~`])(.+?)\1/g
    content = content.replace(mdRegex, (_, symbol, text) => {
        switch(symbol){
            case '*': return chalk.bold(text)
            case '_': return chalk.italic(text)
            case '~': return chalk.strikethrough(text)
            case '`': return chalk.bgGray.black(text)
            default: return text
        }
    })

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    for (let mention of mentions) {
        const mentionId = mention.split('@')[0]
        const regex = new RegExp(`@${mentionId}`, 'g')
        content = content.replace(regex, chalk.blueBright(`@${mentionId}`))
    }

    console.log(chalk.greenBright('\n─────────[ 𝕂𝕠𝕞𝕠𝕕𝕠𝔹𝕠𝕥-𝕁𝕤 ]──────────'))
    console.log(`${chalk.yellow('Remitente:')} ${chalk.cyan('+' + sender)}`)
    console.log(`${chalk.yellow('Chat:')} ${isGroup ? chalk.magenta('Grupo') : chalk.cyan('Privado')} ${chalk.yellow('𓏬 Hora:')} ${chalk.magenta(time)}`)
    console.log(`${chalk.yellow(type)} ${chalk.yellow('𓏬')} ${chalk.white(content)}`)
    console.log(chalk.greenBright('──────────────────────────────────\n'))
}

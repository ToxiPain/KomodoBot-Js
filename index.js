import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { LoggerUpdate, LogMessage } from './lib/logger.js'
import P from 'pino'
import qrcode from 'qrcode-terminal'
import prompts from 'prompts'
import chalk from 'chalk'
import fs from 'fs'

let connecting = false
let askingNumber = false
let useQR

const SESSION_FOLDER = 'Arcane_Session'

// Función para formatear el Pairing Code
function formatPairingCode(code) {
    if (!code || code.length !== 8) return code
    return `${code.slice(0, 4)}-${code.slice(4)}`
}

// Función para verificar si existen credenciales guardadas
function sessionExists() {
    if (!fs.existsSync(SESSION_FOLDER)) return false
    const files = fs.readdirSync(SESSION_FOLDER)
    return files.some(f => f.endsWith('.json'))
}

async function startBot() {
    if (connecting) return
    connecting = true

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER)

    // ---------- DETECCIÓN DE SESIÓN ----------
    if (sessionExists()) {
        console.log(chalk.yellow('[ ⸙ ] Cargando sesión...'))
        useQR = true // solo para continuar, no importa el valor
    } else if (useQR === undefined) {
        // Si no hay sesión, preguntar al usuario
        console.log(chalk.greenBright('\n[ ⸙ ] Selecciona cómo deseas conectarte:'))
        console.log(chalk.yellow('1 - QR'))
        console.log(chalk.yellow('2 - CODE'))

        const response = await prompts({
            type: 'text',
            name: 'option',
            message: chalk.cyan('Opción:')
        })

        const option = response.option?.trim()
        if (option !== '1' && option !== '2') {
            console.log(chalk.red('Opción inválida. Elige 1 ó 2'))
            connecting = false
            return startBot()
        }

        useQR = option === '1'
    }

    // ---------- CREACIÓN DEL SOCKET ----------
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }) })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
        const result = LoggerUpdate(update, DisconnectReason)

        if (result.action === 'reconnect') {
            connecting = false
            if (result.shouldReconnect) startBot()
        }

        // Mostrar QR si corresponde
        if (useQR && update.qr) {
            console.log(chalk.greenBright('\n[ ⸙ ] Escanea este QR con tu WhatsApp:'))
            console.log(chalk.greenBright('───────────────────────────────────────────'))
            qrcode.generate(update.qr, { small: true })
        }

        // Solicitar Pairing Code si se seleccionó CODE
        if (!useQR && !sock.authState.creds.registered && !askingNumber) {
            askingNumber = true

            const numberResp = await prompts({
                type: 'text',
                name: 'number',
                message: chalk.cyan('Ingresa tu número con código de país, solo números:')
            })

            const number = numberResp.number?.trim()
            if (!number) {
                console.error('No se ingresó un número válido.')
                return
            }

            try {
                const code = await sock.requestPairingCode(number)
                console.log(
                    chalk.white.bold.bgHex('#023e02ff')(`\n[ ⸙ ] Pairing Code: ${formatPairingCode(code)} \n`)
                )
                console.log(chalk.greenBright('Usa este código en tu WhatsApp para completar el emparejamiento.'))
            } catch (err) {
                console.error('Error solicitando Pairing Code:', err)
            }
        }
    })

    // ---------- MENSAJES ----------
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return

        LogMessage(msg, sock)
    })
}

startBot()

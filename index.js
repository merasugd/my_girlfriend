const TelegramBot = require('node-telegram-bot-api');
const caiy = require('cainode');

require('dotenv').config();

async function i() {
    const token = process.env.TELEGRAM;
    const cai = process.env.CAI;
    const bot = new TelegramBot(token, { polling: true });
    const characterAI = new caiy();
    const char = 'FwZ-iQw3kzROVzuUS5pnawTJxdl-3nnLnl6wAenIxeA';

    await characterAI.login(cai);

    const boyfriend = new Map();
    const interval = new Map();
    const inter_time = 300000; // 5 minutes
    let current_time = 0;

    function newTime() {
        let bf = getBf();

        if (bf) {
            let id = bf[0];
            let name = bf[1];

            current_time += inter_time;

            interval.set('current', setInterval(async () => {
                const send = await characterAI.character.send_message(`*${name} hasn't chatted with you for about ${current_time} milliseconds*`, false);
                bot.sendMessage(id, parseRes(send));
            }, inter_time));
        }
    }

    function deleteTime() {
        if (interval.get('current')) {
            current_time = 0;
            clearInterval(interval.get('current'));
            interval.delete('current');
        }
    }

    // Handle messages
    bot.on('message', async (msg) => {
        let bf = getBf();

        if (bf && bf[0] !== msg.chat.id) return bot.sendMessage(msg.chat.id, 'I already have a boyfriend.');

        deleteTime();

        bot.sendChatAction(msg.chat.id, 'typing');

        let id = bf ? bf[0] : msg.chat.id;
        let name = bf ? bf[1] : `${msg.from.first_name} ${msg.from.last_name}`.trim();
        let chat = bf ? bf[2] : await characterAI.character.connect(char);

        if(msg.text === '/start') {
            if(bf) boyfriend.delete('current');
            await characterAI.character.reset_conversation();
            delete msg.text
        };

        if(msg.photo && msg.photo.length > 0 && bf) {
            let photo = msg.photo[msg.photo.length - 1];

            const fileId = photo.file_id;
            const fileUrl = await bot.getFileLink(fileId);

            await characterAI.character.send_message(`${name}: ${msg.caption || '*sent a photo*'}`, true, fileUrl);
        };

        if (!bf) {
            await characterAI.character.reset_conversation();

            const send = await characterAI.character.send_message(`*This is her boyfriend: ${name}. He hasn't chatted for a long time*\n\n${name}: ${msg.text || 'Hello!'}`, false);
            setBf(id, name, chat);
            bot.sendMessage(id, parseRes(send));
        } else if(!msg.text || msg.text.trim() === '') {
            const response = await characterAI.character.generate_turn();
            bot.sendMessage(id, parseRes(response));
        } else {
            const send = await characterAI.character.send_message(`${name}: ${msg.text}`, false);
            bot.sendMessage(id, parseRes(send));
        }

        newTime();

        if (msg.text && (msg.text.toLowerCase().includes('let\'s breakup') || msg.text === ':reset')) {
            boyfriend.delete('current');
            bot.sendMessage(id, 'Well then its gone!')
            await characterAI.character.reset_conversation();
            return;
        }
    });

    function getBf() {
        return boyfriend.get('current');
    }

    function setBf(id, name, chat) {
        if (!getBf()) boyfriend.set('current', [id, name, chat]);
    }

    function parseRes(l) {
        let ll  = l.turn.candidates[0];

        let a = ll.raw_content || 'error';

        let b = a.split('*');
        let bb = b[b.length - 1];

        let c = bb.split(':');
        let cc = c[c.length - 1];

        if(!cc || cc.trim() === '') return a;

        console.log(a);

        return cc.trim().replaceAll('"', '');
    }
}

i();
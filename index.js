require('dotenv/config');
const {Client, IntentsBitField} = require('discord.js');
const {Configuration, OpenAIApi} = require('openai');

const discordClient = new Client({
    intents: [
        IntentsBitField.Flags.Guilds, // Server
        IntentsBitField.Flags.GuildMessages, // Information ever single messages
        IntentsBitField.Flags.MessageContent // Message itselfe
    ]
});

const openAIConfig = new Configuration({
    apiKey: process.env.OPENAI_API_KEY
});

const openAIAPI = new OpenAIApi(openAIConfig);
discordClient.on('ready', () => {
    console.log('The bot is online!');
});

discordClient.on('messageCreate', async (lastMsg) => {
    if (lastMsg.author.bot) return;
    if (lastMsg.channel.id !== process.env.DISCORD_CHANNEL_ID) return;
    if (lastMsg.content.startsWith('!')) return;

    const conversationLog = [{
        role: 'system',
        content: 'You are a teacher who was once a very experienced developer and now you are ' +
            'helping less experienced developers.'
    }];

    try {
        lastMsg.channel.sendTyping();

        // Get last messages from Channel
        let prevMsgs = await lastMsg.channel.messages.fetch({limit: 15});

        // Order messages latest to oldest
        prevMsgs.reverse();

        prevMsgs.forEach(prevMsg => {
            if (lastMsg.content.startsWith('!')) return;
            // Ignore messages from other bots
            if (prevMsg.author.bot) return;
            // Ignore itself messages
            if (prevMsg.author.id === discordClient.user.id) return;
            // Ignore messages tha are not from the user it will reply to
            if (prevMsg.author.id !== lastMsg.author.id) return;

            conversationLog.push({
                role: 'user',
                content: prevMsg.content,
            });
        });

        // only role: 'system'
        if (conversationLog.length <= 1) return;

        const chatCompletition = await openAIAPI.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: conversationLog
        }).catch((error) => console.log(`OPENAI ERR: ${error}`));

        await lastMsg.reply(chatCompletition.data.choices[0].message);
    } catch (e) {
        console.log(`ERR: ${e}`);
    }
});

discordClient.login(process.env.DISCORD_TOKEN).then();

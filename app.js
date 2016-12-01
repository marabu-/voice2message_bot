'use strict';

const config = require('./config');
const https = require("https");
const telegramToken = config.telegramToken;
const witToken = config.witToken;
const ffmpegPath = config.ffmpegPath;
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const ffmpeg = require('./ffmpeg');
const voiceToText = require('./voiceToText');

const express = require('express');
const app     = express();

app.set('port', (process.env.PORT || 5000));

//For avoidong Heroku $PORT error
app.get('/', function(request, response) {
    var result = 'App is running';
    response.send(result);
}).listen(app.get('port'), function() {
    console.log('App is running, server is listening on port ', app.get('port'));
});

const bot = new TelegramBot(telegramToken, {polling: {timeout: 10, interval: 2000}});

var path = require('path');

path.join2 = path.join;
path.sep = '/';
path.join = function () {
    var res = path.join2.apply({}, arguments);
    res = res.replace(/\\/g, path.sep);
    return res;
};


bot.on('message', function (msg) {
    if (!msg.voice) {
        return;
    }

    console.log(msg);
    bot.sendChatAction(msg.chat.id, 'typing');

    bot.downloadFile(msg.voice.file_id, path.join(__dirname, 'tmp')).then(filePath => {
        const mp3Path = filePath + '.mp3';
        return ffmpeg(ffmpegPath, ['-i ' + filePath, '-acodec libmp3lame', mp3Path]).then((stdout) => {
            fs.unlink(filePath);
            return mp3Path;
        }).then(file => {
            return voiceToText(witToken, file).then(response => {
                fs.unlink(file);
                return response;
            });
        }).then(response => {
            console.log("FROM wit.ai: " + response._text);
            return response._text;
        }).then(text => {
            if (text === null || text === "") {
                var transcribingErrorMessage = 'Говори четче, ' + msg.from.first_name + '. Нихуя не понятно!';
                bot.sendMessage(msg.chat.id, transcribingErrorMessage, {
                    reply_to_message_id: msg.message_id
                });
                return;
            }
            const message = msg.from.first_name + ': ' + text;
            bot.sendMessage(msg.chat.id, message, {
                reply_to_message_id: msg.message_id
            });
        }).catch(err => {
            console.log('ERROR', err);
        });
    });
});

//Avoid Heroku idling - ping every 5 minutes
setInterval(function() {
    https.get("https://voice2message.herokuapp.com");
}, 300000); // every 5 minutes (300000)
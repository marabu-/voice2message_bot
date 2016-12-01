'use strict';

const https = require("https");
const fs = require('fs');

module.exports = (witToken, file) => {

    return new Promise((resolve) => {

        const options = {
            "method": "POST",
            "hostname": "api.wit.ai",
            "port": null,
            "path": "/speech?v=20160706",
            "headers": {
                "authorization": "Bearer " + witToken,
                "content-type": "audio/mpeg3",
                "cache-control": "no-cache"
            }
        };

        const req = https.request(options, function (res) {
            const chunks = [];

            res.on("data", function (chunk) {
                chunks.push(chunk);
            });

            res.on("end", function () {
                const body = Buffer.concat(chunks);
                resolve(JSON.parse(body.toString()));
            });
        });

        fs.createReadStream(file).pipe(req);

    });
};
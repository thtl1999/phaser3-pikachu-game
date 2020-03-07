const express = require('express');
const https = require('https');
const fs = require('fs');
const app = express();
const server = require('http').Server(app);
const path = require('path');

app.use(function (req, res, next) {
    var filename = path.basename(req.url);
    var url = decodeURI(req.url);
    var extension = path.extname(filename);
    if (filename != '')
        console.log("The file " + url + " was requested.");
    next();
});

app.use(express.static(__dirname + '/res'));

app.get('/',function(req,res){
    res.sendFile(__dirname + '/index.html');
});

server.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
var serverPort = 2957;
var hdHomeRun = {
  'port' : 5004,
  'hostname' : '192.168.0.131'
};

var http = require('http');
var express = require('express'),
    Transcoder = require('stream-transcoder');
var child_process = require("child_process")

var app = express();

app.get("/lineup.*", function(request, response, next){
    var options = {
        method: 'GET',
        hostname: hdHomeRun.hostname, 
        port: 80, 
        path: request.path
    };

    var hdhrreq = http.request(options, function(hdhrres) {

        response.writeHead(hdhrres.statusCode, hdhrres.statusMessage, hdhrres.headers);
        hdhrres.pipe(response);
    })
    .on('data', function (chunk){
        console.log(chunk);
    })
    .end();
});

app.get('/auto/*', function(request, response, next) {
	
    var options = {
        method: 'HEAD',
        hostname: hdHomeRun.hostname, 
        port: hdHomeRun.port, 
        path: request.path
    };

    options.path += "?transcode=internet240";

    var hdhrreq = http.request(options, function(hdhrres) {
        if (hdhrres.statusCode != 200){
            response.writeHead(hdhrres.statusCode, hdhrres.statusMessage, hdhrres.headers)
            response.end();
            next();
            return;
        }

        options.method = 'GET';

        var streamRequest = http.request(options, function(streamResponse){

            var ffmpegOptions = "-re -i - -f webm -c:v libvpx -c:a libvorbis -f webm pipe:1".split(' ');
            var ffmpegCommand = child_process.spawn("ffmpeg", ffmpegOptions);
            ffmpegCommand.stdout.pipe(response);

            streamResponse.pipe(ffmpegCommand.stdin);

        })
        .end();
       
       //next();
    })
    .on('error', function(e){
        console.log(e);
        response.write("ERROR!!!");
    })
    .end();

    
})
.listen(serverPort, function(){
	console.log("listening on port " + serverPort.toString());
	console.log("\thttp://192.168.0.2:" + serverPort.toString() + "/");
});

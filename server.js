var serverPort = 2957;
var hdHomeRun = {
  'port' : 5004,
  'hostname' : '192.168.0.131'
};

var transcodeFormats = {
    'webm' : {
        ffmpegOptions : {
            "-c:v": "libvpx",
            "-c:a" : "libvorbis",
            "-f" : "webm",
            "-crf" : "10"
        },
        contentType : "video/webm"
    }
}

var http = require('http'),
    express = require('express'),
    child_process = require("child_process"),
    os = require('os');

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
    .end();
});

app.get('/ch/:channel/:source?', function(request, response, next) {

   console.log("tuning to channel " + request.params.channel);

   request.on('end', function(){
        console.log('END REQUEST');
   });

    var options = {
        method: 'GET',
        hostname: hdHomeRun.hostname, 
        port: hdHomeRun.port, 
        path: "/auto/v" + request.params.channel + "?transcode=" + (request.params.source || "heavy")
    };

    var ffmpegCommand = null;

    var hdhrreq = http.request(options, function(hdhrres) {
        if (hdhrres.statusCode != 200){
            console.log("Unable to tune to channel " + request.params.channel);
            response.writeHead(hdhrres.statusCode, hdhrres.statusMessage, hdhrres.headers)
            response.end();
            return;
        }

        var width = request.query.width;
        var height = request.query.height;
        var bitrate = request.query.bitrate;

        console.log("piping channel " + request.params.channel + " to ffmpeg");

        

        response.writeHead(hdhrres.statusCode, hdhrres.statusMessage, hdhrres.headers)

        var ffmpegOptions = "-re -i -";
        var ffmpegTranscodeOptions = transcodeFormats['webm'];
        

        if ("format" in request.query && request.query["format"] in transcodeFormats){
            ffmpegTranscodeOptions = transcodeFormats[request.query["format"]];
        }

        hdhrres.headers["content-type"] = ffmpegTranscodeOptions.contentType;

        for(var key in ffmpegTranscodeOptions.ffmpegOptions){
            ffmpegOptions += " " + key;
            ffmpegOptions += " " + ffmpegTranscodeOptions.ffmpegOptions[key];
        }

        if (width){
            if (!height){
                height = -1;
            }

            ffmpegOptions += " -vf scale=" + width.toString() + ":" + height.toString();
        } 
        else if (height){
            ffmpegOptions += " -vf scale=-1:" + height.toString();
        }

        if (bitrate){
            ffmpegOptions += " -b:v 1M";
        }

        ffmpegOptions += " pipe:1";

        console.log("ffmpeg options:", ffmpegOptions);

        ffmpegCommand = child_process.spawn("ffmpeg", ffmpegOptions.split(' '));
        ffmpegCommand.on('error', function(e){
            console.log(e);
            
            response.end();
        });

        ffmpegCommand.stdout.pipe(response);
        
        hdhrres.pipe(ffmpegCommand.stdin);
    })
    .on('end', function(){
        console.log('request ended')

        if (ffmpegCommand != null){
            ffmpegCommand.kill();
        }
    })
    .on('error', function(e){
        console.log(e);
        response.write("ERROR!!!");
    })
    .end();

})
.use(express.static('public'))
.listen(serverPort, function(){
	console.log("listening on port " + serverPort.toString());
    
	console.log("\thttp://192.168.0.2:" + serverPort.toString() + "/");
});

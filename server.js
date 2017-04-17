var _config = {
    serverPort: 2957,
    hdHomeRune: {
        'port': 5004,
        'hostname': '127.0.0.1',
        'defaultProfile': 'mobile'
    },
    transcoders: {
        'webm': {
            ffmpegOptions: {
                "-c:v": "libvpx",
                "-c:a": "libvorbis",
                "-f": "webm",
                "-crf": "10"
            },
            contentType: "video/webm"
        }
    }
};

var http = require('http'),
    express = require('express'),
    child_process = require("child_process"),
    os = require('os'),
    fs = require('fs');

var _defaultTranscoder = null;

(function () {
    const hdhrJson = __dirname + "/hdhr.json";
    const transcodersJson = __dirname + "/transcoders.json";
    if (fs.existsSync(hdhrJson)) {
        _config.hdHomeRun = JSON.parse(fs.readFileSync(hdhrJson, "utf8"));
    }

    if (fs.existsSync(transcodersJson)) {
        _config.transcoders = JSON.parse(fs.readFileSync(transcodersJson, "utf8"));
    }

    for (var key in _config.transcoders) {
        _defaultTranscoder = _config.transcoders[key];
        break;
    }
})();

var app = express();

app.get("/lineup.*", function (request, response, next) {
    var options = {
        method: 'GET',
        hostname: _config.hdHomeRun.hostname,
        port: 80,
        path: request.path
    };

    var hdhrreq = http.request(options, function (hdhrres) {
        response.writeHead(hdhrres.statusCode, hdhrres.statusMessage, hdhrres.headers);
        hdhrres.pipe(response);
    })
        .end();
});

app.get('/ch/:channel/:source?', function (request, response, next) {

    console.log("tuning to channel " + request.params.channel);

    request.on('end', function () {
        console.log('END REQUEST');
    });

    var options = {
        method: 'GET',
        hostname: _config.hdHomeRun.hostname,
        port: _config.hdHomeRun.port,
        path: "/auto/v" + request.params.channel + "?transcode=" + (request.params.source || _config.hdHomeRun.defaultProfile)
    };

    var ffmpegCommand = null;

    var hdhrreq = http.request(options, function (hdhrres) {
        if (hdhrres.statusCode !== 200) {
            console.log("Unable to tune to channel " + request.params.channel);
            response.writeHead(hdhrres.statusCode, hdhrres.statusMessage, hdhrres.headers);
            response.end();
            return;
        }

        var width = request.query.width;
        var height = request.query.height;
        var bitrate = request.query.bitrate;

        console.log("piping channel " + request.params.channel + " to ffmpeg");

        response.writeHead(hdhrres.statusCode, hdhrres.statusMessage, hdhrres.headers);

        var ffmpegOptions = "-re -i -";
        var ffmpegTranscodeOptions = _defaultTranscoder;

        if ("format" in request.query && request.query["format"] in _config.transcoders) {
            ffmpegTranscodeOptions = _config.transcoders[request.query["format"]];
        }

        hdhrres.headers["content-type"] = ffmpegTranscodeOptions.contentType;

        for (var key in ffmpegTranscodeOptions.ffmpegOptions) {
            ffmpegOptions += " " + key;
            ffmpegOptions += " " + ffmpegTranscodeOptions.ffmpegOptions[key];
        }

        if (width) {
            if (!height) {
                height = -1;
            }

            ffmpegOptions += " -vf scale=" + width.toString() + ":" + height.toString();
        }
        else if (height) {
            ffmpegOptions += " -vf scale=-1:" + height.toString();
        }

        if (bitrate) {
            ffmpegOptions += " -b:v 1M";
        }

        ffmpegOptions += " pipe:1";

        console.log("ffmpeg options:", ffmpegOptions);

        ffmpegCommand = child_process.spawn("ffmpeg", ffmpegOptions.split(' '));
        ffmpegCommand.on('error', function (e) {
            console.log(e);

            response.end();
        });

        ffmpegCommand.stdout.pipe(response);

        hdhrres.pipe(ffmpegCommand.stdin);
    })
        .on('end', function () {
            console.log('request ended');

            if (ffmpegCommand !== null) {
                ffmpegCommand.kill();
            }
        })
        .on('error', function (e) {
            console.log(e);
            response.write("ERROR!!!");
        })
        .end();

});

app.use(express.static('public'));

app.listen(_config.serverPort, function () {
    console.log("listening on port " + _config.serverPort.toString());

        console.log("*******************************************")
        console.log("*")
        var interfaces = os.networkInterfaces();
        var addresses = [];
        for (var k in interfaces) {
            for (var k2 in interfaces[k]) {
                var address = interfaces[k][k2];
                if (address.family === 'IPv4') {
                    console.log("*\thttp://" + address.address + ":" + _config.serverPort.toString() + "/");
                }
            }
        }
        console.log("*")
        console.log("*******************************************")
    });

// Dependencies
var fs              = require('fs');
var url             = require('url');
var http            = require('http');
var spawn           = require('child_process').spawn;
var exec            = require('child_process').exec;

// Utilities
var program         = require('commander');
var async           = require('async');
var _               = require('underscore');
var stream          = require('streamifier');

// Image processing
var tube            = require('picture-tube');
var instagram       = require('instagram-node-lib');
var images          = require('node-images');


// Dependency config
instagram.set('client_id', 'a45382b1044e4e97b9884910f7d270f1');
instagram.set('secret_id', '9e1adb14869b47e3a4ce4521b177f0ac');

function login() {
    console.log("I'm going to prompt for your login information and ignore your other options... later.");
}

function searchTags(tag) {
    instagram.tags.recent({
        name: tag,
        complete: function(data){
            var convertedBuffers = [];
            console.log("About to download", data.length, "buffers");

            async.each(data, function (item, cb) {
                item = item.images.standard_resolution.url;

                if (program.ascii) {
                    jpegToASCII(item);
                }else {
                    downloadFile(item, function (error, fileBuffer) {
                        if (error) {
                            console.error(error);
                            cb(error);
                        }else {
                            var imageBuffer = images(fileBuffer).encode('png');
                            convertedBuffers.push(new Buffer(imageBuffer));
                            cb();
                        }
                    });
                }
            }, function (error) {
                if (error) {
                    console.error(error);
                }else {
                    console.log("Finished", convertedBuffers.length, "buffers");
                    pngToANSI(convertedBuffers);
                }
            });
        }
    });
}

// Function to download file using HTTP.get
function downloadFile(fileURL, callback) {
    var options = {
        host: url.parse(fileURL).host,
        port: 80,
        path: url.parse(fileURL).pathname
    };

    var buffers = [];

    http.get(options, function(res) {
        res.on('data', function(data) {
            buffers.push(data);
        }).on('end', function() {
            var fullBuffer = Buffer.concat(buffers);
            callback(null, fullBuffer);
        }).on('error', function (error) {
            callback(error);
        })
    });
};

function searchUsers(username) {
    instagram.users.search({
        q: username,
        complete: function (data) {
            console.log(data);
        }
    });
}

function jpegToASCII(source) {
    var cmd = spawn('jp2a', ['--width=95', source]);

    cmd.stdout.on('data', function (data) {
        console.log(data.toString());
    });
}

function pngToANSI(buffers) {
    async.series(generateFunctionsForBuffers(buffers), function (error, results) {
        console.log("It worked!");
    });
}

function generateFunctionsForBuffers(buffers) {
    var retVal = [];
    for (var i = 0; i < buffers.length; i++) {
        var buffer = buffers[i];

        retVal.push(returnFunction(buffer, i));
    }

    return retVal;
}

function returnFunction(buffer, number) {
    return function (callback) {
        var pictureTube = tube();
        pictureTube.setMaxListeners(100);
        var tubePipe = pictureTube.pipe(process.stdout);

        var pipe = stream.createReadStream(buffer).pipe(pictureTube);

        pipe.on('end', function () {
            callback(null, number);
        });
    };
}

program
    .version('0.0.1')
    .option('-u, --username [username]', 'Set username to view')
    .option('-t, --tag [tag]', 'Set tags to browse')
    .option('-f, --feed', 'Login to view your own feed. If this option is present, all others will be ignored')
    .option('-A, --ascii', 'Output images in ASCII art')
    .parse(process.argv);

if (program.feed) {
    login();
}else {
    if (program.username) {
        searchUsers(program.username);
    }

    if (program.tag) {
        searchTags(program.tag);
    }
}
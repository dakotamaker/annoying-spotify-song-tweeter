const express = require('express');
const app = express();
const execSync = require('child_process').execSync;
const http = require('http').createServer(app);
const request = require('sync-request');
const fs = require('fs');
const Twitter = require('twitter');
const port = process.env.PORT || '8080';
const myIP = require('ip').address();
const spotifyRedirectURI = `http://${myIP}:${port}/oauth`;
let firstInterval = true;

let twitterClient = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

function start() {
    let clientID = process.env.SPOTIFY_CLIENT_ID;
    let redirectURI = encodeURIComponent(spotifyRedirectURI);

    app.get('/', (req, res) => {
        let scope = encodeURIComponent('user-read-currently-playing');
        let urlParams = `client_id=${clientID}&redirect_uri=${redirectURI}&scope=${scope}&response_type=code`;
        let url = `https://accounts.spotify.com/authorize?${urlParams}`;

        res.redirect(url);
    });

    app.get('/oauth', (req, res) => {
        let accessCode = req.query.code;
        let clientSecretKey = process.env.SPOTIFY_CLIENT_SECRET;

        console.log(clientID);
        console.log(redirectURI);

        let authCodeCurl = `curl -X POST ` +
                        `-d client_id=${clientID} ` +
                        `-d client_secret=${clientSecretKey} ` +
                        '-d grant_type=authorization_code ' +
                        `-d code=${accessCode} ` +
                        `-d redirect_uri=${redirectURI} ` +
                        'https://accounts.spotify.com/api/token';
        let response = JSON.parse(_execSyncWithRetry(authCodeCurl, 3));
        console.log(response)
        if(response.error) {
            console.log(response.error_description);
        }
        else {
            let accessToken = response.access_token;
            let refreshToken = response.refresh_token;
            getCurrentSongAndTweet(accessToken, refreshToken, clientID, clientSecretKey);
            res.sendStatus(200);
        }
    });

    http.listen(port, function () {
        console.log(`Listening on port ${port}!`);
    });
}

function getCurrentSongAndTweet(token, refresh_token, clientID, clientSecretKey) {
    let response = request('GET', 'https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    if(response.body.toString() !== '') {
        let body = JSON.parse(response.body);
        if (response.statusCode === 200 && body.currently_playing_type === 'track') {
            let currentSongDetails = {
                songTitle: body.item.name,
                songArtists: _stringifyListOfArtists(body.item.artists.map(x=>x.name)),
                songAlbum: body.item.album.name,
                link: body.item.external_urls.spotify,
                songProgressMS: body.progress_ms
            };

            console.log(currentSongDetails);

            if(fs.existsSync('songDetails.json')) {
                let fileSong = JSON.parse(fs.readFileSync('songDetails.json'))
                if((fileSong.link === currentSongDetails.link && fileSong.songProgressMS > currentSongDetails.songProgressMS) || fileSong.link !== currentSongDetails.link) {
                    _tweetSong(currentSongDetails);
                }
            } else {
                fs.writeFileSync('songDetails.json', JSON.stringify(currentSongDetails), (err) => {
                    if(err) {
                        console.log(err);
                    }
                });
            }
        }
    } else {
        console.log('Not listening, will try again');
    }

    if(firstInterval) {
        firstInterval = false;
        _setAutoRefresh(refresh_token, clientID, clientSecretKey);
    }
}

function _tweetSong(currentSongDetails) {
    let tweetStatus = `I'm listening to ${currentSongDetails.songTitle} by ${currentSongDetails.songArtists} from ${currentSongDetails.songAlbum}. Any questions? ${currentSongDetails.link}`;

    twitterClient.post('statuses/update', {status: tweetStatus}, function(err, data) {
        if(err) {
            console.log(err);
        } else {
            fs.writeFileSync('songDetails.json', JSON.stringify(currentSongDetails), (err) => {
                if(err) {
                    console.log(err);
                }
            });
        }
    });
}

function _setAutoRefresh(refreshToken, clientID, clientSecretKey) {
    setInterval(()=>{
        let refreshTokenCurl = 'curl -X POST ' +
                        `-d client_id=${clientID} ` +
                        `-d client_secret=${clientSecretKey} ` +
                        '-d grant_type=refresh_token ' +
                        `-d refresh_token=${refreshToken} ` +
                        'https://accounts.spotify.com/api/token';
        let newAccessToken = JSON.parse(_execSyncWithRetry(refreshTokenCurl, 3)).access_token;

        getCurrentSongAndTweet(newAccessToken);
    }, 36 * 1000);
}

function _execSyncWithRetry(command, retry) {
    var output;
    var count = 0;
    while (!output) {
        try {
            count++;
            output = execSync(command);
        } catch (e) {
            console.error(e);
            if(count === retry) {
                console.error('Giving up after retries...');
                throw e;
            }
        }
    }
    return output;
}

function _stringifyListOfArtists(artistArray) {
    if(artistArray.length > 1) {
        artistArray[artistArray.length - 1] = `and ${artistArray[artistArray.length - 1]}`;
    }
    return artistArray.join().replace(/,/g, ', ');
}

start();
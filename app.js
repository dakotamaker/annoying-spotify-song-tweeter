const express = require('express');
const app = express();
const execSync = require('child_process').execSync;
const http = require('http').createServer(app);
const request = require('sync-request');
const fs = require('fs');
const Twitter = require('twitter');
const twitterHandle = process.env.TWITTER_HANDLE || 'DakotaMaker';
const spotifyRedirectURI = 'https://annoying-spotify-link-tweeter.herokuapp.com/oauth/redirect'
const port = process.env.PORT || '8080'

let twitterClient = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY || 'LBEhCeWDWZciGZ7O2DB4mDHkJ',
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET || 'zJyRu8VRm7ZM0qFfe804szSm1NorwnanC8YK8mJwsZ77AESfRN',
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY || 'lcA9H5TNWNQzAmYjJV4IU7ydpfgDHjXhp8Wz7hNw',
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET || 'HhnSIMSxIxXHTvmaM7Sv0VJKiw9XJltyhLdt1iIPCeXz8'
})

function start() {
    let clientID = process.env.SPOTIFY_CLIENT_ID || '7ae78bbf106f4b0dab41c09d7b1f28c8';
    let redirectURI = encodeURIComponent(spotifyRedirectURI);

    app.get('/', (req, res) => {
        let scope = encodeURIComponent('user-read-currently-playing');
        let urlParams = `client_id=${clientID}&redirect_uri=${redirectURI}&scope=${scope}&response_type=code`
        let url = `https://accounts.spotify.com/authorize?${urlParams}`;

        res.redirect(url);
    });

    app.get('/oauth/redirect', (req, res) => {
        let accessCode = req.query.code;
        let clientSecretKey = process.env.SPOTIFY_CLIENT_SECRET || 'cbc813b7fa2f4ffba1bec511b4822901';
        let auth = Buffer.from(`${clientID}:${clientSecretKey}`).toString('base64')

        let authCodeCurl = `curl -H "Authorization: Basic ${auth}" ` +
                        '-d grant_type=authorization_code ' +
                        `-d code=${accessCode} ` +
                        `-d redirect_uri=${redirectURI} ` +
                        'https://accounts.spotify.com/api/token';
        let response = JSON.parse(_execSyncWithRetry(authCodeCurl, 3))

        let accessToken = response.access_token;
        let refreshToken = response.refresh_token;
        getCurrentSongAndTweet(accessToken);
        _setAutoRefresh(refreshToken, auth);
    });

    http.listen(port, function () {
        console.log(`Example app listening on port !`);
    });
}

function getCurrentSongAndTweet(token) {
    let response = request('GET', 'https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    let body = JSON.parse(response.body);

    if (response.statusCode === 200 && body.currently_playing_type === 'track') {
        let currentSongDetails = {
            songTitle: body.item.name,
            songArtists: _stringifyListOfArtists(body.item.artists.map(x=>x.name)),
            songAlbum: body.item.album.name,
            link: body.item.external_urls.spotify,
            songProgressMS: body.progress_ms
        }
        
        if(fs.existsSync('songDetails.json')) {
            let fileSong = JSON.parse(fs.readFileSync('songDetails.json'))
            // console.log('Going to tweet!')
            if((fileSong.link === currentSongDetails.link && fileSong.songProgressMS < currentSongDetails.songProgressMS) || fileSong.link !== currentSongDetails.link) {
                _tweetSong(currentSongDetails)
                // console.log('Tweet!')
            }

            fs.writeFileSync('songDetails.json', JSON.stringify(currentSongDetails), (err) => {
                if(err) {
                    console.err(err);
                }
            });
        } 
    }
}

function _tweetSong(currentSongDetails) {
    let lastTweetExists = fs.existsSync('lastTweetID.json');
    let tweetStatus = `${lastTweetExists ? '@' + twitterHandle + ' ' : ' '}I'm listening to ${currentSongDetails.songTitle} by ${currentSongDetails.songArtists} from ${currentSongDetails.songAlbum}. Any questions? ${currentSongDetails.link}`;
    let statusOption = {status: tweetStatus};

    let tweetOptions = Object.assign(fs.existsSync('lastTweetID.json') ? {in_reply_to_status_id: JSON.parse(fs.readFileSync('lastTweetID.json')).id } : {}, statusOption)
    twitterClient.post('statuses/update', tweetOptions, function(err, data) {
        if(err) {
            console.err(err)
        } else {
            fs.writeFileSync('lastTweetID.json', JSON.stringify({id: data.id_str}));
        }
    });
}

function _setAutoRefresh(refreshToken, auth) {
    setInterval(()=>{
        let refreshTokenCurl = `curl -H "Authorization: Basic ${auth}" ` +
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
    return artistArray.join().replace(/,/g, ', ')
}

start();
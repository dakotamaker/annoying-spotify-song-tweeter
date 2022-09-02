const express = require('express');
const app = express();
const http = require('http').createServer(app);
const spotify = require('./services/Spotify');
const twitter = require('./services/Twitter');

function start() {
    let Spotify = new spotify();
    let Twitter = new twitter();
    let firstInterval = true;
    let accessToken;
    let refreshToken;
    let songOrPodcastDetails;

    app.get('/', (req, res) => {
        res.redirect(Spotify.getRedirectUrl());
    });

    app.get('/oauth', (req, res) => {
        let accessCode = req.query.code;
        let spotifyAuthorization = Spotify.authorize(accessCode);

        accessToken = spotifyAuthorization.access_token;
        refreshToken = spotifyAuthorization.refresh_token;

        if(firstInterval) {
            songOrPodcastDetails = Spotify.getCurrentSong(accessToken);
            if(songOrPodcastDetails) {
                Twitter.tweet(songOrPodcastDetails);
            }       
            firstInterval = false;
        }

        res.redirect('/tweeting');   
    });

    app.get('/tweeting', (req, res) => {
        res.sendStatus(200);
    });

    http.listen('8080', function () {
        console.log('Listening on port 8080');
    });

    
    setInterval(() => {
        if(!firstInterval) {
            let refreshSpotifyAuth = Spotify.refreshAuth(refreshToken);
            accessToken = refreshSpotifyAuth.access_token;
        }
    }, 3400 * 1000);

    setInterval(() => {
        if(!firstInterval) {
            songOrPodcastDetails = Spotify.getCurrentSong(accessToken);
            if(songOrPodcastDetails) {
                Twitter.tweet(songOrPodcastDetails);
            }
        }
    }, 36 * 1000);
}

start();
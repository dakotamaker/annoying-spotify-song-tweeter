const fs = require('fs');
const myIP = require('ip').address();
const request = require('sync-request');
const spotifyRedirectURI = `http://${myIP}:8080/oauth`;

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const execSync = require('child_process').execSync;


const _stringifyListOfArtists = function(artistArray) {
    if(artistArray.length > 1) {
        artistArray[artistArray.length - 1] = `and ${artistArray[artistArray.length - 1]}`;
    }
    return artistArray.join().replace(/,/g, ', ');
}

const _returnAppropriateSongObject = function(body) {
    let currentSongDetails = {
        songTitle: body.item.name,
        songArtists: _stringifyListOfArtists(body.item.artists.map(x=>x.name)),
        songAlbum: body.item.album.name,
        link: body.item.external_urls.spotify,
        songProgressMS: body.progress_ms,
        consecutivePlayCount: 1
    };

    if(fs.existsSync('songDetails.json')) {
        let fileSong = JSON.parse(fs.readFileSync('songDetails.json'))
        if(fileSong.link === currentSongDetails.link && fileSong.songProgressMS > currentSongDetails.songProgressMS) {
            currentSongDetails.consecutivePlayCount += fileSong.consecutivePlayCount;
        } else if(fileSong.link === currentSongDetails.link && fileSong.songProgressMS < currentSongDetails.songProgressMS) {
            return null;
        }
    } else {
        fs.writeFileSync('songDetails.json', JSON.stringify(currentSongDetails), (err) => {
            if(err) {
                console.error(err);
            }
        });
    }

    console.log(currentSongDetails);
    return currentSongDetails;
}

class Spotify {
    authorize(accessCode) {
        let authCodeCurl = `curl -X POST ` +
                        `-d client_id=${CLIENT_ID} ` +
                        `-d client_secret=${CLIENT_SECRET} ` +
                        '-d grant_type=authorization_code ' +
                        `-d code=${accessCode} ` +
                        `-d redirect_uri=${spotifyRedirectURI} ` +
                        'https://accounts.spotify.com/api/token';
        
        let retry_count = 0;
        let response;

        for (retry_count; retry_count < 3; retry_count++) {
            response = JSON.parse(execSync(authCodeCurl));

            if(response && !response.error) {
                return response;
            } else if (retry_count === 2) {
                console.error(response.error_description);
            }
        }
    }

    getRedirectUrl() {
        let scope = encodeURIComponent('user-read-currently-playing');
        let urlParams = `client_id=${CLIENT_ID}&redirect_uri=${spotifyRedirectURI}&scope=${scope}&response_type=code`;
        let url = `https://accounts.spotify.com/authorize?${urlParams}`;
        return url;
    }

    getCurrentSong(accessToken) {
        let response = request('GET', 'https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if(response.statusCode !== 204) {
            let body = JSON.parse(response.body);
            if (response.statusCode === 200) {
                if(body.currently_playing_type === 'track') {
                    return _returnAppropriateSongObject(body);
                } else if(body.currently_playing_type === 'episode') {
                    return {podcast: true};
                }
            }
        } else {
            console.log('Not listening, will try again in 36 seconds.');
            return null;
        }
    }

    refreshAuth(refreshToken) {
        let refreshTokenCurl = 'curl -X POST ' +
                                `-d client_id=${CLIENT_ID} ` +
                                `-d client_secret=${CLIENT_SECRET} ` +
                                '-d grant_type=refresh_token ' +
                                `-d refresh_token=${refreshToken} ` +
                                'https://accounts.spotify.com/api/token';

        let retry_count = 0;
        let response;

        for (retry_count; retry_count < 3; retry_count++) {
            response = JSON.parse(execSync(refreshTokenCurl));

            if(response && !response.error) {
                return response;
            } else if (retry_count === 2) {
                console.error(response.error_description);
            }
        }
    }
}

module.exports = Spotify;
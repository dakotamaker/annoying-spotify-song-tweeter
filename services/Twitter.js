const fs = require('fs');
const twitter = require('twitter');

let twitterClient = new twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

class Twitter {
    tweet(songOrPodcastDetails) {
        let status;
        if(songOrPodcastDetails.podcast) {
            status = 'I\'m an intelectual listening to a podcast right now. Be back soon sweaties.'
        } else {
            let consecutiveCount = songOrPodcastDetails.consecutivePlayCount > 1 ? ' (' + songOrPodcastDetails.consecutivePlayCount + 'x)' : '';
            status = `I'm listening to ${songOrPodcastDetails.songTitle} by ${songOrPodcastDetails.songArtists} from ${songOrPodcastDetails.songAlbum}${consecutiveCount}. ${songOrPodcastDetails.link}`
       
            twitterClient.post('statuses/update', {status: status}, function(err, data) {
                if(err) {
                    console.error("Error posting to twitter", err);
                } else {
                    fs.writeFileSync('songDetails.json', JSON.stringify(songOrPodcastDetails), (err) => {
                        if(err) {
                            console.log("Error in writing to detials", err);
                        }
                    });
                }
            });
        }
        console.log(status)
    }
}

module.exports = Twitter;
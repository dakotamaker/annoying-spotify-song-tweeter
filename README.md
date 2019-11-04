# Annoying Spotify Link Tweeter
Well, I'm not sure why you'd ever want to use this. Hell, I don't even want to. But in all seriousness, this is a tool to take in Spotify and Twitter credentials to tweet out what you are listening to on Spotify every 36 seconds (100 times an hour).

*Disclaimer:* This was kind of a mess-around project. This will not regularly be updated probably.

## Requirements
* Spotify developer app for client key and ID
    * Important to note that whatever URL you are using for this will need to be registered as a redirect URI in the Spotify dev dashboard
* Twitter developer app for consumer key and ID, as well as access token key and secret
* Node.JS
* NPM
* Twitter and Spotify accounts

## Running
1. Set env variables:
    - `TWITTER_CONSUMER_KEY`: Twitter consumer key from Twitter developer app
    - `TWITTER_CONSUMER_SECRET`: Twitter consumer secret from Twitter developer app 
    - `TWITTER_ACCESS_TOKEN_KEY`: Twitter access token key from Twitter developer app
    - `TWITTER_ACCESS_TOKEN_SECRET`: Twitter access token secret from Twitter developer app
    - `SPOTIFY_CLIENT_ID`: Spotify client ID from Spotify developer app
    - `SPOTIFY_CLIENT_SECRET`: Spotify client key from Spotify developer app
    - _[Optional]_ `PORT`: port to run your app on, otherwise it will default to 8080
2. Run `npm i` to install all dependencies
3. Run `npm start` and navigate to `<your URL>:<port>` in your browser.
4. Leave open and annoy your Twitter followers to no end. Refresh tokens will be generated so there is no need to do anything after that.
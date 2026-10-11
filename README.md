# apod.widget
Übersicht APOD desktop image and video

Updated Oct 2025

What's new

Minor update.

All Mac's since OS 10.6 should have everything installed and ready to go (Bash, AppleScript and SIPs (Simple Image Processor)). 
Just configure `apod.jsx` to suit your tastes.
Get an API key from NASA. It's free and easy. 

## Configuration

**Only 1 must be changed** - the API key. It will be 40 characters long.
Go to https://api.nasa.gov
Fill in the three required fields.
Copy the key into the `apod.jsx` script. Not the web address, just the key.
Done.

**These are 11 lines that control virtually everything.**

```// ***************** OPTIONS ******************
export const folder = "APOD"                 // widget folder
export const durationMs = 60 * 60 * 1000     // refresh every hour
export const width = 3008                    // screen width
export const height = 1692                   // screen height
export const dock = 90                       // macOS dock height
export const captionWidth = 350              // width of caption block
export const videoWidth = Math.floor(width * 0.6) // width of video player (16:9 aspect ratio) 60% screen width
export const videoMargin = Math.floor((width - videoWidth) / 2) // center video player
export const margin = 20                     // left margin for caption
export const apiKey = "DEMO_KEY" // NASA API key (Replace with your own for higher rate limits)
export const videoReplayDelay = 600  // seconds to wait before replaying video
export const keepDays = 0                    // delete images older than this many days (0 = never delete)
// **************END OPTIONS ******************
```

That should do it. I've tested on a few Macs of mine and it worked.

### Disclaimer

I have no idea what I'm doing. 
Use this at your own risk. It shouldn't break anything. It doesn't write anything outside of the directory it's installed in. Check the apod.jsx and apod.sh files in a text editor. They are commented as to what is going on.
Rememnber, I wrote it for myself. If it can be improved please help me learn. 
Change it as you wish but please share the improvements with me: github@skunkworks.net.nz

# apod.widget
Übersicht APOD desktop image and video

Updated 15 Oct 2021 - Bug fix 18 Oct 2021 & 15 March 2022

What's new

Complete rewrite. All Mac's should have everything installed and ready to go. 
Just configure apod.jsx to suit your Mac.
And get an API key from NASA. It's free and easy. 
I have included a 'default.jpg' which you can replace with anything you like as long as it is called 'default.jpg' and isn't too big (1-3Mb).

Configuration

Only 1 must be changed - the API key. It will be 40 characters long.
Go to https://api.nasa.gov
Fill in the three required fields.
Copy the key into the apod.jsx script. Not the web address, just the key above it.
Done.

These are 11 lines that control virtually everything.

// ***************** OPTIONS ******************

export const folder = "/APOD/"

export const durationMs = 60 * 60 * 1000 // duration with milliseconds

export const width = 2560 // your screen width

export const height = 1440 // your screen height

export const dock = 90 // height of your dock - so the caption will clear it

export const colour = "000000" // background colour

export const captionWidth = 450 // Math.floor(width * .7)

export const videoWidth = Math.floor(width * .6) // .7 = 70% of the screen width

export const margin = 10 // Math.floor((width - captionWidth) / 2) - 20

export const videoMargin = Math.floor((width - videoWidth) / 2) - 20 // centre the caption on the screen

export const ESToffset = -18 // get the hours offset for EST in the US.

export const apiKey = "DEMO_KEY" // get your api key at api.nasa.govt  (it's free and not hard)

export const imageOut = "imgfit.jpg"


That should do it. I've tested on a few Macs of mine and it worked.
Disclaimer

I have no idea what I'm doing. 
Use this at your own risk. It shouldn't break anything. It doesn't write anything outside of this directory it's installed in. Check the apod.jsx and apod.sh files in a text editor. They are commented as to what is going on.
Rememnber, I wrote it for myself. If it can be improved please help me learn. 
Change it as you wish but please share the improvements with me: github@skunkworks.net.nz

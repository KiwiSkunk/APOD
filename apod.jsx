import { React } from 'uebersicht';

// ***************** OPTIONS ******************
export const folder = "/APOD/" // the name of folder inside the widgets folder
export const durationMs = 60 * 60 * 1000 // duration with milliseconds x 1000 x 60 x 60 = 1 hour
export const width = 1440 // your screen width
export const height = 900 // your screen height
export const dock = 90 // height of your dock - so the caption will clear it. Take a guess.
export const colour = "000000" // background colour. This is black.
export const captionWidth = Math.floor(width * .7) // .7 = 70% of the screen width
export const margin = Math.floor((width - captionWidth) / 2) - 20 // centre the caption on the screen
export const ESToffset = -18 // get the hours offset for EST in the US for your location.
export const apiKey = "DEMO_KEY" // get your api key at api.nasa.govt (it's free and not hard)
export const imageOut = "imgfit.jpg" // The name of the desktop image
// **************END OPTIONS ******************
export const refreshFrequency = durationMs;
export const initialState = { output: "++Loading++++Copyright: Skunkworks++2021++www.skunkworks.net.nz++" };
export const num = Math.floor(Math.random() * 10000); // force update of image
export const stamp = Date() // force image refresh
export const videoHeight = Math.floor(captionWidth * .56)

export const className = `
  .background {
    position: absolute;
    top: 0px;
    left: 0px;
    width: ${width}px;
    height: ${height}px;
    z-index: 0;
  }
  .caption {
    position: absolute;
    bottom: ${dock}px;
    width: ${captionWidth}px;
    left: ${margin}px;
    right: ${margin}px;
    font-color: #ffffff;
    font-family: Helvetica;
    font-size: 14px;
    line-height: 20px;
    text-align: center;
    padding: 20px;
    color: #fff;
    background: rgba(000, 000, 000, 0.5);
    border-radius: 5px;
    z-index: 1;
  }
  a:link, a:visited {
    color: #fff;
    text-decoration: none;
  }
  .videoBox {
    position: absolute;
    margin-left: ${margin}px;
    width: ${captionWidth}px;
    height: ${videoHeight}px;
  }
`

// call the shell script that does the work
export const command = "bash ${HOME}/Library/Application\\ Support/Übersicht/widgets"+folder+"apod.sh "+folder+" "+width+" "+height+" "+dock+" "+colour+" "+ESToffset+" "+apiKey+" "+imageOut

export const render = ({ output }, refreshFrequency ) => {
  console.log(output);
  const commandValues = output.split("++");
  const title = commandValues[0];
  const imageCaption = commandValues[1];
  const copyright = commandValues[2];
  const date = commandValues[3];
  const video = commandValues[4];
  const url = commandValues[5];
  const image = commandValues[6];
  const videourl = url+"&autoplay=1&mute=1"

  return (
    <div className='background'>
      <div className="videoBox" >
        <iframe width="100%" height="100%" src={videourl} frameborder="0" ></iframe>
      </div>
      <img src={image} />
      <div className='caption'><b>{title}</b><br />{video} {imageCaption}<br />{copyright} {date}</div>
    </div>
  );
};
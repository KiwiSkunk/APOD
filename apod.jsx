import { React } from 'uebersicht';

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
export const apiKey = "vtFnldwWzZbyZDNdiVv4fJIgETyIdZzvTwIg4D3U" // get your api key at api.nasa.govt
export const imageOut = "imgfit.jpg"
// **************END OPTIONS ******************
export const refreshFrequency = durationMs;
export const initialState = { output: "\nLoading\n\nCopyright: Skunkworks\n2021\nwww.skunkworks.net.nz\n" };
export const num = Math.floor(Math.random() * 10000); // force update of image
export const stamp = Date() // force image refresh
export const videoHeight = Math.floor(videoWidth * .56)

// call the shell script that does the work
export const command = "bash ${HOME}/Library/Application\\ Support/Übersicht/widgets"+folder+"apod.sh "+folder+" "+width+" "+height+" "+dock+" "+colour+" "+ESToffset+" "+apiKey+" "+imageOut

export const captionTop = -(height - dock)

export const className = `
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
    margin-left: ${videoMargin}px;
    width: ${videoWidth}px;
    height: ${videoHeight}px;
    background: none;
    color: none;
  }
  .imageBox {
    position: absolute;
  }
`

// Render the view
export const render = ({ output }, refreshFrequency ) => {
  console.log(output);
  const commandValues = output.split("++");
  const title = commandValues[0];
  const imageCaption = commandValues[1];
  const copyright = commandValues[2];
  const date = commandValues[3];
  const video = commandValues[4];
  const videourl = commandValues[5];
  const image = commandValues[6];
  const imageH = commandValues[7];
  const imageW = commandValues[8];
  const leftM = ((width - imageW) / 2)
  const bottomM = ((height - imageH) / 2)
  const leftMargin = `${leftM}px`
  const tall = `${imageH}px`
  const wide = `${imageW}px`
  const bottomMargin = `${bottomM}px`

  return (
  <div>
    <div className="videoBox">
      <iframe width="100%" height="100%" src={videourl} frameBorder="0" ></iframe>
    </div>
    <img className="imagebox" style={{marginLeft: leftMargin, bottom: bottomMargin, height: tall, width: wide }} src={image} />
    <div className='caption'><b>{title}</b><br />{video} {imageCaption}<br />{copyright} -{date}</div>
  </div>
  );
};

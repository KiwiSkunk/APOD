import { React } from 'uebersicht';

// ***************** OPTIONS ******************
export const folder = "APOD"               // widget folder
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

const usableHeight = height - dock;
const imagefolder = folder+"/images/";
export const refreshFrequency = durationMs; 
export const initialState = { output: "Initialising APOD image of the day..." };

// ---- Fade + slow zoom animation styles ----
const imageAnim = {
  opacity: 0,
  animation: "fadeIn 1.5s ease-out forwards, slowZoom 20s ease-in-out forwards"
};

// ----- Keyframes inserted directly -------
export const className = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @keyframes slowZoom {
    from { transform: scale(1.0); }
    to   { transform: scale(1.05); }
  }

`;

// -------------- Bash command ---------------
// export const command = dispatch => `bash "~/Library/Application\ Support/Übersicht/widgets/${folder}/apod.sh" \"${folder}" \"${width}" \"${height}" \"${dock}" \"${apiKey}";`;
export const command = "bash ${HOME}/Library/Application\\ Support/Übersicht/widgets/"+folder+"/apod.sh "+folder+" "+width+" "+height+" "+dock+" "+apiKey+" "+keepDays
// -------------- main render ----------------
export const render = ({ output, error }) => {
  // 1. Check for System Errors (Script failed to run)
  if (error) return <div style={{color: 'black'}}>Error: {String(error)}</div>;

  // 2. Check if Data exists at all
  if (!output) return <div style={{color: 'black'}}>Connecting to NASA...</div>;

  // 3. Split the data into parts
  const parts = output.split("++");

  // 5. Destructure the parts
  const [
    title,
    explanation,
    copyright,
    date,
    videoFlag,
    videoUrl,
    image,
    imageH,
    imageW
  ] = parts;

  // Assuming margin, videoMargin, videoWidth, and captionWidth are defined in the scope

  const isVideo = videoFlag === "Video";
  const w = parseInt(imageW);
  const h = parseInt(imageH);
  const leftMargin = Math.floor((width - w) / 2);
  const topMargin = Math.max(0, Math.floor((usableHeight - h) / 2));
  const videoHeight = Math.floor(videoWidth * 0.5625);
  const videoTopMargin = Math.max(0, Math.floor((usableHeight - videoHeight) / 2));

  // ------------ blurred patch behind caption (B) -------------
  // Note: backdropFilter here blurs the NEW full-screen blurred background
  // and the main image (if it doesn't cover the entire backdrop).
  const blurBackdrop = (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: captionWidth + 40,
        height: 200,
        background: "rgba(0, 0, 0, 0.25)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "12px",
        margin: 10
      }}
    />
  );

  // ------------ glass-style caption (A) -------------
const caption = (
  <div
    style={{
      position: "absolute",
      bottom: 20,
      left: margin + 10,
      width: captionWidth,
      padding: "14px 20px",
      lineHeight: "1.3em",
      borderRadius: "16px",
      color: "white",
      // light, slightly diagonal sheen instead of a flat black tint
      background: "linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))",
      backdropFilter: "blur(24px) saturate(180%)",
      WebkitBackdropFilter: "blur(24px) saturate(180%)",
      border: "1px solid rgba(255, 255, 255, 0.25)",   // thin glass edge
      textShadow: "0 1px 4px rgba(0, 0, 0, 0.6)",
      fontFamily: "Sans-Serif",
      textAlign: "center",
      // first value = bright top-edge highlight, second = soft drop shadow
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 32px rgba(0,0,0,0.35)",
    }}
  >
      <b style={{ fontSize: "1.1em" }}>{title}</b><br /><br />
      {isVideo && <span style={{ fontSize: "0.9em" }}>Video<br /></span>}
      {explanation && <span style={{ fontSize: "0.9em" }}>{explanation}<br /><br /></span>}
      <span style={{ fontSize: "0.9em" }}>{copyright} — {date}</span>
    </div>
  );

  // ------------ video display (unchanged) -------------
  // ------------ video display (new: supports replay with 60s pause) -------------
  const VideoPlayer = ({ src, style }) => {
    const containerRef = React.useRef();
    const videoRef = React.useRef();
    const [iframeKey, setIframeKey] = React.useState(0);
    const cachedObjectUrlRef = React.useRef(null);
    const [cachedUrl, setCachedUrl] = React.useState(null);
    const [isCaching, setIsCaching] = React.useState(false);

    // helper: detect direct video file
    const isDirectVideo = src && src.match(/\.(mp4|webm|ogg)(\?|$)/i);

    // helper: detect YouTube links (watch, short, or embed)
    const getYouTubeId = url => {
      if (!url) return null;
      try {
        const u = new URL(url);
        if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
        if (u.hostname.includes('youtube.com')) {
          if (u.pathname === '/watch') return u.searchParams.get('v');
          const parts = u.pathname.split('/');
          return parts.pop() || parts.pop();
        }
      } catch (e) {
        return null;
      }
      return null;
    };

    const ytId = getYouTubeId(src);

    // HTML5 video: play, on end wait 60s then replay
    React.useEffect(() => {
      if (isDirectVideo && videoRef.current) {
        const v = videoRef.current;
        let timeoutId = null;
			const onEnded = () => {
			  timeoutId = setTimeout(() => {
				v.currentTime = 0;
				v.play().catch(() => {});
			  }, videoReplayDelay * 1000);  // CHANGED
			};        v.addEventListener('ended', onEnded);
        return () => {
          v.removeEventListener('ended', onEnded);
          if (timeoutId) clearTimeout(timeoutId);
        };
      }
    }, [src]);

    // Cache direct video files by fetching once and creating a blob URL.
    // Note: this requires the video host to allow CORS for fetching; otherwise we fall back to original src.
    React.useEffect(() => {
      // only attempt for direct video URLs (mp4/webm/ogg) and http(s) sources
      if (!isDirectVideo || !src || !(src.startsWith('http://') || src.startsWith('https://'))) {
        // cleanup any previously cached blob
        if (cachedObjectUrlRef.current) {
          URL.revokeObjectURL(cachedObjectUrlRef.current);
          cachedObjectUrlRef.current = null;
          setCachedUrl(null);
        }
        return;
      }

      let aborted = false;
      let thisObjectUrl = null;
      setIsCaching(true);

      fetch(src)
        .then(r => {
          if (!r.ok) throw new Error('Network response not ok');
          return r.blob();
        })
        .then(blob => {
          if (aborted) return;
          thisObjectUrl = URL.createObjectURL(blob);
          // revoke previous cached object if present
          if (cachedObjectUrlRef.current && cachedObjectUrlRef.current !== thisObjectUrl) {
            try { URL.revokeObjectURL(cachedObjectUrlRef.current); } catch (e) {}
          }
          cachedObjectUrlRef.current = thisObjectUrl;
          setCachedUrl(thisObjectUrl);
        })
        .catch(() => {
          // fetch failed (likely CORS) — ensure we use original src
          if (!aborted) setCachedUrl(null);
        })
        .finally(() => { if (!aborted) setIsCaching(false); });

      return () => {
        aborted = true;
        // do not revoke here immediately because we keep cached for playback across replays;
        // it will be revoked when src changes or component unmounts (below)
      };
    }, [src, isDirectVideo]);

    // cleanup on unmount: revoke any created object URL
    React.useEffect(() => {
      return () => {
        if (cachedObjectUrlRef.current) {
          try { URL.revokeObjectURL(cachedObjectUrlRef.current); } catch (e) {}
          cachedObjectUrlRef.current = null;
        }
      };
    }, []);

    // YouTube: load API and attach player to react to ended event
	React.useEffect(() => {
	  if (!ytId) return;
		
	  let player = null;
	  let timeoutId = null;
	
	  const setupPlayer = () => {
		try {
		  player = new window.YT.Player(`yt-player-${ytId}`, {  
			events: {
			  onReady: () => {
				try { player.mute(); } catch (e) {}
			  },
			  onStateChange: e => {
				if (e.data === 0) {
				  timeoutId = setTimeout(() => {
					try { player.playVideo(); } catch (e) {}
				  }, videoReplayDelay * 1000);  // CHANGED
				}
			  }
			}
		  });
		} catch (e) {}
	  };

      // ensure YT API is loaded
      if (window.YT && window.YT.Player) {
        setupPlayer();
      } else {
        // add script once
        if (!document.getElementById('youtube-iframe-api')) {
          const s = document.createElement('script');
          s.id = 'youtube-iframe-api';
          s.src = 'https://www.youtube.com/iframe_api';
          document.body.appendChild(s);
        }

        // polling for API ready
        const interval = setInterval(() => {
          if (window.YT && window.YT.Player) {
            clearInterval(interval);
            setupPlayer();
          }
        }, 250);
      }

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        try { if (player && player.destroy) player.destroy(); } catch (e) {}
      };
    }, [ytId, iframeKey]);

    // fallback for unknown iframe: when video cannot be controlled, attempt to reload iframe after a long interval (not ideal)
    React.useEffect(() => {
      if (!isDirectVideo && !ytId) {
        // reload every 5 minutes as a safe fallback (no reliable ended event)
        const id = setInterval(() => setIframeKey(k => k + 1), 300000);
        return () => clearInterval(id);
      }
    }, [src]);

    if (isDirectVideo) {
      // prefer cached blob URL when available
      const playSrc = cachedUrl || src;
      return (
        <div style={style}>
          <video
            ref={videoRef}
            src={playSrc}
            width="100%"
            height="100%"
            controls
            autoPlay
            muted
            playsInline
            // ensure muted on load for autoplay policies
            defaultMuted
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>
      );
    }

if (ytId) {
  const embed = `https://www.youtube.com/embed/${ytId}?enablejsapi=1&autoplay=1&mute=1&rel=0&modestbranding=1`;
  return (
    <div ref={containerRef} style={style}>
      <iframe
        id={`yt-player-${ytId}`}
        key={iframeKey}
        src={embed}
        width="100%"
        height="100%"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    </div>
  );
}

    // generic iframe fallback (append mute hint when possible)
    const fallbackSrc = src ? (src.includes('?') ? src + '&mute=1' : src + '?mute=1') : src;
    return (
      <div ref={containerRef} style={style}>
        <iframe
          key={iframeKey}
          src={fallbackSrc}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="autoplay; encrypted-media"
        />
      </div>
    );
  };

  const videoFrame = isVideo && (
    <VideoPlayer
      src={videoUrl}
      style={{
        position: "absolute",
        top: videoTopMargin,
        left: videoMargin,
        width: videoWidth,
        height: videoHeight,
        borderRadius: "10px",
        overflow: "hidden",
        animation: "fadeIn 1.2s ease-out forwards"
      }}
    />
  );

  // ------------ image with fade + slow zoom (C) -------------
  const imageBox = (
    <img
      src={imagefolder+image}
      style={{
        position: "absolute",
        top: topMargin,
        left: leftMargin,
        width: w,
        height: h,
        objectFit: "contain",
        ...imageAnim
      }}
    />
  );
  
  // ------------ NEW: FULL-SCREEN BLURRED BACKGROUND -------------
  const blurredBackground = (
      <div
          style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundImage: `url(${imagefolder+image})`, // Use the same image
              backgroundSize: "cover",
              backgroundPosition: "center",
              // Apply blur directly to the background element
              filter: "blur(5px) brightness(60%)", 
              transform: "scale(1.1)", // Scale to prevent edge artifacts from the blur
          }}
      />
  );

  return (
    <div style={{ position: "relative", width, height: usableHeight }}>
      {/* Add the full-screen blurred background first */}
      {blurredBackground}

      {/* Main content on top */}
      {!isVideo && imageBox}
      {videoFrame}

      {/* Glass-style caption */}
      {caption}
    </div>
  );
};
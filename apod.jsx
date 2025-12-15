import { React } from 'uebersicht';

// ***************** OPTIONS ******************
export const folder = "APOD"               // widget folder
export const durationMs = 60 * 60 * 1000     // refresh every hour
export const width = 3008                    // screen width
export const height = 1692                   // screen height
export const dock = 90                       // macOS dock height
export const captionWidth = 500              // width of caption block
export const videoWidth = Math.floor(width * 0.6)
export const videoMargin = Math.floor((width - videoWidth) / 2)
export const videoTopMargin = 80
export const margin = 20                     // left margin for caption
export const apiKey = "vtFnldwWzZbyZDNdiVv4fJIgETyIdZzvTwIg4D3U" // NASA API key
// **************END OPTIONS ******************

const usableHeight = height - dock;
const imagefolder = folder+"/images/";
export const refreshFrequency = 600000; // durationMs
export const initialState = { output: "Loading APOD image of the day. By Skunkworks 2026" };
export const stamp = new Date(); // force image refresh

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

  * {
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
  }
`;

// -------------- Bash command ---------------
// export const command = dispatch => `bash "~/Library/Application\ Support/Übersicht/widgets/${folder}/apod.sh" \"${folder}" \"${width}" \"${height}" \"${dock}" \"${apiKey}";`;
export const command = "bash ${HOME}/Library/Application\\ Support/Übersicht/widgets/"+folder+"/apod.sh "+folder+" "+width+" "+height+" "+dock+" "+apiKey

// -------------- main render ----------------
export const render = ({ output }) => {
  if (!output) return <div>Loading APOD image of the day. By Skunkworks 2026</div>;

  const parts = output.split("++");
  if (parts.length < 9) return <div>Downloading image...</div>;

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

  // Assuming margin, videoTopMargin, videoMargin, videoWidth, and captionWidth are defined in the scope

  const isVideo = !!videoUrl;
  const w = parseInt(imageW);
  const h = parseInt(imageH);
  const leftMargin = Math.floor((width - w) / 2);

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
        borderRadius: "12px",
        color: "white",
        background: "rgba(0, 0, 0, 0.25)",
        backdropFilter: "blur(30px) saturate(160%)",
        WebkitBackdropFilter: "blur(30px) saturate(160%)",
        textShadow: "0 0 6px black",
        fontFamily: "Sans-Serif",
        textAlign: "center",
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
          }, 60000);
        };
        v.addEventListener('ended', onEnded);
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

      // build embed src with enablejsapi=1 to allow control
      const embedSrc = `https://www.youtube.com/embed/${ytId}?enablejsapi=1&autoplay=1&rel=0&modestbranding=1`;
      const iframe = containerRef.current && containerRef.current.querySelector('iframe');

      let player = null;
      let timeoutId = null;

      const setupPlayer = () => {
        try {
          player = new window.YT.Player(iframe, {
            events: {
              onReady: () => {
                try { player.mute(); } catch (e) {}
              },
              onStateChange: e => {
                // YT.PlayerState.ENDED === 0
                if (e.data === 0) {
                  timeoutId = setTimeout(() => {
                    try { player.playVideo(); } catch (e) {}
                  }, 60000);
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
        height: Math.floor(videoWidth * 0.56),
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
        top: 0,
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
              filter: "blur(05px) brightness(60%)", 
              transform: "scale(1.1)", // Scale to prevent edge artifacts from the blur
          }}
      />
  );

  return (
    <div style={{ position: "relative", width, height: usableHeight }}>
      {/* 1. Add the full-screen blurred background first */}
      {blurredBackground}

      {/* 2. Main content on top */}
      {!isVideo && imageBox}
      {videoFrame}

      {/* 3. Captions and overlays */}
      {/* blur layer behind caption */}
      {blurBackdrop}

      {/* glass-style caption */}
      {caption}
    </div>
  );
};
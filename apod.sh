#!/usr/bin/env bash
# APOD widget data script for Übersicht
#
# Uses only tools that ship with macOS 10.10 or newer: bash, curl, sips, awk, sed, tr, osascript.
# (osascript's JavaScript engine is used to read NASA's JSON, so jq is NOT needed.)
#
# NASA's feed (science.nasa.gov/wp-json/wp/v2/apod-basic/) now returns a LIST of the
# most recent days, newest first. Text fields contain HTML. For images the picture is
# in "hdurl" (with a ?w=..&h=.. query string); for videos the link lives inside "basic_html".

export LC_ALL=en_US.UTF-8
set -u  # safer than allexport; avoids silent failures
export PATH="/usr/local/bin:$PATH"

# Save original stdout (fd 3), then redirect stdout+stderr to log
exec 3>&1
exec 1>>/tmp/apod_output.log
exec 2>>/tmp/apod_output.log
# ***************** ARGUMENTS ******************
folderName=$1
maxwidth=$2
maxheight=$3
dockH=$4
apiKey=$5
apodDefault="default.png"      # lives in the images/ folder
maxheight=$((maxheight - dockH))

# ***************** DEFAULT VALUES ******************
ImageNameU="$apodDefault"
explanation="No explanation available."
date="$(date +%Y-%m-%d)"
copyright="NASA"
title="Astronomy Picture of the Day"
media=""
hdURL=""
videoRaw=""
video=""
videoURL=""

# ***************** MOVE TO WIDGET FOLDER ******************
cd "${HOME}/Library/Application Support/Übersicht/widgets/${folderName}/" || exit 0
mkdir -p images

# image fallback sizes (measured after the cd so the path is valid)
newW=$(sips --getProperty pixelWidth  "images/$apodDefault" 2>/dev/null | awk '/pixelWidth/ {print $2}')
newH=$(sips --getProperty pixelHeight "images/$apodDefault" 2>/dev/null | awk '/pixelHeight/ {print $2}')

# ***************** DELETE OLD IMAGES IF REQUESTED *****************
KEEP_DAYS="${6:-0}"
case "$KEEP_DAYS" in
  ''|*[!0-9]*) KEEP_DAYS=0 ;;     # anything that isn't a plain number = do nothing
esac

if [ "$KEEP_DAYS" -gt 0 ] && [ -d "$IMAGEDIR" ]; then
  find "$IMAGEDIR" -maxdepth 1 -type f \
    \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.gif' \) \
    ! -name "$TODAYS_IMAGE" \
    -mtime +"$KEEP_DAYS" -delete
fi

# ***************** DOWNLOAD JSON ******************
apodURL="https://science.nasa.gov/wp-json/wp/v2/apod-basic/?api_key=${apiKey}"
tmpFile="apod.json.tmp"

# Only replace the cached JSON if the download worked AND looks like APOD data
if curl -sS -f -L -o "$tmpFile" "$apodURL" > /dev/null 2>&1 && grep -q '"title"' "$tmpFile"; then
    mv -f "$tmpFile" apod.json > /dev/null 2>&1
else
    echo "DEBUG: API Down or bad reply. Using cached JSON: $(date)" >> /tmp/apod_output.log
    rm -f "$tmpFile" > /dev/null 2>&1
fi

# ***************** JSON PARSER (osascript JavaScript, built into macOS) ******************
# Prints 7 lines: title, explanation, copyright, date, media type, image URL, video URL
read -r -d '' jsCode <<'JSEOF' || true
ObjC.import('Foundation');

function clean(s) {
  s = String(s === null || s === undefined ? '' : s);
  s = s.replace(/<br\s*\/?>/gi, ' ').replace(/<\/p>/gi, ' ');
  s = s.replace(/<[^>]*>/g, '');
  s = s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
       .replace(/&#x([0-9a-fA-F]+);/g, function (m, h) { var n = parseInt(h, 16); return n < 65536 ? String.fromCharCode(n) : ''; })
       .replace(/&#(\d+);/g, function (m, d) { var n = parseInt(d, 10); return n < 65536 ? String.fromCharCode(n) : ''; })
       .replace(/&amp;/g, '&');
  s = s.replace(/\+\+/g, '+ +');
  s = s.replace(/\s+/g, ' ').replace(/^ /, '').replace(/ $/, '');
  return s;
}

function pickVideoUrl(html) {
  var pats = [
    /<source[^>]+src\s*=\s*["']([^"']+)["']/i,
    /<video[^>]+src\s*=\s*["']([^"']+)["']/i,
    /<iframe[^>]+src\s*=\s*["']([^"']+)["']/i,
    /(https?:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/[A-Za-z0-9_-]+)/i
  ];
  for (var i = 0; i < pats.length; i++) {
    var m = html.match(pats[i]);
    if (m && m[1]) {
      var u = m[1].replace(/&amp;/g, '&');
      if (u.indexOf('//') === 0) { u = 'https:' + u; }
      return u;
    }
  }
  return '';
}

function buildFields(str) {
  var data;
  try { data = JSON.parse(str); } catch (err) { return []; }
  var list = Object.prototype.toString.call(data) === '[object Array]' ? data : [data];
  var e = null;
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    if (c && typeof c === 'object' && (e === null || String(c.date || '') > String(e.date || ''))) { e = c; }
  }
  if (!e) { return []; }

  var media = String(e.media_type || 'image').toLowerCase();
  var videoUrl = '';
  if (media === 'video') {
    videoUrl = pickVideoUrl(String(e.basic_html || ''));
    if (!videoUrl) { media = 'image'; }   // no playable link: show the poster image instead
  }
  var img = String(e.hdurl || e.url || '');

  var expl = clean(e.explanation)
    .replace(/^Explanation:\s*/i, '')
    .replace(/\s*Tomorrow.{0,3}s picture:.*$/i, '');
  var copy = clean(e.copyright || e.credit);

  return [clean(e.title), expl, copy, clean(e.date), media, img, videoUrl];
}

function run(argv) {
  var str = '';
  try {
    str = ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError($(argv[0]), $.NSUTF8StringEncoding, $()));
  } catch (err) {}
  return buildFields(String(str || '')).join('\n');
}
JSEOF

jsOut=$(osascript -l JavaScript -e "$jsCode" "$PWD/apod.json" 2>>/tmp/apod_output.log)

# ***************** GET JSON FIELDS ******************
{
    IFS= read -r title
    IFS= read -r explanation
    IFS= read -r copyright
    IFS= read -r date
    IFS= read -r media
    IFS= read -r hdURL
    IFS= read -r videoRaw
} <<< "$jsOut"

# Force defaults for empty / whitespace-only values
[[ -z "${title// }" ]] && title="No Title"
[[ -z "${explanation// }" ]] && explanation="No explanation available."
[[ -z "${copyright// }" ]] && copyright="Public Domain"

# Remove any remaining newlines that would break the output string
title=$(echo "$title" | tr -d '\n' | tr -d '\r')
explanation=$(echo "$explanation" | tr -d '\n' | tr -d '\r')

# Default value for media if empty
{ [ -z "$media" ] || [ "$media" = "null" ]; } && media="image"

# Debugging Log
echo "Log: $(date +"%Y-%m-%d__%H-%M-%S") | Title: $title | Media: $media" >> /tmp/apod_output.log

# ***************** IMAGE OR VIDEO? ******************
if [ "$media" = "video" ] && [ -n "$videoRaw" ]; then
    video="Video"
    lcVideo=$(printf '%s' "${videoRaw%%\?*}" | tr 'A-Z' 'a-z')
    videoRe='\.(mp4|webm|ogg)$'
    if [[ "$lcVideo" =~ $videoRe ]]; then
        videoURL="$videoRaw"                       # direct file: the widget autoplays it itself
    elif [[ "$videoRaw" == *\?* ]]; then
        videoURL="${videoRaw}&autoplay=1&mute=1"
    else
        videoURL="${videoRaw}?&autoplay=1&mute=1"
    fi
fi

# Pick usable image (checked with any ?query part removed). This also runs on video days:
# NASA's still frame is saved to images/ and used as the widget's blurred background.
chosenURL=""
lcURL=$(printf '%s' "${hdURL%%\?*}" | tr 'A-Z' 'a-z')
imgRe='\.(jpe?g|png|gif|webp)$'
if [[ "$lcURL" =~ $imgRe ]]; then
    chosenURL="$hdURL"
fi

if [ -n "$chosenURL" ]; then
    base=$(basename "${chosenURL%%\?*}")
    ImageNameU="$base"
    tmpfile="images/.apod_tmp_$base"

    # 1. CHECK CACHE
    if [ -f "images/$ImageNameU" ]; then
        echo "DEBUG: Using existing cached image: $ImageNameU" >> /tmp/apod_output.log
        newW=$(sips --getProperty pixelWidth  "images/$ImageNameU" | awk '/pixelWidth/ {print $2}')
        newH=$(sips --getProperty pixelHeight "images/$ImageNameU" | awk '/pixelHeight/ {print $2}')

    # 2. TRY DOWNLOAD
    elif curl -sS -f -L -o "$tmpfile" "$chosenURL"; then
        origW=$(sips --getProperty pixelWidth  "$tmpfile" | awk '/pixelWidth/ {print $2}')
        origH=$(sips --getProperty pixelHeight "$tmpfile" | awk '/pixelHeight/ {print $2}')

        if [ -n "$origW" ] && [ -n "$origH" ] && [ "$origW" -gt 0 ] && [ "$origH" -gt 0 ]; then
            scale=$(awk -v mw="$maxwidth" -v mh="$maxheight" -v ow="$origW" -v oh="$origH" \
                'BEGIN{sw=mw/ow; sh=mh/oh; s=(sw<sh?sw:sh); if(s>1) s=1; print s}')
            newW=$(awk -v ow="$origW" -v s="$scale" 'BEGIN{printf "%d", ow*s}')
            newH=$(awk -v oh="$origH" -v s="$scale" 'BEGIN{printf "%d", oh*s}')
        fi

        if ! sips -z "$newH" "$newW" "$tmpfile" --out "images/$ImageNameU" &>/dev/null; then
            cp "$tmpfile" "images/$ImageNameU"
            # Update dimensions from the copy if sips fails
            newW=$(sips --getProperty pixelWidth  "images/$ImageNameU" | awk '/pixelWidth/ {print $2}')
            newH=$(sips --getProperty pixelHeight "images/$ImageNameU" | awk '/pixelHeight/ {print $2}')
        fi
        rm -f "$tmpfile"

    # 3. FALLBACK
    else
        echo "DEBUG: download failed, no cache. Using user default." >> /tmp/apod_output.log
        rm -f "$tmpfile"
        ImageNameU="$apodDefault"
        # newW and newH keep the default image's size measured above
    fi
else
    echo "DEBUG: no usable image URL in JSON. Using user default." >> /tmp/apod_output.log
    ImageNameU="$apodDefault"
fi

# ***************** SINGLE-LINE OUTPUT ******************
# Ensure every variable has a value so the '++' delimiters always create exactly 9 parts.
: "${title:=No Title}"
: "${explanation:=No explanation available.}"
: "${copyright:=Public Domain}"
: "${date:=$(date +%Y-%m-%d)}"
: "${video:=false}"
: "${videoURL:=none}"
: "${ImageNameU:=$apodDefault}"
: "${newH:=0}"
: "${newW:=0}"

# ***************** FINAL ASSEMBLY ******************
output="${title}++${explanation}++${copyright}++${date}++${video}++${videoURL}++${ImageNameU}++${newH}++${newW}"

# Log the field count (should be exactly 9)
echo "DEBUG: Field count is $(echo "$output" | awk -F'\\+\\+' '{print NF}')" >> /tmp/apod_output.log

# Clean and send to React
clean_final=$(echo "$output" | tr -d '\n\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

printf "%s" "$clean_final" >&3

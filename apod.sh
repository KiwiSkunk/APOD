#!/usr/bin/env bash
export LC_ALL=C.UTF-8
set -u  # safer than allexport; avoids silent failures

# ***************** ARGUMENTS ******************
folderName=$1
maxwidth=$2
maxheight=$3
dockH=$4
apiKey=$5
apodDefault="default.png"
maxheight=$((maxheight - dockH))

# ***************** DEFAULT VALUES ******************
ImageNameU="$apodDefault"
explanation="No explanation available."
date="$(date +%Y-%m-%d)"
copyright="NASA"
title="Astronomy Picture of the Day"
video=""
videoURL=""

# image fallback sizes
newW=$(sips --getProperty pixelWidth  "$apodDefault" 2>/dev/null | awk '/pixelWidth/ {print $2}')
newH=$(sips --getProperty pixelHeight "$apodDefault" 2>/dev/null | awk '/pixelHeight/ {print $2}')

# ***************** MOVE TO WIDGET FOLDER ******************
cd "${HOME}/Library/Application Support/Übersicht/widgets/${folderName}/" || exit 0
mkdir -p images

# ***************** DOWNLOAD JSON ******************
rm -f apod.json
apodURL="https://api.nasa.gov/planetary/apod?api_key=${apiKey}"

if ! curl -sS -f -o apod.json "$apodURL"; then
   echo "DEBUG: JSON download failed" >> /tmp/apod_output.log
else

   # ***************** JSON HELPER ******************
   extract_json_value() {
       local key="$1"
       jq -r ".${key} // empty" apod.json \
           | tr '\n' ' ' \
           | sed 's/[[:space:]]\+/ /g; s/^ //; s/ $//'
   }

   # ***************** GET JSON FIELDS ******************
   hdURL=$(extract_json_value hdurl)
   URL=$(extract_json_value url)
   media=$(extract_json_value media_type)

   tmp=$(extract_json_value explanation); [ -n "$tmp" ] && explanation="$tmp"
   tmp=$(extract_json_value date);        [ -n "$tmp" ] && date="$tmp"
   tmp=$(extract_json_value copyright);   [ -n "$tmp" ] && copyright="$tmp"
   tmp=$(extract_json_value title);       [ -n "$tmp" ] && title="$tmp"

   [ -z "$media" ] && media="other"

   # ***************** IMAGE OR VIDEO? ******************
   if [ "$media" = "video" ]; then
       video="Video"
       if [ -n "$URL" ]; then
           videoURL="${URL}?&autoplay=1&mute=1"
       elif [ -n "$hdURL" ]; then
           videoURL="${hdURL}?&autoplay=1&mute=1"
       fi

   else
       # pick usable image (hdURL preferred)
       chosenURL=""
       for c in "$hdURL" "$URL"; do
           if echo "$c" | grep -qiE '\.(jpe?g|png|gif|webp)$'; then
               chosenURL="$c"
               break
           fi
       done

       if [ -n "$chosenURL" ]; then
           base=$(basename "${chosenURL%%\?*}")
           ImageNameU="$base"
           tmpfile="images/.apod_tmp_$base"

           if curl -sS -f -L -o "$tmpfile" "$chosenURL"; then
               origW=$(sips --getProperty pixelWidth  "$tmpfile" | awk '/pixelWidth/ {print $2}')
               origH=$(sips --getProperty pixelHeight "$tmpfile" | awk '/pixelHeight/ {print $2}')

               if [ -n "$origW" ] && [ -n "$origH" ] && [ "$origW" -gt 0 ] && [ "$origH" -gt 0 ]; then
                   scale=$(awk -v mw="$maxwidth" -v mh="$maxheight" -v ow="$origW" -v oh="$origH" \
                       'BEGIN{sw=mw/ow; sh=mh/oh; s=(sw<sh?sw:sh); if(s>1) s=1; print s}')
                   newW=$(awk -v ow="$origW" -v s="$scale" 'BEGIN{printf "%d", ow*s}')
                   newH=$(awk -v oh="$origH" -v s="$scale" 'BEGIN{printf "%d", oh*s}')
               fi

               # resize
               if ! sips -z "$newH" "$newW" "$tmpfile" --out "images/$ImageNameU" &>/dev/null; then
                   cp "$tmpfile" "images/$ImageNameU"
                   newW=$(sips --getProperty pixelWidth  "images/$ImageNameU" | awk '/pixelWidth/ {print $2}')
                   newH=$(sips --getProperty pixelHeight "images/$ImageNameU" | awk '/pixelHeight/ {print $2}')
               fi
           else
               echo "DEBUG: image download failed $chosenURL" >> /tmp/apod_output.log
               ImageNameU="$apodDefault"
           fi

           rm -f "$tmpfile"
       else
           ImageNameU="$apodDefault"
       fi
   fi
fi

# ***************** SINGLE-LINE OUTPUT ******************
output="${title}++${explanation}++${copyright}++${date}++${video}++${videoURL}++${ImageNameU}++${newH}++${newW}"

echo "DEBUG APOD output: $output" >> /tmp/apod_output.log
printf '%s' "$output"

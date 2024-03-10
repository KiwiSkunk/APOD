#!/usr/bin/env bash
export LC_ALL=C.UTF-8
set -o allexport

# ***************** VARIABLES PASSED ******************
folderName=$1 # path to your folder
maxwidth=$2  # your screen width
maxheight=$3 # your screen height
dockH=$4 # dock height in pixels
apikey=$5
# ***************** EXTRAS ******************
apodDefault=default.png
maxheight=$((maxheight - dockH))

# change to working directory
cd "${HOME}/Library/Application Support/Übersicht/widgets$folderName" || exit

# build download link
apodURL="https://api.nasa.gov/planetary/apod?api_key="$5

# download the 'json' text
curl ${apodURL} -o 'apod.json' -ks

# find the text for hdurl
regex0="(?:\"hdurl\":\")(.*?)(?:\")" # minor change to this would make this give groups - but groups aren't available in bash
hdurlsection="$(grep -oiE "${regex0}" apod.json)" 
# so we do more to get the required part
capture="$(cut -d ':' -f3 <<<${hdurlsection})"
IFS="\"" read -ra url <<<${capture}
hdURL="https:${url[0]}"

# find the text for url as fallback
regex0="(?:\"url\":\")(.*?)(?:\")" # minor change to this would make this give groups - but groups aren't available in bash
urlsection="$(grep -oiE "${regex0}" apod.json)" 
# so we do more to get the required part
capture="$(cut -d ':' -f3 <<<${urlsection})"
IFS="\"" read -ra hdurl <<<${capture}
hdURL="https:${url[0]}"

# find the text for url
regex1="(?:\"url\":\")(.*?)(?:\")"
urlsection="$(grep -oiE "${regex1}" apod.json)"
capture="$(cut -d ':' -f3 <<<${urlsection})"
IFS="\"" read -ra url <<<${capture}
URL="https:${url[0]}" 

# find the text for imagename
regex6="\w+\.(jpeg|png|jpg|webp|gif)"
ImageName="$(grep -oiE "${regex6}" <<<${hdURL})"
apodFull="X_${ImageName}"

# find the text for explanation
regex2="(?:\"explanation\":\")(.*?)(?:\",\")" #note the difference here
explanationsection="$(grep -oiE "${regex2}" apod.json)"
explanationTrim="$(cut -d ':' -f2-6 <<<${explanationsection})" # get everything after the first :
IFS="\"" read -ra maintext <<<${explanationTrim}
explanation=${maintext%??} # remove last two characters

# find the text for date
regex3="(?:\"date\":\")(.*?)(?:\")"
datesection="$(grep -oiE "${regex3}" apod.json)"
capture="$(cut -d ':' -f2 <<<${datesection})"
IFS="\"" read -ra date <<<${capture}

# find the text for copyright
regex4="(?:\"copyright\":\")(.*?)(?:\")"
copyrightsection="$(grep -oiE "${regex4}" apod.json)"
capture="$(cut -d ':' -f2 <<<${copyrightsection})"
IFS="\"" read -ra copyright <<<${capture}

# find the text for title
regex5="(?:\"title\":\")(.*?)(?:\",)"
titlesection="$(grep -oiE "${regex5}" apod.json)"
titleTrim="$(cut -d ':' -f2-6 <<<${titlesection})"
IFS="\"" read -ra titletext <<<${titleTrim}
title=${titletext%??} # remove last two characters


# pass data back to React
if [ ! -s apod.json ]; then
    # we could write the last output to disk and read it back but I don't see the point.
    output="APOD Image\nDisplay the image of the day on your desktop\nSkunkworks Group Ltd\n2021\n\nhttp:www.skunkworks.net.nz\n${folderName}${imageOut}" # this is nonsense but passes something back to process
else
    # lets get the image and process it...
    # if hdURL is empty use default image
    if [ "${hdURL}" = "https:" ]; then
        cp ${apodDefault} ${apodFull}
        video="Todays image is a video."
        videoURL="${URL}&autoplay=1&mute=1"
        else
        # download the image
        videoURL=""
        curl -o ${apodFull} ${hdURL} -ks
    fi

    #get the image details and assign the values
    srcW=$(sips --getProperty pixelWidth ${apodFull} | awk '/pixelWidth/ {print $2}')
    #check there is an image
    if [ "${srcW}" = "<nil>" ]; then
        ImageName="$(grep -oiE "${regex6}" <<<${URL})"
        apodFull="X_${ImageName}"
        curl -o ${apodFull} ${URL} -ks
        srcW=$(sips --getProperty pixelWidth ${apodFull} | awk '/pixelWidth/ {print $2}')
    fi

    srcH=$(sips --getProperty pixelHeight ${apodFull} | awk '/pixelHeight/ {print $2}')
    # calculate the new sizes - no integers in bash
    wdiff=$(printf "%d" "$((1000 * $maxwidth / $srcW))")
    hdiff=$(printf "%d" "$((1000 * $maxheight / $srcH))")
    newW=$maxwidth
    newH=$maxheight
    # Process fitting to screen
    if [ $wdiff -lt $hdiff ]; then
        newH=$(($srcH * $wdiff / 1000))
        newW=$(($srcW * $wdiff / 1000))
    else
        newW=$(($srcW * $hdiff / 1000))
        newH=$(($srcH * $hdiff / 1000))
    fi
    # process with sips with '&> /dev/null' to suppress warnings, errors etc
    sips -z $newH $newW ${apodFull} --out "images/${ImageName}" &> /dev/null
fi
output="${title[0]}++${explanation[0]}++${copyright[0]}++${date[0]}++${video[0]}++${videoURL}++${ImageName}++${newH}++${newW}"

echo -e "${output}"
unlink ${apodFull}

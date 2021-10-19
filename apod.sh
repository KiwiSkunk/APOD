#!/usr/bin/env bash
export LC_ALL=C.UTF-8
set -o allexport

# ***************** VARIABLES PASSED ******************
folderName=$1 # path to your folder
maxwidth=$2  # your screen width
maxheight=$3 # your screen height
dockH=$4 # dock height in pixels
colour=$5
today=$(date -v $6H +"%Y-%m-%d") # get the date for EST in the US. Edit the -17H here for the offset from EST to your timeszone. I'm 17 hours ahead so needed to subtract -17 hours. If you don't know make it -24H and it won't break anything but you'll be late to the party!
apikey=$7
imageOut=$8
# ***************** EXTRAS ******************
apodFull=apodFull.jpg
apodDefault=default.jpg

# change to working directory
cd "${HOME}/Library/Application Support/Übersicht/widgets$folderName" || exit

# build download link
apodURL="https://api.nasa.gov/planetary/apod?api_key=${apikey}&date=${today}"

# download the 'json' text
curl ${apodURL} -o 'apod.json' -ks

# find the text for hdurl
regex="(?:\"hdurl\":\")(.*?)(?:\")" # minor change to this would make this give groups - but groups aren't avalible in bash
hdurlsection="$(grep -oiE "${regex}" apod.json)" 
# so we do more to get the required part
capture="$(cut -d ':' -f3 <<<${hdurlsection})"
IFS="\"" read -ra hdurl <<<${capture}
hdURL="https:${hdurl[0]}" 

# find the text for url
regex="(?:\"url\":\")(.*?)(?:\")"
urlsection="$(grep -oiE "${regex}" apod.json)"
capture="$(cut -d ':' -f3 <<<${urlsection})"
IFS="\"" read -ra url <<<${capture}
URL="https:${url[0]}" 

# find the text for explanation
regex2="(?:\"explanation\":\")(.*?)(?:\",)" #note the differce here
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
    # we could write the last ouput to disk and read it back but I don't see the point.
    output="APOD Image\nDisplay the image of the day on your desktop\nSkunkworks Group Ltd\n2021\n\nhttp:www.skunkworks.net.nz\n${folderName}${imageOut}" # this is nonsense but passes something back to process
else
    # lets get the image and process it...
    # if hdURL is empty use default image
    if [ "${hdURL}" = "https:" ]; then
        cp ${apodDefault} ${apodFull}
        video="Todays image is a video."
        else
        # download the image
        video=""
        curl -o ${apodFull} ${hdURL} -ks
    fi
    #get the image details and assign the values
    srcW=$(sips --getProperty pixelWidth ${apodFull} | awk '/pixelWidth/ {print $2}')
    srcH=$(sips --getProperty pixelHeight ${apodFull} | awk '/pixelHeight/ {print $2}')
    # calculate the new sizes - no integers in bash
    wdiff=$(printf "%d" "$((1000 * $maxwidth / $srcW))")
    hdiff=$(printf "%d" "$((1000 * $maxheight / $srcH))")
    newW=$maxwidth
    newH=$maxheight
    # Process fitting to screen
    if [ $wdiff -lt $hdiff ]; then
        newH=$(($srcH * $wdiff / 1000))
        newH=$(($newH - $dockH))
    else
        newW=$(($srcW * $hdiff / 1000))
        newH=$(($newH - $dockH))
    fi
    # process with sips with '&> /dev/null' to suppress warnings, errors etc
    sips -z $newH $newW ${apodFull} --out ${imageOut} &> /dev/null
    sips ${imageOut} -p $maxheight $maxwidth --padColor $colour &> /dev/null
fi
output="${title[0]}++${explanation[0]}++${copyright[0]}++${date[0]}++${video[0]}++${URL}++${folderName}${imageOut}?ver=$(date)"

echo -e "${output}"
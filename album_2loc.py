""" loc_2album.py 
   Create Travel history from Google album and location history

    1 get your location history:
        - https://takeout.google.com/settings/takeout to get your location history
    2 get your album id
        - https://developers.google.com/photos/library/reference/rest/v1/mediaItems/list 
    3 get your album and save al album_name.json
        - https://developers.google.com/photos/library/reference/rest/v1/mediaItems/search
    4. run this program to create a travel_name.json with your locatoin and album photos
"""
import sys
import json
import datetime

location_path = './Takeout/Location History/Semantic Location History/'
album_json = 'albums/Camper Opaalkust Aug 2020.json'


def jos_rd(fnam):
    print(f'reading {fnam}')
    with open(fnam, encoding='utf-8') as f:
        jos = json.load(f)
    return jos


def geo_get(loc):
    if 'activitySegment' in loc:
        ll = loc['activitySegment']['startLocation']
    if 'placeVisit' in loc:
        ll = loc['placeVisit']['location']
    return {'latE7': ll['latitudeE7'], 'lngE7': ll['longitudeE7']}


def locations_rd(dat_beg, dat_end):
    # read all locations MONTHS from beg to end
    locations = []
    ym = dat_beg[:7]
    ym_to = dat_end[:7]
    # get all months
    while ym <= ym_to:
        dt = datetime.datetime.strptime(ym, '%Y-%m')
        fnam = f'{location_path}{dt.strftime("%Y")}/{dt.strftime("%Y_%B").upper()}.json'
        loc = jos_rd(fnam)
        locations.extend(loc.get('timelineObjects', []))
        y = int(ym[:4])
        m = int(ym[5:7]) + 1
        if m > 12:
            m = 1
            y = y + 1
        ym = f'{y:04d}-{m:02d}'
    return locations


def photo_add(loc, photos):
    if 'photos' not in loc:
        loc['photos'] = []
    photos[0]['geo'] = geo_get(loc)
    loc['photos'].extend(photos)


def locations_2photos(dat_beg, dat_end, locations, photos):
    # filter only dates from begin to end, and photos to location
    photo_dates = list(photos.keys()) 
    for loc in list(locations):
        duration = loc.get('activitySegment', loc.get('placeVisit'))['duration']
        beg = duration['startTimestamp'][:19]
        if not (dat_beg <= beg < dat_end):
            locations.remove(loc)
            continue
        end = duration['endTimestamp'][:19]
        for dat in list(photo_dates):
            if beg <= dat <= end:
                photo_add(loc, photos[dat])
                photo_dates.remove(dat)
    # add not located photos to begin or end
    for dat in photo_dates:
        loc = locations[-1] # add to the end
        if dat < beg:
            loc = locations[0]  # add in begin
        photo_add(loc, photos[dat])
    return locations, photos


def album_rd(fnam):
    # read photo album
    photos = {}
    dat_beg = '9999-12-31T23:59:59'
    dat_end = ''
    album = jos_rd(fnam)
    for photo in album.get('mediaItems', []):
        dat = photo.get('mediaMetadata', {}).get('creationTime')[:19]
        if dat is None:
            continue
        if dat > dat_end:
            dat_end = dat
        if dat < dat_beg:
            dat_beg = dat
        if dat in photos:
            photos[dat].extend(photo)
        else:
            photos[dat]= [photo]
    print(f'Trip from {dat_beg} to {dat_end}')
    # read locations adn add photos
    locations = locations_rd(dat_beg, dat_end)
    locations, photos = locations_2photos(dat_beg, dat_end, locations, photos)
    return locations, photos


"""-----------------------------------------------------------------------    
    M A I N
------------------------------------------------------------------------"""
if __name__ == '__main__':        # Run from command line
    if len(sys.argv) > 1:
        album_json = sys.argv[1]
    locations, photos = album_rd(album_json)
    with open('photos.json', 'w') as f:
        json.dump(photos, f, indent=2)
    with open('locations.json', 'w') as f:
        json.dump(locations, f, indent=2)


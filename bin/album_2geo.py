""" loc_2album.py

    Create Travel history from Google album and location history

    - First takout your google location history:
        - https://takeout.google.com/settings/takeout to get your location history
    - Create app https://console.cloud.google.com/
        - save credentials in client_secret.json
    - run this program with your album name (Case Sensitive)
        - finds the closed datetime of location.timelineObjects and set it into your album photos
    - Creates a json file: geo_album_name.json
        - with geo: {latE7, lngE7} added into your photo mediaItems
        - and timelineObjects from your location history
    - Creates a list of your geo_albums.json
"""

import json
import datetime

location_path = ''

def json_rd(fnam, default={}):
    jos = default
    try:
        print(f'reading {fnam}')
        with open(fnam, encoding='utf-8') as f:
            jos = json.load(f)
    except Exception as e:
        print(e)
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
        fnam = f'{location_path}/{dt.strftime("%Y")}/{dt.strftime("%Y_%B").upper()}.json'
        loc = json_rd(fnam)
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
        if locations:
            loc = locations[-1] # add to the end
            if dat < beg:
                loc = locations[0]  # add in begin
            photo_add(loc, photos[dat])
    return locations


def album_geo(album, date_range=None):
    ''' read photo album update with geo location
        date_range = 2022-12-01T00:00:00,2022-12-31-T23:59:59
    '''
    photos = {}
    dat_beg = '9999-12-31T23:59:59'
    dat_end = ''
    if date_range:
        date_range = [x.strip() for x in date_range.split(',')]
    for photo in album.get('mediaItems', []):
        dat = photo.get('mediaMetadata', {}).get('creationTime')[:19]
        if dat is None:
            continue
        if date_range and (dat < date_range[0] or dat > date_range[1]):
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
    # read locations and add photos
    locations = locations_rd(dat_beg, dat_end)
    locations = locations_2photos(dat_beg, dat_end, locations, photos)
    album.update({'timelineObjects': locations})
    return album


def album_from_google(album_name, client_secret):
    import gapp
    gapp.init(client_secret, ['https://www.googleapis.com/auth/photoslibrary.readonly'], 'photoslibrary')
    album = gapp.album_rd(album_name)
    return album


"""-----------------------------------------------------------------------    
    M A I N
------------------------------------------------------------------------"""
if __name__ == '__main__':        # Run from command line
    import os
    import sys
    import argparse
    parser = argparse.ArgumentParser(prog='album_2geo')
    parser.add_argument('--album_name', '-a', help='album name (Case Sensitive)', default=None)
    parser.add_argument("--location_path", '-l',
                        default='./Takeout/Location History/Semantic Location History/',
                        help='path to your Location history directory '
                             'example: ./Takeout/Location History/Semantic Location History')
    parser.add_argument('--client_secret', '-c', help='path to client_secret.json', default='./client_secret.json')
    parser.add_argument('--date_range', '-d',
                        help='restirct between dates example: '
                             '"2022-12-01T00:00:00,2022-12-31-T23:59:59"''', default=None)

    args = parser.parse_args()
    location_path = args.location_path.rstrip('/')
    if not os.path.exists(location_path):
        print(f'{location_path} does not exist')
        sys.exit()
    album_name = args.album_name
    if not album_name:
        album_name = input('album name: ')
    album_json = f'{album_name}.json'
    album = json_rd(album_json)
    if not album:
        print(f"reading album '{album_name}' from google photos")
        album = album_from_google(album_name, args.client_secret)
    if album:
        geo_album = album_geo(album, args.date_range)
        fnam = f'geo_{album_json}'
        with open(fnam, 'w') as f:
            json.dump(geo_album, f, indent=2)
        album_list = json_rd('geo_albums.json', {'albums':[]})
        album_list['albums'].append({"id": album['id'], "title": album_name, "json": fnam})
        with open('geo_albums.json', 'w') as f:
            json.dump(album_list, f, indent=2)
    else:
        print(f"album '{album_name}' not found")

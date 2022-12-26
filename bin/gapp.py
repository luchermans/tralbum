""" gapp.py
    google app service
     to read album from google photos
"""

import json
import os.path
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

glib = None     # google library service

def init(cred_json, scopes, library):
    global glib
    # google initialisation
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists('gapp_token.json'):
        creds = Credentials.from_authorized_user_file('gapp_token.json', scopes)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(cred_json, scopes)
            creds = flow.run_local_server(port=0)
      # Save the credentials for the next run
        with open('gapp_token.json', 'w') as token:
            token.write(creds.to_json())

    glib = build(library, 'v1', credentials=creds, static_discovery=False)
    return glib


def album_find(album_name):
    albums = []
    pars = {'pageSize': 10}
    while 1:
        r = glib.albums().list(**pars).execute()
        for album in r.get('albums', []):
            print(album['title'])
            if album['title'] == album_name:
                return [album]
        if 'nextPageToken' in r:
            pars['pageToken'] = r['nextPageToken']
        else:
            break
    return albums


def album_get(id):
    pars = {'albumId': id, 'pageSize': 50}
    items = []
    while 1:
        r = glib.mediaItems().search(body=pars).execute()
        # The default number of media items to return at a time is 25. The maximum pageSize is 100.
        items.extend(r.get('mediaItems', []))
        if 'nextPageToken' in r:
            pars['pageToken'] = r['nextPageToken']
        else:
            break
    return items


def album_rd(name):
    albums = album_find(name)
    if albums:
        album = albums[0]
        items = album_get(albums[0]['id'])
        album['mediaItems'] = items
        return album
    return {}


"""-----------------------------------------------------------------------    
    M A I N
------------------------------------------------------------------------"""
if __name__ == '__main__':        # Run from command line
    import sys
    if len(sys.argv) > 1:
        album_name = sys.argv[1]
    else:
        album_name = input('album name: ')
    # Set up the Google Photos API client
    init('client_secret.json',
                     ['https://www.googleapis.com/auth/photoslibrary.readonly'],
                     'photoslibrary')
    # read and save the album
    album = album_rd(album_name)
    if album:
        fnam = f"{album['title']}.json"
        with open(fnam, 'w') as f:
            json.dump(album, f, indent=2)
        print(f'album safed in {fnam}')
    else:
        print(f"album '{album_name}' not found")

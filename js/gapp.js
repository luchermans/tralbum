/* Google api auth */

/* see sectret.js contians
const CLIENT_ID = 'Your google client id';
const API_KEY = 'Your api key';
*/

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/photoslibrary.readonly';
let tokenClient;
let gapiInited = false;
let gisInited = false;

// Callback after api.js is loaded.
function gapiLoaded() {gapi.load('client', initializeGapiClient);}
// Callback after the API client is loaded. Loads the discovery doc to initialize the API.
async function initializeGapiClient() {
    await gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: [DISCOVERY_DOC],
    });
    gapp.log('gapi_init');
    gapiInited = true;
    maybeEnableButtons();
}
//  Callback after Google Identity Services are loaded
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: '', // defined later
    });
    gapp.log('gapi_loaded');
    gisInited = true;
    maybeEnableButtons();
}

// Enables user interaction after all libraries are loaded.
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
      gapp_auth_btn.style.visibility = 'visible';
    }
}
// Sign in the user upon button click.
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
      if (resp.error !== undefined) {
        throw (resp);
      }
      gapp_signout_btn.style.visibility = 'visible';
      gapp_auth_btn.innerText = 'Refresh';
      await gapp.do_gapi();
    };
    if (gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
      tokenClient.requestAccessToken({prompt: ''});
    }
}
// Sign out the user upon button click.
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
      google.accounts.oauth2.revoke(token.access_token);
      gapi.client.setToken('');
      gapp_auth_btn.innerText = 'Authorize';
      gapp_signout_btn.style.visibility = 'hidden';
    }
}

var gapp = {
init() {
    gapp_status = document.getElementById('gapp_status');
    gapp_auth_btn = document.getElementById('gapp_auth_btn');
    gapp_signout_btn = document.getElementById('gapp_signout_btn');
    gapp_auth_btn.style.visibility = 'hidden';
    gapp_signout_btn.style.visibility = 'hidden';
},
log(...txt) {
    console.log(...txt);
    gapp_status.innerText = txt;
},
log_add(s) {
    gapp_status.innerText += s;
},
// get file from google drive
async file_get(fnam) {
    var data = null, r;
    try {
        r = await gapi.client.drive.files.list({
            fields: 'files(id)', 
            q: "name='"+fnam+"'",
        });
        id = r.result.files[0].id;
        gapp.log('drive_get: '+fnam+' id:', id);
        r = await gapi.client.drive.files.get({
            fileId : id,
            alt: 'media'
        });
        gapp.log('file_get:', r);
        data = r.result;
        gapp.log('data:', data);
    } catch (e) {
      gapp.log('file_get ERR:', e);
    }
    return data;
},
/* call google api request using pars
    key = result list e.g. albums mediaItems
    if foundfie(r) returns true return loop
    examples: 
        rslt = await greq('albums', {
            path: 'https://photoslibrary.googleapis.com/v1/albums',
            pageSize : 25
        }, find_album_title);
        rlst = await greq('mediaItems', {
            path: 'https://photoslibrary.googleapis.com/v1/mediaItems:search',
            body: {albumId : id},
            pageSize : 50,  
            method: 'POST'
        });
*/
async req(key, pars, foundfie) {
    var res = {}, r;
    res[key] = [];
    path = pars.path;
    //gapp.log('req_pars', pars);
    //gapp.log('foundfie', foundfie);
    gapp.log(key+": ");
    while (true) {
        gapp.log_add('.');
        r = await gapi.client.request(pars);
        res[key].push(...r['result'][key]);
        if (foundfie) {
            res['foundfie'] = foundfie(r['result']);
            if (res['foundfie'])  break;
        }
        if (Object.hasOwn(r['result'], 'nextPageToken')) {
            if (Object.hasOwn(pars, 'body'))
                pars['body']['pageToken'] = r['result']['nextPageToken'];
            else
                pars['params']['pageToken'] = r['result']['nextPageToken'];
        }
        else break;
    }
    return res;
},
// find album_name in result, return the album ID
album_fnd(r) {
    gapp.log('fnd', gapp.album_name);
    for (const v of r.albums) {
        if (v.title == gapp.album_name) {
            id = v.id;
            gapp.log('found: ', v.title);
            return id;
        }
    }
    return 0;
},
async album_by_id(id) {
    var r = null;
    try {
        r = await gapp.req('mediaItems', {
            path: 'https://photoslibrary.googleapis.com/v1/mediaItems:search',
            body: {albumId : id, pageSize : 50},
            method: 'POST'
        });
        //gapp.log('mediaItems:', r);
        gapp.log('album_by_id: '+ id , r);
    } catch (e) {
      gapp.log('album ERR:', e);
    }
    return r;
},
// read google album by name
async album_id_by_name(album_name) {
    gapp.album_name = album_name;
    var r, id=0;
    gapp.log('find', album_name);
    try {
        r = await gapp.req('albums', {
            path: 'https://photoslibrary.googleapis.com/v1/albums',
            params: {pageSize : 25}
        }, gapp.album_fnd);
        gapp.log('albums_by_name:' + album_name, r);
        id = r.foundfie;
        return id;
    } catch (e) {
      gapp.log('album_by_name ERR:', e);
    }
    return id;
},
async do_gapi() {
    id = await gapp.album_id_by_name('Camper Opaalkust Aug 2020');
    data = await gapp.album_by_id(id)
}}

gapp.init();

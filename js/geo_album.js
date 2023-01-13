gapp.do_gapi = album_list;
var album_status = document.getElementById('album_status');

async function album_list() {
    // read geo_albums.json from google drive
    var r, lst;
    album_status.innerHTML = 'Loading albums ...';
    r = await gapp.file_get('geo_albums.json')
    lst = '';
    r.albums.forEach(function(itm) {
        lst += '<li onclick="album_load(\'' + itm.id + '\',\''+itm.json +'\')">' + itm.title + '</li>';
    });
    document.getElementById('album_list').innerHTML = lst;
    album_status.innerHTML = 'Select an albums';
}

async function album_load(album_id, album_file) {
    // read selected geo_album from google drive
    album_status.innerHTML = 'Loading album '+ album_file + ' from google drive ...';
    console.log('load_album', album_file);
    geo_album = await gapp.file_get(album_file);
    console.log('geo_album', geo_album);
    album_status.innerHTML = 'Loading album from google photos ...';
    goo_album = await gapp.album_by_id(album_id);
    console.log('goo_album', goo_album);
    // update geo_album.baseUrl with google album
    album_status.innerHTML = 'Update photos baesUrl ...';
    goobum = {};    // build object with mediaItem.id
    goo_album.mediaItems.forEach(function(itm) {
        goobum[itm.id] = itm;
    });
    console.log('goobuum', goobum);
    // replace baseUrl in mediaItems
    geo_album.mediaItems.forEach(function(itm) {
        if (Object.hasOwn(goobum, itm.id))
            itm.baseUrl = goobum[itm.id].baseUrl;
    });
    // replace baseUrl in timelineObjects.photos
    geo_album.timelineObjects.forEach(function(itm) {
        if (Object.hasOwn(itm, 'photos')) {
            itm.photos.forEach(function(photo) {
                if (Object.hasOwn(goobum, photo.id)) {
                    photo.baseUrl = goobum[photo.id].baseUrl;
                }
            });
        }
    });
    album_status.innerHTML = 'Album load complete';
    places_load(geo_album);
    album_status.innerHTML = 'Initialize Google Map';
    initMap();
    album_status.innerHTML = 'Goto Map';
    nav.menu_set('Home');
}

var photos, my_places;
var red = 'img/red.png';
var gray = 'img/gray.png';
waypoint = 'img/pixel.png';
var my_places = [[{lat: 50.50873117095947, lng: 5.9559872476669415}, 'Cascade', gray, null]];
var markers = [];

function places_load(geo_album) {
    var photos;
    markers_clr();
    console.log('lok', geo_album);
    for (const [k, v] of Object.entries(geo_album.timelineObjects)) {
        try {
            photos = null;
            if ('photos' in v) {
                photos = v.photos;
            }
            if ('placeVisit' in v) {
                my_places.push([{
                    lat: v.placeVisit.centerLatE7 / 10000000,
                    lng: v.placeVisit.centerLngE7 / 10000000
                },
                    v.placeVisit.location.name + ': ' + v.placeVisit.duration.startTimestamp,
                    red, photos
                ]);
            } else if ('activitySegment' in v) {
                my_places.push([{
                    lat: v.activitySegment.startLocation.latitudeE7 / 10000000,
                    lng: v.activitySegment.startLocation.longitudeE7 / 10000000
                },
                    v.activitySegment.duration.startTimestamp,
                    gray, photos
                ]);
                my_places.push([{
                    lat: v.activitySegment.endLocation.latitudeE7 / 10000000,
                    lng: v.activitySegment.endLocation.longitudeE7 / 10000000
                },
                    v.activitySegment.duration.startTimestamp,
                    gray, null
                ]);
                if ('waypointPath' in v.activitySegment) {
                    v.activitySegment.waypointPath.waypoints.forEach(function (wp, i) {
                        my_places.push([{
                            lat: wp.latE7 / 10000000,
                            lng: wp.lngE7 / 10000000
                        },
                            ,   //no titel
                            waypoint, null
                        ]);
                    });
                }
            }
        } catch (err) {
            console.log(err);
        }
    }
    console.log('my_places', my_places);
}

function markers_clr() {
    console.log('markers', markers)
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];
    my_places = [];
}


// Initialize and add the map
function initMap() {
    console.log('places', my_places);
    const start_place = my_places[0][0];
    const map = new google.maps.Map(document.getElementById('map'), {
        zoom: 9, center: start_place,
    });
    // Create an info window to share between markers.
    const infoWindow = new google.maps.InfoWindow();
    tourPathCoordinates = [];
    // Create the markers.
    my_places.forEach(([position, title, ico, photos], i) => {
        tourPathCoordinates.push(position);
        mrk = {
            position,
            map,
            title: `${i}. ${title}`,
            label: `${i}`,
            optimized: false,
            icon: ico,
        };
        if (photos) delete mrk.icon;
        const marker = new google.maps.Marker(mrk);
        markers.push(marker);
        // Add a click listener for each marker, and set up the info window.
        marker.addListener('click', () => {
            infoWindow.close();
            content = marker.getTitle();
            if (photos) {
                photos.forEach(function(photo) {
                    content += '<br><a href="' + photo.productUrl +'" target="photos.google.com">';
                    content += '<img src="' + photo.baseUrl + '"></a>';
                    //content += '<img src="' + gimg + '"></a>';
                });
            }
            infoWindow.setContent(content);
            infoWindow.open(marker.getMap(), marker);
        });
    });

    tourPath = new google.maps.Polyline({
        path: tourPathCoordinates,
        geodesic: true,
        strokeColor: '#202020',
        strokeOpacity: 0.4,
        strokeWeight: 2
    });
    tourPath.setMap(map);
}

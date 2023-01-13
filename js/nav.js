/* simple navigation
Usage:
<head>
  <link rel='stylesheet' href='css/nav.css'>
  <script src='js/nav.js'></script>
</head>
<body>
    <div class='topnav'>
      <a href='#home' class='active' id='title' onclick='nav.menu_set()'>App name</a>
      <div id='menus'></div>
      <a href='javascript:void(0);' class='icon' onclick='nav.toggle()'><i class='fa fa-bars'></i></a>
    </div>
    <div class='divnav' id='Home'>Home code here</div>
    <div class='divnav' id='Settings'>Settings comes here</div>
    <div class='divnav' id='About'>About comes here</div>
    <script>nav.init(['Home', 'Settings', 'Help']);</script>
</body>
*/
var nav = {}
nav.menus = [];

function gEl(e) {return document.getElementById(e)}

nav.toggle = function() {
  var x = gEl('menus');
  x.style.display = (x.style.display === 'block') ? 'none' : 'block';
}

nav.init = function(app_title, menus) {
    var x, lnk, gr_active;
    var loc = '' + location;
    x = home = '';
    nav.title = app_title;
    nav.menus = menus;
    for (var i=0; i<nav.menus.length; ++i) {
        gr = nav.menus[i];
      lnk = "<a href='#" + gr + "' onclick='nav.menu_set(\"" + gr +"\")'>";
      x += lnk + gr + '</a>';
      home += lnk + "<div class='btn'>" + gr + "</div></a>";
      if (loc.indexOf('#'+gr) >=0)
        gr_active = gr;
    }
    gEl('menus').innerHTML = x;
    nav.menu_set(gr_active);
}

nav.menu_set = function(gr) {
  if (gr == null) gr = 'Home';
  gEl('title').innerHTML = nav.title + '.' + gr;
  gEl('menus').style.display = 'none';
  for (var i=0; i<nav.menus.length; ++i) {
    if (nav.menus[i] != gr)    gEl(nav.menus[i]).style.display = 'none';
  }
  gEl(gr).style.display = 'block';
}

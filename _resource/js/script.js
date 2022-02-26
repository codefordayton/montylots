require('leaflet-sidebar-v2');
require('leaflet.awesome-markers');
require('leaflet.markercluster');

var $ = require('jquery');
require('typeahead.js');


var redlineIsShown = false;
import { redlinePopup, redlineLayer } from './redline.js';

L.Icon.Default.imagePath = 'img/icon/';

// Satellite Layer
const sat_layer = new L.tileLayer('//server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.png', {
    maxZoom: 18,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

// OSM Layer
const osm_layer = new L.tileLayer('//{s}.tile.osm.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="//osm.org/copyright">OpenStreetMap</a> contributors, Points &copy 2012 LINZ'
});

const lat = 39.7589;
const lng = -84.1916;

//MAP
const map = L.map('map', {
  center: [lat, lng],
  zoom: 12,
  zoomControl: false,
  layers: [osm_layer]
});

const Map_BaseLayer = {
  "Satellite": sat_layer,
  "Street Map": osm_layer
};

L.control.layers(Map_BaseLayer, null).addTo(map);
L.control.scale({metric: false, imperial: true, maxWidth: 300}).addTo(map);
L.control.zoom({position: 'topright'}).addTo(map);

// SIDEBAR
var sidebar = L.control.sidebar({
  autopan: false,
  closeButton: true,
  container: 'sidebar',
  position: 'left',
}).addTo(map);

sidebar.open('home');

// ADD LAYERS
//redlineLayer.addTo(map);

// REAPS
var allMarkers = [];
var markerSearch = [];
var markers;
var onlyNew = false;
var reaps = {};

 /// typeahead helper
  function substringMatcher(strs) {
    return function findMatches(q, cb) {
      var matches, substrRegex;
      // an array that will be populated with substring matches
      matches = [];

      // regex used to determine if a string contains the substring `q`
      substrRegex = new RegExp(q, 'i');

      // iterate through the pool of strings and for any string that
      // contains the substring `q`, add it to the `matches` array

      // Practically clearing the previous search results
      // Does using .map change the performance?
      for (var i = 0; i < allMarkers.length; i++) {
        allMarkers[i].found = false;
      }

      $.each(strs, function(i, str) {
        if (substrRegex.test(str)) {
          allMarkers[i % allMarkers.length].found = true;
          matches.push({ value: str });
        }
      });

      setMarkers();
      cb(matches);
    };
  };

  /* Highlight search box text on click */
  $("#addressInput").click(function () {
    $(this).select();
  });

  /* Prevent hitting enter from refreshing the page */
  $("#addressInput").keypress(function (e) {
    if (e.which == 13) {
      e.preventDefault();
    }
  });

  $("#addressInput").on('typeahead:selected', function(evt, item) {
    // User selected a text from the search results box
    // We need to update the map with the markers matching exactly that text
    // If there's only one result, we will select that property
    // This is going to be a subset of all the markers on the map,
    //    however Leaflet update efficiency should be considered.

    var value = item.value;
    // Clearing the previous search results and searching for the selected marker(s)
    for (var i = 0; i < allMarkers.length; i++) {
      allMarkers[i].found = false;
      if (allMarkers[i].pid === value || allMarkers[i].address === value) allMarkers[i].found = true;
    }

    // Let's update the markers on the map to selected markers
    // This will also select the marker if there's only one result
    setMarkers();
  });

  function generateTreasurersLink(pid){
    return 'https://www.mcohio.org/government/elected_officials/treasurer/mctreas/master.cfm?parid=' + pid.replace(/ /g, '%20') + '&taxyr=2021&own1=SMITH';
  };

  /// Lookup based on typeahead and updating right bar
  function selectedProperty(address,pid, claimed) {
    $('#selectedAddress').text(address);
    $('#selectedParcelId').text(pid);
    $('#linkToTreasuresSite').html("<a href=\""
      + generateTreasurersLink(pid)
      + "\" target=\"_blank\">View Property on Treasurer's Site</a>");
  }

function popup(street, parcel) {
  var returnStr = '<p>' + street + '</p>';
  returnStr += '<p>' + parcel + '</p>';
  return returnStr;
}

function initMarkers() {
  var blueMarker = L.AwesomeMarkers.icon({
    icon: 'home',
    markerColor: 'blue',
    prefix: 'fa'
  });

  var lotMarker = L.AwesomeMarkers.icon({
    icon: 'leaf',
    markerColor: 'blue',
    prefix: 'fa'
  });

  // points object is loaded from the data file
  for (var i = 0; i < reaps.points.length; i++) {
    var a = reaps.points[i];
    var title = a.st;
    var icon = blueMarker;
    if (a.lot)
      icon = lotMarker;

    var marker = L.marker(L.latLng(parseFloat(a.lat), parseFloat(a.lon)), { title: title, icon: icon });

    marker.address = a.st;
    marker.pid = a.pid;
    marker.claimed = a.claimed;
    marker.new = a.new;
    marker.found = true; // Helper attribute for the search function.

    marker.on('click', function(e) {
      selectedProperty(e.target.address, e.target.pid, e.target.claimed);
    });
    marker.bindPopup(popup(title, a.pid));
    allMarkers.push(marker);
  }
  // markerSearch array contains the search terms
  // Its size should be kept as multiples of allMarkers.length
  for (var i = 0; i < allMarkers.length; i++) {
    markerSearch.push(allMarkers[i].pid);
  }
  for (var i = 0; i < allMarkers.length; i++) {
    markerSearch.push(allMarkers[i].address);
  }

  markers = L.markerClusterGroup({
    chunkedLoading: true,
    chunkInterval: 20,
    chunkDelay: 50
  });

  markers.addLayers(allMarkers);
  map.addLayer(markers);
}

  function setMarkers() {
    // Original design calls for putting all the markers back if there's nothing found during the search
    // This feature is removed due to search slugishness

    // Let's find all the found markers, filtering for newness if necessary
    var foundMarkers = [];
    for (var i = 0; i < allMarkers.length; i++) {
      if (allMarkers[i].found &&
           (!onlyNew || (onlyNew && allMarkers[i].new))) {
        foundMarkers.push(allMarkers[i]);
      }
    }
    // Let's not update the map if we found all markers in the search and they are already on the map
    if (foundMarkers.length === allMarkers.length && markers.getLayers().length === allMarkers.length) return;

    // Marker attributes such as .claim and .new can be used here to filter search results.

    // Leaflet says it's more efficient to remove all the markers and then insert the new ones.
    markers.clearLayers();
    markers.addLayers(foundMarkers);

    // Let's select the marker if there's only one of them is found
    if (foundMarkers.length === 1 ) {
      selectedProperty(foundMarkers[0].address, foundMarkers[0].pid, foundMarkers[0].claimed);
    }
  }


$("document").ready(function() {
  document.getElementsByTagName("html")[0].style.visibility = "visible";

  import(/* webpackChunkName: "reaps" */ '../reaps.json').then(module => {
    reaps = module.default;
    initMarkers();

    $("#addressInput").typeahead({
      minLength: 0,
      highlight: true,
      hint: false
    }, {
      name: "AllMarkers",
      displayKey: "value",
      source: substringMatcher(markerSearch),
      limit: 15,
      templates: {
        empty: '<div class="empty-message">No matching properties found.</div>'
      }
    });

    $('#last_update').text((new Date(reaps.lastupdated)).toLocaleDateString());


    $('#showhideRedline').click(() => {
      if (redlineIsShown) redlineLayer.remove();
      else map.addLayer(redlineLayer);
      redlineIsShown = !redlineIsShown;
    });
  });
});


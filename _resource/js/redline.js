var esri = require('esri-leaflet');

// REDLINE LAYER
function redlinePopup(feature) {
  var title = '';
  var body = '';
  switch(feature.properties.HOLC_grade) {
    case 'A':
      title = 'Grade <span class="holcgreen">A</span>: Best';
      body = 'Always upper- or upper-middle class White neighborhoods that HOLC defined as posing minimal risk for banks and other mortgage lenders as they were "ethnically homogeneous" and had room to be further developed.';
      break;
    case 'B':
      title = 'Grade <span class="holcblue">B</span>: Still Desirable';
      body = 'Generally nearly or completely White, U.S.-born neighborhoods that HOLC defined as "still desirable" as sound investments for mortgage lenders';
      break;
    case 'C':
      title = 'Grade <span class="holcyellow">C</span>: Declining';
      body = 'Areas where the residents were often working-class and/or first or second generation immigrants from Europe. These areas often lacked utilities and were characterized by older building stock.'
      break;
    case 'D':
      title = 'Grade <span class="holcred">D</span>: Hazardous';
      body = 'Areas often received this grade because they were "infiltrated" with "undesirable populations" such as Jewish, Asian, Mexican, and Black families. These areas were more likely to be close to industrial areas and to have older housing';
      break;
  }
  return `<div class='popuptitle'>${title}</div><div class='popupbody'>${body}</div>`;
}

const redlineLayer = new esri.featureLayer({
  url: 'https://services.arcgis.com/jIL9msH9OI208GCb/arcgis/rest/services/HOLC_Neighborhood_Redlining/FeatureServer/0',
  where: "City='Dayton'",
  onEachFeature: function(feature, layer) {
    if (feature.properties && feature.properties.HOLC_grade) {
        layer.bindPopup(redlinePopup(feature));
    }
  },
  style: function(feature) {
    switch(feature.properties.HOLC_grade) {
      case 'A': return {color: '#76cd4b'};
      case 'B': return {color: '#0070ff'};
      case 'C': return {color: '#ffde3e'};
      case 'D': return {color: '#bf1313'};
    }
  }
});

export { redlinePopup, redlineLayer };

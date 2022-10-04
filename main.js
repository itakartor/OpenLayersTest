import './style.css';
import { Map, View } from 'ol';
import Map from 'ol/Map';
import OSM from 'ol/source/OSM';
import { GeoJSON } from 'ol/format';
import 'ol/ol.css';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import Overlay from 'ol/Overlay';
import { fromLonLat, toLonLat } from 'ol/proj';
import { Attribution, defaults as defaultControls, FullScreen, OverviewMap } from 'ol/control';
import { Stroke, Style } from 'ol/style';
import { Fill } from 'ol/style';
import { Text } from 'ol/style';
import TileWMS from 'ol/source/TileWMS.js';
import TileLayer from 'ol/layer/Tile';
import MousePosition from 'ol/control/MousePosition';
import {createStringXY} from 'ol/coordinate';
import { AgenziaDTO } from './dto/agenziaDTO';

// prova sulla selezione delle zone a seconda di un parametro inserito dall'utente
const selectedStyle = new Style({
    fill: new Fill({
      color: 'rgba(255, 255, 255, 0.6)',
    }),
    stroke: new Stroke({
      color: 'rgba(255, 255, 255, 0.7)',
      width: 2,
    }),
});

// microservizio che ottiene le informazioni di tutti i cap coperti da un agenzia
// poi il sistema evidenzia tutte le aree definite dai cap

const queryInput = document.getElementById('epsg-query');
let lastIdSearch = '';
const searchButton = document.getElementById('epsg-search');
const resetButton = document.getElementById('reset-search');

var agenziaMilano1 = new AgenziaDTO();
agenziaMilano1.id = '1';
agenziaMilano1.listIdCap = ['20144','20143','20128','20162'];
agenziaMilano1.nome = 'agenzia Milano 1';

var agenziaMilano2 = new AgenziaDTO();
agenziaMilano2.id = '2';
agenziaMilano2.listIdCap = ['20145','20146','20127','20161'];
agenziaMilano2.nome = 'agenzia Milano 2';
var listAge = ['1','2'];

searchButton.onclick = function (event) {
    lastIdSearch = queryInput.value;
    search(lastIdSearch);
    queryInput.value = '';
    // event.preventDefault();
};
resetButton.onclick = function() {
    if(lastIdSearch != '') {
        reset(lastIdSearch);
        lastIdSearch = '';
    }
};
// controllo posizione del mouse 
const mousePositionControl = new MousePosition({
    coordinateFormat: createStringXY(4),
    projection: 'EPSG:3A4326',
    // comment the following two lines to have the mouse position
    // be placed within the map.
    className: 'custom-mouse-position',
    target: document.getElementById('mouse-position'),
  });

const attribution = new Attribution({
    collapsible: false,
});

// creo lo style per l'etichetta da inserire sull'area geografica
const createStyleText = function getLabel(feature) {

    const font = 'bold 12px/1 Aria';
    const text = new Text({
        textAlign: "center",
        textBaseline: "middle",
        font: font,
        // campo da recuperare in questo caso il cap
        text: feature.get('cap'),
        fill: new Fill({ color: 'black' }),
        // bordo
        stroke: new Stroke({ color: '#ffffff', width: 3 }),
        offsetX: "0",
        offsetY: "0",
        placement: 'Point',
        // 45°
        maxAngle: '0.785398164',
        overflow: "false",
        // 0°
        rotation: '0',
    });

    //console.log("🚀 ~ file: main.js ~ line 25 ~ createStyleText ~ text", text)
    return text;
};

// assegno un colore all'area geografica a seconda delle necessità 
function getColorForPeople(feature) {
    // calcolo della densità di abitazioni 
    const people = feature.get('abitazioni');
    const shape_area = feature.get('shape_area');
    const peopleDensity = people / shape_area / 1000000;
    // console.log("🚀 ~ file: main.js ~ line 46 ~ getColorForPeople ~ peopleDensity", peopleDensity);
    let color = 'rgba(0,0,0,1)';
    if (peopleDensity > 80) {
        color = 'rgba(255,0,0,1)';
    } else if (peopleDensity > 40) {
        color = 'rgba(255,0,0,0.5)';
    } else {
        color = 'rgba(255,0,0,0.1)';
    }
    return color;
}

function getColorForPeopleForSelect(feature) {
    // calcolo della densità di abitazioni 
    const people = feature.get('abitazioni');
    const shape_area = feature.get('shape_area');
    const peopleDensity = people / shape_area / 1000000;
    // console.log("🚀 ~ file: main.js ~ line 46 ~ getColorForPeople ~ peopleDensity", peopleDensity);
    let color = 'rgba(0,0,0,1)';
    if (peopleDensity > 80) {
        color = 'rgba(0,255,0,1)';
    } else if (peopleDensity > 40) {
        color = 'rgba(0,255,0,0.5)';
    } else {
        color = 'rgba(0,255,0,0.1)';
    }
    return color;
}

function getStrokeStyke() {
    var stroke = new Stroke({
        color: 'blue',
        width: 1,
    });
    return stroke;
}



// creazione dello stile dell'area geografica
function polygonStyleFunction(feature) {
    return new Style({
        stroke: getStrokeStyke(),
        fill: new Fill({
            color: getColorForPeople(feature), //feature.get('cap') > 20140 ? 'red' : 'green',
        }),
        text: createStyleText(feature),
    });
}
// sorgente di prova del cappario SOLO di Milano
const vectorSourceCapMilano = new VectorSource({
    format: new GeoJSON(),
    url: 'http://localhost:8600/geoserver/coperture/wms?service=WMS&version=1.1.0&request=GetMap&layers=coperture%3ACAPZONE_Milano&bbox=9.04070999600015%2C45.3866999930001%2C9.27801999400009%2C45.535829993&width=768&height=482&srs=EPSG%3A4326&format=geojson' 
    //'http://localhost:8600/geoserver/coperture/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=coperture%3ACAPZONE_Milano&maxFeatures=50&outputFormat=application%2Fjson'
});


// vectorLayer del cap di Milano di prova 
const vectorLayerCapMilano = new VectorLayer({
    source: vectorSourceCapMilano,
    style: polygonStyleFunction,
});

// sorgente di prova locale con generazione manuale di GeoJson da shapefile
const vectorSourceProvaLocaleMilano = new VectorSource({
    url: "layers/banchedati-cap-zone-demo-database.zip.geojson",
    format: new GeoJSON()
});


// const tileItalia = new VectorLayer({
//     source: new VectorSourceWMS({
//         url: 'http://localhost:8600/geoserver/wms',
//         params: {'LAYERS': 'coperture:Localita_11_WGS84'},
//         ratio: 1,
//     })
// });

//italy wms tile
const wmsSourceItaly = new TileWMS({
    url: 'http://localhost:8600/geoserver/wms',
    params: {'LAYERS': 'coperture:Localita_11_WGS84'},
    serverType: 'geoserver',
    crossOrigin: 'anonymous',
  });
  
  const wmsLayerItaly = new TileLayer({
    source: wmsSourceItaly,
  });

// all italy don't work
const vectorSourceItalia = new VectorSource({
    format: new GeoJSON(),
    url: 'http://localhost:8600/geoserver/coperture/wms?service=WMS&version=1.1.0&request=GetMap&layers=coperture%3ALocalita_11_WGS84&bbox=312171.375%2C4063897.0%2C1316990.625%2C5222272.0&width=666&height=768&srs=EPSG%3A32632&format=geojson'
});
const vectorLayerItalia = new VectorLayer({
    source: vectorSourceItalia,
    style: new Style({
        fill: new Fill({
            color: 'red'
        }),
        stroke: new Stroke({
            color: 'black',
            width: 2
        }),
    }),
});

const provaMilanoLayer = new VectorLayer({
    source: vectorSourceProvaLocaleMilano,
    style: new Style({
        fill: new Fill({
            color: 'red'
        }),
        stroke: new Stroke({
            color: 'black',
            width: 2
        }),
    })
});
// punto di vista
const view = new View({
    center: [1021242, 5700000],
    zoom: 11
});
// insieme di layer con mappa base
const layers = [
    new TileLayer({
        source: new OSM(),
    }),
    //provaMilanoLayer,
    vectorLayerCapMilano,
    //vectorLayerItalia
];

let selected = null;

// mappa
const map = new Map({
    controls: defaultControls().extend([mousePositionControl]),
    target: 'map',
    layers: layers,
    view: view,
});

// l'utente ha un capo nel quale può inserire il CAP e far evidenziare la zona di un altro colore
// l'obiettivo è quello di fare una mappa di valori tra Cap e id delle agenzie, 
// in modo tale da poter evidenziare le zone che dovrebbero essere coperte dalle agenzie
function search(queryIdAge) {
    if(listAge.includes(queryIdAge)) {
        console.log("🚀 ~ file: main.js ~ line 245 ~ search ~ queryIdAge", queryIdAge);
        vectorSourceCapMilano.forEachFeature(function(feature){
            // console.log("🚀 ~ file: main.js ~ line 229 ~ provaMilanoLayer.getSource ~ feature", feature.get('cap'));         
            if((agenziaMilano1.listIdCap.includes(feature.get('cap')) && agenziaMilano1.id == queryIdAge)
            || agenziaMilano2.listIdCap.includes(feature.get('cap')) && agenziaMilano2.id == queryIdAge) {
                console.log("🚀 ~ file: main.js ~ line 229 ~ vectorSourceCapMilano.forEachFeature ~ queryIdAge", queryIdAge);
                feature.setStyle(new Style({
                    stroke: new Stroke(
                        {
                        color: 'rgb(255,0,0,1)'
                    }),
                    fill: new Fill({
                        color: 'rgba(0,0,255,1)', //feature.get('cap') > 20140 ? 'red' : 'green',
                    }),
                    text: createStyleText(feature),
                }));
            } else {
                feature.setStyle(polygonStyleFunction);
            }
        });
    } else {
        reset()
        lastIdSearch = ''; 
    }
}

function reset() {
    vectorSourceCapMilano.forEachFeature(function(feature){
        feature.setStyle(polygonStyleFunction);
    });
}

// a normal select interaction to handle click
// const select = new Select({
//     style: function (feature) {
//       const color = feature.get('COLOR_BIO') || '#eeeeee';
//       selectedStyle.getFill().setColor(color);
//       return selectedStyle;
//     },
//   });
//   map.addInteraction(select);

  
// opzione di fullscreen
map.addControl(new FullScreen());

// inizio marker e label di vienna 
const pos = fromLonLat([16.3725, 48.208889]);
const marker = new Overlay({
    position: pos,
    positioning: 'center-center',
    element: document.getElementById('marker'),
    stopEvent: false,
});
map.addOverlay(marker);
const vienna = new Overlay({
    position: pos,
    element: document.getElementById('vienna'),
});
map.addOverlay(vienna);
// fine marker e label di vienna 

//gestione del popup quando clicco su un area del layer
// cap, codistat, comune
const overlayContainerElement = document.querySelector(".overlay-container");
const overlayPopup = new Overlay({
    element: overlayContainerElement
});
map.addOverlay(overlayPopup);

const overlayFeatureComune = document.getElementById("comune");
const overlayFeatureCap = document.getElementById("cap");
const overlayFeatureCodIstat = document.getElementById("codistat");

map.on('click', function(evt) {
    overlayPopup.setPosition(undefined);
    map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
        const comune = feature.get("comune");
        const cap = feature.get("cap");
        const codIstat = feature.get("codistat");
        const coordinate = evt.coordinate;
        overlayPopup.setPosition(coordinate);
        overlayFeatureCap.innerHTML = cap;
        overlayFeatureCodIstat.innerHTML = codIstat;
        overlayFeatureComune.innerHTML = comune;
        console.log(feature.getKeys());
        console.log(feature.get('shape_area'));
        //getColorForPeople(feature);
    });
});


map.on('singleclick', function (evt) {
    const viewResolution = /** @type {number} */ (view.getResolution());
    const url = wmsSourceItaly.getFeatureInfoUrl(
      evt.coordinate,
      viewResolution,
      'EPSG:3857',
      {'INFO_FORMAT': 'application/json'}
    );
    if (url) {
      fetch(url)
        .then((response) => response.text())
        .then((html) => {
        // console.log("🚀 ~ file: main.js ~ line 299 ~ .then ~ html", html);
        });
    }
  });


// se cambio il valore dello zoom i valori sulla mappa cambiano
function checkSize() {
    const small = map.getSize()[0] < 600;
    attribution.setCollapsible(small);
    attribution.setCollapsed(small);
}

window.addEventListener('resize', checkSize);
checkSize();
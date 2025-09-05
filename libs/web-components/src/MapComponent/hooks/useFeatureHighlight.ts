import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { GeoJSONFeature } from '../MapComponent';

export const useFeatureHighlight = (
  feature: GeoJSONFeature,
  featureIndex: number,
  highlightFeatureIndex?: number
) => {
  const map = useMap();
  const highlightLayerRef = useRef<L.Layer | null>(null);
  const isHighlighted = highlightFeatureIndex === featureIndex;

  useEffect(() => {
    // Remove previous highlight
    if (highlightLayerRef.current) {
      map.removeLayer(highlightLayerRef.current);
      highlightLayerRef.current = null;
    }

    if (isHighlighted) {
      const highlightedLayer = L.geoJSON(feature, {
        pointToLayer: (_geoJsonFeature: GeoJSON.Feature, latlng: L.LatLng) => {
          const isBuoyfield = feature.properties?.type === 'buoyfield' || 
                             feature.properties?.name?.toLowerCase().includes('buoy');
          const radius = isBuoyfield ? 7 : 12;
          
          return L.circleMarker(latlng, {
            radius: radius,
            fillColor: '#ff7f00',
            color: '#ff4500',
            weight: 4,
            opacity: 0.9,
            fillOpacity: 0.6
          });
        },
        style: () => ({
          color: '#ff4500',
          weight: 4,
          opacity: 0.9,
          fillColor: '#ff7f00',
          fillOpacity: 0.6
        })
      }).addTo(map);

      highlightLayerRef.current = highlightedLayer;

      // Pan to highlighted feature
      if (feature.geometry.type === 'Point') {
        const coords = feature.geometry.coordinates;
        map.panTo([coords[1], coords[0]]);
      }
    }
  }, [isHighlighted, feature, map]);

  return null;
};
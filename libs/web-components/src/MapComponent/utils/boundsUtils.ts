import L from 'leaflet';
import { GeoJSONFeature } from '../MapComponent';

/**
 * Calculate bounds from GeoJSON features for map viewport fitting
 */
export const calculateFeatureBounds = (features: GeoJSONFeature[]): { bounds: L.LatLngBounds; hasValidGeometry: boolean } => {
  const bounds = L.latLngBounds([]);
  let hasValidGeometry = false;

  features.forEach(feature => {
    if (!feature.geometry) return;

    try {
      switch (feature.geometry.type) {
        case 'Point': {
          const coords = feature.geometry.coordinates as [number, number];
          bounds.extend([coords[1], coords[0]]);
          hasValidGeometry = true;
          break;
        }
        case 'LineString': {
          const lineCoords = feature.geometry.coordinates as [number, number][];
          lineCoords.forEach(coord => bounds.extend([coord[1], coord[0]]));
          hasValidGeometry = true;
          break;
        }
        case 'MultiLineString': {
          const multiLineCoords = feature.geometry.coordinates as [number, number][][];
          multiLineCoords.forEach(line => 
            line.forEach(coord => bounds.extend([coord[1], coord[0]]))
          );
          hasValidGeometry = true;
          break;
        }
        case 'Polygon': {
          const polyCoords = feature.geometry.coordinates as [number, number][][];
          if (polyCoords.length > 0) {
            polyCoords[0].forEach(coord => bounds.extend([coord[1], coord[0]]));
            hasValidGeometry = true;
          }
          break;
        }
        case 'MultiPolygon': {
          const multiPolyCoords = feature.geometry.coordinates as [number, number][][][];
          multiPolyCoords.forEach(polygon => {
            if (polygon.length > 0) {
              polygon[0].forEach(coord => bounds.extend([coord[1], coord[0]]));
            }
          });
          hasValidGeometry = true;
          break;
        }
        case 'MultiPoint': {
          const multiPointCoords = feature.geometry.coordinates as [number, number][];
          multiPointCoords.forEach(coord => bounds.extend([coord[1], coord[0]]));
          hasValidGeometry = true;
          break;
        }
      }
    } catch (error) {
      console.warn('Error processing feature geometry for bounds:', error);
    }
  });

  return { bounds, hasValidGeometry };
};
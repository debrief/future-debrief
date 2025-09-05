import React from 'react';
import { Polygon, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { GeoJSONFeature } from '../MapComponent';
import { DebriefFeatureProps, useFeatureLayerManager, useFeatureHighlight } from './DebriefFeature';

export interface ZoneRendererProps extends DebriefFeatureProps {
  feature: GeoJSONFeature & {
    properties: {
      dataType?: 'zone';
      fill?: string;
      stroke?: string;
      'fill-opacity'?: number;
      annotationType?: 'label' | 'area' | 'measurement' | 'comment' | 'boundary';
      [key: string]: unknown;
    };
  };
}

export const ZoneRenderer: React.FC<ZoneRendererProps> = ({
  feature,
  featureIndex,
  selectedFeatureIndices,
  selectedFeatureIds,
  highlightFeatureIndex,
  onSelectionChange,
  geoJsonData
}) => {
  const layerManager = useFeatureLayerManager(
    geoJsonData,
    selectedFeatureIndices,
    selectedFeatureIds,
    onSelectionChange
  );

  useFeatureHighlight(feature, featureIndex, highlightFeatureIndex);

  // Get styling from feature properties
  const getZoneStyle = () => {
    const props = feature.properties || {};
    const strokeColor = props.stroke || '#3388ff';
    const fillColor = props.fill || strokeColor;
    const fillOpacity = props['fill-opacity'] !== undefined ? props['fill-opacity'] : 0.2;
    
    return {
      color: strokeColor,
      weight: 3,
      opacity: 0.8,
      fillColor: fillColor,
      fillOpacity: fillOpacity
    };
  };

  // Handle layer registration
  const handleLayerRef = (layer: L.Layer | null) => {
    if (layer) {
      layerManager.addLayer(featureIndex, layer);
    } else {
      layerManager.removeLayer(featureIndex);
    }
  };

  const style = getZoneStyle();

  // Render based on geometry type
  switch (feature.geometry.type) {
    case 'Polygon': {
      const coords = (feature.geometry.coordinates as number[][][])[0]; // Outer ring only
      const positions: L.LatLngExpression[] = coords.map(coord => [coord[1], coord[0]]);
      
      return (
        <Polygon
          ref={handleLayerRef}
          positions={positions}
          pathOptions={style}
        />
      );
    }
    
    case 'MultiPolygon': {
      const multiPolygonCoords = feature.geometry.coordinates as number[][][][];
      
      return (
        <>
          {multiPolygonCoords.map((polygonCoords, polygonIndex) => {
            const positions: L.LatLngExpression[] = polygonCoords[0].map(coord => [coord[1], coord[0]]);
            
            return (
              <Polygon
                key={`${featureIndex}-${polygonIndex}`}
                ref={polygonIndex === 0 ? handleLayerRef : undefined}
                positions={positions}
                pathOptions={style}
              />
            );
          })}
        </>
      );
    }
    
    case 'LineString': {
      const coords = feature.geometry.coordinates as number[][];
      const positions: L.LatLngExpression[] = coords.map(coord => [coord[1], coord[0]]);
      
      return (
        <Polyline
          ref={handleLayerRef}
          positions={positions}
          pathOptions={style}
        />
      );
    }
    
    case 'MultiLineString': {
      const multiLineCoords = feature.geometry.coordinates as number[][][];
      
      return (
        <>
          {multiLineCoords.map((lineCoords, lineIndex) => {
            const positions: L.LatLngExpression[] = lineCoords.map(coord => [coord[1], coord[0]]);
            
            return (
              <Polyline
                key={`${featureIndex}-${lineIndex}`}
                ref={lineIndex === 0 ? handleLayerRef : undefined}
                positions={positions}
                pathOptions={style}
              />
            );
          })}
        </>
      );
    }
    
    case 'Point': {
      const coords = feature.geometry.coordinates as number[];
      const position: L.LatLngExpression = [coords[1], coords[0]];
      
      // For zone point annotations, use different styling than regular points
      const pointStyle = {
        radius: 8,
        fillColor: style.fillColor,
        color: style.color,
        weight: style.weight,
        opacity: style.opacity,
        fillOpacity: style.fillOpacity
      };
      
      return (
        <CircleMarker
          ref={handleLayerRef}
          center={position}
          radius={pointStyle.radius}
          pathOptions={pointStyle}
        />
      );
    }
    
    case 'MultiPoint': {
      const multiPointCoords = feature.geometry.coordinates as number[][];
      
      const pointStyle = {
        radius: 8,
        fillColor: style.fillColor,
        color: style.color,
        weight: style.weight,
        opacity: style.opacity,
        fillOpacity: style.fillOpacity
      };
      
      return (
        <>
          {multiPointCoords.map((coords, pointIndex) => {
            const position: L.LatLngExpression = [coords[1], coords[0]];
            
            return (
              <CircleMarker
                key={`${featureIndex}-${pointIndex}`}
                ref={pointIndex === 0 ? handleLayerRef : undefined}
                center={position}
                radius={pointStyle.radius}
                pathOptions={pointStyle}
              />
            );
          })}
        </>
      );
    }
    
    default:
      return null;
  }
};
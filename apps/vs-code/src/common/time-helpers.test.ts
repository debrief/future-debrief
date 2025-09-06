import { calculateTimeRange, GeoJSONFeature } from './time-helpers';

describe('calculateTimeRange', () => {
  it('should return null for an empty array of features', () => {
    expect(calculateTimeRange([])).toBeNull();
  });

  it('should return the correct range for a single point feature with a time property', () => {
    const features: GeoJSONFeature[] = [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { time: '2025-09-05T12:00:00Z' },
      },
    ];
    expect(calculateTimeRange(features)).toEqual([
      '2025-09-05T12:00:00.000Z',
      '2025-09-05T12:00:00.000Z',
    ]);
  });

  it('should return the correct range for a single point feature with timeStart and timeEnd properties', () => {
    const features: GeoJSONFeature[] = [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: {
          timeStart: '2025-09-05T10:00:00Z',
          timeEnd: '2025-09-05T14:00:00Z',
        },
      },
    ];
    expect(calculateTimeRange(features)).toEqual([
      '2025-09-05T10:00:00.000Z',
      '2025-09-05T14:00:00.000Z',
    ]);
  });

  it('should return the correct range for a single track feature with a timestamps array', () => {
    const features: GeoJSONFeature[] = [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[0, 0], [1, 1]],
        },
        properties: {
          timestamps: [
            '2025-09-05T11:00:00Z',
            '2025-09-05T13:00:00Z',
          ],
        },
      },
    ];
    expect(calculateTimeRange(features)).toEqual([
      '2025-09-05T11:00:00.000Z',
      '2025-09-05T13:00:00.000Z',
    ]);
  });

  it('should return the correct range for a mix of feature types', () => {
    const features: GeoJSONFeature[] = [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { time: '2025-09-05T12:00:00Z' },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[0, 0], [1, 1]],
        },
        properties: {
          timestamps: [
            '2025-09-05T10:00:00Z',
            '2025-09-05T14:00:00Z',
          ],
        },
      },
    ];
    expect(calculateTimeRange(features)).toEqual([
      '2025-09-05T10:00:00.000Z',
      '2025-09-05T14:00:00.000Z',
    ]);
  });

  it('should ignore features with no time properties', () => {
    const features: GeoJSONFeature[] = [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { name: 'No time here' },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { time: '2025-09-05T12:00:00Z' },
      },
    ];
    expect(calculateTimeRange(features)).toEqual([
      '2025-09-05T12:00:00.000Z',
      '2025-09-05T12:00:00.000Z',
    ]);
  });

  it('should return null if no features have time properties', () => {
    const features: GeoJSONFeature[] = [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { name: 'Still no time' },
      },
    ];
    expect(calculateTimeRange(features)).toBeNull();
  });

  it('should handle invalid date strings gracefully', () => {
    const features: GeoJSONFeature[] = [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { time: 'not a date' },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { time: '2025-09-05T12:00:00Z' },
      },
    ];
    expect(calculateTimeRange(features)).toEqual([
      '2025-09-05T12:00:00.000Z',
      '2025-09-05T12:00:00.000Z',
    ]);
  });
});

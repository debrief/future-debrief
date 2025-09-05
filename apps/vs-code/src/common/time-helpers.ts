
export interface GeoJSONFeature {
    type: 'Feature';
    id?: string | number;
    geometry: {
        type: string;
        coordinates: unknown;
    };
    properties: Record<string, unknown>;
}

export const calculateTimeRange = (features: GeoJSONFeature[]): [string, string] | null => {
    let minTime: number | null = null;
    let maxTime: number | null = null;

    const updateMinMax = (timeStr: string) => {
        try {
            const time = new Date(timeStr).getTime();
            if (!isNaN(time)) {
                if (minTime === null || time < minTime) {
                    minTime = time;
                }
                if (maxTime === null || time > maxTime) {
                    maxTime = time;
                }
            }
        } catch (e) {
            // Ignore invalid date strings
        }
    };

    for (const feature of features) {
        if (feature.properties) {
            // Handle point features with time, timeStart, timeEnd
            if (typeof feature.properties.time === 'string') {
                updateMinMax(feature.properties.time);
            }
            if (typeof feature.properties.timeStart === 'string') {
                updateMinMax(feature.properties.timeStart);
            }
            if (typeof feature.properties.timeEnd === 'string') {
                updateMinMax(feature.properties.timeEnd);
            }

            // Handle track features with timestamps array
            if (Array.isArray(feature.properties.timestamps)) {
                for (const timestamp of feature.properties.timestamps) {
                    if (typeof timestamp === 'string') {
                        updateMinMax(timestamp);
                    }
                }
            }
        }
    }

    if (minTime !== null && maxTime !== null) {
        return [new Date(minTime).toISOString(), new Date(maxTime).toISOString()];
    }

    return null;
};

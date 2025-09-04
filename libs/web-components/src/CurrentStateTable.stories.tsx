import * as React from 'react';
import { CurrentStateTable, StateFieldRow } from './CurrentStateTable';

export default {
  title: 'CurrentStateTable',
  component: CurrentStateTable,
};

const sampleData: StateFieldRow[] = [
  { field: 'Editor ID', value: 'editor-1' },
  { field: 'Filename', value: 'file1.plot.json' },
  { field: 'Time State', value: '12:00' },
  { field: 'Viewport State', value: 'zoom: 1.0, center: [51.5, -0.1]' },
  { field: 'Selected IDs', value: 'feature-1, feature-2' },
  { field: 'FC Summary', value: 'Map (5 features)' },
  { field: 'FC Count', value: '5' },
  { field: 'History Count', value: '8' },
];

export const Default = () => <CurrentStateTable data={sampleData} />;

export const EmptyState = () => <CurrentStateTable data={[]} />;

export const WithManyFields = () => {
  const extendedData: StateFieldRow[] = [
    ...sampleData,
    { field: 'Last Modified', value: '2024-09-04 14:30:22' },
    { field: 'Unsaved Changes', value: 'true' },
    { field: 'Zoom Level', value: '15' },
    { field: 'Map Center', value: '[51.5074, -0.1278]' },
  ];
  
  return <CurrentStateTable data={extendedData} />;
};

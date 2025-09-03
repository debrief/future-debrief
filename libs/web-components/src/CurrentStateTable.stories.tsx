import * as React from 'react';
import { CurrentStateTable, EditorStateRow } from './CurrentStateTable';

export default {
  title: 'CurrentStateTable',
  component: CurrentStateTable,
};

const sampleData: EditorStateRow[] = [
  {
    editorId: 'editor-1',
    filename: 'file1.plot.json',
    timeState: '12:00',
    viewportState: 'zoom: 1.0',
    selectedIds: ['a', 'b'],
    fcSummary: 'Map (3 features)',
    fcCount: 3,
    historyCount: 5,
  },
  {
    editorId: 'editor-2',
    filename: 'file2.plot.json',
    timeState: '12:01',
    viewportState: 'zoom: 2.0',
    selectedIds: ['c'],
    fcSummary: 'Chart (2 features)',
    fcCount: 2,
    historyCount: 2,
  },
];

export const Default = () => <CurrentStateTable data={sampleData} />;

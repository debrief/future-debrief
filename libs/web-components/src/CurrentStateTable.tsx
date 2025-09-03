import React, { useEffect, useRef, useState } from 'react';
import './CurrentStateTable.css';

export interface EditorStateRow {
  editorId: string;
  filename: string;
  timeState: string;
  viewportState: string;
  selectedIds: string[];
  fcSummary: string;
  fcCount: number;
  historyCount: number;
}

interface HighlightMap {
  [key: string]: boolean;
}

interface Props {
  data: EditorStateRow[];
}

const highlightDuration = 500;

export const CurrentStateTable: React.FC<Props> = ({ data }) => {
  const [highlighted, setHighlighted] = useState<HighlightMap>({});
  const prevData = useRef<EditorStateRow[]>([]);

  useEffect(() => {
    const newHighlights: HighlightMap = {};
    data.forEach((row, idx) => {
      const prevRow = prevData.current[idx];
      if (prevRow) {
        Object.keys(row).forEach((key) => {
          if (row[key as keyof EditorStateRow] !== prevRow[key as keyof EditorStateRow]) {
            newHighlights[`${idx}-${key}`] = true;
            setTimeout(() => {
              setHighlighted((h) => ({ ...h, [`${idx}-${key}`]: false }));
            }, highlightDuration);
          }
        });
      }
    });
    setHighlighted((h) => ({ ...h, ...newHighlights }));
    prevData.current = data;
  }, [data]);

  return (
    <table className="current-state-table">
      <thead>
        <tr>
          <th>Editor ID</th>
          <th>Filename</th>
          <th>Time State</th>
          <th>Viewport</th>
          <th>Selected IDs</th>
          <th>FC Summary</th>
          <th>FC Count</th>
          <th>History Count</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={row.editorId}>
            <td className={highlighted[`${idx}-editorId`] ? 'highlight' : ''}>{row.editorId}</td>
            <td className={highlighted[`${idx}-filename`] ? 'highlight' : ''}>{row.filename}</td>
            <td className={highlighted[`${idx}-timeState`] ? 'highlight' : ''}>{row.timeState}</td>
            <td className={highlighted[`${idx}-viewportState`] ? 'highlight' : ''}>{row.viewportState}</td>
            <td className={highlighted[`${idx}-selectedIds`] ? 'highlight' : ''}>{row.selectedIds.join(', ')}</td>
            <td className={highlighted[`${idx}-fcSummary`] ? 'highlight' : ''}>{row.fcSummary}</td>
            <td className={highlighted[`${idx}-fcCount`] ? 'highlight' : ''}>{row.fcCount}</td>
            <td className={highlighted[`${idx}-historyCount`] ? 'highlight' : ''}>{row.historyCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

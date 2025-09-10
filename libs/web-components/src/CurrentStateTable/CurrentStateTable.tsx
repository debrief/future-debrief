import React, { useEffect, useRef, useState, useMemo } from 'react';
import './CurrentStateTable.css';
import { CurrentState } from '@debrief/shared-types';

export interface StateFieldRow {
	field: string;
	value: string;
}

interface HighlightMap {
	[key: string]: boolean;
}

interface Props {
	currentState?: CurrentState;
}

const highlightDuration = 500;

// Helper function to convert CurrentState to StateFieldRow array
const convertCurrentStateToRows = (currentState: CurrentState): StateFieldRow[] => {
	const rows: StateFieldRow[] = [
		{ field: 'Filename', value: currentState.filename },
	];

	if (currentState.editorState.timeState) {
		rows.push({ field: 'Time State', value: currentState.editorState.timeState.current });
	}

	if (currentState.editorState.viewportState) {
		const bounds = currentState.editorState.viewportState.bounds;
		const formattedBounds = bounds.map(num => num.toFixed(3)).join(', ');
		rows.push({ field: 'Viewport State', value: `[${formattedBounds}]` });
	}

	if (currentState.editorState.selectionState) {
		const selectedIds = currentState.editorState.selectionState.selectedIds;
		rows.push({ field: 'Selected IDs', value: selectedIds.join(', ') });
	}

	if (currentState.editorState.featureCollection) {
		const fc = currentState.editorState.featureCollection;
		const featureCount = fc.features?.length || 0;
		rows.push({ field: 'FC Summary', value: `FC (${featureCount} features)` });
		rows.push({ field: 'FC Count', value: featureCount.toString() });
	}

	rows.push({ field: 'History Count', value: currentState.historyCount.toString() });

	return rows;
};

export const CurrentStateTable: React.FC<Props> = ({ currentState }) => {
	const [highlighted, setHighlighted] = useState<HighlightMap>({});
	const prevData = useRef<StateFieldRow[]>([]);

	// Use currentState if provided, otherwise fall back to data
	const displayData = useMemo(() => 
		currentState ? convertCurrentStateToRows(currentState) : [],
		[currentState]
	);

	useEffect(() => {
		const newHighlights: HighlightMap = {};
		displayData.forEach((row: StateFieldRow, idx: number) => {
			const prevRow = prevData.current[idx];
			if (prevRow && prevRow.field === row.field) {
				if (prevRow.value !== row.value) {
					newHighlights[`${idx}-value`] = true;
					setTimeout(() => {
						setHighlighted((h) => ({ ...h, [`${idx}-value`]: false }));
					}, highlightDuration);
				}
			}
		});
		setHighlighted((h) => ({ ...h, ...newHighlights }));
		prevData.current = displayData;
	}, [displayData]);

	return (
		<table className="current-state-table">
			<thead>
				<tr>
					<th>Field</th>
					<th>Value</th>
				</tr>
			</thead>
			<tbody>
				{displayData.map((row: StateFieldRow, idx: number) => (
					<tr key={row.field}>
						<td className="field-name">{row.field}</td>
						<td className={highlighted[`${idx}-value`] ? 'highlight' : ''}>{row.value}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
};

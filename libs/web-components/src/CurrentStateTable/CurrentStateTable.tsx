import React, { useEffect, useRef, useState } from 'react';
import './CurrentStateTable.css';

export interface StateFieldRow {
	field: string;
	value: string;
}

// Keep the old interface for backwards compatibility
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
	data: StateFieldRow[];
}

const highlightDuration = 500;

export const CurrentStateTable: React.FC<Props> = ({ data }) => {
	const [highlighted, setHighlighted] = useState<HighlightMap>({});
	const prevData = useRef<StateFieldRow[]>([]);

	useEffect(() => {
		const newHighlights: HighlightMap = {};
		data.forEach((row, idx) => {
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
		prevData.current = data;
	}, [data]);

	return (
		<table className="current-state-table">
			<thead>
				<tr>
					<th>Field</th>
					<th>Value</th>
				</tr>
			</thead>
			<tbody>
				{data.map((row, idx) => (
					<tr key={row.field}>
						<td className="field-name">{row.field}</td>
						<td className={highlighted[`${idx}-value`] ? 'highlight' : ''}>{row.value}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
};

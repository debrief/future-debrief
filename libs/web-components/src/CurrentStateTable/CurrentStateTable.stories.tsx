import * as React from 'react';
import { useState, useEffect } from 'react';
import { CurrentStateTable } from './CurrentStateTable';
import { CurrentState } from '@debrief/shared-types';

export default {
	title: 'CurrentStateTable',
	component: CurrentStateTable,
};

const sampleCurrentState: CurrentState = {
	editorId: 'editor-1',
	filename: 'file1.plot.json',
	editorState: {
		timeState: {
			current: '2024-09-04T12:00:00Z'
		},
		viewportState: {
			bounds: [51.5074, -0.1278, 51.5084, -0.1268]
		},
		selectionState: {
			selectedIds: ['feature-1', 'feature-2']
		},
		featureCollection: {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					id: 'feature-1',
					geometry: { type: 'Point', coordinates: [51.5074, -0.1278] },
					properties: { dataType: 'reference-point' as const, name: 'Point 1' }
				},
				{
					type: 'Feature',
					id: 'feature-2',
					geometry: { type: 'Point', coordinates: [51.5084, -0.1268] },
					properties: { dataType: 'reference-point' as const, name: 'Point 2' }
				}
			]
		}
	},
	historyCount: 8
};

export const Default = () => <CurrentStateTable currentState={sampleCurrentState} />;

export const EmptyState = () => <CurrentStateTable />;

export const WithHighlightingChanges = () => {
	const [state, setState] = useState<CurrentState>(sampleCurrentState);
	const [counter, setCounter] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setCounter(prev => prev + 1);
			
			// Update different fields on each tick to demonstrate highlighting
			setState((prevState: CurrentState) => {
				const baseFeatures = prevState.editorState.featureCollection?.features || [];
				const newFeatures = counter % 4 === 0 ? [{
					type: 'Feature' as const,
					id: `feature-${Date.now()}`,
					geometry: { 
						type: 'Point' as const, 
						coordinates: [
							51.5074 + Math.random() * 0.01, 
							-0.1278 + Math.random() * 0.01
						] as [number, number]
					},
					properties: { 
						dataType: 'reference-point' as const, 
						name: `Point ${counter}` 
					}
				}] : [];

				return {
					...prevState,
					historyCount: prevState.historyCount + 1,
					editorState: {
						...prevState.editorState,
						timeState: {
							current: new Date(Date.now() + counter * 60000).toISOString()
						},
						viewportState: {
							bounds: [
								51.5074 + Math.random() * 0.001,
								-0.1278 + Math.random() * 0.001,
								51.5084 + Math.random() * 0.001,
								-0.1268 + Math.random() * 0.001
							] as [number, number, number, number]
						},
						selectionState: {
							selectedIds: counter % 3 === 0 ? ['feature-1'] : 
										counter % 3 === 1 ? ['feature-2'] : 
										['feature-1', 'feature-2', 'feature-3']
						},
						featureCollection: prevState.editorState.featureCollection ? {
							...prevState.editorState.featureCollection,
							features: [...baseFeatures, ...newFeatures]
						} : undefined
					}
				};
			});
		}, 2000);

		return () => clearInterval(interval);
	}, [counter]);

	return (
		<div>
			<h3>Auto-updating state (updates every 2 seconds)</h3>
			<p>Watch for highlights when values change!</p>
			<CurrentStateTable currentState={state} />
		</div>
	);
};

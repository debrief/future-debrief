import type { Meta, StoryObj } from '@storybook/react'
import { ActivityBar, ActivityPanel } from './ActivityBar'

const meta: Meta<typeof ActivityBar> = {
  title: 'Components/ActivityBar',
  component: ActivityBar,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '600px', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof ActivityBar>

export const Default: Story = {
  render: () => (
    <ActivityBar>
      <ActivityPanel title="Explorer (Collapsible, NOT Resizable)" resizable={false}>
        <div style={{ padding: '8px', background: '#1a4d2e', color: '#fff', height: '100%' }}>
          <h3>Explorer Content</h3>
          <p>This panel is collapsible but NOT resizable - no resize handle below.</p>
          <ul>
            <li>File 1.tsx</li>
            <li>File 2.tsx</li>
            <li>File 3.tsx</li>
          </ul>
        </div>
      </ActivityPanel>
      <ActivityPanel title="Outline (Collapsible + Resizable)">
        <div style={{ padding: '8px', background: '#2b4c7e', color: '#fff', height: '100%' }}>
          <h3>Outline Content</h3>
          <p>This panel is collapsible and resizable (default behavior).</p>
          <ul>
            <li>Function foo()</li>
            <li>Function bar()</li>
            <li>Class Baz</li>
          </ul>
        </div>
      </ActivityPanel>
      <ActivityPanel title="Timeline (Collapsible + Resizable)">
        <div style={{ padding: '8px', background: '#4a235a', color: '#fff', height: '100%' }}>
          <h3>Timeline Content</h3>
          <p>This panel is collapsible and resizable (default behavior).</p>
          <ul>
            <li>Commit 1 - Initial commit</li>
            <li>Commit 2 - Added feature</li>
            <li>Commit 3 - Fixed bug</li>
          </ul>
        </div>
      </ActivityPanel>
    </ActivityBar>
  ),
}

export const MixedCollapsible: Story = {
  render: () => (
    <ActivityBar>
      <ActivityPanel title="Explorer (Collapsible)" collapsible={true}>
        <div style={{ padding: '8px', background: '#1a4d2e', color: '#fff', height: '100%' }}>
          <h3>Explorer Content (Collapsible)</h3>
          <p>Click the chevron icon to collapse/expand this panel.</p>
          <ul>
            <li>File 1.tsx</li>
            <li>File 2.tsx</li>
            <li>File 3.tsx</li>
          </ul>
        </div>
      </ActivityPanel>
      <ActivityPanel title="Outline (NOT Collapsible)" collapsible={false}>
        <div style={{ padding: '8px', background: '#2b4c7e', color: '#fff', height: '100%' }}>
          <h3>Outline Content (Always Open)</h3>
          <p>This panel cannot be collapsed - notice no chevron icon.</p>
          <ul>
            <li>Function foo()</li>
            <li>Function bar()</li>
            <li>Class Baz</li>
          </ul>
        </div>
      </ActivityPanel>
      <ActivityPanel title="Timeline (Collapsible)" collapsible={true}>
        <div style={{ padding: '8px', background: '#4a235a', color: '#fff', height: '100%' }}>
          <h3>Timeline Content (Collapsible)</h3>
          <p>Click the chevron icon to collapse/expand this panel.</p>
          <ul>
            <li>Commit 1 - Initial commit</li>
            <li>Commit 2 - Added feature</li>
            <li>Commit 3 - Fixed bug</li>
          </ul>
        </div>
      </ActivityPanel>
    </ActivityBar>
  ),
}

export const MixedResizable: Story = {
  render: () => (
    <ActivityBar>
      <ActivityPanel title="Explorer (Resizable)" resizable={true}>
        <div style={{ padding: '8px', background: '#1a4d2e', color: '#fff', height: '100%' }}>
          <h3>Explorer Content (Resizable)</h3>
          <p>Drag the border below to resize this panel.</p>
          <ul>
            <li>File 1.tsx</li>
            <li>File 2.tsx</li>
            <li>File 3.tsx</li>
          </ul>
        </div>
      </ActivityPanel>
      <ActivityPanel title="Outline (NOT Resizable)" resizable={false}>
        <div style={{ padding: '8px', background: '#2b4c7e', color: '#fff', height: '100%' }}>
          <h3>Outline Content (Fixed Size)</h3>
          <p>This panel cannot be resized - notice no resize handle below.</p>
          <ul>
            <li>Function foo()</li>
            <li>Function bar()</li>
            <li>Class Baz</li>
          </ul>
        </div>
      </ActivityPanel>
      <ActivityPanel title="Timeline (Resizable)" resizable={true}>
        <div style={{ padding: '8px', background: '#4a235a', color: '#fff', height: '100%' }}>
          <h3>Timeline Content (Resizable)</h3>
          <p>Drag the border above or below to resize this panel.</p>
          <ul>
            <li>Commit 1 - Initial commit</li>
            <li>Commit 2 - Added feature</li>
            <li>Commit 3 - Fixed bug</li>
          </ul>
        </div>
      </ActivityPanel>
    </ActivityBar>
  ),
}

export const CollapseSpaceRedistribution: Story = {
  render: () => (
    <ActivityBar>
      <ActivityPanel title="Panel 1 (Collapsible)">
        <div style={{ padding: '8px', background: '#1a4d2e', color: '#fff', height: '100%' }}>
          <h3>Panel 1</h3>
          <p>Try collapsing panels to see space redistribution.</p>
          <p>When you collapse a panel, the remaining open panels automatically expand to fill the freed space equally.</p>
        </div>
      </ActivityPanel>
      <ActivityPanel title="Panel 2 (Collapsible)">
        <div style={{ padding: '8px', background: '#2b4c7e', color: '#fff', height: '100%' }}>
          <h3>Panel 2</h3>
          <p>Collapse Panel 1 and watch this panel grow!</p>
          <p>The space is redistributed proportionally among all open panels.</p>
        </div>
      </ActivityPanel>
      <ActivityPanel title="Panel 3 (Collapsible)">
        <div style={{ padding: '8px', background: '#4a235a', color: '#fff', height: '100%' }}>
          <h3>Panel 3</h3>
          <p>Collapse both other panels to see this expand to fill all available space.</p>
        </div>
      </ActivityPanel>
      <ActivityPanel title="Panel 4 (Collapsible)">
        <div style={{ padding: '8px', background: '#7a3d2e', color: '#fff', height: '100%' }}>
          <h3>Panel 4</h3>
          <p>The greedy space redistribution algorithm ensures all available vertical space is used efficiently.</p>
        </div>
      </ActivityPanel>
    </ActivityBar>
  ),
}

export const ResizeInteraction: Story = {
  render: () => (
    <ActivityBar>
      <ActivityPanel title="Top Panel (Resizable)" resizable={true}>
        <div style={{ padding: '8px', background: '#1a4d2e', color: '#fff', height: '100%' }}>
          <h3>Top Panel</h3>
          <p>Drag the resize handle below (hover to see it highlight in blue).</p>
          <p>As you drag down, this panel shrinks and the middle panel grows.</p>
          <p>Minimum panel height is enforced (header + 100px content).</p>
        </div>
      </ActivityPanel>
      <ActivityPanel title="Middle Panel (Resizable)" resizable={true}>
        <div style={{ padding: '8px', background: '#2b4c7e', color: '#fff', height: '100%' }}>
          <h3>Middle Panel</h3>
          <p>This panel is affected by both the handle above and below.</p>
          <p>Resize handles only affect the two adjacent panels they&apos;re between.</p>
        </div>
      </ActivityPanel>
      <ActivityPanel title="Bottom Panel (Resizable)">
        <div style={{ padding: '8px', background: '#4a235a', color: '#fff', height: '100%' }}>
          <h3>Bottom Panel</h3>
          <p>Drag the resize handle above to grow/shrink this panel.</p>
          <p>Try dragging to the minimum limit - the panels won&apos;t shrink below the minimum height.</p>
        </div>
      </ActivityPanel>
    </ActivityBar>
  ),
}

export const AllPanelsCollapsed: Story = {
  render: () => {
    // Start with all panels in a partially collapsed state for demonstration
    return (
      <ActivityBar>
        <ActivityPanel title="Explorer (Collapsible)">
          <div style={{ padding: '8px', background: '#1a4d2e', color: '#fff', height: '100%' }}>
            <h3>Explorer Content</h3>
            <p>Collapse all panels to see whitespace behavior.</p>
            <p>When all panels are collapsed, plain whitespace is shown beneath the collapsed panel headers.</p>
          </div>
        </ActivityPanel>
        <ActivityPanel title="Outline (Collapsible)">
          <div style={{ padding: '8px', background: '#2b4c7e', color: '#fff', height: '100%' }}>
            <h3>Outline Content</h3>
            <p>Click the chevron icons on all panels to collapse them.</p>
          </div>
        </ActivityPanel>
        <ActivityPanel title="Timeline (Collapsible)">
          <div style={{ padding: '8px', background: '#4a235a', color: '#fff', height: '100%' }}>
            <h3>Timeline Content</h3>
            <p>Try collapsing all three panels!</p>
          </div>
        </ActivityPanel>
      </ActivityBar>
    )
  },
}

export const SinglePanel: Story = {
  render: () => (
    <ActivityBar>
      <ActivityPanel title="Single Panel (Collapsible)">
        <div style={{ padding: '8px', background: '#1a4d2e', color: '#fff', height: '100%' }}>
          <h3>Single Panel</h3>
          <p>A single panel still has full functionality:</p>
          <ul>
            <li>✓ Can be collapsed (click the chevron)</li>
            <li>✓ Takes up full available height when expanded</li>
            <li>✓ Shows only header when collapsed</li>
            <li>✗ No resize handle (nothing to resize against)</li>
          </ul>
          <p>This is the simplest use case for the ActivityBar.</p>
        </div>
      </ActivityPanel>
    </ActivityBar>
  ),
}

export const ComplexContent: Story = {
  render: () => (
    <ActivityBar>
      <ActivityPanel title="File Browser (Collapsible + Resizable)">
        <div style={{ padding: '8px', background: '#1a4d2e', color: '#fff', height: '100%' }}>
          <h3>Complex Content Example</h3>
          <div style={{
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '4px',
            padding: '8px',
            marginTop: '8px'
          }}>
            <h4>Directory Tree</h4>
            <ul style={{ listStyleType: 'none', paddingLeft: '12px' }}>
              <li>📁 src</li>
              <li style={{ paddingLeft: '20px' }}>📁 components</li>
              <li style={{ paddingLeft: '40px' }}>📄 ActivityBar.tsx</li>
              <li style={{ paddingLeft: '40px' }}>📄 ActivityPanel.tsx</li>
              <li style={{ paddingLeft: '20px' }}>📁 stories</li>
              <li style={{ paddingLeft: '40px' }}>📄 ActivityBar.stories.tsx</li>
            </ul>
          </div>
        </div>
      </ActivityPanel>
      <ActivityPanel title="Properties (Collapsible + Resizable)">
        <div style={{ padding: '8px', background: '#2b4c7e', color: '#fff', height: '100%' }}>
          <h3>Properties Panel</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
                <td style={{ padding: '4px', fontWeight: 'bold' }}>Name:</td>
                <td style={{ padding: '4px' }}>ActivityBar.tsx</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
                <td style={{ padding: '4px', fontWeight: 'bold' }}>Type:</td>
                <td style={{ padding: '4px' }}>TypeScript React</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
                <td style={{ padding: '4px', fontWeight: 'bold' }}>Size:</td>
                <td style={{ padding: '4px' }}>8.4 KB</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ActivityPanel>
      <ActivityPanel title="Output (Collapsible + Resizable)">
        <div style={{ padding: '8px', fontFamily: 'monospace', fontSize: '12px', background: '#4a235a', color: '#fff', height: '100%' }}>
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '8px',
            borderRadius: '4px',
            overflow: 'auto'
          }}>
            <div>$ npm run build</div>
            <div style={{ color: '#4CAF50' }}>✓ Build completed successfully</div>
            <div>Generated: dist/ActivityBar.js</div>
            <div>Size: 24.5 KB</div>
          </div>
        </div>
      </ActivityPanel>
    </ActivityBar>
  ),
}

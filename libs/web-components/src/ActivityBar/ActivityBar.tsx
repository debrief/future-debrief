import React, { useState, useEffect, useRef, Children } from 'react'
import { VscodeIcon } from '@vscode-elements/react-elements'

export interface ActivityBarProps {
  children: React.ReactNode
  className?: string
  initialPanelStates?: PanelState[]
  onPanelStatesChange?: (states: PanelState[]) => void
}

export interface ActivityPanelProps {
  title: string
  collapsible?: boolean
  resizable?: boolean
  children: React.ReactNode
  className?: string
}

export interface PanelState {
  id: string
  collapsed: boolean
  height: number // pixels
}

const HEADER_HEIGHT = 35 // pixels
const MIN_CONTENT_HEIGHT = 100 // pixels
const MIN_PANEL_HEIGHT = HEADER_HEIGHT + MIN_CONTENT_HEIGHT
const FIXED_NON_RESIZABLE_HEIGHT = 200 // Fixed height for non-resizable panels

export const ActivityBar: React.FC<ActivityBarProps> = ({ children, className = '', initialPanelStates, onPanelStatesChange }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [panelStates, setPanelStates] = useState<PanelState[]>([])
  const [resizing, setResizing] = useState<{ panelIndex: number; startY: number; startHeights: [number, number] } | null>(null)
  const initializedRef = useRef(false)
  const panelStatesRef = useRef<PanelState[]>([]) // Track current panel states for event handlers
  const onPanelStatesChangeRef = useRef(onPanelStatesChange) // Track callback ref to avoid effect recreation

  // Initialize panel states only once
  useEffect(() => {
    // Only initialize if not already initialized
    if (initializedRef.current) {
      return
    }

    // Use provided initial states if available
    if (initialPanelStates && initialPanelStates.length > 0) {
      setPanelStates(initialPanelStates)
      initializedRef.current = true
      return
    }

    // Otherwise calculate default states
    const childArray = Children.toArray(children)
    const containerHeight = containerRef.current?.clientHeight || 600

    // Calculate initial heights considering resizability
    let resizableCount = 0
    let nonResizableHeight = 0

    childArray.forEach((child) => {
      if (React.isValidElement<ActivityPanelProps>(child)) {
        const resizable = child.props.resizable !== false
        if (resizable) {
          resizableCount++
        } else {
          nonResizableHeight += FIXED_NON_RESIZABLE_HEIGHT
        }
      }
    })

    const availableForResizable = containerHeight - nonResizableHeight
    const resizableHeight = resizableCount > 0 ? availableForResizable / resizableCount : 0

    const initialStates: PanelState[] = childArray.map((child, index) => {
      const resizable = React.isValidElement<ActivityPanelProps>(child) ? child.props.resizable !== false : true
      return {
        id: `panel-${index}`,
        collapsed: false,
        height: resizable ? resizableHeight : FIXED_NON_RESIZABLE_HEIGHT,
      }
    })

    setPanelStates(initialStates)
    initializedRef.current = true
  }, [children, initialPanelStates])

  // Keep refs in sync with state and props for event handlers
  useEffect(() => {
    panelStatesRef.current = panelStates
  }, [panelStates])

  useEffect(() => {
    onPanelStatesChangeRef.current = onPanelStatesChange
  }, [onPanelStatesChange])

  // Redistribute space when panels collapse/expand
  const redistributeSpace = (newStates: PanelState[], childArray: React.ReactNode[]) => {
    const containerHeight = containerRef.current?.clientHeight || 600

    // Calculate heights for different panel types
    let collapsedHeight = 0
    let nonResizableOpenHeight = 0
    let resizableOpenCount = 0

    newStates.forEach((state, index) => {
      const child = childArray[index]
      const resizable = React.isValidElement<ActivityPanelProps>(child) ? child.props.resizable !== false : true

      if (state.collapsed) {
        collapsedHeight += HEADER_HEIGHT
      } else if (!resizable) {
        nonResizableOpenHeight += FIXED_NON_RESIZABLE_HEIGHT
      } else {
        resizableOpenCount++
      }
    })

    // Calculate available height for resizable open panels
    const availableHeight = containerHeight - collapsedHeight - nonResizableOpenHeight
    const heightPerResizablePanel = resizableOpenCount > 0 ? availableHeight / resizableOpenCount : 0

    // Update heights
    return newStates.map((state, index) => {
      const child = childArray[index]
      const resizable = React.isValidElement<ActivityPanelProps>(child) ? child.props.resizable !== false : true

      if (state.collapsed) {
        return { ...state, height: HEADER_HEIGHT }
      } else if (!resizable) {
        return { ...state, height: FIXED_NON_RESIZABLE_HEIGHT }
      } else {
        return { ...state, height: heightPerResizablePanel }
      }
    })
  }

  const handleToggleCollapse = (index: number) => {
    setPanelStates(prevStates => {
      const newStates = [...prevStates]
      newStates[index] = { ...newStates[index], collapsed: !newStates[index].collapsed }
      const childArray = Children.toArray(children)
      const redistributedStates = redistributeSpace(newStates, childArray)

      // Notify parent of state change
      if (onPanelStatesChangeRef.current) {
        onPanelStatesChangeRef.current(redistributedStates)
      }

      return redistributedStates
    })
  }

  const handleResizeStart = (panelIndex: number, e: React.MouseEvent) => {
    if (panelIndex >= panelStates.length - 1) return // Can't resize last panel
    if (panelStates[panelIndex].collapsed || panelStates[panelIndex + 1].collapsed) return // Can't resize collapsed panels

    e.preventDefault()
    setResizing({
      panelIndex,
      startY: e.clientY,
      startHeights: [panelStates[panelIndex].height, panelStates[panelIndex + 1].height],
    })
  }

  useEffect(() => {
    if (!resizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizing.startY
      const [startHeight1, startHeight2] = resizing.startHeights

      // Calculate new heights
      let newHeight1 = startHeight1 + deltaY
      let newHeight2 = startHeight2 - deltaY

      // Enforce minimum heights
      if (newHeight1 < MIN_PANEL_HEIGHT) {
        newHeight1 = MIN_PANEL_HEIGHT
        newHeight2 = startHeight1 + startHeight2 - MIN_PANEL_HEIGHT
      }
      if (newHeight2 < MIN_PANEL_HEIGHT) {
        newHeight2 = MIN_PANEL_HEIGHT
        newHeight1 = startHeight1 + startHeight2 - MIN_PANEL_HEIGHT
      }

      setPanelStates(prevStates => {
        const newStates = [...prevStates]
        newStates[resizing.panelIndex] = { ...newStates[resizing.panelIndex], height: newHeight1 }
        newStates[resizing.panelIndex + 1] = { ...newStates[resizing.panelIndex + 1], height: newHeight2 }
        return newStates
      })
    }

    const handleMouseUp = () => {
      // Notify parent of final state after resize
      if (onPanelStatesChangeRef.current) {
        onPanelStatesChangeRef.current(panelStatesRef.current)
      }
      setResizing(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizing])

  const childArray = Children.toArray(children)

  return (
    <div
      ref={containerRef}
      className={`activity-bar ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--vscode-editor-background, #1e1e1e)',
        overflow: 'hidden',
      }}
    >
      {childArray.map((child, index) => {
        if (!React.isValidElement<ActivityPanelProps>(child)) return null

        const panelState = panelStates[index]
        if (!panelState) return null

        const { title, collapsible = true, resizable = true, children: panelChildren } = child.props

        return (
          <React.Fragment key={panelState.id}>
            <div
              style={{
                height: `${panelState.height}px`,
                display: 'flex',
                flexDirection: 'column',
                borderBottom: '1px solid var(--vscode-panel-border, #2b2b2b)',
              }}
            >
              {/* Panel Header */}
              <div
                style={{
                  height: `${HEADER_HEIGHT}px`,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  background: 'var(--vscode-sideBarSectionHeader-background, #252526)',
                  color: 'var(--vscode-sideBarSectionHeader-foreground, #ffffff)',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  userSelect: 'none',
                }}
              >
                <span
                  onClick={() => collapsible && handleToggleCollapse(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: collapsible ? 'pointer' : 'default',
                  }}
                >
                  {collapsible && (
                    <VscodeIcon
                      name={panelState.collapsed ? 'chevron-right' : 'chevron-down'}
                      style={{
                        marginRight: '6px',
                      }}
                    />
                  )}
                  {title}
                </span>
              </div>

              {/* Panel Content */}
              {!panelState.collapsed && (
                <div
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    padding: '8px',
                  }}
                >
                  {panelChildren}
                </div>
              )}
            </div>

            {/* Resize Handle */}
            {resizable && index < childArray.length - 1 && !panelState.collapsed && (
              <div
                onMouseDown={(e) => handleResizeStart(index, e)}
                style={{
                  height: '4px',
                  cursor: 'ns-resize',
                  background: 'transparent',
                  position: 'relative',
                  zIndex: 10,
                  marginTop: '-2px',
                  marginBottom: '-2px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--vscode-sash-hoverBorder, #007acc)'
                }}
                onMouseLeave={(e) => {
                  if (!resizing) {
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export const ActivityPanel: React.FC<ActivityPanelProps> = ({ children }) => {
  // This is a marker component - actual rendering is done by ActivityBar
  return <>{children}</>
}

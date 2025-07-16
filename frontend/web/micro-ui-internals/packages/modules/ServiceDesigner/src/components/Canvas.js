import React, { useState, useRef, useEffect, useCallback } from "react";
import { Fragment } from "react";
import { Button } from "@egovernments/digit-ui-components";
import QuickStart from "./QuickStart";
import { useTranslation } from "react-i18next";

const InfiniteCanvas = ({ elements = [], onElementClick, onElementDrag, connections, connecting, canvasPoints, onConnectionLabelClick }) => {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedElement, setDraggedElement] = useState(null);
  const [elementDragStart, setElementDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const viewportRef = useRef(null);

  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.1;

  const handleClick = useCallback((e) => {
    if (!isDragging && !draggedElement) {
      const rect = viewportRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;
      canvasPoints(x, y);
    }
  }, [isDragging, draggedElement, transform]);

  // Handle canvas panning mouse down
  const handleMouseDown = useCallback(
    (e) => {
      if (e.button === 0 && !draggedElement) {
        // Left mouse button and no element is being dragged
        setIsDragging(true);
        setDragStart({
          x: e.clientX - transform.x,
          y: e.clientY - transform.y,
        });
        e.preventDefault();
      }
    },
    [transform, draggedElement]
  );

  // Handle element drag start
  const handleElementMouseDown = useCallback((element, e) => {
    e.stopPropagation(); // Prevent canvas dragging
    if (e.button === 0) {
      setDraggedElement(element);
      const rect = viewportRef.current.getBoundingClientRect();
      setElementDragStart({
        x: (e.clientX - rect.left - transform.x) / transform.scale - element.position.x,
        y: (e.clientY - rect.top - transform.y) / transform.scale - element.position.y,
      });
      e.preventDefault();
    }
  }, [transform]);

  // Handle mouse move for both canvas and element dragging
  const handleMouseMove = useCallback(
    (e) => {
      if (isDragging && !draggedElement) {
        // Canvas panning
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        setTransform((prev) => ({ ...prev, x: newX, y: newY }));
      } else if (draggedElement) {
        // Element dragging
        const rect = viewportRef.current.getBoundingClientRect();
        const newX = (e.clientX - rect.left - transform.x) / transform.scale - elementDragStart.x;
        const newY = (e.clientY - rect.top - transform.y) / transform.scale - elementDragStart.y;
        // Call the drag callback if provided
        if (onElementDrag) {
          onElementDrag(draggedElement, { x: newX, y: newY });
        }
      }
    },
    [isDragging, draggedElement, dragStart, elementDragStart, transform, onElementDrag]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedElement(null);
  }, []);

  // Handle mouse wheel zoom
  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();

      const rect = viewportRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const newScale = Math.min(
        Math.max(transform.scale + delta, MIN_ZOOM),
        MAX_ZOOM
      );

      if (newScale !== transform.scale) {
        // Calculate zoom point to maintain cursor position
        const zoomPointX = (mouseX - transform.x) / transform.scale;
        const zoomPointY = (mouseY - transform.y) / transform.scale;

        const newX = mouseX - zoomPointX * newScale;
        const newY = mouseY - zoomPointY * newScale;

        setTransform({ x: newX, y: newY, scale: newScale });
      }
    },
    [transform]
  );

  // Add event listeners
  useEffect(() => {
    if (isDragging || draggedElement) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, draggedElement, handleMouseMove, handleMouseUp]);

  // Add event listeners
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.addEventListener("wheel", handleWheel, { passive: false });
      return () => viewport.removeEventListener("wheel", handleWheel);
    }
  }, [handleWheel]);

  const zoomToFit = useCallback((e) => {
    if (elements.length === 0) {
      setTransform({ x: 0, y: 0, scale: 1 });
    }
    else {
      const viewport = viewportRef.current.getBoundingClientRect();
      const padding = 50;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      elements.forEach(element => {
        const { x, y } = element.position;
        const elementWidth = 235;
        const elementHeight = 180;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + elementWidth);
        maxY = Math.max(maxY, y + elementHeight);
      });
      // Calculate content dimensions
      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      // Calculate available viewport space
      const availableWidth = viewport.width - padding * 2;
      const availableHeight = viewport.height - padding * 2;
      // Calculate scale to fit content in viewport
      const scaleX = availableWidth / contentWidth;
      const scaleY = availableHeight / contentHeight;
      const scale = Math.min(scaleX, scaleY, 1);
      // Calculate center position
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      // Calculate transform to center the content
      const x = viewport.width / 2 - centerX * scale;
      const y = viewport.height / 2 - centerY * scale;

      setTransform({ x, y, scale });
    }
  }, [elements]);

  // Generate grid pattern
  const generateGrid = () => {
    const gridSize = 50 * transform.scale;
    const offsetX = transform.x % gridSize;
    const offsetY = transform.y % gridSize;

    return (
      <defs>
        <pattern
          id="grid"
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
            opacity="0.5"
          />
        </pattern>
      </defs>
    );
  };

  // Handle element click
  const handleElementClick = useCallback((element, e) => {
    e.stopPropagation(); // Prevent canvas click
    if (onElementClick && !draggedElement) {
      onElementClick(element);
    }
  }, [onElementClick, draggedElement]);

  // Handle connection label click
  const handleConnectionLabelClick = useCallback((connection, e) => {
    e.stopPropagation(); // Prevent canvas click
    if (onConnectionLabelClick) {
      onConnectionLabelClick(connection);
    }
  }, [onConnectionLabelClick]);

  return (
    <div className="canvas-container">
      <div className="canvas-buttons">
        <Button
          variation="secondary"
          label={t("ZOOM_TO_FIT")}
          type="button"
          style={{ width: "25%", margin: "0 8px" }}
          onClick={zoomToFit}
        />
        <Button
          variation="secondary"
          label={t("LOAD_SAMPLE")}
          type="button"
          style={{ width: "25%", margin: "0 8px" }}
          onClick={zoomToFit}
        />
      </div>
      <div className="canvas-child">
        <div
          ref={viewportRef}
          className="viewport"
          onMouseDown={handleMouseDown}
          onClick={handleClick}
          style={{
            cursor: isDragging ? "grabbing" : draggedElement ? "grabbing" : "grab"
          }}
        >
          {/* Grid Background */}
          <svg className="canvas-overlay">
            {generateGrid()}
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          <div
            ref={canvasRef}
            className="canvas"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: "0 0",
              transition: isDragging || draggedElement ? "none" : "transform 0.1s ease-out",
            }}
          >
            <svg className="canvas-non-overlay">
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                </marker>
              </defs>

              {connecting && (() => {
                const fromEl = elements.find(el => el.id === connecting.from);
                if (!fromEl) return null;

                const fromX = fromEl.position.x + 225;
                const fromY = fromEl.position.y + 90;

                return (
                  <line
                    x1={fromX}
                    y1={fromY}
                    x2={connecting.x2}
                    y2={connecting.y2}
                    stroke="#6b7280"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })()}


              {connections.map((conn, idx) => {
                const fromEl = elements.find((el) => el.id === conn.from);
                const toEl = elements.find((el) => el.id === conn.to);

                if (!fromEl || !toEl) return null;

                const fromX = fromEl.position.x + 225; 
                const fromY = fromEl.position.y + 90; 
                const toX = toEl.position.x + 10;
                const toY = toEl.position.y + 90;

                const midX = (fromX + toX) / 2;
                const midY = (fromY + toY) / 2;

                return (
                  <g key={idx}>
                    <line
                      x1={fromX}
                      y1={fromY}
                      x2={toX}
                      y2={toY}
                      stroke="#6b7280"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                    />

                    {conn.label && (
                      <g>
                        <rect
                          x={midX - (conn.label.length * 6)}
                          y={midY - 12}
                          width={conn.label.length * 12}
                          height={24}
                          fill="white"
                          stroke="#e2e8f0"
                          strokeWidth="1"
                          rx="4"
                          style={{ cursor: 'pointer', pointerEvents: 'all' }}
                          onClick={(e) => {
                            e.stopPropagation(); 
                            handleConnectionLabelClick(conn, e);
                          }}
                        />
                        <text
                          x={midX}
                          y={midY + 4}
                          textAnchor="middle"
                          fontSize="20"
                          fill="#374151"
                          fontWeight="500"
                          style={{
                            pointerEvents: 'none',
                            userSelect: 'none'
                          }}
                        >
                          {conn.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            <div
              className="interactive-canvas-container"
            >
              {elements.length === 0 ? (
                <div
                  style={{
                    position: "absolute",
                    left: 300,
                    top: 250,
                    zIndex: 5,
                    pointerEvents: "all"
                  }}
                >
                  <QuickStart />
                </div>
              ) : (
                elements.map((element) => (
                  <div
                    key={element.id}
                    style={{
                      position: "absolute",
                      left: element.position.x,
                      top: element.position.y,
                      zIndex: 10,
                      cursor: draggedElement?.id === element.id ? "grabbing" : "grab",
                      opacity: draggedElement?.id === element.id ? 0.7 : 1,
                      transition: draggedElement?.id === element.id ? "none" : "opacity 0.2s ease",
                      pointerEvents: "all"
                    }}
                    onMouseDown={(e) => handleElementMouseDown(element, e)}
                    onClick={(e) => handleElementClick(element, e)}
                  >
                    {element.component}
                  </div>
                )))
                }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfiniteCanvas;
import React, { useState, useEffect } from 'react';
import { Play, Square, Target, MapPin, RotateCcw, Zap } from 'lucide-react';
import './App.css';

const PathfindingVisualizer = () => {
  //const GRID_SIZE = 15;
  const [grid, setGrid] = useState([]);
  const [startPos, setStartPos] = useState(null);
  const [endPos, setEndPos] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [gridSize, setGridSize] = useState(20)
  const [drawMode, setDrawMode] = useState('wall'); // 'wall', 'start', 'end'
  const [algorithm, setAlgorithm] = useState('dijkstra');
  const [isRunning, setIsRunning] = useState(false);
  const [statistics, setStatistics] = useState({
    pathLength: 0,
    nodesVisited: 0,
    timeTaken: 0,
    algorithmName: ''
  });

  // Initialize grid
  useEffect(() => {
    const newGrid = [];
    for (let row = 0; row < gridSize; row++) {
      const currentRow = [];
      for (let col = 0; col < gridSize; col++) {
        currentRow.push({
          row,
          col,
          isWall: false,
          isStart: false,
          isEnd: false,
          isPath: false,
          isVisited: false,
          distance: Infinity,
          previousNode: null,
        });
      }
      newGrid.push(currentRow);
    }
    setGrid(newGrid);
    setStartPos(null);
    setEndPos(null);
  }, [gridSize]);

  const getCellType = (node) => {
    if (node.isStart) return 'start';
    if (node.isEnd) return 'end';
    if (node.isWall) return 'wall';
    if (node.isPath) return 'path';
    if (node.isVisited) return 'visited';
    return 'empty';
  };

  const handleMouseDown = (row, col) => {
    if (isRunning) return;
    setIsDrawing(true);
    handleCellClick(row, col);
  };

  const handleMouseEnter = (row, col) => {
    if (!isDrawing || isRunning) return;
    if (drawMode === 'wall') {
      handleCellClick(row, col);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleCellClick = (row, col) => {
    if (isRunning) return;

    const newGrid = [...grid];
    const node = newGrid[row][col];

    if (drawMode === 'start') {
      // Clear previous start
      if (startPos) {
        newGrid[startPos.row][startPos.col].isStart = false;
      }
      node.isStart = true;
      node.isWall = false;
      node.isEnd = false;
      setStartPos({ row, col });
    } else if (drawMode === 'end') {
      // Clear previous end
      if (endPos) {
        newGrid[endPos.row][endPos.col].isEnd = false;
      }
      node.isEnd = true;
      node.isWall = false;
      node.isStart = false;
      setEndPos({ row, col });
    } else if (drawMode === 'wall') {
      if (!node.isStart && !node.isEnd) {
        node.isWall = !node.isWall;
      }
    }

    setGrid(newGrid);
  };

  const clearGrid = () => {
    if (isRunning) return;
    
    const newGrid = grid.map(row => 
      row.map(node => ({
        ...node,
        isWall: false,
        isPath: false,
        isVisited: false,
        distance: Infinity,
        previousNode: null,
      }))
    );
    setGrid(newGrid);
    setStatistics({ pathLength: 0, nodesVisited: 0, executionTime: 0, algorithmName: '' });
  };

  const clearPath = () => {
    if (isRunning) return;
    
    const newGrid = grid.map(row => 
      row.map(node => ({
        ...node,
        isPath: false,
        isVisited: false,
        distance: Infinity,
        previousNode: null,
      }))
    );
    setGrid(newGrid);
    setStatistics({ pathLength: 0, nodesVisited: 0, executionTime: 0, algorithmName: '' });
  };

  const runPathfinding = async () => {
    if (!startPos || !endPos || isRunning) return;

    setIsRunning(true);
    clearPath();

    try {
      const response = await fetch('https://pathfinding-backend.onrender.com/pathfind', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grid: grid.map(row => row.map(cell => ({
            row: cell.row,
            col: cell.col,
            isWall: cell.isWall,
          }))),
          start: startPos,
          end: endPos,
          algorithm: algorithm,
          gridSize: gridSize,
        }),
      });

      const result = await response.json();
      console.log('Pathfinding result:', result); // Debug log

      if (result.success) {
        setStatistics({
          pathLength: result.path.length,
          nodesVisited: result.visitedNodes.length,
          timeTaken: Math.round(result.executionTime*100)/100,
          algorithmName: algorithm
        });
        // Animate visited nodes
        for (let i = 0; i < result.visitedNodes.length; i++) {
          setTimeout(() => {
            const node = result.visitedNodes[i];
            setGrid(prevGrid => {
              const newGrid = [...prevGrid];
              newGrid[node.row][node.col].isVisited = true;
              return newGrid;
            });
          }, i * 10);
        }

        // Animate path
        setTimeout(() => {
          if (result.path && result.path.length > 0) {
            for (let i = 0; i < result.path.length; i++) {
              setTimeout(() => {
                const node = result.path[i];
                setGrid(prevGrid => {
                  const newGrid = [...prevGrid];
                  if (!newGrid[node.row][node.col].isStart && !newGrid[node.row][node.col].isEnd) {
                    newGrid[node.row][node.col].isPath = true;
                    newGrid[node.row][node.col].isVisited = false; // Override visited styling
                  }
                  return newGrid;
                });
              }, i * 50);
            }
          }
        }, result.visitedNodes.length * 10 + 500);
      }
    } catch (error) {
      console.error('Error running pathfinding:', error);
      alert('Error: Make sure the Go backend is running on localhost:8080');
    }

    setIsRunning(false);
  };

  return (
    <div className="app">
      <div className="container">
        <h1 className="title">PATHFINDER</h1>

        {/* Controls */}
        <div className="controls">
          <div className="control-row">
            <div className="control-group">
              <label>Algorithm:</label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                disabled={isRunning}
              >
                <option value="dijkstra">Dijkstra's Algorithm</option>
                <option value="astar">A* Algorithm</option>
                <option value="bfs">Breadth-First Search</option>
              </select>
            </div>

            <div className="control-group">
              <label>Grid Size:</label>
              <select
                value={gridSize}
                onChange={(e) => setGridSize(parseInt(e.target.value))}
                disabled={isRunning}
              >
                <option value={15}>15x15 (Small)</option>
                <option value={20}>20x20 (Medium)</option>
                <option value={25}>25x25 (Default)</option>
                <option value={30}>30x30 (Large)</option>
                <option value={40}>40x40 (Extra Large)</option>
              </select>
            </div>

            <div className="control-group">
              <label>Draw Mode:</label>
              <div className="button-group">
                <button
                  onClick={() => setDrawMode('wall')}
                  className={`mode-btn ${drawMode === 'wall' ? 'active wall-mode' : ''}`}
                  disabled={isRunning}
                >
                  <Square size={16} />
                  Walls
                </button>
                <button
                  onClick={() => setDrawMode('start')}
                  className={`mode-btn ${drawMode === 'start' ? 'active start-mode' : ''}`}
                  disabled={isRunning}
                >
                  <MapPin size={16} />
                  Start
                </button>
                <button
                  onClick={() => setDrawMode('end')}
                  className={`mode-btn ${drawMode === 'end' ? 'active end-mode' : ''}`}
                  disabled={isRunning}
                >
                  <Target size={16} />
                  End
                </button>
              </div>
            </div>
          </div>

          <div className="action-buttons">
            <button
              onClick={runPathfinding}
              disabled={!startPos || !endPos || isRunning}
              className="btn primary"
            >
              <Play size={16} />
              {isRunning ? 'Running...' : 'Find Path'}
            </button>
            
            <button
              onClick={clearPath}
              disabled={isRunning}
              className="btn secondary"
            >
              <Zap size={16} />
              Clear Path
            </button>

            <button
              onClick={clearGrid}
              disabled={isRunning}
              className="btn danger"
            >
              <RotateCcw size={16} />
              Clear Grid
            </button>
          </div>

          {/* Legend */}
          <div className="legend">
            <div className="legend-item">
              <div className="legend-color start-color"></div>
              <span>Start Node</span>
            </div>
            <div className="legend-item">
              <div className="legend-color end-color"></div>
              <span>End Node</span>
            </div>
            <div className="legend-item">
              <div className="legend-color wall-color"></div>
              <span>Wall</span>
            </div>
            <div className="legend-item">
              <div className="legend-color visited-color"></div>
              <span>Visited</span>
            </div>
            <div className="legend-item">
              <div className="legend-color path-color"></div>
              <span>Shortest Path</span>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {statistics.pathLength > 0 && (
          <div className="statistics">
            <h3>Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Algorithm:</span>
                <span className="stat-value">{statistics.algorithmName.toUpperCase()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Path Length:</span>
                <span className="stat-value">{statistics.pathLength} nodes</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Nodes Visited:</span>
                <span className="stat-value">{statistics.nodesVisited}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Execution Time:</span>
                <span className="stat-value">{statistics.executionTime}ms</span>
              </div>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid-container">
          <div 
            className="grid"
            data-size={gridSize}
            onMouseLeave={() => setIsDrawing(false)}
          >
            {grid.map((row, rowIdx) => (
              <div key={rowIdx} className="grid-row">
                {row.map((node, nodeIdx) => {
                  const cellType = getCellType(node);
                  return (
                    <div
                      key={`${rowIdx}-${nodeIdx}`}
                      className={`grid-cell ${cellType}`}
                      onMouseDown={() => handleMouseDown(rowIdx, nodeIdx)}
                      onMouseEnter={() => handleMouseEnter(rowIdx, nodeIdx)}
                      onMouseUp={handleMouseUp}
                    >
                      {node.isStart && <MapPin size={12} />}
                      {node.isEnd && <Target size={12} />}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {/* <div className="grid-instructions">
            Click and drag to draw walls. Use the buttons above to place start and end points.
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default PathfindingVisualizer;
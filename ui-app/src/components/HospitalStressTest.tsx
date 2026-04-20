import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios, { AxiosError, CanceledError } from 'axios';
import { hospitals, Hospital } from '../data/hospitals';
import './HospitalStressTest.css';

// API base URL - pointing to local mock server
const API_BASE_URL = 'http://localhost:3001/hospitals/v1/data';

interface RequestStatus {
  status: 'idle' | 'pending' | 'success' | 'error';
  message: string;
  timestamp?: Date;
  duration?: number;
}

interface Stats {
  urlLength: number;
  pathLength: number;
  selectedCount: number;
  estimatedHeaderSize: number;
}

const HospitalStressTest: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [requestStatus, setRequestStatus] = useState<RequestStatus>({
    status: 'idle',
    message: 'No request sent yet'
  });
  const [stats, setStats] = useState<Stats>({
    urlLength: 0,
    pathLength: 0,
    selectedCount: 0,
    estimatedHeaderSize: 0
  });
  const [autoRequest, setAutoRequest] = useState<boolean>(true);
  const [requestHistory, setRequestHistory] = useState<RequestStatus[]>([]);
  const [customSelectCount, setCustomSelectCount] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Build the URL with IDs in the path
  const buildUrl = useCallback((ids: number[]): string => {
    if (ids.length === 0) {
      return `${API_BASE_URL}/details`;
    }
    const idsPath = ids.join(',');
    return `${API_BASE_URL}/${idsPath}/details`;
  }, []);

  // Calculate stats
  const calculateStats = useCallback((ids: Set<number>): Stats => {
    const idsArray = Array.from(ids);
    const url = buildUrl(idsArray);
    const pathOnly = url.replace(/^https?:\/\/[^/]+/, '');
    
    return {
      urlLength: url.length,
      pathLength: pathOnly.length,
      selectedCount: ids.size,
      // Estimate header size: :path pseudo-header + other standard headers
      estimatedHeaderSize: pathOnly.length + 200 // ~200 bytes for other headers
    };
  }, [buildUrl]);

  // Make the API request
  const makeRequest = useCallback(async (ids: number[]) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (ids.length === 0) {
      setRequestStatus({
        status: 'idle',
        message: 'No hospitals selected'
      });
      return;
    }

    const url = buildUrl(ids);
    const startTime = Date.now();

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    setRequestStatus({
      status: 'pending',
      message: `Sending request with ${ids.length} hospital IDs...`,
      timestamp: new Date()
    });

    try {
      console.log(`[Stress Test] Making request with URL length: ${url.length}`);
      console.log(`[Stress Test] Path: ${url.substring(0, 100)}...`);
      console.log(`[Stress Test] Payload size: ${JSON.stringify({ hospitalIds: ids }).length} bytes`);

      const response = await axios.post(url, {
        hospitalIds: ids
      }, {
        signal: abortControllerRef.current.signal,
        timeout: 30000, // 30 second timeout
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Stress-Test': 'true',
          'X-Selected-Count': ids.length.toString()
        }
      });

      const duration = Date.now() - startTime;
      const successStatus: RequestStatus = {
        status: 'success',
        message: `✓ Request successful! Status: ${response.status} | Duration: ${duration}ms`,
        timestamp: new Date(),
        duration
      };
      
      setRequestStatus(successStatus);
      setRequestHistory(prev => [successStatus, ...prev].slice(0, 10));

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof CanceledError) {
        // Request was cancelled, don't update status
        return;
      }

      let errorMessage = 'Unknown error occurred';
      let errorDetails = '';

      if (error instanceof AxiosError) {
        if (error.code === 'ERR_NETWORK') {
          errorMessage = '🔴 Network Error - Server may have rejected the request';
          errorDetails = 'Request payload might be too large for the server to handle';
        } else if (error.response) {
          errorMessage = `🔴 Server Error: ${error.response.status} ${error.response.statusText}`;
          errorDetails = `Response: ${JSON.stringify(error.response.data).substring(0, 100)}`;
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = '🔴 Request Timeout';
          errorDetails = 'Server took too long to respond';
        } else {
          errorMessage = `🔴 Request Failed: ${error.message}`;
        }
      } else if (error instanceof Error) {
        // Check for browser URL limit errors
        if (error.message.includes('URI') || error.message.includes('URL')) {
          errorMessage = '🔴 URL TOO LONG - Browser/System Limit Reached!';
          errorDetails = error.message;
        } else {
          errorMessage = `🔴 Error: ${error.message}`;
        }
      }

      const errorStatus: RequestStatus = {
        status: 'error',
        message: `${errorMessage}${errorDetails ? ` | ${errorDetails}` : ''} | Duration: ${duration}ms`,
        timestamp: new Date(),
        duration
      };

      setRequestStatus(errorStatus);
      setRequestHistory(prev => [errorStatus, ...prev].slice(0, 10));

      console.error('[Stress Test] Request failed:', error);
    }
  }, [buildUrl]);

  // Update stats and trigger request when selection changes
  useEffect(() => {
    const newStats = calculateStats(selectedIds);
    setStats(newStats);

    if (autoRequest) {
      // Debounce the request slightly
      const timer = setTimeout(() => {
        makeRequest(Array.from(selectedIds));
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [selectedIds, calculateStats, autoRequest, makeRequest]);

  // Handle individual checkbox toggle
  const handleToggle = (hospitalId: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hospitalId)) {
        newSet.delete(hospitalId);
      } else {
        newSet.add(hospitalId);
      }
      return newSet;
    });
  };

  // Handle Select All
  const handleSelectAll = () => {
    const allIds = new Set(hospitals.map(h => h.hospitalID));
    setSelectedIds(allIds);
  };

  // Handle Deselect All
  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Handle Select First N
  const handleSelectFirstN = (n: number) => {
    const firstNIds = new Set(hospitals.slice(0, n).map(h => h.hospitalID));
    setSelectedIds(firstNIds);
  };

  // Manual request trigger
  const handleManualRequest = () => {
    makeRequest(Array.from(selectedIds));
  };

  // Get status color class
  const getStatusClass = (status: RequestStatus['status']): string => {
    switch (status) {
      case 'success': return 'status-success';
      case 'error': return 'status-error';
      case 'pending': return 'status-pending';
      default: return 'status-idle';
    }
  };

  // Format URL for display
  const getDisplayUrl = (): string => {
    const url = buildUrl(Array.from(selectedIds));
    if (url.length > 150) {
      return url.substring(0, 75) + '...' + url.substring(url.length - 75);
    }
    return url;
  };

  return (
    <div className="stress-test-container">
      <header className="header">
        <h1>🏥 URL Path Limit Stress Test</h1>
        <p className="subtitle">
          Testing server URL path and header limits with hospital IDs
        </p>
      </header>

      {/* Stats Dashboard */}
      <section className="stats-dashboard">
        <div className="stat-card primary">
          <span className="stat-label">URL Length</span>
          <span className="stat-value">{stats.urlLength.toLocaleString()}</span>
          <span className="stat-unit">characters</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Path Length</span>
          <span className="stat-value">{stats.pathLength.toLocaleString()}</span>
          <span className="stat-unit">characters</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Selected</span>
          <span className="stat-value">{stats.selectedCount}</span>
          <span className="stat-unit">/ {hospitals.length} hospitals</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Est. Header Size</span>
          <span className="stat-value">{stats.estimatedHeaderSize.toLocaleString()}</span>
          <span className="stat-unit">bytes</span>
        </div>
      </section>

      {/* URL Preview */}
      <section className="url-preview">
        <h3>Current URL Preview</h3>
        <code className="url-display">{getDisplayUrl()}</code>
      </section>

      {/* Request Status */}
      <section className={`request-status ${getStatusClass(requestStatus.status)}`}>
        <div className="status-header">
          <h3>Request Status</h3>
          {requestStatus.status === 'pending' && <span className="spinner"></span>}
        </div>
        <p className="status-message">{requestStatus.message}</p>
        {requestStatus.timestamp && (
          <span className="status-time">
            {requestStatus.timestamp.toLocaleTimeString()}
          </span>
        )}
      </section>

      {/* Controls */}
      <section className="controls">
        <div className="control-group">
          <h3>Quick Select</h3>
          <div className="button-row">
            <button onClick={handleSelectAll} className="btn btn-primary">
              ✓ Select All ({hospitals.length})
            </button>
            <button onClick={handleDeselectAll} className="btn btn-secondary">
              ✗ Deselect All
            </button>
          </div>
          <div className="button-row custom-select-row">
            <input
              type="number"
              className="custom-select-input"
              placeholder="Enter number..."
              value={customSelectCount}
              onChange={(e) => setCustomSelectCount(e.target.value)}
              min="0"
              max={hospitals.length}
            />
            <button
              onClick={() => {
                const num = parseInt(customSelectCount, 10);
                if (!isNaN(num) && num >= 0 && num <= hospitals.length) {
                  handleSelectFirstN(num);
                }
              }}
              className="btn btn-primary"
              disabled={!customSelectCount || isNaN(parseInt(customSelectCount, 10))}
            >
              Select First {customSelectCount || '?'}
            </button>
          </div>
          <div className="button-row">
            <button onClick={() => handleSelectFirstN(100)} className="btn btn-outline">
              First 100
            </button>
            <button onClick={() => handleSelectFirstN(500)} className="btn btn-outline">
              First 500
            </button>
            <button onClick={() => handleSelectFirstN(1000)} className="btn btn-outline">
              First 1000
            </button>
            <button onClick={() => handleSelectFirstN(2000)} className="btn btn-outline">
              First 2000
            </button>
          </div>
          <div className="button-row">
            <button onClick={() => handleSelectFirstN(1050)} className="btn btn-outline">
              1050
            </button>
            <button onClick={() => handleSelectFirstN(1100)} className="btn btn-outline">
              1100
            </button>
            <button onClick={() => handleSelectFirstN(1150)} className="btn btn-outline">
              1150
            </button>
            <button onClick={() => handleSelectFirstN(1200)} className="btn btn-outline">
              1200
            </button>
            <button onClick={() => handleSelectFirstN(1250)} className="btn btn-outline">
              1250
            </button>
            <button onClick={() => handleSelectFirstN(1300)} className="btn btn-outline">
              1300
            </button>
            <button onClick={() => handleSelectFirstN(1350)} className="btn btn-outline">
              1350
            </button>
            <button onClick={() => handleSelectFirstN(1400)} className="btn btn-outline">
              1400
            </button>
          </div>
          <div className="button-row">
            <button onClick={() => handleSelectFirstN(1450)} className="btn btn-outline">
              1450
            </button>
            <button onClick={() => handleSelectFirstN(1500)} className="btn btn-outline">
              1500
            </button>
            <button onClick={() => handleSelectFirstN(1550)} className="btn btn-outline">
              1550
            </button>
            <button onClick={() => handleSelectFirstN(1600)} className="btn btn-outline">
              1600
            </button>
            <button onClick={() => handleSelectFirstN(1650)} className="btn btn-outline">
              1650
            </button>
            <button onClick={() => handleSelectFirstN(1700)} className="btn btn-outline">
              1700
            </button>
            <button onClick={() => handleSelectFirstN(1750)} className="btn btn-outline">
              1750
            </button>
            <button onClick={() => handleSelectFirstN(1800)} className="btn btn-outline">
              1800
            </button>
          </div>
          <div className="button-row">
            <button onClick={() => handleSelectFirstN(1850)} className="btn btn-outline">
              1850
            </button>
            <button onClick={() => handleSelectFirstN(1900)} className="btn btn-outline">
              1900
            </button>
            <button onClick={() => handleSelectFirstN(1950)} className="btn btn-outline">
              1950
            </button>
            <button onClick={() => handleSelectFirstN(2000)} className="btn btn-outline">
              2000
            </button>
          </div>
        </div>

        <div className="control-group">
          <h3>Request Options</h3>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={autoRequest}
              onChange={(e) => setAutoRequest(e.target.checked)}
            />
            Auto-send request on selection change
          </label>
          {!autoRequest && (
            <button onClick={handleManualRequest} className="btn btn-primary">
              🚀 Send Request Now
            </button>
          )}
        </div>
      </section>

      {/* Hospital List */}
      <section className="hospital-section">
        <h3>Hospital Selection ({stats.selectedCount} selected)</h3>
        <div className="hospital-list">
          {hospitals.map((hospital: Hospital, index: number) => (
            <label
              key={hospital.hospitalID}
              className={`hospital-item ${selectedIds.has(hospital.hospitalID) ? 'selected' : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(hospital.hospitalID)}
                onChange={() => handleToggle(hospital.hospitalID)}
              />
              <span className="hospital-index">#{index + 1}</span>
              <span className="hospital-id">{hospital.hospitalID}</span>
              <span className="hospital-name">{hospital.name}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Request History */}
      {requestHistory.length > 0 && (
        <section className="request-history">
          <h3>Request History (Last 10)</h3>
          <ul>
            {requestHistory.map((req, index) => (
              <li key={index} className={getStatusClass(req.status)}>
                <span className="history-time">
                  {req.timestamp?.toLocaleTimeString()}
                </span>
                <span className="history-message">{req.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Limits Reference */}
      <section className="limits-reference">
        <h3>📊 Known URL/Header Limits Reference</h3>
        <table>
          <thead>
            <tr>
              <th>Component</th>
              <th>Limit</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Chrome/Edge</td>
              <td>~2MB</td>
              <td>Practical limit for URL bar</td>
            </tr>
            <tr>
              <td>Firefox</td>
              <td>~65,536</td>
              <td>65KB URL length limit</td>
            </tr>
            <tr>
              <td>Safari</td>
              <td>~80,000</td>
              <td>~80KB URL limit</td>
            </tr>
            <tr>
              <td>IIS</td>
              <td>16,384</td>
              <td>Default maxUrl setting</td>
            </tr>
            <tr>
              <td>Apache</td>
              <td>8,190</td>
              <td>Default LimitRequestLine</td>
            </tr>
            <tr>
              <td>Nginx</td>
              <td>8,192</td>
              <td>Default large_client_header_buffers</td>
            </tr>
            <tr>
              <td>HTTP/2 :path</td>
              <td>~16KB</td>
              <td>Depends on HPACK settings</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default HospitalStressTest;

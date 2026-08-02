import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api/client';

const isSecureCameraContext = () => {
  if (typeof window === 'undefined') return true;
  return window.isSecureContext || ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
};

const SecurityQRScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [insideVisitors, setInsideVisitors] = useState([]);
  const [insideLoading, setInsideLoading] = useState(false);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraNotice, setCameraNotice] = useState('');
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const fileScannerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup: stop scanner when component unmounts
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error('Error stopping scanner:', err));
      }
    };
  }, []);

  useEffect(() => {
    loadInsideVisitors();
    primeCameraInfo();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('scan') === '1') {
      setCameraNotice('Tap Start Camera Scanner to open the camera permission prompt.');
    }
  }, []);

  const waitForScannerElement = async () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      if (scannerRef.current) return scannerRef.current;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return null;
  };

  const primeCameraInfo = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraNotice('This browser does not expose camera access. Use Chrome/Safari or scan from a saved QR photo.');
      return;
    }

    if (!isSecureCameraContext()) {
      setCameraNotice('Camera scanning requires HTTPS on phones. Open this site with https:// or use localhost during development.');
      return;
    }

    if (navigator.permissions?.query) {
      try {
        const permission = await navigator.permissions.query({ name: 'camera' });
        if (permission.state === 'denied') {
          setCameraNotice('Camera permission is blocked for this site. Enable it from browser site settings, then tap Start Camera Scanner again.');
        }
        permission.onchange = () => {
          if (permission.state === 'denied') {
            setCameraNotice('Camera permission is blocked for this site. Enable it from browser site settings, then tap Start Camera Scanner again.');
          } else {
            setCameraNotice('');
          }
        };
      } catch (err) {
        // Safari may not support camera permission querying. The real prompt still opens from getUserMedia.
      }
    }

    try {
      const cameras = await Html5Qrcode.getCameras();
      setCameraDevices(cameras || []);
      const backCamera = (cameras || []).find(camera => /back|rear|environment/i.test(camera.label));
      setSelectedCameraId((backCamera || cameras?.[0])?.id || '');
    } catch (err) {
      // Device labels/camera list can be hidden until the user grants permission.
    }
  };

  const loadInsideVisitors = async () => {
    setInsideLoading(true);
    try {
      const response = await api.get('/requests/gate/inside-visitors');
      setInsideVisitors(response.data?.data || []);
    } catch (err) {
      console.error('Error loading inside visitors:', err);
    } finally {
      setInsideLoading(false);
    }
  };

  const startScanning = async () => {
    try {
      setError('');
      setResult(null);
      setStartingCamera(true);
      setScanning(true);
      
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser cannot open the camera. Please use Chrome on Android, Safari on iPhone, or scan from a QR photo.');
        setScanning(false);
        return;
      }

      if (!isSecureCameraContext()) {
        setError('Camera access is blocked because this page is not running on HTTPS. Open the staff portal with https:// on phones, then try again.');
        setScanning(false);
        return;
      }

      const scannerElement = await waitForScannerElement();
      if (!scannerElement) {
        setError('Scanner could not open. Please refresh the page and try again.');
        setScanning(false);
        return;
      }

      if (html5QrCodeRef.current?.isScanning) {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      }

      const html5QrCode = new Html5Qrcode(scannerElement.id, { verbose: false });
      html5QrCodeRef.current = html5QrCode;

      const cameras = cameraDevices.length ? cameraDevices : await Html5Qrcode.getCameras().catch(() => []);
      if (cameras.length) {
        setCameraDevices(cameras);
        const backCamera = cameras.find(camera => /back|rear|environment/i.test(camera.label));
        if (!selectedCameraId) setSelectedCameraId((backCamera || cameras[0]).id);
      }

      const cameraConfig = selectedCameraId
        ? { deviceId: { exact: selectedCameraId } }
        : { facingMode: { ideal: 'environment' } };
      const fallbackConfig = { facingMode: 'environment' };
      const qrboxSize = (viewfinderWidth, viewfinderHeight) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const size = Math.max(220, Math.floor(minEdge * 0.72));
        return { width: size, height: size };
      };
      const scannerConfig = {
        fps: 12,
        qrbox: qrboxSize,
        aspectRatio: 1,
        disableFlip: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        videoConstraints: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      try {
        await html5QrCode.start(
          cameraConfig,
          scannerConfig,
          (decodedText) => {
            // QR code scanned successfully
            handleQRScan(decodedText);
          },
          (errorMessage) => {
            // Ignore scanning errors (they're frequent while scanning)
            // Only log if it's a critical error
            if (errorMessage.includes('NotFoundException') || errorMessage.includes('NotAllowedError')) {
              console.warn('Camera scanning error:', errorMessage);
            }
          }
        );
        
        setScanning(true);
        setCameraNotice('');
      } catch (cameraErr) {
        // If back camera fails, try user-facing camera (front camera)
        if (
          cameraErr.name === 'OverconstrainedError' ||
          cameraErr.name === 'NotFoundError' ||
          cameraErr.message?.includes('Requested device not found')
        ) {
          try {
            await html5QrCode.start(
              fallbackConfig,
              scannerConfig,
              (decodedText) => {
                handleQRScan(decodedText);
              },
              (errorMessage) => {
                // Ignore scanning errors
              }
            );
            setScanning(true);
            setCameraNotice('');
          } catch (fallbackErr) {
            // Both cameras failed
            throw fallbackErr;
          }
        } else {
          throw cameraErr;
        }
      }
    } catch (err) {
      console.error('Camera error:', err);
      let errorMessage = 'Could not access camera. ';
      
      if (err.name === 'NotAllowedError' || err.message?.includes('permission')) {
        errorMessage += 'Please allow camera access in your browser settings and try again.';
      } else if (err.name === 'NotFoundError' || err.message?.includes('not found')) {
        errorMessage += 'No camera found on this device. Please use manual entry instead.';
      } else if (err.name === 'NotReadableError' || err.message?.includes('not readable')) {
        errorMessage += 'Camera is being used by another application. Please close other apps and try again.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage += 'Camera does not support the required settings. Please use manual entry instead.';
      } else {
        errorMessage += 'Please check your browser permissions or use manual entry instead.';
      }
      
      setError(errorMessage);
      setScanning(false);
      
      // Clean up if scanner was partially initialized
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          await html5QrCodeRef.current.clear();
        } catch (cleanupErr) {
          console.error('Error cleaning up scanner:', cleanupErr);
        }
        html5QrCodeRef.current = null;
      }
    } finally {
      setStartingCamera(false);
    }
  };

  const stopScanning = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      }
      setScanning(false);
      setStartingCamera(false);
    } catch (err) {
      console.error('Error stopping scanner:', err);
      setScanning(false);
      setStartingCamera(false);
    }
  };

  const handleScanFromImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);
    try {
      if (html5QrCodeRef.current?.isScanning) {
        await stopScanning();
      }
      const scannerId = fileScannerRef.current?.id || scannerRef.current?.id || 'qr-file-reader';
      const html5QrCode = html5QrCodeRef.current || new Html5Qrcode(scannerId, { verbose: false });
      html5QrCodeRef.current = html5QrCode;
      const decodedText = await html5QrCode.scanFile(file, true);
      await verifyQRCode(decodedText);
    } catch (err) {
      console.error('QR image scan error:', err);
      setError('Could not read a QR code from this image. Please take a clearer photo or use manual entry.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleQRScan = (qrData) => {
    // Stop scanning once QR is detected
    stopScanning();
    // Verify the QR code
    verifyQRCode(qrData);
  };

  const verifyQRCode = async (qrData, action = 'entry') => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/requests/verify-qr', {
        qrData,
        action
      });
      
      if (response.data.success) {
        const nextResult = {
          ...response.data,
          request: response.data.request
            ? { ...response.data.request, qrData }
            : response.data.request
        };
        setResult(nextResult);
        loadInsideVisitors();
        stopScanning();
      } else {
        setError(response.data.message || 'Verification failed');
        setResult(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error verifying QR code');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualVerify = async () => {
    if (!manualCode.trim()) {
      setError('Please enter QR code data');
      return;
    }
    await verifyQRCode(manualCode.trim());
  };

  const handleManualRequestId = async () => {
    if (!manualCode.trim()) {
      setError('Please enter request ID');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Don't specify type - backend will try both leave and visit automatically
      const requestId = manualCode.trim();
      const response = await api.get(`/requests/verify-qr/${requestId}`);
      
      if (response.data.success && response.data.request) {
        // Transform GET response to match POST verification response structure
        const transformedResult = {
          success: true,
          valid: true,
          message: 'Request found and verified',
          request: {
            requestId: response.data.request.requestId,
            type: response.data.request.type,
            student: response.data.request.student,
            parent: response.data.request.parent,
            qrData: null, // Not available from GET endpoint
            visitDetails: response.data.request.type === 'visit' ? {
              visitType: response.data.details.visitType,
              approvedDate: response.data.details.approvedDate,
              approvedStartTime: response.data.details.approvedStartTime,
              approvedEndTime: response.data.details.approvedEndTime,
              approvedVenue: response.data.details.approvedVenue,
              entryTime: response.data.request.qrPass?.entryTime,
              exitTime: response.data.request.qrPass?.exitTime
            } : null,
            leaveDetails: response.data.request.type === 'leave' ? {
              leaveType: response.data.details.leaveType,
              startDate: response.data.details.startDate,
              endDate: response.data.details.endDate,
              reason: response.data.details.reason
            } : null
          },
          manual: true
        };
        
        setResult(transformedResult);
      } else {
        setError(response.data.message || 'Request verification failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Request not found. Please check the request ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutVisitor = async (visitId) => {
    setLoading(true);
    setError('');
    try {
      await api.put(`/requests/gate/visit/${visitId}/checkout`);
      await loadInsideVisitors();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not check out visitor');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError('');
    setManualCode('');
    setShowManual(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div id="qr-file-reader" ref={fileScannerRef} className="hidden" />
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Security QR Scanner</h1>
          <p className="text-slate-600">Scan QR codes to verify leave and visit passes</p>
        </div>

        {cameraNotice && !error && (
          <div className="bg-amber-50 border-l-4 border-amber-400 text-amber-800 p-4 rounded-xl mb-6">
            {cameraNotice}
          </div>
        )}

        {error && (
          <div className="bg-rose-100 border-l-4 border-rose-500 text-rose-800 p-4 rounded-xl mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{error}</span>
              <button onClick={() => setError('')} className="text-rose-600 hover:text-rose-800 font-bold text-xl">×</button>
            </div>
            {error.includes('camera') && (
              <div className="mt-2 text-sm">
                <p className="font-semibold mb-1">Alternative options:</p>
                <ul className="list-disc list-inside space-y-1 text-rose-700">
                  <li>Use <strong>Manual Entry</strong> button below to enter QR code data or request ID</li>
                  <li>Use <strong>Scan from Photo</strong> if the parent can share or display a QR screenshot</li>
                  <li>Check browser settings to allow camera access for this site</li>
                  <li>On phones, camera scanning works only on HTTPS sites or localhost</li>
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Currently Inside</h2>
              <p className="text-sm text-slate-500">Visitors checked in through the gate and not checked out yet.</p>
            </div>
            <button
              onClick={loadInsideVisitors}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200"
            >
              Refresh
            </button>
          </div>

          {insideLoading ? (
            <p className="text-slate-500">Loading visitors...</p>
          ) : insideVisitors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-slate-500">
              No visitors are currently inside.
            </div>
          ) : (
            <div className="space-y-3">
              {insideVisitors.map(visitor => (
                <div key={visitor.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-800">{visitor.parent?.name || 'Visitor'}</p>
                      <p className="text-sm text-slate-600">
                        {visitor.requestId}
                        {visitor.student?.name ? ` · ${visitor.student.name} (${visitor.student.admissionNo})` : ''}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Entry: {visitor.entryTime ? new Date(visitor.entryTime).toLocaleString() : 'N/A'}
                        {visitor.approvedVenue ? ` · Venue: ${visitor.approvedVenue}` : ''}
                      </p>
                      {visitor.type === 'leave' && (
                        <p className="mt-2 inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                          {visitor.gateStatus === 'child_exit_approved_waiting_scan'
                            ? 'Child exit approved. Waiting for QR scan.'
                            : 'Parent inside. Waiting for Admin/Principal approval.'}
                        </p>
                      )}
                    </div>
                    {visitor.type === 'leave' ? (
                      <span className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                        Scan Only
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCheckoutVisitor(visitor.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50"
                      >
                        Check Out
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!result && !scanning && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            {cameraDevices.length > 1 && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Camera</label>
                <select
                  value={selectedCameraId}
                  onChange={(event) => setSelectedCameraId(event.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-violet-500"
                >
                  {cameraDevices.map((camera, index) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={startScanning}
                disabled={startingCamera || loading}
                className="px-6 py-4 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
              >
                <span>{startingCamera ? 'Opening Camera...' : 'Start Camera Scanner'}</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="px-6 py-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <span>Scan from Photo</span>
              </button>
              <button
                onClick={() => setShowManual(!showManual)}
                className="px-6 py-4 bg-slate-600 text-white rounded-xl font-semibold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <span>Manual Entry</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleScanFromImage}
              className="hidden"
            />

            {showManual && (
              <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                <p className="text-sm font-semibold text-slate-700 mb-2">Enter QR Code Data or Request ID:</p>
                <textarea
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Paste QR code data or enter request ID (e.g., LEAVE-2024-0001)"
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500 mb-3"
                  rows="3"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleManualVerify}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50"
                  >
                    Verify QR Data
                  </button>
                  <button
                    onClick={handleManualRequestId}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    Lookup Request ID
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {scanning && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleScanFromImage}
              className="hidden"
            />
            <div className="relative">
              <div
                id="qr-reader"
                ref={scannerRef}
                className="w-full rounded-xl bg-slate-900"
                style={{ minHeight: '300px' }}
              />
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={stopScanning}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700"
                >
                  Stop Scanning
                </button>
              </div>
            </div>
            {startingCamera && (
              <div className="mt-4 rounded-xl bg-violet-50 p-4 text-sm font-semibold text-violet-800">
                Opening camera permission. Choose Allow when the browser asks.
              </div>
            )}
            <div className="mt-4">
              <div className="flex flex-col sm:flex-row gap-3 mb-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  Scan from Photo
                </button>
                <button
                  onClick={() => setShowManual(!showManual)}
                  className="flex-1 px-4 py-3 bg-slate-200 text-slate-800 rounded-lg font-semibold hover:bg-slate-300"
                >
                  Manual Entry
                </button>
              </div>
              {showManual && (
                <>
                  <p className="text-sm text-slate-600 mb-2">Or enter QR code manually:</p>
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && manualCode.trim()) {
                        handleQRScan(manualCode.trim());
                      }
                    }}
                    placeholder="Paste QR code data here and press Enter"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-800">
                {result.valid ? '✓ Verification Successful' : '✗ Verification Failed'}
              </h2>
              <button
                onClick={reset}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300"
              >
                Scan Another
              </button>
            </div>

            {result.valid && result.request && (
              <div className="space-y-4">
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl">
                  <p className="font-semibold text-emerald-800 mb-2">{result.message}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-slate-700">Request ID:</p>
                      <p className="text-slate-800">{result.request.requestId}</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">Type:</p>
                      <p className="text-slate-800 capitalize">{result.request.type}</p>
                    </div>
                    {result.request.student && (
                      <>
                        <div>
                          <p className="font-medium text-slate-700">Student:</p>
                          <p className="text-slate-800">{result.request.student.name}</p>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">Admission No:</p>
                          <p className="text-slate-800">{result.request.student.admissionNo}</p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="font-medium text-slate-700">Parent:</p>
                      <p className="text-slate-800">{result.request.parent.name}</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">Phone:</p>
                      <p className="text-slate-800">{result.request.parent.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {result.request.type === 'visit' && result.request.visitDetails && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <h3 className="font-semibold text-slate-800 mb-3">Visit Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-600">Date:</p>
                        <p className="text-slate-800">
                          {new Date(result.request.visitDetails.approvedDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-slate-600">Time:</p>
                        <p className="text-slate-800">
                          {result.request.visitDetails.approvedStartTime} - {result.request.visitDetails.approvedEndTime}
                        </p>
                      </div>
                      {result.request.visitDetails.approvedVenue && (
                        <div>
                          <p className="font-medium text-slate-600">Venue:</p>
                          <p className="text-slate-800">{result.request.visitDetails.approvedVenue}</p>
                        </div>
                      )}
                      {result.request.visitDetails.entryTime && (
                        <div>
                          <p className="font-medium text-emerald-600">Entry Time:</p>
                          <p className="text-emerald-800">
                            {new Date(result.request.visitDetails.entryTime).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {result.request.visitDetails.exitTime && (
                        <div>
                          <p className="font-medium text-amber-600">Exit Time:</p>
                          <p className="text-amber-800">
                            {new Date(result.request.visitDetails.exitTime).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {!result.request.visitDetails.exitTime && (
                      <div className="mt-4">
                        {!result.request.qrData && result.manual && (
                          <div className="mb-3 p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-800 text-sm rounded">
                            <strong>Note:</strong> To record entry/exit, please scan the actual QR code from the parent's phone, not just lookup by request ID.
                          </div>
                        )}
                        <div className="flex gap-3">
                          {!result.request.visitDetails.entryTime && (
                            <button
                              onClick={() => {
                                if (result.request.qrData) {
                                  verifyQRCode(result.request.qrData, 'entry');
                                } else {
                                  setError('Please scan the QR code to record entry. QR data is required for verification.');
                                }
                              }}
                              disabled={loading || !result.request.qrData}
                              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Record Entry
                            </button>
                          )}
                          {result.request.visitDetails.entryTime && (
                            <button
                              onClick={() => {
                                if (result.request.qrData) {
                                  verifyQRCode(result.request.qrData, 'exit');
                                } else {
                                  setError('Please scan the QR code to record exit. QR data is required for verification.');
                                }
                              }}
                              disabled={loading || !result.request.qrData}
                              className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Record Exit
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {result.request.type === 'leave' && result.request.leaveDetails && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <h3 className="font-semibold text-slate-800 mb-3">Leave Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="font-medium text-slate-600">Leave Type:</p>
                        <p className="text-slate-800 capitalize">{result.request.leaveDetails.leaveType.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="font-medium text-slate-600">Start Date:</p>
                        <p className="text-slate-800">
                          {new Date(result.request.leaveDetails.startDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-slate-600">End Date:</p>
                        <p className="text-slate-800">
                          {new Date(result.request.leaveDetails.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-slate-600">Reason:</p>
                        <p className="text-slate-800">{result.request.leaveDetails.reason}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
            <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-slate-600">Verifying QR code...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityQRScanner;

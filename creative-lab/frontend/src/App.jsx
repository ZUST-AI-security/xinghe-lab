import React, { useState, useRef, useEffect } from 'react';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('dream');
  const [sliderPos, setSliderPos] = useState(50);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResultUrl(null);
      setProfile(null);
    }
  };

  const handleImageChange = (e) => handleFile(e.target.files[0]);

  useEffect(() => {
    const handlePaste = (e) => {
      const files = e.clipboardData.files;
      if (files && files[0]) handleFile(files[0]);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processImage = async () => {
    if (!selectedImage) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedImage);
    formData.append('mode', mode);

    try {
      const response = await fetch('/process', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setResultUrl(data.result);
      setProfile(data.profile);
    } catch (error) {
      console.error('Processing failed:', error);
      alert('Neural Engine Synchronization Failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const modeConfig = {
    dream: { label: 'Dream Insight', desc: 'Visual saliency map of neural attention' },
    ghost: { label: 'Ghost Static', desc: 'Adversarial disruption patterns (FGSM)' },
    pulse: { label: 'Pulse Mode', desc: 'Extreme perturbation visualization' },
  };

  return (
    <div className="container">
      <nav className="navbar">
        <div className="logo">NEBULA<span>-7</span></div>
        <div className="status-indicator">
          <span className="dot"></span> ENGINE ONLINE
        </div>
      </nav>

      <main className="main-content">
        <div className="hero-section">
          <h1>AI Dreamscope <span>Explorer</span></h1>
          <p>Visualize the hidden subconscious of neural networks through adversarial lens.</p>
        </div>

        <div className="workspace">
          <div className="sidebar">
            <div className="card">
              <h3>Neural Config</h3>

              <div className="mode-selector">
                {Object.entries(modeConfig).map(([key, { label, desc }]) => (
                  <button
                    key={key}
                    className={`mode-btn ${mode === key ? 'active' : ''}`}
                    onClick={() => setMode(key)}
                  >
                    {label}
                    <small>{desc}</small>
                  </button>
                ))}
              </div>

              <div
                className="upload-area"
                onClick={() => fileInputRef.current.click()}
              >
                {selectedImage ? selectedImage.name : 'DROP SIGNAL OR PASTE'}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                style={{ display: 'none' }}
                accept="image/*"
              />

              <button
                className="action-btn"
                onClick={processImage}
                disabled={!selectedImage || loading}
              >
                {loading ? 'SCANNING...' : 'SCAN NEURAL PATHWAYS'}
              </button>
            </div>

            {profile && (
              <div className="card fade-in">
                <h3>Neural Profile</h3>
                <div className="profile-stat">
                  <span className="stat-label">ARCHETYPE</span>
                  <span className="stat-value">{profile.archetype}</span>
                </div>
                <div className="profile-stat">
                  <span className="stat-label">CONFIDENCE</span>
                  <span className="stat-value">{profile.confidence}</span>
                </div>
                <div className="profile-stat">
                  <span className="stat-label">STABILITY</span>
                  <span className="stat-value">{profile.signal_stability}</span>
                </div>
                <div className="observation">{profile.observation}</div>
              </div>
            )}
          </div>

          <div className="view-panel">
            <div
              className="comparison-container card"
              style={{ '--slider-pos': `${sliderPos}%` }}
            >
              <div className="viewer-label label-left">Physical Reality</div>
              <div className="viewer-label label-right">Neural Projection</div>

              {loading && (
                <div className="scanning-overlay">
                  <div className="loader">
                    <div className="pulse-loader"></div>
                    <div className="scanning-text">Synchronizing...</div>
                  </div>
                </div>
              )}

              {previewUrl ? (
                <>
                  <img src={previewUrl} className="compare-img" alt="Original" />
                  {resultUrl && (
                    <img
                      src={resultUrl}
                      className="compare-img compare-after fade-in"
                      alt="Result"
                    />
                  )}
                  {resultUrl && (
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sliderPos}
                      onChange={(e) => setSliderPos(e.target.value)}
                      className="slider-input"
                    />
                  )}
                </>
              ) : (
                <div className="empty-state">
                  Initialize input stream to begin...
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        PROJECT NEBULA-7 // XINGHE LAB CORE // SECURE ENCLAVE
      </footer>
    </div>
  );
}

export default App;

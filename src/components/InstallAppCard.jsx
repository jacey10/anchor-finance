import React, { useState, useEffect } from 'react';

export default function InstallAppCard() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // 1. Check if already installed (Standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // 2. Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // 3. Listen for the install prompt (Android/Desktop)
    if (!ios) {
      const handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handler);
      
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const handleInstallClick = () => {
    if (isIOS) {
      setShowModal(true);
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      });
    }
  };

  // Hide if already installed or if browser doesn't support it (and isn't iOS)
  if (isInstalled) return null;
  if (!isIOS && !deferredPrompt) return null;

  return (
    <>
      {/* The Install Card using your exact list-row structure */}
      <div className="list-row">
        <div className="list-row-content">
          <div className="list-row-title">Install App</div>
          <div className="list-row-meta">Add to home screen for quick access</div>
        </div>
        <button className="btn btn-outline" onClick={handleInstallClick}>
          Install
        </button>
      </div>

      {/* iOS Instructional Modal using your existing modal classes */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add to Home Screen</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <p className="confirm-message">To install Anchor Vault on your iPhone:</p>
            <ol style={{ textAlign: 'left', paddingLeft: 20, color: 'var(--text-primary)', marginBottom: 24 }}>
              <li style={{ marginBottom: 8 }}>Tap the <strong>Share</strong> icon at the bottom of Safari.</li>
              <li style={{ marginBottom: 8 }}>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong> in the top right corner.</li>
            </ol>
            <div className="modal-actions" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setShowModal(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
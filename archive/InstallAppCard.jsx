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
    // If iOS OR if the browser didn't fire the prompt, show manual instructions
    if (isIOS || !deferredPrompt) {
      setShowModal(true);
    } else {
      // Otherwise, trigger the native browser prompt
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      });
    }
  };

  // ONLY hide if the app is already installed as a standalone app
  if (isInstalled) return null;

  return (
    <>
      {/* The Install Card */}
      <div className="list-row">
        <div className="list-row-content">
          <div className="list-row-title">Install App</div>
          <div className="list-row-meta">Add to home screen for quick access</div>
        </div>
        <button className="btn btn-outline" onClick={handleInstallClick}>
          Install
        </button>
      </div>

      {/* Instructional Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add to Home Screen</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <p className="confirm-message">To install Anchor Vault:</p>
            <ol style={{ textAlign: 'left', paddingLeft: 20, color: 'var(--text-primary)', marginBottom: 24 }}>
              <li style={{ marginBottom: 8 }}>
                {isIOS 
                  ? 'Tap the <strong>Share</strong> icon at the bottom of Safari.' 
                  : 'Click the <strong>three dots</strong> (or install icon) in your browser menu.'}
              </li>
              <li style={{ marginBottom: 8 }}>Select <strong>Add to Home Screen</strong> or <strong>Install App</strong>.</li>
              <li>Confirm by tapping/clicking <strong>Add</strong> or <strong>Install</strong>.</li>
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
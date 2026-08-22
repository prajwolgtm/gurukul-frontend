import { useEffect, useState } from 'react';

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

const InstallAppButton = ({ mobile = false }) => {
  const [installPrompt, setInstallPrompt] = useState(window.gurukulInstallPrompt || null);
  const [installed, setInstalled] = useState(isStandalone);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  useEffect(() => {
    const capturePrompt = () => setInstallPrompt(window.gurukulInstallPrompt || null);
    const markInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('gurukulinstallready', capturePrompt);
    window.addEventListener('appinstalled', markInstalled);
    return () => {
      window.removeEventListener('gurukulinstallready', capturePrompt);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, []);

  if (installed || (!installPrompt && !isIOS)) return null;

  const install = async () => {
    if (isIOS) {
      setShowIOSHelp((current) => !current);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      window.gurukulInstallPrompt = null;
      setInstallPrompt(null);
    }
  };

  return (
    <div className={`install-app-wrap ${mobile ? 'install-app-wrap-mobile' : ''}`}>
      <button type="button" className="install-app-button" onClick={install}>
        <span aria-hidden="true">↓</span>
        Install App
      </button>
      {showIOSHelp && (
        <div className="install-ios-help" role="status">
          Tap Share, then Add to Home Screen.
        </div>
      )}
    </div>
  );
};

export default InstallAppButton;

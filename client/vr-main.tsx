// DJ-JK VR Entry Point
// Renders the immersive 3D DJ experience using React Three Fiber + WebXR
import React from 'react';
import { createRoot } from 'react-dom/client';
import { VRApp } from './vr/VRApp';

const loadingEl = document.getElementById('vr-loading');
const root = document.getElementById('vr-root');

if (root) {
  createRoot(root).render(<VRApp />);
  // Hide loading screen after render
  setTimeout(() => {
    if (loadingEl) loadingEl.style.display = 'none';
  }, 2000);
}

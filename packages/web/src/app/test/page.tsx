'use client';

import React, { useState } from 'react';

export default function TestPage() {
  const [message, setMessage] = useState('Testing CSS and file upload...');
  const [cssLoaded, setCssLoaded] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMessage(`File selected: ${file.name} (${file.size} bytes)`);
    }
  };

  // CSSが読み込まれているかチェック
  React.useEffect(() => {
    const testElement = document.createElement('div');
    testElement.className = 'bg-black text-white p-4';
    testElement.style.opacity = '0';
    testElement.style.position = 'absolute';
    testElement.style.top = '-1000px';
    document.body.appendChild(testElement);
    
    const computedStyle = window.getComputedStyle(testElement);
    const isBlack = computedStyle.backgroundColor === 'rgb(0, 0, 0)';
    const hasWhiteText = computedStyle.color === 'rgb(255, 255, 255)';
    const hasPadding = computedStyle.padding === '16px';
    
    setCssLoaded(isBlack && hasWhiteText && hasPadding);
    document.body.removeChild(testElement);
  }, []);

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">CSS & File Upload Test</h1>
        
        {/* CSS Status */}
        <div className="mb-8 p-4 rounded-lg border-2" style={{
          backgroundColor: cssLoaded ? '#f0f9ff' : '#fef2f2',
          borderColor: cssLoaded ? '#0ea5e9' : '#ef4444'
        }}>
          <h2 className="text-xl font-semibold mb-2" style={{
            color: cssLoaded ? '#0c4a6e' : '#991b1b'
          }}>
            TailwindCSS Status: {cssLoaded ? '✅ LOADED' : '❌ NOT LOADED'}
          </h2>
          <p style={{ color: cssLoaded ? '#0c4a6e' : '#991b1b' }}>
            {cssLoaded 
              ? 'TailwindCSS classes are being processed correctly!'
              : 'TailwindCSS is not working. Check your configuration.'
            }
          </p>
        </div>

        {/* CSS Test */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Visual CSS Test</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-900 h-20 rounded-lg border-2 border-gray-300"></div>
            <div className="bg-gray-500 h-20 rounded-lg border-2 border-gray-300"></div>
            <div className="bg-gray-200 h-20 rounded-lg border-2 border-gray-300"></div>
          </div>
          <p className="text-gray-600">
            Above should show three gray rectangles (dark, medium, light)
          </p>
          
          {/* Tailwind test */}
          <div className="mt-6 p-4 bg-white border border-gray-300 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Styled Card Test</h3>
            <p className="text-gray-600 mb-4">This card should have proper spacing, shadows, and borders.</p>
            <button className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors">
              Styled Button
            </button>
          </div>
        </div>

        {/* File Upload Test */}
        <div className="mb-8 p-6 bg-white border border-gray-300 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">File Upload Test</h2>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="mb-4 block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-900 file:text-white hover:file:bg-gray-700"
          />
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-gray-800 font-medium">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
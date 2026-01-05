'use client';

import { useEffect } from 'react';

interface CustomScript {
  id: string;
  scriptContent: string;
  position: 'head-start' | 'head-end' | 'body-start' | 'body-end';
}

interface CustomScriptsLoaderProps {
  scripts: CustomScript[];
  position: CustomScript['position'];
}

export function CustomScriptsLoader({ scripts, position }: CustomScriptsLoaderProps) {
  useEffect(() => {
    const filteredScripts = scripts.filter(s => s.position === position);
    
    filteredScripts.forEach(script => {
      const scriptElement = document.createElement('script');
      scriptElement.innerHTML = script.scriptContent;
      scriptElement.setAttribute('data-script-id', script.id);
      
      if (position === 'head-start' || position === 'head-end') {
        if (position === 'head-start') {
          document.head.insertBefore(scriptElement, document.head.firstChild);
        } else {
          document.head.appendChild(scriptElement);
        }
      } else {
        if (position === 'body-start') {
          document.body.insertBefore(scriptElement, document.body.firstChild);
        } else {
          document.body.appendChild(scriptElement);
        }
      }
    });

    return () => {
      // Cleanup scripts on unmount
      filteredScripts.forEach(script => {
        const existing = document.querySelector(`[data-script-id="${script.id}"]`);
        if (existing) {
          existing.remove();
        }
      });
    };
  }, [scripts, position]);

  return null;
}


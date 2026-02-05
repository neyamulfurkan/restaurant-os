'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

export function SettingsLoader() {
  const store = useSettingsStore();

  useEffect(() => {
    // NON-BLOCKING: Load settings in background without blocking render
    if (!store.isLoaded && !store.isLoading) {
      // Start loading immediately (non-blocking)
      store.loadSettings().catch((error) => {
        console.error('❌ SettingsLoader: Failed to load settings:', error);
      });
    }
    
    // Apply colors immediately if already loaded
    if (store.isLoaded) {
      applyColors();
    }
  }, [store.isLoaded, store.isLoading, store]);

  // Apply all color CSS variables
  const applyColors = () => {
    const { headerTextColor, headerBgColor } = store.branding;
    
    // Convert hex to HSL
    const hexToHsl = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return '0 0% 9%'; // fallback
      
      const r = parseInt(result[1], 16) / 255;
      const g = parseInt(result[2], 16) / 255;
      const b = parseInt(result[3], 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      
      h = Math.round(h * 360);
      s = Math.round(s * 100);
      l = Math.round(l * 100);
      
      return `${h} ${s}% ${l}%`;
    };

    const foregroundHsl = hexToHsl(headerTextColor);
    const backgroundHsl = hexToHsl(headerBgColor);
    
    // Calculate muted foreground (lighter/darker version for inactive tabs)
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(headerTextColor);
    if (result) {
      const r = parseInt(result[1], 16) / 255;
      const g = parseInt(result[2], 16) / 255;
      const b = parseInt(result[3], 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      
      h = Math.round(h * 360);
      s = Math.round(s * 100);
      const baseL = Math.round(l * 100);
      
      // Make muted-foreground 30% lighter or darker depending on base lightness
      const mutedL = baseL > 50 ? Math.max(0, baseL - 30) : Math.min(100, baseL + 30);
      
      const mutedHsl = `${h} ${s}% ${mutedL}%`;
      document.documentElement.style.setProperty('--muted-foreground', mutedHsl);
    }
    
    // Calculate muted background (for tabs background) - slightly darker/lighter than header bg
    const bgResult = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(headerBgColor);
    if (bgResult) {
      const r = parseInt(bgResult[1], 16) / 255;
      const g = parseInt(bgResult[2], 16) / 255;
      const b = parseInt(bgResult[3], 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      
      h = Math.round(h * 360);
      s = Math.round(s * 100);
      const baseL = Math.round(l * 100);
      
      // Make muted background 5% darker/lighter than header background
      const mutedBgL = baseL > 50 ? Math.max(0, baseL - 5) : Math.min(100, baseL + 5);
      
      const mutedBgHsl = `${h} ${s}% ${mutedBgL}%`;
      document.documentElement.style.setProperty('--muted', mutedBgHsl);
    }
    
    // Set the foreground and background CSS variables
    document.documentElement.style.setProperty('--foreground', foregroundHsl);
    document.documentElement.style.setProperty('--background', backgroundHsl);

    // Set direct-use color variables (these work reliably everywhere)
    document.documentElement.style.setProperty('--foreground-color', headerTextColor);
    document.documentElement.style.setProperty('--secondary-text-color', '#a3a3a3');
    document.documentElement.style.setProperty('--card-bg', headerBgColor);

    console.log('🎨 Colors applied:', { 
      foreground: foregroundHsl,
      background: backgroundHsl,
      foregroundColor: headerTextColor,
      muted: document.documentElement.style.getPropertyValue('--muted'),
      mutedForeground: document.documentElement.style.getPropertyValue('--muted-foreground')
    });
  };

  return null;
}
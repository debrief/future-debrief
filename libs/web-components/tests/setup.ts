import '@testing-library/jest-dom';

// Mock vscode-elements CSSStyleSheet.replaceSync for Jest
Object.defineProperty(CSSStyleSheet.prototype, 'replaceSync', {
  writable: true,
  value(cssText: string) {
    // Mock implementation for Jest/JSDOM
    const styleEl = document.createElement('style');
    styleEl.textContent = cssText;
    document.head.appendChild(styleEl);
  }
});

// Mock vscode-elements CSSStyleSheet.replace for Jest
Object.defineProperty(CSSStyleSheet.prototype, 'replace', {
  writable: true,
  value(cssText: string) {
    // Mock implementation for Jest/JSDOM
    const styleEl = document.createElement('style');
    styleEl.textContent = cssText;
    document.head.appendChild(styleEl);
    return Promise.resolve();
  }
});
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

// Mock attachInternals for Web Components in Jest
Object.defineProperty(HTMLElement.prototype, 'attachInternals', {
  writable: true,
  value() {
    return {
      shadowRoot: null,
      role: null,
      ariaPosInSet: null,
      ariaSetSize: null,
      states: new Set(),
      setFormValue() {},
      setValidity() {},
      checkValidity() { return true; },
      reportValidity() { return true; },
      validationMessage: '',
      willValidate: true,
      validity: {
        valueMissing: false,
        typeMismatch: false,
        patternMismatch: false,
        tooLong: false,
        tooShort: false,
        rangeUnderflow: false,
        rangeOverflow: false,
        stepMismatch: false,
        badInput: false,
        customError: false,
        valid: true
      },
      labels: []
    };
  }
});
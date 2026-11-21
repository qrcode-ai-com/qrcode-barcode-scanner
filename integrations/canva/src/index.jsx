// SPDX-License-Identifier: MIT
// The app's entry: Canva calls `render` through the design editor intent. The App UI Kit
// provider follows the editor's theme, the i18n provider loads Canva's translations of the
// strings in messages.js, and the scanner starts loading its engine at once.
import '@canva/app-ui-kit/styles.css';
import { AppI18nProvider } from '@canva/app-i18n-kit';
import { AppUiProvider } from '@canva/app-ui-kit';
import { getTemporaryUrl } from '@canva/asset';
import { selection } from '@canva/design';
import { prepareDesignEditor } from '@canva/intents/design';
import { createRoot } from 'react-dom/client';
import { App } from './app.jsx';
import { createScanner } from './controller.js';
import { load, scan } from './engine.js';

let root = null;
let scanner = null;

function render() {
  scanner ??= createScanner({ canva: { selection, getTemporaryUrl }, engine: { load, scan } });
  root ??= createRoot(document.getElementById('root'));
  root.render(
    <AppI18nProvider>
      <AppUiProvider>
        <App scanner={scanner} />
      </AppUiProvider>
    </AppI18nProvider>,
  );
}

prepareDesignEditor({ render });

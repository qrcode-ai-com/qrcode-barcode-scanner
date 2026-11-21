// The JupyterLab plugin: one command that opens the scanner panel, a command that scans the image
// selected in the file browser, a launcher card, and an address that opens the panel
// (`/lab?qrcode-barcode-scanner`).
import {
  ILayoutRestorer,
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICommandPalette, MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';
import { IDefaultFileBrowser } from '@jupyterlab/filebrowser';
import { ILauncher } from '@jupyterlab/launcher';
import { LabIcon } from '@jupyterlab/ui-components';

import { ScannerPanel } from './panel';
import { base64Bytes, isImageName } from './report';

const OPEN = 'qrcode-barcode-scanner:open';
const SCAN_FILE = 'qrcode-barcode-scanner:scan-file';
// The address `?qrcode-barcode-scanner` (alone or among other query parameters) opens the panel.
const ROUTE = /[?&]qrcode-barcode-scanner(?:[=&#]|$)/;

const scannerIcon = new LabIcon({
  name: 'qrcode-barcode-scanner:icon',
  svgstr: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g class="jp-icon3" fill="#616161">'
    + '<path d="M3 3h7v7H3zm2 2v3h3V5zm9-2h7v7h-7zm2 2v3h3V5zM3 14h7v7H3zm2 2v3h3v-3zm9-2h2v2h-2zm4 0h3v2h-3zm-4 '
    + '4h2v3h-2zm3 1h1v2h-1zm2-1h2v3h-2z"/></g></svg>'
});

const plugin: JupyterFrontEndPlugin<void> = {
  id: '@qrcode-ai-com/jupyterlab-qrcode-barcode-scanner:plugin',
  description: 'Read QR codes and barcodes in an image, in the browser, with the QR Code & Barcode Scanner engine.',
  autoStart: true,
  optional: [ICommandPalette, ILauncher, ILayoutRestorer, IDefaultFileBrowser, IRouter],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette | null,
    launcher: ILauncher | null,
    restorer: ILayoutRestorer | null,
    browser: IDefaultFileBrowser | null,
    router: IRouter | null
  ) => {
    const tracker = new WidgetTracker<MainAreaWidget<ScannerPanel>>({ namespace: 'qrcode-barcode-scanner' });

    // One panel at a time: the page contract names its controls by id.
    const open = (): MainAreaWidget<ScannerPanel> => {
      let widget = tracker.currentWidget;
      if (!widget || widget.isDisposed) {
        widget = new MainAreaWidget({ content: new ScannerPanel() });
        widget.id = 'qrcode-barcode-scanner';
        widget.title.label = 'QR Code & Barcode Scanner';
        widget.title.icon = scannerIcon;
        void tracker.add(widget);
      }
      if (!widget.isAttached) app.shell.add(widget, 'main');
      app.shell.activateById(widget.id);
      return widget;
    };

    app.commands.addCommand(OPEN, {
      label: 'QR Code & Barcode Scanner',
      caption: 'Read the QR codes and barcodes of an image, in this browser',
      icon: (args) => (args['isPalette'] ? undefined : scannerIcon),
      execute: () => { open(); }
    });

    const selectedImage = (): string | null => {
      const item = browser?.selectedItems().next();
      if (!item || item.done || item.value.type === 'directory') return null;
      return isImageName(item.value.name) ? item.value.path : null;
    };

    app.commands.addCommand(SCAN_FILE, {
      label: 'Scan for QR codes and barcodes',
      caption: 'Read this image in the scanner panel, in this browser',
      icon: scannerIcon,
      isVisible: () => selectedImage() !== null,
      execute: async () => {
        const path = selectedImage();
        if (path === null) return;
        const widget = open();
        // The server already serves this file to this tab; it is read once, as base64.
        const model = await app.serviceManager.contents.get(path, { content: true, format: 'base64', type: 'file' });
        await widget.content.scanBytes(model.name, base64Bytes(String(model.content)));
      }
    });

    palette?.addItem({ command: OPEN, category: 'QR Code & Barcode Scanner', args: { isPalette: true } });
    launcher?.add({ command: OPEN, category: 'Other', rank: 50 });
    app.contextMenu.addItem({ command: SCAN_FILE, selector: '.jp-DirListing-item[data-isdir="false"]', rank: 20 });
    if (restorer) void restorer.restore(tracker, { command: OPEN, name: () => 'qrcode-barcode-scanner' });
    router?.register({ command: OPEN, pattern: ROUTE });
  }
};

export default plugin;

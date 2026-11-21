// QR Code & Barcode Scanner, browser image demo for CodePen. MIT License.
//
// This file is glue only. The scanner engine is the published npm package
// @qrcode-ai-com/qrcode-barcode-scanner-wasm 0.11.0, loaded from jsDelivr at that exact version
// and licensed AGPL-3.0-or-later (source: tag v0.11.0 of
// https://github.com/qrcode-ai-com/qrcode-barcode-scanner-rust). Nothing of the engine is copied
// here. The page fetches the WebAssembly module itself, refuses it unless its SHA-256 is the
// pinned one, and hands those verified bytes to the package's own loader, in a module worker
// made from a Blob (a page cannot start a worker from another origin's URL). When a sandbox
// refuses that worker, the same loader runs on the page. Images are read in the browser and
// never uploaded; decoded text is written as text and never opened.
//
// It is a classic script with no import statement, so it runs the same whether a host includes
// it as a classic or a module script, and only once if it is included twice.
(function () {
  'use strict';
  if (window.qrscanCodepenDemo) return;
  window.qrscanCodepenDemo = true;

  var VERSION = '0.11.0';
  var PACKAGE = '@qrcode-ai-com/qrcode-barcode-scanner-wasm';
  var CDN = 'https://cdn.jsdelivr.net/npm/' + PACKAGE + '@' + VERSION + '/';
  var AUTO_URL = CDN + 'auto.js';
  var WASM_URL = CDN + 'qrcode-barcode-scanner_bg.wasm';
  var PACKAGE_JSON_URL = CDN + 'package.json';
  // wasm.sha256 of the package's build-info.json at 0.11.0.
  var WASM_SHA256 = 'a5d684cec3863e210bbb7f473267dcf07a8321ff57bf17a321af58f5d261ab68';
  // The tagged sample through jsDelivr's GitHub files, which carry CORS headers and do not answer
  // HTTP 429 to busy shared addresses as raw.githubusercontent.com does.
  var SAMPLE_URL = 'https://cdn.jsdelivr.net/gh/qrcode-ai-com/qrcode-barcode-scanner-rust@' +
    'v0.11.0/fixtures/symbology/mixed-code128-qr.png';
  var SAMPLE_SHA256 = 'c636e8d56df483ff1ec06dbe9b5bcba226c579f8fc1c3d10c4ccf4e100762ec8';
  var SAMPLE_CODES = ['code128:STOCK-4827', 'qr_code:https://qrc-ai.com/76xMa'];
  var PROFILES = ['fast', 'frame', 'full'];
  var LABELS = { qr_code: 'QR Code', code128: 'Code 128' };
  // 0: no time budget, so a scan always runs to its end and a report is never cut short.
  var BUDGET_MS = 0;
  var MAX_BYTES = 32 * 1024 * 1024;
  var WORKER_START_MS = 60000;

  // The worker: the package's loader, given the verified bytes, and one scan at a time.
  var WORKER_SOURCE = [
    "import { createScannerLoader } from '" + AUTO_URL + "';",
    'let load = null;',
    'const QRS = /\\[(QRS-\\d{3})\\]/;',
    'function describe(error) {',
    "  const object = error !== null && typeof error === 'object';",
    '  const message = object && error.message !== undefined ? String(error.message) : String(error);',
    '  const qrs = QRS.exec(message);',
    "  return { name: object && error.name ? String(error.name) : 'Error', message,",
    "    code: object && typeof error.code === 'string' ? error.code : null, qrs: qrs ? qrs[1] : null };",
    '}',
    'self.onmessage = async (event) => {',
    '  const message = event.data || {};',
    '  const id = message.id;',
    '  try {',
    "    if (message.type === 'load') {",
    "      const url = URL.createObjectURL(new Blob([message.wasm], { type: 'application/wasm' }));",
    '      load = createScannerLoader({ wasmUrl: url });',
    '      const scanner = await load();',
    '      self.postMessage({ id, ok: true, version: scanner.version(), variant: scanner.variant });',
    '      return;',
    '    }',
    "    if (message.type !== 'scan_image' || load === null) throw new TypeError('unexpected request');",
    '    const scanner = await load();',
    '    const started = performance.now();',
    '    const report = scanner.scan_image(new Uint8Array(message.bytes), message.profile, undefined,',
    '      undefined, message.budgetMs);',
    '    self.postMessage({ id, ok: true, report, ms: performance.now() - started });',
    '  } catch (error) {',
    "    self.postMessage({ id, ok: false, phase: message.type === 'load' ? 'load' : 'scan',",
    '      error: describe(error) });',
    '  }',
    '};',
  ].join('\n');

  var byId = function (id) { return document.getElementById(id); };
  var view = null;
  var engine = null; // { runtime, version, scan(bytes, profile) -> Promise<reply> }
  var scans = 0;
  var chosen = null;
  var previewUrl = null;

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (byte) {
      return byte.toString(16).padStart(2, '0');
    }).join('');
  }

  function sha256(bytes) {
    return crypto.subtle.digest('SHA-256', bytes).then(hex);
  }

  function fetchBytes(url) {
    return fetch(url).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status + ' for ' + url);
      return response.arrayBuffer();
    });
  }

  function describe(error) {
    var object = error !== null && typeof error === 'object';
    var message = object && error.message !== undefined ? String(error.message) : String(error);
    var qrs = /\[(QRS-\d{3})\]/.exec(message);
    return { name: object && error.name ? String(error.name) : 'Error', message: message,
      code: object && typeof error.code === 'string' ? error.code : null, qrs: qrs ? qrs[1] : null };
  }

  // One place writes the result region: its state, the summary and the list, all as text.
  function show(state, summary, details) {
    var extra = details || {};
    view.result.dataset.state = state;
    view.result.dataset.scan = String(scans);
    if (extra.error) view.result.dataset.error = extra.error; else delete view.result.dataset.error;
    if (extra.code) view.result.dataset.code = extra.code; else delete view.result.dataset.code;
    view.summary.textContent = summary;
    while (view.detections.firstChild) view.detections.removeChild(view.detections.firstChild);
    (extra.items || []).forEach(function (item) { view.detections.appendChild(item); });
  }

  function codesOf(report) {
    var detections = Array.isArray(report.detections) ? report.detections : [];
    return detections.map(function (detection) {
      var content = detection.content || {};
      return String(detection.symbology) + ':' + String(content.text);
    }).sort();
  }

  // The list is complete when the time budget cut nothing and no capacity left a read or a
  // content out. Only then does an empty list prove that the image holds no code.
  function complete(report) {
    var trace = report.trace !== null && typeof report.trace === 'object' ? report.trace : {};
    var saturation = trace.saturation !== null && typeof trace.saturation === 'object'
      ? trace.saturation : {};
    return trace.budget_exhausted === false && saturation.reads === false &&
      saturation.detections === false;
  }

  function renderDetection(detection) {
    var content = detection.content || {};
    var item = element('li', 'detection');
    item.appendChild(element('p', 'symbology', LABELS[detection.symbology] || String(detection.symbology)));
    item.appendChild(element('pre', 'value', typeof content.text === 'string' ? content.text : ''));
    return item;
  }

  function showReport(reply, name, profile) {
    var report = reply.report;
    view.reportJson.textContent = JSON.stringify(report, null, 2);
    view.reportJson.dataset.scan = String(scans);
    view.reportJson.dataset.profile = profile;
    var detections = Array.isArray(report.detections) ? report.detections : [];
    var whole = complete(report);
    var ms = Math.round(reply.ms) + ' ms';
    if (detections.length === 0) {
      show(whole ? 'empty' : 'inconclusive', whole
        ? 'No code found in ' + name + ' with the ' + profile + ' profile (' + ms + '). The scan finished: an image without a readable code is a valid result.'
        : 'No code listed for ' + name + ' with the ' + profile + ' profile, and the report does not prove the image holds none.');
      return;
    }
    var count = detections.length === 1 ? '1 code' : detections.length + ' codes';
    show('result', count + ' found in ' + name + ' with the ' + profile + ' profile (' + ms + ').' +
      (whole ? ' The scan finished and lists every code it read.' : ' More codes may be present than listed.'),
      { items: detections.map(renderDetection) });
  }

  function showError(reply, name, profile) {
    var error = reply.error || {};
    view.reportJson.textContent = '';
    view.reportJson.dataset.scan = String(scans);
    view.reportJson.dataset.profile = profile;
    if (reply.phase === 'scan' && error.qrs) {
      show('error', 'Input error (' + error.qrs + '): the scanner refused ' + name + '. ' + error.message,
        { error: 'input', code: error.qrs });
      return;
    }
    show('error', 'Scanner error: ' + name + ' could not be scanned. ' + (error.message || ''),
      { error: reply.phase === 'load' ? 'loading' : 'fault', code: error.code });
  }

  // The chosen image is shown from memory: it never leaves the browser.
  function choose(file, note) {
    if (previewUrl !== null) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    view.previewImage.hidden = false;
    view.previewImage.alt = 'The chosen image, ' + file.name;
    view.previewImage.src = previewUrl;
    view.previewCaption.textContent = file.name + ': ' + file.size + ' bytes' + (file.type ? ', ' + file.type : '');
    view.preview.hidden = false;
    scanFile(file, note);
  }

  function scanFile(file, note) {
    chosen = { file: file, note: note };
    scans += 1;
    var serial = scans;
    var profile = view.profile.value;
    show('scanning', 'Scanning ' + file.name + note + ' with the ' + profile + ' profile…');
    if (engine === null) {
      show('error', 'The scanner did not load, so nothing was scanned.', { error: 'loading' });
      return;
    }
    if (file.size > MAX_BYTES) {
      show('error', 'Input error: ' + file.name + ' is larger than 32 MiB.', { error: 'input' });
      return;
    }
    file.arrayBuffer().then(function (bytes) {
      return engine.scan(bytes, profile);
    }, function (error) {
      return { ok: false, phase: 'read', error: describe(error) };
    }).then(function (reply) {
      if (serial !== scans) return; // a newer image or profile replaced this scan
      if (reply.ok) showReport(reply, file.name, profile);
      else if (reply.phase === 'read') show('error', 'Input error: ' + file.name + ' could not be read.', { error: 'input' });
      else showError(reply, file.name, profile);
    });
  }

  // The package's loader in a module worker, given the verified module bytes.
  function workerEngine(wasm) {
    return new Promise(function (resolve, reject) {
      var source = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
      var worker;
      try { worker = new Worker(source, { type: 'module' }); } catch (error) { reject(error); return; }
      var pending = new Map();
      var last = 0;
      var started = false;
      var timer = setTimeout(function () {
        if (!started) { worker.terminate(); reject(new Error('the scanner worker did not answer')); }
      }, WORKER_START_MS);
      function request(message, transfer) {
        last += 1;
        var id = last;
        return new Promise(function (done) {
          pending.set(id, done);
          message.id = id;
          worker.postMessage(message, transfer || []);
        });
      }
      worker.onmessage = function (event) {
        var reply = event.data || {};
        var done = pending.get(reply.id);
        if (done === undefined) return;
        pending.delete(reply.id);
        done(reply);
      };
      worker.onerror = function (event) {
        event.preventDefault();
        if (!started) { clearTimeout(timer); worker.terminate(); reject(new Error(event.message || 'the scanner worker did not start')); return; }
        pending.forEach(function (done) { done({ ok: false, phase: 'scan', error: { name: 'WorkerError', message: event.message || 'the scanner worker stopped' } }); });
        pending.clear();
      };
      var copy = wasm.slice(0);
      request({ type: 'load', wasm: copy }, [copy]).then(function (reply) {
        started = true;
        clearTimeout(timer);
        if (!reply.ok) { worker.terminate(); reject(new Error(reply.error.message)); return; }
        resolve({
          runtime: 'a module worker',
          version: String(reply.version),
          scan: function (bytes, profile) {
            var data = bytes.slice(0);
            return request({ type: 'scan_image', bytes: data, profile: profile, budgetMs: BUDGET_MS }, [data]);
          },
        });
      });
    });
  }

  // The same loader on the page, for a sandbox that refuses a Blob module worker.
  function pageEngine(wasm) {
    return import(AUTO_URL).then(function (auto) {
      var url = URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' }));
      return auto.createScannerLoader({ wasmUrl: url })();
    }).then(function (scanner) {
      var queue = Promise.resolve();
      return {
        runtime: 'the page (no worker)',
        version: String(scanner.version()),
        scan: function (bytes, profile) {
          var run = queue.then(function () {
            var started = performance.now();
            try {
              var report = scanner.scan_image(new Uint8Array(bytes), profile, undefined, undefined, BUDGET_MS);
              return { ok: true, report: report, ms: performance.now() - started };
            } catch (error) {
              return { ok: false, phase: 'scan', error: describe(error) };
            }
          });
          queue = run;
          return run;
        },
      };
    });
  }

  function sampleRow(profile) {
    return view.sample.querySelector('tr[data-profile="' + profile + '"]');
  }

  function scanSample() {
    view.sampleStatus.textContent = 'Fetching the sample and checking its SHA-256…';
    return fetchBytes(SAMPLE_URL).then(function (bytes) {
      return sha256(bytes).then(function (digest) {
        if (digest !== SAMPLE_SHA256) throw new Error('the sample has SHA-256 ' + digest + ', not the pinned one');
        view.sampleImage.src = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
        view.sampleFigure.hidden = false;
        view.sampleStatus.textContent = 'Scanning the sample in the three profiles…';
        var passed = 0;
        return PROFILES.reduce(function (chain, profile) {
          return chain.then(function () {
            var row = sampleRow(profile);
            row.querySelector('.codes').textContent = 'scanning';
            return engine.scan(bytes, profile).then(function (reply) {
              if (!reply.ok) {
                row.dataset.state = 'fail';
                row.querySelector('.codes').textContent = 'error: ' + reply.error.message;
                return;
              }
              var codes = codesOf(reply.report);
              var whole = complete(reply.report);
              var trace = reply.report.trace || {};
              var ok = codes.join('\n') === SAMPLE_CODES.join('\n') && trace.budget_exhausted === false;
              if (ok) passed += 1;
              row.dataset.state = ok ? 'pass' : 'fail';
              row.dataset.codes = JSON.stringify(codes);
              row.dataset.budgetExhausted = String(trace.budget_exhausted);
              row.dataset.engine = reply.report.versions ? String(reply.report.versions.scanner) : '';
              row.querySelector('.codes').textContent = reply.report.detections.map(function (detection) {
                var label = LABELS[detection.symbology] || String(detection.symbology);
                return label + ': ' + String((detection.content || {}).text);
              }).join(' · ');
              row.querySelector('.ms').textContent = Math.round(reply.ms) + ' ms';
              row.querySelector('.complete').textContent = whole ? 'yes' : 'not proven';
            });
          });
        }, Promise.resolve()).then(function () {
          var all = passed === PROFILES.length;
          view.sampleStatus.dataset.state = all ? 'pass' : 'fail';
          view.sampleStatus.textContent = all
            ? 'The sample returned its QR code and its Code 128 barcode in the three profiles.'
            : 'The sample did not return both codes in every profile.';
        });
      });
    }).catch(function (error) {
      view.sampleStatus.dataset.state = 'error';
      view.sampleStatus.textContent = 'The sample could not be scanned: ' + error.message;
    });
  }

  function showPackage() {
    return fetch(PACKAGE_JSON_URL).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).then(function (manifest) {
      view.packageName.textContent = String(manifest.name);
      view.packageVersion.textContent = String(manifest.version);
    }, function (error) {
      view.packageName.textContent = 'unavailable (' + error.message + ')';
      view.packageVersion.textContent = 'unavailable';
    });
  }

  function start() {
    view = {
      file: byId('file'), dropZone: byId('drop-zone'), profile: byId('profile'),
      result: byId('result'), summary: byId('summary'), detections: byId('detections'),
      reportJson: byId('report-json'), sample: byId('sample-table'),
      sampleStatus: byId('sample-status'), sampleFigure: byId('sample-figure'),
      sampleImage: byId('sample-image'), preview: byId('preview'),
      previewImage: byId('preview-image'), previewCaption: byId('preview-caption'),
      packageName: byId('package-name'),
      packageVersion: byId('package-version'), wasmSha256: byId('wasm-sha256'),
      engineVersion: byId('engine-version'), runtime: byId('runtime'),
    };
    show('loading', 'Loading the scanner…');
    showPackage();
    fetchBytes(WASM_URL).then(function (wasm) {
      return sha256(wasm).then(function (digest) {
        view.wasmSha256.textContent = digest;
        if (digest !== WASM_SHA256) throw new Error('the module has SHA-256 ' + digest + ', not the pinned ' + WASM_SHA256);
        return workerEngine(wasm).catch(function () { return pageEngine(wasm); });
      });
    }).then(function (loaded) {
      engine = loaded;
      view.engineVersion.textContent = engine.version;
      view.runtime.textContent = engine.runtime;
      if (chosen !== null) scanFile(chosen.file, chosen.note);
      else show('ready', 'Ready. Choose or drop an image.');
      scanSample();
    }).catch(function (error) {
      show('error', 'Loading error: the scanner did not load, so nothing was scanned. ' + error.message,
        { error: 'loading' });
      view.engineVersion.textContent = 'not loaded';
      view.sampleStatus.dataset.state = 'error';
      view.sampleStatus.textContent = 'The sample was not scanned: the scanner did not load.';
    });

    view.file.addEventListener('change', function () {
      var file = view.file.files && view.file.files[0];
      if (file) choose(file, '');
    });
    view.previewImage.addEventListener('error', function () {
      if (!view.previewImage.getAttribute('src')) return;
      view.previewImage.hidden = true;
      view.previewCaption.textContent += ' (this browser cannot show it; the scanner reads the bytes itself)';
    });
    view.profile.addEventListener('change', function () {
      if (chosen !== null) scanFile(chosen.file, chosen.note);
    });
    // A file dropped outside the box would make the browser open it in place of this page.
    window.addEventListener('dragover', function (event) { event.preventDefault(); });
    window.addEventListener('drop', function (event) { event.preventDefault(); });
    ['dragenter', 'dragover'].forEach(function (type) {
      view.dropZone.addEventListener(type, function (event) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
        view.dropZone.classList.add('dragging');
      });
    });
    view.dropZone.addEventListener('dragleave', function (event) {
      if (!view.dropZone.contains(event.relatedTarget)) view.dropZone.classList.remove('dragging');
    });
    view.dropZone.addEventListener('drop', function (event) {
      event.preventDefault();
      event.stopPropagation();
      view.dropZone.classList.remove('dragging');
      var files = event.dataTransfer ? event.dataTransfer.files : null;
      if (!files || files.length === 0) {
        scans += 1;
        show('error', 'Input error: the drop held no file. Drop an image file.', { error: 'input' });
        return;
      }
      choose(files[0], files.length > 1 ? ' (the first of ' + files.length + ' dropped files)' : '');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}());

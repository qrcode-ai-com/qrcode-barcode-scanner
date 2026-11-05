// The overlay witnesses of one browser, on the Node side of the packed-package runner, against
// the consumer page it serves: importing the overlay and an idle overlay ask for no camera; the
// exact symbol sets (in exactProfiles); scenes A-H and the effects witness (in profiles). Each
// runs with no time budget (0), and a failing one is recorded while the next one runs: the caller
// fails the run once every browser is done. The effects witness also runs with each profile's
// default budget, and those outcomes are recorded as measurements, never judged.
//
// Each witness, and each other evaluation in the page, has a deadline (deadlineMs, three minutes
// by default; the slowest witness took 21 s on a laptop, Firefox's scene D). Loading the page
// keeps Playwright's own timeouts. A call past its deadline is a failure, and every witness after
// it in this browser is recorded as failed and not run: a page that stopped answering would
// otherwise hold the job until its time limit cancelled it, and no receipt would be written. One
// stall per browser costs at most the deadline and the 30 s allowed to close the page.
import assert from 'node:assert/strict';
import {
  compareEffects, effectsScene, exactSetCases, judgeEffects, judgeExactSet, judgeScene, overlayScenes,
} from './overlay-scenes.mjs';

// Runs in the page before any of its scripts: every way a page asks for a camera or a screen is
// counted, on the prototypes, so an instance created later is covered too.
function cameraTrap() {
  const calls = [];
  const wrap = (owner, name) => {
    const original = owner ? owner[name] : undefined;
    if (typeof original !== 'function') return;
    owner[name] = function counted(...args) {
      calls.push(name);
      return original.apply(this, args);
    };
  };
  if (typeof MediaDevices !== 'undefined') {
    for (const name of ['getUserMedia', 'enumerateDevices', 'getDisplayMedia']) wrap(MediaDevices.prototype, name);
  }
  for (const name of ['getUserMedia', 'webkitGetUserMedia', 'mozGetUserMedia']) wrap(Navigator.prototype, name);
  Object.defineProperty(window, 'cameraRequests', {
    value: () => ({ mediaDevices: typeof MediaDevices !== 'undefined' && navigator.mediaDevices instanceof MediaDevices,
      calls: calls.slice() }),
  });
}

const seconds = started => Math.round(performance.now() - started) / 1000;
export const WITNESS_DEADLINE_MS = 180_000;

export async function overlayWitnesses({ browser, base, runtime, profiles, exactProfiles = profiles, truth, judge,
  versions, bytesOf, recordsFile, normalize, phase = () => {}, deadlineMs = WITNESS_DEADLINE_MS }) {
  const failures = [];
  // stalled: the first call that passed its deadline, after which nothing more was sent.
  const record = { profiles, exactProfiles, camera: null, exact: [], scenes: [], effects: [], defaultBudget: [],
    closing: null, stalled: null };
  // What WORK settles to, or a rejection once deadlineMs passed: the page is then left alone,
  // and what WORK settles to later is dropped. After a stall, WORK is not called.
  const guarded = (work, what) => {
    if (record.stalled) return Promise.reject(new Error(`not run: ${record.stalled} had no outcome in time`));
    const running = Promise.resolve(work());
    running.catch(() => {});
    let timer;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        record.stalled = what;
        reject(new Error(`${what}: no outcome within ${deadlineMs / 1000} s`));
      }, deadlineMs);
    });
    return Promise.race([running, deadline]).finally(() => clearTimeout(timer));
  };
  // One witness: its outcome on success, or a failure entry and ok false.
  const attempt = async (witness, profile, body) => {
    const started = performance.now();
    try {
      return { witness, profile, ok: true, ...(await guarded(body, `${witness}${profile ? ` (${profile})` : ''}`)),
        seconds: seconds(started) };
    } catch (error) {
      failures.push({ runtime, witness, profile, message: String(error?.message ?? error).slice(0, 4000) });
      return { witness, profile, ok: false, seconds: seconds(started) };
    }
  };
  const context = await browser.newContext();
  try {
    await context.addInitScript(cameraTrap);
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    phase(`${runtime}: overlay import`);
    await page.goto(base);
    await page.waitForFunction(() => !!window.harness);
    // main.js imported ./camera-overlay at load; an overlay is then created, updated and destroyed.
    record.camera = await attempt('no camera from the import or an idle overlay', null, async () => {
      const idle = await page.evaluate(() => window.harness.overlay.createIdleOverlay());
      const seen = await page.evaluate(() => window.cameraRequests());
      assert.deepEqual(seen, { mediaDevices: true, calls: [] },
        `${runtime}: importing ./camera-overlay and an idle overlay request no camera`);
      return { idleAlignment: idle.alignment };
    });

    phase(`${runtime}: overlay exact symbol sets`);
    // One worker for every exact set, started by the first; a composed image is composed once.
    for (const exact of exactSetCases({ truth, bytesOf, recordsFile, fixtureBytes: bytesOf })) {
      let bytes = exact.bytes;
      for (const profile of exactProfiles) {
        record.exact.push(await attempt(`exact set: ${exact.label}`, profile, async () => {
          bytes ??= await page.evaluate(spec => window.harness.overlay.composePng(spec), exact.compose);
          const reply = await page.evaluate(request =>
            (window.overlayExactWorker ??= window.harness.startWorker()).request(request),
          { bytes, profile, budgetMs: 0 });
          assert.equal(reply.ok, true, `${runtime}: ${exact.label}, ${profile}: ${JSON.stringify(reply)}`);
          return { contents: judgeExactSet(exact, reply.result, profile,
            { judge, versions, label: `${runtime}: ${exact.label}, ${profile}` }) };
        }));
      }
    }
    await attempt('the exact-set worker stops', null, () => page.evaluate(() => {
      window.overlayExactWorker?.stop();
      return {};
    }));

    phase(`${runtime}: overlay scenes`);
    for (const scene of overlayScenes({ truth, bytesOf })) {
      for (const profile of profiles) {
        record.scenes.push(await attempt(`scene ${scene.name}`, profile, async () => {
          const run = await page.evaluate(spec => window.harness.overlay.runScene(spec),
            { ...scene.spec, profile, budgetMs: 0 });
          return judgeScene(scene, run, profile, { judge, versions });
        }));
      }
    }

    phase(`${runtime}: overlay effects`);
    const effects = effectsScene({ truth, bytesOf });
    const runEffects = (mode, profile, budgetMs) => page.evaluate(spec => window.harness.overlay.runEffects(spec),
      { ...effects.spec, mode, profile, budgetMs });
    for (const profile of profiles) {
      record.effects.push(await attempt('effects leave the detector input unchanged', profile, async () => {
        const bare = await runEffects('bare', profile, 0);
        const overlay = await runEffects('overlay', profile, 0);
        return judgeEffects(effects, bare, overlay, profile, { judge, versions, normalize });
      }));
      // The profile's default budget: what both runs read, recorded and never judged. A run past
      // its deadline still stops every later witness of this browser, which then fail.
      const started = performance.now();
      try {
        const what = `effects with the default budget (${profile})`;
        const bare = await guarded(() => runEffects('bare', profile, null), `${what}, bare`);
        const overlay = await guarded(() => runEffects('overlay', profile, null), `${what}, overlay`);
        record.defaultBudget.push({ profile, ...compareEffects(bare, overlay, normalize), seconds: seconds(started) });
      } catch (error) {
        record.defaultBudget.push({ profile, error: String(error?.message ?? error).slice(0, 2000),
          seconds: seconds(started) });
      }
    }

    // No witness asked the browser for a camera (the effects witness hands the controller its own
    // stand-in mediaDevices), and the page reported no error.
    record.closing = await attempt('no camera request and no page error over every witness', null, async () => {
      assert.deepEqual({ requests: await page.evaluate(() => window.cameraRequests().calls), pageErrors },
        { requests: [], pageErrors: [] }, `${runtime}: no camera request and no page error`);
      return {};
    });
  } finally {
    // A page that stopped answering may not close either: the caller closes the browser.
    let timer;
    await Promise.race([context.close().catch(() => {}),
      new Promise(resolve => { timer = setTimeout(resolve, 30_000); })]);
    clearTimeout(timer);
  }
  return { record, failures };
}

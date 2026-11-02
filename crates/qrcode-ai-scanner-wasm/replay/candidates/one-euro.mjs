// One-euro smoothing (6.6) as a replay post-filter over each track's measured sequence.
// It stays runnable here when the experimental option leaves camera.js.

export const name = 'one-euro';
export const DEFAULT_PARAMS = Object.freeze({ minCutoffHz: 1, beta: 0.01, derivativeCutoffHz: 1 });

/** Smoothing factor of a first-order low-pass at hz over te seconds: 1 / (1 + 1 / (2 pi f Te)). */
export const alphaFor = (hz, te) => 1 / (1 + 1 / (2 * Math.PI * hz * te));

function centroid(points) {
  let x = 0, y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

/**
 * The candidate driven by run.mjs: reset() starts a filter on a restart (the filtered speed is
 * 0); blend() takes the previous estimate and the aligned measurement in source px, dt in ms and
 * the history scale of a same-aspect resolution change, and returns the new estimate.
 */
export function createCandidate(params = {}) {
  const { minCutoffHz, beta, derivativeCutoffHz } = { ...DEFAULT_PARAMS, ...params };
  if (!(minCutoffHz > 0 && beta >= 0 && derivativeCutoffHz > 0)) {
    throw new RangeError('one-euro needs minCutoffHz > 0, beta >= 0 and derivativeCutoffHz > 0.');
  }
  return {
    name,
    params: { kind: 'one-euro', minCutoffHz, beta, derivativeCutoffHz },
    reset: () => ({ speed: 0 }),
    blend({ estimate, aligned, dt, state, scale = 1 }) {
      // Te > 0: a measurement dt <= 0 ms apart has already restarted as 'gap'.
      const te = dt / 1000, from = centroid(estimate), to = centroid(aligned);
      const dx = to.x - from.x, dy = to.y - from.y, raw = Math.sqrt(dx * dx + dy * dy) / te;
      const speed = state.speed * scale +
        alphaFor(derivativeCutoffHz, te) * (raw - state.speed * scale);
      const alpha = alphaFor(minCutoffHz + beta * speed, te);
      const points = estimate.map((e, i) => ({ x: e.x + alpha * (aligned[i].x - e.x),
        y: e.y + alpha * (aligned[i].y - e.y) }));
      return { points, state: { speed }, alpha };
    },
  };
}

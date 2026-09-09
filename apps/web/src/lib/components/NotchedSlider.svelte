<script lang="ts">
  import { haptics } from "$lib/haptics.svelte.js";

  const MIN = 0;
  const MAX = 100;
  const NOTCH = 5;
  const SNAP = 50;

  let value = $state(35);
  let enabled = $state(true);

  /** Last notch index we announced, so we fire once per crossing, not per pixel. */
  let lastNotch = Math.round(35 / NOTCH);
  let wasAtLimit = false;
  let wasAtSnap = false;

  const notches = Array.from({ length: (MAX - MIN) / NOTCH + 1 }, (_, i) => MIN + i * NOTCH);

  function onInput(event: Event) {
    const next = Number((event.currentTarget as HTMLInputElement).value);
    value = next;
    if (!enabled) return;

    const atLimit = next === MIN || next === MAX;
    const atSnap = next === SNAP;
    const notch = Math.round(next / NOTCH);

    // Order matters: the strongest true statement about this position wins,
    // otherwise hitting the end would fire both `edge` and `tick` at once.
    if (atLimit && !wasAtLimit) {
      haptics.play("edge", 1);
    } else if (atSnap && !wasAtSnap) {
      haptics.play("align", 0.9);
    } else if (notch !== lastNotch) {
      haptics.play("tick", 0.55);
    }

    lastNotch = notch;
    wasAtLimit = atLimit;
    wasAtSnap = atSnap;
  }
</script>

<section class="card panel">
  <header>
    <div>
      <h2>触覚ノッチ付きスライダー</h2>
      <p class="muted lede">
        Web Haptics API が<strong>まさにこのために</strong>設計されたケース。
        4 つのエフェクトが、そのまま UI の語彙になります。
      </p>
    </div>
    <label class="toggle">
      <input type="checkbox" bind:checked={enabled} />
      <span>触覚 {enabled ? "ON" : "OFF"}</span>
    </label>
  </header>

  <div class="slider" style:--pct="{((value - MIN) / (MAX - MIN)) * 100}%">
    <div class="ticks" aria-hidden="true">
      {#each notches as n (n)}
        <span class="tick" class:major={n === SNAP || n === MIN || n === MAX}></span>
      {/each}
    </div>
    <input
      type="range"
      min={MIN}
      max={MAX}
      step={NOTCH}
      {value}
      oninput={onInput}
      aria-label="触覚ノッチ付きスライダー"
    />
    <output>{value}</output>
  </div>

  <ul class="legend">
    <li><b>tick</b> 5 刻みのノッチを越えたとき</li>
    <li><b>align</b> 中央 50 にスナップしたとき</li>
    <li><b>edge</b> 端（0 / 100）に到達したとき</li>
    <li><b>hint</b> つまみに触れたとき — <span class="muted">CSS の宣言だけで発火</span></li>
  </ul>

  <details>
    <summary>この部品が呼んでいるもの</summary>
    <p class="muted small">
      ノッチの判定は「今どこを越えたか」というランタイムの計算なので
      <b>命令的な API</b> を使います。一方、つまみに触れた・押した、という
      <b>状態の変化</b>は CSS 側の宣言だけで済みます。提案が API を 2 つに
      分けているのは、この住み分けのためです。
    </p>
<pre><code>{`// 命令的 — ノッチを越えた瞬間
navigator.playHaptics("tick", 0.55);

/* 宣言的 — 状態が変わった瞬間
   （提案では @haptic tick 0.55;
     ポリフィルではカスタムプロパティ） */
input[type="range"] {
  --haptic-hover: hint 0.3;
  --haptic-active: tick 0.6;
}`}</code></pre>
  </details>
</section>

<style>
  .panel {
    padding: 1.25rem;
    display: grid;
    gap: 1.15rem;
  }

  header {
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    align-items: flex-start;
  }

  h2 {
    font-size: 1.05rem;
  }

  .lede {
    margin: 0.35rem 0 0;
    font-size: 0.85rem;
    max-width: 46ch;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.82rem;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    --haptic-checked: align 0.8;
  }

  .slider {
    position: relative;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 1rem;
    padding-top: 0.5rem;
  }

  .ticks {
    position: absolute;
    inset: 0.5rem 3.5rem auto 0;
    display: flex;
    justify-content: space-between;
    padding: 0 9px;
    pointer-events: none;
  }

  .tick {
    width: 1px;
    height: 7px;
    background: var(--border-strong);
  }

  .tick.major {
    height: 13px;
    background: var(--text-dim);
  }

  input[type="range"] {
    appearance: none;
    width: 100%;
    height: 34px;
    margin: 0;
    background: transparent;
    cursor: pointer;

    /* The declarative half of the demo. */
    --haptic-hover: hint 0.3;
    --haptic-active: tick 0.6;
  }

  input[type="range"]::-webkit-slider-runnable-track {
    height: 6px;
    margin-top: 14px;
    border-radius: 999px;
    background: linear-gradient(
      to right,
      var(--accent) 0 var(--pct),
      var(--border) var(--pct) 100%
    );
  }

  input[type="range"]::-moz-range-track {
    height: 6px;
    border-radius: 999px;
    background: linear-gradient(
      to right,
      var(--accent) 0 var(--pct),
      var(--border) var(--pct) 100%
    );
  }

  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 22px;
    height: 22px;
    margin-top: -8px;
    border-radius: 50%;
    background: var(--surface);
    border: 2px solid var(--accent);
    box-shadow: var(--shadow);
  }

  input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--surface);
    border: 2px solid var(--accent);
  }

  output {
    font-family: var(--mono);
    font-size: 1.1rem;
    font-variant-numeric: tabular-nums;
    min-width: 2.5ch;
    text-align: right;
  }

  .legend {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.3rem;
    font-size: 0.82rem;
  }

  .legend b {
    font-family: var(--mono);
    color: var(--accent);
    margin-right: 0.5em;
  }

  details {
    font-size: 0.85rem;
    border-top: 1px solid var(--border);
    padding-top: 0.85rem;
  }

  summary {
    cursor: pointer;
    font-weight: 600;
    font-size: 0.82rem;
    --haptic-active: tick 0.6;
  }

  .small {
    font-size: 0.82rem;
  }

  pre {
    margin: 0.6rem 0 0;
    padding: 0.8rem;
    background: var(--surface-2);
    border-radius: 8px;
    overflow-x: auto;
    font-size: 0.76rem;
    line-height: 1.55;
  }

  code {
    font-family: var(--mono);
  }

  @media (max-width: 560px) {
    header {
      flex-direction: column;
    }
  }
</style>

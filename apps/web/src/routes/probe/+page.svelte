<script lang="ts">
  /**
   * Not part of the demo. A throwaway diagnostic for one question:
   * when the iOS switch hack produces no haptic, is it the device or is it us?
   *
   * Variant A is the control. It is a real, visible switch that the finger
   * touches directly — no script in the path at all. If A is silent, nothing
   * in this file can possibly work and the cause is the device (System Haptics
   * off, or an iOS that does not tap for switches). If A buzzes but B/C/D do
   * not, then a synthetic click is the thing iOS refuses, and the hack is dead
   * regardless of how we place the element.
   */

  let log = $state<string[]>([]);
  let switchSupported = $state<boolean | null>(null);
  let ua = $state("");

  function note(msg: string) {
    log = [`${new Date().toLocaleTimeString()}  ${msg}`, ...log].slice(0, 12);
  }

  $effect(() => {
    const probe = document.createElement("input");
    probe.type = "checkbox";
    switchSupported = "switch" in probe;
    ua = navigator.userAgent;
  });

  /** B: exactly what the polyfill does today — offscreen, transparent, in <body>. */
  function makeOffscreen() {
    const id = `probe-b-${Math.random().toString(36).slice(2, 8)}`;
    const label = document.createElement("label");
    label.setAttribute("for", id);
    label.setAttribute("aria-hidden", "true");
    label.style.cssText =
      "position:fixed;width:1px;height:1px;left:-9999px;top:0;pointer-events:none;opacity:0";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.id = id;
    input.tabIndex = -1;
    input.style.cssText = "all:initial;appearance:auto";
    label.appendChild(input);
    document.body.appendChild(label);
    return label;
  }

  /** C: the placement the published ios-haptics package uses. */
  function makeHeadHidden() {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.display = "none";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    label.appendChild(input);
    document.head.appendChild(label);
    return label;
  }

  let hostB: HTMLLabelElement | null = null;
  let hostC: HTMLLabelElement | null = null;
  let visibleLabel: HTMLLabelElement;

  function fireB() {
    hostB ??= makeOffscreen();
    hostB.click();
    note("B: offscreen + opacity:0 → label.click()");
  }

  function fireC() {
    hostC ??= makeHeadHidden();
    hostC.click();
    note("C: <head> + display:none → label.click()");
  }

  function fireD() {
    visibleLabel.click();
    note("D: 画面内の可視スイッチ → label.click()");
  }
</script>

<main>
  <h1>switch ハック 実機診断</h1>

  <p class="lead">
    上から順にタップして、<strong>振動したものだけ</strong>を記録してください。
    音は出ません。判定は指の感触だけです。
  </p>

  <section class="control">
    <h2>A. 対照実験（スクリプトを一切通さない）</h2>
    <p>
      これは本物のスイッチです。<strong>つまみを指で直接タップ</strong>してください。
      ここで振動しないなら、原因はコードではなく端末側です。
    </p>
    <label class="real">
      <input type="checkbox" {...{ switch: "" }} />
      <span>指で直接トグルする</span>
    </label>
  </section>

  <section>
    <h2>B〜D. プログラムからのクリック</h2>
    <p>ボタン自体のタップは本物の操作なので、user activation は満たされた状態で発火します。</p>
    <div class="btns">
      <button onclick={fireB}>B. 現在の polyfill 実装（オフスクリーン）</button>
      <button onclick={fireC}>C. head + display:none 方式</button>
      <button onclick={fireD}>D. 可視スイッチをプログラムでクリック</button>
    </div>
    <label class="real" bind:this={visibleLabel}>
      <input type="checkbox" tabindex="-1" {...{ switch: "" }} />
      <span>D が操作する可視スイッチ</span>
    </label>
  </section>

  <dl class="env">
    <dt>switch 属性</dt>
    <dd>{switchSupported === null ? "…" : switchSupported ? "あり（iOS 17.4+ 相当）" : "なし"}</dd>
    <dt>UA</dt>
    <dd class="ua">{ua}</dd>
  </dl>

  {#if log.length}
    <ul class="log">
      {#each log as line, i (i)}<li>{line}</li>{/each}
    </ul>
  {/if}

  <p class="back"><a href="/">← デモに戻る</a></p>
</main>

<style>
  main {
    max-width: 34rem;
    margin: 0 auto;
    padding: 1.5rem 1.1rem 4rem;
    display: grid;
    gap: 1.5rem;
  }

  h1 {
    font-size: 1.2rem;
    margin: 0;
  }

  h2 {
    font-size: 0.95rem;
    margin: 0 0 0.4rem;
  }

  .lead,
  section p {
    margin: 0 0 0.75rem;
    font-size: 0.88rem;
    line-height: 1.6;
    opacity: 0.85;
  }

  section {
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    border-radius: 0.7rem;
    padding: 1rem;
  }

  .control {
    border-color: color-mix(in srgb, currentColor 45%, transparent);
  }

  .real {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.6rem 0;
    font-size: 0.9rem;
  }

  .real input {
    /* No appearance reset: this must render as Safari's own switch control. */
    width: 3.2rem;
    height: 2rem;
    flex: none;
  }

  .btns {
    display: grid;
    gap: 0.5rem;
  }

  button {
    font: inherit;
    font-size: 0.88rem;
    text-align: left;
    padding: 0.85rem 1rem;
    border-radius: 0.55rem;
    border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
    background: color-mix(in srgb, currentColor 7%, transparent);
    color: inherit;
    /* A 44px target, so a missed tap is never mistaken for a missing haptic. */
    min-height: 44px;
  }

  button:active {
    background: color-mix(in srgb, currentColor 16%, transparent);
  }

  .env {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.3rem 0.9rem;
    font-size: 0.8rem;
    margin: 0;
  }

  .env dt {
    opacity: 0.6;
  }

  .env dd {
    margin: 0;
  }

  .ua {
    word-break: break-all;
    opacity: 0.7;
  }

  .log {
    margin: 0;
    padding: 0.7rem 0.9rem;
    list-style: none;
    border-radius: 0.55rem;
    background: color-mix(in srgb, currentColor 7%, transparent);
    font-size: 0.75rem;
    line-height: 1.7;
    display: grid;
    gap: 0.1rem;
  }

  .back {
    font-size: 0.85rem;
    margin: 0;
  }
</style>

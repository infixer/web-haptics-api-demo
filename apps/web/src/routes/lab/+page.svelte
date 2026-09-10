<script lang="ts">
  import { onMount } from 'svelte';
  import { mobilePatterns, scalePattern } from '$lib/mobile-patterns';
  let vibrate = $state(false);
  let switches = $state(false);
  let secure = $state(false);
  let ua = $state('');
  let enabled = $state(true);
  let overlay = $state(false);
  let saved = $state(false);
  let reference: HTMLInputElement;
  let scale = $state(1);
  let duration = $state(80);
  let status = $state('まず1回タップして、指で感触を確かめてください。音は出ません。');
  let last = $state('未操作');
  let felt = $state('未回答');
  let device = $state('');
  let logs = $state<string[]>([]);
  let slider = $state(50);
  let lastNotch = 5;
  let lastTick = 0;

  function note(message: string) {
    last = message;
    felt = '未回答';
    logs = [`${new Date().toISOString()} ${message}`, ...logs].slice(0, 30);
  }
  function play(name: string, pattern: readonly number[]) {
    if (!enabled) { status = '振動はオフです。'; return; }
    if (!vibrate) { status = 'このブラウザには Vibration API がありません。iPhone は下のスイッチを試してください。'; return; }
    if (document.visibilityState !== 'visible') return;
    try {
      const result = navigator.vibrate([...pattern]);
      note(`${name}: [${pattern.join(', ')}] ms / 戻り値 ${result}`);
      status = result ? `${name}を要求しました。true は実際の振動を保証しません。` : 'ブラウザが要求を受け付けませんでした。設定と通常タブでの表示を確認してください。';
    } catch (error) { status = `振動要求に失敗しました: ${String(error)}`; }
  }
  function stop() {
    if (vibrate) { try { navigator.vibrate(0); } catch { /* best effort */ } }
    status = '停止しました。';
  }
  function nativeChange(event: Event, name: string) {
    note(`${name}: change.isTrusted=${event.isTrusted}`);
    status = 'スイッチが切り替わりました。イベントの記録は振動の証明ではありません。';
  }
  function move(event: Event) {
    slider = Number((event.currentTarget as HTMLInputElement).value);
    const notch = Math.floor(slider / 10);
    const now = performance.now();
    if (notch !== lastNotch && now - lastTick > 70) {
      lastTick = now;
      play('ノッチ', scalePattern([notch === 0 || notch === 10 ? 45 : 20], scale));
    }
    lastNotch = notch;
  }
  function download() {
    const report = { at: new Date().toISOString(), device, ua, secure, vibrate, switches, last, felt, logs,
      note: 'API/DOM の記録と人の申告。振動センサーによる実測ではない。' };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'haptics-result.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  onMount(() => {
    vibrate = typeof navigator.vibrate === 'function';
    switches = 'switch' in document.createElement('input');
    secure = isSecureContext;
    ua = navigator.userAgent;
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); stop(); };
  });
</script>

<svelte:head><title>スマホ触覚ラボ — iOS / Android</title><meta name="description" content="Androidの振動パターンとiPhoneの直接タップを比較する、音なしの触覚デモ。" /></svelte:head>

<main>
  <header>
    <a href="/">← Web Haptics API の提案デモ</a>
    <p class="eyebrow">MOBILE HAPTICS · 実機で確かめる</p>
    <h1>指先で、確かめる。</h1>
    <p>Android は長さとリズム。iPhone は直接タップの1クリック。使える仕組みに合わせた、音なしのデモです。</p>
  </header>
  <div class="toolbar">
    <label><input type="checkbox" bind:checked={enabled} onchange={() => { if (!enabled) stop(); }} /> 振動を有効にする</label>
    <button onclick={stop}>Android の振動を停止</button>
  </div>
  <p class="status" role="status">{status}</p>

  <section class="card">
    <div class="heading"><h2>01 / Android — リズムを選ぶ</h2><span>{vibrate ? 'API あり・実振動は要確認' : 'Vibration API なし'}</span></div>
    <p>Chrome などの対応ブラウザで、カードをタップ。強さではなく<strong>振動時間</strong>を調整します。</p>
    <div class="patterns">
      {#each mobilePatterns as item}
        <button class="pattern" disabled={!vibrate || !enabled} onclick={() => play(item.name, scalePattern(item.pattern, scale))}>
          <span class="bars" aria-hidden="true">{#each item.pattern as ms, i}<i class:gap={i % 2 === 1} style:width={`${Math.max(6, ms / 3)}px`}></i>{/each}</span>
          <strong>{item.name}</strong><span>{item.detail}</span>
        </button>
      {/each}
    </div>
    <label class="range">パルスの長さ ×{scale.toFixed(1)}<input type="range" min="0.5" max="3" step="0.1" bind:value={scale} /></label>
    <details><summary>感じにくい端末で調整する</summary>
      <p>短いパルスが弱ければ、まず200msで確認してください。端末・ブラウザの振動設定や省電力・サイレント設定でも結果が変わります。</p>
      <label class="range">単発 {duration} ms<input type="range" min="10" max="300" step="10" bind:value={duration} /></label>
      <div class="actions"><button disabled={!vibrate || !enabled} onclick={() => play('単発', [duration])}>この長さで試す</button><button disabled={!vibrate || !enabled} onclick={() => play('基準', [200])}>200ms の基準振動</button></div>
    </details>
    <label class="range">ノッチをなぞる <output>{slider}</output><input type="range" min="0" max="100" value={slider} oninput={move} disabled={!vibrate || !enabled} /></label>
    <p class="small">iPhone でドラッグ中の振動や自動連打を再現する機能ではありません。</p>
  </section>

  <section class="card">
    <div class="heading"><h2>02 / iPhone — タップで1クリック</h2><span>{switches ? 'switch 属性あり・実振動は要確認' : 'switch 属性なし'}</span></div>
    <p>まず<strong>スイッチ本体</strong>を指でタップ。iOS 18以降のWebKitにはシステムの触覚があります。最新版での感触は実機で確認してください。</p>
    <div class="reference"><input bind:this={reference} type="checkbox" {...{ switch: '' }} aria-label="基準スイッチ" disabled={!enabled} onchange={(e) => nativeChange(e, '可視スイッチ')} /><span>基準スイッチ</span></div>
    <label class="optin"><input type="checkbox" bind:checked={overlay} /> 透明スイッチの実験を有効にする</label>
    <p class="small">この実験では下の「お気に入り」の上からスクロールを始めにくくなることがあります。周囲の余白からスクロールしてください。</p>
    {#if overlay && switches}
      <div class="favorite" class:saved class:disabled={!enabled}>
        <span aria-hidden="true">{saved ? '♥ お気に入り登録済み' : '♡ お気に入りに追加'}</span>
        <input class="overlay" type="checkbox" {...{ switch: '' }} aria-label="お気に入り" bind:checked={saved} disabled={!enabled} onchange={(e) => nativeChange(e, '透明スイッチ')} />
      </div>
    {:else}
      <p class="small">switch 属性のあるブラウザで実験を有効にすると、タップ用コントロールが表示されます。</p>
    {/if}
    <p>切り替えを指で直接行う方式です。完了通知などをJavaScriptから好きなタイミングで鳴らすことや、振動の強さ・リズムの指定はできません。</p>
    <details><summary>合成クリックと比較する</summary>
      <p>同じ基準スイッチをスクリプトで操作します。切り替わっても、現在のiOSでは触覚が出ないと予想されます。</p>
      <button disabled={!enabled} onclick={() => { reference.click(); note('合成 input.click() を要求'); status = '合成クリックを送りました。直接タップとの感触を比較してください。'; }}>基準スイッチを .click() で操作</button>
      <a href="/probe">label.click() を含む詳細比較 →</a>
    </details>
  </section>

  <section class="card">
    <h2>03 / 感じた結果を残す</h2>
    <p class="small">直前の操作: {last}</p>
    <fieldset><legend>実際に振動を感じましたか？</legend><div class="actions">{#each ['感じた', '弱い', '感じない'] as answer}<button aria-pressed={felt === answer} onclick={() => { felt = answer; logs = [`${new Date().toISOString()} 申告: ${answer} / ${last}`, ...logs].slice(0,30); }}>{answer}</button>{/each}</div></fieldset>
    <label class="range">端末・OS・ブラウザのバージョン（手入力）<input type="text" bind:value={device} placeholder="例: iPhone SE 第3世代 / iOS 26.6.2 / Safari" /></label>
    <button onclick={download}>検証結果を JSON で保存</button>
    <p class="small">このページから結果を送信しません。UAだけでは正確なOSバージョンを判定できません。</p>
    <details><summary>環境情報と注意点</summary><p>Secure context: {secure ? 'yes' : 'no'} / Vibration API: {vibrate ? 'あり' : 'なし'} / switch: {switches ? 'あり' : 'なし'}</p><p class="ua">{ua}</p><p>スマホではHTTPSの通常タブで開いてください。APIの存在・戻り値・画面の変化だけでは実際の振動を確認できません。音による代用や自動フォールバックはありません。</p></details>
  </section>
  <footer>調査: 2026-09-10 · <a href="https://github.com/WebKit/WebKit/commit/4a8a90644cfc7a9a4b3cab13c4c0b49c53862787">WebKit の合成クリック制限</a> · <a href="https://googlechrome.github.io/samples/vibration/">Chrome の振動サンプル</a></footer>
</main>

<style>
  main { max-width: 760px; margin: auto; padding: 1.5rem 1rem 4rem; display: grid; gap: 1.25rem; }
  a { color: var(--accent); } header p { max-width: 56ch; } h1 { font-size: clamp(2rem, 7vw, 3rem); } h2 { font-size: 1.15rem; }
  .eyebrow { color: var(--accent); font: 0.85rem var(--mono); margin-top: 1.5rem; }
  .card { padding: clamp(1rem, 4vw, 1.5rem); } .heading { display: grid; gap: 0.4rem; } .heading > span, .small, footer { font-size: 0.875rem; color: var(--text-dim); }
  button { min-height: 44px; padding: 0.65rem 1rem; border: 1px solid var(--border-strong); border-radius: 9px; background: var(--surface); cursor: pointer; }
  button:active { background: var(--accent-soft); } button:disabled, .disabled { opacity: 0.5; cursor: default; }
  button[aria-pressed=true] { background: var(--accent-soft); border-color: var(--accent); }
  .toolbar, .actions { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
  .status { padding: 1rem; margin: 0; background: var(--accent-soft); border-radius: 9px; }
  .patterns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
  .pattern { text-align: left; display: grid; gap: 0.4rem; padding: 1rem; } .pattern > span:last-child { font-size: 0.875rem; color: var(--text-dim); }
  .bars { display: flex; align-items: center; height: 30px; } i { height: 22px; border-radius: 3px; background: var(--accent); } i.gap { background: transparent; }
  .range { display: grid; gap: 0.6rem; margin: 1.25rem 0; } input[type=range] { width: 100%; min-height: 44px; accent-color: var(--accent); } input[type=text] { width: 100%; min-width: 0; padding: 0.75rem; font: inherit; color: inherit; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 8px; }
  details { border-top: 1px solid var(--border); padding-top: 1rem; margin-top: 1rem; } summary { cursor: pointer; min-height: 44px; } details a { display: block; margin-top: 1rem; }
  .reference { display: flex; align-items: center; gap: 1rem; padding: 1rem 0 1.5rem; } .reference input { appearance: auto; width: 3.5rem; height: 2rem; }
  .optin { display: flex; gap: 0.7rem; align-items: center; min-height: 44px; }
  .favorite { position: relative; width: min(100%, 320px); height: 64px; display: grid; place-items: center; border: 1px solid var(--accent); border-radius: 16px; background: var(--surface); font-weight: 700; clip-path: inset(0 round 16px); }
  .favorite.saved { background: var(--accent-soft); color: var(--accent); }
  .favorite:has(input:focus-visible) { outline: 3px solid var(--accent); outline-offset: -4px; }
  .overlay { position: absolute; inset: 0; margin: 0; width: 100%; height: 100%; appearance: auto; -webkit-appearance: auto; opacity: 0; cursor: pointer; clip-path: inset(0 round 16px); }
  fieldset { border: 0; padding: 0; margin: 1rem 0; } legend { margin-bottom: 0.5rem; } .ua { overflow-wrap: anywhere; }
</style>

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
  let platform = $state<'android' | 'ios'>('android');
  let selected = $state('');
  let reference: HTMLInputElement;
  let scale = $state(1);
  let duration = $state(80);
  let status = $state('タップして試す');
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
    if (!vibrate) { status = 'このブラウザは非対応です'; return; }
    if (document.visibilityState !== 'visible') return;
    try {
      const result = navigator.vibrate([...pattern]);
      note(`${name}: [${pattern.join(', ')}] ms / 戻り値 ${result}`);
      selected = name;
      status = result ? `${name}をリクエスト` : '振動をリクエストできませんでした';
    } catch (error) { status = `振動要求に失敗しました: ${String(error)}`; }
  }
  function stop() {
    if (vibrate) { try { navigator.vibrate(0); } catch { /* best effort */ } }
    status = '停止しました。';
  }
  function nativeChange(event: Event, name: string) {
    note(`${name}: change.isTrusted=${event.isTrusted}`);
    status = '切り替えました';
  }
  function switchTab(next: 'android' | 'ios') {
    stop();
    platform = next;
    status = next === 'ios' ? 'スイッチを直接タップ' : 'タップして試す';
  }
  function tabKey(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'android' : event.key === 'End' ? 'ios' : platform === 'android' ? 'ios' : 'android';
    switchTab(next);
    document.getElementById(`tab-${next}`)?.focus();
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
    // A convenience default only; capability detection still controls availability.
    if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      platform = 'ios';
      status = 'スイッチを直接タップ';
    }
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); stop(); };
  });
</script>

<svelte:head><title>スマホ触覚ラボ — iOS / Android</title><meta name="description" content="Androidの振動パターンとiPhoneの直接タップを比較する、音なしの触覚デモ。" /></svelte:head>

<main>
  <header>
    <a class="back" href="/" aria-label="提案デモに戻る">←</a>
    <h1>Haptics Lab<span>触って、感じる。</span></h1>
    <label class="enable"><input type="checkbox" bind:checked={enabled} onchange={() => { if (!enabled) stop(); else status = 'タップして試す'; }} /><span>振動</span></label>
  </header>

  <div class="tabs" role="tablist" aria-label="デバイス">
    <button id="tab-android" role="tab" aria-selected={platform === 'android'} aria-controls="panel-android" tabindex={platform === 'android' ? 0 : -1} onclick={() => switchTab('android')} onkeydown={tabKey}>Android</button>
    <button id="tab-ios" role="tab" aria-selected={platform === 'ios'} aria-controls="panel-ios" tabindex={platform === 'ios' ? 0 : -1} onclick={() => switchTab('ios')} onkeydown={tabKey}>iOS</button>
  </div>

  <div id="panel-android" role="tabpanel" aria-labelledby="tab-android" hidden={platform !== 'android'} tabindex="0">
    {#if !vibrate}<p class="notice">対応するAndroidブラウザで開いてください。</p>{/if}
    <div class="patterns">
      {#each mobilePatterns as item}
        <button class="pattern" class:selected={selected === item.name} disabled={!vibrate || !enabled} onclick={() => play(item.name, scalePattern(item.pattern, scale))}>
          <span class="bars" aria-hidden="true">{#each item.pattern as ms, i}<i class:gap={i % 2 === 1} style:width={`${Math.max(6, ms / 3)}px`}></i>{/each}</span>
          <span class="pattern-label">{item.name}<span aria-hidden="true">↗</span></span>
        </button>
      {/each}
    </div>
    <div class="controls">
      <label class="range"><span>振動の長さ <output>×{scale.toFixed(1)}</output></span><input type="range" min="0.5" max="3" step="0.1" bind:value={scale} disabled={!vibrate || !enabled} /></label>
      <label class="range"><span>ノッチをなぞる <output>{slider}</output></span><input type="range" min="0" max="100" value={slider} oninput={move} disabled={!vibrate || !enabled} /></label>
      <div class="actions"><button class="baseline" disabled={!vibrate || !enabled} onclick={() => play('基準', [200])}>200ms を試す</button><button class="stop" onclick={stop} disabled={!vibrate} aria-label="振動を停止"><span aria-hidden="true">■</span> 停止</button></div>
    </div>
    <details class="extra"><summary>細かく調整</summary>
      <label class="range"><span>単発 <output>{duration} ms</output></span><input type="range" min="10" max="300" step="10" bind:value={duration} /></label>
      <button disabled={!vibrate || !enabled} onclick={() => play('単発', [duration])}>この長さで試す</button>
    </details>
  </div>

  <div id="panel-ios" role="tabpanel" aria-labelledby="tab-ios" hidden={platform !== 'ios'} tabindex="0">
    {#if !switches}<p class="notice">iPhoneのSafariで試してください。</p>{/if}
    <div class="ios-surface">
      <div class="reference">
        <div><h2>スイッチ</h2><p>本体を直接タップ</p></div>
        <input bind:this={reference} type="checkbox" {...{ switch: '' }} aria-label="基準スイッチ" disabled={!enabled || !switches} onchange={(e) => nativeChange(e, '可視スイッチ')} />
      </div>
      <div class="overlay-demo">
        <label class="optin"><span>ボタンで試す <small>実験</small></span><input type="checkbox" bind:checked={overlay} disabled={!switches} /></label>
        <div class="favorite" class:saved class:disabled={!enabled || !overlay || !switches}>
          <span aria-hidden="true"><span class="heart">{saved ? '♥' : '♡'}</span>{saved ? 'お気に入り済み' : 'お気に入り'}</span>
          <input class="overlay" type="checkbox" {...{ switch: '' }} aria-label="お気に入り" bind:checked={saved} disabled={!enabled || !overlay || !switches} onchange={(e) => nativeChange(e, '透明スイッチ')} />
        </div>
        <p class="hint">{overlay ? 'スクロールはボタンの外側から。' : '有効にするとボタンを試せます。'}</p>
      </div>
    </div>
    <p class="platform-note">直接タップで1クリック。強さ・連打の指定はできません。</p>
    <details class="extra"><summary>仕組みを比較</summary>
      <p>スクリプトからのクリックは、現在のiOSでは振動しない想定です。</p>
      <button disabled={!enabled || !switches} onclick={() => { reference.click(); note('合成 input.click() を要求'); status = '合成クリックをリクエスト'; }}>スクリプトで切り替え</button>
      <a href="/probe">詳細な比較テスト →</a>
    </details>
  </div>

  <div class="feedback"><span class="feedback-mark" aria-hidden="true">⌁</span><p role="status">{enabled ? status : '振動オフ'}</p><span class="silent">音なし</span></div>

  <details class="diagnostics">
    <summary>検証・記録</summary>
    <p class="small">表示は操作の記録です。実際の振動は指で確認してください。</p>
    <fieldset><legend>感じましたか？</legend><div class="actions">{#each ['感じた', '弱い', '感じない'] as answer}<button aria-pressed={felt === answer} onclick={() => { felt = answer; logs = [`${new Date().toISOString()} 申告: ${answer} / ${last}`, ...logs].slice(0,30); }}>{answer}</button>{/each}</div></fieldset>
    <label class="range"><span>端末・OS・ブラウザ</span><input type="text" bind:value={device} placeholder="例: iPhone / iOS 26.6.2 / Safari" /></label>
    <button onclick={download}>JSON を保存</button>
    <p class="small">この端末に保存します。外部への送信はありません。</p>
    <details><summary>環境情報</summary><p class="small">直前の操作: {last}</p><p class="small">Secure context: {secure ? 'yes' : 'no'} / Vibration API: {vibrate ? 'あり' : 'なし'} / switch: {switches ? 'あり' : 'なし'}</p><p class="ua">{ua}</p><p class="small">実機ではHTTPSの通常タブを推奨。APIの存在や戻り値は実振動を保証しません。</p></details>
  </details>
</main>

<style>
  main { max-width: 540px; margin: auto; padding: 1.25rem 1rem 3rem; }
  header { display: flex; align-items: center; gap: 0.85rem; margin-bottom: 1.5rem; }
  a { color: var(--accent); }
  .back { display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid var(--border); border-radius: 50%; color: var(--text); text-decoration: none; font-size: 1.3rem; flex: none; }
  h1 { flex: 1; font-size: 1.3rem; letter-spacing: -0.04em; } h1 span { display: block; margin-top: 0.25rem; font-size: 0.8rem; font-weight: 400; letter-spacing: 0; color: var(--text-dim); }
  h2 { font-size: 1rem; } p { margin: 0; }
  .enable { display: flex; align-items: center; gap: 0.4rem; min-height: 44px; font-size: 0.875rem; }
  input[type=checkbox] { accent-color: var(--accent); }
  button { min-height: 44px; padding: 0.65rem 1rem; border: 1px solid var(--border-strong); border-radius: 10px; background: var(--surface); cursor: pointer; font-size: 0.875rem; }
  button:disabled, .disabled { opacity: 0.4; cursor: default; }
  button:active:not(:disabled) { transform: scale(0.98); }
  button[aria-pressed=true] { background: var(--accent-soft); border-color: var(--accent); }
  .tabs { display: flex; padding: 5px; gap: 5px; border: 1px solid var(--border); background: var(--surface-2); border-radius: 14px; margin-bottom: 1rem; }
  .tabs button { flex: 1; border: 0; background: transparent; font-size: 1rem; font-weight: 600; color: var(--text-dim); }
  .tabs button[aria-selected=true] { background: var(--surface); color: var(--text); box-shadow: var(--shadow); }
  [role=tabpanel][hidden] { display: none; }
  .notice { font-size: 0.875rem; padding: 0.75rem 1rem; margin-bottom: 1rem; background: var(--accent-soft); border-radius: 10px; }
  .patterns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem; }
  .pattern { min-height: 116px; display: flex; flex-direction: column; justify-content: space-between; padding: 1.15rem; text-align: left; border-color: var(--border); border-radius: 16px; transition: background 150ms, transform 100ms; }
  .pattern.selected { background: var(--accent-soft); border-color: var(--accent); }
  .pattern-label { display: flex; align-items: center; justify-content: space-between; width: 100%; font-size: 1rem; font-weight: 600; }
  .pattern-label > span { color: var(--text-dim); font-weight: 400; }
  .bars { display: flex; align-items: center; height: 28px; }
  i { height: 25px; border-radius: 3px; background: var(--accent); } i.gap { background: transparent; }
  .controls { border: 1px solid var(--border); border-radius: 16px; padding: 0.9rem 1.1rem 1.1rem; background: var(--surface); margin-top: 0.8rem; }
  .range { display: grid; gap: 0.25rem; margin: 0.65rem 0; font-size: 0.875rem; }
  .range > span { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  output { font-family: var(--mono); color: var(--accent); }
  input[type=range] { width: 100%; min-height: 40px; margin: 0; accent-color: var(--accent); cursor: pointer; }
  input[type=text] { width: 100%; min-width: 0; padding: 0.75rem; font: inherit; color: inherit; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 8px; }
  .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; } .baseline { flex: 1; } .stop { background: var(--surface-2); border-color: transparent; } .stop span { font-size: 0.7rem; }
  details { border-top: 1px solid var(--border); padding-top: 0.25rem; }
  summary { display: list-item; padding: 0.75rem 0; min-height: 44px; cursor: pointer; color: var(--text-dim); font-size: 0.875rem; }
  .extra { margin-top: 0.8rem; } details p { font-size: 0.875rem; color: var(--text-dim); margin: 0.5rem 0 1rem; } details a { display: block; margin: 0.75rem 0; font-size: 0.875rem; }
  .ios-surface { border: 1px solid var(--border); border-radius: 16px; padding: 1.25rem; background: var(--surface); }
  .reference { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.25rem 0 1.5rem; }
  .reference p { color: var(--text-dim); font-size: 0.875rem; margin-top: 0.3rem; }
  .reference input { appearance: auto; width: 3.5rem; height: 2rem; flex: none; }
  .overlay-demo { border-top: 1px solid var(--border); padding-top: 0.8rem; }
  .optin { display: flex; justify-content: space-between; align-items: center; min-height: 44px; gap: 1rem; font-size: 0.875rem; }
  .optin small { font-size: 0.75rem; color: var(--text-dim); border: 1px solid var(--border); padding: 0.15rem 0.4rem; border-radius: 5px; margin-left: 0.4rem; }
  .favorite { position: relative; width: 100%; height: 76px; margin: 0.9rem 0; display: grid; place-items: center; border: 1px solid var(--accent); border-radius: 16px; background: var(--surface); font-weight: 600; clip-path: inset(0 round 16px); }
  .favorite > span { display: flex; align-items: center; gap: 0.7rem; } .heart { font-size: 1.6rem; color: var(--accent); }
  .favorite.saved { background: var(--accent-soft); color: var(--accent); }
  .favorite:has(input:focus-visible) { outline: 3px solid var(--accent); outline-offset: -4px; }
  .overlay { position: absolute; inset: 0; margin: 0; width: 100%; height: 100%; appearance: auto; -webkit-appearance: auto; opacity: 0; cursor: pointer; clip-path: inset(0 round 16px); }
  .hint, .platform-note { font-size: 0.8rem; color: var(--text-dim); } .platform-note { margin-top: 0.9rem; }
  .feedback { display: flex; align-items: center; gap: 0.6rem; min-height: 44px; margin: 0.4rem 0 1rem; font-size: 0.8rem; color: var(--text-dim); }
  .feedback p { flex: 1; overflow-wrap: anywhere; } .feedback-mark { font-size: 1.5rem; color: var(--accent); } .silent { flex: none; font-size: 0.75rem; }
  .small, .ua { font-size: 0.8rem; overflow-wrap: anywhere; }
  fieldset { border: 0; padding: 0; margin: 1rem 0; } legend { font-size: 0.875rem; margin-bottom: 0.5rem; }
  @media (max-width: 360px) { .pattern { padding: 0.85rem; } main { padding-inline: 0.75rem; } h1 { font-size: 1.15rem; } }
</style>

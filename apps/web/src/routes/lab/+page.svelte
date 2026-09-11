<script lang="ts">
  import { onMount } from 'svelte';
  import { mobilePatterns, scalePattern } from '$lib/mobile-patterns';
  let vibrate = $state(false);
  let switches = $state(false);
  let enabled = $state(true);
  let saved = $state(false);
  let platform = $state<'android' | 'ios'>('android');
  let selected = $state('');
  let scale = $state(1);
  let status = $state('タップして試す');
  let slider = $state(50);
  let lastNotch = 5;
  let lastTick = 0;
  let environment = $state('');
  let logs = $state<string[]>([]);
  let copyStatus = $state('');
  let copying = $state(false);
  let logArea: HTMLTextAreaElement;
  const logText = $derived([environment, '※ APIの受付・操作の記録です。実際の振動は検出できません。', ...logs].filter(Boolean).join('\n'));

  function log(message: string) {
    const activation = navigator.userActivation;
    const context = `tab=${platform} enabled=${enabled} visibility=${document.visibilityState} activation=${activation?.hasBeenActive ?? 'unknown'}/${activation?.isActive ?? 'unknown'}`;
    logs = [...logs, `${new Date().toISOString()} ${message} | ${context}`].slice(-60);
    copyStatus = '';
  }

  async function copyLog() {
    if (copying) return;
    copying = true;
    const snapshot = logText;
    try {
      await navigator.clipboard.writeText(snapshot);
      copyStatus = 'コピーしました';
    } catch {
      logArea.focus();
      logArea.select();
      logArea.setSelectionRange(0, logArea.value.length);
      copyStatus = '全文を選択しました。長押し、または Ctrl / ⌘ + C でコピー';
    } finally {
      copying = false;
    }
  }

  function switchChanged(event: Event, name: string) {
    const input = event.currentTarget as HTMLInputElement;
    status = '切り替えました';
    log(`${name} change checked=${input.checked} trusted=${event.isTrusted} (実振動は未判定)`);
  }

  function play(name: string, pattern: readonly number[]) {
    const request = `${name} vibrate(${JSON.stringify(pattern)})`;
    if (!enabled) { status = '振動はオフです。'; log(`${request} SKIP: 振動オフ`); return; }
    if (!vibrate) { status = 'このブラウザは非対応です'; log(`${request} SKIP: Vibration APIなし`); return; }
    if (document.visibilityState !== 'visible') { log(`${request} SKIP: ページ非表示`); return; }
    try {
      const result = navigator.vibrate([...pattern]);
      selected = name;
      status = result ? `${name}を選択` : '振動を開始できませんでした';
      log(`${request} return=${result} ${result ? '受付 (実振動は未判定)' : '拒否'}`);
    } catch (error) {
      status = '振動を開始できませんでした';
      log(`${request} ERROR: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`);
    }
  }
  function stop(reason = '停止ボタン') {
    if (vibrate) {
      try { log(`${reason} vibrate(0) return=${navigator.vibrate(0)}`); }
      catch (error) { log(`${reason} ERROR: ${String(error)}`); }
    } else { log(`${reason} 停止要求なし: Vibration APIなし`); }
    status = '停止しました。';
  }
  function switchTab(next: 'android' | 'ios') {
    stop('タブ切替');
    platform = next;
    log(`タブ切替 → ${next}`);
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
  onMount(() => {
    vibrate = typeof navigator.vibrate === 'function';
    switches = 'switch' in document.createElement('input');
    const ua = navigator.userAgent;
    // A convenience default only; capability detection still controls availability.
    if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      platform = 'ios';
      status = 'スイッチを直接タップ';
    }
    environment = `Haptics Lab / log-v1\n開始: ${new Date().toISOString()}\nUA: ${ua}\nsecureContext=${isSecureContext} iframe=${window.self !== window.top} vibrate=${vibrate} switch=${switches}\nactivation=hasBeenActive/isActive / 最新60件・時刻はUTC`;
    log('ページ初期化');
    const hide = () => { log(`表示状態 → ${document.visibilityState}`); if (document.hidden) stop('ページ非表示'); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); stop('ページ終了'); };
  });
</script>

<svelte:head><title>スマホ触覚ラボ — iOS / Android</title><meta name="description" content="Androidの振動パターンとiPhoneの直接タップを比較する、音なしの触覚デモ。" /></svelte:head>

<main>
  <header>
    <h1>Haptics Lab</h1>
    <label class="enable"><input type="checkbox" bind:checked={enabled} onchange={(event) => { enabled = event.currentTarget.checked; log(`振動設定 → ${enabled ? 'ON' : 'OFF'}`); if (!enabled) stop('振動オフ'); else status = 'タップして試す'; }} /><span>振動</span></label>
  </header>

  <div class="tabs" role="tablist" aria-label="デバイス">
    <button id="tab-android" role="tab" aria-selected={platform === 'android'} aria-controls="panel-android" tabindex={platform === 'android' ? 0 : -1} onclick={() => switchTab('android')} onkeydown={tabKey}>Android</button>
    <button id="tab-ios" role="tab" aria-selected={platform === 'ios'} aria-controls="panel-ios" tabindex={platform === 'ios' ? 0 : -1} onclick={() => switchTab('ios')} onkeydown={tabKey}>iOS</button>
  </div>

  <div id="panel-android" role="tabpanel" aria-labelledby="tab-android" hidden={platform !== 'android'} tabindex="0">
    {#if !vibrate}<p class="notice">対応するAndroidブラウザで開いてください。</p>{/if}
    <div class="patterns">
      {#each mobilePatterns as item}
        <button class="pattern" class:selected={selected === item.name} disabled={!enabled} onclick={() => play(item.name, scalePattern(item.pattern, scale))}>
          <span class="bars" aria-hidden="true">{#each item.pattern as ms, i}<i class:gap={i % 2 === 1} style:width={`${Math.max(6, ms / 3)}px`}></i>{/each}</span>
          <span class="pattern-label">{item.name}<span aria-hidden="true">↗</span></span>
        </button>
      {/each}
    </div>
    <div class="controls">
      <label class="range"><span>振動の長さ <output>×{scale.toFixed(1)}</output></span><input type="range" min="0.5" max="3" step="0.1" bind:value={scale} disabled={!vibrate || !enabled} /></label>
      <label class="range"><span>ノッチをなぞる <output>{slider}</output></span><input type="range" min="0" max="100" value={slider} oninput={move} disabled={!vibrate || !enabled} /></label>
      <div class="actions"><button class="baseline" disabled={!enabled} onclick={() => play('基準', [200])}>200ms を試す</button><button class="stop" onclick={() => stop()} disabled={!vibrate} aria-label="振動を停止"><span aria-hidden="true">■</span> 停止</button></div>
    </div>
  </div>

  <div id="panel-ios" role="tabpanel" aria-labelledby="tab-ios" hidden={platform !== 'ios'} tabindex="0">
    {#if !switches}<p class="notice">iPhoneのSafariで試してください。</p>{/if}
    <div class="ios-surface">
      <div class="reference">
        <div><h2>スイッチ</h2><p>本体を直接タップ</p></div>
        <input type="checkbox" {...{ switch: '' }} aria-label="基準スイッチ" disabled={!enabled || !switches} onchange={(event) => switchChanged(event, '基準スイッチ')} />
      </div>
      <div class="overlay-demo">
        <div class="favorite" class:saved class:disabled={!enabled || !switches}>
          <span aria-hidden="true"><span class="heart">{saved ? '♥' : '♡'}</span>{saved ? 'お気に入り済み' : 'お気に入り'}</span>
          <input class="overlay" type="checkbox" {...{ switch: '' }} aria-label="お気に入り" bind:checked={saved} disabled={!enabled || !switches} onchange={(event) => switchChanged(event, 'お気に入り')} />
        </div>
        <p class="hint">スクロールはボタンの外側から。</p>
      </div>
    </div>
  </div>

  <div class="feedback"><p role="status">{enabled ? status : '振動オフ'}</p></div>

  <section class="log-panel" aria-labelledby="log-title">
    <div class="log-heading"><h2 id="log-title">操作ログ</h2><div class="actions"><button onclick={() => { logs = []; log('ログをクリア'); }}>クリア</button><button class="copy" onclick={copyLog} disabled={copying}>{copying ? 'コピー中…' : 'コピー'}</button></div></div>
    <textarea bind:this={logArea} value={logText} readonly spellcheck="false" aria-label="操作ログの全文" wrap="off"></textarea>
    <p class="log-note">受付＝実際の振動ではありません。最新60件。</p>
    <p class="copy-status" role="status">{copyStatus}</p>
  </section>

</main>

<style>
  main { max-width: 540px; margin: auto; padding: 1.25rem 1rem 3rem; }
  header { display: flex; align-items: center; gap: 0.85rem; margin-bottom: 1.5rem; }
  h1 { flex: 1; font-size: 1.3rem; letter-spacing: -0.04em; }
  h2 { font-size: 1rem; } p { margin: 0; }
  .enable { display: flex; align-items: center; gap: 0.4rem; min-height: 44px; font-size: 0.875rem; }
  input[type=checkbox] { accent-color: var(--accent); }
  button { min-height: 44px; padding: 0.65rem 1rem; border: 1px solid var(--border-strong); border-radius: 10px; background: var(--surface); cursor: pointer; font-size: 0.875rem; }
  button:disabled, .disabled { opacity: 0.4; cursor: default; }
  button:active:not(:disabled) { transform: scale(0.98); }
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
  .actions { display: flex; flex-wrap: wrap; gap: 0.5rem; } .baseline { flex: 1; } .stop { background: var(--surface-2); border-color: transparent; } .stop span { font-size: 0.7rem; }
  .ios-surface { border: 1px solid var(--border); border-radius: 16px; padding: 1.25rem; background: var(--surface); }
  .reference { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 0.25rem 0 1.5rem; }
  .reference p { color: var(--text-dim); font-size: 0.875rem; margin-top: 0.3rem; }
  .reference input { appearance: auto; width: 3.5rem; height: 2rem; flex: none; }
  .overlay-demo { border-top: 1px solid var(--border); padding-top: 0.8rem; }
  .favorite { position: relative; width: 100%; height: 76px; margin: 0.9rem 0; display: grid; place-items: center; border: 1px solid var(--accent); border-radius: 16px; background: var(--surface); font-weight: 600; clip-path: inset(0 round 16px); }
  .favorite > span { display: flex; align-items: center; gap: 0.7rem; } .heart { font-size: 1.6rem; color: var(--accent); }
  .favorite.saved { background: var(--accent-soft); color: var(--accent); }
  .favorite:has(input:focus-visible) { outline: 3px solid var(--accent); outline-offset: -4px; }
  .overlay { position: absolute; inset: 0; margin: 0; width: 100%; height: 100%; appearance: auto; -webkit-appearance: auto; opacity: 0; cursor: pointer; clip-path: inset(0 round 16px); }
  .hint { font-size: 0.8rem; color: var(--text-dim); }
  .feedback { display: flex; align-items: center; gap: 0.6rem; min-height: 44px; margin: 0.4rem 0 1rem; font-size: 0.8rem; color: var(--text-dim); }
  .feedback p { flex: 1; overflow-wrap: anywhere; }
  .log-panel { border-top: 1px solid var(--border); padding-top: 1rem; }
  .log-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
  .copy { background: var(--accent-soft); border-color: var(--accent); }
  textarea { display: block; width: 100%; min-height: 160px; max-height: 400px; padding: 0.8rem; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: var(--text); font: 0.8rem/1.7 var(--mono); resize: vertical; }
  .log-note, .copy-status { font-size: 0.8rem; color: var(--text-dim); margin-top: 0.5rem; overflow-wrap: anywhere; }
  .copy-status:empty { display: none; }
  @media (max-width: 360px) { .pattern { padding: 0.85rem; } main { padding-inline: 0.75rem; } h1 { font-size: 1.15rem; } }
</style>

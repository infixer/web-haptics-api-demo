<script lang="ts">
  import MemoryGame from "$lib/components/MemoryGame.svelte";
  import Monitor from "$lib/components/Monitor.svelte";
  import NotchedSlider from "$lib/components/NotchedSlider.svelte";
  import Setup from "$lib/components/Setup.svelte";
  import { haptics } from "$lib/haptics.svelte.js";
</script>

<svelte:head>
  <title>Web Haptics API を触ってみる</title>
</svelte:head>

<main>
  <header class="hero">
    <p class="eyebrow">WICG proposal · navigator.playHaptics()</p>
    <h1>Web Haptics API を触ってみる</h1>
    <p class="lede">
      触覚を「波形」ではなく「意味」で指定する API の提案です。エフェクトは
      <code>hint</code> / <code>tick</code> / <code>align</code> / <code>edge</code> の
      <strong>4 つだけ</strong>。まだどのブラウザも実装していないので、
      ポリフィル越しに動かしています。
    </p>
    <p class="lede muted">
      スマホで開いて、まず何か 1 回タップしてください。user activation が無いと何も鳴りません。
    </p>
  </header>

  <Monitor />
  <Setup />
  <NotchedSlider />
  <MemoryGame />

  <footer>
    <p>
      実装:
      <a href="https://github.com/infixer/web-haptics-api-demo">infixer/web-haptics-api-demo</a>
      ／ ポリフィル:
      <a href="https://github.com/infixer/polyfill-web-haptics-api"
        >infixer/polyfill-web-haptics-api</a
      >
      ／ 提案: <a href="https://github.com/WICG/web-haptics">WICG/web-haptics</a>
    </p>
    <p class="muted">
      いま動いているバックエンド:
      <code>{haptics.backend ?? "—"}</code>
      {#if !haptics.native && haptics.backend}
        <span>（ネイティブ実装ではなくポリフィルです）</span>
      {/if}
    </p>
  </footer>
</main>

<style>
  main {
    max-width: 720px;
    margin: 0 auto;
    padding: clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 1.5rem) 4rem;
    display: grid;
    gap: 1.25rem;
  }

  .hero {
    padding-bottom: 0.25rem;
  }

  .eyebrow {
    font-family: var(--mono);
    font-size: 0.75rem;
    color: var(--accent);
    margin: 0 0 0.5rem;
    letter-spacing: 0.02em;
  }

  h1 {
    font-size: clamp(1.5rem, 5vw, 2rem);
    margin: 0 0 0.65rem;
  }

  .lede {
    margin: 0 0 0.5rem;
    font-size: 0.92rem;
    max-width: 56ch;
  }

  code {
    font-family: var(--mono);
    font-size: 0.88em;
    background: var(--surface-2);
    padding: 0.1em 0.35em;
    border-radius: 4px;
  }

  footer {
    border-top: 1px solid var(--border);
    padding-top: 1rem;
    font-size: 0.8rem;
  }

  footer p {
    margin: 0 0 0.3rem;
  }

  a {
    color: var(--accent);
  }
</style>

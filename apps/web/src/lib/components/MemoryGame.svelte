<script lang="ts">
  import { haptics } from "$lib/haptics.svelte.js";
  import { PATTERNS, playPattern, shuffle, type Pattern } from "$lib/patterns.js";

  type Mode = "memory" | "guess";

  interface Card {
    key: number;
    pattern: Pattern;
    matched: boolean;
  }

  let mode = $state<Mode>("memory");
  /** Shows each pattern's glyph on the cards. Turns the game into a tutorial. */
  let assist = $state(false);

  // --- 神経衰弱 ---------------------------------------------------------------
  let deck = $state<Card[]>(newDeck());
  let picked = $state<number[]>([]);
  let moves = $state(0);
  let busy = $state(false);
  let playingKey = $state<number | null>(null);

  const cleared = $derived(deck.length > 0 && deck.every((c) => c.matched));

  function newDeck(): Card[] {
    return shuffle([...PATTERNS, ...PATTERNS]).map((pattern, i) => ({
      key: i,
      pattern,
      matched: false,
    }));
  }

  function reset() {
    deck = newDeck();
    picked = [];
    moves = 0;
    busy = false;
  }

  async function flip(card: Card) {
    if (busy || card.matched || picked.includes(card.key)) return;

    // Held for the whole handler, not just the comparison. Without this, two
    // cards tapped during the first one's playback both reach the comparison
    // with picked.length === 2 and each scores the pair. Locking also stops two
    // patterns from playing over each other, which is unreadable anyway.
    busy = true;
    try {
      picked = [...picked, card.key];
      playingKey = card.key;
      await playPattern(card.pattern);
      playingKey = null;

      if (picked.length < 2) return;

      moves += 1;
      const [a, b] = picked.map((key) => deck.find((c) => c.key === key)!);

      if (a!.pattern.id === b!.pattern.id) {
        // Give the match its own beat so it does not blur into the second card.
        await wait(180);
        haptics.play("align", 1);
        deck = deck.map((c) => (picked.includes(c.key) ? { ...c, matched: true } : c));
        picked = [];
      } else {
        await wait(650);
        haptics.play("hint", 0.4);
        picked = [];
      }
    } finally {
      playingKey = null;
      busy = false;
    }
  }

  // --- あてゲーム -------------------------------------------------------------
  let quiz = $state<Pattern>(PATTERNS[0]!);
  let choices = $state<Pattern[]>([]);
  let answered = $state<string | null>(null);
  let streak = $state(0);
  let best = $state(0);

  function nextQuestion() {
    answered = null;
    quiz = PATTERNS[Math.floor(Math.random() * PATTERNS.length)]!;
    const decoys = shuffle(PATTERNS.filter((p) => p.id !== quiz.id)).slice(0, 3);
    choices = shuffle([quiz, ...decoys]);
    void playPattern(quiz);
  }

  function answer(pattern: Pattern) {
    if (answered) return;
    answered = pattern.id;
    if (pattern.id === quiz.id) {
      haptics.play("align", 1);
      streak += 1;
      best = Math.max(best, streak);
    } else {
      haptics.play("edge", 1);
      streak = 0;
    }
  }

  function wait(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function switchMode(next: Mode) {
    mode = next;
    if (next === "guess" && choices.length === 0) nextQuestion();
  }
</script>

<section class="card panel">
  <header>
    <div>
      <h2>触覚あてゲーム</h2>
      <p class="muted lede">
        6 種類のパターンを、<strong>4 つのエフェクトの組み合わせだけ</strong>で作っています。
        画面には何も出ません。感触だけで見分けてください。
      </p>
    </div>
    <div class="controls">
      <div class="tabs" role="tablist">
        <button
          role="tab"
          class="tab"
          aria-selected={mode === "memory"}
          onclick={() => switchMode("memory")}>神経衰弱</button
        >
        <button
          role="tab"
          class="tab"
          aria-selected={mode === "guess"}
          onclick={() => switchMode("guess")}>あてゲーム</button
        >
      </div>
      <label class="toggle">
        <input type="checkbox" bind:checked={assist} />
        <span>ヒント表示</span>
      </label>
    </div>
  </header>

  {#if mode === "memory"}
    <div class="stats">
      <span>手数 <b>{moves}</b></span>
      <span>そろった <b>{deck.filter((c) => c.matched).length / 2}</b> / {PATTERNS.length}</span>
      <button class="btn small" onclick={reset}>やり直す</button>
    </div>

    {#if cleared}
      <p class="cleared">クリア！ {moves} 手でした。</p>
    {/if}

    <ul class="grid">
      {#each deck as card (card.key)}
        <li>
          <button
            class="tile"
            class:matched={card.matched}
            class:picked={picked.includes(card.key)}
            class:playing={playingKey === card.key}
            disabled={busy || card.matched}
            onclick={() => flip(card)}
            aria-label={card.matched || assist ? card.pattern.label : "未確認のカード"}
          >
            {#if card.matched || assist || picked.includes(card.key)}
              <span class="glyph">{card.pattern.glyph}</span>
              {#if card.matched || assist}
                <span class="name">{card.pattern.label}</span>
              {/if}
            {:else}
              <span class="back" aria-hidden="true"></span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="stats">
      <span>連続正解 <b>{streak}</b></span>
      <span>最高 <b>{best}</b></span>
      <button class="btn small" onclick={() => void playPattern(quiz)}>▶ もう一度</button>
    </div>

    <ul class="choices">
      {#each choices as choice (choice.id)}
        <button
          class="btn choice"
          class:correct={answered !== null && choice.id === quiz.id}
          class:wrong={answered === choice.id && choice.id !== quiz.id}
          onclick={() => answer(choice)}
          disabled={answered !== null}
        >
          <span class="choice-glyph">{answered !== null || assist ? choice.glyph : "?"}</span>
          {choice.label}
        </button>
      {/each}
    </ul>

    {#if answered !== null}
      <div class="verdict">
        <span>{answered === quiz.id ? "正解" : `不正解 — ${quiz.label} でした`}</span>
        <button class="btn btn--primary small" onclick={nextQuestion}>次の問題</button>
      </div>
    {/if}
  {/if}

  <details>
    <summary>パターン一覧と、なぜ「リズム」で作ってあるのか</summary>
    <ul class="patterns">
      {#each PATTERNS as p (p.id)}
        <li>
          <button class="btn small" onclick={() => void playPattern(p)}>▶</button>
          <span class="p-glyph">{p.glyph}</span>
          <b>{p.label}</b>
          <code>{p.steps.map((s) => s.effect).join(" → ")}</code>
        </li>
      {/each}
    </ul>
    <p class="muted small">
      どのパターンを使うかより、<b>回数とリズム</b>で見分けられるように作ってあります。
      iOS では switch を叩くしか手段がなく、<code>hint</code> / <code>tick</code> /
      <code>align</code> が<strong>まったく同じ感触に潰れる</strong>ためです。
      エフェクトの種類に頼った設計は、そこで成立しなくなります。
    </p>
  </details>
</section>

<style>
  .panel {
    padding: 1.25rem;
    display: grid;
    gap: 1.1rem;
  }

  header {
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  h2 {
    font-size: 1.05rem;
  }

  .lede {
    margin: 0.35rem 0 0;
    font-size: 0.85rem;
    max-width: 46ch;
  }

  .controls {
    display: grid;
    gap: 0.5rem;
    justify-items: end;
  }

  .tabs {
    display: flex;
    background: var(--surface-2);
    border-radius: 8px;
    padding: 3px;
    gap: 3px;
  }

  .tab {
    border: 0;
    background: transparent;
    padding: 0.35em 0.85em;
    border-radius: 6px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    color: var(--text-dim);
    --haptic-active: tick 0.6;
  }

  .tab[aria-selected="true"] {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow);
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    cursor: pointer;
    --haptic-checked: align 0.8;
  }

  .stats {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.85rem;
    flex-wrap: wrap;
  }

  .stats b {
    font-family: var(--mono);
    font-size: 1.05rem;
  }

  .stats .btn {
    margin-left: auto;
  }

  .small {
    font-size: 0.8rem;
    padding: 0.4em 0.75em;
  }

  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.6rem;
  }

  .tile {
    width: 100%;
    aspect-ratio: 3 / 4;
    display: grid;
    place-content: center;
    gap: 0.25rem;
    border: 1px solid var(--border-strong);
    border-radius: 10px;
    background: var(--surface-2);
    cursor: pointer;
    transition: transform 100ms, border-color 140ms, background 140ms, opacity 200ms;
    --haptic-active: hint 0.3;
  }

  .tile:active:not(:disabled) {
    transform: scale(0.96);
  }

  .tile.picked,
  .tile.playing {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .tile.playing {
    animation: pulse 420ms ease-out;
  }

  .tile.matched {
    opacity: 0.45;
    border-style: dashed;
    cursor: default;
  }

  .back {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid var(--border-strong);
  }

  .glyph {
    font-size: 1.15rem;
    letter-spacing: 0.05em;
    color: var(--accent);
    line-height: 1;
  }

  .name {
    font-size: 0.68rem;
    color: var(--text-dim);
  }

  .choices {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem;
  }

  .choice {
    justify-content: flex-start;
    padding: 0.8em 1em;
  }

  .choice-glyph {
    font-family: var(--mono);
    color: var(--accent);
    min-width: 3ch;
  }

  .choice.correct {
    border-color: var(--ok);
    color: var(--ok);
  }

  .choice.wrong {
    border-color: var(--accent);
    text-decoration: line-through;
    opacity: 0.7;
  }

  .verdict,
  .cleared {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.7rem 0.9rem;
    background: var(--accent-soft);
    border-radius: 8px;
    font-size: 0.88rem;
    font-weight: 600;
    margin: 0;
  }

  details {
    border-top: 1px solid var(--border);
    padding-top: 0.85rem;
    font-size: 0.85rem;
  }

  summary {
    cursor: pointer;
    font-weight: 600;
    font-size: 0.82rem;
    --haptic-active: tick 0.6;
  }

  .patterns {
    list-style: none;
    margin: 0.7rem 0;
    padding: 0;
    display: grid;
    gap: 0.4rem;
  }

  .patterns li {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    font-size: 0.82rem;
  }

  .p-glyph {
    font-family: var(--mono);
    color: var(--accent);
    min-width: 4ch;
  }

  .patterns b {
    min-width: 6em;
  }

  code {
    font-family: var(--mono);
    font-size: 0.88em;
    color: var(--text-dim);
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 45%, transparent);
    }
    100% {
      box-shadow: 0 0 0 12px transparent;
    }
  }

  @media (max-width: 560px) {
    .controls {
      justify-items: start;
    }
    .grid {
      grid-template-columns: repeat(3, 1fr);
    }
    .choices {
      grid-template-columns: 1fr;
    }
  }
</style>

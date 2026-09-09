<script lang="ts">
  import { haptics } from "$lib/haptics.svelte.js";

  const BACKEND_LABELS: Record<string, string> = {
    native: "ネイティブ実装",
    vibrate: "navigator.vibrate",
    "ios-switch": "iOS switch ハック",
    gamepad: "Gamepad API",
    simulator: "シミュレータ（音）",
  };

  let testing = $state(false);

  async function test() {
    testing = true;
    haptics.play("tick", 0.7);
    setTimeout(() => haptics.play("edge", 1), 320);
    setTimeout(() => (testing = false), 700);
  }
</script>

<section class="card setup">
  <div class="row">
    <div>
      <h2>触覚のセットアップ</h2>
      <p class="muted note">
        Web Haptics API は「効いたか」を返しません。フィンガープリンティングを防ぐための設計です。
        <strong>だから対応判定はできず、あなたに聞くしかありません。</strong>
      </p>
    </div>
    <button class="btn btn--primary" onclick={test} disabled={testing}>
      {testing ? "再生中…" : "▶ テスト振動"}
    </button>
  </div>

  <div class="row wrap">
    <fieldset>
      <legend>感じましたか？</legend>
      <div class="choices">
        {#each [["yes", "はっきり感じた"], ["faint", "弱い"], ["no", "何も感じない"]] as const as [value, label] (value)}
          <button
            class="btn choice"
            class:selected={haptics.felt === value}
            aria-pressed={haptics.felt === value}
            onclick={() => {
              haptics.felt = value;
              // Nothing was felt, so the chosen backend is not reaching the user.
              // Fall through to the audible stand-in rather than leaving a dead page.
              if (value === "no") haptics.useSimulator(true);
            }}
          >
            {label}
          </button>
        {/each}
      </div>
    </fieldset>

    <dl class="diag">
      <dt>使用中</dt>
      <dd>{haptics.backend ? (BACKEND_LABELS[haptics.backend] ?? haptics.backend) : "—"}</dd>
      <dt>利用可能</dt>
      <dd>
        {haptics.available.length
          ? haptics.available.map((b) => BACKEND_LABELS[b] ?? b).join(" / ")
          : "なし"}
      </dd>
      <dt>user activation</dt>
      <dd>{haptics.activated ? "あり" : "まだ（1回タップが必要）"}</dd>
    </dl>
  </div>

  {#if haptics.felt === "no"}
    <p class="fallback">
      触覚が届いていないので、代わりに<strong>音</strong>で再生します。
      これは触覚ではありません — デスクトップで開発・登壇するための代用です。
    </p>
  {/if}

  <p class="muted note small">
    この診断は Web Haptics API の一部ではありません。ポリフィルの
    <code>/debug</code> から読んでいます。ネイティブ実装では取得できません。
  </p>
</section>

<style>
  .setup {
    padding: 1.25rem;
    display: grid;
    gap: 1rem;
  }

  h2 {
    font-size: 1.05rem;
  }

  .note {
    margin: 0.35rem 0 0;
    font-size: 0.85rem;
    max-width: 52ch;
  }

  .small {
    font-size: 0.78rem;
    margin: 0;
  }

  .row {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    justify-content: space-between;
  }

  .row.wrap {
    flex-wrap: wrap;
    align-items: flex-end;
  }

  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }

  legend {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-dim);
    padding: 0 0 0.4rem;
  }

  .choices {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .choice {
    font-size: 0.82rem;
    padding: 0.45em 0.8em;
  }

  .choice.selected {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }

  .diag {
    display: grid;
    grid-template-columns: auto auto;
    gap: 0.1rem 0.75rem;
    margin: 0;
    font-size: 0.78rem;
  }

  .diag dt {
    color: var(--text-dim);
  }

  .diag dd {
    margin: 0;
    font-family: var(--mono);
  }

  .fallback {
    margin: 0;
    padding: 0.7rem 0.85rem;
    background: var(--accent-soft);
    border-radius: 8px;
    font-size: 0.85rem;
  }

  code {
    font-family: var(--mono);
    font-size: 0.9em;
    background: var(--surface-2);
    padding: 0.1em 0.35em;
    border-radius: 4px;
  }

  @media (max-width: 560px) {
    .row {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>

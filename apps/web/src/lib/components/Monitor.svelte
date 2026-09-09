<script lang="ts">
  import { haptics } from "$lib/haptics.svelte.js";

  /** Weight per effect, so the bars read as the effects feel. */
  const WEIGHT: Record<string, number> = { hint: 0.3, tick: 0.55, align: 0.75, edge: 1 };
</script>

<section class="monitor" aria-label="発火したエフェクトのログ">
  <span class="label">playHaptics()</span>
  <ol>
    {#each haptics.recent as fired (fired.id)}
      <li
        class="bar"
        style:--h="{20 + (WEIGHT[fired.effect] ?? 0.5) * fired.intensity * 44}px"
        title="{fired.effect} {fired.intensity.toFixed(2)}"
      >
        <span class="name">{fired.effect}</span>
      </li>
    {/each}
  </ol>
  {#if haptics.recent.length === 0}
    <span class="muted empty">まだ何も呼ばれていません</span>
  {/if}
</section>

<style>
  .monitor {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    padding: 0.6rem 0.9rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    min-height: 84px;
    overflow: hidden;
  }

  .label {
    font-family: var(--mono);
    font-size: 0.72rem;
    color: var(--text-dim);
    white-space: nowrap;
    padding-bottom: 0.2rem;
  }

  ol {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    list-style: none;
    margin: 0;
    padding: 0;
    /* Newest on the left, so a burst grows away from the label. */
    flex-direction: row;
    min-width: 0;
  }

  .bar {
    width: 12px;
    height: var(--h);
    background: var(--accent);
    border-radius: 3px 3px 0 0;
    position: relative;
    animation: pop 240ms cubic-bezier(0.2, 1.4, 0.4, 1);
    flex: none;
  }

  .name {
    position: absolute;
    inset: 0;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .empty {
    font-size: 0.78rem;
    padding-bottom: 0.2rem;
  }

  @keyframes pop {
    from {
      height: 4px;
      opacity: 0.4;
    }
  }
</style>

<script lang="ts">
  import "../app.css";
  import { haptics } from "$lib/haptics.svelte.js";

  let { children } = $props();

  $effect(() => {
    haptics.start();
  });
</script>

{@render children()}

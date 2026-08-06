<script setup lang="ts">
/**
 * 岛屿 7：CopyButton
 * 水合策略：client:visible
 */
import { ref } from 'vue';
const props = defineProps<{ text: string; label?: string }>();
const copied = ref(false);
const copy = async () => {
  try { await navigator.clipboard.writeText(props.text); }
  catch { const ta = document.createElement('textarea'); ta.value = props.text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
  copied.value = true; setTimeout(() => (copied.value = false), 1800);
};
</script>
<template>
  <button class="copy-btn" :class="{ copied }" @click="copy" :aria-label="label || '复制代码'">
    <svg v-if="!copied" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
    <span>{{ copied ? '已复制' : (label || '复制') }}</span>
  </button>
</template>
<style scoped>
.copy-btn { display: inline-flex; align-items: center; gap: .4em; padding: .35em .8em; font-size: .78rem; font-family: var(--font-mono); background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); color: #cbd5e1; border-radius: 6px; cursor: pointer; transition: all .15s ease; }
.copy-btn:hover { background: rgba(255,255,255,.15); color: #fff; }
.copy-btn.copied { background: rgba(16,185,129,.2); border-color: rgba(16,185,129,.4); color: #34d399; }
.copy-btn svg { width: 14px; height: 14px; }
</style>

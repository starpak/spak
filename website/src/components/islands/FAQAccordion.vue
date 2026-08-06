<script setup lang="ts">
/**
 * 岛屿：FAQAccordion
 * 水合策略：client:idle（FAQ 不在首屏关键路径）
 */
import { ref } from 'vue';
defineProps<{ items: { q: string; a: string }[] }>();
const openIdx = ref<number | null>(0);
const toggle = (i: number) => (openIdx.value = openIdx.value === i ? null : i);
</script>
<template>
  <div class="faq">
    <div v-for="(item, i) in items" :key="i" class="faq-item" :class="{ open: openIdx === i }">
      <button class="faq-q" :aria-expanded="openIdx === i" @click="toggle(i)">
        <span class="faq-q-text">{{ item.q }}</span>
        <span class="faq-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="12" x2="18" y2="12" /><line v-if="openIdx !== i" x1="12" y1="6" x2="12" y2="18" /></svg>
        </span>
      </button>
      <div class="faq-a-wrap">
        <p class="faq-a">{{ item.a }}</p>
      </div>
    </div>
  </div>
</template>
<style scoped>
.faq { display: flex; flex-direction: column; gap: .75rem; max-width: 760px; margin: 0 auto; }
.faq-item { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; transition: border-color .2s ease, box-shadow .2s ease; }
.faq-item.open { border-color: var(--brand-300); box-shadow: var(--shadow-sm); }
.faq-q { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.1rem 1.3rem; background: transparent; border: none; cursor: pointer; font-family: inherit; font-size: 1rem; font-weight: 600; color: var(--text); text-align: left; transition: color .15s ease; }
.faq-q:hover { color: var(--brand-600); }
[data-theme='dark'] .faq-q:hover { color: var(--brand-300); }
.faq-q-text { flex: 1; }
.faq-icon { flex-shrink: 0; width: 22px; height: 22px; color: var(--brand-600); display: inline-flex; transition: transform .25s ease; }
[data-theme='dark'] .faq-icon { color: var(--brand-300); }
.faq-item.open .faq-icon { transform: rotate(180deg); }
.faq-a-wrap { max-height: 0; overflow: hidden; transition: max-height .35s cubic-bezier(.4,0,.2,1); }
.faq-item.open .faq-a-wrap { max-height: 320px; }
.faq-a { margin: 0; padding: 0 1.3rem 1.2rem; color: var(--text-soft); font-size: .92rem; line-height: 1.7; }
</style>

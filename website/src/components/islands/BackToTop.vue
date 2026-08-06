<script setup lang="ts">
/**
 * 岛屿 6：BackToTop
 * 水合策略：client:idle（根节点 v-if 为空，visible 不触发）
 */
import { ref, onMounted, onUnmounted } from 'vue';
const visible = ref(false);
const onScroll = () => (visible.value = window.scrollY > 480);
const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
onMounted(() => { window.addEventListener('scroll', onScroll, { passive: true }); onScroll(); });
onUnmounted(() => window.removeEventListener('scroll', onScroll));
</script>
<template>
  <transition name="pop">
    <button v-if="visible" class="back-to-top" @click="toTop" aria-label="回到顶部">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
    </button>
  </transition>
</template>
<style scoped>
.back-to-top { position: fixed; right: 24px; bottom: 24px; width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; background: var(--brand-600); color: #fff; border: none; border-radius: 50%; cursor: pointer; box-shadow: var(--shadow-lg); z-index: 90; transition: background .18s ease, transform .18s ease; }
.back-to-top:hover { background: var(--brand-700); transform: translateY(-2px); }
.back-to-top svg { width: 20px; height: 20px; }
.pop-enter-active, .pop-leave-active { transition: opacity .2s ease, transform .2s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: scale(.6) translateY(8px); }
</style>

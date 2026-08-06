<script setup lang="ts">
/**
 * 岛屿 5：TerminalDemo
 * 水合策略：client:visible（进入视口才开始打字动画）
 */
import { ref, onMounted, onUnmounted } from 'vue';
const lines = ref<{ text: string; cls: 'cmd' | 'info' | 'ok' | 'warn' | 'muted' }[]>([]);
const done = ref(false);
let timers: number[] = [];
const script: { text: string; cls: 'cmd' | 'info' | 'ok' | 'warn' | 'muted'; delay: number }[] = [
  { text: '$ spak serve', cls: 'cmd', delay: 400 },
  { text: '○ Launching Spak v0.0.5 ...', cls: 'info', delay: 600 },
  { text: '✓ Loading config from spak.config.yml', cls: 'ok', delay: 500 },
  { text: '✓ @spakjs/core      ready', cls: 'ok', delay: 280 },
  { text: '✓ @spakjs/loader    ready', cls: 'ok', delay: 220 },
  { text: '✓ @spakjs/i18n      zh, en loaded', cls: 'ok', delay: 320 },
  { text: '✓ @spakjs/log       multi-transport', cls: 'ok', delay: 240 },
  { text: '→ plugin-server     http://0.0.0.0:4321', cls: 'info', delay: 360 },
  { text: '→ plugin-daemon     detached', cls: 'info', delay: 200 },
  { text: '✓ All systems nominal', cls: 'ok', delay: 300 },
  { text: '', cls: 'muted', delay: 100 },
  { text: 'Spak is running. Press Ctrl+C to stop.', cls: 'muted', delay: 200 },
];
const start = () => { let acc = 0; script.forEach((item) => { acc += item.delay; const t = window.setTimeout(() => { lines.value.push(item); if (lines.value.length === script.length) done.value = true; }, acc); timers.push(t); }); };
let observer: IntersectionObserver | null = null;
onMounted(() => {
  const el = document.querySelector('#terminal-anchor');
  observer = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting) { start(); observer?.disconnect(); } }, { threshold: 0.3 });
  if (el) observer.observe(el);
});
onUnmounted(() => { timers.forEach(clearTimeout); observer?.disconnect(); });
</script>
<template>
  <div class="terminal-wrap">
    <div id="terminal-anchor" />
    <div class="terminal" role="region" aria-label="spak serve 终端演示">
      <div class="terminal-bar"><span class="dot red" /><span class="dot yellow" /><span class="dot green" /><span class="terminal-title">spak — serve</span></div>
      <div class="terminal-body">
        <div v-for="(line, i) in lines" :key="i" :class="['line', line.cls]"><span v-if="line.text === ''">&nbsp;</span><template v-else>{{ line.text }}</template></div>
        <span v-if="!done" class="cursor" aria-hidden="true">▋</span>
      </div>
    </div>
  </div>
</template>
<style scoped>
.terminal-wrap { position: relative; }
.terminal { border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow-lg); border: 1px solid #2a2745; background: #0b0a1a; }
.terminal-bar { display: flex; align-items: center; gap: .5rem; padding: .6rem .9rem; background: #14122b; border-bottom: 1px solid #2a2745; }
.dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
.dot.red { background: #ff5f56; } .dot.yellow { background: #ffbd2e; } .dot.green { background: #27c93f; }
.terminal-title { margin-left: auto; margin-right: auto; font-family: var(--font-mono); font-size: .8rem; color: #64748b; }
.terminal-body { padding: 1.1rem 1.3rem; font-family: var(--font-mono); font-size: .85rem; line-height: 1.7; min-height: 260px; color: #e2e8f0; }
.line { white-space: pre-wrap; }
.line.cmd { color: #c4b5fd; font-weight: 600; }
.line.info { color: #60a5fa; }
.line.ok { color: #34d399; }
.line.warn { color: #fbbf24; }
.line.muted { color: #64748b; }
.cursor { display: inline-block; color: #c4b5fd; animation: blink 1s steps(2) infinite; }
@keyframes blink { 50% { opacity: 0; } }
</style>

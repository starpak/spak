<script setup lang="ts">
/**
 * 岛屿 4：Counter
 * 水合策略：client:visible
 */
import { ref } from 'vue';
const count = ref(0);
const step = ref(1);
const inc = () => (count.value += step.value);
const dec = () => (count.value -= step.value);
const reset = () => (count.value = 0);
</script>
<template>
  <div class="counter">
    <div class="counter-value" :class="{ positive: count > 0, negative: count < 0 }">{{ count }}</div>
    <div class="counter-controls">
      <button class="btn-ghost step-btn" @click="dec" :disabled="count - step < -999" aria-label="减少">−</button>
      <div class="step-group"><span class="step-label">步长</span><input v-model.number="step" type="number" min="1" max="100" /></div>
      <button class="btn-ghost step-btn" @click="inc" :disabled="count + step > 999" aria-label="增加">+</button>
    </div>
    <button class="btn-ghost reset-btn" @click="reset">重置</button>
    <p class="counter-hint">↑ 这是一个 Vue 岛屿，状态在浏览器端独立维护</p>
  </div>
</template>
<style scoped>
.counter { text-align: center; padding: 1rem; }
.counter-value { font-family: var(--font-mono); font-size: 4rem; font-weight: 700; color: var(--text); line-height: 1; margin-bottom: 1rem; transition: color .2s ease; }
.counter-value.positive { color: #10b981; }
.counter-value.negative { color: #ef4444; }
.counter-controls { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: 1rem; }
.step-btn { width: 44px; height: 44px; font-size: 1.5rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; padding: 0; }
.step-btn:disabled { opacity: .4; cursor: not-allowed; }
.step-group { display: flex; flex-direction: column; align-items: center; gap: .2rem; }
.step-label { font-size: .7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; }
.step-group input { width: 64px; text-align: center; font-family: var(--font-mono); font-size: 1rem; padding: .3em; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); }
.reset-btn { font-size: .85rem; padding: .4em 1em; }
.counter-hint { font-size: .8rem; color: var(--text-muted); margin-top: 1rem; margin-bottom: 0; }
</style>

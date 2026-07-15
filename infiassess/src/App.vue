<template>
  <v-app>
    <router-view></router-view>
  </v-app>
</template>

<style>
@import './styles/xterm.css';

/* ── InfiAssess design tokens (light / professional) ─────────────────────── */
:root {
  --ia-bg: #F7F7F8;
  --ia-bg-2: #F1F1F3;
  --ia-surface: #FFFFFF;
  --ia-surface-2: #F7F7F8;
  --ia-elevated: #FFFFFF;
  --ia-border: #E6E6EA;
  --ia-border-strong: #D3D3D9;
  --ia-primary: #111111;
  --ia-primary-2: #111111;
  --ia-primary-soft: rgba(17, 17, 17, 0.05);
  --ia-accent: #111111;
  --ia-accent-soft: rgba(17, 17, 17, 0.05);
  --ia-text: #0A0A0A;
  --ia-text-dim: rgba(17, 17, 17, 0.62);
  --ia-text-faint: rgba(17, 17, 17, 0.42);
  --ia-success: #16A34A;
  --ia-warning: #D97706;
  --ia-error: #DC2626;
  --ia-grad: #111111;
  --ia-radius: 12px;
  --ia-shadow: 0 10px 34px rgba(17, 24, 39, 0.10);
  --ia-shadow-soft: 0 2px 10px rgba(17, 24, 39, 0.06);
}

* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

.v-application {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  letter-spacing: -0.006em;
  color: var(--ia-text);
  background: var(--ia-bg) !important;
}

/* Clean, quiet light background */
.v-application::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(1000px 600px at 50% -10%, rgba(17, 17, 17, 0.025), transparent 60%),
    #F7F7F8;
}
.v-application > * { position: relative; z-index: 1; }

/* Headings a touch tighter */
h1, h2, h3, .v-application h1, .v-application h2 { letter-spacing: -0.02em; }

/* Refined scrollbars */
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: rgba(17, 17, 17, 0.16);
  border-radius: 8px;
  border: 2px solid transparent;
  background-clip: content-box;
}
::-webkit-scrollbar-thumb:hover { background: rgba(17, 17, 17, 0.28); background-clip: content-box; }

/* Text selection */
::selection { background: rgba(17, 17, 17, 0.14); color: #111; }

/* Buttons: crisp, no uppercase; filled primary = solid black with white text */
.v-btn { text-transform: none !important; letter-spacing: -0.01em !important; font-weight: 600 !important; border-radius: 10px !important; }
.v-application .v-btn.primary:not(.v-btn--text):not(.v-btn--outlined) {
  background: #111111 !important;
  color: #FFFFFF !important;
  box-shadow: none !important;
}
.v-application .v-btn.primary:not(.v-btn--text):not(.v-btn--outlined):hover { background: #000000 !important; }
.v-application .v-btn.primary.v-btn--text,
.v-application .v-btn.primary.v-btn--outlined { background: transparent !important; box-shadow: none !important; }

/* Cards & dialogs: clean white surface, thin border, soft shadow */
.v-application .v-card {
  border-radius: 12px;
  border: 1px solid var(--ia-border);
  box-shadow: var(--ia-shadow-soft) !important;
}
</style>

<script>
export default {
  name: 'App',
}
</script>

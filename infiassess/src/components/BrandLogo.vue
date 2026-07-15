<template>
  <span class="brand-lockup">
    <span class="b-apt">Aptivate</span>
    <span class="b-by">by</span>
    <span class="b-inf">Infiligence</span>
  </span>
</template>

<script>
export default { name: 'BrandLogo' }
</script>

<style scoped>
.brand-lockup {
  display: inline-flex;
  align-items: center;
  gap: 0.34em;
  font-weight: 800;
  letter-spacing: -0.02em;
  white-space: nowrap;
  line-height: 1;
}
.b-apt { color: var(--ia-text, #111); }
.b-by { font-weight: 500; opacity: 0.5; font-size: 0.66em; }
.b-inf { color: var(--ia-text, #111); }
</style>

<template>
  <span class="brand-lockup">
    <span class="b-apt">Aptivate</span>
    <span class="b-sub"><span class="b-by">by</span>&nbsp;Infiligence</span>
  </span>
</template>

<script>
export default { name: 'BrandLogo' }
</script>

<style scoped>
.brand-lockup {
  display: inline-flex;
  align-items: flex-end;      /* small text sits on the baseline — subscript feel */
  gap: 0.26em;
  font-weight: 800;
  letter-spacing: -0.02em;
  white-space: nowrap;
  line-height: 1;
}
.b-apt { color: var(--ia-text, #111); }
.b-sub {
  font-size: 0.4em;           /* much smaller than "Aptivate" */
  font-weight: 600;
  letter-spacing: 0;
  color: var(--ia-text, #111);
  opacity: 0.72;
  transform: translateY(-0.12em);
}
.b-by { opacity: 0.6; }
</style>

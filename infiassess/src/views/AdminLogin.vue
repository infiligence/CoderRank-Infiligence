<template>
  <div class="login-bg">
    <div class="login-wrap">
      <div class="login-card">
        <div class="text-center">
          <img class="brand-hero mx-auto" src="@/assets/company-logo.svg" alt="Infiligence" />
          <div class="brand-logo mt-4">
            <brand-logo />
          </div>
          <p class="login-caption mt-1">Admin Portal</p>
        </div>

        <v-form @submit.prevent="login" class="mt-8">
          <label class="field-label">Email</label>
          <v-text-field
            v-model="email"
            type="email"
            outlined
            dense
            prepend-inner-icon="mdi-email-outline"
            class="ia-input mb-4 mt-1"
            hide-details
            placeholder="you@company.com"
          />
          <label class="field-label">Password</label>
          <v-text-field
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            outlined
            dense
            prepend-inner-icon="mdi-lock-outline"
            :append-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            @click:append="showPassword = !showPassword"
            class="ia-input mb-6 mt-1"
            hide-details
            placeholder="••••••••"
          />
          <v-btn
            type="submit"
            block
            x-large
            :loading="loading"
            class="login-btn"
            depressed
          >
            Sign In
            <v-icon right small>mdi-arrow-right</v-icon>
          </v-btn>
        </v-form>

        <v-alert v-if="error" type="error" dense text class="mt-4 mb-0">{{ error }}</v-alert>
      </div>
      <p class="login-foot">Secure assessment platform · {{ new Date().getFullYear() }}</p>
    </div>
  </div>
</template>

<script>
import { firebaseService } from '@/services/firebaseService'

export default {
  name: 'AdminLogin',
  data: () => ({
    email: '',
    password: '',
    showPassword: false,
    loading: false,
    error: '',
  }),
  methods: {
    async login() {
      this.loading = true
      this.error = ''
      try {
        await firebaseService.adminLogin(this.email, this.password)
        this.$router.push('/admin')
      } catch (e) {
        this.error = e.message || 'Invalid credentials'
      } finally {
        this.loading = false
      }
    }
  },
  mounted() {
    if (firebaseService.isAdminLoggedIn()) {
      this.$router.push('/admin')
    }
  }
}
</script>

<style scoped>
.login-bg {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.login-wrap { width: 100%; max-width: 420px; }
.login-card {
  background: #FFFFFF;
  border: 1px solid var(--ia-border);
  border-radius: 16px;
  padding: 40px 36px;
  box-shadow: var(--ia-shadow);
}
.brand-hero {
  height: 64px;
  width: auto;
  display: block;
}
.brand-logo { font-size: 1.7rem; font-weight: 700; letter-spacing: -0.03em; }
.brand-ia { color: var(--ia-primary-2); }
.brand-assess { color: #111111; }
.login-caption {
  color: var(--ia-text-faint);
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.field-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ia-text-dim);
  display: block;
}
.ia-input >>> .v-input__slot {
  background: rgba(17, 17, 17, 0.03) !important;
  border-radius: 10px !important;
  min-height: 48px;
}
.ia-input >>> fieldset { border-color: var(--ia-border) !important; }
.ia-input >>> .v-input__slot:hover fieldset { border-color: var(--ia-border-strong) !important; }
.ia-input.v-input--is-focused >>> fieldset { border-color: var(--ia-primary) !important; }
.ia-input >>> input { color: var(--ia-text) !important; }
.login-btn {
  border-radius: 11px !important;
  font-weight: 700 !important;
  height: 52px !important;
  background: #111111 !important;
  color: #FFFFFF !important;
}
.login-foot {
  text-align: center;
  color: var(--ia-text-faint);
  font-size: 0.75rem;
  margin-top: 22px;
}
</style>

import 'core-js/stable'
import 'regenerator-runtime/runtime'
import Vue from 'vue'
import VueRouter from 'vue-router'
import App from './App.vue'
import vuetify from '@/plugins/vuetify'
import BrandLogo from '@/components/BrandLogo.vue'

Vue.config.productionTip = false

Vue.use(VueRouter)
Vue.component('brand-logo', BrandLogo)

const router = new VueRouter({
  mode: 'history',
  routes: [
    // Candidate routes (drive-scoped: college + placement drive)
    { path: '/assess/:orgSlug/:driveId/round1', component: () => import('./views/Round1.vue') },
    // Round 2 disabled for now
    // { path: '/assess/:orgSlug/:driveId/round2', component: () => import('./views/Round2.vue') },
    // Admin routes
    { path: '/admin/login', component: () => import('./views/AdminLogin.vue') },
    { path: '/admin', component: () => import('./views/AdminDashboard.vue') },
    { path: '/admin/org/:orgId', component: () => import('./views/AdminOrg.vue') },
    { path: '/admin/org/:orgId/drive/:driveId', component: () => import('./views/AdminDrive.vue') },
    { path: '/admin/org/:orgId/drive/:driveId/candidate/:candidateId', component: () => import('./views/AdminCandidate.vue') },
    // Default redirect
    { path: '/', redirect: '/admin/login' },
    { path: '*', redirect: '/admin/login' },
  ]
})

new Vue({
  vuetify,
  router,
  render: h => h(App),
}).$mount('#app')

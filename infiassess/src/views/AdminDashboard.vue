<template>
  <div class="dashboard-root">
    <!-- Top App Bar -->
    <v-app-bar app color="rgba(255,255,255,0.85)" elevation="0" class="app-bar-border" height="64">
      <div class="brand-logo ml-1">
        <brand-logo />
      </div>
      <v-spacer />
      <v-btn text class="logout-btn" @click="logout">
        <v-icon left small>mdi-logout-variant</v-icon>
        Logout
      </v-btn>
    </v-app-bar>

    <v-main class="dashboard-main">
      <v-container class="py-8" style="max-width: 1280px;">
        <!-- Page Header -->
        <div class="d-flex align-center justify-space-between mb-8">
          <div>
            <h1 class="page-title">Colleges</h1>
            <p class="page-subtitle mt-1">Manage colleges and their placement drives</p>
          </div>
          <v-btn
            color="primary"
            large
            class="new-org-btn"
            @click="newOrgDialog = true"
          >
            <v-icon left>mdi-plus</v-icon>
            New College
          </v-btn>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="d-flex justify-center py-16">
          <v-progress-circular indeterminate color="primary" size="48" />
        </div>

        <!-- Empty State -->
        <div v-else-if="orgs.length === 0" class="empty-state">
          <v-icon size="80" color="rgba(17,17,17,0.3)">mdi-office-building-outline</v-icon>
          <h2 class="empty-title mt-4">No colleges yet</h2>
          <p class="empty-subtitle mt-2">Create your first college to start managing placement drives</p>
          <v-btn color="primary" large class="new-org-btn mt-6" @click="newOrgDialog = true">
            <v-icon left>mdi-plus</v-icon>
            Create your first college
          </v-btn>
        </div>

        <!-- Org Grid -->
        <v-row v-else>
          <v-col
            v-for="org in orgs"
            :key="org.id"
            cols="12"
            md="4"
            sm="6"
          >
            <div class="org-card">
              <!-- Card Header -->
              <div class="org-card-header">
                <div class="org-icon">
                  <v-icon color="primary" size="22">mdi-office-building</v-icon>
                </div>
                <div class="org-info ml-3">
                  <div class="org-name">{{ org.name }}</div>
                  <div class="org-slug">{{ org.slug }}</div>
                </div>
                <v-chip
                  small
                  class="candidate-badge ml-auto"
                  color="rgba(17,17,17,0.14)"
                  text-color="#111111"
                >
                  <v-icon left x-small>mdi-briefcase-outline</v-icon>
                  {{ candidateCounts[org.id] || 0 }} drive{{ (candidateCounts[org.id] || 0) !== 1 ? 's' : '' }}
                </v-chip>
              </div>

              <!-- Drive hint -->
              <div class="org-drive-hint mt-4">
                <v-icon x-small color="rgba(17,17,17,0.4)" class="mr-1">mdi-briefcase-outline</v-icon>
                <span class="timer-label">Open to manage placement drives, questions &amp; links</span>
              </div>

              <!-- Card Footer -->
              <div class="org-card-footer mt-4">
                <v-btn
                  text
                  small
                  color="error"
                  class="delete-btn"
                  @click.stop="confirmDelete(org)"
                >
                  <v-icon left x-small>mdi-delete-outline</v-icon>
                  Delete
                </v-btn>
                <v-spacer />
                <v-btn
                  color="primary"
                  small
                  class="manage-btn"
                  @click="$router.push(`/admin/org/${org.slug}`)"
                >
                  Manage
                  <v-icon right small>mdi-arrow-right</v-icon>
                </v-btn>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <!-- New College Dialog -->
    <v-dialog v-model="newOrgDialog" max-width="600" persistent>
      <v-card class="dialog-card">
        <v-card-title class="dialog-title pa-6 pb-2">
          <v-icon color="primary" class="mr-3">mdi-office-building-plus</v-icon>
          New College
        </v-card-title>
        <v-card-text class="pa-6 pt-4">
          <v-form ref="orgForm" v-model="orgFormValid" @submit.prevent="createOrg">
            <v-text-field
              v-model="newOrg.name"
              label="College Name"
              outlined
              dense
              class="mb-3"
              :rules="[rules.required]"
              prepend-inner-icon="mdi-office-building-outline"
              @input="autoSlug"
              hide-details="auto"
            />
            <v-text-field
              v-model="newOrg.slug"
              label="Slug (URL identifier)"
              outlined
              dense
              class="mb-1"
              :rules="[rules.required, rules.slug]"
              prepend-inner-icon="mdi-link-variant"
              hint="Only lowercase letters, numbers, and hyphens. Timers are set per placement drive."
              persistent-hint
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-6 pt-0">
          <v-spacer />
          <v-btn text class="cancel-btn mr-2" @click="closeNewOrgDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            class="create-btn"
            :loading="creating"
            :disabled="!orgFormValid"
            @click="createOrg"
          >
            <v-icon left>mdi-plus</v-icon>
            Create College
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirm Dialog -->
    <v-dialog v-model="deleteDialog" max-width="480">
      <v-card class="dialog-card">
        <v-card-title class="dialog-title pa-6 pb-2">
          <v-icon color="error" class="mr-3">mdi-alert-circle-outline</v-icon>
          Delete College
        </v-card-title>
        <v-card-text class="pa-6 pt-3">
          <p class="delete-confirm-text">
            Are you sure you want to delete <strong>{{ orgToDelete && orgToDelete.name }}</strong>?
            This will remove all associated data and cannot be undone.
          </p>
        </v-card-text>
        <v-card-actions class="pa-6 pt-0">
          <v-spacer />
          <v-btn text class="cancel-btn mr-2" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="error" class="delete-confirm-btn" :loading="deleting" @click="doDeleteOrg">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" bottom right timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script>
import { firebaseService } from '@/services/firebaseService'

export default {
  name: 'AdminDashboard',
  data() {
    return {
      loading: true,
      orgs: [],
      candidateCounts: {},
      newOrgDialog: false,
      orgFormValid: false,
      creating: false,
      newOrg: {
        name: '',
        slug: '',
      },
      deleteDialog: false,
      deleting: false,
      orgToDelete: null,
      snackbar: {
        show: false,
        text: '',
        color: 'success',
      },
      rules: {
        required: v => !!v || 'This field is required',
        slug: v => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) || 'Only lowercase letters, numbers, and hyphens allowed',
        positiveNumber: v => (v > 0) || 'Must be greater than 0',
      },
    }
  },
  computed: {
    origin() {
      return window.location.origin
    },
  },
  methods: {
    async loadOrgs() {
      this.loading = true
      try {
        this.orgs = await firebaseService.getOrgs()
        // Load placement-drive counts per college. Drives are keyed under the
        // slug (that's what admin/candidate routes use), not the doc id.
        for (const org of this.orgs) {
          const drives = await firebaseService.getDrives(org.slug || org.id)
          this.$set(this.candidateCounts, org.id, drives.length)
        }
      } catch (e) {
        this.showSnackbar('Failed to load colleges', 'error')
      } finally {
        this.loading = false
      }
    },
    autoSlug() {
      this.newOrg.slug = this.newOrg.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
    },
    async createOrg() {
      if (!this.$refs.orgForm.validate()) return
      this.creating = true
      try {
        const existing = this.orgs.find(o => o.slug === this.newOrg.slug)
        if (existing) {
          this.showSnackbar('A college with that slug already exists', 'error')
          return
        }
        const org = await firebaseService.createOrg({
          name: this.newOrg.name,
          slug: this.newOrg.slug,
        })
        this.orgs.push(org)
        this.$set(this.candidateCounts, org.id, 0)
        this.closeNewOrgDialog()
        this.showSnackbar('College created successfully', 'success')
      } catch (e) {
        this.showSnackbar('Failed to create college', 'error')
      } finally {
        this.creating = false
      }
    },
    closeNewOrgDialog() {
      this.newOrgDialog = false
      this.newOrg = { name: '', slug: '' }
      this.$nextTick(() => {
        if (this.$refs.orgForm) this.$refs.orgForm.reset()
      })
    },
    confirmDelete(org) {
      this.orgToDelete = org
      this.deleteDialog = true
    },
    async doDeleteOrg() {
      if (!this.orgToDelete) return
      this.deleting = true
      try {
        await firebaseService.deleteOrg(this.orgToDelete.id)
        this.orgs = this.orgs.filter(o => o.id !== this.orgToDelete.id)
        this.deleteDialog = false
        this.orgToDelete = null
        this.showSnackbar('College deleted', 'success')
      } catch (e) {
        this.showSnackbar('Failed to delete college', 'error')
      } finally {
        this.deleting = false
      }
    },
    showSnackbar(text, color = 'success') {
      this.snackbar = { show: true, text, color }
    },
    async logout() {
      await firebaseService.adminLogout()
      this.$router.push('/admin/login')
    },
  },
  async mounted() {
    if (!(await firebaseService.ensureAdmin())) {
      this.$router.push('/admin/login')
      return
    }
    this.loadOrgs()
  },
}
</script>

<style scoped>
.dashboard-root {
  min-height: 100vh;
}
.app-bar-border {
  border-bottom: 1px solid var(--ia-border) !important;
  backdrop-filter: blur(14px);
}
.brand-mark-sm {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: #111111;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  font-weight: 800;
  font-size: 0.85rem;
  letter-spacing: -0.02em;
}
.brand-logo {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
}
.brand-ia { color: var(--ia-primary-2); }
.brand-assess { color: #111111; }
.logout-btn {
  text-transform: none !important;
  font-weight: 600;
  color: var(--ia-text-dim) !important;
}
.dashboard-main { background: transparent; }
.page-title {
  font-size: 2rem;
  font-weight: 800;
  color: #111111;
  letter-spacing: -0.03em;
}
.page-subtitle {
  color: var(--ia-text-dim);
  font-size: 0.92rem;
  margin: 0;
}
.new-org-btn {
  text-transform: none !important;
  font-weight: 700;
  border-radius: 11px !important;
  height: 46px !important;
  background: #111111 !important;
  color: #FFFFFF !important;
}
/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}
.empty-title {
  color: rgba(17,17,17,0.7);
  font-size: 1.4rem;
  font-weight: 600;
}
.empty-subtitle {
  color: rgba(17,17,17,0.4);
  font-size: 0.95rem;
}
/* Org Cards */
.org-card {
  background: var(--ia-surface);
  border: 1px solid var(--ia-border);
  border-radius: var(--ia-radius);
  padding: 22px;
  transition: transform 0.18s ease, border-color 0.18s, box-shadow 0.18s;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.org-card:hover {
  border-color: var(--ia-border-strong);
  box-shadow: var(--ia-shadow-soft);
  transform: translateY(-2px);
}
.org-card-header {
  display: flex;
  align-items: flex-start;
}
.org-icon {
  background: var(--ia-primary-soft);
  border: 1px solid rgba(17, 17, 17, 0.25);
  border-radius: 10px;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.org-info {
  min-width: 0;
  flex: 1;
}
.org-name {
  font-weight: 700;
  font-size: 1rem;
  color: #111111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.org-slug {
  font-size: 0.72rem;
  color: rgba(17,17,17,0.35);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}
.candidate-badge {
  flex-shrink: 0;
  margin-left: 8px !important;
}
.org-timers {
  display: flex;
  align-items: center;
}
.timer-item {
  display: flex;
  align-items: center;
}
.timer-label {
  font-size: 0.78rem;
  color: rgba(17,17,17,0.45);
}
.timer-value {
  font-size: 0.78rem;
  color: rgba(17,17,17,0.75);
  font-weight: 600;
}
.round-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.round-chip {
  transition: all 0.15s;
}
.round-chip:hover {
  opacity: 0.85;
}
/* Assessment Links */
.assess-links {
  background: rgba(17,17,17,0.03);
  border-radius: 8px;
  padding: 10px 12px;
}
.assess-link-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.assess-link-label {
  font-size: 0.72rem;
  color: rgba(17,17,17,0.4);
  flex-shrink: 0;
  width: 52px;
}
.assess-link-url {
  font-size: 0.72rem;
  color: rgba(17,17,17,0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
.copy-btn {
  color: rgba(17,17,17,0.4) !important;
  flex-shrink: 0;
}
.copy-btn:hover {
  color: rgba(17,17,17,0.8) !important;
}
/* Card Footer */
.org-card-footer {
  display: flex;
  align-items: center;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid rgba(17,17,17,0.06);
}
.manage-btn {
  text-transform: none !important;
  font-weight: 700;
  border-radius: 9px !important;
  background: var(--ia-primary-soft) !important;
  color: var(--ia-primary-2) !important;
  border: 1px solid rgba(17, 17, 17, 0.3);
}
.delete-btn {
  text-transform: none !important;
  font-weight: 500;
}
/* Dialogs */
.dialog-card {
  background: var(--ia-surface) !important;
  border: 1px solid var(--ia-border) !important;
  border-radius: var(--ia-radius) !important;
  box-shadow: var(--ia-shadow) !important;
}
.dialog-title {
  font-size: 1.15rem !important;
  font-weight: 700 !important;
  color: #111111 !important;
  display: flex;
  align-items: center;
}
.cancel-btn {
  text-transform: none !important;
  font-weight: 600;
  letter-spacing: 0;
  color: rgba(17,17,17,0.6) !important;
}
.create-btn {
  text-transform: none !important;
  font-weight: 600;
  letter-spacing: 0;
  border-radius: 8px !important;
}
.delete-confirm-btn {
  text-transform: none !important;
  font-weight: 600;
  letter-spacing: 0;
  border-radius: 8px !important;
}
.url-preview {
  display: flex;
  align-items: center;
  background: rgba(17,17,17,0.08);
  border-radius: 6px;
  padding: 8px 12px;
}
.url-preview-text {
  font-size: 0.78rem;
  color: rgba(17,17,17,0.85);
  font-family: monospace;
}
.delete-confirm-text {
  color: rgba(17,17,17,0.75);
  font-size: 0.95rem;
  line-height: 1.6;
}
.delete-confirm-text strong {
  color: #111111;
}
</style>

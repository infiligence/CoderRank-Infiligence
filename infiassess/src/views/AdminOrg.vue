<template>
  <div class="org-root">
    <!-- Top App Bar -->
    <v-app-bar app color="#FFFFFF" elevation="0" class="app-bar-border">
      <v-btn icon @click="$router.push('/admin')" class="back-btn">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div class="brand-logo ml-2">
        <brand-logo />
      </div>
      <v-app-bar-title class="app-bar-title ml-4">
        <span class="breadcrumb-sep">/ </span>{{ org ? org.name : orgId }}
      </v-app-bar-title>
      <v-spacer />
      <v-btn text class="logout-btn mr-2" @click="logout">
        <v-icon left>mdi-logout-variant</v-icon>
        Logout
      </v-btn>
    </v-app-bar>

    <v-main class="org-main">
      <div v-if="loading" class="d-flex justify-center align-center" style="min-height: 60vh;">
        <v-progress-circular indeterminate color="primary" size="48" />
      </div>

      <div v-else class="page-wrap">
        <!-- Header -->
        <div class="content-header d-flex align-center justify-space-between">
          <div>
            <div class="college-icon-row">
              <div class="college-icon"><v-icon color="primary" size="22">mdi-office-building</v-icon></div>
              <div class="ml-3">
                <h2 class="content-title">{{ org ? org.name : orgId }}</h2>
                <p class="content-subtitle">{{ drives.length }} placement drive{{ drives.length !== 1 ? 's' : '' }}</p>
              </div>
            </div>
          </div>
          <v-btn color="primary" class="action-top-btn" @click="openNewDrive">
            <v-icon left>mdi-plus</v-icon>
            New Placement Drive
          </v-btn>
        </div>

        <!-- Empty state -->
        <div v-if="drives.length === 0" class="empty-state">
          <v-icon size="60" color="rgba(17,17,17,0.3)">mdi-briefcase-outline</v-icon>
          <p class="empty-title mt-3">No placement drives yet</p>
          <p class="empty-sub">Create a drive, then upload its Round 1 questions and share the link.</p>
        </div>

        <!-- Drives table -->
        <data-table
          v-else
          :columns="columns"
          :data="driveRows"
          filter-placeholder="Search drives…"
          :initial-sorting="[{ id: 'placementDate', desc: true }]"
        >
          <template #cell-name="{ row }">
            <div class="cell-drive" @click="$router.push(`/admin/org/${orgId}/drive/${row.id}`)">
              <span class="cell-drive-name">{{ row.name }}</span>
              <span class="cell-drive-id">{{ row.id }}</span>
            </div>
          </template>
          <template #cell-placementDate="{ row }">
            <span class="cell-muted">{{ row.placementDate || '—' }}</span>
          </template>
          <template #cell-round1Timer="{ row }">
            <span class="cell-muted">{{ row.round1Timer }} min</span>
          </template>
          <template #cell-status="{ row }">
            <v-chip x-small :color="statusOf(row).color" :text-color="statusOf(row).text">
              {{ statusOf(row).label }}
            </v-chip>
          </template>
          <template #cell-actions="{ row }">
            <div class="row-actions">
              <v-btn small color="primary" class="ia-btn" @click="$router.push(`/admin/org/${orgId}/drive/${row.id}`)">
                <v-icon left x-small>mdi-cog-outline</v-icon> Manage
              </v-btn>
              <v-btn icon small title="Copy Round 1 link" @click="copyLink(row)">
                <v-icon small color="rgba(17,17,17,0.6)">mdi-link-variant</v-icon>
              </v-btn>
              <v-btn icon small title="Delete drive" @click="confirmDelete(row)">
                <v-icon small color="#f44336">mdi-delete-outline</v-icon>
              </v-btn>
            </div>
          </template>
        </data-table>
      </div>
    </v-main>

    <!-- New Drive Dialog -->
    <v-dialog v-model="newDrive.show" max-width="480" persistent>
      <v-card class="dialog-card">
        <v-card-title class="dialog-title pa-6 pb-2">
          <v-icon color="primary" class="mr-3">mdi-briefcase-plus-outline</v-icon>
          New Placement Drive
        </v-card-title>
        <v-card-text class="pa-6 pt-4">
          <v-form ref="driveForm">
            <v-text-field v-model="newDrive.name" label="Drive Name" outlined dense class="mb-3"
              placeholder="e.g. Campus Drive Jan 2026" :rules="[r => !!r || 'Required']" hide-details="auto" />
            <v-text-field v-model="newDrive.placementDate" label="Placement Date" type="date" outlined dense
              class="mb-3" prepend-inner-icon="mdi-calendar-outline" hide-details="auto" />
            <v-text-field v-model.number="newDrive.round1Timer" label="Round 1 Timer (minutes)" type="number" outlined dense
              prepend-inner-icon="mdi-timer-outline" hide-details="auto" />
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-6 pt-0">
          <v-spacer />
          <v-btn text @click="newDrive.show = false" :disabled="creating">Cancel</v-btn>
          <v-btn color="primary" :loading="creating" @click="createDrive">
            <v-icon left>mdi-check</v-icon> Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete confirm -->
    <v-dialog v-model="deleteDialog.show" max-width="420" persistent>
      <v-card class="dialog-card pa-2">
        <v-card-title class="pa-6 pb-2 black--text">Delete drive?</v-card-title>
        <v-card-text class="pa-6 pt-2" style="color:rgba(17,17,17,0.7)">
          This permanently removes <strong class="black--text">{{ deleteDialog.drive && deleteDialog.drive.name }}</strong>
          and all of its questions and candidate data.
        </v-card-text>
        <v-card-actions class="pa-6 pt-0">
          <v-spacer />
          <v-btn text @click="deleteDialog.show = false">Cancel</v-btn>
          <v-btn color="error" @click="doDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" bottom right timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script>
import { firebaseService } from '@/services/firebaseService'
import DataTable from '@/components/DataTable.vue'

export default {
  name: 'AdminOrg',
  components: { DataTable },
  data() {
    return {
      loading: true,
      orgId: this.$route.params.orgId,
      org: null,
      drives: [],
      columns: [
        { accessorKey: 'name', header: 'Drive', enableSorting: true },
        { accessorKey: 'placementDate', header: 'Placement Date', enableSorting: true },
        { accessorKey: 'round1Timer', header: 'R1 Timer', enableSorting: true, meta: { align: 'center' } },
        { accessorKey: 'status', header: 'Status', enableSorting: true, meta: { align: 'center' } },
        { id: 'actions', header: '', enableSorting: false, meta: { align: 'right' } },
      ],
      creating: false,
      newDrive: { show: false, name: '', placementDate: new Date().toISOString().slice(0, 10), round1Timer: 45 },
      deleteDialog: { show: false, drive: null },
      snackbar: { show: false, text: '', color: 'success' },
    }
  },
  computed: {
    // Rows enriched with a date-aware R1 status (used by the Status column so it
    // sorts/filters on the meaningful label, not the raw round1Active boolean).
    driveRows() {
      return this.drives.map(d => ({ ...d, status: this.statusOf(d).label }))
    },
  },
  async mounted() {
    await this.loadAll()
  },
  methods: {
    // R1 status: manually off → "Off"; else by placement date vs today.
    statusOf(d) {
      const today = new Date().toISOString().slice(0, 10)
      if (d.round1Active === false) return { label: 'Off', color: 'rgba(17,17,17,0.07)', text: 'rgba(17,17,17,0.45)' }
      if (d.placementDate && d.placementDate > today) return { label: 'Scheduled', color: 'rgba(37,99,235,0.12)', text: '#2563EB' }
      if (d.placementDate === today) return { label: 'Active', color: 'rgba(76,175,80,0.15)', text: '#4caf50' }
      return { label: 'Closed', color: 'rgba(17,17,17,0.08)', text: 'rgba(17,17,17,0.5)' }
    },
    async loadAll() {
      this.loading = true
      try {
        const [org, drives] = await Promise.all([
          firebaseService.getOrg(this.orgId),
          firebaseService.getDrives(this.orgId),
        ])
        this.org = org || { id: this.orgId, name: this.orgId }
        this.drives = drives.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      } catch (e) {
        this.showSnackbar('Failed to load drives', 'error')
      } finally {
        this.loading = false
      }
    },
    openNewDrive() {
      this.newDrive = { show: true, name: '', placementDate: new Date().toISOString().slice(0, 10), round1Timer: 45 }
    },
    async createDrive() {
      if (this.$refs.driveForm && !this.$refs.driveForm.validate()) return
      this.creating = true
      try {
        const drive = await firebaseService.createDrive(this.orgId, {
          name: this.newDrive.name,
          placementDate: this.newDrive.placementDate,
          round1Timer: this.newDrive.round1Timer,
        })
        this.drives.unshift(drive)
        this.newDrive.show = false
        this.showSnackbar('Placement drive created', 'success')
      } catch (e) {
        this.showSnackbar('Failed to create drive', 'error')
      } finally {
        this.creating = false
      }
    },
    async copyLink(d) {
      const url = `${window.location.origin}/assess/${this.orgId}/${d.id}/round1`
      try {
        await navigator.clipboard.writeText(url)
        this.showSnackbar('Round 1 link copied', 'success')
      } catch {
        this.showSnackbar(url, 'info')
      }
    },
    confirmDelete(d) {
      this.deleteDialog = { show: true, drive: d }
    },
    async doDelete() {
      const d = this.deleteDialog.drive
      this.deleteDialog.show = false
      if (!d) return
      try {
        await firebaseService.deleteDrive(this.orgId, d.id)
        this.drives = this.drives.filter(x => x.id !== d.id)
        this.showSnackbar('Drive deleted', 'success')
      } catch (e) {
        this.showSnackbar('Failed to delete drive', 'error')
      }
    },
    async logout() {
      await firebaseService.adminLogout()
      this.$router.push('/admin/login')
    },
    showSnackbar(text, color = 'success') {
      this.snackbar = { show: true, text, color }
    },
  },
}
</script>

<style scoped>
.org-root { min-height: 100vh; background: linear-gradient(160deg, #F7F7F8 0%, #FFFFFF 60%, #FFFFFF 100%); font-family: 'Inter', sans-serif; }
.app-bar-border { border-bottom: 1px solid rgba(17, 17, 17, 0.15) !important; }
.brand-logo { font-size: 1.2rem; font-weight: 700; }
.brand-ia { color: #111111; } .brand-assess { color: #111111; }
.app-bar-title { font-size: 0.95rem; color: rgba(17,17,17,0.75); }
.breadcrumb-sep { color: rgba(17,17,17,0.3); }
.logout-btn, .back-btn { color: rgba(17,17,17,0.7) !important; text-transform: none; }
.org-main { background: transparent; }
.page-wrap { max-width: 1100px; margin: 0 auto; padding: 32px 24px 64px; }
.content-header { margin-bottom: 28px; }
.college-icon-row { display: flex; align-items: center; }
.college-icon { width: 44px; height: 44px; border-radius: 10px; background: rgba(17,17,17,0.12); display: flex; align-items: center; justify-content: center; }
.content-title { color: #111111; font-size: 1.4rem; font-weight: 700; }
.content-subtitle { color: rgba(17,17,17,0.5); font-size: 0.85rem; }
.action-top-btn { text-transform: none !important; font-weight: 600 !important; border-radius: 8px !important; }
.empty-state { text-align: center; padding: 80px 20px; }
.empty-title { color: #111111; font-size: 1.1rem; font-weight: 600; }
.empty-sub { color: rgba(17,17,17,0.45); font-size: 0.9rem; }
.drives-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px; }
.drive-card { background: #FFFFFF; border: 1px solid rgba(17,17,17,0.2); border-radius: 12px; padding: 20px; transition: border-color 0.2s; }
.drive-card:hover { border-color: rgba(17,17,17,0.45); }
.drive-card-head { display: flex; align-items: flex-start; justify-content: space-between; }
.drive-name { color: #111111; font-weight: 700; font-size: 1.05rem; }
.drive-date { color: rgba(17,17,17,0.5); font-size: 0.78rem; margin-top: 3px; }
.drive-meta { color: rgba(17,17,17,0.55); font-size: 0.8rem; display: flex; align-items: center; }
.drive-actions { display: flex; align-items: center; }
.ia-btn { text-transform: none !important; font-weight: 600 !important; border-radius: 8px !important; }
/* Table cells */
.cell-drive { display: inline-flex; flex-direction: column; cursor: pointer; }
.cell-drive-name { font-weight: 700; color: #111111; }
.cell-drive-name:hover { text-decoration: underline; }
.cell-drive-id { font-size: 0.72rem; color: rgba(17,17,17,0.4); }
.cell-muted { color: rgba(17,17,17,0.6); }
.row-actions { display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end; }
.dialog-card { background: #FFFFFF !important; border: 1px solid rgba(17,17,17,0.2); border-radius: 12px !important; }
.dialog-title { color: #111111; font-size: 1.1rem; font-weight: 600; }
</style>

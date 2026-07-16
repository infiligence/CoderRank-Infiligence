<template>
  <div class="dt">
    <!-- Toolbar: global filter + optional right slot -->
    <div class="dt-toolbar">
      <div class="dt-search">
        <v-icon small color="rgba(17,17,17,0.4)" class="dt-search-icon">mdi-magnify</v-icon>
        <input
          :value="globalFilter"
          @input="globalFilter = $event.target.value"
          :placeholder="filterPlaceholder"
          class="dt-search-input"
          type="text"
        />
        <v-icon v-if="globalFilter" small color="rgba(17,17,17,0.4)" class="dt-search-clear" @click="globalFilter = ''">mdi-close</v-icon>
      </div>
      <div class="dt-toolbar-right"><slot name="toolbar" /></div>
    </div>

    <div class="dt-scroll">
      <table class="dt-table">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.id || col.accessorKey"
              :style="{ textAlign: col.meta && col.meta.align }"
              :class="{ 'dt-sortable': col.enableSorting !== false }"
              @click="onHeaderClick(col)"
            >
              <span class="dt-th-inner">
                {{ col.header }}
                <v-icon v-if="col.enableSorting !== false" x-small :color="sortState(col) ? '#111111' : 'rgba(17,17,17,0.25)'">
                  {{ sortState(col) === 'asc' ? 'mdi-arrow-up' : sortState(col) === 'desc' ? 'mdi-arrow-down' : 'mdi-unfold-more-horizontal' }}
                </v-icon>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id" class="dt-row">
            <td
              v-for="col in columns"
              :key="col.id || col.accessorKey"
              :style="{ textAlign: col.meta && col.meta.align }"
            >
              <slot :name="`cell-${col.id || col.accessorKey}`" :row="row.original" :value="cellValue(row, col)">
                {{ cellValue(row, col) }}
              </slot>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td :colspan="columns.length" class="dt-empty">
              <slot name="empty">{{ globalFilter ? 'No matches for “' + globalFilter + '”' : 'No records' }}</slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="filteredCount" class="dt-footer">
      <span class="dt-footer-info">
        {{ rangeStart }}–{{ rangeEnd }} of {{ filteredCount }}
      </span>
      <div v-if="pageCount > 1" class="dt-pager">
        <button class="dt-page-btn" :disabled="pageIndex === 0" @click="goTo(pageIndex - 1)">
          <v-icon x-small>mdi-chevron-left</v-icon>
        </button>
        <button
          v-for="p in pageButtons"
          :key="p.key"
          class="dt-page-num"
          :class="{ 'dt-page-active': p.index === pageIndex, 'dt-page-gap': p.gap }"
          :disabled="p.gap"
          @click="!p.gap && goTo(p.index)"
        >{{ p.gap ? '…' : p.index + 1 }}</button>
        <button class="dt-page-btn" :disabled="pageIndex >= pageCount - 1" @click="goTo(pageIndex + 1)">
          <v-icon x-small>mdi-chevron-right</v-icon>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import {
  createTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from '@tanstack/table-core'

// table-core (headless) is framework-agnostic → works on Vue 2.7. We use it only
// for the sorted/filtered ROW MODEL; headers & cells are rendered from `columns`
// (the fully-controlled state API doesn't play well with getHeaderGroups()).
export default {
  name: 'DataTable',
  props: {
    columns: { type: Array, required: true },
    data: { type: Array, default: () => [] },
    filterPlaceholder: { type: String, default: 'Search…' },
    initialSorting: { type: Array, default: () => [] },
    pageSize: { type: Number, default: 10 },
  },
  data() {
    return {
      sorting: this.initialSorting.slice(),
      globalFilter: '',
      pageIndex: 0,
      rows: [],
      pageCount: 1,
      filteredCount: 0,
    }
  },
  created() {
    this._table = createTable({
      data: this.data,
      columns: this.columns,
      globalFilterFn: 'includesString',
      onStateChange: () => {},
      renderFallbackValue: null,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
    })
    this.refresh()
  },
  computed: {
    rangeStart() {
      return this.filteredCount === 0 ? 0 : this.pageIndex * this.pageSize + 1
    },
    rangeEnd() {
      return Math.min((this.pageIndex + 1) * this.pageSize, this.filteredCount)
    },
    // Page buttons with ellipsis gaps for large page counts (windowed around current).
    pageButtons() {
      const total = this.pageCount
      const cur = this.pageIndex
      const out = []
      const add = (i) => out.push({ index: i, key: 'p' + i, gap: false })
      const gap = (k) => out.push({ index: -1, key: k, gap: true })
      if (total <= 7) {
        for (let i = 0; i < total; i++) add(i)
      } else {
        add(0)
        if (cur > 2) gap('g1')
        for (let i = Math.max(1, cur - 1); i <= Math.min(total - 2, cur + 1); i++) add(i)
        if (cur < total - 3) gap('g2')
        add(total - 1)
      }
      return out
    },
  },
  watch: {
    data: 'onDataChange',
    columns: 'refresh',
    sorting() { this.pageIndex = 0; this.refresh() },
    globalFilter() { this.pageIndex = 0; this.refresh() },
    pageIndex: 'refresh',
  },
  methods: {
    onDataChange() {
      // keep the current page valid if rows shrank
      this.refresh()
      if (this.pageIndex > 0 && this.pageIndex >= this.pageCount) {
        this.pageIndex = Math.max(0, this.pageCount - 1)
      }
    },
    refresh() {
      this._table.setOptions(prev => ({
        ...prev,
        data: this.data,
        columns: this.columns,
        state: {
          sorting: this.sorting,
          globalFilter: this.globalFilter,
          columnFilters: [],
          pagination: { pageIndex: this.pageIndex, pageSize: this.pageSize },
        },
      }))
      this.rows = this._table.getRowModel().rows
      this.pageCount = this._table.getPageCount()
      this.filteredCount = this._table.getFilteredRowModel().rows.length
    },
    goTo(i) {
      if (i < 0 || i >= this.pageCount) return
      this.pageIndex = i
    },
    sortState(col) {
      const id = col.id || col.accessorKey
      const s = this.sorting[0]
      if (!s || s.id !== id) return false
      return s.desc ? 'desc' : 'asc'
    },
    onHeaderClick(col) {
      if (col.enableSorting === false) return
      const id = col.id || col.accessorKey
      const cur = this.sorting[0]
      if (!cur || cur.id !== id) this.sorting = [{ id, desc: false }]
      else if (!cur.desc) this.sorting = [{ id, desc: true }]
      else this.sorting = [] // third click clears sort
    },
    cellValue(row, col) {
      if (!col.accessorKey) return ''
      const v = row.original[col.accessorKey]
      return v == null ? '' : v
    },
  },
}
</script>

<style scoped>
.dt {
  background: #FFFFFF;
  border: 1px solid var(--ia-border, #E6E6EA);
  border-radius: 12px;
  overflow: hidden;
}
.dt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(17, 17, 17, 0.06);
}
.dt-search {
  display: flex;
  align-items: center;
  background: rgba(17, 17, 17, 0.04);
  border: 1px solid rgba(17, 17, 17, 0.08);
  border-radius: 9px;
  padding: 0 10px;
  height: 38px;
  min-width: 240px;
  max-width: 360px;
  flex: 1;
}
.dt-search-icon { margin-right: 6px; }
.dt-search-input {
  border: none;
  outline: none;
  background: transparent;
  flex: 1;
  font-size: 0.86rem;
  color: #111111;
  font-family: 'Inter', sans-serif;
}
.dt-search-clear { cursor: pointer; }
.dt-toolbar-right { display: flex; align-items: center; gap: 8px; }
.dt-scroll { overflow-x: auto; }
.dt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
}
.dt-table thead th {
  text-align: left;
  font-weight: 700;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(17, 17, 17, 0.5);
  padding: 12px 16px;
  border-bottom: 1px solid rgba(17, 17, 17, 0.08);
  white-space: nowrap;
  user-select: none;
}
.dt-table thead th.dt-sortable { cursor: pointer; }
.dt-table thead th.dt-sortable:hover { color: #111111; }
.dt-th-inner { display: inline-flex; align-items: center; gap: 4px; }
.dt-table tbody td {
  padding: 13px 16px;
  border-bottom: 1px solid rgba(17, 17, 17, 0.05);
  color: rgba(17, 17, 17, 0.85);
  vertical-align: middle;
}
.dt-row:hover td { background: rgba(17, 17, 17, 0.02); }
.dt-row:last-child td { border-bottom: none; }
.dt-empty {
  text-align: center;
  padding: 40px 16px !important;
  color: rgba(17, 17, 17, 0.4);
}
.dt-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  font-size: 0.75rem;
  color: rgba(17, 17, 17, 0.45);
  border-top: 1px solid rgba(17, 17, 17, 0.06);
}
.dt-pager { display: flex; align-items: center; gap: 4px; }
.dt-page-btn,
.dt-page-num {
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid rgba(17, 17, 17, 0.12);
  border-radius: 7px;
  background: #FFFFFF;
  color: rgba(17, 17, 17, 0.7);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', sans-serif;
}
.dt-page-btn:hover:not(:disabled),
.dt-page-num:hover:not(:disabled) { background: rgba(17, 17, 17, 0.04); }
.dt-page-btn:disabled { opacity: 0.4; cursor: default; }
.dt-page-active {
  background: #111111 !important;
  color: #FFFFFF !important;
  border-color: #111111 !important;
}
.dt-page-gap { border: none; cursor: default; background: transparent; }
</style>

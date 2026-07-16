<template>
  <div class="candidate-root">
    <!-- Top App Bar -->
    <v-app-bar app color="#FFFFFF" elevation="0" class="app-bar-border">
      <v-btn icon @click="$router.push(`/admin/org/${orgId}/drive/${driveId}`)" class="back-btn">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div class="brand-logo ml-2">
        <brand-logo />
      </div>
      <v-app-bar-title class="app-bar-title ml-4">
        <span class="breadcrumb-link" @click="$router.push('/admin')">Dashboard</span>
        <span class="breadcrumb-sep"> / </span>
        <span class="breadcrumb-link" @click="$router.push(`/admin/org/${orgId}/drive/${driveId}`)">{{ orgName }}</span>
        <span class="breadcrumb-sep"> / </span>
        <span>{{ candidate ? candidate.name : candidateId }}</span>
      </v-app-bar-title>
      <v-spacer />
      <v-btn text class="logout-btn mr-2" @click="logout">
        <v-icon left>mdi-logout-variant</v-icon>
        Logout
      </v-btn>
    </v-app-bar>

    <v-main class="candidate-main">
      <div v-if="loading" class="d-flex justify-center align-center" style="min-height:60vh;">
        <v-progress-circular indeterminate color="primary" size="48" />
      </div>

      <div v-else-if="!candidate" class="d-flex justify-center align-center flex-column" style="min-height:60vh;">
        <v-icon size="64" color="rgba(17,17,17,0.2)">mdi-account-off-outline</v-icon>
        <p class="mt-4" style="color:rgba(17,17,17,0.5);">Candidate not found</p>
      </div>

      <v-container v-else style="max-width:1000px;" class="py-8">
        <!-- Candidate Header -->
        <div class="candidate-header">
          <div class="candidate-avatar">
            {{ initials(candidate.name) }}
          </div>
          <div class="candidate-info ml-4">
            <h1 class="candidate-name">{{ candidate.name }}</h1>
            <div class="candidate-email">
              <v-icon x-small class="mr-1" color="rgba(17,17,17,0.4)">mdi-identifier</v-icon>
              {{ candidate.collegeName }}<template v-if="candidate.rollNumber"> · Roll {{ candidate.rollNumber }}</template><template v-if="candidate.department"> · {{ candidate.department }}</template>
            </div>
            <div class="candidate-badges mt-2">
              <v-chip
                x-small
                :color="candidate.round1Data ? 'rgba(17,17,17,0.15)' : 'rgba(17,17,17,0.07)'"
                :text-color="candidate.round1Data ? '#111111' : 'rgba(17,17,17,0.45)'"
                class="mr-2"
              >
                R1: {{ candidate.round1Data ? 'Submitted' : 'Pending' }}
              </v-chip>
            </div>
          </div>
          <v-spacer />
        </div>

        <!-- Round 1 review (centered, collapsible sections) -->
        <div class="mt-6">
          <round1-answers-panel
            :grade="grade"
            :sections="sectionsMeta"
            :submitted="!!(candidate && candidate.round1Data)"
            :coding-results="codingResults"
            :grading-id="gradingId"
            @grade="runTestCases"
          />
        </div>

        <!-- Audit trail -->
        <div class="mt-6">
          <audit-trail-panel :candidate="candidate" />
        </div>

        <!-- Round 2 Code Section -->
        <div v-if="candidate.round2Data" class="mt-8">
          <div class="section-divider mb-6">
            <v-icon color="primary" class="mr-2">mdi-code-braces</v-icon>
            <span class="section-divider-label">Round 2 Submission</span>
          </div>
          <div class="r2-meta mb-4">
            <div class="r2-meta-item">
              <v-icon x-small color="rgba(17,17,17,0.4)" class="mr-1">mdi-code-tags</v-icon>
              <span class="r2-meta-label">Language:</span>
              <span class="r2-meta-val ml-1">{{ candidate.round2Data.language }}</span>
            </div>
            <div class="r2-meta-item ml-5">
              <v-icon x-small color="rgba(17,17,17,0.4)" class="mr-1">mdi-timer-outline</v-icon>
              <span class="r2-meta-label">Time Taken:</span>
              <span class="r2-meta-val ml-1">{{ formatDuration(candidate.round2Data.submitTime - candidate.round2Data.startTime) }}</span>
            </div>
          </div>

          <!-- Final Code -->
          <div class="code-section-card mb-6">
            <div class="code-section-header">
              <v-icon small color="primary" class="mr-2">mdi-file-code</v-icon>
              Final Submitted Code
            </div>
            <pre class="code-block">{{ candidate.round2Data.finalCode }}</pre>
          </div>

          <!-- Executions -->
          <div v-if="candidate.executions && candidate.executions.length > 0">
            <div
              class="executions-toggle"
              @click="showExecutions = !showExecutions"
            >
              <v-icon small class="mr-2" :color="showExecutions ? 'primary' : 'rgba(17,17,17,0.5)'">
                {{ showExecutions ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
              </v-icon>
              <span>{{ candidate.executions.length }} Code Execution{{ candidate.executions.length !== 1 ? 's' : '' }}</span>
            </div>
            <div v-if="showExecutions" class="executions-list mt-3">
              <div
                v-for="(ex, ei) in candidate.executions"
                :key="ei"
                class="execution-item"
              >
                <div class="execution-header">
                  <v-chip x-small color="rgba(33,150,243,0.15)" text-color="#2196F3" class="mr-2">{{ ex.language }}</v-chip>
                  <span class="execution-time">{{ formatTimestamp(ex.timestamp) }}</span>
                  <span class="execution-index ml-auto">#{{ ei + 1 }}</span>
                </div>
                <pre class="code-block-sm mt-2">{{ ex.code }}</pre>
              </div>
            </div>
          </div>
        </div>
      </v-container>
    </v-main>

    <!-- Compare Dialog -->
    <v-dialog v-model="compareDialog" max-width="600">
      <v-card class="dialog-card">
        <v-card-title class="dialog-title pa-6 pb-2">
          <v-icon color="primary" class="mr-3">mdi-compare</v-icon>
          Compare with Another Candidate
        </v-card-title>
        <v-card-text class="pa-6 pt-4">
          <v-select
            v-model="compareTarget"
            :items="otherCandidates"
            item-text="name"
            item-value="id"
            label="Select candidate to compare"
            outlined
            dense
            hide-details
          >
            <template #item="{ item }">
              <div>
                <div>{{ item.name }}</div>
                <div style="font-size:0.78rem;color:rgba(17,17,17,0.4);">{{ item.email }}</div>
              </div>
            </template>
          </v-select>
        </v-card-text>
        <v-card-actions class="pa-6 pt-0">
          <v-spacer />
          <v-btn text class="cancel-btn mr-2" @click="compareDialog = false">Cancel</v-btn>
          <v-btn color="primary" class="compare-go-btn" :disabled="!compareTarget" @click="openComparison">
            Compare
            <v-icon right>mdi-arrow-right</v-icon>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Side-by-side Comparison Dialog -->
    <v-dialog v-model="comparisonOpen" max-width="1200" scrollable>
      <v-card class="dialog-card" style="max-height:90vh;">
        <v-card-title class="dialog-title pa-6 pb-4">
          <v-icon color="primary" class="mr-3">mdi-compare</v-icon>
          Comparison: {{ candidate && candidate.name }} vs {{ compareTargetData && compareTargetData.name }}
          <v-spacer />
          <v-btn icon @click="comparisonOpen = false"><v-icon>mdi-close</v-icon></v-btn>
        </v-card-title>
        <v-divider style="border-color:rgba(17,17,17,0.15)" />
        <v-card-text class="pa-0" style="overflow-y:auto;">
          <v-row no-gutters v-if="candidate && compareTargetData">
            <!-- Left: current candidate -->
            <v-col cols="6" style="border-right:1px solid rgba(17,17,17,0.12);">
              <div class="compare-col-header">
                <v-icon small color="primary" class="mr-2">mdi-account</v-icon>
                {{ candidate.name }}
              </div>
              <div class="compare-col-body">
                <div class="compare-section-label">Round 1 Answers</div>
                <compare-answers :questions="questions" :candidate="candidate" />
                <div v-if="candidate.round2Data" class="mt-4">
                  <div class="compare-section-label">Round 2 Final Code</div>
                  <pre class="code-block">{{ candidate.round2Data.finalCode }}</pre>
                </div>
              </div>
            </v-col>
            <!-- Right: compare target -->
            <v-col cols="6">
              <div class="compare-col-header">
                <v-icon small color="secondary" class="mr-2">mdi-account</v-icon>
                {{ compareTargetData.name }}
              </div>
              <div class="compare-col-body">
                <div class="compare-section-label">Round 1 Answers</div>
                <compare-answers :questions="questions" :candidate="compareTargetData" />
                <div v-if="compareTargetData.round2Data" class="mt-4">
                  <div class="compare-section-label">Round 2 Final Code</div>
                  <pre class="code-block">{{ compareTargetData.round2Data.finalCode }}</pre>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" bottom right timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script>
import { firebaseService } from '@/services/firebaseService'
import { RUNNER_URL } from '@/config'

// ── Inline child components ──────────────────────────────────────────────────

const Round1AnswersPanel = {
  name: 'Round1AnswersPanel',
  props: {
    grade: { type: Object, default: null },
    sections: { type: Array, default: () => [] },
    submitted: { type: Boolean, default: false },
    codingResults: { type: Object, default: () => ({}) },
    gradingId: { type: String, default: null },
  },
  data() {
    return { opened: {} } // { [sectionKey]: true } when expanded; collapsed by default
  },
  computed: {
    pct() {
      if (!this.grade || !this.grade.maxMarks) return 0
      return Math.round((this.grade.marks / this.grade.maxMarks) * 100)
    },
    // sections that actually have served questions, in fixed order, with details
    sectionGroups() {
      if (!this.grade) return []
      const byKey = {}
      this.grade.details.forEach(d => { (byKey[d.section] = byKey[d.section] || []).push(d) })
      return this.sections
        .filter(s => byKey[s.key] && byKey[s.key].length)
        .map(s => ({ ...s, details: byKey[s.key], score: this.grade.sections[s.key] || { correct: 0, total: 0 } }))
    },
  },
  methods: {
    isOpen(key) { return this.opened[key] === true },
    toggleSection(key) { this.$set(this.opened, key, !this.opened[key]) },
    typeColor(type) {
      const m = { single: { bg: 'rgba(17,17,17,0.15)', text: '#111111' }, mcq: { bg: 'rgba(17,17,17,0.15)', text: '#111111' }, text: { bg: 'rgba(255,183,77,0.15)', text: '#ffb74d' }, code: { bg: 'rgba(76,175,80,0.15)', text: '#4caf50' } }
      return m[type] || m.text
    },
    // Section score label. Coding is scored in marks (not correct/total);
    // MCQ/single sections show correct/total.
    secScore(s, compact) {
      const sc = s.score || {}
      const isCoding = s.details && s.details.some(d => d.type === 'code')
      if (isCoding) {
        if (compact) return `${sc.marks || 0}/${sc.maxMarks || 0}`
        const suffix = sc.pending ? ` · ${sc.pending} pending` : ''
        return `${sc.marks || 0} / ${sc.maxMarks || 0} marks${suffix}`
      }
      return sc.total ? `${sc.correct}${compact ? '/' : ' / '}${sc.total}` : (compact ? '—' : '—')
    },
  },
  template: `
    <div>
      <div class="panel-header">
        <div class="panel-title">Round 1 Review</div>
      </div>
      <div v-if="!submitted || !grade" class="empty-panel">
        <v-icon size="36" color="rgba(17,17,17,0.2)">mdi-clipboard-clock-outline</v-icon>
        <p class="mt-2">Round 1 not submitted yet</p>
      </div>
      <div v-else>
        <!-- Overview board -->
        <div class="overview-board mb-5">
          <div class="overview-main">
            <div class="overview-score">{{ grade.marks }} <span class="overview-slash">/</span> {{ grade.maxMarks }}</div>
            <div class="overview-caption">Total Marks · {{ grade.correct }}/{{ grade.total }} MCQ correct</div>
          </div>
          <div class="overview-pct-wrap">
            <div class="overview-pct">{{ pct }}%</div>
            <v-progress-linear :value="pct" height="6" rounded color="#111111" background-color="rgba(17,17,17,0.08)" class="mt-1" style="width:120px;" />
          </div>
          <div class="overview-sections">
            <div v-for="s in sectionGroups" :key="s.key" class="overview-sec-chip">
              <span class="overview-sec-label">{{ s.label }}</span>
              <span class="overview-sec-val">{{ secScore(s, true) }}</span>
            </div>
          </div>
        </div>

        <!-- Per-section question review (collapsible) -->
        <div v-for="s in sectionGroups" :key="s.key" class="review-section mb-3">
          <div class="review-section-head" @click="toggleSection(s.key)">
            <v-icon small class="mr-1" color="rgba(17,17,17,0.55)">{{ isOpen(s.key) ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
            <span class="review-section-title">{{ s.label }}</span>
            <v-chip x-small class="ml-2" color="rgba(17,17,17,0.06)" text-color="rgba(17,17,17,0.6)">{{ s.details.length }}</v-chip>
            <v-spacer />
            <span class="review-section-score">{{ secScore(s, false) }}</span>
          </div>
          <div v-show="isOpen(s.key)" class="answers-list mt-3">
            <div v-for="(d, di) in s.details" :key="di" class="answer-item" :class="{ 'answer-item--wide': d.type === 'code' }">
              <div class="answer-item-header">
                <span class="answer-q-num">Q{{ di + 1 }}</span>
                <v-chip x-small :color="typeColor(d.type).bg" :text-color="typeColor(d.type).text" class="ml-2">{{ d.type.toUpperCase() }}</v-chip>
                <v-spacer />
                <template v-if="d.type === 'code'">
                  <v-chip v-if="d.forcedZero" x-small color="rgba(217,119,6,0.14)" text-color="#B45309" class="mr-2">
                    <v-icon x-small left>mdi-debug-step-over</v-icon>Submitted anyway
                  </v-chip>
                  <span v-if="d.marks != null" class="tc-summary" :class="d.codingGrade && d.codingGrade.passed === d.codingGrade.total ? 'tc-all' : 'tc-some'">{{ d.marks }} / 5 marks</span>
                  <v-chip v-else-if="!(d.question.testCases && d.question.testCases.length)" x-small color="rgba(220,38,38,0.12)" text-color="#DC2626">
                    <v-icon x-small left>mdi-alert-circle-outline</v-icon>No test cases
                  </v-chip>
                  <v-chip v-else-if="gradingId === d.question.id" x-small color="rgba(37,99,235,0.12)" text-color="#2563EB">
                    <v-icon x-small left>mdi-loading mdi-spin</v-icon>Grading…
                  </v-chip>
                  <v-chip v-else x-small color="rgba(255,183,77,0.15)" text-color="#ffb74d">not graded</v-chip>
                </template>
                <template v-else>
                  <v-icon v-if="d.correct === true" small color="#4caf50">mdi-check-circle</v-icon>
                  <v-icon v-else-if="d.correct === false" small color="#f44336">mdi-close-circle</v-icon>
                  <v-chip v-else x-small color="rgba(255,183,77,0.15)" text-color="#ffb74d">manual</v-chip>
                </template>
              </div>
              <div class="answer-q-text mt-1">{{ d.question.text }}</div>
              <!-- Code answer -->
              <template v-if="d.type === 'code'">
                <div class="ans-label mt-2">Candidate's code<template v-if="d.language"> ({{ d.language }})</template></div>
                <pre class="code-block-sm">{{ d.given || '(no answer)' }}</pre>

                <!-- Test-case grading -->
                <div class="d-flex align-center mt-3" style="gap:10px">
                  <v-btn x-small color="primary"
                    :loading="gradingId === d.question.id"
                    :disabled="!d.given || !(d.question.testCases && d.question.testCases.length)"
                    @click="$emit('grade', d)">
                    <v-icon left x-small>mdi-play-circle-outline</v-icon>
                    Run test cases
                  </v-btn>
                  <span v-if="!(d.question.testCases && d.question.testCases.length)" class="ans-label">No test cases uploaded</span>
                  <span v-else-if="codingResults[d.question.id]" class="tc-summary"
                    :class="codingResults[d.question.id].passed === codingResults[d.question.id].total ? 'tc-all' : 'tc-some'">
                    {{ codingResults[d.question.id].passed }} / {{ codingResults[d.question.id].total }} passed
                  </span>
                </div>

                <div v-if="codingResults[d.question.id]" class="tc-list mt-2">
                  <div v-for="(r, ri) in codingResults[d.question.id].results" :key="ri" class="tc-item">
                    <v-icon x-small :color="r.passed ? '#16A34A' : '#DC2626'">
                      {{ r.passed ? 'mdi-check-circle' : 'mdi-close-circle' }}
                    </v-icon>
                    <span class="tc-name ml-1">Test {{ ri + 1 }}</span>
                    <span class="tc-tag ml-1">{{ r.visible ? 'visible' : 'hidden' }}</span>
                    <span v-if="r.error" class="tc-err ml-2">{{ r.error }}</span>
                    <span v-else-if="!r.passed" class="tc-diff ml-2">expected "{{ r.expected }}" · got "{{ r.actual.trim() }}"</span>
                  </div>
                </div>
              </template>
              <!-- MCQ / single / text -->
              <template v-else>
                <div class="ans-row mt-2">
                  <span class="ans-label">Given</span>
                  <span class="ans-given" :class="{ 'ans-wrong': d.correct === false, 'ans-right': d.correct === true }">
                    {{ d.given != null && d.given !== '' ? d.given : '—' }}
                  </span>
                </div>
                <div v-if="d.expected != null && d.type !== 'text'" class="ans-row mt-1">
                  <span class="ans-label">Expected</span>
                  <span class="ans-expected">{{ d.expected }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
}

const AuditTrailPanel = {
  name: 'AuditTrailPanel',
  props: {
    candidate: { type: Object, default: null },
  },
  computed: {
    events() {
      if (!this.candidate) return []
      const r1 = (this.candidate.auditR1 || []).map(e => ({ ...e, round: 1 }))
      const r2 = (this.candidate.auditR2 || []).map(e => ({ ...e, round: 2 }))
      return [...r1, ...r2].sort((a, b) => b.timestamp - a.timestamp)
    },
  },
  methods: {
    eventIcon(type) {
      const m = { tab_switch: 'mdi-tab', tab_blur: 'mdi-tab', paste: 'mdi-content-paste', execution: 'mdi-play-circle', start: 'mdi-play', submit: 'mdi-check-circle', focus: 'mdi-eye' }
      return m[type] || 'mdi-information'
    },
    eventColor(type) {
      const m = { tab_switch: '#FF9800', tab_blur: '#FF9800', paste: '#FFC107', execution: '#2196F3', start: '#4CAF50', submit: '#4CAF50', focus: '#9E9E9E' }
      return m[type] || '#9E9E9E'
    },
    eventBg(type) {
      const m = { tab_switch: 'rgba(255,152,0,0.12)', tab_blur: 'rgba(255,152,0,0.12)', paste: 'rgba(255,193,7,0.12)', execution: 'rgba(33,150,243,0.12)', start: 'rgba(76,175,80,0.12)', submit: 'rgba(76,175,80,0.12)', focus: 'rgba(158,158,158,0.08)' }
      return m[type] || 'rgba(158,158,158,0.08)'
    },
    formatTime(ts) {
      if (!ts) return ''
      return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    },
    formatDate(ts) {
      if (!ts) return ''
      return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    },
    eventLabel(e) {
      switch (e.type) {
        case 'tab_switch': case 'tab_blur': return `Tab switch (away ${e.duration ? Math.round(e.duration / 1000) + 's' : ''})`
        case 'paste': return `Paste event${e.content ? ': "' + e.content.substring(0, 40) + (e.content.length > 40 ? '...' : '') + '"' : ''}`
        case 'execution': return `Code executed (${e.language || ''})`
        case 'start': return `Round ${e.round} started`
        case 'submit': return `Round ${e.round} submitted`
        default: return e.type || 'Event'
      }
    },
  },
  template: `
    <div>
      <div class="panel-header">
        <div class="panel-title">Audit Trail</div>
        <v-chip x-small color="rgba(17,17,17,0.07)" text-color="rgba(17,17,17,0.5)" class="ml-3">{{ events.length }} events</v-chip>
      </div>
      <div v-if="events.length === 0" class="empty-panel">
        <v-icon size="36" color="rgba(17,17,17,0.2)">mdi-shield-check-outline</v-icon>
        <p class="mt-2">No audit events recorded</p>
      </div>
      <div v-else class="audit-timeline">
        <div v-for="(ev, i) in events" :key="i" class="audit-event" :style="{ borderLeftColor: eventColor(ev.type) }">
          <div class="audit-event-header">
            <div class="audit-icon-wrap" :style="{ background: eventBg(ev.type) }">
              <v-icon x-small :color="eventColor(ev.type)">{{ eventIcon(ev.type) }}</v-icon>
            </div>
            <span class="audit-label ml-2">{{ eventLabel(ev) }}</span>
          </div>
          <div class="audit-meta mt-1">
            <span class="audit-round-badge" :style="{ background: ev.round === 1 ? 'rgba(17,17,17,0.15)' : 'rgba(17,17,17,0.12)', color: ev.round === 1 ? '#111111' : '#111111' }">R{{ ev.round }}</span>
            <span class="audit-time ml-2">{{ formatDate(ev.timestamp) }} {{ formatTime(ev.timestamp) }}</span>
          </div>
          <div v-if="ev.type === 'execution' && ev.code" class="audit-code mt-2">
            <pre>{{ ev.code.substring(0, 200) }}{{ ev.code.length > 200 ? '\n...' : '' }}</pre>
          </div>
        </div>
      </div>
    </div>
  `,
}

const CompareAnswers = {
  name: 'CompareAnswers',
  props: {
    questions: { type: Array, default: () => [] },
    candidate: { type: Object, default: null },
  },
  computed: {
    answers() {
      return (this.candidate && this.candidate.round1Data && this.candidate.round1Data.answers) || {}
    },
  },
  methods: {
    optionLabel(q, idx) {
      return q.options && q.options[idx] !== undefined ? q.options[idx] : `Option ${idx + 1}`
    },
  },
  template: `
    <div class="compare-answers">
      <div v-if="!candidate || !candidate.round1Data" style="color:rgba(17,17,17,0.35);font-size:0.85rem;padding:12px 0;">
        Round 1 not submitted
      </div>
      <div v-else>
        <div v-for="(q, qi) in questions" :key="q.id" class="compare-answer-item">
          <div class="compare-q-label">Q{{ qi + 1 }}: {{ q.text }}</div>
          <div class="compare-q-answer mt-1">
            <template v-if="q.type === 'mcq'">
              <span class="compare-ans-text">{{ (answers[q.id] || []).join(', ') || '—' }}</span>
            </template>
            <template v-else>
              <span class="compare-ans-text">{{ (answers[q.id] !== undefined && answers[q.id] !== '') ? answers[q.id] : '—' }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  `,
}

// ── Main component ───────────────────────────────────────────────────────────

export default {
  name: 'AdminCandidate',
  components: { Round1AnswersPanel, AuditTrailPanel, CompareAnswers },
  data() {
    return {
      loading: true,
      orgId: this.$route.params.orgId,
      driveId: this.$route.params.driveId,
      candidateId: this.$route.params.candidateId,
      candidate: null,
      questions: [],
      allCandidates: [],
      orgName: this.$route.params.orgId,
      mobileTab: 0,
      showExecutions: false,
      compareDialog: false,
      compareTarget: null,
      compareTargetData: null,
      comparisonOpen: false,
      codingResults: {},   // { [questionId]: { passed, total, results } }
      gradingId: null,     // questionId currently being graded
      snackbar: { show: false, text: '', color: 'success' },
    }
  },
  computed: {
    sectionsMeta() {
      return firebaseService.sections
    },
    grade() {
      if (!this.candidate || !this.candidate.round1Data) return null
      return firebaseService.gradeRound1(this.candidate.round1Data, this.questions)
    },
    otherCandidates() {
      return this.allCandidates.filter(c => c.id !== this.candidateId)
    },
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const [org, drive, candidateData, questions, allCandidates] = await Promise.all([
          firebaseService.getOrg(this.orgId),
          firebaseService.getDrive(this.orgId, this.driveId),
          firebaseService.getCandidateData(this.orgId, this.driveId, this.candidateId),
          firebaseService.getQuestionsWithAnswers(this.orgId, this.driveId),
          firebaseService.getDriveCandidates(this.orgId, this.driveId),
        ])
        if (org) this.orgName = drive ? `${org.name} · ${drive.name}` : org.name
        this.candidate = candidateData
        this.questions = questions.sort((a, b) => (a.order || 0) - (b.order || 0))
        this.allCandidates = allCandidates
      } catch (e) {
        console.error(e)
        this.showSnackbar('Failed to load candidate data', 'error')
      } finally {
        this.loading = false
      }
      // Auto-grade any coding answers that aren't scored yet (runner-backed,
      // admin-side). Runs after render; marks fill in as it completes.
      this.autoGradeCoding()
    },
    async autoGradeCoding() {
      const g = this.grade
      if (!g) return
      const pending = g.details.filter(d =>
        d.type === 'code' && d.given && String(d.given).trim() &&
        d.marks == null && d.question.testCases && d.question.testCases.length)
      for (const d of pending) {
        await this.runTestCases(d, true) // silent
      }
    },
    async openComparison() {
      if (!this.compareTarget) return
      try {
        const data = await firebaseService.getCandidateData(this.orgId, this.driveId, this.compareTarget)
        this.compareTargetData = data
        this.compareDialog = false
        this.comparisonOpen = true
      } catch (e) {
        this.showSnackbar('Failed to load comparison data', 'error')
      }
    },
    initials(name) {
      if (!name) return '?'
      return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    },
    formatDuration(ms) {
      if (!ms || ms < 0) return '—'
      const m = Math.floor(ms / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      return `${m}m ${s}s`
    },
    formatTimestamp(ts) {
      if (!ts) return ''
      return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    },
    // Run the candidate's code for a coding question against its test cases.
    // silent=true suppresses snackbars (used by auto-grade on load).
    async runTestCases(detail, silent = false) {
      const q = detail.question
      const code = detail.rawAnswer || detail.given || ''
      if (!q || this.gradingId) return
      this.gradingId = q.id
      try {
        const r1 = this.candidate && this.candidate.round1Data
        const lang = (r1 && r1.codeLanguages && r1.codeLanguages[q.id]) || firebaseService.runnerLang(q.language)
        const res = await firebaseService.gradeCoding(RUNNER_URL, q, code, lang)
        this.$set(this.codingResults, q.id, res)
        if (res.total > 0 && !res.results.some(r => r.error === 'Runner not reachable')) {
          // Persist so the score/leaderboard reflect it, and refresh locally.
          const grade = { passed: res.passed, total: res.total }
          await firebaseService.saveCandidateCodingGrade(this.orgId, this.driveId, this.candidateId, q.id, grade)
          if (this.candidate && this.candidate.round1Data) {
            this.$set(this.candidate.round1Data, 'codingGrades', {
              ...(this.candidate.round1Data.codingGrades || {}), [q.id]: grade,
            })
          }
          if (!silent) this.showSnackbar(`Graded: ${res.passed}/${res.total} tests passed`, 'success')
        } else if (res.results.some(r => r.error === 'Runner not reachable')) {
          if (!silent) this.showSnackbar('Runner not reachable — start it: node runner/server.js', 'error')
        }
      } catch (e) {
        if (!silent) this.showSnackbar('Grading failed', 'error')
      } finally {
        this.gradingId = null
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
    this.loadData()
  },
}
</script>

<style scoped>
.candidate-root { background: #F7F7F8; min-height: 100vh; }
.app-bar-border { border-bottom: 1px solid rgba(17,17,17,0.15) !important; }
.brand-logo { font-size: 1.3rem; font-weight: 700; letter-spacing: -0.5px; flex-shrink: 0; }
.brand-ia { color: #111111; }
.brand-assess { color: #111111; }
.app-bar-title { font-size: 0.85rem !important; color: rgba(17,17,17,0.55) !important; font-weight: 400 !important; }
.breadcrumb-link { cursor: pointer; color: rgba(17,17,17,0.45); transition: color 0.15s; }
.breadcrumb-link:hover { color: #111111; }
.breadcrumb-sep { color: rgba(17,17,17,0.2); }
.logout-btn { text-transform: none !important; font-weight: 600; letter-spacing: 0; color: rgba(17,17,17,0.6) !important; }
.back-btn { color: rgba(17,17,17,0.6) !important; }
.candidate-main { background: #F7F7F8; }

/* Header */
.candidate-header {
  background: #FFFFFF;
  border: 1px solid rgba(17,17,17,0.15);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: flex-start;
}
.candidate-avatar {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: rgba(17,17,17,0.2);
  color: #111111;
  font-size: 1.1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.candidate-name { font-size: 1.3rem; font-weight: 700; color: #111111; letter-spacing: -0.3px; }
.candidate-email { font-size: 0.85rem; color: rgba(17,17,17,0.45); display: flex; align-items: center; margin-top: 2px; }
.candidate-badges { display: flex; flex-wrap: wrap; gap: 6px; }
.compare-btn { text-transform: none !important; font-weight: 600; letter-spacing: 0; border-radius: 8px !important; }

/* Mobile Tabs */
.mobile-tabs { border-bottom: 1px solid rgba(17,17,17,0.08); }
.mobile-tab { text-transform: none !important; font-weight: 600; letter-spacing: 0; }
.transparent-tabs >>> .v-window__container { background: transparent !important; }

/* Panels (shared via global-ish styles via deep) */
.candidate-root >>> .panel-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
.candidate-root >>> .panel-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #111111;
}
.candidate-root >>> .score-badge {
  background: rgba(17,17,17,0.15);
  color: #111111;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
}
.candidate-root >>> .empty-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  color: rgba(17,17,17,0.35);
  font-size: 0.88rem;
  text-align: center;
}
/* Answers list — responsive grid to use horizontal space */
.candidate-root >>> .answers-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 12px;
  align-items: start;
}
.audit-sticky { position: sticky; top: 80px; }
.candidate-root >>> .answer-item {
  background: #FFFFFF;
  border: 1px solid rgba(17,17,17,0.12);
  border-radius: 10px;
  padding: 14px 16px;
  min-width: 0;            /* let the grid cell shrink instead of overflowing */
  overflow: hidden;
}
/* Code answers get the full row so long code never overlaps neighbours */
.candidate-root >>> .answer-item--wide { grid-column: 1 / -1; }
.candidate-root >>> .answer-item-header { display: flex; align-items: center; }
.candidate-root >>> .answer-q-num { font-size: 0.75rem; font-weight: 700; color: rgba(17,17,17,0.4); }
.candidate-root >>> .answer-q-text { font-size: 0.88rem; color: rgba(17,17,17,0.8); line-height: 1.5; }
.candidate-root >>> .answer-response { margin-top: 8px; }
.candidate-root >>> .option-row {
  display: flex;
  align-items: center;
  padding: 5px 8px;
  border-radius: 6px;
  margin-bottom: 3px;
  font-size: 0.84rem;
  color: rgba(17,17,17,0.55);
  transition: background 0.1s;
}
.candidate-root >>> .option-row.selected { background: rgba(17,17,17,0.08); color: rgba(17,17,17,0.9); }
.candidate-root >>> .option-row.correct { background: rgba(76,175,80,0.06); }
.candidate-root >>> .text-answer-card {
  background: rgba(17,17,17,0.04);
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 0.87rem;
  color: rgba(17,17,17,0.8);
  line-height: 1.6;
  white-space: pre-wrap;
}
/* Overview board */
.candidate-root >>> .overview-board {
  display: flex;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
  background: #FFFFFF;
  border: 1px solid rgba(17,17,17,0.2);
  border-radius: 12px;
  padding: 20px 24px;
}
.candidate-root >>> .overview-score { font-size: 2rem; font-weight: 800; color: #4caf50; line-height: 1; }
.candidate-root >>> .overview-slash { color: rgba(17,17,17,0.3); font-weight: 400; }
.candidate-root >>> .overview-caption { font-size: 0.75rem; color: rgba(17,17,17,0.45); margin-top: 4px; }
.candidate-root >>> .overview-pct { font-size: 1.1rem; font-weight: 700; color: #111111; }
.candidate-root >>> .overview-sections { display: flex; gap: 10px; flex-wrap: wrap; margin-left: auto; }
.candidate-root >>> .overview-sec-chip {
  display: flex; flex-direction: column; align-items: center;
  background: rgba(17,17,17,0.08);
  border: 1px solid rgba(17,17,17,0.18);
  border-radius: 8px; padding: 6px 14px;
}
.candidate-root >>> .overview-sec-label { font-size: 0.68rem; color: rgba(17,17,17,0.5); text-transform: uppercase; letter-spacing: 0.05em; }
.candidate-root >>> .overview-sec-val { font-size: 0.95rem; font-weight: 700; color: #111111; }
/* Review sections — collapsible cards */
.candidate-root >>> .review-section {
  background: #FFFFFF;
  border: 1px solid var(--ia-border);
  border-radius: 12px;
  padding: 14px 18px;
  box-shadow: var(--ia-shadow-soft);
}
.candidate-root >>> .review-section-head {
  display: flex; align-items: center;
  cursor: pointer; user-select: none;
}
.candidate-root >>> .review-section-title { font-size: 0.98rem; font-weight: 700; color: #111111; }
.candidate-root >>> .review-section-score { font-size: 0.8rem; font-weight: 700; color: rgba(17,17,17,0.55); }
.candidate-root >>> .ans-row { display: flex; align-items: baseline; gap: 8px; }
.candidate-root >>> .ans-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(17,17,17,0.4); min-width: 62px; }
.candidate-root >>> .ans-given { font-size: 0.88rem; color: rgba(17,17,17,0.85); font-weight: 600; }
.candidate-root >>> .ans-given.ans-right { color: #4caf50; }
.candidate-root >>> .ans-given.ans-wrong { color: #f44336; }
.candidate-root >>> .ans-expected { font-size: 0.88rem; color: #4caf50; font-weight: 600; }
/* Coding test-case results */
.candidate-root >>> .tc-summary { font-size: 0.85rem; font-weight: 700; }
.candidate-root >>> .tc-summary.tc-all { color: #16A34A; }
.candidate-root >>> .tc-summary.tc-some { color: #DC2626; }
.candidate-root >>> .tc-list {
  display: flex; flex-direction: column; gap: 4px;
  background: rgba(17,17,17,0.03);
  border: 1px solid var(--ia-border);
  border-radius: 8px; padding: 8px 10px;
}
.candidate-root >>> .tc-item { display: flex; align-items: center; font-size: 0.8rem; color: var(--ia-text-dim); }
.candidate-root >>> .tc-name { font-weight: 600; color: var(--ia-text); }
.candidate-root >>> .tc-tag { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ia-text-faint); }
.candidate-root >>> .tc-err { color: #DC2626; font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; }
.candidate-root >>> .tc-diff { color: var(--ia-text-dim); font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; }
/* Audit trail */
.candidate-root >>> .audit-timeline { display: flex; flex-direction: column; gap: 8px; }
.candidate-root >>> .audit-event {
  border-left: 3px solid rgba(17,17,17,0.1);
  padding: 10px 12px;
  background: rgba(17,17,17,0.025);
  border-radius: 0 8px 8px 0;
}
.candidate-root >>> .audit-event-header { display: flex; align-items: center; }
.candidate-root >>> .audit-icon-wrap {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.candidate-root >>> .audit-label { font-size: 0.83rem; color: rgba(17,17,17,0.8); }
.candidate-root >>> .audit-meta { display: flex; align-items: center; padding-left: 24px; }
.candidate-root >>> .audit-round-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
}
.candidate-root >>> .audit-time { font-size: 0.74rem; color: rgba(17,17,17,0.3); }
.candidate-root >>> .audit-code {
  padding-left: 24px;
}
.candidate-root >>> .audit-code pre {
  background: rgba(0,0,0,0.3);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  color: rgba(17,17,17,0.65);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
/* Code blocks */
.code-block {
  background: #F5F5F7;
  border: 1px solid rgba(17,17,17,0.15);
  border-radius: 8px;
  padding: 16px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 0.83rem;
  color: rgba(17,17,17,0.85);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.6;
}
.code-block-sm {
  background: #F5F5F7;
  border: 1px solid rgba(17,17,17,0.12);
  border-radius: 6px;
  padding: 10px 12px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 0.78rem;
  color: rgba(17,17,17,0.75);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
  max-width: 100%;
  margin: 6px 0 0;
}
/* Section divider */
.section-divider {
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(17,17,17,0.15);
  padding-bottom: 12px;
}
.section-divider-label {
  font-size: 1.05rem;
  font-weight: 700;
  color: #111111;
}
/* R2 Meta */
.r2-meta { display: flex; align-items: center; }
.r2-meta-item { display: flex; align-items: center; }
.r2-meta-label { font-size: 0.82rem; color: rgba(17,17,17,0.4); }
.r2-meta-val { font-size: 0.82rem; color: rgba(17,17,17,0.8); font-weight: 600; }
/* Code Section Card */
.code-section-card {
  background: #FFFFFF;
  border: 1px solid rgba(17,17,17,0.15);
  border-radius: 12px;
  overflow: hidden;
}
.code-section-header {
  background: rgba(17,17,17,0.06);
  border-bottom: 1px solid rgba(17,17,17,0.1);
  padding: 10px 16px;
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(17,17,17,0.7);
  display: flex;
  align-items: center;
}
.code-section-card .code-block {
  border: none;
  border-radius: 0;
  margin: 0;
}
/* Executions */
.executions-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 600;
  color: rgba(17,17,17,0.6);
  padding: 10px 14px;
  border: 1px solid rgba(17,17,17,0.12);
  border-radius: 8px;
  transition: background 0.15s;
}
.executions-toggle:hover { background: rgba(17,17,17,0.06); }
.executions-list { display: flex; flex-direction: column; gap: 8px; }
.execution-item {
  background: #FFFFFF;
  border: 1px solid rgba(17,17,17,0.1);
  border-radius: 8px;
  padding: 12px 14px;
}
.execution-header { display: flex; align-items: center; }
.execution-time { font-size: 0.78rem; color: rgba(17,17,17,0.4); }
.execution-index { font-size: 0.75rem; color: rgba(17,17,17,0.25); }
/* Dialog */
.dialog-card { background: #FFFFFF !important; border: 1px solid rgba(17,17,17,0.2); border-radius: 12px !important; }
.dialog-title { font-size: 1.05rem !important; font-weight: 700 !important; color: #111111 !important; display: flex; align-items: center; }
.cancel-btn { text-transform: none !important; font-weight: 600; letter-spacing: 0; color: rgba(17,17,17,0.6) !important; }
.compare-go-btn { text-transform: none !important; font-weight: 600; letter-spacing: 0; border-radius: 8px !important; }
/* Comparison columns */
.compare-col-header {
  padding: 14px 20px;
  background: rgba(17,17,17,0.06);
  border-bottom: 1px solid rgba(17,17,17,0.1);
  font-weight: 700;
  font-size: 0.92rem;
  color: #111111;
  display: flex;
  align-items: center;
}
.compare-col-body { padding: 20px; }
.compare-section-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(17,17,17,0.35);
  margin-bottom: 12px;
}
/* Compare answers inline component */
.candidate-root >>> .compare-answers { display: flex; flex-direction: column; gap: 10px; }
.candidate-root >>> .compare-answer-item {
  background: rgba(17,17,17,0.03);
  border-radius: 8px;
  padding: 10px 12px;
  border: 1px solid rgba(17,17,17,0.05);
}
.candidate-root >>> .compare-q-label {
  font-size: 0.8rem;
  color: rgba(17,17,17,0.5);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.candidate-root >>> .compare-ans-text { font-size: 0.85rem; color: rgba(17,17,17,0.85); }
</style>

<template>
  <div class="r1-root">
    <!-- ===== ENTRY FORM (no candidate registered yet) ===== -->
    <div v-if="phase === 'entry'" class="r1-centered-wrap">
      <v-row align="center" justify="center" style="min-height:100vh">
        <v-col cols="12" sm="9" md="5">
          <div class="brand-logo text-center mb-8">
            <brand-logo />
          </div>
          <v-card class="ia-card pa-8" elevation="0">
            <div class="text-center mb-6">
              <v-icon size="48" color="primary" class="mb-3">mdi-clipboard-account-outline</v-icon>
              <h2 class="black--text font-weight-700 text-h5">Candidate Registration</h2>
              <p class="text-body-2 mt-2" style="color:rgba(17,17,17,0.55)">
                Enter your details to begin the assessment
              </p>
            </div>
            <v-form ref="entryForm" @submit.prevent="registerCandidate" lazy-validation>
              <v-text-field
                v-model="form.name"
                label="Full Name"
                outlined
                dense
                prepend-inner-icon="mdi-account-outline"
                class="mb-3 ia-field"
                hide-details="auto"
                :rules="[v => !!v || 'Name is required']"
              />
              <v-select
                v-if="departmentOptions.length"
                v-model="form.department"
                :items="departmentOptions"
                label="Department"
                outlined
                dense
                prepend-inner-icon="mdi-school-outline"
                class="mb-3 ia-field"
                hide-details="auto"
                :menu-props="{ contentClass: 'dept-menu' }"
                :rules="[v => !!v || 'Department is required']"
              />
              <v-text-field
                v-else
                v-model="form.department"
                label="Department"
                outlined
                dense
                prepend-inner-icon="mdi-school-outline"
                class="mb-3 ia-field"
                hide-details="auto"
                :rules="[v => !!v || 'Department is required']"
              />
              <v-text-field
                :value="form.collegeName"
                label="College"
                outlined
                dense
                readonly
                disabled
                prepend-inner-icon="mdi-domain"
                class="mb-3 ia-field"
                hide-details="auto"
                hint="Determined by your assessment link"
              />
              <v-text-field
                v-model="form.rollNumber"
                label="Roll Number"
                outlined
                dense
                prepend-inner-icon="mdi-identifier"
                class="mb-6 ia-field"
                hide-details="auto"
                :rules="[v => !!v || 'Roll number is required']"
              />
              <v-alert v-if="regError" type="error" dense text class="mb-4 text-left" style="font-size:0.85rem">
                {{ regError }}
              </v-alert>
              <v-btn
                type="submit"
                color="primary"
                block
                large
                :loading="loading"
                class="ia-btn"
              >
                <v-icon left>mdi-arrow-right-circle-outline</v-icon>
                Begin Assessment
              </v-btn>
            </v-form>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- ===== READY SCREEN ===== -->
    <div v-else-if="phase === 'ready'" class="r1-centered-wrap">
      <v-row align="center" justify="center" style="min-height:100vh">
        <v-col cols="12" sm="9" md="6">
          <div class="brand-logo text-center mb-8">
            <brand-logo />
          </div>
          <v-card class="ia-card pa-8" elevation="0">
            <div class="text-center mb-6">
              <v-icon size="52" color="secondary" class="mb-3">mdi-check-decagram-outline</v-icon>
              <h2 class="black--text font-weight-700 text-h5 mb-1">Ready to begin?</h2>
              <p class="text-body-1 mt-1" style="color:#111111;">
                {{ org ? org.name : orgSlug }}
              </p>
            </div>

            <v-divider class="ia-divider mb-5" />

            <div class="ready-meta d-flex justify-space-around mb-6">
              <div class="text-center">
                <v-icon color="primary" class="mb-1">mdi-clock-outline</v-icon>
                <div class="black--text font-weight-600">{{ drive ? drive.round1Timer : '—' }} min</div>
                <div class="caption" style="color:rgba(17,17,17,0.45)">Time Limit</div>
              </div>
              <div class="text-center">
                <v-icon color="primary" class="mb-1">mdi-help-circle-outline</v-icon>
                <div class="black--text font-weight-600">{{ totalPlanned }}</div>
                <div class="caption" style="color:rgba(17,17,17,0.45)">Questions</div>
              </div>
              <div class="text-center">
                <v-icon color="primary" class="mb-1">mdi-account-outline</v-icon>
                <div class="black--text font-weight-600">{{ candidate ? candidate.name.split(' ')[0] : '—' }}</div>
                <div class="caption" style="color:rgba(17,17,17,0.45)">Candidate</div>
              </div>
            </div>

            <v-card v-if="sectionPlan.length" class="ia-info-card pa-4 mb-4" elevation="0">
              <p class="text-body-2 mb-2 black--text font-weight-600">Sections (in order)</p>
              <div class="d-flex flex-wrap" style="gap:8px">
                <div v-for="s in sectionPlan" :key="s.key" class="section-pill">
                  {{ s.label }} <span class="section-pill-count">{{ s.count }}</span>
                </div>
              </div>
            </v-card>

            <v-card class="ia-info-card pa-4 mb-6" elevation="0">
              <p class="text-body-2 mb-2 black--text font-weight-600">Instructions</p>
              <ul class="instruction-list text-body-2" style="color:rgba(17,17,17,0.7)">
                <li>The timer starts as soon as you click "Start Round 1".</li>
                <li>The assessment runs <strong class="black--text">one section at a time</strong>, in order.</li>
                <li>You can move freely between questions <strong class="black--text">within</strong> a section.</li>
                <li>Once you submit a section, you <strong class="black--text">cannot return</strong> to it.</li>
                <li>Your questions are randomly selected — they may differ from others.</li>
                <li>Do not close or refresh the tab during the assessment.</li>
              </ul>
            </v-card>

            <v-btn
              color="primary"
              block
              large
              :loading="loading"
              class="ia-btn"
              @click="startRound"
            >
              <v-icon left>mdi-play-circle-outline</v-icon>
              Start Round 1
            </v-btn>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- ===== ASSESSMENT IN PROGRESS (section-by-section) ===== -->
    <div v-else-if="phase === 'assessment'" class="r1-assessment-wrap">

      <!-- Top toolbar -->
      <div class="r1-toolbar">
        <div class="toolbar-left">
          <brand-logo />
          <span class="toolbar-org ml-3">{{ org ? org.name : orgSlug }}</span>
        </div>
        <div class="toolbar-center">
          <span class="toolbar-qcount">{{ currentSectionLabel }} — Question {{ currentIndex + 1 }} of {{ currentSectionQuestions.length }}</span>
        </div>
        <div class="toolbar-right d-flex align-center" style="gap:12px">
          <div :class="['timer-chip', timerUrgent ? 'timer-urgent' : '']">
            <v-icon small :color="timerUrgent ? '#FF5252' : 'rgba(17,17,17,0.7)'" class="mr-1">mdi-clock-outline</v-icon>
            <span>{{ timerDisplay }}</span>
          </div>
        </div>
      </div>

      <!-- Section stepper -->
      <div class="r1-stepper">
        <div
          v-for="(s, i) in activeSections"
          :key="s.key"
          :class="['stepper-item', i === sectionIndex ? 'stepper-active' : '', submittedSections.includes(s.key) ? 'stepper-done' : '']"
        >
          <v-icon x-small class="mr-1">
            {{ submittedSections.includes(s.key) ? 'mdi-check-circle' : (i === sectionIndex ? 'mdi-circle-slice-8' : 'mdi-circle-outline') }}
          </v-icon>
          {{ s.label }}
        </div>
      </div>

      <!-- Question card area -->
      <div class="r1-content">
        <v-row justify="center">
          <v-col cols="12" md="8" lg="7">

            <!-- Progress bar -->
            <v-progress-linear
              :value="progressPct"
              color="primary"
              background-color="rgba(17,17,17,0.15)"
              height="4"
              rounded
              class="mb-6"
            />

            <!-- Question card -->
            <v-card class="ia-card pa-7 mb-4" elevation="0" v-if="currentQuestion">
              <div class="d-flex align-start mb-5">
                <div class="q-badge mr-3">{{ currentIndex + 1 }}</div>
                <div>
                  <span class="q-section-label mr-2">{{ currentSectionLabel }}</span>
                  <span v-if="currentQuestion.topic" class="q-type-label mr-2">{{ currentQuestion.topic }}</span>
                  <span v-if="currentQuestion.difficulty" class="q-diff-label mr-2">{{ currentQuestion.difficulty }}</span>
                  <p class="black--text text-body-1 mb-0 mt-1" style="line-height:1.7">
                    {{ currentQuestion.text }}
                  </p>
                </div>
              </div>

              <!-- Single choice -->
              <v-radio-group
                v-if="currentQuestion.type === 'single'"
                v-model="answers[currentQuestion.id]"
                class="mt-2"
                hide-details
              >
                <v-radio
                  v-for="(opt, idx) in currentQuestion.options"
                  :key="idx"
                  :label="opt"
                  :value="opt"
                  color="primary"
                  class="ia-radio mb-2"
                />
              </v-radio-group>

              <!-- Multiple choice -->
              <div v-else-if="currentQuestion.type === 'mcq'" class="mt-2">
                <v-checkbox
                  v-for="(opt, idx) in currentQuestion.options"
                  :key="idx"
                  :label="opt"
                  :value="opt"
                  v-model="answers[currentQuestion.id]"
                  color="primary"
                  class="ia-checkbox mt-0 mb-1"
                  hide-details
                />
              </div>

              <!-- Text answer -->
              <v-textarea
                v-else-if="currentQuestion.type === 'text'"
                v-model="answers[currentQuestion.id]"
                outlined
                rows="6"
                placeholder="Type your answer here..."
                class="ia-field mt-2"
                hide-details
                no-resize
              />

              <!-- Code answer -->
              <div v-else-if="currentQuestion.type === 'code'" class="mt-2">
                <!-- Problem spec -->
                <div class="code-spec mb-4">
                  <div v-if="currentQuestion.inputFormat" class="spec-row">
                    <span class="spec-label">Input</span>
                    <pre class="spec-pre">{{ currentQuestion.inputFormat }}</pre>
                  </div>
                  <div v-if="currentQuestion.outputFormat" class="spec-row">
                    <span class="spec-label">Output</span>
                    <pre class="spec-pre">{{ currentQuestion.outputFormat }}</pre>
                  </div>
                  <div v-if="currentQuestion.constraints" class="spec-row">
                    <span class="spec-label">Constraints</span>
                    <pre class="spec-pre">{{ currentQuestion.constraints }}</pre>
                  </div>
                  <div class="d-flex flex-wrap" style="gap:12px">
                    <div v-if="currentQuestion.sampleInput" class="spec-sample">
                      <div class="spec-label mb-1">Sample Input</div>
                      <pre class="spec-pre">{{ currentQuestion.sampleInput }}</pre>
                    </div>
                    <div v-if="currentQuestion.sampleOutput" class="spec-sample">
                      <div class="spec-label mb-1">Sample Output</div>
                      <pre class="spec-pre">{{ currentQuestion.sampleOutput }}</pre>
                    </div>
                  </div>
                </div>

                <div class="code-label mb-2 d-flex align-center">
                  <v-icon small color="secondary" class="mr-1">mdi-code-braces</v-icon>
                  <span class="caption" style="color:#111111">Your Solution</span>
                  <v-spacer />
                  <span class="caption mr-2" style="color:rgba(17,17,17,0.5)">Language</span>
                  <v-select
                    :value="codeLangs[currentQuestion.id]"
                    @change="v => onLangChange(currentQuestion.id, v)"
                    :items="langOptions"
                    dense outlined hide-details
                    class="lang-select"
                    :menu-props="{ contentClass: 'lang-menu' }"
                    style="max-width:170px"
                  />
                </div>
                <div class="ia-editor-area">
                  <code-editor
                    :value="answers[currentQuestion.id] || ''"
                    :language="monacoLang(codeLangs[currentQuestion.id] || currentQuestion.language)"
                    theme="vs"
                    @input="v => onCodeInput(currentQuestion.id, v)"
                  />
                </div>

                <!-- Run against sample I/O -->
                <div class="d-flex align-center mt-3" style="gap:12px">
                  <v-btn small outlined color="secondary" class="ia-btn-outline" :loading="running" @click="runCode">
                    <v-icon left small>mdi-play</v-icon>
                    Run against sample
                  </v-btn>
                  <span v-if="runResult && runResult.matches === true" class="run-badge run-pass">
                    <v-icon x-small color="#4caf50">mdi-check-circle</v-icon> Output matches sample
                  </span>
                  <span v-else-if="runResult && runResult.matches === false && runResult.stage === 'run' && !runResult.timedOut" class="run-badge run-fail">
                    <v-icon x-small color="#FF5252">mdi-close-circle</v-icon> Doesn't match sample
                  </span>
                </div>

                <div v-if="runResult" class="run-output mt-3">
                  <div v-if="runResult.error" class="run-line run-err">{{ runResult.error }}</div>
                  <template v-else>
                    <div v-if="runResult.stage === 'compile'">
                      <div class="run-label run-err-label">Compile error</div>
                      <pre class="run-pre run-err">{{ runResult.stderr || 'Compilation failed' }}</pre>
                    </div>
                    <template v-else>
                      <div v-if="runResult.timedOut" class="run-line run-err">Timed out (exceeded time limit)</div>
                      <div class="run-label">Output</div>
                      <pre class="run-pre">{{ runResult.stdout !== '' ? runResult.stdout : '(no output)' }}</pre>
                      <div v-if="runResult.stderr" class="run-label run-err-label mt-2">Errors</div>
                      <pre v-if="runResult.stderr" class="run-pre run-err">{{ runResult.stderr }}</pre>
                      <div v-if="currentQuestion.sampleOutput" class="run-label mt-2">Expected (sample)</div>
                      <pre v-if="currentQuestion.sampleOutput" class="run-pre">{{ currentQuestion.sampleOutput }}</pre>
                    </template>
                  </template>
                </div>
              </div>
            </v-card>

            <!-- Navigation (within current section only) -->
            <div class="d-flex justify-space-between align-center">
              <v-btn
                outlined
                :disabled="currentIndex === 0"
                class="ia-btn-outline"
                @click="prev"
              >
                <v-icon left>mdi-chevron-left</v-icon>
                Previous
              </v-btn>
              <div class="d-flex" style="gap:8px">
                <div
                  v-for="(q, idx) in currentSectionQuestions"
                  :key="q.id"
                  :class="['q-dot', idx === currentIndex ? 'q-dot--active' : '', isAnswered(q) ? 'q-dot--answered' : '']"
                  @click="currentIndex = idx"
                />
              </div>
              <v-btn
                v-if="currentIndex < currentSectionQuestions.length - 1"
                color="primary"
                class="ia-btn"
                @click="next"
              >
                Next
                <v-icon right>mdi-chevron-right</v-icon>
              </v-btn>
              <v-btn
                v-else
                color="error"
                class="ia-btn"
                @click="confirmSectionDialog = true"
              >
                <v-icon left small>mdi-send-outline</v-icon>
                {{ isLastSection ? 'Finish & Submit' : 'Submit Section' }}
              </v-btn>
            </div>

          </v-col>
        </v-row>
      </div>

      <!-- Submit-section confirmation dialog -->
      <v-dialog v-model="confirmSectionDialog" max-width="480" persistent>
        <v-card class="ia-card pa-6" elevation="0">
          <div class="d-flex align-center mb-4">
            <v-icon color="warning" size="28" class="mr-3">mdi-alert-circle-outline</v-icon>
            <span class="black--text text-h6 font-weight-600">Submit {{ currentSectionLabel }}?</span>
          </div>
          <p class="text-body-2 mb-2" style="color:rgba(17,17,17,0.7)">
            You have answered <strong class="black--text">{{ sectionAnsweredCount }}</strong> of
            <strong class="black--text">{{ currentSectionQuestions.length }}</strong> questions in this section.
          </p>
          <p class="text-body-2 mb-5" style="color:rgba(17,17,17,0.55)">
            <strong class="black--text">You cannot return to this section</strong> once submitted.
            <template v-if="!isLastSection"> You'll continue to <strong class="black--text">{{ nextSectionLabel }}</strong>.</template>
          </p>
          <div class="d-flex justify-end" style="gap:12px">
            <v-btn outlined class="ia-btn-outline" @click="confirmSectionDialog = false" :disabled="submitting">
              Cancel
            </v-btn>
            <v-btn color="error" class="ia-btn" :loading="submitting" @click="submitSection">
              <v-icon left small>mdi-send</v-icon>
              {{ isLastSection ? 'Finish' : 'Submit & Continue' }}
            </v-btn>
          </div>
        </v-card>
      </v-dialog>

    </div>

    <!-- ===== THANK YOU SCREEN ===== -->
    <div v-else-if="phase === 'done'" class="r1-centered-wrap">
      <v-row align="center" justify="center" style="min-height:100vh">
        <v-col cols="12" sm="9" md="5">
          <v-card class="ia-card pa-10 text-center" elevation="0">
            <v-icon size="64" color="success" class="mb-4">mdi-check-circle-outline</v-icon>
            <h2 class="black--text text-h5 font-weight-700 mb-3">Submission Received</h2>
            <p class="text-body-1 mb-2" style="color:rgba(17,17,17,0.7)">
              Thank you, <strong class="black--text">{{ candidate ? candidate.name : '' }}</strong>!
            </p>
            <p class="text-body-2 mb-6" style="color:rgba(17,17,17,0.5)">
              Your Round 1 answers have been submitted successfully.<br>
              The interviewer will review your responses and reach out with next steps.
            </p>
            <v-divider class="ia-divider mb-6" />
            <div class="d-flex justify-center" style="gap:8px">
              <v-icon small color="secondary">mdi-identifier</v-icon>
              <span class="caption" style="color:#111111">
                {{ candidate ? `${candidate.collegeName} · Roll ${candidate.rollNumber}` : '' }}
              </span>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- ===== INVALID / EXPIRED LINK ===== -->
    <div v-else-if="phase === 'invalid'" class="r1-centered-wrap">
      <v-row align="center" justify="center" style="min-height:100vh">
        <v-col cols="12" sm="9" md="5">
          <v-card class="ia-card pa-10 text-center" elevation="0">
            <v-icon size="64" color="error" class="mb-4">mdi-calendar-remove-outline</v-icon>
            <h2 class="black--text text-h5 font-weight-700 mb-3">Assessment Not Available</h2>
            <p class="text-body-1 mb-2" style="color:rgba(17,17,17,0.7)">
              This assessment link is only active on its scheduled placement date.
            </p>
            <p class="text-body-2 mb-0" style="color:rgba(17,17,17,0.5)">
              Contact your Placement Coordinator for the Assessment link.
            </p>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Loading overlay -->
    <v-overlay v-if="initializing" opacity="0.9" color="#F7F7F8" z-index="200">
      <v-progress-circular indeterminate color="primary" size="48" />
    </v-overlay>
  </div>
</template>

<script>
import { firebaseService } from '@/services/firebaseService'
import { monitoringService } from '@/services/monitoringService'
import CodeEditor from '@/components/CodeEditor.vue'
import { RUNNER_URL } from '@/config'

export default {
  name: 'Round1',
  components: { CodeEditor },

  data() {
    return {
      phase: 'entry',      // entry | ready | assessment | done
      initializing: true,
      loading: false,
      submitting: false,

      org: null,
      drive: null,
      candidate: null,
      questions: [],
      orgSlug: '',
      driveId: '',

      // Entry form
      form: { name: '', department: '', collegeName: '', rollNumber: '' },
      regError: '',

      // Assessment state
      currentIndex: 0,        // index within the current section
      sectionIndex: 0,        // index into activeSections
      submittedSections: [],  // section keys already submitted (locked)
      selection: {},          // { sectionKey: [question objects] } — per-candidate random sample
      answers: {},            // { [questionId]: value }
      codeLangs: {},          // { [questionId]: runner language id } for coding questions
      langOptions: [
        { text: 'C', value: 'c' },
        { text: 'C++', value: 'cpp' },
        { text: 'Python', value: 'python' },
        { text: 'JavaScript', value: 'javascript' },
        { text: 'Java', value: 'java' },
      ],
      startTime: null,
      deadline: null,         // absolute ms timestamp when Round 1 ends
      auditEvents: [],        // collected locally until submit

      // Timer
      timerSeconds: 0,
      timerInterval: null,

      // UI
      confirmSectionDialog: false,

      // Code runner
      running: false,
      runResult: null,
    }
  },

  computed: {
    // Departments configured for this drive (admin-managed) → registration dropdown.
    departmentOptions() {
      return (this.drive && Array.isArray(this.drive.departments)) ? this.drive.departments.filter(Boolean) : []
    },
    // Sections that actually have selected questions, in fixed order.
    activeSections() {
      return firebaseService.sections.filter(s => (this.selection[s.key] || []).length > 0)
    },
    currentSection() {
      return this.activeSections[this.sectionIndex] || null
    },
    currentSectionKey() {
      return this.currentSection ? this.currentSection.key : null
    },
    currentSectionLabel() {
      return this.currentSection ? this.currentSection.label : ''
    },
    currentSectionQuestions() {
      return this.currentSectionKey ? (this.selection[this.currentSectionKey] || []) : []
    },
    currentQuestion() {
      return this.currentSectionQuestions[this.currentIndex] || null
    },
    isLastSection() {
      return this.sectionIndex >= this.activeSections.length - 1
    },
    nextSectionLabel() {
      const next = this.activeSections[this.sectionIndex + 1]
      return next ? next.label : ''
    },
    sectionAnsweredCount() {
      return this.currentSectionQuestions.filter(q => this.isAnswered(q)).length
    },
    timerUrgent() {
      return this.timerSeconds <= 300 // last 5 minutes
    },
    timerDisplay() {
      const secs = this.timerSeconds
      const m = Math.floor(secs / 60).toString().padStart(2, '0')
      const s = (secs % 60).toString().padStart(2, '0')
      return `${m}:${s}`
    },
    progressPct() {
      if (!this.currentSectionQuestions.length) return 0
      return ((this.currentIndex + 1) / this.currentSectionQuestions.length) * 100
    },
    // Planned per-section counts for the ready screen (min of configured count and available).
    sectionPlan() {
      const counts = (this.drive && this.drive.round1Counts) || { logical: 10, problem: 10, coding: 5 }
      return firebaseService.sections
        .map(s => {
          const avail = this.questions.filter(q => (q.section || 'logical') === s.key).length
          const target = counts[s.key] != null ? counts[s.key] : avail
          return { ...s, count: Math.min(avail, target) }
        })
        .filter(s => s.count > 0)
    },
    totalPlanned() {
      return this.sectionPlan.reduce((n, s) => n + s.count, 0)
    },
  },

  async mounted() {
    this.orgSlug = this.$route.params.orgSlug
    this.driveId = this.$route.params.driveId

    try {
      const [org, drive, questions] = await Promise.all([
        firebaseService.getOrg(this.orgSlug),
        firebaseService.getDrive(this.orgSlug, this.driveId),
        firebaseService.getRound1Questions(this.orgSlug, this.driveId),
      ])
      this.org = org
      this.drive = drive
      // Order questions by section (Logical → Problem Solving → Short Coding), then by order.
      const sectionOrder = { logical: 0, problem: 1, coding: 2 }
      this.questions = [...questions].sort((a, b) =>
        (sectionOrder[a.section || 'logical'] - sectionOrder[b.section || 'logical'])
        || ((a.order || 0) - (b.order || 0)))
      // College is fixed by the assessment link.
      this.form.collegeName = (org && org.name) || this.orgSlug

      // The link is only valid ON the drive's placement date.
      const today = new Date().toISOString().slice(0, 10)
      if (this.drive && this.drive.placementDate && today !== this.drive.placementDate) {
        this.phase = 'invalid'
        this.initializing = false
        return
      }

      // Pre-fill answers map with defaults
      questions.forEach(q => {
        if (q.type === 'mcq') {
          this.$set(this.answers, q.id, [])
        } else if (q.type === 'code') {
          this.$set(this.answers, q.id, q.starterCode || '')
          // Default the editor language to the question's suggested language.
          this.$set(this.codeLangs, q.id, firebaseService.runnerLang(q.language))
        } else {
          this.$set(this.answers, q.id, '')
        }
      })

      // ── Restore persisted session (survives refresh; no logout/re-entry) ──
      const session = this.loadSession()
      if (session && session.candidate) {
        this.candidate = session.candidate

        if (session.completed) {
          // Already submitted — permanently locked.
          this.phase = 'done'
        } else if (session.phase === 'assessment' && session.deadline) {
          // Resume timed assessment with the SAME sampled questions, answers & position.
          this.restoreSelection(session.selectionIds || {})
          if (session.answers) this.answers = { ...this.answers, ...session.answers }
          if (session.codeLangs) this.codeLangs = { ...this.codeLangs, ...session.codeLangs }
          this.submittedSections = session.submittedSections || []
          this.sectionIndex = session.sectionIndex || 0
          this.currentIndex = session.currentIndex || 0
          this.startTime = session.startTime
          this.deadline = session.deadline

          if (Date.now() >= this.deadline) {
            // Time already expired while away — auto-submit immediately.
            this.phase = 'assessment'
            this.$nextTick(() => this.finalize(true))
          } else {
            this.phase = 'assessment'
            this.tickTimer()
            this.$nextTick(() => {
              this.startTimer()
              monitoringService.start({ orgSlug: this.orgSlug, driveId: this.driveId, email: this.candidate.email, round: 1 })
            })
          }
        } else {
          // Registered but not yet started.
          this.phase = 'ready'
        }
      } else {
        this.phase = 'entry'
      }
    } catch (e) {
      console.error('Round1 init error', e)
    } finally {
      this.initializing = false
    }
  },

  watch: {
    answers: {
      deep: true,
      handler() {
        if (this.phase === 'assessment') this.saveSession()
      },
    },
    currentIndex() {
      this.runResult = null // clear run output when moving between questions
      if (this.phase === 'assessment') this.saveSession()
    },
  },

  beforeDestroy() {
    this.clearTimer()
    monitoringService.stop()
  },

  methods: {
    // ── Session persistence (survives refresh) ───────────────────────────────
    sessionKey() {
      return `ia_r1session_${this.orgSlug}__${this.driveId}`
    },
    loadSession() {
      try {
        const raw = localStorage.getItem(this.sessionKey())
        return raw ? JSON.parse(raw) : null
      } catch {
        return null
      }
    },
    saveSession(extra = {}) {
      // Persist selected question ids per section so a refresh serves the SAME questions.
      const selectionIds = {}
      Object.keys(this.selection).forEach(k => { selectionIds[k] = this.selection[k].map(q => q.id) })
      const session = {
        candidate: this.candidate,
        phase: this.phase,
        startTime: this.startTime,
        deadline: this.deadline,
        answers: this.answers,
        codeLangs: this.codeLangs,
        currentIndex: this.currentIndex,
        sectionIndex: this.sectionIndex,
        submittedSections: this.submittedSections,
        selectionIds,
        completed: false,
        ...extra,
      }
      localStorage.setItem(this.sessionKey(), JSON.stringify(session))
    },

    // Build a per-candidate random sample: N questions per section from the pool.
    buildSelection() {
      const counts = (this.drive && this.drive.round1Counts) || { logical: 10, problem: 10, coding: 5 }
      const sel = {}
      firebaseService.sections.forEach(s => {
        // Dedupe the pool so a candidate never gets two identical questions:
        // unique by id first, then by normalized question text.
        const pool = this.questions.filter(q => (q.section || 'logical') === s.key)
        const seenId = new Set()
        const seenText = new Set()
        const unique = []
        pool.forEach(q => {
          const idKey = q.id
          const textKey = String(q.text || '').trim().toLowerCase().replace(/\s+/g, ' ')
          if (seenId.has(idKey) || seenText.has(textKey)) return
          seenId.add(idKey)
          seenText.add(textKey)
          unique.push(q)
        })
        const shuffled = this.shuffle(unique)
        const take = counts[s.key] != null ? counts[s.key] : unique.length
        sel[s.key] = shuffled.slice(0, take)
      })
      this.selection = sel
    },
    // Rebuild the selection from stored ids (on refresh) so questions/order stay identical.
    restoreSelection(selectionIds) {
      const byId = {}
      this.questions.forEach(q => { byId[q.id] = q })
      const sel = {}
      firebaseService.sections.forEach(s => {
        sel[s.key] = (selectionIds[s.key] || []).map(id => byId[id]).filter(Boolean)
      })
      this.selection = sel
    },
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    },

    // ── Registration ────────────────────────────────────────────────────────
    async registerCandidate() {
      if (!this.$refs.entryForm.validate()) return
      this.loading = true
      this.regError = ''
      try {
        const candidate = await firebaseService.registerCandidate(this.orgSlug, this.driveId, {
          name: this.form.name.trim(),
          department: this.form.department.trim(),
          collegeName: this.form.collegeName.trim(),
          rollNumber: this.form.rollNumber.trim(),
          placementDate: this.drive?.placementDate || new Date().toISOString().slice(0, 10),
        })
        this.candidate = candidate
        this.phase = 'ready'
        this.saveSession()
      } catch (e) {
        console.error('Registration error', e)
        this.regError = e && e.message ? e.message : 'Could not register. Please try again or contact the invigilator.'
      } finally {
        this.loading = false
      }
    },

    // ── Start round ─────────────────────────────────────────────────────────
    async startRound() {
      this.loading = true
      // Mark started server-side so a second device with the same roll is blocked.
      firebaseService.markRound1Started(this.orgSlug, this.driveId, this.candidate.email)
      this.buildSelection()          // sample this candidate's random question set
      this.sectionIndex = 0
      this.currentIndex = 0
      this.submittedSections = []
      this.startTime = Date.now()
      this.deadline = this.startTime + (this.drive?.round1Timer || 45) * 60 * 1000
      this.phase = 'assessment'
      this.tickTimer()
      this.saveSession()
      this.loading = false
      this.$nextTick(() => this.startTimer())

      monitoringService.start({ orgSlug: this.orgSlug, driveId: this.driveId, email: this.candidate.email, round: 1 })
    },

    // ── Timer (driven by absolute deadline, robust across refresh) ────────────
    tickTimer() {
      this.timerSeconds = Math.max(0, Math.round((this.deadline - Date.now()) / 1000))
    },
    startTimer() {
      this.clearTimer()
      this.timerInterval = setInterval(() => {
        this.tickTimer()
        if (this.timerSeconds <= 0) {
          this.clearTimer()
          this.finalize(true) // auto-submit everything + lock immediately, no grace
        }
      }, 1000)
    },
    clearTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval)
        this.timerInterval = null
      }
    },

    // ── Navigation (within current section only) ─────────────────────────────
    prev() {
      if (this.currentIndex > 0) this.currentIndex--
    },
    next() {
      if (this.currentIndex < this.currentSectionQuestions.length - 1) this.currentIndex++
    },

    // ── Section submit / finalize ─────────────────────────────────────────────
    async submitSection() {
      if (this.submitting) return
      this.confirmSectionDialog = false

      if (this.isLastSection) {
        await this.finalize(false)
        return
      }

      this.submitting = true
      const key = this.currentSectionKey
      if (key && !this.submittedSections.includes(key)) this.submittedSections.push(key)
      await firebaseService.logAuditEvent(this.orgSlug, this.driveId, this.candidate.email, 1, {
        type: 'section_submit',
        section: key,
        answered: this.sectionAnsweredCount,
        total: this.currentSectionQuestions.length,
      })
      // Persist progress immediately so the section shows up for admins right away.
      const selectionIds = {}
      Object.keys(this.selection).forEach(k => { selectionIds[k] = this.selection[k].map(q => q.id) })
      await firebaseService.saveRound1Progress(this.orgSlug, this.driveId, this.candidate.email, {
        answers: { ...this.answers },
        codeLanguages: { ...this.codeLangs },
        selectionIds,
        submittedSections: [...this.submittedSections],
        startTime: this.startTime,
      })
      // Advance to the next section; locked out of the previous one.
      this.sectionIndex++
      this.currentIndex = 0
      this.saveSession()
      this.submitting = false
    },

    async finalize(autoSubmit = false) {
      if (this.submitting) return
      this.submitting = true
      this.confirmSectionDialog = false
      this.clearTimer()

      // Mark the section in progress as submitted too.
      if (this.currentSectionKey && !this.submittedSections.includes(this.currentSectionKey)) {
        this.submittedSections.push(this.currentSectionKey)
      }

      if (autoSubmit) {
        await firebaseService.logAuditEvent(this.orgSlug, this.driveId, this.candidate.email, 1, {
          type: 'auto_submit',
          reason: 'timer_expired',
        })
      }

      monitoringService.stop()
      const monitoringSummary = monitoringService.getSummary()

      const selectionIds = {}
      Object.keys(this.selection).forEach(k => { selectionIds[k] = this.selection[k].map(q => q.id) })

      try {
        await firebaseService.submitRound1(this.orgSlug, this.driveId, this.candidate.email, {
          answers: { ...this.answers },
          codeLanguages: { ...this.codeLangs },
          selectionIds,
          submittedSections: [...this.submittedSections],
          startTime: this.startTime,
          submitTime: Date.now(),
          auditEvents: this.auditEvents,
          monitoringSummary,
        })
        this.phase = 'done'
        // Permanently lock this session — no re-entry after submit/timeout.
        this.saveSession({ completed: true, phase: 'done' })
      } catch (e) {
        console.error('Submit error', e)
      } finally {
        this.submitting = false
      }
    },

    // ── Helpers ──────────────────────────────────────────────────────────────
    isAnswered(q) {
      const a = this.answers[q.id]
      if (q.type === 'mcq') return Array.isArray(a) && a.length > 0
      return !!a && a !== (q.starterCode || '')
    },

    // Map the question's language string to a Monaco language id.
    monacoLang(lang) {
      if (!lang) return 'plaintext'
      const m = {
        c: 'c', 'c++': 'cpp', cpp: 'cpp', 'c#': 'csharp', csharp: 'csharp',
        java: 'java', python: 'python', python3: 'python', py: 'python',
        javascript: 'javascript', js: 'javascript', node: 'javascript', nodejs: 'javascript',
        typescript: 'typescript', ts: 'typescript', go: 'go', golang: 'go',
        rust: 'rust', ruby: 'ruby', php: 'php', kotlin: 'kotlin', swift: 'swift', sql: 'sql',
      }
      return m[String(lang).trim().toLowerCase()] || 'plaintext'
    },
    onCodeInput(id, value) {
      this.$set(this.answers, id, value)
    },
    onLangChange(id, lang) {
      this.$set(this.codeLangs, id, lang)
      this.runResult = null
      if (this.phase === 'assessment') this.saveSession()
    },

    // Compile & run the candidate's code against this question's sample input.
    async runCode() {
      const q = this.currentQuestion
      if (!q || this.running) return
      const code = this.answers[q.id] || ''
      if (!code.trim()) { this.runResult = { error: 'Write some code first.' }; return }
      // Use the candidate's selected language (falls back to the question's).
      const language = this.codeLangs[q.id] || firebaseService.runnerLang(q.language)
      this.running = true
      this.runResult = null
      try {
        const resp = await fetch(`${RUNNER_URL}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language, code, stdin: q.sampleInput || '' }),
        })
        const data = await resp.json()
        if (data.error) {
          this.runResult = { error: data.error }
        } else {
          const matches = (data.stage === 'run' && !data.timedOut)
            ? String(data.stdout).trim() === String(q.sampleOutput || '').trim()
            : null
          this.runResult = { ...data, matches }
        }
        // Record the run for the admin audit/executions trail.
        firebaseService.logExecution(this.orgSlug, this.driveId, this.candidate.email, {
          code, language, timestamp: Date.now(),
        })
      } catch (e) {
        this.runResult = { error: 'Runner not reachable. Start it with: node runner/server.js' }
      } finally {
        this.running = false
      }
    },

  },
}
</script>

<style scoped>
/* ── Root & layout ─────────────────────────────────────────────────────────── */
.r1-root {
  min-height: 100vh;
  background: linear-gradient(160deg, #F7F7F8 0%, #FFFFFF 60%, #FFFFFF 100%);
  font-family: 'Inter', sans-serif;
}
.r1-centered-wrap {
  padding: 16px;
}

/* ── Brand ──────────────────────────────────────────────────────────────────── */
.brand-logo {
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: -0.5px;
}
.brand-ia { color: #111111; }
.brand-assess { color: #111111; }

/* ── Cards ──────────────────────────────────────────────────────────────────── */
.ia-card {
  background: #FFFFFF !important;
  border: 1px solid rgba(17, 17, 17, 0.2) !important;
  border-radius: 12px !important;
}
.ia-info-card {
  background: rgba(17, 17, 17, 0.06) !important;
  border: 1px solid rgba(17, 17, 17, 0.15) !important;
  border-radius: 8px !important;
}

/* ── Divider ─────────────────────────────────────────────────────────────────── */
.ia-divider {
  border-color: rgba(17, 17, 17, 0.15) !important;
}

/* ── Fields ──────────────────────────────────────────────────────────────────── */
.ia-field >>> .v-input__slot {
  background: rgba(17, 17, 17, 0.04) !important;
  border-color: rgba(17, 17, 17, 0.25) !important;
}
.ia-field >>> fieldset {
  border-color: rgba(17, 17, 17, 0.25) !important;
}
.ia-field >>> .v-label {
  color: rgba(17, 17, 17, 0.45) !important;
}

/* ── Buttons ─────────────────────────────────────────────────────────────────── */
.ia-btn {
  text-transform: none !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  border-radius: 8px !important;
}
.ia-btn-outline {
  text-transform: none !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  border-radius: 8px !important;
  border-color: rgba(17, 17, 17, 0.4) !important;
  color: rgba(17, 17, 17, 0.75) !important;
}

/* ── Instructions ──────────────────────────────────────────────────────────── */
.instruction-list {
  padding-left: 18px;
  line-height: 2;
}

/* ── Toolbar ─────────────────────────────────────────────────────────────────── */
.r1-toolbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--ia-border);
  padding: 0 24px;
  height: 58px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  font-size: 1.15rem;
  font-weight: 700;
}
.toolbar-org {
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(17,17,17,0.45);
  padding-left: 12px;
  border-left: 1px solid rgba(17,17,17,0.12);
}
.toolbar-center {
  font-size: 0.85rem;
  color: rgba(17,17,17,0.55);
  font-weight: 500;
}
.toolbar-qcount {
  background: rgba(17,17,17,0.12);
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(17,17,17,0.2);
}

/* ── Timer chip ──────────────────────────────────────────────────────────────── */
.timer-chip {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding: 4px 12px;
  border-radius: 20px;
  background: rgba(17,17,17,0.06);
  border: 1px solid rgba(17,17,17,0.1);
  color: rgba(17,17,17,0.8);
  transition: all 0.3s;
}
.timer-urgent {
  color: #FF5252 !important;
  border-color: rgba(255, 82, 82, 0.4) !important;
  background: rgba(255, 82, 82, 0.08) !important;
}
.timer-grace {
  color: #FF5252 !important;
  border-color: rgba(255, 82, 82, 0.5) !important;
  background: rgba(255, 82, 82, 0.1) !important;
  animation: pulse-red 1.2s ease-in-out infinite;
}
@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 82, 82, 0); }
  50% { box-shadow: 0 0 0 5px rgba(255, 82, 82, 0.15); }
}

/* ── Assessment content ──────────────────────────────────────────────────────── */
.r1-assessment-wrap {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.r1-content {
  flex: 1;
  padding: 32px 16px 48px;
}

/* ── Question elements ───────────────────────────────────────────────────────── */
.q-badge {
  min-width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(17, 17, 17, 0.15);
  border: 1.5px solid rgba(17, 17, 17, 0.4);
  color: #111111;
  font-weight: 700;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}
.q-type-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #111111;
  background: rgba(17, 17, 17, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(17, 17, 17, 0.2);
}
.q-section-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #111111;
  background: rgba(17, 17, 17, 0.12);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(17, 17, 17, 0.25);
}
.q-diff-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(17, 17, 17, 0.6);
  background: rgba(17, 17, 17, 0.06);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(17, 17, 17, 0.12);
}
/* ── Section stepper ──────────────────────────────────────────────────────── */
.r1-stepper {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  padding: 14px 16px 0;
}
.stepper-item {
  display: flex;
  align-items: center;
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(17, 17, 17, 0.4);
  background: rgba(17, 17, 17, 0.04);
  border: 1px solid rgba(17, 17, 17, 0.1);
  border-radius: 20px;
  padding: 5px 14px;
}
.stepper-item.stepper-active {
  color: #111111;
  border-color: rgba(17, 17, 17, 0.5);
  background: rgba(17, 17, 17, 0.12);
}
.stepper-item.stepper-done {
  color: #111111;
  border-color: rgba(17, 17, 17, 0.35);
  background: rgba(17, 17, 17, 0.08);
}
.section-pill {
  font-size: 0.8rem;
  color: rgba(17, 17, 17, 0.75);
  background: rgba(17, 17, 17, 0.1);
  border: 1px solid rgba(17, 17, 17, 0.2);
  border-radius: 20px;
  padding: 3px 12px;
}
.section-pill-count {
  color: #111111;
  font-weight: 700;
  margin-left: 4px;
}

/* ── Radio / Checkbox overrides ──────────────────────────────────────────────── */
.ia-radio >>> .v-label,
.ia-checkbox >>> .v-label {
  color: rgba(17, 17, 17, 0.8) !important;
  font-size: 0.9rem !important;
}

/* ── Code textarea ───────────────────────────────────────────────────────────── */
.ia-code-textarea {
  width: 100%;
  background: #F7F7F8;
  color: #E0E0E0;
  border: 1.5px solid rgba(17, 17, 17, 0.25);
  border-radius: 8px;
  padding: 14px 16px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.85rem;
  line-height: 1.7;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  tab-size: 2;
}
.ia-code-textarea:focus {
  border-color: rgba(17, 17, 17, 0.55);
}
.code-label {
  display: flex;
  align-items: center;
}
/* Language selector — match the rest of the UI's type scale */
.lang-select { font-family: 'Inter', sans-serif; }
.lang-select >>> .v-select__selection,
.lang-select >>> .v-select__selection--comma {
  font-size: 0.82rem;
  font-weight: 600;
  color: #111111;
}
.lang-select >>> input { font-size: 0.82rem; }
.lang-select >>> .v-input__slot { min-height: 36px !important; }
.lang-select >>> .v-input__append-inner { margin-top: 6px; }
.ia-editor-area {
  height: 380px;
  border: 1px solid rgba(17, 17, 17, 0.25);
  border-radius: 8px;
  overflow: hidden;
}
.run-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.8rem; font-weight: 600; }
.run-pass { color: #4caf50; }
.run-fail { color: #FF5252; }
.run-output {
  background: #F7F7F8;
  border: 1px solid rgba(17, 17, 17, 0.2);
  border-radius: 8px;
  padding: 12px 14px;
}
.run-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em; color: #111111; font-weight: 700; }
.run-err-label { color: #FF5252; }
.run-pre {
  margin: 4px 0 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.82rem;
  color: rgba(17, 17, 17, 0.88);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 180px;
  overflow: auto;
}
.run-pre.run-err { color: #ff8a80; }
.run-line { font-size: 0.85rem; }
.run-line.run-err { color: #ff8a80; }
.ia-editor-area >>> .code-editor-container {
  min-height: 380px;
  height: 380px;
}
.code-spec {
  background: rgba(17, 17, 17, 0.03);
  border: 1px solid rgba(17, 17, 17, 0.15);
  border-radius: 8px;
  padding: 14px 16px;
}
.spec-row { margin-bottom: 10px; }
.spec-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #111111;
}
.spec-pre {
  margin: 4px 0 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.82rem;
  color: rgba(17, 17, 17, 0.85);
  white-space: pre-wrap;
  word-break: break-word;
}
.spec-sample {
  background: rgba(0, 0, 0, 0.25);
  border-radius: 6px;
  padding: 8px 12px;
  flex: 1;
  min-width: 160px;
}

/* ── Question dot nav ────────────────────────────────────────────────────────── */
.q-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgba(17, 17, 17, 0.15);
  cursor: pointer;
  transition: all 0.2s;
}
.q-dot--active {
  background: #111111;
  transform: scale(1.3);
}
.q-dot--answered {
  background: rgba(17, 17, 17, 0.6);
}
.q-dot--active.q-dot--answered {
  background: #111111;
}

/* ── Ready meta row ──────────────────────────────────────────────────────────── */
.ready-meta > div {
  padding: 8px 20px;
}
</style>

<!-- Unscoped: the v-select dropdown menu renders in a portal outside this component -->
<style>
.lang-menu .v-list-item__title {
  font-family: 'Inter', sans-serif;
  font-size: 0.82rem;
  font-weight: 500;
  color: #111111;
}
.lang-menu .v-list-item { min-height: 34px; }
</style>

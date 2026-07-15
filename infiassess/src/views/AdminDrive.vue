<template>
  <div class="org-root">
    <!-- Top App Bar -->
    <v-app-bar app color="#FFFFFF" elevation="0" class="app-bar-border">
      <v-btn icon @click="$router.push(`/admin/org/${orgId}`)" class="back-btn">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <div class="brand-logo ml-2">
        <brand-logo />
      </div>
      <v-app-bar-title class="app-bar-title ml-4">
        <span class="breadcrumb-sep">/ </span>{{ org ? org.name : orgId }}
        <span class="breadcrumb-sep">/ </span>{{ drive ? drive.name : driveId }}
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

      <div v-else class="layout-wrapper">
        <!-- Sidebar -->
        <div class="sidebar">
          <div class="sidebar-header">
            <div class="sidebar-org-icon">
              <v-icon color="primary" size="20">mdi-office-building</v-icon>
            </div>
            <div class="sidebar-org-info ml-2">
              <div class="sidebar-org-name">{{ drive && drive.name }}</div>
              <div class="sidebar-org-slug">{{ org && org.name }}</div>
            </div>
          </div>
          <div class="sidebar-nav mt-4">
            <div
              v-for="tab in tabs"
              :key="tab.key"
              class="sidebar-nav-item"
              :class="{ active: activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              <v-icon small class="mr-3" :color="activeTab === tab.key ? '#111111' : 'rgba(17,17,17,0.45)'">
                {{ tab.icon }}
              </v-icon>
              <span>{{ tab.label }}</span>
              <v-chip
                v-if="tab.key === 'candidates' && candidates.length > 0"
                x-small
                class="ml-auto"
                color="rgba(17,17,17,0.15)"
                text-color="#111111"
              >{{ candidates.length }}</v-chip>
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="main-content">
          <!-- ======================== CANDIDATES TAB ======================== -->
          <div v-if="activeTab === 'candidates'">
            <div class="content-header">
              <h2 class="content-title">Candidates</h2>
              <p class="content-subtitle">{{ candidates.length }} registered candidate{{ candidates.length !== 1 ? 's' : '' }}</p>
            </div>

            <div v-if="candidates.length === 0" class="empty-state">
              <v-icon size="60" color="rgba(17,17,17,0.3)">mdi-account-group-outline</v-icon>
              <p class="empty-title mt-3">No candidates yet</p>
              <p class="empty-sub">Candidates will appear here once they register</p>
            </div>

            <div v-else class="table-wrapper">
              <v-data-table
                :headers="candidateHeaders"
                :items="candidates"
                class="ia-table"
                hide-default-footer
                :items-per-page="-1"
                no-data-text="No candidates"
              >
                <template #item.registeredAt="{ item }">
                  <span class="table-text-muted">{{ formatDate(item.registeredAt) }}</span>
                </template>
                <template #item.r1Status="{ item }">
                  <v-chip
                    x-small
                    :color="r1StatusChip(item).color"
                    :text-color="r1StatusChip(item).textColor"
                  >
                    {{ r1StatusChip(item).label }}
                  </v-chip>
                </template>
                <template #item.r1Score="{ item }">
                  <span v-if="item.round1Data && item.round1Score !== null" class="score-text">
                    {{ item.round1Score.marks }} / {{ item.round1Score.maxMarks }}
                  </span>
                  <span v-else class="table-text-muted">—</span>
                </template>
                <template #item.r1Time="{ item }">
                  <span v-if="item.round1Data && item.round1Data.startTime && item.round1Data.submitTime" class="table-text-muted">
                    {{ formatDuration(item.round1Data.submitTime - item.round1Data.startTime) }}
                  </span>
                  <span v-else class="table-text-muted">—</span>
                </template>
                <template #item.actions="{ item }">
                  <div class="d-flex align-center" style="gap:6px;">
                    <v-btn
                      x-small
                      color="primary"
                      class="action-btn"
                      @click="$router.push(`/admin/org/${orgId}/drive/${driveId}/candidate/${item.id}`)"
                    >View</v-btn>
                  </div>
                </template>
              </v-data-table>
            </div>
          </div>

          <!-- ======================== LEADERBOARD TAB ======================== -->
          <div v-if="activeTab === 'leaderboard'">
            <div class="content-header d-flex align-center justify-space-between">
              <div>
                <h2 class="content-title">Leaderboard</h2>
                <p class="content-subtitle">{{ leaderboard.length }} candidate{{ leaderboard.length !== 1 ? 's' : '' }} ranked by Round 1 score</p>
              </div>
              <div class="d-flex align-center" style="gap:10px">
                <v-btn color="primary" small class="action-top-btn" :loading="gradingAll" @click="gradeAllCoding">
                  <v-icon left small>mdi-code-braces-box</v-icon>
                  Grade all coding
                </v-btn>
                <v-btn outlined small class="action-top-btn" @click="leaderboardOrder = leaderboardOrder === 'desc' ? 'asc' : 'desc'">
                  <v-icon left small>{{ leaderboardOrder === 'desc' ? 'mdi-sort-descending' : 'mdi-sort-ascending' }}</v-icon>
                  {{ leaderboardOrder === 'desc' ? 'Highest first' : 'Lowest first' }}
                </v-btn>
              </div>
            </div>

            <div v-if="leaderboard.length === 0" class="empty-state">
              <v-icon size="60" color="rgba(17,17,17,0.3)">mdi-trophy-outline</v-icon>
              <p class="empty-title mt-3">No scored submissions yet</p>
              <p class="empty-sub">Candidates appear here once they submit Round 1.</p>
            </div>

            <div v-else class="table-wrapper">
              <table class="lb-table">
                <thead>
                  <tr>
                    <th style="width:60px">Rank</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Roll No</th>
                    <th style="width:120px">Score</th>
                    <th style="width:90px">%</th>
                    <th style="width:90px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in leaderboard" :key="c.id">
                    <td>
                      <span :class="['lb-rank', c.rank <= 3 && leaderboardOrder === 'desc' ? 'lb-rank-top' : '']">#{{ c.rank }}</span>
                    </td>
                    <td class="lb-name">{{ c.name }}</td>
                    <td class="lb-muted">{{ c.department || '—' }}</td>
                    <td class="lb-muted">{{ c.rollNumber || '—' }}</td>
                    <td><span class="lb-score">{{ c.score }}</span> <span class="lb-muted">/ {{ c.outOf }}</span></td>
                    <td class="lb-pct">{{ c.pct }}%</td>
                    <td>
                      <v-btn x-small color="primary" class="action-btn" @click="$router.push(`/admin/org/${orgId}/drive/${driveId}/candidate/${c.id}`)">View</v-btn>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- ======================== QUESTIONS TAB ======================== -->
          <div v-if="activeTab === 'questions'">
            <div class="content-header">
              <h2 class="content-title">Round 1 Questions</h2>
              <p class="content-subtitle">{{ questions.length }} question{{ questions.length !== 1 ? 's' : '' }} across 3 sections</p>
            </div>

            <!-- Candidate assessment link for this drive -->
            <div class="assess-link-card mb-5">
              <div class="d-flex align-center">
                <v-icon small color="secondary" class="mr-2">mdi-link-variant</v-icon>
                <span class="assess-link-label">Round 1 assessment link</span>
              </div>
              <div class="d-flex align-center mt-2">
                <code class="assess-link-url">{{ assessmentUrl }}</code>
                <v-btn icon small class="ml-2" @click="copyAssessmentUrl">
                  <v-icon small color="rgba(17,17,17,0.6)">mdi-content-copy</v-icon>
                </v-btn>
              </div>
            </div>

            <!-- Sections -->
            <div v-for="section in sections" :key="section.key" class="section-block mb-6">
              <div class="section-header d-flex align-center justify-space-between">
                <div class="d-flex align-center section-toggle" @click="toggleSection(section.key)">
                  <v-icon small class="mr-1" color="rgba(17,17,17,0.6)">
                    {{ isExpanded(section.key) ? 'mdi-chevron-down' : 'mdi-chevron-right' }}
                  </v-icon>
                  <span class="section-title">{{ section.label }}</span>
                  <v-chip x-small class="ml-3" color="rgba(17,17,17,0.15)" text-color="#111111">
                    {{ questionsBySection(section.key).length }}
                  </v-chip>
                </div>
                <div class="d-flex align-center" style="gap:8px">
                  <v-btn v-if="questionsBySection(section.key).length" outlined x-small color="error"
                    class="action-top-btn" @click="confirmDeleteSection(section.key)">
                    <v-icon left x-small>mdi-delete-sweep-outline</v-icon> Delete all
                  </v-btn>
                  <v-btn outlined x-small color="secondary" class="action-top-btn" @click="openJsonUpload(section.key)">
                    <v-icon left x-small>mdi-code-json</v-icon> Upload JSON
                  </v-btn>
                  <v-btn color="primary" x-small class="action-top-btn" @click="openAddQuestion(section.key)">
                    <v-icon left x-small>mdi-plus</v-icon> Add
                  </v-btn>
                </div>
              </div>

              <div v-show="isExpanded(section.key)">
              <div v-if="questionsBySection(section.key).length === 0" class="section-empty">
                No questions in this section yet — upload a JSON file or add one manually.
              </div>

              <div v-else class="question-list mt-2">
                <div v-for="(q, idx) in questionsBySection(section.key)" :key="q.id" class="question-item">
                  <div class="question-item-left">
                    <div class="question-order">{{ idx + 1 }}</div>
                    <div class="question-body ml-3">
                      <div class="question-text">{{ q.text }}</div>
                      <div class="question-meta mt-1">
                        <v-chip x-small :color="typeColor(q.type).bg" :text-color="typeColor(q.type).text" class="mr-2">
                          <v-icon left x-small>{{ typeIcon(q.type) }}</v-icon>
                          {{ q.type.toUpperCase() }}
                        </v-chip>
                        <span v-if="q.topic" class="meta-hint mr-2">{{ q.topic }}</span>
                        <span v-if="q.language" class="meta-hint mr-2">&bull; {{ q.language }}</span>
                        <!-- Correct answer / expected output shown to admin -->
                        <span v-if="q.type === 'single'" class="answer-hint">
                          <v-icon x-small color="#4caf50">mdi-check-circle-outline</v-icon>
                          Answer: {{ q.correctAnswer != null ? q.correctAnswer : '—' }}
                        </span>
                        <span v-else-if="q.type === 'mcq'" class="answer-hint">
                          <v-icon x-small color="#4caf50">mdi-check-circle-outline</v-icon>
                          Answer: {{ (q.correctAnswers && q.correctAnswers.length) ? q.correctAnswers.join(', ') : '—' }}
                        </span>
                        <span v-else-if="q.type === 'code' && q.sampleOutput" class="answer-hint">
                          <v-icon x-small color="#4caf50">mdi-check-circle-outline</v-icon>
                          Expected: {{ q.sampleOutput }}
                        </span>
                      </div>

                      <!-- Coding test cases (admin-only): shows visible vs hidden -->
                      <div v-if="q.type === 'code'" class="tc-block mt-2">
                        <template v-if="q.testCases && q.testCases.length">
                          <div class="tc-block-head">
                            <v-icon x-small>mdi-flask-outline</v-icon>
                            {{ q.testCases.length }} test case{{ q.testCases.length !== 1 ? 's' : '' }}
                            <span class="tc-dot tc-dot-vis">{{ visibleCount(q) }} visible</span>
                            <span class="tc-dot tc-dot-hid">{{ q.testCases.length - visibleCount(q) }} hidden</span>
                          </div>
                          <div v-for="(tc, ti) in q.testCases" :key="ti" class="tc-row">
                            <v-chip x-small class="tc-vis-chip"
                              :color="tc.visible ? 'rgba(22,163,74,0.12)' : 'rgba(17,17,17,0.06)'"
                              :text-color="tc.visible ? '#16A34A' : 'rgba(17,17,17,0.5)'">
                              <v-icon x-small left>{{ tc.visible ? 'mdi-eye-outline' : 'mdi-eye-off-outline' }}</v-icon>
                              {{ tc.visible ? 'Visible' : 'Hidden' }}
                            </v-chip>
                            <span class="tc-io"><span class="tc-io-lbl">in</span><code>{{ tc.input }}</code></span>
                            <span class="tc-io"><span class="tc-io-lbl">out</span><code>{{ tc.output }}</code></span>
                          </div>
                        </template>
                        <div v-else class="tc-empty">
                          <v-icon x-small color="#DC2626">mdi-alert-circle-outline</v-icon>
                          No test cases uploaded for this question
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="question-item-actions">
                    <v-btn icon x-small @click="editQuestionObj(q)">
                      <v-icon x-small color="primary">mdi-pencil</v-icon>
                    </v-btn>
                    <v-btn icon x-small @click="deleteQuestionObj(q)">
                      <v-icon x-small color="error">mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </div>
              </div>
              </div>
            </div>

            <!-- Saving indicator -->
            <div v-if="savingQuestions" class="d-flex align-center mt-3">
              <v-progress-circular indeterminate size="14" width="2" color="primary" class="mr-2" />
              <span class="saving-text">Saving...</span>
            </div>
          </div>

          <!-- ======================== ROUND 2 PROBLEM TAB ======================== -->
          <div v-if="activeTab === 'problem'">
            <div class="content-header d-flex align-center justify-space-between">
              <div>
                <h2 class="content-title">Round 2 Problem</h2>
                <p class="content-subtitle">Configure the coding challenge</p>
              </div>
              <v-btn color="primary" class="action-top-btn" :loading="savingProblem" @click="saveProblem">
                <v-icon left>mdi-content-save</v-icon>
                Save Problem
              </v-btn>
            </div>

            <div class="form-card">
              <v-text-field
                v-model="problem.title"
                label="Problem Title"
                outlined
                dense
                class="mb-4"
                prepend-inner-icon="mdi-format-title"
                hide-details="auto"
              />
              <v-textarea
                v-model="problem.description"
                label="Problem Description (Markdown supported)"
                outlined
                rows="10"
                class="mb-4 mono-textarea"
                prepend-inner-icon="mdi-text"
                hint="Supports Markdown formatting"
                persistent-hint
              />

              <div class="section-label mb-3">Starter Code per Language</div>
              <v-tabs v-model="problemLangTab" background-color="transparent" class="lang-tabs mb-3">
                <v-tab v-for="lang in problemLanguages" :key="lang.key" class="lang-tab">{{ lang.label }}</v-tab>
              </v-tabs>
              <v-tabs-items v-model="problemLangTab" dark>
                <v-tab-item v-for="lang in problemLanguages" :key="lang.key">
                  <v-textarea
                    v-model="problem.starterCode[lang.key]"
                    :placeholder="`// Starter code for ${lang.label}`"
                    outlined
                    rows="10"
                    class="mono-textarea"
                    hide-details
                  />
                </v-tab-item>
              </v-tabs-items>
            </div>
          </div>

          <!-- ======================== SETTINGS TAB ======================== -->
          <div v-if="activeTab === 'settings'">
            <div class="content-header d-flex align-center justify-space-between">
              <div>
                <h2 class="content-title">Settings</h2>
                <p class="content-subtitle">Configure organization settings</p>
              </div>
              <v-btn color="primary" class="action-top-btn" :loading="savingSettings" @click="saveSettings">
                <v-icon left>mdi-content-save</v-icon>
                Save Settings
              </v-btn>
            </div>

            <div v-if="settings" class="form-card">
              <v-text-field
                v-model="settings.name"
                label="Organization Name"
                outlined
                dense
                class="mb-4"
                prepend-inner-icon="mdi-office-building-outline"
                hide-details="auto"
              />
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.number="settings.round1Timer"
                    label="Round 1 Timer (minutes)"
                    outlined
                    dense
                    type="number"
                    min="1"
                    max="180"
                    prepend-inner-icon="mdi-timer-outline"
                    hide-details="auto"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.number="settings.round2Timer"
                    label="Round 2 Timer (minutes)"
                    outlined
                    dense
                    type="number"
                    min="1"
                    max="180"
                    prepend-inner-icon="mdi-timer-outline"
                    hide-details="auto"
                  />
                </v-col>
              </v-row>
              <v-text-field
                v-model="settings.placementDate"
                label="Placement Date"
                outlined
                dense
                type="date"
                class="mt-4"
                prepend-inner-icon="mdi-calendar-outline"
                hint="Used together with College + Roll Number to uniquely identify each candidate for this drive"
                persistent-hint
              />

              <div class="section-label mt-6 mb-1">Questions served per section (randomized per candidate)</div>
              <v-row v-if="settings.round1Counts">
                <v-col cols="12" sm="4">
                  <v-text-field v-model.number="settings.round1Counts.logical" label="Logical Reasoning" type="number" min="0" outlined dense hide-details="auto" />
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field v-model.number="settings.round1Counts.problem" label="Problem Solving" type="number" min="0" outlined dense hide-details="auto" />
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field v-model.number="settings.round1Counts.coding" label="Short Coding" type="number" min="0" outlined dense hide-details="auto" />
                </v-col>
              </v-row>
              <div class="toggle-row mt-4">
                <div class="toggle-info">
                  <div class="toggle-label">Round 1 Active</div>
                  <div class="toggle-desc">Allow candidates to access Round 1 assessment</div>
                </div>
                <v-switch v-model="settings.round1Active" color="primary" inset hide-details />
              </div>
              <div class="toggle-row mt-3">
                <div class="toggle-info">
                  <div class="toggle-label">Round 2 Active</div>
                  <div class="toggle-desc">Allow approved candidates to access Round 2 assessment</div>
                </div>
                <v-switch v-model="settings.round2Active" color="primary" inset hide-details />
              </div>
            </div>
          </div>
        </div>
      </div>
    </v-main>

    <!-- Question Dialog -->
    <v-dialog v-model="showQuestionForm" max-width="600" persistent>
      <v-card class="dialog-card">
        <v-card-title class="dialog-title pa-6 pb-2">
          <v-icon color="primary" class="mr-3">mdi-help-circle</v-icon>
          {{ editingId ? 'Edit Question' : 'Add Question' }} — {{ sectionLabel(questionDraft.section) }}
        </v-card-title>
        <v-card-text class="pa-6 pt-4">
          <v-form ref="questionForm" v-model="questionFormValid">
            <v-textarea
              v-model="questionDraft.text"
              label="Question Text"
              outlined
              rows="3"
              class="mb-3"
              :rules="[r => !!r || 'Required']"
              hide-details="auto"
            />
            <v-select
              v-model="questionDraft.type"
              :items="questionTypes"
              label="Question Type"
              outlined
              dense
              class="mb-3"
              :rules="[r => !!r || 'Required']"
              hide-details="auto"
            />
            <v-text-field
              v-model.number="questionDraft.order"
              label="Order"
              outlined
              dense
              type="number"
              class="mb-3"
              hide-details
            />

            <!-- Options for single / mcq -->
            <div v-if="questionDraft.type === 'single' || questionDraft.type === 'mcq'">
              <div class="section-label mb-2">Options</div>
              <div
                v-for="(opt, oi) in questionDraft.options"
                :key="oi"
                class="d-flex align-center mb-2"
              >
                <v-text-field
                  v-model="questionDraft.options[oi]"
                  :label="`Option ${oi + 1}`"
                  outlined
                  dense
                  hide-details
                  class="flex-grow-1"
                />
                <v-btn icon x-small class="ml-2" @click="removeOption(oi)" :disabled="questionDraft.options.length <= 2">
                  <v-icon x-small color="error">mdi-close</v-icon>
                </v-btn>
              </div>
              <v-btn text x-small color="primary" class="mb-4" @click="addOption">
                <v-icon left x-small>mdi-plus</v-icon> Add Option
              </v-btn>

              <!-- Single: pick one correct -->
              <div v-if="questionDraft.type === 'single'">
                <div class="section-label mb-2">Correct Answer</div>
                <v-radio-group v-model="questionDraft.correctAnswer" hide-details class="mt-0">
                  <v-radio
                    v-for="(opt, oi) in questionDraft.options"
                    :key="oi"
                    :label="opt || `Option ${oi + 1}`"
                    :value="oi"
                    color="primary"
                  />
                </v-radio-group>
              </div>

              <!-- MCQ: pick multiple -->
              <div v-if="questionDraft.type === 'mcq'">
                <div class="section-label mb-2">Correct Answers (select all that apply)</div>
                <div v-for="(opt, oi) in questionDraft.options" :key="oi">
                  <v-checkbox
                    v-model="questionDraft.correctAnswers"
                    :label="opt || `Option ${oi + 1}`"
                    :value="oi"
                    color="primary"
                    dense
                    hide-details
                    class="mt-1"
                  />
                </div>
              </div>
            </div>

            <!-- Starter code for code type -->
            <div v-if="questionDraft.type === 'code'">
              <div class="section-label mb-2">Starter Code</div>
              <v-textarea
                v-model="questionDraft.starterCode"
                outlined
                rows="5"
                class="mono-textarea"
                placeholder="// Write starter code here"
                hide-details
              />
            </div>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-6 pt-0">
          <v-spacer />
          <v-btn text class="cancel-btn mr-2" @click="closeQuestionForm">Cancel</v-btn>
          <v-btn color="primary" class="save-btn" :disabled="!questionFormValid" @click="saveQuestion">
            {{ editingId ? 'Save Changes' : 'Add Question' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- JSON Upload Dialog -->
    <v-dialog v-model="jsonUpload.show" max-width="680" persistent>
      <v-card class="dialog-card">
        <v-card-title class="dialog-title pa-6 pb-2">
          <v-icon color="secondary" class="mr-3">mdi-code-json</v-icon>
          Upload JSON — {{ jsonUpload.sectionLabel }}
        </v-card-title>
        <v-card-text class="pa-6 pt-4">
          <p class="text-body-2 mb-3" style="color:rgba(17,17,17,0.6)">
            Paste a JSON array of questions. Supported types: <code>single</code>, <code>mcq</code>, <code>text</code>, <code>code</code>.
            This <strong>replaces</strong> the <strong>{{ jsonUpload.sectionLabel }}</strong> questions for this drive.
          </p>
          <v-textarea
            v-model="jsonUpload.text"
            outlined rows="12"
            class="json-textarea"
            spellcheck="false"
            placeholder='[
  { "text": "What does HTTP stand for?", "type": "single",
    "options": ["HyperText Transfer Protocol", "..."], "correctAnswer": "HyperText Transfer Protocol" }
]'
            hide-details
            @input="jsonUpload.error = ''"
          />
          <v-alert v-if="jsonUpload.error" type="error" dense text class="mt-3 mb-0">
            {{ jsonUpload.error }}
          </v-alert>
          <v-alert v-else-if="jsonUpload.preview" type="success" dense text class="mt-3 mb-0">
            {{ jsonUpload.preview }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="pa-6 pt-0">
          <v-spacer />
          <v-btn text :disabled="jsonUpload.importing" @click="jsonUpload.show = false">Cancel</v-btn>
          <v-btn color="primary" :loading="jsonUpload.importing" @click="importQuestionsJson">
            <v-icon left>mdi-upload</v-icon> Import & Replace
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete-all confirmation -->
    <v-dialog v-model="deleteSection.show" max-width="440" persistent>
      <v-card class="pa-2">
        <v-card-title class="text-h6">Delete all questions?</v-card-title>
        <v-card-text>
          This permanently removes <strong>all {{ deleteSection.count }}</strong>
          question{{ deleteSection.count !== 1 ? 's' : '' }} (and their answer keys / test cases)
          from the <strong>{{ deleteSection.label }}</strong> section. This cannot be undone.
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn text :disabled="deleteSection.busy" @click="deleteSection.show = false">Cancel</v-btn>
          <v-btn color="error" depressed :loading="deleteSection.busy" @click="deleteAllInSection">
            <v-icon left>mdi-delete-sweep-outline</v-icon> Delete all
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Global blocking loader while writing to the database -->
    <v-overlay :value="savingQuestions || savingSettings" opacity="0.88" z-index="900" color="#F7F7F8">
      <div class="save-overlay text-center">
        <v-progress-circular indeterminate size="56" width="4" color="primary" />
        <div class="save-overlay-title mt-5">Saving to database…</div>
        <div class="save-overlay-sub mt-1">Please wait — don't close or leave this page.</div>
      </div>
    </v-overlay>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" bottom right timeout="3000">
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>

<script>
import { firebaseService } from '@/services/firebaseService'
import { RUNNER_URL, RUNNER_ADMIN_TOKEN } from '@/config'

export default {
  name: 'AdminDrive',
  data() {
    return {
      loading: true,
      orgId: this.$route.params.orgId,
      driveId: this.$route.params.driveId,
      org: null,
      drive: null,
      jsonUpload: { show: false, text: '', error: '', preview: null, section: 'logical', sectionLabel: '', importing: false },
      deleteSection: { show: false, section: null, label: '', count: 0, busy: false },
      expandedSections: { logical: true, problem: true, coding: true },
      candidates: [],
      questions: [],
      problem: { title: '', description: '', starterCode: {} },
      settings: null,
      activeTab: 'candidates',
      tabs: [
        { key: 'candidates', label: 'Candidates', icon: 'mdi-account-group' },
        { key: 'leaderboard', label: 'Leaderboard', icon: 'mdi-trophy-outline' },
        { key: 'questions', label: 'Questions', icon: 'mdi-help-circle' },
        { key: 'settings', label: 'Settings', icon: 'mdi-cog' },
      ],
      leaderboardOrder: 'desc',
      gradingAll: false,
      candidateHeaders: [
        { text: 'Name', value: 'name', sortable: true },
        { text: 'Department', value: 'department', sortable: true },
        { text: 'Roll No', value: 'rollNumber', sortable: true },
        { text: 'Registered', value: 'registeredAt', sortable: true },
        { text: 'R1 Status', value: 'r1Status', sortable: false },
        { text: 'R1 Score', value: 'r1Score', sortable: false },
        { text: 'R1 Time', value: 'r1Time', sortable: false },
        { text: 'Actions', value: 'actions', sortable: false, width: '120px' },
      ],
      // Questions
      showQuestionForm: false,
      questionFormValid: false,
      editingId: null,
      questionDraft: this.emptyQuestion(),
      questionTypes: [
        { text: 'Single Choice', value: 'single' },
        { text: 'Multiple Choice (MCQ)', value: 'mcq' },
        { text: 'Text Answer', value: 'text' },
        { text: 'Code', value: 'code' },
      ],
      savingQuestions: false,
      // Problem
      problemLangTab: 0,
      problemLanguages: [
        { key: 'python', label: 'Python' },
        { key: 'javascript', label: 'JavaScript' },
        { key: 'java', label: 'Java' },
        { key: 'cpp', label: 'C++' },
        { key: 'typescript', label: 'TypeScript' },
        { key: 'go', label: 'Go' },
      ],
      savingProblem: false,
      // Settings
      savingSettings: false,
      snackbar: { show: false, text: '', color: 'success' },
    }
  },
  computed: {
    sections() {
      return firebaseService.sections
    },
    assessmentUrl() {
      const origin = (typeof window !== 'undefined') ? window.location.origin : ''
      return `${origin}/assess/${this.orgId}/${this.driveId}/round1`
    },
    // Candidates who submitted Round 1, ranked by total marks (MCQ=1, coding=5).
    leaderboard() {
      const scored = this.candidates
        .filter(c => c.round1Status === 'submitted' && c.round1Score && c.round1Score.maxMarks > 0)
        .map(c => ({
          ...c,
          score: c.round1Score.marks,
          outOf: c.round1Score.maxMarks,
          pct: Math.round((c.round1Score.marks / c.round1Score.maxMarks) * 100),
        }))
      scored.sort((a, b) => this.leaderboardOrder === 'desc' ? (b.score - a.score) : (a.score - b.score))
      return scored.map((c, i) => ({ ...c, rank: i + 1 }))
    },
  },
  methods: {
    // ── Section helpers ───────────────────────────────────────────────────
    sectionLabel(key) {
      const s = this.sections.find(s => s.key === key)
      return s ? s.label : key
    },
    isExpanded(key) {
      return this.expandedSections[key] !== false
    },
    toggleSection(key) {
      this.$set(this.expandedSections, key, !this.isExpanded(key))
    },
    // Admin-authoritative coding grading core. Grades submitted candidates' code
    // against the real (admin-only) test cases via /batch, persists the score,
    // and recomputes their total in-memory (no full reload → no loop).
    //   pendingOnly: skip questions already graded (used by background auto-grade)
    async _runCodingGrading({ pendingOnly }) {
      const byId = {}
      this.questions.forEach(q => { byId[q.id] = q })
      const submitted = this.candidates.filter(c => c.round1Data && c.round1Data.answers)
      let graded = 0
      let runnerMissing = false
      const touched = new Set()
      for (const c of submitted) {
        const codingIds = (c.round1Data.selectionIds && c.round1Data.selectionIds.coding) || []
        for (const qid of codingIds) {
          const existing = (c.round1Data.codingGrades || {})[qid]
          if (pendingOnly && existing && existing.total) continue
          const q = byId[qid]
          if (!q || !(q.testCases && q.testCases.length)) continue
          const code = c.round1Data.answers[qid] || ''
          const lang = (c.round1Data.codeLanguages && c.round1Data.codeLanguages[qid]) || firebaseService.runnerLang(q.language)
          try {
            const res = await firebaseService.gradeCoding(RUNNER_URL, q, code, lang)
            if (res.results.some(r => r.error === 'Runner not reachable')) { runnerMissing = true; continue }
            const grade = { passed: res.passed, total: res.total }
            await firebaseService.saveCandidateCodingGrade(this.orgId, this.driveId, c.email, qid, grade)
            this.$set(c.round1Data, 'codingGrades', { ...(c.round1Data.codingGrades || {}), [qid]: grade })
            graded++; touched.add(c)
          } catch (e) { runnerMissing = true }
        }
      }
      touched.forEach(c => {
        const idx = this.candidates.indexOf(c)
        if (idx >= 0) this.$set(this.candidates, idx, { ...c, round1Score: firebaseService.gradeRound1(c.round1Data, this.questions) })
      })
      return { graded, runnerMissing }
    },
    // Manual "Grade all coding" button.
    async gradeAllCoding() {
      if (this.gradingAll) return
      this.gradingAll = true
      try {
        const { graded, runnerMissing } = await this._runCodingGrading({ pendingOnly: false })
        if (runnerMissing) {
          this.showSnackbar('Runner unreachable or missing test cases — re-save questions & ensure the runner is up', 'error')
        } else {
          this.showSnackbar(`Graded ${graded} coding answer${graded !== 1 ? 's' : ''}`, 'success')
        }
      } catch (e) {
        this.showSnackbar('Grading failed', 'error')
      } finally {
        this.gradingAll = false
      }
    },
    // Background auto-grade: runs on load (incl. realtime subscription after a
    // candidate submits) so coding marks appear without opening each candidate.
    async autoGradePendingCoding() {
      if (this.gradingAll) return
      this.gradingAll = true
      try { await this._runCodingGrading({ pendingOnly: true }) }
      catch (e) { /* silent — retries on next load */ }
      finally { this.gradingAll = false }
    },
    r1StatusChip(item) {
      if (item.round1Status === 'submitted') {
        return { label: 'Submitted', color: 'rgba(17,17,17,0.15)', textColor: '#111111' }
      }
      if (item.round1Status === 'in_progress' || (item.round1Data && item.round1Status !== 'submitted')) {
        return { label: 'In Progress', color: 'rgba(255,193,7,0.15)', textColor: '#FFC107' }
      }
      return { label: 'Pending', color: 'rgba(17,17,17,0.07)', textColor: 'rgba(17,17,17,0.45)' }
    },
    questionsBySection(key) {
      return this.questions
        .filter(q => (q.section || 'logical') === key)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
    },
    visibleCount(q) {
      return (q.testCases || []).filter(tc => tc.visible).length
    },
    // ── Bulk delete a whole section ───────────────────────────────────────
    confirmDeleteSection(section) {
      this.deleteSection = {
        show: true, section, label: this.sectionLabel(section),
        count: this.questionsBySection(section).length, busy: false,
      }
    },
    async deleteAllInSection() {
      const section = this.deleteSection.section
      this.deleteSection.busy = true
      try {
        this.questions = this.questions.filter(q => (q.section || 'logical') !== section)
        await this.persistQuestions()
        this.deleteSection.show = false
        this.showSnackbar(`Deleted all ${this.deleteSection.label} questions`, 'success')
      } catch (e) {
        this.showSnackbar(`Delete failed: ${e && e.message ? e.message : e}`, 'error')
      } finally {
        this.deleteSection.busy = false
      }
    },
    // ── JSON question upload (per section) ────────────────────────────────
    openJsonUpload(section) {
      this.jsonUpload = { show: true, text: '', error: '', preview: null, section, sectionLabel: this.sectionLabel(section), importing: false }
    },
    async importQuestionsJson() {
      let parsed
      try {
        parsed = JSON.parse(this.jsonUpload.text)
      } catch (e) {
        this.jsonUpload.error = `Invalid JSON: ${e.message}`
        return
      }
      let normalized
      try {
        normalized = firebaseService.normalizeQuestionsJson(parsed, this.jsonUpload.section)
      } catch (e) {
        this.jsonUpload.error = e.message
        return
      }
      // Replace only this section; keep the other sections intact.
      const others = this.questions.filter(q => (q.section || 'logical') !== this.jsonUpload.section)
      const label = this.jsonUpload.sectionLabel
      const count = normalized.length
      this.questions = [...others, ...normalized]
      this.jsonUpload.importing = true
      try {
        await this.persistQuestions()
        this.jsonUpload.show = false
        this.showSnackbar(`Imported ${count} question${count !== 1 ? 's' : ''} into ${label}`, 'success')
      } catch (e) {
        this.jsonUpload.error = `Save failed: ${e && e.message ? e.message : e}`
      } finally {
        this.jsonUpload.importing = false
      }
    },
    async copyAssessmentUrl() {
      try {
        await navigator.clipboard.writeText(this.assessmentUrl)
        this.showSnackbar('Assessment link copied', 'success')
      } catch {
        this.showSnackbar('Copy failed — select the link manually', 'error')
      }
    },
    emptyQuestion() {
      return {
        id: null,
        section: 'logical',
        text: '',
        type: 'single',
        options: ['', '', '', ''],
        correctAnswer: null,
        correctAnswers: [],
        starterCode: '',
        order: 1,
      }
    },
    async loadAll() {
      this.loading = true
      try {
        const [org, drive, rawCandidates, questions, problem] = await Promise.all([
          firebaseService.getOrg(this.orgId),
          firebaseService.getDrive(this.orgId, this.driveId),
          firebaseService.getDriveCandidates(this.orgId, this.driveId),
          firebaseService.getQuestionsWithAnswers(this.orgId, this.driveId),
          firebaseService.getDriveProblem(this.orgId, this.driveId),
        ])
        this.org = org || { id: this.orgId, name: this.orgId }
        this.drive = drive || { id: this.driveId, name: this.driveId, round1Timer: 45, round2Timer: 60, placementDate: new Date().toISOString().slice(0, 10), round1Active: true, round2Active: false }
        this.settings = { round1Counts: { logical: 10, problem: 10, coding: 5 }, ...this.drive }
        if (!this.settings.round1Counts) this.settings.round1Counts = { logical: 10, problem: 10, coding: 5 }
        this.questions = questions.sort((a, b) => (a.order || 0) - (b.order || 0))
        this.problem = { ...{ title: '', description: '', starterCode: {} }, ...problem }

        // Enrich candidates with round data (Firestore or localStorage)
        const enriched = []
        for (const c of rawCandidates) {
          const r1 = await firebaseService.getRound1Submission(this.orgId, this.driveId, c.email)
          let r1Score = null
          if (r1 && r1.answers && questions.length > 0) {
            const g = firebaseService.gradeRound1(r1, questions)
            r1Score = { correct: g.correct, total: g.total, marks: g.marks, maxMarks: g.maxMarks }
          }
          enriched.push({ ...c, round1Data: r1, round2Data: null, round1Score: r1Score })
        }
        this.candidates = enriched
      } catch (e) {
        console.error(e)
        this.showSnackbar('Failed to load data', 'error')
      } finally {
        this.loading = false
      }
      // Auto-grade any ungraded coding for submitted candidates (fires on load
      // and via the realtime subscription right after a candidate submits).
      this.autoGradePendingCoding()
    },
    openAddQuestion(section) {
      this.editingId = null
      this.questionDraft = this.emptyQuestion()
      this.questionDraft.section = section || 'logical'
      this.questionDraft.order = this.questionsBySection(this.questionDraft.section).length + 1
      this.showQuestionForm = true
    },
    editQuestionObj(q) {
      this.editingId = q.id
      this.questionDraft = {
        id: q.id,
        section: q.section || 'logical',
        text: q.text,
        type: q.type,
        options: q.options ? [...q.options] : ['', '', '', ''],
        correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : null,
        correctAnswers: q.correctAnswers ? [...q.correctAnswers] : [],
        starterCode: q.starterCode || '',
        order: q.order || 1,
      }
      this.showQuestionForm = true
    },
    closeQuestionForm() {
      this.showQuestionForm = false
      this.editingId = null
      this.questionDraft = this.emptyQuestion()
      this.$nextTick(() => { if (this.$refs.questionForm) this.$refs.questionForm.reset() })
    },
    addOption() {
      this.questionDraft.options.push('')
    },
    removeOption(idx) {
      this.questionDraft.options.splice(idx, 1)
      if (this.questionDraft.correctAnswer === idx) this.questionDraft.correctAnswer = null
      this.questionDraft.correctAnswers = this.questionDraft.correctAnswers.filter(i => i !== idx).map(i => i > idx ? i - 1 : i)
    },
    async saveQuestion() {
      if (!this.$refs.questionForm.validate()) return
      const idx = this.editingId ? this.questions.findIndex(x => x.id === this.editingId) : -1
      // Preserve fields the form doesn't edit (coding testCases, sampleInput/Output,
      // language, etc.) so editing a coding question never wipes its test cases.
      const existing = idx >= 0 ? this.questions[idx] : {}
      const q = {
        ...existing,
        id: this.questionDraft.id || existing.id || `q_${this.questionDraft.section}_${Date.now()}`,
        section: this.questionDraft.section || 'logical',
        text: this.questionDraft.text,
        type: this.questionDraft.type,
        order: this.questionDraft.order,
        ...((['single', 'mcq'].includes(this.questionDraft.type)) && {
          options: this.questionDraft.options.filter(o => o.trim() !== ''),
        }),
        ...(this.questionDraft.type === 'single' && { correctAnswer: this.questionDraft.correctAnswer }),
        ...(this.questionDraft.type === 'mcq' && { correctAnswers: this.questionDraft.correctAnswers }),
        ...(this.questionDraft.type === 'code' && { starterCode: this.questionDraft.starterCode }),
      }
      if (idx >= 0) {
        this.$set(this.questions, idx, q)
      } else {
        this.questions.push(q)
      }
      await this.persistQuestions()
      const wasEdit = idx >= 0
      this.closeQuestionForm()
      this.showSnackbar(wasEdit ? 'Question updated' : 'Question added', 'success')
    },
    async deleteQuestionObj(q) {
      this.questions = this.questions.filter(x => x.id !== q.id)
      await this.persistQuestions()
      this.showSnackbar('Question deleted', 'success')
    },
    async persistQuestions() {
      this.savingQuestions = true
      try {
        await firebaseService.saveDriveQuestions(this.orgId, this.driveId, this.questions)
        // Push coding test cases to the runner so it can grade candidate
        // submissions without the tests ever reaching the candidate's browser.
        await this.pushCodingTests()
      } finally {
        this.savingQuestions = false
      }
    },
    async pushCodingTests() {
      const coding = this.questions.filter(q => q.type === 'code' && Array.isArray(q.testCases) && q.testCases.length)
      for (const q of coding) {
        try {
          await firebaseService.pushTestsToRunner(RUNNER_URL, RUNNER_ADMIN_TOKEN, q.id, q.testCases)
        } catch (e) { /* runner may be down; admin can grade later / re-save */ }
      }
    },
    async saveProblem() {
      this.savingProblem = true
      try {
        await firebaseService.saveDriveProblem(this.orgId, this.driveId, this.problem)
        this.showSnackbar('Problem saved', 'success')
      } catch (e) {
        this.showSnackbar('Failed to save problem', 'error')
      } finally {
        this.savingProblem = false
      }
    },
    async saveSettings() {
      this.savingSettings = true
      try {
        await firebaseService.updateDrive(this.orgId, this.driveId, {
          name: this.settings.name,
          round1Timer: this.settings.round1Timer,
          round2Timer: this.settings.round2Timer,
          placementDate: this.settings.placementDate,
          round1Counts: this.settings.round1Counts,
          round1Active: this.settings.round1Active,
          round2Active: this.settings.round2Active,
        })
        this.drive = { ...this.drive, ...this.settings }
        this.showSnackbar('Settings saved', 'success')
      } catch (e) {
        this.showSnackbar('Failed to save settings', 'error')
      } finally {
        this.savingSettings = false
      }
    },
    typeColor(type) {
      const map = {
        single: { bg: 'rgba(17,17,17,0.15)', text: '#111111' },
        mcq: { bg: 'rgba(17,17,17,0.15)', text: '#111111' },
        text: { bg: 'rgba(255,183,77,0.15)', text: '#ffb74d' },
        code: { bg: 'rgba(76,175,80,0.15)', text: '#4caf50' },
      }
      return map[type] || map.text
    },
    typeIcon(type) {
      const map = { single: 'mdi-radiobox-marked', mcq: 'mdi-checkbox-multiple-marked', text: 'mdi-text', code: 'mdi-code-braces' }
      return map[type] || 'mdi-help'
    },
    formatDate(ts) {
      if (!ts) return '—'
      return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    },
    formatDuration(ms) {
      if (!ms || ms < 0) return '—'
      const m = Math.floor(ms / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      return `${m}m ${s}s`
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
    await this.loadAll()
    // Live refresh: when a candidate registers/submits, reload (debounced) so the
    // table, scores and leaderboard update without a manual refresh.
    let firstSnapshot = true
    this._unsub = firebaseService.subscribeCandidates(this.orgId, this.driveId, () => {
      if (firstSnapshot) { firstSnapshot = false; return } // initial load already done
      clearTimeout(this._reloadTimer)
      this._reloadTimer = setTimeout(() => { if (!this.gradingAll) this.loadAll() }, 800)
    })
  },
  beforeDestroy() {
    if (this._unsub) this._unsub()
    clearTimeout(this._reloadTimer)
  },
}
</script>

<style scoped>
.org-root {
  background: #F7F7F8;
  min-height: 100vh;
}
.app-bar-border {
  border-bottom: 1px solid rgba(17, 17, 17, 0.15) !important;
}
.brand-logo {
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: -0.5px;
  line-height: 1;
  flex-shrink: 0;
}
.brand-ia { color: #111111; }
.brand-assess { color: #111111; }
.app-bar-title {
  font-size: 0.9rem !important;
  color: rgba(17,17,17,0.55) !important;
  font-weight: 400 !important;
}
.breadcrumb-sep { color: rgba(17,17,17,0.25); }
.logout-btn {
  text-transform: none !important;
  font-weight: 600;
  letter-spacing: 0;
  color: rgba(17,17,17,0.6) !important;
}
.back-btn { color: rgba(17,17,17,0.6) !important; }
.org-main { background: #F7F7F8; }

/* Layout */
.layout-wrapper {
  display: flex;
  min-height: calc(100vh - 64px);
}
.sidebar {
  width: 240px;
  min-width: 240px;
  background: #FFFFFF;
  border-right: 1px solid rgba(17,17,17,0.12);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
}
.sidebar-header {
  display: flex;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(17,17,17,0.06);
}
.sidebar-org-icon {
  background: rgba(17,17,17,0.12);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sidebar-org-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: #111111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sidebar-org-slug {
  font-size: 0.72rem;
  color: rgba(17,17,17,0.35);
}
.sidebar-nav { display: flex; flex-direction: column; gap: 2px; }
.sidebar-nav-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.88rem;
  color: rgba(17,17,17,0.55);
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}
.sidebar-nav-item:hover {
  background: rgba(17,17,17,0.05);
  color: rgba(17,17,17,0.85);
}
.sidebar-nav-item.active {
  background: rgba(17,17,17,0.15);
  color: #111111;
  font-weight: 600;
}
/* Main Content */
.main-content {
  flex: 1;
  padding: 32px 40px;
  min-width: 0;
  overflow-y: auto;
}
.content-header { margin-bottom: 24px; }
.content-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111111;
  letter-spacing: -0.3px;
}
.content-subtitle {
  color: rgba(17,17,17,0.45);
  font-size: 0.88rem;
  margin: 4px 0 0;
}
.action-top-btn {
  text-transform: none !important;
  font-weight: 600;
  letter-spacing: 0;
  border-radius: 8px !important;
}
/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  text-align: center;
}
.empty-title {
  color: rgba(17,17,17,0.6);
  font-size: 1.1rem;
  font-weight: 600;
}
.empty-sub {
  color: rgba(17,17,17,0.35);
  font-size: 0.88rem;
}
/* Table */
.table-wrapper {
  background: #FFFFFF;
  border: 1px solid rgba(17,17,17,0.15);
  border-radius: 12px;
  overflow: hidden;
}
.ia-table {
  background: #FFFFFF !important;
}
.ia-table >>> .v-data-table__wrapper table tbody tr:nth-child(even) {
  background: rgba(17,17,17,0.02);
}
.ia-table >>> .v-data-table-header {
  background: rgba(17,17,17,0.06) !important;
}
.ia-table >>> .v-data-table-header th {
  color: rgba(17,17,17,0.55) !important;
  font-size: 0.78rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.05em !important;
  text-transform: uppercase !important;
}
.ia-table >>> td {
  color: rgba(17,17,17,0.85) !important;
  font-size: 0.88rem !important;
}
.table-text-muted { color: rgba(17,17,17,0.4) !important; font-size: 0.82rem; }
.score-text { color: #111111; font-weight: 600; font-size: 0.85rem; }
.action-btn {
  text-transform: none !important;
  font-weight: 600;
  letter-spacing: 0;
  border-radius: 5px !important;
}
/* Questions */
.question-list { display: flex; flex-direction: column; gap: 8px; }
.question-item {
  background: #FFFFFF;
  border: 1px solid rgba(17,17,17,0.12);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  align-items: flex-start;
  transition: border-color 0.15s;
}
.question-item:hover { border-color: rgba(17,17,17,0.3); }
.question-item-left { display: flex; align-items: flex-start; flex: 1; min-width: 0; }
.question-order {
  background: rgba(17,17,17,0.15);
  color: #111111;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  flex-shrink: 0;
}
.question-body { min-width: 0; flex: 1; }
.question-text {
  color: rgba(17,17,17,0.9);
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.question-meta { display: flex; align-items: center; }
.meta-hint { font-size: 0.75rem; color: rgba(17,17,17,0.35); }
.question-item-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  margin-left: 12px;
}
.saving-text { font-size: 0.8rem; color: rgba(17,17,17,0.45); }
/* Form Card */
.form-card {
  background: #FFFFFF;
  border: 1px solid rgba(17,17,17,0.15);
  border-radius: 12px;
  padding: 24px;
}
.section-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(17,17,17,0.5);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.mono-textarea >>> textarea {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace !important;
  font-size: 0.84rem !important;
}
.lang-tabs {
  border-bottom: 1px solid rgba(17,17,17,0.08);
}
.lang-tab {
  text-transform: none !important;
  font-weight: 600;
  letter-spacing: 0;
  font-size: 0.85rem;
}
/* Toggle Row */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-top: 1px solid rgba(17,17,17,0.06);
}
.toggle-label {
  font-weight: 600;
  color: rgba(17,17,17,0.85);
  font-size: 0.9rem;
}
.toggle-desc {
  font-size: 0.8rem;
  color: rgba(17,17,17,0.4);
  margin-top: 2px;
}
/* Dialogs */
.dialog-card {
  background: #FFFFFF !important;
  border: 1px solid rgba(17,17,17,0.2);
  border-radius: 12px !important;
}
.dialog-title {
  font-size: 1.1rem !important;
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
.save-btn {
  text-transform: none !important;
  font-weight: 600;
  letter-spacing: 0;
  border-radius: 8px !important;
}
.assess-link-card {
  background: rgba(17, 17, 17, 0.06);
  border: 1px solid rgba(17, 17, 17, 0.2);
  border-radius: 8px;
  padding: 14px 16px;
}
.assess-link-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #111111;
}
.assess-link-url {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  color: rgba(17, 17, 17, 0.8);
  background: rgba(0, 0, 0, 0.25);
  padding: 6px 10px;
  border-radius: 6px;
  word-break: break-all;
  flex: 1;
}
.json-textarea >>> textarea {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.82rem;
  line-height: 1.6;
}
.section-block {
  background: rgba(17, 17, 17, 0.02);
  border: 1px solid rgba(17, 17, 17, 0.15);
  border-radius: 10px;
  padding: 16px 18px;
}
.section-header { margin-bottom: 6px; }
.section-toggle { cursor: pointer; user-select: none; }
.section-title { color: #111111; font-weight: 700; font-size: 1rem; }
.answer-hint {
  font-size: 0.78rem;
  color: #4caf50;
  font-weight: 600;
}
/* Coding test-case display (admin) */
.tc-block { border-left: 2px solid rgba(17,17,17,0.08); padding-left: 10px; }
.tc-block-head {
  font-size: 0.72rem; font-weight: 700; color: rgba(17,17,17,0.55);
  display: flex; align-items: center; gap: 8px; margin-bottom: 4px;
}
.tc-dot { font-weight: 600; }
.tc-dot-vis { color: #16A34A; }
.tc-dot-hid { color: rgba(17,17,17,0.45); }
.tc-row {
  display: flex; align-items: center; gap: 10px;
  padding: 2px 0; font-size: 0.75rem; min-width: 0;
}
.tc-vis-chip { flex: 0 0 auto; }
.tc-io { display: inline-flex; align-items: baseline; gap: 5px; min-width: 0; overflow: hidden; }
.tc-io-lbl { color: rgba(17,17,17,0.4); font-weight: 600; }
.tc-io code {
  background: rgba(17,17,17,0.04); border-radius: 4px; padding: 1px 6px;
  font-size: 0.72rem; color: #111; white-space: pre; overflow-x: auto;
  max-width: 260px; display: inline-block; vertical-align: bottom;
}
.tc-empty { font-size: 0.75rem; color: #DC2626; font-weight: 600; display: flex; align-items: center; gap: 5px; }
.section-empty {
  color: rgba(17, 17, 17, 0.4);
  font-size: 0.85rem;
  padding: 12px 4px;
}
/* Leaderboard */
.lb-table { width: 100%; border-collapse: collapse; }
.lb-table th {
  text-align: left;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(17,17,17,0.4);
  font-weight: 700;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(17,17,17,0.15);
}
.lb-table td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(17,17,17,0.05);
  font-size: 0.88rem;
  color: rgba(17,17,17,0.85);
}
.lb-rank { font-weight: 700; color: rgba(17,17,17,0.55); }
.lb-rank-top { color: #FFD54F; }
.lb-name { font-weight: 600; color: #111111; }
.lb-muted { color: rgba(17,17,17,0.5); }
.lb-score { font-weight: 800; color: #4caf50; font-size: 1rem; }
.lb-pct { font-weight: 700; color: #111111; }
.save-overlay-title { color: #111111; font-size: 1.05rem; font-weight: 700; letter-spacing: -0.01em; }
.save-overlay-sub { color: rgba(17,17,17,0.55); font-size: 0.85rem; }
</style>

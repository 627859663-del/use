<template>
  <div ref="shellRef" class="forge-shell">
    <div class="forge-panel">
      <div class="forge-panel__glow"></div>

      <template v-if="collapsedAfterStart">
        <section class="completion-card">
          <div class="completion-card__eyebrow">创作已启动</div>
          <h1>首章已经写入聊天</h1>
          <p>后续直接在聊天框输入“下一章”或“继续”，模型会沿着当前大纲顺序续写。</p>
          <div class="completion-card__actions">
            <button class="ghost-btn" type="button" @click="collapsedAfterStart = false">重新展开面板</button>
          </div>
        </section>
      </template>

      <template v-else>
        <header class="forge-header">
          <div class="forge-header__title">
            <div class="eyebrow">CP同人故事生成器</div>
            <h1 class="forge-title">灵感熔炉</h1>
            <p class="forge-subtitle">从人设、世界观到章节连载，把创作资产都收进同一份世界书。</p>
          </div>

        </header>

        <nav class="main-tabs">
          <button
            v-for="(tab, index) in MAIN_TABS"
            :key="tab"
            class="main-tab"
            :class="{ active: uiState.mainTab === tab }"
            type="button"
            @click="uiState.mainTab = tab"
          >
            <span class="main-tab__index">{{ index + 1 }}</span>
            <span class="main-tab__label">{{ tab }}</span>
          </button>
        </nav>

        <main class="forge-body">
          <section v-if="fatalError" class="empty-state">
            <strong>界面启动失败</strong>
            <span>{{ fatalError }}</span>
            <button class="ghost-btn" type="button" @click="retryBootstrap">重新加载界面</button>
          </section>

          <section v-else-if="busy.catalog" class="empty-state">
            <strong>正在读取世界书…</strong>
            <span>当前工作世界书：{{ CP_FORGE_WORLDBOOK_NAME }}</span>
          </section>

          <template v-else>
            <section v-show="uiState.mainTab === '灵感注入'" class="panel-section">
              <div class="sub-tabs">
                <button
                  v-for="tab in INSPIRATION_TABS"
                  :key="tab"
                  class="sub-tab"
                  :class="{ active: uiState.inspirationTab === tab }"
                  type="button"
                  @click="uiState.inspirationTab = tab"
                >
                  {{ tab }}
                </button>
              </div>

              <div v-show="uiState.inspirationTab === '角色设定'" class="stack-section">
                <div class="character-switcher">
                  <span class="character-switcher__slider" :style="characterSliderStyle"></span>
                  <button
                    v-for="characterKey in CHARACTER_KEYS"
                    :key="characterKey"
                    class="character-switcher__btn"
                    :class="{ active: uiState.activeCharacter === characterKey }"
                    type="button"
                    @click="uiState.activeCharacter = characterKey"
                  >
                    {{ characterKey === 'roleA' ? '角色 A' : '角色 B' }}
                  </button>
                </div>

                <article class="character-card">
                  <div class="character-card__header">
                    <div>
                      <div class="section-kicker">{{ uiState.activeCharacter === 'roleA' ? '主角之一' : '主角之二' }}</div>
                      <h3>{{ uiState.activeCharacter === 'roleA' ? '角色 A 设定' : '角色 B 设定' }}</h3>
                    </div>
                    <div class="name-seal">
                      <span>姓名印记</span>
                      <strong>{{ activeCharacterFullName || '待命名' }}</strong>
                    </div>
                  </div>

                  <div class="form-grid">
                    <div class="field field--double field--name-row">
                      <span class="field-label field-label--inline name-row__label">姓名</span>
                      <select v-model="activeCharacter.nameStyle" class="name-row__style">
                        <option v-for="style in NAME_STYLES" :key="style" :value="style">{{ style }}</option>
                      </select>
                      <input v-model="activeCharacter.surname" class="name-row__surname" placeholder="姓氏" />
                      <input v-model="activeCharacter.givenName" class="name-row__given" placeholder="名字" />
                      <button
                        class="spark-btn name-row__spark"
                        :class="{ active: sparklingKey === uiState.activeCharacter + '-name' }"
                        type="button"
                        title="随机姓名"
                        aria-label="随机姓名"
                        @click="randomizeCharacterName(uiState.activeCharacter)"
                      >
                        ✦
                      </button>
                    </div>

                    <label class="field field--row">
                      <span class="field-label">出生日期</span>
                      <input v-model="activeCharacter.birthDate" placeholder="可填生日或年代" />
                    </label>

                    <label class="field field--row">
                      <span class="field-label">性别</span>
                      <input v-model="activeCharacter.gender" placeholder="如：男 / 女 / 非二元 / 自定义" />
                    </label>

                    <label class="field field--row">
                      <span class="field-label">当前实力等级</span>
                      <input v-model="activeCharacter.powerLevel" placeholder="选填" />
                    </label>

                    <div class="field field--double field--row-action">
                      <span class="field-label">整体意象</span>
                      <div class="field-action">
                        <input v-model="activeCharacter.imagery" placeholder="如：清冷疏离 / 温柔狡黠 / 矜贵克制" />
                        <button
                          class="spark-btn"
                          :class="{ active: sparklingKey === uiState.activeCharacter + '-imagery' }"
                          type="button"
                          title="随机整体意象"
                          aria-label="随机整体意象"
                          @click="randomizeImagery(uiState.activeCharacter)"
                        >
                          ✦
                        </button>
                      </div>
                    </div>

                    <label class="field field--row">
                      <span class="field-label">性格底色</span>
                      <input v-model="activeCharacter.personalityBase" placeholder="最深层的稳定倾向" />
                    </label>

                    <label class="field field--row">
                      <span class="field-label">性格主色</span>
                      <input v-model="activeCharacter.personalityMain" placeholder="最常显露出来的一面" />
                    </label>

                    <label class="field field--row">
                      <span class="field-label">性格点缀</span>
                      <input v-model="activeCharacter.personalityAccent" placeholder="细碎却关键的点缀" />
                    </label>
                  </div>

                  <div class="textarea-stack">
                    <label class="field">
                      <span class="field-label">背景故事</span>
                      <textarea v-model="activeCharacter.backgroundStory" rows="1" placeholder="成长经历、旧伤、未解心结"></textarea>
                    </label>

                    <label class="field">
                      <span class="field-label">外貌</span>
                      <textarea v-model="activeCharacter.appearance" rows="1" placeholder="体态、神情、衣着、给人的第一印象"></textarea>
                    </label>

                    <label class="field">
                      <span class="field-label">特质</span>
                      <textarea v-model="activeCharacter.traits" rows="1" placeholder="技能、习惯、癖好、危险点"></textarea>
                    </label>
                  </div>
                </article>
              </div>

              <div v-show="uiState.inspirationTab === '世界观'" class="stack-section">
                <div class="toolbar">
                  <label class="field">
                    <span class="field-label">已有世界观</span>
                    <select v-model="draftWorldviewSelectionId">
                      <option value="">未选择</option>
                      <option v-for="worldview in catalog.worldviews" :key="worldview.id" :value="worldview.id">
                        {{ worldview.title }}
                      </option>
                    </select>
                  </label>
                  <div class="toolbar__actions">
                    <button class="ghost-btn" type="button" @click="loadDraftWorldview">加载</button>
                    <button class="ghost-btn" type="button" @click="loadRandomStoredWorldview">随机已有</button>
                    <button class="ghost-btn" type="button" @click="startFreshWorldview">新建</button>
                  </div>
                </div>

                <div class="form-grid">
                  <label class="field">
                    <span class="field-label">世界观标题</span>
                    <input v-model="runtimeState.draft.worldviewTitle" placeholder="未填写时会自动按角色名生成标题" />
                  </label>
                  <label class="field field--wide">
                    <span class="field-label">当前引用</span>
                    <input :value="worldviewStatusText" readonly />
                  </label>
                </div>

                <label class="field">
                  <span class="field-label">世界观正文</span>
                  <textarea
                    v-model="runtimeState.draft.worldviewText"
                    rows="1"
                    placeholder="可直接粘贴完整设定，或在此手动编写你的世界规则、势力关系与时代背景。"
                  ></textarea>
                </label>
              </div>

              <div v-show="uiState.inspirationTab === '故事框架'" class="stack-section">
                <label class="field">
                  <span class="field-label">一句话大纲 / 剧情开头</span>
                  <div class="inline-textarea-actions">
                    <textarea
                      v-model="runtimeState.draft.storyFrame.opening"
                      rows="1"
                      placeholder="例如：重逢时，一个已经成了另一个必须追捕的目标。"
                    ></textarea>
                    <button
                      class="spark-btn spark-btn--block"
                      :class="{ active: sparklingKey === 'opening' }"
                      type="button"
                      title="随机剧情开头"
                      aria-label="随机剧情开头"
                      @click="randomizeOpening"
                    >
                      ✦
                    </button>
                  </div>
                </label>

                <div class="field">
                  <span class="field-label">结局要求</span>
                  <div class="segment-group">
                    <button
                      v-for="ending in ENDINGS"
                      :key="ending"
                      class="segment-btn"
                      :class="{ active: runtimeState.draft.storyFrame.ending === ending }"
                      type="button"
                      @click="runtimeState.draft.storyFrame.ending = ending"
                    >
                      {{ ending }}
                    </button>
                  </div>
                </div>

                <div class="field">
                  <span class="field-label">已选 Tags</span>
                  <div class="tag-well">
                    <button class="ghost-btn" type="button" @click="openTagPicker">选择 Tags</button>
                    <span v-if="runtimeState.draft.storyFrame.tags.length === 0" class="muted-text">尚未选择</span>
                    <span v-for="tag in runtimeState.draft.storyFrame.tags" :key="tag" class="pill">
                      {{ tag }}
                    </span>
                  </div>
                </div>
              </div>

              <div v-show="uiState.inspirationTab === 'Tags库'" class="stack-section tag-manager">
                <aside class="tag-manager__list">
                  <div class="section-kicker">世界书条目</div>
                  <button
                    v-for="(tag, index) in catalog.tags"
                    :key="tag"
                    class="tag-list-item"
                    :class="{ active: selectedTagIndex === index }"
                    type="button"
                    @click="selectTag(index)"
                  >
                    {{ tag }}
                  </button>
                  <div v-if="catalog.tags.length === 0" class="muted-text">当前还没有任何 Tag。</div>
                </aside>

                <div class="tag-manager__editor">
                  <label class="field">
                    <span class="field-label">Tag 内容</span>
                    <input v-model="tagInput" placeholder="输入新的 Tag 或修改当前 Tag" />
                  </label>
                  <div class="editor-actions">
                    <button class="primary-btn" type="button" :disabled="busy.tags" @click="addTag">新增</button>
                    <button class="ghost-btn" type="button" :disabled="selectedTagIndex === null || busy.tags" @click="updateTag">
                      保存修改
                    </button>
                    <button class="danger-btn" type="button" :disabled="selectedTagIndex === null || busy.tags" @click="removeTag">
                      删除
                    </button>
                  </div>
                  <p class="muted-text">这里修改的是世界书里的 Tags 库，故事框架页会实时读取这份数据。</p>
                </div>
              </div>

              <div class="section-storage section-storage--single">
                <label class="field" for="setting-set-select">
                  <span class="field-label">设定集</span>
                  <select id="setting-set-select" v-model="runtimeState.selectedSettingSetId" @change="handleSettingSetChange">
                    <option :value="null">未加载存档</option>
                    <option v-for="settingSet in catalog.settingSets" :key="settingSet.id" :value="settingSet.id">
                      {{ settingSet.title }}
                    </option>
                  </select>
                </label>
              </div>

            </section>

            <section v-show="uiState.mainTab === '方案抉择'" class="panel-section">
              <div class="toolbar">
                <label class="switcher">
                  <input v-model="uiState.favoritesOnly" type="checkbox" />
                  <span>仅看收藏</span>
                </label>
              </div>

              <div v-if="currentPageSchemes.length === 0" class="empty-state">
                <strong>{{ runtimeState.schemePages.length === 0 ? '还没有故事方案' : '这一页没有符合筛选的收藏方案' }}</strong>
                <span>选择一个设定集后点击“生成故事基础”，系统会一次生成 4 个可比较的故事方案。</span>
              </div>

              <div v-else class="scheme-grid">
                <article v-for="scheme in currentPageSchemes" :key="scheme.id" class="scheme-card" @click="openSchemeDetail(scheme.id)">
                  <button
                    class="star-btn"
                    :class="{ active: favoriteSchemeIds.has(scheme.id) }"
                    type="button"
                    @click.stop="toggleSchemeFavoriteState(scheme.id)"
                  >
                    ★
                  </button>
                  <div class="scheme-card__title">{{ scheme.title }}</div>
                  <div class="scheme-card__pairing">配对：{{ scheme.pairing }}</div>
                  <p class="scheme-card__summary">{{ truncateText(scheme.summary, 62) }}</p>
                  <div class="pill-row">
                    <span v-for="tag in scheme.tags" :key="tag" class="pill pill--soft">{{ tag }}</span>
                  </div>
                  <div class="scheme-card__meta">
                    总章节：{{ scheme.totalChapters }} | 字数/章：{{ scheme.wordsPerChapter }} | 结局：{{ scheme.ending }}
                  </div>
                  <button class="ghost-btn ghost-btn--wide" type="button" @click.stop="useSchemeAsBlueprint(scheme.id)">以此为蓝本</button>
                </article>
              </div>

              <div class="pagination">
                <button class="ghost-btn" type="button" :disabled="uiState.currentSchemePage <= 1" @click="uiState.currentSchemePage -= 1">
                  &lt; 上一页
                </button>
                <span>第 {{ Math.min(uiState.currentSchemePage, totalSchemePages) }} / {{ totalSchemePages }} 页</span>
                <button class="ghost-btn" type="button" :disabled="!currentSettingSet || busy.scheme" @click="goToNextSchemePage">
                  {{ uiState.currentSchemePage < totalSchemePages ? '下一页 >' : busy.scheme ? '生成中…' : '下一页 >' }}
                </button>
              </div>

              <div class="section-storage">
                <label class="field">
                  <span class="field-label">设定集</span>
                  <select v-model="runtimeState.selectedSettingSetId">
                    <option :value="null">请选择</option>
                    <option v-for="settingSet in catalog.settingSets" :key="settingSet.id" :value="settingSet.id">
                      {{ settingSet.title }}
                    </option>
                  </select>
                </label>
                <label class="field">
                  <span class="field-label">世界书已存方案</span>
                  <select v-model="runtimeState.selectedSchemeId" @change="jumpToSelectedScheme">
                    <option :value="null">未选择</option>
                    <option v-for="scheme in catalog.storySchemes" :key="scheme.id" :value="scheme.id">
                      {{ scheme.title }}
                    </option>
                  </select>
                </label>
              </div>
            </section>

            <section v-show="uiState.mainTab === '大纲审定'" class="panel-section">
              <div v-if="!runtimeState.outlineDraft" class="empty-state">
                <strong>还没有可编辑的大纲</strong>
                <span>先在“方案抉择”里选中一个故事基础，再回到这里生成章节蓝图。</span>
              </div>

              <template v-else>
                <div class="outline-summary">
                  <div>
                    <div class="section-kicker">当前大纲标题</div>
                    <h3>{{ runtimeState.outlineDraft.title }}</h3>
                  </div>
                  <div class="outline-summary__meta">
                    <span>{{ runtimeState.outlineDraft.pairing }}</span>
                    <span>{{ runtimeState.outlineDraft.ending }}</span>
                    <span>{{ runtimeState.outlineDraft.chapters.length }} 章</span>
                  </div>
                </div>

                <div class="outline-list">
                  <article v-for="chapter in runtimeState.outlineDraft.chapters" :key="chapter.index" class="outline-item">
                    <label class="field">
                      <span class="field-label">第 {{ chapter.index }} 章标题</span>
                      <input v-model="chapter.title" />
                    </label>
                    <label class="field">
                      <span class="field-label">章节简介</span>
                      <textarea v-model="chapter.summary" rows="1"></textarea>
                    </label>
                  </article>
                </div>
              </template>

              <div class="section-storage">
                <label class="field">
                  <span class="field-label">故事基础</span>
                  <select v-model="runtimeState.selectedSchemeId" @change="jumpToSelectedScheme">
                    <option :value="null">请选择</option>
                    <option v-for="scheme in catalog.storySchemes" :key="scheme.id" :value="scheme.id">
                      {{ scheme.title }}
                    </option>
                  </select>
                </label>
                <label class="field">
                  <span class="field-label">已存大纲</span>
                  <select v-model="runtimeState.selectedOutlineId" @change="loadSelectedOutline">
                    <option :value="null">未选择</option>
                    <option v-for="outline in catalog.storyOutlines" :key="outline.id" :value="outline.id">
                      {{ outline.title }}
                    </option>
                  </select>
                </label>
              </div>
            </section>

            <section v-show="uiState.mainTab === '最终生成'" class="panel-section">
              <div v-if="!finalOutline || !finalSettingSet" class="empty-state">
                <strong>尚未锁定最终大纲</strong>
                <span>在“大纲审定”里保存一份大纲后，这里会显示只读版本并允许直接开稿。</span>
              </div>

              <template v-else>
                <article class="launch-card">
                  <div class="launch-card__hero">
                    <div>
                      <div class="section-kicker">创作就绪</div>
                      <h3>{{ finalOutline.title }}</h3>
                    </div>
                    <div class="pill-row">
                      <span v-for="tag in finalOutline.tags" :key="tag" class="pill">{{ tag }}</span>
                    </div>
                  </div>

                  <div class="launch-card__meta">
                    <span>配对：{{ finalOutline.pairing }}</span>
                    <span>结局：{{ finalOutline.ending }}</span>
                    <span>章节：{{ finalOutline.chapters.length }}</span>
                  </div>

                  <p class="launch-card__world">{{ finalOutline.worldviewSummary || summarizeWorld(finalSettingSet.worldview.content) }}</p>

                  <div class="readonly-outline">
                    <article v-for="chapter in finalOutline.chapters" :key="chapter.index" class="readonly-outline__item">
                      <strong>第 {{ chapter.index }} 章：{{ chapter.title }}</strong>
                      <p>{{ chapter.summary }}</p>
                    </article>
                  </div>
                </article>
              </template>

              <div class="section-storage section-storage--single">
                <label class="field">
                  <span class="field-label">故事大纲</span>
                  <select v-model="runtimeState.finalOutlineId" @change="syncFinalOutline">
                    <option :value="null">请选择</option>
                    <option v-for="outline in catalog.storyOutlines" :key="outline.id" :value="outline.id">
                      {{ outline.title }}
                    </option>
                  </select>
                </label>
              </div>
            </section>
          </template>
        </main>

        <div v-if="showActionDock" class="action-dock">
          <div class="action-dock__inner">
            <div class="action-dock__copy">
              <div class="action-dock__eyebrow">当前阶段：{{ uiState.mainTab }}</div>
              <strong>{{ actionDock.title }}</strong>
              <span>{{ actionDock.caption }}</span>
            </div>
            <div class="action-dock__buttons">
              <button
                v-if="actionDock.secondaryLabel"
                class="ghost-btn"
                type="button"
                :disabled="actionDock.secondaryDisabled"
                @click="triggerSecondaryAction"
              >
                {{ actionDock.secondaryLabel }}
              </button>
              <button class="primary-btn primary-btn--dock" type="button" :disabled="actionDock.primaryDisabled" @click="triggerPrimaryAction">
                {{ actionDock.primaryLabel }}
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div v-if="schemeDetail" class="dialog-backdrop" @click.self="schemeDetailId = null">
      <div class="dialog-card">
        <div class="dialog-card__header">
          <div>
            <div class="section-kicker">完整方案</div>
            <h3>{{ schemeDetail.title }}</h3>
          </div>
          <button class="ghost-btn ghost-btn--icon" type="button" @click="schemeDetailId = null">×</button>
        </div>
        <p class="dialog-meta">配对：{{ schemeDetail.pairing }} | 结局：{{ schemeDetail.ending }}</p>
        <p class="dialog-body">{{ schemeDetail.summary }}</p>
        <div class="pill-row">
          <span v-for="tag in schemeDetail.tags" :key="tag" class="pill">{{ tag }}</span>
        </div>
        <div class="dialog-footer">
          <button class="ghost-btn" type="button" @click="toggleSchemeFavoriteState(schemeDetail.id)">
            {{ favoriteSchemeIds.has(schemeDetail.id) ? '取消收藏' : '加入收藏' }}
          </button>
          <button class="primary-btn" type="button" @click="useSchemeAsBlueprint(schemeDetail.id)">以此为蓝本</button>
        </div>
      </div>
    </div>

    <div v-if="showTagPicker" class="dialog-backdrop dialog-backdrop--sheet" @click.self="closeTagPicker">
      <div class="dialog-card dialog-card--sheet">
        <div class="dialog-card__header">
          <div>
            <div class="section-kicker">Tags 选择器</div>
            <h3>为故事框架挑选气质标签</h3>
          </div>
          <button class="ghost-btn ghost-btn--icon" type="button" @click="closeTagPicker">×</button>
        </div>
        <div class="tag-picker">
          <button
            v-for="tag in catalog.tags"
            :key="tag"
            class="picker-pill"
            :class="{ active: tagPickerSelection.includes(tag) }"
            type="button"
            @click="togglePickerTag(tag)"
          >
            {{ tag }}
          </button>
          <div v-if="catalog.tags.length === 0" class="muted-text">请先到「Tags库」新增一些标签。</div>
        </div>
        <div class="dialog-footer">
          <button class="ghost-btn" type="button" @click="closeTagPicker">取消</button>
          <button class="primary-btn" type="button" @click="confirmTagPicker">确认选择</button>
        </div>
      </div>
    </div>

    <div v-if="showSaveSettingChoice" class="dialog-backdrop" @click.self="showSaveSettingChoice = false">
      <div class="dialog-card dialog-card--compact">
        <div class="dialog-card__header">
          <div>
            <div class="section-kicker">设定集保存方式</div>
            <h3>当前草稿已经绑定旧设定集</h3>
          </div>
        </div>
        <p class="dialog-body">你可以替换当前设定集，也可以把修改后的内容另存成一个新的设定集。</p>
        <div class="dialog-footer dialog-footer--stack">
          <button class="primary-btn" type="button" @click="persistSettingSet('replace')">替换当前设定集</button>
          <button class="ghost-btn" type="button" @click="persistSettingSet('create')">另存为新设定集</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CHARACTER_KEYS,
  CP_FORGE_WORLDBOOK_NAME,
  ENDINGS,
  INSPIRATION_TABS,
  MAIN_TABS,
  NAME_STYLES,
  createDefaultDraft,
  createDefaultRuntimeState,
  createDefaultUiState,
  draftFromSettingSet,
  formatFullName,
  generateStoryOutline,
  generateStorySchemes,
  getChatRuntimeState,
  getChatUiState,
  loadCatalog,
  pickRandom,
  randomName,
  saveOutline,
  saveSettingSet,
  saveTags,
  setSelectedOutlineEnabled,
  setChatRuntimeState,
  setChatUiState,
  setSchemeFavorite,
  startStoryFromOutline,
  type CatalogSettingSet,
  type ForgeCatalog,
  type StoryOutline,
} from './forge';

function emptyCatalog(): ForgeCatalog {
  return {
    surnamePool: { 中式: [], 日式: [], 西式: [] },
    givenNamePool: { 中式: [], 日式: [], 西式: [] },
    imageryPool: [],
    openingPool: [],
    tags: [],
    worldviews: [],
    settingSets: [],
    storySchemes: [],
    storyOutlines: [],
  };
}

const uiState = reactive(getChatUiState() ?? createDefaultUiState());
const runtimeState = reactive(getChatRuntimeState() ?? createDefaultRuntimeState());
const catalog = ref<ForgeCatalog>(emptyCatalog());
const shellRef = ref<HTMLElement | null>(null);
const fatalError = ref<string | null>(null);

const busy = reactive({
  catalog: false,
  settingSet: false,
  scheme: false,
  outline: false,
  story: false,
  tags: false,
});

const showTagPicker = ref(false);
const showSaveSettingChoice = ref(false);
const schemeDetailId = ref<string | null>(null);
const draftWorldviewSelectionId = ref('');
const collapsedAfterStart = ref(false);
const sparklingKey = ref<string | null>(null);

const selectedTagIndex = ref<number | null>(null);
const tagInput = ref('');
const tagPickerSelection = ref<string[]>([]);
let sparkTimer: number | null = null;

const activeCharacter = computed({
  get: () => runtimeState.draft[uiState.activeCharacter],
  set: value => {
    runtimeState.draft[uiState.activeCharacter] = value;
  },
});

const activeCharacterFullName = computed(() => formatFullName(activeCharacter.value));
const characterSliderStyle = computed(() => ({
  transform: uiState.activeCharacter === 'roleA' ? 'translateX(0%)' : 'translateX(100%)',
}));
const favoriteSchemeIds = computed(
  () => new Set(catalog.value.storySchemes.filter(scheme => scheme.meta.favorite).map(scheme => scheme.id)),
);
const currentSettingSet = computed(
  () => catalog.value.settingSets.find(settingSet => settingSet.id === runtimeState.selectedSettingSetId) ?? null,
);
const currentSchemePage = computed(
  () => runtimeState.schemePages.find(page => page.pageNumber === uiState.currentSchemePage) ?? null,
);
const totalSchemePages = computed(() => Math.max(runtimeState.schemePages.length, 1));
const currentPageSchemes = computed(() => {
  const schemes = currentSchemePage.value?.schemes ?? [];
  return uiState.favoritesOnly ? schemes.filter(scheme => favoriteSchemeIds.value.has(scheme.id)) : schemes;
});
const currentScheme = computed(() => {
  if (!runtimeState.selectedSchemeId) {
    return null;
  }
  return (
    runtimeState.schemePages.flatMap(page => page.schemes).find(scheme => scheme.id === runtimeState.selectedSchemeId) ??
    catalog.value.storySchemes.find(scheme => scheme.id === runtimeState.selectedSchemeId) ??
    null
  );
});
const schemeDetail = computed(() =>
  schemeDetailId.value
    ? runtimeState.schemePages.flatMap(page => page.schemes).find(scheme => scheme.id === schemeDetailId.value) ??
      catalog.value.storySchemes.find(scheme => scheme.id === schemeDetailId.value) ??
      null
    : null,
);
const finalOutline = computed(() => {
  if (!runtimeState.finalOutlineId) {
    return null;
  }
  if (runtimeState.outlineDraft && runtimeState.outlineDraft.id === runtimeState.finalOutlineId) {
    return runtimeState.outlineDraft;
  }
  return catalog.value.storyOutlines.find(outline => outline.id === runtimeState.finalOutlineId) ?? null;
});
const finalSettingSet = computed(() => {
  if (!finalOutline.value) {
    return null;
  }
  return catalog.value.settingSets.find(settingSet => settingSet.id === finalOutline.value.sourceSettingSetId) ?? null;
});
const worldviewStatusText = computed(() => {
  if (!runtimeState.draft.worldviewText.trim()) {
    return '当前未载入或未填写世界观';
  }
  if (!runtimeState.draft.worldviewId) {
    return '当前是未存档世界观草稿';
  }
  return `${runtimeState.draft.worldviewTitle || '未命名世界观'}（已绑定）`;
});
const showActionDock = computed(
  () => !busy.catalog && !showTagPicker.value && !showSaveSettingChoice.value && !schemeDetail.value,
);
const actionDock = computed(() => {
  switch (uiState.mainTab) {
    case '灵感注入':
      return {
        title: '把当前草稿封装进世界书设定集',
        caption: '角色、世界观与故事框架会一起保存，方便后续反复调用。',
        primaryLabel: busy.settingSet ? '封存中…' : runtimeState.draft.loadedSettingSetId ? '更新或另存设定集' : '生成设定集',
        primaryDisabled: busy.settingSet,
        secondaryLabel: runtimeState.selectedSettingSetId ? '重新载入设定集' : '',
        secondaryDisabled: false,
      };
    case '方案抉择':
      return {
        title: currentSettingSet.value ? '继续筛选最适合开写的故事方向' : '先挑选一个设定集，再开始生成故事基础',
        caption:
          runtimeState.schemePages.length === 0
            ? '一次会生成 4 个方向，你可以收藏、翻页或直接选中一个作为蓝本。'
            : uiState.currentSchemePage < totalSchemePages.value
              ? '当前操作会翻到下一页历史方案。'
              : '当前操作会向后追加新的一页方案，旧页面会完整保留。',
        primaryLabel: busy.scheme
          ? '生成中…'
          : runtimeState.schemePages.length === 0
            ? '生成故事基础'
            : uiState.currentSchemePage < totalSchemePages.value
              ? '查看下一页方案'
              : '继续生成新方案',
        primaryDisabled: !currentSettingSet.value || busy.scheme,
        secondaryLabel: uiState.currentSchemePage > 1 ? '回上一页' : '',
        secondaryDisabled: uiState.currentSchemePage <= 1,
      };
    case '大纲审定':
      return runtimeState.outlineDraft
        ? {
            title: '审定完成后，把章节蓝图写回世界书',
            caption: '保存成功后会直接进入最终生成阶段，随时可以再回来修改。',
            primaryLabel: busy.outline ? '保存中…' : '保存故事大纲',
            primaryDisabled: busy.outline,
            secondaryLabel: currentScheme.value ? '重新生成大纲' : '',
            secondaryDisabled: !currentScheme.value || busy.outline,
          }
        : {
            title: currentScheme.value ? '为当前故事基础拆出章节蓝图' : '先在上一阶段选定一个故事基础',
            caption: '生成后可以逐章细修标题与简介，再决定是否保存。',
            primaryLabel: busy.outline ? '生成中…' : '生成故事大纲',
            primaryDisabled: !currentScheme.value || busy.outline,
            secondaryLabel: '',
            secondaryDisabled: true,
          };
    case '最终生成':
      return {
        title: finalOutline.value ? '开稿后首章会直接写入聊天' : '先锁定一份已保存的大纲，再开始创作',
        caption: '之后只要你在聊天里输入“下一章”或“继续”，就会沿同一份大纲续写。',
        primaryLabel: busy.story ? '正在创作首章…' : '开始创作！',
        primaryDisabled: !finalOutline.value || !finalSettingSet.value || busy.story,
        secondaryLabel: '',
        secondaryDisabled: true,
      };
  }
});

function truncateText(text: string, length: number) {
  return _.truncate(text, { length, omission: '...' });
}

function summarizeWorld(text: string) {
  return truncateText(text.replace(/\s+/gu, ' ').trim(), 120);
}

function pulseSpark(key: string) {
  sparklingKey.value = key;
  if (sparkTimer !== null) {
    window.clearTimeout(sparkTimer);
  }
  sparkTimer = window.setTimeout(() => {
    sparklingKey.value = null;
    sparkTimer = null;
  }, 640);
}

async function refreshCatalog() {
  busy.catalog = true;
  try {
    catalog.value = await loadCatalog();

    if (runtimeState.selectedSettingSetId && !catalog.value.settingSets.some(item => item.id === runtimeState.selectedSettingSetId)) {
      runtimeState.selectedSettingSetId = null;
    }
    if (runtimeState.selectedSchemeId && !catalog.value.storySchemes.some(item => item.id === runtimeState.selectedSchemeId)) {
      runtimeState.selectedSchemeId = null;
    }
    if (runtimeState.selectedOutlineId && !catalog.value.storyOutlines.some(item => item.id === runtimeState.selectedOutlineId)) {
      runtimeState.selectedOutlineId = null;
    }
    if (runtimeState.finalOutlineId && !catalog.value.storyOutlines.some(item => item.id === runtimeState.finalOutlineId)) {
      runtimeState.finalOutlineId = null;
    }

    if (selectedTagIndex.value !== null && !catalog.value.tags[selectedTagIndex.value]) {
      selectedTagIndex.value = null;
      tagInput.value = '';
    }
  } finally {
    busy.catalog = false;
  }
}

function resetDownstreamState() {
  runtimeState.schemePages = [];
  runtimeState.selectedSchemeId = null;
  runtimeState.selectedOutlineId = null;
  runtimeState.finalOutlineId = null;
  runtimeState.outlineDraft = null;
  uiState.currentSchemePage = 1;
  uiState.favoritesOnly = false;
}

function applySettingSet(settingSet: CatalogSettingSet) {
  runtimeState.draft = draftFromSettingSet(settingSet);
  runtimeState.selectedSettingSetId = settingSet.id;
  draftWorldviewSelectionId.value = runtimeState.draft.worldviewId ?? '';
  resetDownstreamState();
  toastr.success(`已加载设定集：${settingSet.title}`);
}

async function bootstrap() {
  fatalError.value = null;
  try {
    if (!runtimeState.draft) {
      runtimeState.draft = createDefaultDraft();
    }
    await refreshCatalog();

    if (runtimeState.selectedSettingSetId) {
      const selected = catalog.value.settingSets.find(item => item.id === runtimeState.selectedSettingSetId);
      if (selected && !runtimeState.draft.loadedSettingSetId) {
        runtimeState.draft = draftFromSettingSet(selected);
      }
    }

    if (runtimeState.draft.worldviewId) {
      draftWorldviewSelectionId.value = runtimeState.draft.worldviewId;
    }

    if (runtimeState.finalOutlineId) {
      await setSelectedOutlineEnabled(runtimeState.finalOutlineId);
    }
  } catch (error) {
    console.error(error);
    fatalError.value = error instanceof Error ? error.message : String(error);
  }
}

function retryBootstrap() {
  void bootstrap();
}

function selectTag(index: number) {
  selectedTagIndex.value = index;
  tagInput.value = catalog.value.tags[index] ?? '';
}

async function addTag() {
  const nextTag = tagInput.value.trim();
  if (!nextTag) {
    toastr.warning('请先输入一个 Tag');
    return;
  }
  if (catalog.value.tags.includes(nextTag)) {
    toastr.info('这个 Tag 已经存在');
    return;
  }

  busy.tags = true;
  try {
    await saveTags([...catalog.value.tags, nextTag]);
    await refreshCatalog();
    const nextIndex = catalog.value.tags.findIndex(tag => tag === nextTag);
    if (nextIndex >= 0) {
      selectTag(nextIndex);
    }
    toastr.success('Tag 已加入世界书');
  } catch (error) {
    console.error(error);
    toastr.error(error instanceof Error ? error.message : String(error), '新增 Tag 失败');
  } finally {
    busy.tags = false;
  }
}

async function updateTag() {
  if (selectedTagIndex.value === null) {
    toastr.warning('请先在左侧选中一个 Tag');
    return;
  }

  const nextTag = tagInput.value.trim();
  if (!nextTag) {
    toastr.warning('Tag 不能为空');
    return;
  }

  if (catalog.value.tags.some((tag, index) => tag === nextTag && index !== selectedTagIndex.value)) {
    toastr.info('已有同名 Tag');
    return;
  }

  busy.tags = true;
  try {
    const nextTags = [...catalog.value.tags];
    nextTags[selectedTagIndex.value] = nextTag;
    await saveTags(nextTags);
    await refreshCatalog();
    const nextIndex = catalog.value.tags.findIndex(tag => tag === nextTag);
    if (nextIndex >= 0) {
      selectTag(nextIndex);
    }
    toastr.success('Tag 已更新');
  } catch (error) {
    console.error(error);
    toastr.error(error instanceof Error ? error.message : String(error), '保存 Tag 失败');
  } finally {
    busy.tags = false;
  }
}

async function removeTag() {
  if (selectedTagIndex.value === null) {
    return;
  }
  busy.tags = true;
  try {
    const removed = catalog.value.tags[selectedTagIndex.value];
    await saveTags(catalog.value.tags.filter((_tag, index) => index !== selectedTagIndex.value));
    runtimeState.draft.storyFrame.tags = runtimeState.draft.storyFrame.tags.filter(tag => tag !== removed);
    selectedTagIndex.value = null;
    tagInput.value = '';
    await refreshCatalog();
    toastr.success('Tag 已删除');
  } catch (error) {
    console.error(error);
    toastr.error(error instanceof Error ? error.message : String(error), '删除 Tag 失败');
  } finally {
    busy.tags = false;
  }
}

function randomizeCharacterName(characterKey: 'roleA' | 'roleB') {
  const character = runtimeState.draft[characterKey];
  character.surname = randomName(catalog.value.surnamePool, character.nameStyle);
  character.givenName = randomName(catalog.value.givenNamePool, character.nameStyle);
  pulseSpark(`${characterKey}-name`);
}

function randomizeImagery(characterKey: 'roleA' | 'roleB') {
  const imagery = pickRandom(catalog.value.imageryPool);
  if (!imagery) {
    toastr.warning('世界书里的整体意象词库为空');
    return;
  }
  runtimeState.draft[characterKey].imagery = imagery;
  pulseSpark(`${characterKey}-imagery`);
}

function randomizeOpening() {
  const opening = pickRandom(catalog.value.openingPool);
  if (!opening) {
    toastr.warning('世界书里的剧情开头词库为空');
    return;
  }
  runtimeState.draft.storyFrame.opening = opening;
  pulseSpark('opening');
}

function startFreshWorldview() {
  runtimeState.draft.worldviewId = null;
  runtimeState.draft.worldviewTitle = '';
  runtimeState.draft.worldviewText = '';
  draftWorldviewSelectionId.value = '';
}

function loadDraftWorldview() {
  const worldview = catalog.value.worldviews.find(item => item.id === draftWorldviewSelectionId.value);
  if (!worldview) {
    toastr.info('没有选中可加载的世界观');
    return;
  }
  runtimeState.draft.worldviewId = worldview.id;
  runtimeState.draft.worldviewTitle = worldview.title;
  runtimeState.draft.worldviewText = worldview.content;
}

function loadRandomStoredWorldview() {
  const worldview = pickRandom(catalog.value.worldviews);
  if (!worldview) {
    toastr.info('当前世界书里还没有存档世界观');
    return;
  }
  draftWorldviewSelectionId.value = worldview.id;
  loadDraftWorldview();
}

function openTagPicker() {
  tagPickerSelection.value = [...runtimeState.draft.storyFrame.tags];
  showTagPicker.value = true;
}

function closeTagPicker() {
  showTagPicker.value = false;
}

function togglePickerTag(tag: string) {
  if (tagPickerSelection.value.includes(tag)) {
    tagPickerSelection.value = tagPickerSelection.value.filter(item => item !== tag);
    return;
  }
  tagPickerSelection.value = [...tagPickerSelection.value, tag];
}

function confirmTagPicker() {
  runtimeState.draft.storyFrame.tags = _.uniq(tagPickerSelection.value);
  showTagPicker.value = false;
}

function requestSaveSettingSet() {
  if (runtimeState.draft.loadedSettingSetId) {
    showSaveSettingChoice.value = true;
    return;
  }
  void persistSettingSet('create');
}

function triggerPrimaryAction() {
  switch (uiState.mainTab) {
    case '灵感注入':
      requestSaveSettingSet();
      return;
    case '方案抉择':
      if (runtimeState.schemePages.length === 0) {
        generateInitialSchemes();
        return;
      }
      goToNextSchemePage();
      return;
    case '大纲审定':
      if (runtimeState.outlineDraft) {
        void saveCurrentOutline();
        return;
      }
      void generateOutlineForCurrentScheme();
      return;
    case '最终生成':
      void launchStory();
      return;
  }
}

function triggerSecondaryAction() {
  switch (uiState.mainTab) {
    case '灵感注入':
      handleSettingSetChange();
      return;
    case '方案抉择':
      if (uiState.currentSchemePage > 1) {
        uiState.currentSchemePage -= 1;
      }
      return;
    case '大纲审定':
      if (currentScheme.value) {
        void generateOutlineForCurrentScheme();
      }
      return;
    case '最终生成':
      return;
  }
}

async function persistSettingSet(mode: 'create' | 'replace') {
  showSaveSettingChoice.value = false;
  busy.settingSet = true;
  try {
    const saved = await saveSettingSet(klona(runtimeState.draft), mode);
    runtimeState.draft = draftFromSettingSet(saved);
    runtimeState.selectedSettingSetId = saved.id;
    draftWorldviewSelectionId.value = saved.worldview.id ?? '';
    resetDownstreamState();
    await refreshCatalog();
    toastr.success(mode === 'replace' ? '设定集已替换' : '设定集已写入世界书');
  } catch (error) {
    console.error(error);
    toastr.error(error instanceof Error ? error.message : String(error), '保存设定集失败');
  } finally {
    busy.settingSet = false;
  }
}

function handleSettingSetChange() {
  const selected = catalog.value.settingSets.find(item => item.id === runtimeState.selectedSettingSetId);
  if (!selected) {
    return;
  }
  applySettingSet(selected);
}

async function generateSchemeBatch(append: boolean) {
  if (!currentSettingSet.value) {
    toastr.warning('请先选择一个设定集');
    return;
  }

  busy.scheme = true;
  try {
    const existingTitles = _.uniq([
      ...catalog.value.storySchemes.map(item => item.title),
      ...runtimeState.schemePages.flatMap(page => page.schemes.map(item => item.title)),
    ]);
    const schemes = await generateStorySchemes(currentSettingSet.value, existingTitles);
    const nextPageNumber = append ? runtimeState.schemePages.length + 1 : 1;
    if (!append) {
      runtimeState.schemePages = [];
      uiState.currentSchemePage = 1;
    }
    runtimeState.schemePages = [
      ...runtimeState.schemePages,
      {
        pageNumber: nextPageNumber,
        schemes,
      },
    ];
    uiState.currentSchemePage = nextPageNumber;
    runtimeState.selectedSchemeId = schemes[0]?.id ?? null;
    await refreshCatalog();
    toastr.success(`已生成第 ${nextPageNumber} 页故事基础`);
  } catch (error) {
    console.error(error);
    toastr.error(error instanceof Error ? error.message : String(error), '生成故事基础失败');
  } finally {
    busy.scheme = false;
  }
}

function generateInitialSchemes() {
  void generateSchemeBatch(false);
}

function goToNextSchemePage() {
  if (uiState.currentSchemePage < totalSchemePages.value) {
    uiState.currentSchemePage += 1;
    return;
  }
  void generateSchemeBatch(true);
}

function openSchemeDetail(schemeId: string) {
  schemeDetailId.value = schemeId;
}

function jumpToSelectedScheme() {
  if (!runtimeState.selectedSchemeId) {
    return;
  }
  const page = runtimeState.schemePages.find(currentPage =>
    currentPage.schemes.some(scheme => scheme.id === runtimeState.selectedSchemeId),
  );
  if (page) {
    uiState.currentSchemePage = page.pageNumber;
  }
}

function useSchemeAsBlueprint(schemeId: string) {
  runtimeState.selectedSchemeId = schemeId;
  runtimeState.selectedOutlineId = null;
  runtimeState.finalOutlineId = null;
  runtimeState.outlineDraft = null;
  uiState.mainTab = '大纲审定';
  schemeDetailId.value = null;
  jumpToSelectedScheme();
}

async function toggleSchemeFavoriteState(schemeId: string) {
  try {
    await setSchemeFavorite(schemeId, !favoriteSchemeIds.value.has(schemeId));
    await refreshCatalog();
  } catch (error) {
    console.error(error);
    toastr.error(error instanceof Error ? error.message : String(error), '收藏状态更新失败');
  }
}

async function generateOutlineForCurrentScheme() {
  if (!currentScheme.value) {
    toastr.warning('请先选择一个故事基础');
    return;
  }
  const sourceSettingSet = catalog.value.settingSets.find(item => item.id === currentScheme.value.sourceSettingSetId);
  if (!sourceSettingSet) {
    toastr.error('找不到对应的设定集，无法生成大纲');
    return;
  }

  busy.outline = true;
  try {
    const outline = await generateStoryOutline(currentScheme.value, sourceSettingSet);
    runtimeState.outlineDraft = outline;
    runtimeState.selectedOutlineId = outline.id;
    runtimeState.finalOutlineId = null;
    uiState.mainTab = '大纲审定';
    toastr.success('故事大纲已生成，请先审定再保存');
  } catch (error) {
    console.error(error);
    toastr.error(error instanceof Error ? error.message : String(error), '生成大纲失败');
  } finally {
    busy.outline = false;
  }
}

async function saveCurrentOutline() {
  if (!runtimeState.outlineDraft) {
    return;
  }
  busy.outline = true;
  try {
    const saved = await saveOutline(klona(runtimeState.outlineDraft) as StoryOutline);
    runtimeState.outlineDraft = saved;
    runtimeState.selectedOutlineId = saved.id;
    runtimeState.finalOutlineId = saved.id;
    await setSelectedOutlineEnabled(saved.id);
    await refreshCatalog();
    uiState.mainTab = '最终生成';
    toastr.success('故事大纲已保存到世界书');
  } catch (error) {
    console.error(error);
    toastr.error(error instanceof Error ? error.message : String(error), '保存大纲失败');
  } finally {
    busy.outline = false;
  }
}

async function loadSelectedOutline() {
  const outline = catalog.value.storyOutlines.find(item => item.id === runtimeState.selectedOutlineId);
  if (!outline) {
    return;
  }
  runtimeState.outlineDraft = klona(outline) as StoryOutline;
  runtimeState.finalOutlineId = outline.id;
  await setSelectedOutlineEnabled(outline.id);
}

async function syncFinalOutline() {
  if (!runtimeState.finalOutlineId) {
    return;
  }
  const outline = catalog.value.storyOutlines.find(item => item.id === runtimeState.finalOutlineId);
  if (outline) {
    runtimeState.selectedOutlineId = outline.id;
    runtimeState.outlineDraft = klona(outline) as StoryOutline;
    await setSelectedOutlineEnabled(outline.id);
  }
}

async function launchStory() {
  if (!finalOutline.value || !finalSettingSet.value) {
    toastr.warning('请先选择一个已保存的大纲');
    return;
  }

  busy.story = true;
  try {
    await startStoryFromOutline(finalOutline.value, finalSettingSet.value);
    collapsedAfterStart.value = true;
    toastr.success('首章已生成，后续直接在聊天框输入“下一章”即可继续');
  } catch (error) {
    console.error(error);
    toastr.error(error instanceof Error ? error.message : String(error), '启动创作失败');
  } finally {
    busy.story = false;
  }
}

const persistChatState = useDebounceFn(() => {
  setChatUiState(klona(uiState));
  setChatRuntimeState(klona(runtimeState));
}, 150);

function resizeTextarea(textarea: HTMLTextAreaElement) {
  const computed = window.getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(computed.lineHeight) || 24;
  const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
  const borderTop = Number.parseFloat(computed.borderTopWidth) || 0;
  const borderBottom = Number.parseFloat(computed.borderBottomWidth) || 0;
  const baseHeight = lineHeight + paddingTop + paddingBottom + borderTop + borderBottom;
  const maxAutoHeight = lineHeight * 3 + paddingTop + paddingBottom + borderTop + borderBottom;
  const currentHeight = textarea.getBoundingClientRect().height;

  textarea.style.height = 'auto';
  const autoHeight = Math.max(baseHeight, Math.min(textarea.scrollHeight, maxAutoHeight));
  const nextHeight = currentHeight > maxAutoHeight + 1 ? Math.max(currentHeight, autoHeight) : autoHeight;
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > nextHeight + 1 ? 'auto' : 'hidden';
}

function resizeAllTextareas() {
  if (!shellRef.value) {
    return;
  }
  shellRef.value.querySelectorAll('textarea').forEach(textarea => {
    resizeTextarea(textarea);
  });
}

const scheduleTextareaResize = useDebounceFn(() => {
  void nextTick(() => {
    resizeAllTextareas();
  });
}, 0);

function handleInput(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) {
    return;
  }
  if (shellRef.value && !shellRef.value.contains(target)) {
    return;
  }
  resizeTextarea(target);
}

function handleFocusIn(event: FocusEvent) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
    return;
  }
  if (shellRef.value && !shellRef.value.contains(target)) {
    return;
  }
  window.setTimeout(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }, 120);
}

watch(
  uiState,
  () => {
    persistChatState();
  },
  { deep: true },
);

watch(
  runtimeState,
  () => {
    persistChatState();
    scheduleTextareaResize();
  },
  { deep: true },
);

onMounted(() => {
  document.addEventListener('focusin', handleFocusIn);
  document.addEventListener('input', handleInput, true);
  void bootstrap().finally(() => {
    scheduleTextareaResize();
  });
});

onBeforeUnmount(() => {
  document.removeEventListener('focusin', handleFocusIn);
  document.removeEventListener('input', handleInput, true);
  if (sparkTimer !== null) {
    window.clearTimeout(sparkTimer);
  }
});
</script>

<style lang="scss" scoped>
:global(body) {
  margin: 0;
  padding: 0;
}

.forge-shell {
  --bg: #f8f2e6;
  --paper: rgba(248, 242, 230, 0.97);
  --paper-soft: rgba(255, 250, 242, 0.82);
  --paper-deep: rgba(236, 225, 204, 0.78);
  --text: #4a3420;
  --muted: rgba(74, 52, 32, 0.62);
  --accent: #c6a678;
  --accent-strong: #9c7544;
  --accent-soft: rgba(198, 166, 120, 0.18);
  --line: rgba(113, 84, 51, 0.16);
  --line-strong: rgba(113, 84, 51, 0.34);
  --danger: #b55d43;
  --shadow: 0 28px 70px rgba(125, 94, 56, 0.12);
  --shadow-soft: 0 18px 45px rgba(125, 94, 56, 0.08);
  --font-title: 'Iowan Old Style', 'Palatino Linotype', 'Source Han Serif SC', 'Noto Serif CJK SC', serif;
  --font-body: 'Avenir Next', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  position: relative;
  width: 100%;
  color: var(--text);
  font-family: var(--font-body);
}

.forge-panel {
  position: relative;
  overflow: hidden;
  width: min(100%, 980px);
  margin: 0 auto;
  border: 1px solid var(--line-strong);
  border-radius: 34px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.22), transparent 18%),
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.22), transparent 30%),
    repeating-linear-gradient(0deg, rgba(198, 166, 120, 0.035) 0, rgba(198, 166, 120, 0.035) 1px, transparent 1px, transparent 28px),
    var(--bg);
  box-shadow: var(--shadow);
}

.forge-panel__glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.28), transparent 34%),
    radial-gradient(circle at bottom right, var(--accent-soft), transparent 30%);
}

.forge-panel::after {
  content: '';
  position: absolute;
  inset: 14px;
  border: 1px dashed var(--line);
  border-radius: 26px;
  pointer-events: none;
}

.forge-header,
.main-tabs,
.forge-body,
.completion-card,
.action-dock {
  position: relative;
  z-index: 1;
}

.forge-header {
  position: relative;
  padding: clamp(26px, 4vw, 40px) clamp(24px, 4vw, 40px) 28px;
  text-align: center;
}

.forge-header::after {
  content: '';
  position: absolute;
  left: clamp(24px, 4vw, 40px);
  right: clamp(24px, 4vw, 40px);
  bottom: 0;
  border-bottom: 2px double var(--line-strong);
}

.forge-header__title {
  max-width: 640px;
  margin: 0 auto;
}

.eyebrow,
.section-kicker,
.completion-card__eyebrow,
.action-dock__eyebrow {
  font-size: 11px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--muted);
}

.forge-title {
  margin: 10px 0 10px;
  font-family: var(--font-title);
  font-size: clamp(34px, 5vw, 58px);
  line-height: 1.08;
}

.forge-subtitle {
  margin: 0;
  max-width: 580px;
  margin-inline: auto;
  color: var(--muted);
  line-height: 1.8;
}

.main-tabs {
  display: flex;
  gap: 16px;
  padding: 26px clamp(24px, 4vw, 40px) 18px;
  overflow-x: auto;
  scrollbar-width: none;
}

.main-tabs::-webkit-scrollbar {
  display: none;
}

.main-tab {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  padding: 0 0 10px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition:
    color 0.24s ease,
    border-color 0.24s ease,
    transform 0.24s ease;
}

.main-tab__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  color: var(--muted);
  font-family: var(--font-title);
  font-size: 16px;
  transition:
    background 0.24s ease,
    border-color 0.24s ease,
    color 0.24s ease;
}

.main-tab__label {
  white-space: nowrap;
  color: var(--muted);
  transition: color 0.24s ease;
}

.main-tab.active {
  border-color: var(--accent);
  transform: translateY(-1px);
}

.main-tab.active .main-tab__index {
  border-color: var(--accent);
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #fffaf2;
}

.main-tab.active .main-tab__label {
  color: var(--text);
  font-weight: 700;
}

.forge-body {
  padding: 0 clamp(24px, 4vw, 40px) 26px;
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
}

.panel-section > * + * {
  padding-top: clamp(22px, 2.5vw, 30px);
  margin-top: clamp(22px, 2.5vw, 30px);
  border-top: 2px double var(--line-strong);
}

.panel-heading,
.toolbar,
.toolbar--compact,
.dialog-card__header,
.dialog-footer,
.launch-card__hero,
.outline-summary,
.character-card__header,
.completion-card__actions,
.editor-actions,
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.sub-tabs,
.character-switcher,
.segment-group,
.pill-row,
.tag-well,
.tag-picker {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.stack-section,
.character-card,
.outline-list,
.launch-card,
.readonly-outline,
.textarea-stack,
.tag-manager__editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.completion-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: clamp(24px, 4vw, 40px);
}

.completion-card h1,
.launch-card__hero h3,
.dialog-card h3,
.panel-heading h2,
.character-card h3,
.outline-summary h3 {
  margin: 0;
  font-family: var(--font-title);
}

.completion-card p,
.scheme-card__summary,
.dialog-body,
.readonly-outline__item p,
.launch-card__world,
.action-dock__copy span,
.muted-text {
  margin: 0;
  line-height: 1.7;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px 20px;
}

.section-storage {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 320px));
  justify-content: end;
  gap: 18px 24px;
}

.section-storage--single {
  grid-template-columns: minmax(220px, 320px);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  scroll-margin-block: 120px;
}

.field--double,
.field--wide {
  grid-column: 1 / -1;
}

.field-label {
  color: var(--muted);
  font-size: 13px;
  letter-spacing: 0.08em;
}

.field--row,
.field--row-action {
  display: grid;
  grid-template-columns: clamp(72px, 20%, 104px) minmax(0, 1fr);
  align-items: end;
  gap: 12px 18px;
}

.field--name-row {
  display: grid;
  grid-template-columns: 48px 116px minmax(0, 1fr) minmax(0, 1fr) 44px;
  grid-template-areas: 'label style surname given spark';
  align-items: end;
  gap: 12px 18px;
}

.field-label--inline {
  padding-bottom: 13px;
}

.field--row .field-label,
.field--row-action .field-label,
.name-row__label {
  padding-bottom: 13px;
}

input,
select,
textarea,
button {
  font: inherit;
}

input,
select,
textarea {
  width: 100%;
  padding: 8px 0 13px;
  border: none;
  border-radius: 0;
  background:
    linear-gradient(to right, var(--accent-strong), var(--accent-strong)) left bottom / 0 2px no-repeat,
    repeating-linear-gradient(to right, var(--line-strong) 0 10px, transparent 10px 15px) left bottom / 100% 1px no-repeat;
  color: inherit;
  box-sizing: border-box;
  transition:
    background-size 0.28s ease,
    color 0.24s ease;
  appearance: none;
}

textarea {
  min-height: 0;
  height: auto;
  max-height: none;
  overflow-y: hidden;
  resize: vertical;
  line-height: 1.8;
  padding-top: 6px;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  background-size:
    100% 2px,
    100% 1px;
}

.inline-fields,
.inline-textarea-actions {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.field-action {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  gap: 12px;
  align-items: end;
}

.name-row__label {
  grid-area: label;
}

.name-row__style {
  grid-area: style;
  width: 100%;
  min-width: 0;
}

.name-row__surname,
.name-row__given {
  min-width: 0;
}

.name-row__surname {
  grid-area: surname;
}

.name-row__given {
  grid-area: given;
}

.name-row__spark {
  grid-area: spark;
}

.inline-fields > *:first-child,
.inline-fields > *:nth-child(2) {
  flex: 1;
}

.inline-textarea-actions textarea {
  flex: 1;
}

.tag-manager {
  display: grid;
  grid-template-columns: minmax(180px, 220px) minmax(0, 1fr);
  gap: 24px;
}

.tag-list-item {
  width: 100%;
  text-align: left;
}

.scheme-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.scheme-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px 18px 18px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: var(--paper-soft);
  cursor: pointer;
}

.scheme-card__title {
  padding-right: 36px;
  font-family: var(--font-title);
  font-size: 22px;
}

.scheme-card__pairing,
.scheme-card__meta,
.dialog-meta {
  color: var(--muted);
  font-size: 14px;
}

.star-btn,
.ghost-btn,
.primary-btn,
.danger-btn,
.spark-btn {
  border-radius: 14px;
  cursor: pointer;
}

.star-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 20px;
}

.star-btn.active {
  color: #f6b73c;
}

.ghost-btn,
.primary-btn,
.danger-btn {
  padding: 12px 18px;
  border: 1px solid var(--line);
  background: var(--paper-soft);
  color: inherit;
  backdrop-filter: blur(12px);
}

.ghost-btn--wide {
  width: 100%;
}

.ghost-btn--icon {
  width: 40px;
  padding: 8px 0;
}

.primary-btn {
  border-color: transparent;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #fff;
}

.primary-btn--dock {
  min-width: 212px;
  justify-content: center;
}

.danger-btn {
  border-color: rgba(196, 69, 54, 0.18);
  color: var(--danger);
}

.spark-btn {
  position: relative;
  width: 44px;
  min-width: 44px;
  border: none;
  background: transparent;
  color: var(--accent-strong);
  font-size: 20px;
  line-height: 1;
}

.spark-btn::before {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 999px;
  background: radial-gradient(circle, var(--accent-soft), transparent 68%);
  opacity: 0;
  transform: scale(0.68);
}

.spark-btn.active {
  animation: spark-spin 0.56s ease;
}

.spark-btn.active::before {
  opacity: 1;
  animation: spark-bloom 0.56s ease;
}

.spark-btn--block {
  align-self: flex-end;
}

.pill,
.pill--soft {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 13px;
}

.pill--soft {
  background: rgba(255, 255, 255, 0.22);
}

.outline-summary__meta,
.launch-card__meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  color: var(--muted);
}

.readonly-outline__item {
  padding: 14px 0;
  border-top: 1px solid var(--line);
}

.readonly-outline__item:first-child {
  border-top: none;
  padding-top: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 22px 0;
  background: var(--accent-soft);
  border-top: 2px double var(--line-strong);
  border-bottom: 2px double var(--line-strong);
}

.muted-text {
  color: var(--muted);
}

.switcher {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
}

.switcher input {
  width: auto;
  padding: 0;
  background: none;
}

.dialog-backdrop {
  position: absolute;
  inset: 0;
  z-index: 12;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 18px;
  background: rgba(14, 18, 24, 0.42);
  backdrop-filter: blur(4px);
}

.dialog-card {
  width: min(640px, 100%);
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 24px;
  background: var(--paper);
  box-shadow: var(--shadow);
}

.dialog-card--compact {
  width: min(460px, 100%);
}

.dialog-card--sheet {
  width: min(760px, 100%);
  border-radius: 28px 28px 0 0;
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  animation: sheet-rise 0.28s ease;
}

.dialog-backdrop--sheet {
  align-items: end;
}

.dialog-footer--stack {
  flex-direction: column;
  align-items: stretch;
}

.dialog-footer--stack button {
  width: 100%;
}

.tag-picker {
  padding-top: 8px;
}

.tag-manager__list,
.tag-manager__editor,
.character-card,
.launch-card,
.outline-item,
.completion-card {
  background: transparent;
}

.sub-tabs {
  gap: 18px;
  overflow-x: auto;
  scrollbar-width: none;
}

.sub-tabs::-webkit-scrollbar {
  display: none;
}

.sub-tab {
  position: relative;
  flex-shrink: 0;
  padding: 0 0 12px;
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.24s ease;
}

.sub-tab::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--accent), var(--accent-strong));
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.28s ease;
}

.sub-tab.active {
  color: var(--text);
  font-weight: 700;
}

.sub-tab.active::after {
  transform: scaleX(1);
}

.character-switcher {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-deep);
}

.character-switcher__slider {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 4px);
  border-radius: 999px;
  background: rgba(255, 250, 244, 0.92);
  box-shadow: var(--shadow-soft);
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.character-switcher__btn {
  position: relative;
  z-index: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.24s ease;
}

.character-switcher__btn.active {
  color: var(--text);
  font-weight: 700;
}

.character-card__header {
  align-items: start;
}

.name-seal {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 220px;
  max-width: 320px;
  padding: 12px 18px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, rgba(255, 247, 238, 0.2), transparent 35%), linear-gradient(180deg, rgba(177, 88, 72, 0.92), rgba(151, 58, 44, 0.96));
  box-shadow: 0 18px 36px rgba(151, 58, 44, 0.16);
}

.name-seal span {
  color: rgba(255, 245, 236, 0.82);
  font-size: 11px;
  letter-spacing: 0.16em;
  white-space: nowrap;
}

.name-seal strong {
  color: #fffaf3;
  font-family: var(--font-title);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.2;
  text-align: right;
}

.segment-btn,
.picker-pill,
.tag-list-item {
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--paper-soft);
  color: inherit;
  cursor: pointer;
}

.segment-btn.active,
.picker-pill.active,
.tag-list-item.active {
  border-color: var(--line-strong);
  background: var(--accent-soft);
}

.tag-manager__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tag-manager__editor {
  padding-top: 6px;
}

.toolbar__actions,
.toolbar--compact {
  align-items: end;
}

.editor-actions {
  justify-content: start;
}

.outline-item {
  padding: 0 0 20px;
  border-bottom: 1px dashed var(--line);
}

.outline-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.launch-card,
.character-card,
.tag-manager__editor,
.tag-manager__list {
  border-top: 1px dashed var(--line);
  padding-top: 12px;
}

.action-dock {
  position: sticky;
  bottom: 12px;
  padding: 0 clamp(24px, 4vw, 40px) calc(14px + env(safe-area-inset-bottom));
  z-index: 6;
}

.action-dock__inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding: 16px 18px;
  border: 1px solid var(--line-strong);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), transparent),
    var(--paper-soft);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(16px);
}

.action-dock__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-dock__copy strong {
  font-family: var(--font-title);
  font-size: 20px;
}

.action-dock__copy span {
  color: var(--muted);
  font-size: 13px;
}

.action-dock__buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: end;
}

.ghost-btn,
.primary-btn,
.danger-btn,
.spark-btn,
.sub-tab,
.main-tab,
.character-switcher__btn,
.segment-btn,
.picker-pill,
.tag-list-item {
  transition:
    transform 0.24s ease,
    background-color 0.24s ease,
    border-color 0.24s ease,
    color 0.24s ease,
    box-shadow 0.24s ease;
}

.ghost-btn:hover,
.primary-btn:hover,
.danger-btn:hover,
.main-tab:hover,
.sub-tab:hover,
.segment-btn:hover,
.picker-pill:hover,
.tag-list-item:hover {
  transform: translateY(-1px);
}

.ghost-btn:disabled,
.primary-btn:disabled,
.danger-btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
  transform: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes spark-spin {
  0% {
    transform: rotate(0deg) scale(1);
  }
  38% {
    transform: rotate(22deg) scale(1.08);
  }
  100% {
    transform: rotate(0deg) scale(1);
  }
}

@keyframes spark-bloom {
  0% {
    opacity: 0;
    transform: scale(0.48);
  }
  40% {
    opacity: 0.92;
  }
  100% {
    opacity: 0;
    transform: scale(1.38);
  }
}

@keyframes sheet-rise {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 860px) {
  .forge-header,
  .panel-heading,
  .toolbar,
  .toolbar--compact,
  .dialog-card__header,
  .dialog-footer,
  .outline-summary,
  .launch-card__hero,
  .completion-card__actions,
  .editor-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .form-grid,
  .tag-manager,
  .scheme-grid,
  .section-storage,
  .section-storage--single {
    grid-template-columns: 1fr;
  }

  .inline-fields,
  .inline-textarea-actions {
    flex-direction: column;
  }

  .field--name-row {
    grid-template-columns: 48px minmax(0, 1fr) minmax(0, 1fr) 44px;
    grid-template-areas:
      'label style style spark'
      'surname surname given given';
    gap: 10px 12px;
  }

  .field--row,
  .field--row-action {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .field-label--inline {
    padding-bottom: 0;
  }

  .spark-btn--block {
    align-self: start;
  }

  .name-seal {
    min-width: 0;
    width: 100%;
    max-width: none;
    border-radius: 22px;
  }

  .action-dock__inner,
  .action-dock__buttons {
    flex-direction: column;
    align-items: stretch;
  }

  .action-dock__buttons button,
  .primary-btn--dock {
    width: 100%;
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .forge-panel::after {
    inset: 10px;
  }

  .forge-header {
    padding-left: 24px;
    padding-right: 24px;
  }

  .main-tabs,
  .forge-body,
  .action-dock {
    padding-left: 24px;
    padding-right: 24px;
  }

  .completion-card,
  .dialog-card,
  .scheme-card {
    padding: 18px 16px;
  }

  .main-tab__label {
    font-size: 14px;
  }

  .action-dock {
    bottom: 8px;
  }

  .dialog-card--sheet {
    border-radius: 24px 24px 0 0;
  }
}
</style>

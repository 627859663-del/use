import { literalYamlify, parseString, uuidv4 } from '@util/common';
import seedWorldbook from './世界书.yaml';

export const CP_FORGE_WORLDBOOK_NAME = 'CP同人故事生成器';
export const MAIN_TABS = ['灵感注入', '方案抉择', '大纲审定', '最终生成'] as const;
export const INSPIRATION_TABS = ['角色设定', '世界观', '故事框架', 'Tags库'] as const;
export const CHARACTER_KEYS = ['roleA', 'roleB'] as const;
export const NAME_STYLES = ['中式', '日式', '西式'] as const;
export const ENDINGS = ['HE', 'BE', 'OE'] as const;

export type MainTab = (typeof MAIN_TABS)[number];
export type InspirationTab = (typeof INSPIRATION_TABS)[number];
export type CharacterKey = (typeof CHARACTER_KEYS)[number];
export type NameStyle = (typeof NAME_STYLES)[number];
export type Ending = (typeof ENDINGS)[number];

const CP_FORGE_KINDS = [
  'surname',
  'givenName',
  'imageryPool',
  'openingPool',
  'tags',
  'worldview',
  'settingSet',
  'storyScheme',
  'storyOutline',
] as const;
export type CpForgeKind = (typeof CP_FORGE_KINDS)[number];
const OBSOLETE_CP_FORGE_KINDS = ['worldviewIdeaPool'] as const;

type SeedPosition = { 类型?: string; 顺序?: number; 角色?: string; 深度?: number };
type SeedStrategy = { 类型?: string };
type SeedEntry = {
  名称: string;
  启用?: boolean;
  激活策略?: SeedStrategy;
  插入位置?: SeedPosition;
  内容?: string;
  额外字段?: Record<string, any>;
};
type WorldbookEntryInput = Partial<WorldbookEntry> & Record<string, any>;
type EntryPresentation = { entryName: string; keys: string[] };

const CpForgeMetaSchema = z.object({
  kind: z.enum(CP_FORGE_KINDS),
  id: z.string().min(1),
  title: z.string().min(1),
  favorite: z.boolean().default(false),
  sourceId: z.string().nullable().default(null),
  settingSetId: z.string().nullable().default(null),
  schemeId: z.string().nullable().default(null),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const CharacterFormSchema = z.object({
  nameStyle: z.enum(NAME_STYLES).default('中式'),
  surname: z.string().default(''),
  givenName: z.string().default(''),
  gender: z.string().default(''),
  birthDate: z.string().default(''),
  powerLevel: z.string().default(''),
  imagery: z.string().default(''),
  personalityBase: z.string().default(''),
  personalityMain: z.string().default(''),
  personalityAccent: z.string().default(''),
  backgroundStory: z.string().default(''),
  appearance: z.string().default(''),
  traits: z.string().default(''),
});

const StoryFrameSchema = z.object({
  opening: z.string().default(''),
  ending: z.enum(ENDINGS).default('HE'),
  tags: z.array(z.string()).default([]),
});

const WorldviewSnapshotSchema = z.object({
  id: z.string().nullable().default(null),
  title: z.string().default(''),
  content: z.string().default(''),
});

const SettingDraftSchema = z.object({
  roleA: CharacterFormSchema.default({}),
  roleB: CharacterFormSchema.default({}),
  worldviewId: z.string().nullable().default(null),
  worldviewTitle: z.string().default(''),
  worldviewText: z.string().default(''),
  storyFrame: StoryFrameSchema.default({}),
  loadedSettingSetId: z.string().nullable().default(null),
});

const SettingSetSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  characters: z.object({
    roleA: CharacterFormSchema,
    roleB: CharacterFormSchema,
  }),
  worldview: WorldviewSnapshotSchema,
  storyFrame: StoryFrameSchema,
  savedAt: z.string().min(1),
});

const StoredWorldviewSnapshotSchema = WorldviewSnapshotSchema.omit({ id: true });
const StoredSettingSetSchema = SettingSetSchema.omit({ id: true }).extend({
  worldview: StoredWorldviewSnapshotSchema,
});

const StorySchemeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  pairing: z.string().min(1),
  summary: z.string().min(1),
  tags: z.array(z.string()).default([]),
  totalChapters: z.number().int().min(2).max(40),
  wordsPerChapter: z.number().int().min(400).max(8000),
  ending: z.enum(ENDINGS),
  worldviewSummary: z.string().default(''),
  sourceSettingSetId: z.string().min(1),
  generatedAt: z.string().min(1),
});

const StoredStorySchemeSchema = StorySchemeSchema.omit({
  id: true,
  sourceSettingSetId: true,
});
const StorySchemeArchiveSchema = z.object({
  设定集内容: z.string().default(''),
  故事基础条目: StoredStorySchemeSchema,
});

const OutlineChapterSchema = z.object({
  index: z.number().int().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
});

const StoryOutlineSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  pairing: z.string().min(1),
  ending: z.enum(ENDINGS),
  tags: z.array(z.string()).default([]),
  worldviewSummary: z.string().default(''),
  sourceSchemeId: z.string().min(1),
  sourceSettingSetId: z.string().min(1),
  chapters: z.array(OutlineChapterSchema).min(2).max(40),
  savedAt: z.string().min(1),
});

const StoredStoryOutlineSchema = StoryOutlineSchema.omit({
  id: true,
  sourceSchemeId: true,
  sourceSettingSetId: true,
});
const StoryOutlineArchiveSchema = z.object({
  设定集内容: z.string().default(''),
  故事基础内容: z.string().default(''),
  故事大纲条目: StoredStoryOutlineSchema,
});

const SchemePageSchema = z.object({
  pageNumber: z.number().int().min(1),
  schemes: z.array(StorySchemeSchema).length(4),
});

const UiStateSchema = z.object({
  mainTab: z.enum(MAIN_TABS).default('灵感注入'),
  inspirationTab: z.enum(INSPIRATION_TABS).default('角色设定'),
  activeCharacter: z.enum(CHARACTER_KEYS).default('roleA'),
  favoritesOnly: z.boolean().default(false),
  currentSchemePage: z.number().int().min(1).default(1),
});

const RuntimeStateSchema = z.object({
  draft: SettingDraftSchema.default({}),
  selectedSettingSetId: z.string().nullable().default(null),
  schemePages: z.array(SchemePageSchema).default([]),
  selectedSchemeId: z.string().nullable().default(null),
  selectedOutlineId: z.string().nullable().default(null),
  finalOutlineId: z.string().nullable().default(null),
  outlineDraft: StoryOutlineSchema.nullable().default(null),
});

const NamePoolSchema = z.object({
  中式: z.array(z.string()).min(1),
  日式: z.array(z.string()).min(1),
  西式: z.array(z.string()).min(1),
});

const StringPoolSchema = z.array(z.string().min(1)).min(1);

const GeneratedSchemesResponseSchema = z.array(
  z.object({
    title: z.string().min(2).max(40),
    summary: z.string().min(24).max(280),
    tags: z.array(z.string().min(1)).min(1).max(6),
    totalChapters: z.number().int().min(4).max(32),
    wordsPerChapter: z.number().int().min(600).max(5000),
    ending: z.enum(ENDINGS),
  }),
).length(4);

const GeneratedOutlineResponseSchema = z.object({
  title: z.string().min(1).max(60),
  chapters: z.array(
    z.object({
      title: z.string().min(1).max(50),
      summary: z.string().min(20).max(220),
    }),
  ).min(2).max(40),
});

export type CpForgeMeta = z.infer<typeof CpForgeMetaSchema>;
export type CharacterForm = z.infer<typeof CharacterFormSchema>;
export type StoryFrame = z.infer<typeof StoryFrameSchema>;
export type WorldviewSnapshot = z.infer<typeof WorldviewSnapshotSchema>;
export type SettingDraft = z.infer<typeof SettingDraftSchema>;
export type SettingSet = z.infer<typeof SettingSetSchema>;
export type StoryScheme = z.infer<typeof StorySchemeSchema>;
export type OutlineChapter = z.infer<typeof OutlineChapterSchema>;
export type StoryOutline = z.infer<typeof StoryOutlineSchema>;
export type SchemePage = z.infer<typeof SchemePageSchema>;
export type UiState = z.infer<typeof UiStateSchema>;
export type RuntimeState = z.infer<typeof RuntimeStateSchema>;

export type CatalogSettingSet = SettingSet & { meta: CpForgeMeta; entryName: string };
export type CatalogWorldview = {
  id: string;
  title: string;
  content: string;
  meta: CpForgeMeta;
  entryName: string;
};
export type CatalogStoryScheme = StoryScheme & { meta: CpForgeMeta; entryName: string };
export type CatalogStoryOutline = StoryOutline & { meta: CpForgeMeta; entryName: string };

export type ForgeCatalog = {
  surnamePool: Record<NameStyle, string[]>;
  givenNamePool: Record<NameStyle, string[]>;
  imageryPool: string[];
  openingPool: string[];
  tags: string[];
  worldviews: CatalogWorldview[];
  settingSets: CatalogSettingSet[];
  storySchemes: CatalogStoryScheme[];
  storyOutlines: CatalogStoryOutline[];
};

const FOUNDATION_KINDS: CpForgeKind[] = [
  'surname',
  'givenName',
  'imageryPool',
  'openingPool',
];
const UNIQUE_KINDS: CpForgeKind[] = [...FOUNDATION_KINDS, 'tags'];

const seedEntries = ((seedWorldbook as { 条目?: SeedEntry[] }).条目 ?? []).map(toSeedWorldbookEntry);
const seedFoundationPools = new Map<CpForgeKind, z.infer<typeof NamePoolSchema>>();

function nowIso(): string {
  return new Date().toISOString();
}

function toSeedWorldbookEntry(seed: SeedEntry): WorldbookEntryInput {
  return {
    name: seed.名称,
    enabled: seed.启用 ?? false,
    strategy: {
      type: toStrategyType(seed.激活策略?.类型),
      keys: [],
      keys_secondary: { logic: 'and_any', keys: [] },
      scan_depth: 'same_as_global',
    },
    position: {
      type: toPositionType(seed.插入位置?.类型),
      role: toRole(seed.插入位置?.角色),
      depth: seed.插入位置?.深度 ?? 0,
      order: seed.插入位置?.顺序 ?? 100,
    },
    probability: 100,
    recursion: {
      prevent_incoming: true,
      prevent_outgoing: true,
      delay_until: null,
    },
    effect: {
      sticky: null,
      cooldown: null,
      delay: null,
    },
    content: seed.内容 ?? '',
    extra: seed.额外字段 ?? {},
  };
}

function toStrategyType(type?: string): WorldbookEntry['strategy']['type'] {
  switch (type) {
    case '绿灯':
      return 'selective';
    case '向量化':
      return 'vectorized';
    default:
      return 'constant';
  }
}

function toPositionType(type?: string): WorldbookEntry['position']['type'] {
  switch (type) {
    case '角色定义之后':
      return 'after_character_definition';
    case '示例消息之前':
      return 'before_example_messages';
    case '示例消息之后':
      return 'after_example_messages';
    case '作者注释之前':
      return 'before_author_note';
    case '作者注释之后':
      return 'after_author_note';
    case '指定深度':
      return 'at_depth';
    default:
      return 'before_character_definition';
  }
}

function toRole(role?: string): WorldbookEntry['position']['role'] {
  switch (role) {
    case 'AI':
      return 'assistant';
    case '用户':
      return 'user';
    default:
      return 'system';
  }
}

function parseMeta(entry: Pick<WorldbookEntry, 'extra'>): CpForgeMeta | null {
  const result = CpForgeMetaSchema.safeParse(_.get(entry.extra, 'cpForge'));
  return result.success ? result.data : null;
}

for (const entry of seedEntries) {
  const meta = parseMeta(entry);
  if (!meta || (meta.kind !== 'surname' && meta.kind !== 'givenName')) {
    continue;
  }
  const parsed = NamePoolSchema.safeParse(parseString(entry.content ?? ''));
  if (parsed.success) {
    seedFoundationPools.set(meta.kind, parsed.data);
  }
}

function buildMeta(
  kind: CpForgeKind,
  title: string,
  options: {
    id?: string;
    sourceId?: string | null;
    settingSetId?: string | null;
    schemeId?: string | null;
    favorite?: boolean;
  } = {},
) {
  const timestamp = nowIso();
  return CpForgeMetaSchema.parse({
    kind,
    id: options.id ?? uuidv4(),
    title,
    favorite: options.favorite ?? false,
    sourceId: options.sourceId ?? null,
    settingSetId: options.settingSetId ?? null,
    schemeId: options.schemeId ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

function escapeTagName(tag: string) {
  return _.escapeRegExp(tag);
}

function wrapTaggedContent(tag: string, body: string) {
  const normalized = body.trim();
  return `<${tag}>\n${normalized}\n</${tag}>`;
}

function unwrapTaggedContent(content: string, tag: string) {
  const match = content.trim().match(new RegExp(`^<${escapeTagName(tag)}>\\s*([\\s\\S]*?)\\s*</${escapeTagName(tag)}>$`, 'u'));
  return match?.[1]?.trim() ?? null;
}

function normalizeKeywords(keys: (string | RegExp)[] | undefined): string[] {
  return (keys ?? [])
    .filter((key): key is string => typeof key === 'string')
    .map(key => key.trim())
    .filter(Boolean);
}

function tryParseWithSchema<T>(content: string, schema: z.ZodType<T>): T | null {
  try {
    const parsed = schema.safeParse(parseString(content));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function parseSettingSetBody(content: string) {
  const wrapped = unwrapTaggedContent(content, '设定集');
  const stored = wrapped ? tryParseWithSchema(wrapped, StoredSettingSetSchema) : null;
  if (stored) {
    return StoredSettingSetSchema.parse({
      ...stored,
      title: deriveSettingSetTitle(getPairingFromCharacters(stored.characters), stored.worldview.title),
    });
  }

  const legacy = tryParseWithSchema(content, SettingSetSchema);
  if (!legacy) {
    return null;
  }

  return StoredSettingSetSchema.parse({
    title: deriveSettingSetTitle(getPairingFromCharacters(legacy.characters), legacy.worldview.title),
    characters: legacy.characters,
    worldview: {
      title: legacy.worldview.title,
      content: legacy.worldview.content,
    },
    storyFrame: legacy.storyFrame,
    savedAt: legacy.savedAt,
  });
}

function serializeSettingSetContent(settingSet: Pick<SettingSet, 'title' | 'characters' | 'worldview' | 'storyFrame' | 'savedAt'>) {
  const title = deriveSettingSetTitle(getPairingFromCharacters(settingSet.characters), settingSet.worldview.title);
  const stored = StoredSettingSetSchema.parse({
    title,
    characters: settingSet.characters,
    worldview: {
      title: settingSet.worldview.title,
      content: settingSet.worldview.content,
    },
    storyFrame: settingSet.storyFrame,
    savedAt: settingSet.savedAt,
  });
  return wrapTaggedContent('设定集', literalYamlify(stored));
}

function parseStorySchemeArchive(content: string) {
  const wrapped = unwrapTaggedContent(content, '故事基础');
  const archived = wrapped ? tryParseWithSchema(wrapped, StorySchemeArchiveSchema) : null;
  if (archived) {
    return archived;
  }

  const legacy = tryParseWithSchema(content, StorySchemeSchema);
  if (!legacy) {
    return null;
  }

  return StorySchemeArchiveSchema.parse({
    设定集内容: '',
    故事基础条目: {
      title: legacy.title,
      pairing: legacy.pairing,
      summary: legacy.summary,
      tags: legacy.tags,
      totalChapters: legacy.totalChapters,
      wordsPerChapter: legacy.wordsPerChapter,
      ending: legacy.ending,
      worldviewSummary: legacy.worldviewSummary,
      generatedAt: legacy.generatedAt,
    },
  });
}

function serializeStorySchemeContent(settingSetContent: string, scheme: Pick<StoryScheme, 'title' | 'pairing' | 'summary' | 'tags' | 'totalChapters' | 'wordsPerChapter' | 'ending' | 'worldviewSummary' | 'generatedAt'>) {
  const archived = StorySchemeArchiveSchema.parse({
    设定集内容: settingSetContent.trim(),
    故事基础条目: {
      title: scheme.title,
      pairing: scheme.pairing,
      summary: scheme.summary,
      tags: scheme.tags,
      totalChapters: scheme.totalChapters,
      wordsPerChapter: scheme.wordsPerChapter,
      ending: scheme.ending,
      worldviewSummary: scheme.worldviewSummary,
      generatedAt: scheme.generatedAt,
    },
  });
  return wrapTaggedContent('故事基础', literalYamlify(archived));
}

function parseStoryOutlineArchive(content: string) {
  const wrapped = unwrapTaggedContent(content, '故事大纲');
  const archived = wrapped ? tryParseWithSchema(wrapped, StoryOutlineArchiveSchema) : null;
  if (archived) {
    return archived;
  }

  const legacy = tryParseWithSchema(content, StoryOutlineSchema);
  if (!legacy) {
    return null;
  }

  return StoryOutlineArchiveSchema.parse({
    设定集内容: '',
    故事基础内容: '',
    故事大纲条目: {
      title: legacy.title,
      pairing: legacy.pairing,
      ending: legacy.ending,
      tags: legacy.tags,
      worldviewSummary: legacy.worldviewSummary,
      chapters: legacy.chapters,
      savedAt: legacy.savedAt,
    },
  });
}

function serializeStoryOutlineContent(
  settingSetContent: string,
  storySchemeContent: string,
  outline: Pick<StoryOutline, 'title' | 'pairing' | 'ending' | 'tags' | 'worldviewSummary' | 'chapters' | 'savedAt'>,
) {
  const archived = StoryOutlineArchiveSchema.parse({
    设定集内容: settingSetContent.trim(),
    故事基础内容: storySchemeContent.trim(),
    故事大纲条目: {
      title: outline.title,
      pairing: outline.pairing,
      ending: outline.ending,
      tags: outline.tags,
      worldviewSummary: outline.worldviewSummary,
      chapters: outline.chapters,
      savedAt: outline.savedAt,
    },
  });
  return wrapTaggedContent('故事大纲', literalYamlify(archived));
}

function deriveSettingSetTitle(pairing: string, worldviewTitle: string) {
  const normalizedWorldviewTitle = worldviewTitle.trim() || '未命名世界观';
  return `${pairing}｜${normalizedWorldviewTitle}`;
}

function getPairingFromCharacters(characters: Pick<SettingSet, 'characters'>['characters']) {
  const roleA = formatFullName(characters.roleA) || '角色A';
  const roleB = formatFullName(characters.roleB) || '角色B';
  return `${roleA}/${roleB}`;
}

function buildEntryPresentation(
  kind: CpForgeKind,
  fallbackTitle: string,
  content: string,
  options: { favorite?: boolean } = {},
): EntryPresentation {
  const title = fallbackTitle.trim() || '未命名';

  switch (kind) {
    case 'settingSet': {
      const parsed = parseSettingSetBody(content);
      const resolvedTitle = parsed?.title ?? title;
      return {
        entryName: resolvedTitle,
        keys: _.uniq([resolvedTitle, '设定集']).filter(Boolean),
      };
    }
    case 'storyScheme': {
      const parsed = parseStorySchemeArchive(content);
      const resolvedTitle = parsed?.故事基础条目.title ?? title;
      const pairing = parsed?.故事基础条目.pairing ?? '';
      const prefix = options.favorite ? '★ ' : '';
      return {
        entryName: `${prefix}故事基础 · ${resolvedTitle}`,
        keys: _.uniq([pairing, resolvedTitle, '故事基础']).filter(Boolean),
      };
    }
    case 'storyOutline': {
      const parsed = parseStoryOutlineArchive(content);
      const resolvedTitle = parsed?.故事大纲条目.title ?? title;
      const pairing = parsed?.故事大纲条目.pairing ?? '';
      return {
        entryName: `故事大纲 · ${resolvedTitle}`,
        keys: _.uniq([pairing, resolvedTitle, '故事大纲']).filter(Boolean),
      };
    }
    default:
      return {
        entryName: title,
        keys: [],
      };
  }
}

function buildEntry(kind: CpForgeKind, name: string, content: string, meta: CpForgeMeta): WorldbookEntryInput {
  const presentation = buildEntryPresentation(kind, name, content, { favorite: meta.favorite });
  return {
    name: presentation.entryName,
    enabled: false,
    strategy: {
      type: 'constant',
      keys: presentation.keys,
      keys_secondary: { logic: 'and_any', keys: [] },
      scan_depth: 'same_as_global',
    },
    position: {
      type: 'before_character_definition',
      role: 'system',
      depth: 0,
      order: 100,
    },
    probability: 100,
    recursion: {
      prevent_incoming: true,
      prevent_outgoing: true,
      delay_until: null,
    },
    effect: {
      sticky: null,
      cooldown: null,
      delay: null,
    },
    content,
    extra: { cpForge: meta },
  };
}

function normalizeManagedEntry(entry: WorldbookEntry, worldbook: WorldbookEntry[]): PartialDeep<WorldbookEntry> | null {
  try {
    const meta = parseMeta(entry);
    if (!meta) {
      return null;
    }

    const presentation = buildEntryPresentation(meta.kind, meta.title, entry.content, { favorite: meta.favorite });
    const currentKeys = normalizeKeywords(entry.strategy?.keys);
    let nextContent = entry.content;

    if (meta.kind === 'settingSet') {
      const parsed = parseSettingSetBody(entry.content);
      if (parsed) {
        nextContent = wrapTaggedContent('设定集', literalYamlify(parsed));
      }
    }

    if (meta.kind === 'storyScheme') {
      const parsed = parseStorySchemeArchive(entry.content);
      if (parsed) {
        const settingSetContent =
          parsed.设定集内容 ||
          findEntryByKindOrId(worldbook, 'settingSet', meta.settingSetId ?? meta.sourceId)?.content ||
          '';
        nextContent = serializeStorySchemeContent(settingSetContent, parsed.故事基础条目);
      }
    }

    if (meta.kind === 'storyOutline') {
      const parsed = parseStoryOutlineArchive(entry.content);
      if (parsed) {
        const settingSetContent =
          parsed.设定集内容 ||
          findEntryByKindOrId(worldbook, 'settingSet', meta.settingSetId)?.content ||
          '';
        const storySchemeContent =
          parsed.故事基础内容 ||
          findEntryByKindOrId(worldbook, 'storyScheme', meta.schemeId ?? meta.sourceId)?.content ||
          '';
        nextContent = serializeStoryOutlineContent(settingSetContent, storySchemeContent, parsed.故事大纲条目);
      }
    }

    if (entry.name === presentation.entryName && _.isEqual(currentKeys, presentation.keys) && nextContent === entry.content) {
      return null;
    }

    return {
      ...entry,
      name: presentation.entryName,
      content: nextContent,
      strategy: {
        ...entry.strategy,
        keys: presentation.keys,
      },
    };
  } catch (error) {
    console.warn('[CP同人故事生成器] 跳过世界书条目迁移', entry.name, error);
    return null;
  }
}

function findEntryByKindOrId(worldbook: WorldbookEntry[], kind: CpForgeKind, id?: string | null) {
  return worldbook.find(entry => {
    const meta = parseMeta(entry);
    if (!meta || meta.kind !== kind) {
      return false;
    }
    if (id) {
      return meta.id === id;
    }
    return UNIQUE_KINDS.includes(kind);
  });
}

function upsertMeta(existing: CpForgeMeta | null, patch: Partial<CpForgeMeta>): CpForgeMeta {
  return CpForgeMetaSchema.parse({
    kind: patch.kind ?? existing?.kind,
    id: patch.id ?? existing?.id,
    title: patch.title ?? existing?.title,
    favorite: patch.favorite ?? existing?.favorite ?? false,
    sourceId: patch.sourceId ?? existing?.sourceId ?? null,
    settingSetId: patch.settingSetId ?? existing?.settingSetId ?? null,
    schemeId: patch.schemeId ?? existing?.schemeId ?? null,
    createdAt: existing?.createdAt ?? patch.createdAt ?? nowIso(),
    updatedAt: patch.updatedAt ?? nowIso(),
  });
}

function safeParseContent<T>(content: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    return schema.parse(parseString(content));
  } catch (error) {
    console.warn('[CP同人故事生成器] 解析世界书条目失败', error);
    return fallback;
  }
}

function getCanonicalManagedContent(kind: CpForgeKind, content: string): string | null {
  switch (kind) {
    case 'settingSet': {
      const parsed = parseSettingSetBody(content);
      return parsed ? wrapTaggedContent('设定集', literalYamlify(parsed)) : null;
    }
    case 'storyScheme': {
      const parsed = parseStorySchemeArchive(content);
      return parsed ? wrapTaggedContent('故事基础', literalYamlify(parsed)) : null;
    }
    case 'storyOutline': {
      const parsed = parseStoryOutlineArchive(content);
      return parsed ? wrapTaggedContent('故事大纲', literalYamlify(parsed)) : null;
    }
    default:
      return null;
  }
}

function findManagedEntryIdByContent(worldbook: WorldbookEntry[], kind: CpForgeKind, content: string) {
  const target = getCanonicalManagedContent(kind, content);
  if (!target) {
    return null;
  }

  for (const entry of worldbook) {
    const meta = parseMeta(entry);
    if (!meta || meta.kind !== kind) {
      continue;
    }
    if (getCanonicalManagedContent(kind, entry.content) === target) {
      return meta.id;
    }
  }
  return null;
}

async function getManagedEntryContent(kind: CpForgeKind, id: string | null | undefined, fallbackContent: string) {
  if (!id) {
    return fallbackContent;
  }

  await ensureForgeWorldbook();
  const worldbook = await getWorldbook(CP_FORGE_WORLDBOOK_NAME);
  const entry = findEntryByKindOrId(worldbook, kind, id);
  return entry?.content ?? fallbackContent;
}

function shouldReplaceWesternNames(names: string[]) {
  return names.some(name => /[A-Za-z]/u.test(name));
}

function migrateWesternNamePool(entry: WorldbookEntry): PartialDeep<WorldbookEntry> | null {
  const meta = parseMeta(entry);
  if (!meta || (meta.kind !== 'surname' && meta.kind !== 'givenName')) {
    return null;
  }

  const currentPool = NamePoolSchema.safeParse(parseString(entry.content));
  const seededPool = seedFoundationPools.get(meta.kind);
  if (!currentPool.success || !seededPool || !shouldReplaceWesternNames(currentPool.data.西式)) {
    return null;
  }

  return {
    ...entry,
    content: literalYamlify({
      ...currentPool.data,
      西式: seededPool.西式,
    }),
    extra: {
      ...(entry.extra ?? {}),
      cpForge: {
        ...meta,
        updatedAt: nowIso(),
      },
    },
  };
}

function summarizeWorldview(text: string, title: string): string {
  if (!text.trim()) {
    return title.trim();
  }
  return _.truncate(text.replace(/\s+/gu, ' ').trim(), { length: 44, omission: '...' });
}

export function formatFullName(character: CharacterForm): string {
  const surname = character.surname.trim();
  const givenName = character.givenName.trim();
  if (!surname && !givenName) {
    return '';
  }
  if (!surname) {
    return givenName;
  }
  if (!givenName) {
    return surname;
  }
  return character.nameStyle === '西式' ? `${givenName}·${surname}` : `${surname} ${givenName}`;
}

export function createEmptyCharacter(): CharacterForm {
  return CharacterFormSchema.parse({});
}

export function createDefaultDraft(): SettingDraft {
  return SettingDraftSchema.parse({
    roleA: createEmptyCharacter(),
    roleB: createEmptyCharacter(),
    worldviewId: null,
    worldviewTitle: '',
    worldviewText: '',
    storyFrame: StoryFrameSchema.parse({}),
    loadedSettingSetId: null,
  });
}

export function createDefaultUiState(): UiState {
  return UiStateSchema.parse({});
}

export function createDefaultRuntimeState(): RuntimeState {
  return RuntimeStateSchema.parse({
    draft: createDefaultDraft(),
    selectedSettingSetId: null,
    schemePages: [],
    selectedSchemeId: null,
    selectedOutlineId: null,
    finalOutlineId: null,
    outlineDraft: null,
  });
}

export function sanitizeUiState(input: unknown): UiState {
  const result = UiStateSchema.safeParse(input);
  return result.success ? result.data : createDefaultUiState();
}

export function sanitizeRuntimeState(input: unknown): RuntimeState {
  const result = RuntimeStateSchema.safeParse(input);
  return result.success ? result.data : createDefaultRuntimeState();
}

export function draftFromSettingSet(settingSet: SettingSet): SettingDraft {
  return SettingDraftSchema.parse({
    roleA: settingSet.characters.roleA,
    roleB: settingSet.characters.roleB,
    worldviewId: settingSet.worldview.id,
    worldviewTitle: settingSet.worldview.title,
    worldviewText: settingSet.worldview.content,
    storyFrame: settingSet.storyFrame,
    loadedSettingSetId: settingSet.id,
  });
}

function getPairingFromDraft(draft: SettingDraft): string {
  const roleA = formatFullName(draft.roleA) || '角色A';
  const roleB = formatFullName(draft.roleB) || '角色B';
  return `${roleA}/${roleB}`;
}

export async function ensureForgeWorldbook(): Promise<void> {
  if (!getWorldbookNames().includes(CP_FORGE_WORLDBOOK_NAME)) {
    await createOrReplaceWorldbook(CP_FORGE_WORLDBOOK_NAME, seedEntries, { render: 'none' });
    return;
  }

  let worldbook = await getWorldbook(CP_FORGE_WORLDBOOK_NAME);
  const obsoleteKinds = new Set<string>(OBSOLETE_CP_FORGE_KINDS);
  if (worldbook.some(entry => obsoleteKinds.has(String(_.get(entry.extra, 'cpForge.kind') ?? '')))) {
    const result = await deleteWorldbookEntries(
      CP_FORGE_WORLDBOOK_NAME,
      entry => obsoleteKinds.has(String(_.get(entry.extra, 'cpForge.kind') ?? '')),
      { render: 'none' },
    );
    worldbook = result.worldbook;
  }

  const existingKinds = new Set(
    worldbook
      .map(entry => parseMeta(entry))
      .filter((meta): meta is CpForgeMeta => meta !== null)
      .map(meta => meta.kind),
  );
  const missing = seedEntries.filter(entry => {
    const meta = CpForgeMetaSchema.safeParse(_.get(entry.extra, 'cpForge'));
    return meta.success && !existingKinds.has(meta.data.kind);
  });
  if (missing.length > 0) {
    await createWorldbookEntries(CP_FORGE_WORLDBOOK_NAME, missing, { render: 'none' });
    worldbook = await getWorldbook(CP_FORGE_WORLDBOOK_NAME);
  }

  const migratedWorldbook = worldbook.map(entry => {
    const nameMigrated = migrateWesternNamePool(entry) ?? entry;
    return normalizeManagedEntry(nameMigrated as WorldbookEntry, worldbook) ?? nameMigrated;
  });
  if (migratedWorldbook.some((entry, index) => entry !== worldbook[index])) {
    await replaceWorldbook(CP_FORGE_WORLDBOOK_NAME, migratedWorldbook, { render: 'none' });
  }
}

export async function loadCatalog(): Promise<ForgeCatalog> {
  await ensureForgeWorldbook();
  const worldbook = await getWorldbook(CP_FORGE_WORLDBOOK_NAME);

  const emptyPool: Record<NameStyle, string[]> = {
    中式: [],
    日式: [],
    西式: [],
  };

  const catalog: ForgeCatalog = {
    surnamePool: { ...emptyPool },
    givenNamePool: { ...emptyPool },
    imageryPool: [],
    openingPool: [],
    tags: [],
    worldviews: [],
    settingSets: [],
    storySchemes: [],
    storyOutlines: [],
  };

  for (const entry of worldbook) {
    const meta = parseMeta(entry);
    if (!meta) {
      continue;
    }

    switch (meta.kind) {
      case 'surname':
        catalog.surnamePool = safeParseContent(entry.content, NamePoolSchema, emptyPool);
        break;
      case 'givenName':
        catalog.givenNamePool = safeParseContent(entry.content, NamePoolSchema, emptyPool);
        break;
      case 'imageryPool':
        catalog.imageryPool = safeParseContent(entry.content, StringPoolSchema, []);
        break;
      case 'openingPool':
        catalog.openingPool = safeParseContent(entry.content, StringPoolSchema, []);
        break;
      case 'tags':
        catalog.tags = safeParseContent(entry.content, StringPoolSchema.catch([]), []);
        break;
      case 'worldview':
        catalog.worldviews.push({
          id: meta.id,
          title: entry.name,
          content: entry.content,
          meta,
          entryName: entry.name,
        });
        break;
      case 'settingSet': {
        try {
          const parsed = parseSettingSetBody(entry.content);
          if (parsed) {
            catalog.settingSets.push({
              id: meta.id,
              title: parsed.title,
              characters: parsed.characters,
              worldview: {
                id: meta.sourceId,
                title: parsed.worldview.title,
                content: parsed.worldview.content,
              },
              storyFrame: parsed.storyFrame,
              savedAt: parsed.savedAt,
              meta,
              entryName: entry.name,
            });
          }
        } catch (error) {
          console.warn('[CP同人故事生成器] 设定集条目解析失败', error);
        }
        break;
      }
      case 'storyScheme': {
        try {
          const parsed = parseStorySchemeArchive(entry.content);
          const settingSetId =
            meta.settingSetId ??
            meta.sourceId ??
            (parsed?.设定集内容 ? findManagedEntryIdByContent(worldbook, 'settingSet', parsed.设定集内容) : null);
          if (parsed && settingSetId) {
            catalog.storySchemes.push({
              id: meta.id,
              ...parsed.故事基础条目,
              sourceSettingSetId: settingSetId,
              meta,
              entryName: entry.name,
            });
          }
        } catch (error) {
          console.warn('[CP同人故事生成器] 故事基础条目解析失败', error);
        }
        break;
      }
      case 'storyOutline': {
        try {
          const parsed = parseStoryOutlineArchive(entry.content);
          const schemeId =
            meta.schemeId ??
            meta.sourceId ??
            (parsed?.故事基础内容 ? findManagedEntryIdByContent(worldbook, 'storyScheme', parsed.故事基础内容) : null);
          const schemeEntryMeta = schemeId
            ? parseMeta(findEntryByKindOrId(worldbook, 'storyScheme', schemeId) ?? { extra: {} })
            : null;
          const settingSetId =
            meta.settingSetId ??
            schemeEntryMeta?.settingSetId ??
            schemeEntryMeta?.sourceId ??
            (parsed?.设定集内容 ? findManagedEntryIdByContent(worldbook, 'settingSet', parsed.设定集内容) : null);
          if (parsed && settingSetId && schemeId) {
            catalog.storyOutlines.push({
              id: meta.id,
              ...parsed.故事大纲条目,
              sourceSchemeId: schemeId,
              sourceSettingSetId: settingSetId,
              meta,
              entryName: entry.name,
            });
          }
        } catch (error) {
          console.warn('[CP同人故事生成器] 故事大纲条目解析失败', error);
        }
        break;
      }
      default:
        break;
    }
  }

  catalog.worldviews.sort((lhs, rhs) => rhs.meta.updatedAt.localeCompare(lhs.meta.updatedAt));
  catalog.settingSets.sort((lhs, rhs) => rhs.meta.updatedAt.localeCompare(lhs.meta.updatedAt));
  catalog.storySchemes.sort((lhs, rhs) => rhs.meta.updatedAt.localeCompare(lhs.meta.updatedAt));
  catalog.storyOutlines.sort((lhs, rhs) => rhs.meta.updatedAt.localeCompare(lhs.meta.updatedAt));
  return catalog;
}

async function saveEntry(kind: CpForgeKind, payload: {
  id?: string | null;
  name: string;
  content: string;
  sourceId?: string | null;
  settingSetId?: string | null;
  schemeId?: string | null;
  favorite?: boolean;
  enabled?: boolean;
}) {
  await ensureForgeWorldbook();
  const worldbook = await getWorldbook(CP_FORGE_WORLDBOOK_NAME);
  const existing = findEntryByKindOrId(worldbook, kind, payload.id);
  const presentation = buildEntryPresentation(kind, payload.name, payload.content, {
    favorite: payload.favorite ?? parseMeta(existing ?? { extra: {} })?.favorite ?? false,
  });
  if (existing) {
    const existingMeta = parseMeta(existing);
    const nextMeta = upsertMeta(existingMeta, {
      id: existingMeta?.id,
      kind,
      title: payload.name,
      favorite: payload.favorite ?? existingMeta?.favorite ?? false,
      sourceId: payload.sourceId ?? existingMeta?.sourceId ?? null,
      settingSetId: payload.settingSetId ?? existingMeta?.settingSetId ?? null,
      schemeId: payload.schemeId ?? existingMeta?.schemeId ?? null,
    });
    await updateWorldbookWith(
      CP_FORGE_WORLDBOOK_NAME,
      entries =>
        entries.map(entry =>
            entry.uid === existing.uid
            ? {
                ...entry,
                name: presentation.entryName,
                enabled: payload.enabled ?? entry.enabled,
                content: payload.content,
                strategy: {
                  ...entry.strategy,
                  keys: presentation.keys,
                },
                extra: { ...(entry.extra ?? {}), cpForge: nextMeta },
              }
            : entry,
        ),
      { render: 'none' },
    );
    return nextMeta;
  }

  const newMeta = buildMeta(kind, payload.name, {
    id: payload.id ?? undefined,
    sourceId: payload.sourceId ?? null,
    settingSetId: payload.settingSetId ?? null,
    schemeId: payload.schemeId ?? null,
    favorite: payload.favorite ?? false,
  });
  const nextEntry = buildEntry(kind, payload.name, payload.content, newMeta);
  nextEntry.enabled = payload.enabled ?? false;
  await createWorldbookEntries(CP_FORGE_WORLDBOOK_NAME, [nextEntry], { render: 'none' });
  return newMeta;
}

export function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) {
    return null;
  }
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

export function randomName(pool: Record<NameStyle, string[]>, style: NameStyle): string {
  return pickRandom(pool[style]) ?? '';
}

export async function saveTags(tags: string[]) {
  const normalized = _.uniq(
    tags
      .map(tag => tag.trim())
      .filter(Boolean)
      .sort((lhs, rhs) => lhs.localeCompare(rhs, 'zh-CN')),
  );
  await saveEntry('tags', {
    name: 'Tags库',
    content: literalYamlify(normalized),
  });
}

function deriveWorldviewTitle(draft: SettingDraft) {
  return draft.worldviewTitle.trim() || `${getPairingFromDraft(draft)}-世界观`;
}

export async function saveWorldviewSnapshot(draft: SettingDraft): Promise<WorldviewSnapshot> {
  const content = draft.worldviewText.trim();
  if (!content) {
    return WorldviewSnapshotSchema.parse({ id: null, title: '', content: '' });
  }

  const title = deriveWorldviewTitle(draft);
  const meta = await saveEntry('worldview', {
    id: draft.worldviewId,
    name: title,
    content,
  });
  return WorldviewSnapshotSchema.parse({
    id: meta.id,
    title,
    content,
  });
}

export async function saveSettingSet(draftInput: SettingDraft, mode: 'create' | 'replace'): Promise<SettingSet> {
  const draft = SettingDraftSchema.parse(draftInput);
  const pairing = getPairingFromDraft(draft);
  const worldview = await saveWorldviewSnapshot(draft);
  const title = deriveSettingSetTitle(pairing, worldview.title || deriveWorldviewTitle(draft));
  const payload: SettingSet = SettingSetSchema.parse({
    id: mode === 'replace' && draft.loadedSettingSetId ? draft.loadedSettingSetId : uuidv4(),
    title,
    characters: {
      roleA: draft.roleA,
      roleB: draft.roleB,
    },
    worldview,
    storyFrame: draft.storyFrame,
    savedAt: nowIso(),
  });

  await saveEntry('settingSet', {
    id: mode === 'replace' ? draft.loadedSettingSetId : null,
    name: title,
    content: serializeSettingSetContent(payload),
    sourceId: worldview.id,
  });
  return payload;
}

export async function saveOutline(outlineInput: StoryOutline): Promise<StoryOutline> {
  const outline = StoryOutlineSchema.parse(outlineInput);
  const settingSetContent = await getManagedEntryContent(
    'settingSet',
    outline.sourceSettingSetId,
    serializeSettingSetContent({
      title: '未命名设定集',
      characters: {
        roleA: createEmptyCharacter(),
        roleB: createEmptyCharacter(),
      },
      worldview: {
        title: '',
        content: '',
      },
      storyFrame: StoryFrameSchema.parse({}),
      savedAt: nowIso(),
    }),
  );
  const storySchemeContent = await getManagedEntryContent(
    'storyScheme',
    outline.sourceSchemeId,
    serializeStorySchemeContent('', {
      title: outline.title,
      pairing: outline.pairing,
      summary: '原故事基础条目缺失，已用当前大纲信息生成兜底快照。',
      tags: outline.tags,
      totalChapters: outline.chapters.length,
      wordsPerChapter: 1200,
      ending: outline.ending,
      worldviewSummary: outline.worldviewSummary,
      generatedAt: outline.savedAt,
    }),
  );
  await saveEntry('storyOutline', {
    id: outline.id,
    name: outline.title,
    content: serializeStoryOutlineContent(settingSetContent, storySchemeContent, outline),
    sourceId: outline.sourceSchemeId,
    settingSetId: outline.sourceSettingSetId,
    schemeId: outline.sourceSchemeId,
  });
  return outline;
}

export async function setSchemeFavorite(schemeId: string, favorite: boolean) {
  await ensureForgeWorldbook();
  await updateWorldbookWith(
    CP_FORGE_WORLDBOOK_NAME,
    entries =>
      entries.map(entry => {
        const meta = parseMeta(entry);
        if (!meta || meta.kind !== 'storyScheme' || meta.id !== schemeId) {
          return entry;
        }
        const presentation = buildEntryPresentation('storyScheme', meta.title, entry.content, { favorite });
        return {
          ...entry,
          name: presentation.entryName,
          strategy: {
            ...entry.strategy,
            keys: presentation.keys,
          },
          extra: {
            ...(entry.extra ?? {}),
            cpForge: {
              ...meta,
              favorite,
              updatedAt: nowIso(),
            },
          },
        };
      }),
    { render: 'none' },
  );
}

export async function setSelectedOutlineEnabled(outlineId: string | null) {
  await ensureForgeWorldbook();
  await updateWorldbookWith(
    CP_FORGE_WORLDBOOK_NAME,
    entries =>
      entries.map(entry => {
        const meta = parseMeta(entry);
        if (!meta || meta.kind !== 'storyOutline') {
          return entry;
        }
        return {
          ...entry,
          enabled: outlineId !== null && meta.id === outlineId,
        };
      }),
    { render: 'none' },
  );
}

function buildSchemesPrompt(settingSet: SettingSet, existingTitles: string[]) {
  return {
    system: dedent`
      你是一个擅长设计 CP 同人故事方案的策划编辑。
      请严格返回 JSON 数组，不要输出 Markdown，不要写解释。
      JSON 数组长度必须为 4。
      每个对象字段固定为:
      {
        "title": "故事标题",
        "summary": "80到180字的简介",
        "tags": ["标签1", "标签2"],
        "totalChapters": 12,
        "wordsPerChapter": 1800,
        "ending": "HE"
      }
      约束:
      - 4 个方案必须明显不同，题材、冲突核心、情绪方向不能重复
      - title 不要与 existingTitles 重复
      - tags 使用简短中文词组，2 到 6 个
      - ending 只能是 HE、BE、OE
      - totalChapters 为 4 到 32 的整数
      - wordsPerChapter 为 600 到 5000 的整数
      - summary 要聚焦 CP 关系推进与核心矛盾
    `,
    user: literalYamlify({
      existingTitles,
      settingSet,
    }),
  };
}

export async function generateStorySchemes(settingSet: SettingSet, existingTitles: string[]): Promise<StoryScheme[]> {
  const prompt = buildSchemesPrompt(settingSet, existingTitles);
  const raw = await generateRaw({
    should_silence: true,
    ordered_prompts: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
  });
  const parsed = GeneratedSchemesResponseSchema.parse(parseString(raw));
  const pairing = getPairingFromDraft(draftFromSettingSet(settingSet));
  const worldviewSummary = summarizeWorldview(settingSet.worldview.content, settingSet.worldview.title);

  const schemes: StoryScheme[] = parsed.map(item =>
    StorySchemeSchema.parse({
      id: uuidv4(),
      title: item.title,
      pairing,
      summary: item.summary,
      tags: item.tags,
      totalChapters: item.totalChapters,
      wordsPerChapter: item.wordsPerChapter,
      ending: item.ending,
      worldviewSummary,
      sourceSettingSetId: settingSet.id,
      generatedAt: nowIso(),
    }),
  );

  const settingSetContent = await getManagedEntryContent('settingSet', settingSet.id, serializeSettingSetContent(settingSet));

  for (const scheme of schemes) {
    await saveEntry('storyScheme', {
      id: scheme.id,
      name: scheme.title,
      content: serializeStorySchemeContent(settingSetContent, scheme),
      sourceId: scheme.sourceSettingSetId,
      settingSetId: scheme.sourceSettingSetId,
      favorite: false,
    });
  }
  return schemes;
}

function buildOutlinePrompt(scheme: StoryScheme, settingSet: SettingSet) {
  return {
    system: dedent`
      你是一个擅长拆解长篇 CP 同人故事节奏的编辑。
      请严格返回 JSON 对象，不要输出 Markdown，不要写解释。
      JSON 格式固定为:
      {
        "title": "故事标题",
        "chapters": [
          { "title": "章节标题", "summary": "章节简介" }
        ]
      }
      约束:
      - chapters 数量必须等于 totalChapters
      - 每章 summary 使用 40 到 140 字概述关键事件、关系推进和情绪落点
      - 节奏要递进，后期章节必须承接前期伏笔
      - 结局必须符合 ending 要求
      - 输出语言为简体中文
    `,
    user: literalYamlify({
      scheme,
      settingSet,
    }),
  };
}

export async function generateStoryOutline(scheme: StoryScheme, settingSet: SettingSet): Promise<StoryOutline> {
  const prompt = buildOutlinePrompt(scheme, settingSet);
  const raw = await generateRaw({
    should_silence: true,
    ordered_prompts: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ],
  });
  const parsed = GeneratedOutlineResponseSchema.parse(parseString(raw));
  return StoryOutlineSchema.parse({
    id: uuidv4(),
    title: parsed.title,
    pairing: scheme.pairing,
    ending: scheme.ending,
    tags: scheme.tags,
    worldviewSummary: scheme.worldviewSummary,
    sourceSchemeId: scheme.id,
    sourceSettingSetId: scheme.sourceSettingSetId,
    chapters: parsed.chapters.map((chapter, index) => ({
      index: index + 1,
      title: chapter.title,
      summary: chapter.summary,
    })),
    savedAt: nowIso(),
  });
}

function buildStoryControlMessage(outline: StoryOutline, settingSet: SettingSet): string {
  return dedent`
    [CP同人故事生成器-大纲控制]
    你正在连载一篇 CP 同人故事，必须严格遵守以下设定继续创作。
    - 标题: ${outline.title}
    - 配对: ${outline.pairing}
    - 结局要求: ${outline.ending}
    - 世界观摘要: ${outline.worldviewSummary || summarizeWorldview(settingSet.worldview.content, settingSet.worldview.title)}
    - 选用标签: ${outline.tags.join(' / ') || '无'}
    - 当前连载规则:
      1. 当前聊天第一次由你创作第 1 章。
      2. 之后只要用户明确说“下一章”“继续”“继续写”，就按大纲顺序续写下一章。
      3. 已经写过的章节不要重写，不要跳章，不要打乱顺序。
      4. 每章正文要像正式小说章节，不要输出提纲式条列。
      5. 章节标题与章节内容必须对应，情绪推进、伏笔回收和结局走向都要服从大纲。
      6. 除非用户要求，不要跳出故事解释你的规划。
    - 世界观完整快照:
    ${settingSet.worldview.content || '未额外提供。'}

    - 章节大纲:
    ${literalYamlify(outline.chapters)}
  `.trim();
}

function buildChapterRequest(outline: StoryOutline, chapterIndex: number): string {
  const chapter = outline.chapters[chapterIndex];
  return dedent`
    请直接创作第 ${chapter.index} 章《${chapter.title}》。
    严格遵循该章简介:
    ${chapter.summary}

    要求:
    - 直接输出小说正文，不要解释
    - 标题可以保留“第X章：标题”样式
    - 与前文情绪和人物关系保持连续
  `.trim();
}

export async function startStoryFromOutline(outline: StoryOutline, settingSet: SettingSet): Promise<string> {
  await createChatMessages(
    [
      {
        role: 'system',
        is_hidden: true,
        message: buildStoryControlMessage(outline, settingSet),
      },
    ],
    { refresh: 'affected' },
  );

  const chapterText = await generateRaw({
    should_silence: true,
    ordered_prompts: ['chat_history', { role: 'user', content: buildChapterRequest(outline, 0) }],
  });

  await createChatMessages(
    [
      {
        role: 'assistant',
        message: chapterText,
      },
    ],
    { refresh: 'affected' },
  );

  return chapterText;
}

export function getChatUiState(): UiState {
  return sanitizeUiState(_.get(getVariables({ type: 'chat' }), 'cpForge.ui'));
}

export function setChatUiState(state: UiState) {
  updateVariablesWith(variables => _.set(variables, 'cpForge.ui', UiStateSchema.parse(state)), { type: 'chat' });
}

export function getChatRuntimeState(): RuntimeState {
  return sanitizeRuntimeState(_.get(getVariables({ type: 'chat' }), 'cpForge.runtime'));
}

export function setChatRuntimeState(state: RuntimeState) {
  updateVariablesWith(variables => _.set(variables, 'cpForge.runtime', RuntimeStateSchema.parse(state)), { type: 'chat' });
}

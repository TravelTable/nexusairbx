# Nexus Library

## Purpose

The Nexus Library is a backend-only, curated knowledge layer for one-prompt Roblox generation. Its job is to give the agent reusable design structure before it writes or applies anything: how a world should be laid out, how a gameplay loop should be divided, how feedback should feel, and how the result should be checked.

The library stores small, composable patterns rather than finished games. A request such as “make a polished mining simulator” should be able to combine a world grammar, progression system, UI-motion language, animation timing, audio cues, VFX intent, and verification recipes without copying one fixed simulator template. The long-term knowledge surface includes:

- building components, building grammars, layouts, terrain, and world patterns;
- reusable gameplay systems and verification recipes;
- UI motion, character or prop animation, audio cues, VFX, camera, and combined feel packages;
- image-generation recipes for UI icons, thumbnails, textures, and other appropriate visual assets; and
- metadata-only references that help discovery without granting reuse rights.

The initial seed does not cover every surface equally. It currently contains building components, building/world/layout, gameplay, verification, UI-motion, animation, audio-cue, VFX, image-generation, and feel-package knowledge. It also carries licensed animation asset references in a guarded candidate tier. Those references prove the ingestion and provenance path, but are withheld from normal agent retrieval until Roblox retargeting and Studio playback verification are complete. The presence of a media recipe or asset reference does not mean its generation provider, retargeter, publisher, or import pipeline is already connected.

The existing asset generator is image-only. Audio and 3D-model generation requests are rejected before an asset record is created or the image provider is invoked. A sound model should be added as a separately permissioned provider with its own output validation, rights record, cost tracking, Roblox publication flow, and durable asset identity; it must not share the image route merely because both are described as assets.

Nothing in this subsystem changes the Nexus UI.

## Current first slice

The first slice is intentionally read-only from the agent's point of view. `NexusLibraryService` loads curated JSON, validates it, retrieves eligible records, and builds a bounded context block. It does not execute library data, mutate a Roblox place, import marketplace binaries, or automatically apply a selected pattern.

The bundled catalog has 116 immutable revisions in five seed files. Seventy original NexusRBX records are agent-eligible; 46 externally sourced animation references remain ineligible candidates:

| Seed file | Entries | Coverage |
| --- | ---: | --- |
| `building-and-world.v1.json` | 15 | Building grammars, layouts, and world patterns |
| `gameplay-and-verification.v1.json` | 21 | Gameplay systems and verification recipes |
| `motion-and-feel.v1.json` | 16 | UI motion, animation, audio cues, and feel packages |
| `visual-and-building-components.v1.json` | 18 | Image-generation recipes, VFX patterns, and modular building components |
| `cc0-animation-references.v1.json` | 46 | CC0 glTF clip references awaiting Roblox rig retargeting and Studio verification |

Each entry is bounded, non-executable JSON. The service rejects a fixed denylist of executable or instruction-bearing blueprint keys, HTTP(S), data, and JavaScript URL strings, excessive nesting, oversized arrays or objects, non-finite numbers, and oversized serialized records. Retrieved context explicitly labels records as design data rather than instructions.

## Entry model

Within a loaded catalog, an entry is an immutable logical revision identified by:

- `id`: stable logical identity;
- `version`: author-assigned revision version;
- `revisionId`: immutable revision label;
- `contentHash`: hash of the normalized record; and
- `schemaVersion`: the library schema version.

Design and retrieval fields include `kind`, `domains`, `tags`, `intents`, `styles`, `compositionGroup`, `familyId`, `summary`, `blueprint`, `novelty`, `validation`, and `compatibility`. `blueprint` is structured design data, not Luau, JavaScript, commands, remote prompts, or URLs.

Two entries with the same `id@version` but different content hashes are a revision collision. The loader rejects the conflicting revision instead of silently replacing it. When several valid versions share an `id`, the service chooses the active revision by agent eligibility, quality tier, source trust, and then version. Older accepted revisions remain addressable while they are present in the loaded seed set or active generated catalog. Durable history across generated-catalog pointer changes is roadmap work.

## Provenance, rights, and eligibility

Provenance and quality are separate. A useful-looking entry is not agent-eligible until its source and reuse rights pass policy.

Every source records at least:

- a stable `sourceId` and source `type`;
- the source name and optional author;
- a license identifier and `licenseStatus`;
- optional license-evidence location and evidence hash;
- optional source URL, source revision, and content hash; and
- explicit rights, including allowed uses, attribution, metadata-only status, and an optional notice.

The rights vocabulary is capability-based:

- `copy_and_transform`
- `redistribute_in_roblox_game`
- `metadata_index_only`
- `style_traits_only`
- `platform_reference_only`
- `benchmark_only`

Materialization requires both `copy_and_transform` and `redistribute_in_roblox_game`. Metadata-only records cannot be materialized. Unknown, revoked, incomplete, or unsupported rights fail closed into an ineligible tier.

The quality tiers are:

| Tier | Meaning | Default agent use |
| --- | --- | --- |
| `nexus_gold` | Project-owned or user-owned, verified, reviewed knowledge | Eligible |
| `verified_permissive` | Third-party material with allowlisted permissive rights and complete evidence | Eligible |
| `platform_reference` | Official catalog or reference metadata with no implied binary reuse | Not included in normal agent retrieval |
| `candidate` | Ingested or authored material awaiting review/promotion | Not included |
| `quarantine` | Invalid, unsafe, rights-incomplete, revoked, or policy-blocked material | Never included |

For verified open-source content, the current allowlist is CC0, CC BY 3.0/4.0, MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, and ISC. License evidence and its hash are required before the service can classify imported open-source material as `verified_permissive`. Attribution requirements and notices remain attached to the source record. A license name alone is not sufficient evidence.

The evidence hash must be a complete `sha256:` value. Hash-pinned active generated catalogs are still forced to `candidate` regardless of an entry's requested tier or source type; generated data cannot promote itself. Promotion currently requires reviewed migration into a repository-controlled, non-candidate seed. A future signed review channel may replace that manual boundary.

### License evidence for the bundled seed

The four bundled seed documents are original NexusRBX project-authored design records. For library-ingestion purposes, this section is the repository's license-evidence statement for these source IDs:

- `nexusrbx-original-building-v1`
- `nexusrbx-original-gameplay-verification-v1`
- `nexusrbx-original-motion-feel-v1`
- `nexusrbx-original-visual-building-components-v1`

They are declared `LicenseRef-NexusRBX-Project-Owned`, with permission to copy and transform the records and redistribute resulting implementations in Roblox games. Attribution is not required by the library record. This declaration applies to the original JSON design knowledge in those seed documents; it does not grant rights to unrelated Roblox assets, third-party source material, trademarks, or content merely mentioned by a generated game.

The candidate animation collection uses source ID `quaternius-ual1-free-gltf` for Quaternius's Universal Animation Library free glTF edition. The importer verified `CC0-1.0` against the `LICENSE` entry inside archive revision `sha256:813d53f689f90dbef64645c06feb48f9cbf78ffe758cf68fc04a2a720868debd`; that exact evidence has hash `sha256:a2010f343487d3f7618affe54f789f5487602331c0a8d03f49e9a7c547cf0499`. Each candidate also retains the glTF binary fingerprint and animation index. License verification allows evaluation and transformation, but does not establish Roblox rig compatibility, acceptable retargeting, or successful Studio publication, so these records remain `candidate` and unavailable to the agent by default. The source manifest pins the approved archive hash even though the mirror URL itself points at a mutable branch.

Before promotion, animation validation must reparse each glTF and fingerprint its complete dependency closure, including referenced buffer bytes such as external `.bin` keyframe payloads. Promotion also requires R15 retargeting and observed Studio playback; the current JSON fingerprint alone is intentionally not treated as sufficient motion evidence.

## Loading and publication

Seed files under `backend/data/nexus-library/seed/` are repository-controlled inputs, but each record's declared source, license, evidence, rights, and requested tier are still evaluated independently. Generated catalogs, when present, are not discovered by scanning and trusting every file. The service follows `backend/data/nexus-library/active.json`, which must name a file under the generated root and provide its exact `sha256:` hash. Path containment and the raw file hash are verified before JSON is accepted.

The CC0 animation seed is deterministically derived from `backend/data/animation-library/catalog.generated.json` by `backend/scripts/exportAnimationClipsToNexusLibrary.js`. The upstream animation importer defaults to dry-run, enforces download and archive-expansion budgets, checks the pinned archive hash, records the exact license-entry path, license-evidence hash, glTF hash, and clip index, retains immutable catalog runs, and atomically replaces the canonical catalog only after its publication gates pass. The exporter re-hashes cached archive, binary, and license bytes before writing a seed; a clean-clone freshness check can compare the pinned catalog and seed without the ignored cache by omitting `--verify-cache`.

The present external corpus contains 46 clips against a configured 150-clip target. It was published only with the explicit `--allow-below-target` acknowledgement and remains candidate-only. Both the exporter and the library loader enforce the collection-level candidate ceiling, so changing an individual entry's requested tier cannot promote it. This is a narrow ingestion proof, not yet the general-purpose remote pipeline described below.

This pointer is the publication boundary:

1. An importer writes a new immutable catalog file to staging or the generated directory.
2. Validation, provenance, rights, size limits, deduplication, and evaluation run before publication.
3. The importer computes the hash of the exact bytes to be published.
4. Only a successful run replaces `active.json` with the new filename and hash.
5. If the pointer is malformed, escapes the generated root, names a missing file, has a hash mismatch, or contains invalid JSON, the generated catalog is ignored and reported as rejected.

There is currently no general-purpose remote importer that completes all five steps. The reader enforces the fail-closed publication boundary now; future ingestion jobs must preserve it. Dry-run should remain the default for new importers, and activation must be an explicit final operation.

## Creator Store policy

Roblox Creator Store records may be indexed as `platform_reference` metadata to help the agent find concepts or asset identifiers. Indexing a public listing does not establish permission to copy, rehost, transform, or redistribute the underlying binary.

Therefore Creator Store integration must:

- retain the Roblox asset identifier, listing URL, creator attribution, type, and other permitted metadata;
- mark the record metadata-only with `platform_reference_only` and/or `metadata_index_only` rights;
- keep it out of materializable retrieval unless a separate, verifiable rights grant exists;
- use a service-owned credential for catalog collection rather than a user's Studio OAuth token; and
- avoid claiming exhaustive coverage when the upstream search API itself requires query or creator scopes.

The first slice does not download or rehost Creator Store binaries.

### Current 3D object and Creator Store corpus

The backend now carries four separate model catalogs with deliberately different trust semantics:

- `backend/data/model-library/kenney-3d.catalog.json` contains 4,390 distinct GLB objects discovered across 50 official Kenney 3D packs. Every pack archive is pinned in `kenney-3d.sources.lock.json`; the importer verifies an in-archive CC0 notice, records archive/file/evidence SHA-256 values, and parses each GLB before publication. Of these objects, 3,491 currently fit the automatically measurable Roblox gates: no parsed mesh primitive above 20,000 triangles, less than 20 MB, static/unskinned, and no obvious multi-material-per-mesh split. They are `verified_permissive` references, but still require Studio import checks for normals, watertightness, UVs, texture behavior, scale, pivot, collision, moderation, and scene-level performance. The remaining 899 stay `candidate`.
- `backend/data/model-library/quaternius-weapons.catalog.json` adds 64 CC0 weapons from two author-controlled Quaternius packs: 24 medieval weapons and shields plus 40 modern firearms. Each record pairs a Roblox-uploadable FBX with a same-named OBJ used for deterministic geometry inspection, pins both SHA-256 hashes and the in-pack license evidence, and keeps the local source artifacts in the ignored model cache. All 64 currently fit the parsed 20,000-triangle-per-object and 20 MB upload gates, but still require a Studio import-equivalence, scale, pivot, grip, collision, material, and moderation check.
- `backend/data/model-library/roblox-verified-weapons.catalog.json` adds 1,895 deduplicated weapon listings returned by 14 bounded Creator Store searches across verified non-Roblox creators. It covers blades, heavy melee, polearms, archery, sidearms, rifles, shotguns, sniper rifles, submachine guns, blasters, and launchers. These records retain asset IDs, creator identity, votes, geometry summaries, executable-descendant counts, sandbox signals, and discovery terms. They are always `platform_reference` and metadata-only: verified-creator status is not treated as a code-safety, originality, or quality guarantee.
- `backend/data/model-library/roblox-official.catalog.json` contains all 941 Model results returned for the verified Roblox user account at the time of the pinned run. This includes 405 records classified as systems, modules, tools, templates, or otherwise executable-capable. The records retain IDs, creator verification, categories, geometry summaries, vote signals, script/instance counts, and sandbox signals. Their Nexus projections are always `platform_reference`, metadata-only, and non-materializable. No Creator Store binary is downloaded or committed.

The cache under `backend/data/model-library/cache/` is intentionally untracked. It supports local hash verification and later upload/import work without turning the source repository into a multi-gigabyte asset host. Normal syncs reuse the locked bytes. A `node scripts/syncKenney3dLibrary.js --refresh --write` run re-fetches upstream and fails on a changed archive; accepting reviewed upstream changes requires the explicit `--accept-source-updates` flag and a lockfile diff review.

The sync commands are:

```powershell
cd backend
npm run models:sync-cc0
npm run models:sync-weapons
npm run models:sync-roblox-weapons
npm run models:sync-roblox-official
npm run models:query -- "medieval castle door" 8
npm run models:query -- platform "sword system" 8
```

Both importers are bounded by host allowlists, request timeouts, page/entry limits, archive and decompression budgets, atomic JSON writes, exact source hashes, and dry-run defaults when invoked directly without `--write`.

## Retrieval and anti-generic behavior

Search is deterministic, bounded, and explainable. It tokenizes the request, expands a small Roblox-oriented alias vocabulary, and scores matches across names, tags, intents, kind/domain/style classification, summaries, and blueprint data. Curated quality contributes to ranking, but cannot make an unrelated entry match a non-empty query.

Selection then applies greedy diversity reranking. Repeated composition groups, families, and sources receive increasing penalties, so a context set is more likely to contain complementary systems than several near-duplicate templates. Callers can also provide:

- `excludeIds` to prohibit specific entries;
- `recentIds` to down-rank patterns used recently;
- filters for kind, domain, tier, license, rights, style, rig, platform, and materializability; and
- a stable seed for deterministic tie-breaking.

Novelty is part of the data model rather than a final “make it unique” instruction. Each curated record can declare variation axes, known generic failure modes to avoid, and remix rules. The intended composition sequence is:

1. retrieve several complementary patterns;
2. preserve their invariants and validation criteria;
3. vary their declared axes using the game's theme, audience, scale, and mechanics;
4. avoid combining every optional feature; and
5. verify the assembled result against both system-specific and cross-cutting recipes.

Recent-use memory is deliberately limited today. A caller can supply recent IDs for one retrieval, but the current integrations do not automatically retain that history across calls, agent runs, machines, or deployments.

## Agent boundary

The supported first-slice interaction is retrieval and context assembly:

- search returns a safe summary plus immutable reference and content hash;
- reading an entry requires both the immutable reference and the exact `contentHash` returned by search, then checks eligibility;
- context assembly includes only eligible entries, stops at entry and character limits, and carries provenance into the text; and
- the model is expected to compose the records into a plan or implementation using existing, separately authorized Studio tools.

`StudioAgentService` exposes `search_nexus_library` and `read_nexus_library_entry` as backend read tools only for direct legacy Studio-agent runs whose catalog revision can be pinned at creation. Canonical task-runtime generation does not place live library tools in its capability snapshot. Instead, `AgentContextAssembler` detects relevant building, gameplay, motion, sound, image, VFX, and verification intent and seals a bounded retrieval result into the immutable task context before execution.

Canonical Studio launches persist their trusted Task ID plus the exact context- and capability-snapshot IDs into the Studio run. They reload that exact context, require the Task's current pointers to match the queued binding, compare its sealed library revision with the process catalog at launch, and then use only the preselected library context. Live library tools remain disabled for the canonical run, so a resumed run cannot mix sealed context from one catalog with retrieval from another. Direct legacy Studio runs pin the live catalog at creation, reject a changed catalog before each search or read, and check that every tool result reports the same revision. Caller-supplied canonical linkage fields are stripped before the server-owned link is created.

The older animation-planning service follows the same quarantine rule: normal searches expose only reviewed project-owned procedural clips. Generated CC0 clips are visible only through its explicit internal review catalog, with `agentUsable: false`; a candidate ID collision cannot replace a reviewed clip.

For a canonical task-linked artifact job, the trusted `taskRuntimeLink` carries the exact context- and capability-snapshot IDs that existed when the job was queued. The worker reloads those exact immutable snapshots and fails closed if either is missing or if a checkpoint restore has since moved the Task pointers. It does not replace sealed example or library text with worker-time retrieval. In the legacy prompt fallback, retrieved library and example text is carried in a clearly labeled untrusted user-data message rather than interpolated into a system message.

Library selection does not authorize a Studio write. In particular, a building grammar is currently knowledge about spatial organization and constraints, not an executable building command. The agent must still use the existing Studio protocol, honor snapshots and source hashes where required, and validate any resulting artifact.

## Verification

Changes to the service or seed data should verify all of the following:

- every seed file parses as JSON and reports its expected entry count;
- all 4,390 CC0 model references retain archive, file, and license-evidence hashes; the 3,491 automatically budget-compatible static GLBs normalize as `verified_permissive`, while 899 remain `candidate`;
- all 64 dedicated CC0 weapon references retain paired FBX/OBJ and license-evidence hashes, pass the parsed Roblox geometry/upload gates, and normalize as `verified_permissive`;
- all 1,895 verified-creator Creator Store weapon listings normalize as metadata-only `platform_reference` records and retain their script/sandbox signals without downloading binaries;
- all 941 official Roblox Creator Store records normalize as metadata-only `platform_reference`, including executable-descendant signals for system-style models, and no record contains a downloaded binary;
- all 70 project-authored records normalize as `nexus_gold` and are agent-eligible;
- all 46 licensed animation references retain exact evidence hashes, normalize as `candidate`, and are excluded from normal agent retrieval;
- legacy animation search also excludes generated candidates and preserves reviewed clips on ID collision;
- malformed provenance, rights, executable blueprint data, path traversal, and hash mismatch fail closed;
- a generated candidate cannot override a trusted active seed revision;
- generated open-source content cannot self-promote, and malformed evidence hashes remain ineligible;
- canonical task-linked jobs use only their queued context/capability snapshots and fail if either snapshot is unavailable or the Task pointers changed;
- canonical Studio runs retain their exact Task/context/capability identity, require their sealed catalog at launch, and never expose live library tools;
- direct legacy Studio runs pin the live catalog and refuse mid-run catalog changes;
- revision collisions are reported rather than overwritten;
- search honors filters, exclusions, recent-use penalties, deterministic seeding, and diversity;
- context output stays within its configured character and entry limits; and
- backend syntax and the relevant service tests pass.

The focused commands are:

```powershell
node --check backend/src/services/library/NexusLibraryService.js
node backend/scripts/exportAnimationClipsToNexusLibrary.js --check --allow-below-target
node backend/scripts/exportAnimationClipsToNexusLibrary.js --check --allow-below-target --verify-cache
node --test backend/src/services/library/AnimationLibraryIngestion.test.js backend/src/services/library/NexusLibraryService.test.js backend/src/lib/nexusLibraryTools.test.js
node --test backend/scripts/syncKenney3dLibrary.test.js backend/scripts/syncQuaterniusWeaponLibrary.test.js backend/scripts/syncRobloxCreatorStoreLibrary.test.js backend/scripts/syncRobloxWeaponReferenceLibrary.test.js backend/src/services/library/ModelLibraryIngestion.test.js
node --test backend/src/services/animation/AnimationLibraryService.test.js backend/src/services/StudioAgentService.test.js backend/src/services/artifactRunLauncher.test.js backend/src/services/taskRuntime/ArtifactTaskRuntimeFacade.test.js
```

If a change touches the Studio protocol or its execution path, also run the protocol tests and the broader validation sequence in `AGENTS.md`. A backend-only library change does not require a UI redesign.

## Known limits

The current implementation is deliberately smaller than the final product vision:

- retrieval is weighted lexical matching, not embedding or learned semantic search;
- JSON files are loaded into process memory and cached; the current 5,447-record catalog loads successfully, but a database-backed immutable index is still required before the 10,000-plus-revision target;
- there is no universal, resumable remote-ingestion worker or review console;
- Creator Store records are intentionally metadata-only; insertion still requires a fresh server-side lookup plus the existing sanitized Studio import command;
- CC0 GLBs are locally cached and retrievable as design references, but the agent does not yet have a single transactional tool that resolves a catalog revision, uploads that exact binary to Roblox, waits for moderation, inserts it, and records the final Studio receipt;
- no library entry directly applies a change to Studio;
- building grammars do not yet compile into `NativeModelSpec`;
- image generation exists in the separate asset platform, but library recipes are not yet orchestrated into that tool automatically for a mixed game-building prompt;
- no sound-generation provider is configured, and audio requests fail explicitly instead of being misrouted through image generation;
- animation and UI-motion patterns describe behavior, while the licensed clip candidates still need full glTF dependency hashing, Roblox-specific retargeting, verification, and publication; and
- usage history and diversity state are not yet a durable cross-run service.

## Roadmap to 10,000+ revisions

Scaling should preserve the same trust boundary rather than weakening it:

1. **Immutable ingestion records.** Record each source, source revision, ingest run, object hash, entry revision, evaluation, tombstone, and eligibility projection separately. Jobs must be resumable, rate-limited, size-limited, and dry-run capable.
2. **Review and promotion.** Keep new material in `candidate` or `quarantine`; promote only after automated checks and, where policy requires, human rights review. Never infer reuse permission from availability.
3. **Versioned indexes.** Build a content-addressed lexical/vector index from eligible immutable revisions, verify counts and hashes, then atomically move the active pointer. Rollback should mean repointing to a previous verified index, not rewriting history.
4. **Hybrid retrieval.** Combine structured filters, lexical matches, embeddings, and quality signals. Apply MMR-style diversity, family caps, recent-use penalties, and theme-specific novelty axes after relevance scoring.
5. **Deterministic building composition.** Compile selected building and layout grammars into bounded `NativeModelSpec` previews, validate instance and BasePart limits, and only then hand the preview to the existing `build_native_model` authorization path. Initial support should create new managed builds; patching arbitrary existing builds needs stronger plugin semantics first.
6. **Real media tools.** Add separately permissioned sound, image, animation, UI-motion, and VFX generation tools. Persist provider, prompt/spec hash, output hash, cost, rights, Roblox publication identifiers, and verification results for every artifact.
7. **Evaluation loops.** Measure structural validity, performance budgets, mobile/console behavior, visual and sonic coherence, originality distance, and playtest outcomes. Use results to rank revisions without mutating their original records.
8. **Durable usage memory.** Track which entries and families were used per project and recent generation window, with bounded retention and explicit project isolation, so large catalogs produce meaningful variation instead of a new dominant template.

At scale, the library should remain a source of composable evidence and constraints. The agent may be creative in assembling it, while ingestion, rights, publication, and Studio mutation remain explicit, inspectable boundaries.

# Workspace projects (Phase 2)

Date: 2026-07-20

## Decision

Organize AI chats under durable **workspace projects** stored in
`users/{uid}/projectBindings/{projectId}` (Prompt 1 `ProjectIdentity`), not
retention Quick Script projects and not a fifth project type.

## Shape (v1)

```js
{
  schemaVersion: 1,
  ownerUid,
  projectId,
  title,
  chatNamespaceId,     // equals projectId in v1
  universeId,          // optional until Studio attestation
  defaultPlaceId,      // Studio place bound at create / later
  placeId,             // mirror of defaultPlaceId for existing readers
  attachedPlaceIds: [],
  bindingVersion: 1,
  status: "draft" | "verified",
  studioTargetId,      // optional opaque hybrid target id
  studioTargetLabel,
  createdAt,
  updatedAt,
}
```

## Product rules

- Sidebar: Projects → Chats. Creating a chat requires a selected project.
- New project may bind `defaultPlaceId` from live Studio targeting.
- New chats inherit `projectId` and copy the project's Studio place into
  `studioTargetPreference` when present.
- Legacy chats without `projectId` appear under **Unassigned**.

## Explicit follow-up (not in this slice)

Asset scoping still uses **chatId as projectId**
(`selectedAssetProjectId = chat.currentChatId`, `ProjectAssetService`).
Migrating assets onto binding `projectId` is deferred so this slice does not
break Creator Store / project assets.

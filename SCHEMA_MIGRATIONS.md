# Database Schema Migrations

This document explains how the app handles database schema changes to ensure a fail-proof user experience.

## How It Works

### Automatic Schema Versioning

The app uses a **schema versioning system** that automatically detects and handles data structure changes:

1. **Version Tracking**: Current schema version is stored in `CURRENT_SCHEMA_VERSION` constant in `src/services/db.ts`
2. **Automatic Validation**: On app startup, the database validates all stored data against the current schema
3. **Migration or Reset**: If data doesn't match the schema, the app either migrates it or resets the database

### Schema Version History

- **v1**: Initial schema (Dades): `sectors` (`id, order`), `repositoris`
  (`id, sectorId, updatedAt`), `referencies` (`id, repositoriId`) and
  `attachments` (`id, referenciaId, repositoriId`) storing image/PDF `Blob`s.
  Attachments cascade-delete with their referència/repositori/sector and travel
  through JSON export as base64 (`AttachmentExport.dataBase64`).

> Nota: la numeració recomença a v1. L'historial v1–v6 de SceneScript és al
> repo original (`AlexArtazcoz/scenescript`); aquí no aplica perquè la base de
> dades és nova (`DadesDB`) i cap navegador té dades velles a migrar.

## Making Schema Changes

When you need to modify the data structure:

### 1. Update the Types

Edit `src/types/index.ts` to add/modify fields:

```typescript
export interface Referencia {
  // ... existing fields
  newField: string; // New field added
}
```

### 2. Increment Schema Version

In `src/services/db.ts`, increment `CURRENT_SCHEMA_VERSION`:

```typescript
const CURRENT_SCHEMA_VERSION = 3; // Was 2, now 3
```

### 3. Add Dexie Version & Migration

Add a new Dexie version with migration logic:

```typescript
this.version(2)
  .stores({
    sectors: 'id, order',
    repositoris: 'id, sectorId, updatedAt',
    referencies: 'id, repositoriId, newField', // Add new indexed fields
    attachments: 'id, referenciaId, repositoriId',
  })
  .upgrade(async tx => {
    // Migration logic to update existing data
    const referencies = await tx.table('referencies').toArray();
    for (const referencia of referencies) {
      if (!referencia.newField) {
        referencia.newField = 'default value';
        await tx.table('referencies').put(referencia);
      }
    }
  });
```

### 4. Update Validation

Update `validateSector()`, `validateRepositori()` or `validateReferencia()`.
**Backfill missing benign fields inside the validator** (assign a default and
keep validating) — if a validator returns false, `initializeDatabase` clears
the WHOLE database:

```typescript
function validateReferencia(referencia: AnyRec): boolean {
  if (typeof referencia.newField === 'undefined') referencia.newField = ''; // backfill
  return (
    // ... existing checks
    typeof referencia.newField === 'string'
  );
}
```

## Development Tools

### Force Database Reset

In development mode, you can force clear the database from the browser console:

```javascript
resetDatabase()
```

This will:
- Clear all data from IndexedDB
- Reset the schema version
- Prompt you to reload the page

### Manual Schema Check

Check the current schema version in localStorage:

```javascript
localStorage.getItem('dades_schema_version')
```

## What Happens Automatically

### On App Start

1. **Check Schema Version**: Compare stored version with current version
2. **Run Migrations**: If version is old, Dexie runs migration logic
3. **Validate Data**: Check that all records match current TypeScript types
4. **Reset if Invalid**: If validation fails, clear database and start fresh

### User Experience

- **Seamless Upgrades**: Users get automatic migrations with no action needed
- **No Broken States**: Invalid data is automatically cleared
- **Development Friendly**: Old dev data won't break new features
- **Fail-proof**: Even if migration fails, app resets to a working state

## Best Practices

1. **Always increment schema version** when changing data structure
2. **Write migration logic** for backwards compatibility when possible
3. **Update validators** to match new schema
4. **Test migrations** with old data before deploying
5. **Document changes** in this file's version history


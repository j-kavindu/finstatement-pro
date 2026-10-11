# Actual security model

The app uses /users/{uid}/workspaces/primary and /users/{uid}/auditLogs/{id}. Rules deny all other paths and restrict every allowed read/write to the authenticated path UID.

Workspace writes require map payload, monotonic revision and server updatedAt timestamp. Client transactions reject stale saves, and payloads over 900 KB are rejected before upload. Aggregate rules protect ownership, not every accounting line; a normalized trusted posting backend is required for production immutability.

Audit records require actor UID, server-recorded time and bounded action/details. Update/delete denied. UI activity in the editable workspace is not the protected audit collection. Latest 100 active-period events copied on each save; unsaved events are not durable.

Rules tests supplied, but emulator blocked by Java 17 versus CLI requirement Java 21. Live authentication/persistence require the user's configured project. No privileged secrets included. Financial localStorage removed. CSV formula/quote controls and bounded file import implemented. Production audit zero known advisories; development CLI advisories remain.

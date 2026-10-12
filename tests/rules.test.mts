import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
test('workspace ownership, revision and deny anonymous access', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
 const env = await initializeTestEnvironment({ projectId: 'demo-finstatement', firestore: { rules: readFileSync('firestore.rules','utf8') } });
 try {
  const alice=env.authenticatedContext('alice').firestore();
  const bob=env.authenticatedContext('bob').firestore();
  const guest=env.unauthenticatedContext().firestore();
  const ref=doc(alice,'users/alice/workspaces/primary');
  await assertSucceeds(setDoc(ref,{payload:{companies:[]},revision:1,updatedAt:serverTimestamp()}));
  await assertSucceeds(getDoc(ref));
  await assertFails(getDoc(doc(bob,'users/alice/workspaces/primary')));
  await assertFails(getDoc(doc(guest,'users/alice/workspaces/primary')));
  await assertFails(setDoc(ref,{payload:{},revision:1,updatedAt:serverTimestamp()}));
  await assertSucceeds(setDoc(ref,{payload:{},revision:2,updatedAt:serverTimestamp()}));
  const auditRef=doc(alice,'users/alice/auditLogs/event');
  const audit={actorId:'alice',recordedAt:serverTimestamp(),action:'Test',details:'Synthetic test'};
  await assertSucceeds(setDoc(auditRef,audit));
  await assertFails(setDoc(auditRef,{...audit,details:'Rewritten'}));
  await assertFails(deleteDoc(auditRef));
  await assertFails(setDoc(doc(bob,'users/alice/auditLogs/forged'),{...audit,actorId:'bob'}));
  await assertFails(setDoc(doc(alice,'users/alice/auditLogs/forged-actor'),{...audit,actorId:'bob'}));
  await assertFails(setDoc(doc(alice,'users/alice/workspaces/secondary'),{payload:{},revision:1,updatedAt:serverTimestamp()}));
 } finally { await env.cleanup(); }
});

// Cloud accounts + shared libraries for Bibliotheca (Firebase Auth + Firestore).
import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, signOut, sendPasswordResetEmail, setPersistence, browserLocalPersistence
} from 'firebase/auth';
import {
  getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where,
  getDocs, writeBatch, serverTimestamp
} from 'firebase/firestore';

let app, auth, db;
const enc = e => String(e).toLowerCase().replace(/\./g, ',');
const norm = e => String(e || '').trim().toLowerCase();

function init(cfg) {
  app = initializeApp(cfg);
  auth = getAuth(app);
  db = getFirestore(app);
  try { setPersistence(auth, browserLocalPersistence); } catch (e) {}
}
const brief = u => u && { uid: u.uid, email: norm(u.email), name: u.displayName || '' };

const api = {
  enabled: true,
  init,
  onAuth(cb) { return onAuthStateChanged(auth, u => cb(brief(u))); },
  async signIn(email, pw) { const r = await signInWithEmailAndPassword(auth, norm(email), pw); return brief(r.user); },
  async signUp(email, pw, name) {
    const r = await createUserWithEmailAndPassword(auth, norm(email), pw);
    if (name) { try { await updateProfile(r.user, { displayName: name }); } catch (e) {} }
    return brief(auth.currentUser || r.user);
  },
  signOut() { return signOut(auth); },
  resetPassword(email) { return sendPasswordResetEmail(auth, norm(email)); },

  // All libraries I belong to plus invitations waiting for me. cb(list) where each item:
  // {id,name,ownerId,members,memberNames,invites,role,pending}
  watchLibraries(user, cb, onErr) {
    const mine = new Map(), inv = new Map();
    const fire = () => {
      const out = [];
      mine.forEach((d, id) => out.push({ ...d, id, role: d.members[user.uid] || 'viewer', pending: false }));
      inv.forEach((d, id) => { if (!mine.has(id)) out.push({ ...d, id, role: (d.invites || {})[enc(user.email)] || 'viewer', pending: true }); });
      out.sort((a, b) => (a.pending - b.pending) || ((a.role === 'owner' ? 0 : 1) - (b.role === 'owner' ? 0 : 1)) || String(a.name).localeCompare(String(b.name)));
      cb(out);
    };
    const u1 = onSnapshot(query(collection(db, 'libraries'), where('memberIds', 'array-contains', user.uid)),
      s => { mine.clear(); s.forEach(d => mine.set(d.id, d.data())); fire(); }, e => onErr && onErr(e));
    const u2 = onSnapshot(query(collection(db, 'libraries'), where('inviteEmails', 'array-contains', user.email)),
      s => { inv.clear(); s.forEach(d => inv.set(d.id, d.data())); fire(); }, e => onErr && onErr(e));
    return () => { u1(); u2(); };
  },
  async createLibrary(user, name) {
    const ref = doc(collection(db, 'libraries'));
    await setDoc(ref, {
      name: name || 'My library', ownerId: user.uid, ownerEmail: user.email,
      members: { [user.uid]: 'owner' }, memberIds: [user.uid],
      memberNames: { [user.uid]: user.name || user.email.split('@')[0] },
      invites: {}, inviteEmails: [], createdAt: Date.now()
    });
    return ref.id;
  },
  renameLibrary(id, name) { return updateDoc(doc(db, 'libraries', id), { name }); },
  async deleteLibrary(id) {
    const snap = await getDocs(collection(db, 'libraries', id, 'books'));
    let b = writeBatch(db), n = 0;
    for (const d of snap.docs) { b.delete(d.ref); if (++n % 400 === 0) { await b.commit(); b = writeBatch(db); } }
    await b.commit();
    await deleteDoc(doc(db, 'libraries', id));
  },
  // sharing (owner only)
  async invite(id, lib, email, role) {
    email = norm(email);
    const invites = { ...(lib.invites || {}), [enc(email)]: role };
    const inviteEmails = Array.from(new Set([...(lib.inviteEmails || []), email]));
    await updateDoc(doc(db, 'libraries', id), { invites, inviteEmails });
  },
  async uninvite(id, lib, email) {
    email = norm(email);
    const invites = { ...(lib.invites || {}) }; delete invites[enc(email)];
    await updateDoc(doc(db, 'libraries', id), { invites, inviteEmails: (lib.inviteEmails || []).filter(e => e !== email) });
  },
  async setRole(id, lib, uid, role) {
    await updateDoc(doc(db, 'libraries', id), { members: { ...lib.members, [uid]: role } });
  },
  async removeMember(id, lib, uid) {
    const members = { ...lib.members }; delete members[uid];
    const memberNames = { ...(lib.memberNames || {}) }; delete memberNames[uid];
    await updateDoc(doc(db, 'libraries', id), { members, memberNames, memberIds: (lib.memberIds || []).filter(x => x !== uid) });
  },
  // invitee accepts: rules only allow this one exact change
  async accept(id, lib, user) {
    const role = (lib.invites || {})[enc(user.email)] || 'viewer';
    const invites = { ...(lib.invites || {}) }; delete invites[enc(user.email)];
    await updateDoc(doc(db, 'libraries', id), {
      members: { ...lib.members, [user.uid]: role },
      memberIds: [...(lib.memberIds || []), user.uid],
      memberNames: { ...(lib.memberNames || {}), [user.uid]: user.name || user.email.split('@')[0] },
      invites, inviteEmails: (lib.inviteEmails || []).filter(e => e !== user.email)
    });
  },
  async leave(id, lib, user) { return api.removeMember(id, lib, user.uid); },

  // the same tiny interface the app already uses for its book collection
  booksCol(id) {
    const c = collection(db, 'libraries', id, 'books');
    return {
      onSnapshot(next, err) { return onSnapshot(c, next, err); },
      doc: bid => {
        const r = doc(c, bid);
        return { set: d => setDoc(r, d), update: d => updateDoc(r, d), delete: () => deleteDoc(r) };
      }
    };
  },
  newId() { return doc(collection(db, 'libraries')).id; },
  async batchSet(id, docs) {
    for (let i = 0; i < docs.length; i += 400) {
      const b = writeBatch(db);
      docs.slice(i, i + 400).forEach(d => { const { id: bid, ...rest } = d; b.set(doc(db, 'libraries', id, 'books', bid), rest); });
      await b.commit();
    }
  }
};
window.RRCloud = api;

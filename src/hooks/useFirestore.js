import {
  doc, setDoc, getDoc, onSnapshot, collection,
  addDoc, deleteDoc, updateDoc
} from "firebase/firestore";
import { db } from "../firebase/config";

export function useFirestore(userId) {
  // Converts "habits/weeks/2026-W05-25" -> collection="habits", docId="weeks_2026-W05-25"
  // Ensures we always have even segments: users/{uid}/habits/{docId}
  const resolvePath = (path) => {
    const parts = path.split("/");
    if (parts.length === 1) {
      // e.g. "config" -> collection="appData", doc="config"
      return { col: "appData", docId: parts[0] };
    } else {
      // e.g. "habits/config" -> col="habits", docId="config"
      // e.g. "habits/weeks/2026-W05-25" -> col="habits", docId="weeks_2026-W05-25"
      const col = parts[0];
      const docId = parts.slice(1).join("_");
      return { col, docId };
    }
  };

  const setData = async (path, data) => {
    const { col, docId } = resolvePath(path);
    await setDoc(doc(db, "users", userId, col, docId), data, { merge: true });
  };

  const getData = async (path) => {
    const { col, docId } = resolvePath(path);
    const snap = await getDoc(doc(db, "users", userId, col, docId));
    return snap.exists() ? snap.data() : null;
  };

  const watchData = (path, callback) => {
    const { col, docId } = resolvePath(path);
    return onSnapshot(doc(db, "users", userId, col, docId), (snap) => {
      callback(snap.exists() ? snap.data() : null);
    });
  };

  const watchCollection = (path, callback) => {
    return onSnapshot(collection(db, "users", userId, path), (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  };

  const addItem = async (path, data) => {
    return await addDoc(collection(db, "users", userId, path), {
      ...data,
      createdAt: new Date().toISOString()
    });
  };

  const updateItem = async (path, id, data) => {
    await updateDoc(doc(db, "users", userId, path, id), data);
  };

  const deleteItem = async (path, id) => {
    await deleteDoc(doc(db, "users", userId, path, id));
  };

  return { setData, getData, watchData, watchCollection, addItem, updateItem, deleteItem };
}

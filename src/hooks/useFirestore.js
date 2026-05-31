import { useState, useEffect } from "react";
import {
  doc, setDoc, getDoc, onSnapshot, collection,
  addDoc, deleteDoc, updateDoc, query, where, orderBy
} from "firebase/firestore";
import { db } from "../firebase/config";

export function useFirestore(userId) {
  // Generic doc setter
  const setData = async (path, data) => {
    await setDoc(doc(db, "users", userId, ...path.split("/")), data, { merge: true });
  };

  const getData = async (path) => {
    const snap = await getDoc(doc(db, "users", userId, ...path.split("/")));
    return snap.exists() ? snap.data() : null;
  };

  const watchData = (path, callback) => {
    return onSnapshot(doc(db, "users", userId, ...path.split("/")), (snap) => {
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

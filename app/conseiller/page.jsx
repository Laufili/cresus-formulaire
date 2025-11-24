"use client";

import { useState, useEffect } from "react";
import { auth, db, storage } from "../../firebaseConfig";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";

export default function ConseillerPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [user, setUser] = useState(null);
  const [dossiers, setDossiers] = useState([]);
  const [search, setSearch] = useState("");

  // --- Auth listener ---
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) loadDossiers();
    });
    return () => unsub();
  }, []);

  // --- Connexion ---
  async function login() {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la connexion");
    }
  }

  // --- Déconnexion ---
  async function logout() {
    await signOut(auth);
  }

  // --- Chargement dossiers Firestore ---
  async function loadDossiers() {
    const snap = await getDocs(collection(db, "dossiers"));
    const all = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    setDossiers(all);
  }

  // --- Formater la date ---
  function formatDate(ts) {
    if (!ts || !ts.toDate) return "—";
    const d = ts.toDate();
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  // --- Suppression d’un dossier + fichiers ---
  async function deleteDossier(dossier) {
    const confirm1 = confirm(
      `Êtes-vous sûr de vouloir supprimer le dossier de ${dossier.contact?.prenom} ${dossier.contact?.nom} ?`
    );
    if (!confirm1) return;

    const confirm2 = confirm("⚠️ Cette action est irréversible. Confirmer ?");
    if (!confirm2) return;

    try {
      await deleteDoc(doc(db, "dossiers", dossier.id));

      if (dossier.files && dossier.files.length > 0) {
        for (const file of dossier.files) {
          try {
            const fileRef = ref(storage, file.path);
            await deleteObject(fileRef);
          } catch (err) {
            console.error("Erreur suppression fichier :", err);
          }
        }
      }

      alert("Dossier supprimé.");
      loadDossiers();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression du dossier.");
    }
  }

  // --- Filtrage ---
  const filtered = dossiers.filter((d) => {
    const nom = (d.contact?.nom || "").toLowerCase();
    const prenom = (d.contact?.prenom || "").toLowerCase();
    const s = search.toLowerCase();
    return nom.includes(s) || prenom.includes(s);
  });

  // --- Interface de connexion ---
  if (!user) {
    return (
      <div className="p-10 max-w-md mx-auto space-y-4">
        <h1 className="text-2xl font-semibold mb-4">Espace conseiller CRÉSUS</h1>

        <input
          type="email"
          placeholder="Email conseiller"
          className="border p-2 rounded w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Mot de passe"
          className="border p-2 rounded w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          className="bg-indigo-600 text-white px-4 py-2 rounded w-full"
        >
          Se connecter
        </button>
      </div>
    );
  }

  // --- Interface conseiller ---
  return (
    <div className="p-5 max-w-4xl mx-auto space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Dossiers bénéficiaires</h1>
        <button onClick={logout} className="text-sm underline text-red-600">
          Déconnexion
        </button>
      </div>

      {/* Barre de recherche */}
      <input
        type="text"
        placeholder="Rechercher un dossier (nom / prénom)"
        className="border rounded p-2 w-full"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Liste des dossiers */}
      <div className="space-y-3 mt-4">
        {filtered.length === 0 && (
          <p className="text-gray-500">Aucun dossier trouvé.</p>
        )}

        {filtered.map((d) => (
          <div
            key={d.id}
            className="border p-4 rounded-xl bg-white shadow-sm flex justify-between items-center"
          >
            <div>
              <p className="font-semibold">
                {d.contact?.prenom} {d.contact?.nom}
              </p>

              <p className="text-xs text-gray-600">{d.contact?.email}</p>

              {/* 👍 DATE D’ENVOI */}
              <p className="text-xs text-gray-500">
                Envoyé le : {formatDate(d.createdAt)}
              </p>
            </div>

            <div className="flex gap-2">
              <a
                href={`/conseiller/dossier/${d.id}`}
                className="px-3 py-1 bg-indigo-600 text-white text-sm rounded"
              >
                Voir dossier
              </a>

              <button
                onClick={() => deleteDossier(d)}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

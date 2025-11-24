"use client";

/**
 * Page dossier conseiller CRÉSUS
 *
 * Objectifs :
 * - Charger un dossier Firestore (rempli via CresusForm côté bénéficiaire)
 * - Afficher TOUT le budget en détail (revenus, charges, crédits, etc.)
 * - Générer un PDF récapitulatif
 * - Permettre au conseiller de supprimer le dossier
 * - Bouton retour vers la liste des dossiers
 *
 * Important :
 * - Compatible avec les deux structures possibles dans Firestore :
 *   - Ancienne : chargesMaison, chargesEnfants, chargesAutres, creditsImmo, creditsConso, autresDettes
 *   - Nouvelle : charges: { maison, enfants, autres }, credits: { immo, conso, autresDettes }
 */

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { db } from "../../../../firebaseConfig";
import { doc, getDoc, deleteDoc } from "firebase/firestore";

// --- Helpers formatage --- //
function num(v) {
  if (v === "" || v === null || v === undefined) return 0;
  return Number(String(v).replace(",", ".")) || 0;
}

function currency(n) {
  if (isNaN(n)) return "0,00 €";
  return Number(n).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

// Libellés lisibles (pour les clés Firestore)
const LABELS_REVENUS = {
  salaires: "Salaires / Retraites",
  allocations: "Allocations (chômage, RSA, …)",
  prestations: "Pensions / prestations familiales / bourses / aides",
  pensionAlimentaireRecue: "Pension alimentaire reçue",
  aidesFamiliales: "Aides familiales",
  revenusLocatifs: "Revenus locatifs",
  revenusAutres: "Autres revenus",
};

const LABELS_MAISON = {
  loyer: "Loyer",
  chargesLocatives: "Charges locatives / copropriété",
  energie: "Gaz / Électricité",
  fioulBois: "Fioul / Bois",
  eau: "Eau",
  telecom: "Téléphone / Internet",
};

const LABELS_ENFANTS = {
  scolarite: "Frais de scolarité / cantine / garde",
  pensionAlimentaireVersee: "Pension alimentaire versée",
  enfantsAutres: "Autres charges liées aux enfants",
};

const LABELS_AUTRES = {
  transports: "Transports (essence, abonnements, …)",
  abonnements: "Abonnements divers",
  fraisDivers: "Frais divers (santé, …)",
  autres: "Autres charges",
};

const LABELS_ASSURANCES = {
  habitation: "Assurance habitation",
  auto: "Assurance voiture",
  mutuelle: "Mutuelle",
  assurancesAutres: "Autres assurances (prévoyance, PJ, obsèques…)",
};

const LABELS_IMPOTS = {
  impotRevenu: "Impôt sur le revenu",
  taxeHabitation: "Taxe d’habitation",
  taxeFonciere: "Taxe foncière",
  taxeOrdures: "Taxe ordures ménagères",
  assainissement: "Assainissement",
};

export default function DossierPage({ params }) {
  // ⚠️ Avec Next 16, params est une Promise → on doit utiliser React.use()
  const { id } = use(params);

  const router = useRouter();
  const [dossier, setDossier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const pdfRef = useRef(null);

  // --- Chargement du dossier Firestore --- //
  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, "dossiers", id));
        if (snap.exists()) {
          setDossier(snap.data());
        } else {
          console.error("Dossier introuvable");
        }
      } catch (e) {
        console.error("Erreur lors du chargement du dossier :", e);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  // --- Suppression du dossier --- //
  async function handleDelete() {
    const sure = confirm(
      "⚠️ Voulez-vous vraiment supprimer ce dossier ? Cette action est définitive."
    );
    if (!sure) return;

    try {
      setDeleting(true);
      await deleteDoc(doc(db, "dossiers", id));
      alert("Dossier supprimé.");
      router.push("/conseiller");
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression du dossier.");
    } finally {
      setDeleting(false);
    }
  }

  // --- Génération du PDF à partir du contenu (via html2canvas + jsPDF) --- //
  async function downloadPDF() {
    try {
      const element = pdfRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, width, height);
      pdf.save(`dossier-${id}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la génération du PDF.");
    }
  }

  if (loading) {
    return <p className="p-5">Chargement du dossier…</p>;
  }

  if (!dossier) {
    return <p className="p-5">Dossier introuvable.</p>;
  }

  // --- Normalisation des données (compatibilité ancienne / nouvelle structure) --- //
  const contact = dossier.contact || {};
  const consents = dossier.consents || {};

  const revenus = dossier.revenus || {};

  // Charges : on supporte deux formats possibles
  const chargesMaison =
    dossier.chargesMaison || dossier.charges?.maison || {};
  const chargesEnfants =
    dossier.chargesEnfants || dossier.charges?.enfants || {};
  const chargesAutres =
    dossier.chargesAutres || dossier.charges?.autres || {};

  const assurances = dossier.assurances || {};
  const impots = dossier.impots || {};

  // Crédits : ancien format vs nouveau format { credits: { immo, conso, autresDettes } }
  const creditsImmo =
    dossier.creditsImmo || dossier.credits?.immo || [];
  const creditsConso =
    dossier.creditsConso || dossier.credits?.conso || [];
  const autresDettes =
    dossier.autresDettes || dossier.credits?.autresDettes || [];

  const files = dossier.files || [];

  // Totaux : si déjà calculés côté formulaire, on les utilise
  // Sinon, on les recalcule par sécurité
  function sumObject(obj) {
    return Object.values(obj || {}).reduce(
      (acc, v) => acc + num(v),
      0
    );
  }

  const totalRevenus =
    dossier.totals?.totalRevenus ?? sumObject(revenus);

  const totalCharges =
    dossier.totals?.totalCharges ??
    (sumObject(chargesMaison) +
      sumObject(chargesEnfants) +
      sumObject(chargesAutres) +
      sumObject(assurances) +
      sumObject(impots));

  const totalCredits =
    dossier.totals?.totalCredits ??
    [...creditsImmo, ...creditsConso].reduce(
      (acc, c) => acc + num(c.mensualite),
      0
    );

  const reste =
    dossier.totals?.reste ?? (totalRevenus - (totalCharges + totalCredits));

  const totals = {
    totalRevenus,
    totalCharges,
    totalCredits,
    reste,
  };

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-4">
      {/* Barre de navigation / actions */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <button
          onClick={() => router.push("/conseiller")}
          className="text-sm px-3 py-2 rounded-xl border border-black/10 hover:bg-black/5"
        >
          ← Retour aux dossiers
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadPDF}
            className="text-sm px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500"
          >
            Télécharger le PDF
          </button>
          <button
            disabled={deleting}
            onClick={handleDelete}
            className="text-sm px-3 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
          >
            {deleting ? "Suppression..." : "Supprimer le dossier"}
          </button>
        </div>
      </div>

      {/* Titre espace conseiller */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">
          Espace conseiller CRÉSUS
        </h1>
        <div className="text-xs text-black/60">
          Dossier : <b>{contact.prenom} {contact.nom}</b>
        </div>
      </div>

      {/* Résumé haut de page (vision rapide) */}
      <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-2">
        <div className="text-sm">
          <b>Bénéficiaire :</b> {contact.civilite} {contact.prenom}{" "}
          {contact.nom}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm mt-2">
          <div className="p-3 rounded-xl bg-indigo-50">
            <div className="text-xs text-black/60">Revenus</div>
            <div className="text-lg font-semibold">
              {currency(totals.totalRevenus)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50">
            <div className="text-xs text-black/60">Charges hors crédits</div>
            <div className="text-lg font-semibold">
              {currency(totals.totalCharges)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50">
            <div className="text-xs text-black/60">Mensualités crédits</div>
            <div className="text-lg font-semibold">
              {currency(totals.totalCredits)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50">
            <div className="text-xs text-black/60">Reste pour vivre</div>
            <div
              className={`text-lg font-semibold ${
                totals.reste < 0 ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {currency(totals.reste)}
            </div>
          </div>
        </div>
      </div>

      {/* Bloc qui sera converti en PDF */}
      <div
        ref={pdfRef}
        className="bg-white p-6 border rounded-xl shadow space-y-6"
      >
        {/* 1. Identité */}
        <section>
          <h2 className="text-xl font-semibold border-b pb-2 mb-3">
            1. Identité du bénéficiaire
          </h2>
          <div className="space-y-1 text-sm">
            <p><b>Nom :</b> {contact.nom}</p>
            <p><b>Prénom :</b> {contact.prenom}</p>
            <p><b>Date de naissance :</b> {contact.naissance || "—"}</p>
            <p><b>Lieu de naissance :</b> {contact.lieuNaissance || "—"}</p>
            <p><b>Nationalité :</b> {contact.nationalite || "—"}</p>
            <p><b>Téléphone :</b> {contact.mobile || contact.tel || "—"}</p>
            <p><b>Email :</b> {contact.email || "—"}</p>
            <p><b>Adresse :</b> {contact.adresse || "—"}</p>
            <p><b>Situation familiale :</b> {contact.situationFam || "—"}</p>
            <p>
              <b>Situation professionnelle :</b>{" "}
              {contact.situationPro || "—"}
            </p>
            <p>
              <b>Logement :</b> {contact.logement || "—"}{" "}
              {contact.logement === "Locataire" && contact.bailleur
                ? `(Bailleur : ${contact.bailleur})`
                : ""}
            </p>
          </div>
        </section>

        {/* 2. Revenus mensuels */}
        <section>
          <h2 className="text-xl font-semibold border-b pb-2 mb-3">
            2. Revenus mensuels (moyenne 3 mois)
          </h2>
          <table className="w-full text-sm border border-black/10 rounded-xl overflow-hidden">
            <thead className="bg-black/5">
              <tr>
                <th className="text-left px-3 py-2">Poste</th>
                <th className="text-right px-3 py-2">Montant</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(revenus || {}).map(([key, value]) => (
                <tr key={key} className="border-t border-black/5">
                  <td className="px-3 py-1.5">
                    {LABELS_REVENUS[key] || key}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {currency(num(value))}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-black/10 bg-black/5 font-semibold">
                <td className="px-3 py-2">Total revenus</td>
                <td className="px-3 py-2 text-right">
                  {currency(totals.totalRevenus)}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 3. Charges détaillées */}
        <section>
          <h2 className="text-xl font-semibold border-b pb-2 mb-3">
            3. Charges mensuelles détaillées
          </h2>

          {/* 3.1 Maison */}
          <h3 className="font-semibold mt-2 mb-1">3.1 Logement / Maison</h3>
          <table className="w-full text-sm border border-black/10 rounded-xl overflow-hidden mb-3">
            <tbody>
              {Object.entries(chargesMaison || {}).map(([key, value]) => (
                <tr key={key} className="border-t border-black/5">
                  <td className="px-3 py-1.5">
                    {LABELS_MAISON[key] || key}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {currency(num(value))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 3.2 Enfants */}
          <h3 className="font-semibold mt-4 mb-1">
            3.2 Charges liées aux enfants
          </h3>
          <table className="w-full text-sm border border-black/10 rounded-xl overflow-hidden mb-3">
            <tbody>
              {Object.entries(chargesEnfants || {}).map(([key, value]) => (
                <tr key={key} className="border-t border-black/5">
                  <td className="px-3 py-1.5">
                    {LABELS_ENFANTS[key] || key}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {currency(num(value))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 3.3 Autres charges */}
          <h3 className="font-semibold mt-4 mb-1">3.3 Autres charges</h3>
          <table className="w-full text-sm border border-black/10 rounded-xl overflow-hidden">
            <tbody>
              {Object.entries(chargesAutres || {}).map(([key, value]) => (
                <tr key={key} className="border-t border-black/5">
                  <td className="px-3 py-1.5">
                    {LABELS_AUTRES[key] || key}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {currency(num(value))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 4. Assurances & impôts */}
        <section>
          <h2 className="text-xl font-semibold border-b pb-2 mb-3">
            4. Assurances et impôts
          </h2>

          {/* Assurances */}
          <h3 className="font-semibold mt-2 mb-1">4.1 Assurances</h3>
          <table className="w-full text-sm border border-black/10 rounded-xl overflow-hidden mb-3">
            <tbody>
              {Object.entries(assurances || {}).map(([key, value]) => (
                <tr key={key} className="border-t border-black/5">
                  <td className="px-3 py-1.5">
                    {LABELS_ASSURANCES[key] || key}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {currency(num(value))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Impôts */}
          <h3 className="font-semibold mt-4 mb-1">4.2 Impôts et taxes</h3>
          <table className="w-full text-sm border border-black/10 rounded-xl overflow-hidden">
            <tbody>
              {Object.entries(impots || {}).map(([key, value]) => (
                <tr key={key} className="border-t border-black/5">
                  <td className="px-3 py-1.5">
                    {LABELS_IMPOTS[key] || key}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {currency(num(value))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 5. Crédits / dettes */}
        <section>
          <h2 className="text-xl font-semibold border-b pb-2 mb-3">
            5. Crédits et autres dettes
          </h2>

          {/* Crédits immo */}
          <h3 className="font-semibold mt-2 mb-1">5.1 Crédits immobiliers</h3>
          {creditsImmo.length === 0 ? (
            <p className="text-sm text-black/60">
              Aucun crédit immobilier déclaré.
            </p>
          ) : (
            <table className="w-full text-sm border border-black/10 rounded-xl overflow-hidden mb-3">
              <thead className="bg-black/5">
                <tr>
                  <th className="text-left px-3 py-2">Établissement</th>
                  <th className="text-right px-3 py-2">Mensualité</th>
                  <th className="text-right px-3 py-2">Capital restant dû</th>
                  <th className="text-right px-3 py-2">Impayés</th>
                </tr>
              </thead>
              <tbody>
                {creditsImmo.map((c, i) => (
                  <tr key={i} className="border-t border-black/5">
                    <td className="px-3 py-1.5">{c.etabl}</td>
                    <td className="px-3 py-1.5 text-right">
                      {currency(num(c.mensualite))}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {currency(num(c.capital))}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {c.impayes ? currency(num(c.impayes)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Crédits conso */}
          <h3 className="font-semibold mt-4 mb-1">
            5.2 Crédits à la consommation / renouvelables
          </h3>
          {creditsConso.length === 0 ? (
            <p className="text-sm text-black/60">
              Aucun crédit conso déclaré.
            </p>
          ) : (
            <table className="w-full text-sm border border-black/10 rounded-xl overflow-hidden mb-3">
              <thead className="bg-black/5">
                <tr>
                  <th className="text-left px-3 py-2">Établissement</th>
                  <th className="text-right px-3 py-2">Mensualité</th>
                  <th className="text-right px-3 py-2">Capital restant dû</th>
                  <th className="text-right px-3 py-2">Impayés</th>
                </tr>
              </thead>
              <tbody>
                {creditsConso.map((c, i) => (
                  <tr key={i} className="border-t border-black/5">
                    <td className="px-3 py-1.5">{c.etabl}</td>
                    <td className="px-3 py-1.5 text-right">
                      {currency(num(c.mensualite))}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {currency(num(c.capital))}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {c.impayes ? currency(num(c.impayes)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Autres dettes */}
          <h3 className="font-semibold mt-4 mb-1">
            5.3 Autres dettes (retards, découverts, charges, proches…)
          </h3>
          {autresDettes.length === 0 ? (
            <p className="text-sm text-black/60">
              Aucune autre dette déclarée.
            </p>
          ) : (
            <table className="w-full text-sm border border-black/10 rounded-xl overflow-hidden">
              <thead className="bg-black/5">
                <tr>
                  <th className="text-left px-3 py-2">Créancier / Nature</th>
                  <th className="text-right px-3 py-2">Mensualité</th>
                  <th className="text-right px-3 py-2">Capital restant dû</th>
                  <th className="text-right px-3 py-2">Impayés</th>
                </tr>
              </thead>
              <tbody>
                {autresDettes.map((c, i) => (
                  <tr key={i} className="border-t border-black/5">
                    <td className="px-3 py-1.5">{c.etabl}</td>
                    <td className="px-3 py-1.5 text-right">
                      {currency(num(c.mensualite))}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {c.capital ? currency(num(c.capital)) : "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {c.impayes ? currency(num(c.impayes)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* 6. Synthèse budgétaire */}
        <section>
          <h2 className="text-xl font-semibold border-b pb-2 mb-3">
            6. Synthèse budgétaire
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-black/5">
              <p>
                <b>Total revenus :</b> {currency(totals.totalRevenus)}
              </p>
              <p>
                <b>Total charges (hors crédits) :</b>{" "}
                {currency(totals.totalCharges)}
              </p>
              <p>
                <b>Total mensualités crédits :</b>{" "}
                {currency(totals.totalCredits)}
              </p>
              <p>
                <b>Reste pour vivre :</b>{" "}
                <span
                  className={
                    totals.reste < 0 ? "text-red-600" : "text-emerald-600"
                  }
                >
                  {currency(totals.reste)}
                </span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-black/5 text-xs text-black/70">
              <p>
                <b>Consentements :</b>
              </p>
              <ul className="list-disc pl-5 mt-1">
                <li>
                  Traitement des données :{" "}
                  {consents.traitement ? "✅ Oui" : "❌ Non"}
                </li>
                <li>
                  Partage avec prescripteur :{" "}
                  {consents.prescripteur ? "✅ Oui" : "❌ Non"}
                </li>
                <li>
                  Transfert réseau CRÉSUS :{" "}
                  {consents.transfertReseau ? "✅ Oui" : "❌ Non"}
                </li>
              </ul>
              {consents.autorisationCommunication && (
                <p className="mt-2">
                  <b>Autorisation de communiquer aux créanciers :</b>{" "}
                  {consents.autorisationCommunication}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* 7. Pièces jointes */}
        <section>
          <h2 className="text-xl font-semibold border-b pb-2 mb-3">
            7. Pièces jointes
          </h2>
          {files.length === 0 ? (
            <p className="text-sm text-black/60">
              Aucune pièce jointe téléversée.
            </p>
          ) : (
            <ul className="list-disc pl-5 text-sm space-y-1">
              {files.map((f, i) => (
                <li key={i}>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline"
                  >
                    {f.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

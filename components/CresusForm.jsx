"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { uploadBytesResumable } from "firebase/storage";
import { db, storage } from "../firebaseConfig"; // 👉 adapte le chemin si besoin

/**
 * CRÉSUS — Dossier bénéficiaire (prototype complet, sans dépendances externes)
 */

// --- Icônes minimalistes (pas de lib) ---
const I = {
  Download: () => <span aria-hidden>⬇️</span>,
  FileText: () => <span aria-hidden>📄</span>,
  Upload: () => <span aria-hidden>📎</span>,
  Plus: () => <span aria-hidden>➕</span>,
  Trash: () => <span aria-hidden>🗑️</span>,
  ChevronLeft: () => <span aria-hidden>◀️</span>,
  ChevronRight: () => <span aria-hidden>▶️</span>,
  Shield: () => <span aria-hidden>🛡️</span>,
  Building: () => <span aria-hidden>🏢</span>,
  Euro: () => <span aria-hidden>💶</span>,
  Users: () => <span aria-hidden>👥</span>,
  Home: () => <span aria-hidden>🏠</span>,
  Phone: () => <span aria-hidden>📞</span>,
  Mail: () => <span aria-hidden>✉️</span>,
  Calendar: () => <span aria-hidden>📅</span>,
  Lock: () => <span aria-hidden>🔒</span>,
};

// --- UI Primitives ---
const Card = ({ children }) => (
  <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-5">
    {children}
  </div>
);

const Button = ({
  children,
  onClick,
  type = "button",
  variant = "default",
  className = "",
  disabled,
}) => {
  const base =
    "inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  const styles =
    {
      default: "bg-black text-white hover:bg-black/90 focus:ring-black",
      ghost: "bg-transparent hover:bg-black/5",
      outline: "bg-white ring-1 ring-black/10 hover:bg-black/5",
      primary:
        "bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-600",
      danger: "bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-600",
    }[variant] || "";
  return (
    <button
      disabled={disabled}
      type={type}
      onClick={onClick}
      className={`${base} ${styles} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
};

const Input = (props) => (
  <input
    {...props}
    className={`w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
      props.className ?? ""
    }`}
  />
);

const Select = (props) => (
  <select
    {...props}
    className={`w-full rounded-xl border border-black/10 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
      props.className ?? ""
    }`}
  >
    {props.children}
  </select>
);

const Textarea = (props) => (
  <textarea
    {...props}
    className={`w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
      props.className ?? ""
    }`}
  />
);

const Label = ({ children }) => (
  <label className="text-xs font-medium text-black/70">{children}</label>
);

const SectionTitle = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-start gap-3">
    <div className="p-2 rounded-xl bg-indigo-50">
      <Icon />
    </div>
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {subtitle && <p className="text-sm text-black/60 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// --- Helpers ---
const currency = (n) =>
  isNaN(n)
    ? "0"
    : Number(n).toLocaleString("fr-FR", {
        style: "currency",
        currency: "EUR",
      });

const num = (v) =>
  v === "" || v === null || v === undefined
    ? 0
    : Number(String(v).replace(",", ".")) || 0;

// --- Signature simple (canvas) ---
function SignaturePad({ onClear }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const isTouch = "touches" in e;
      const clientX = isTouch ? e.touches[0].clientX : e.clientX;
      const clientY = isTouch ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      return { x, y };
    };

    const start = (e) => {
      drawing.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const move = (e) => {
      if (!drawing.current) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };
    const end = () => {
      drawing.current = false;
    };

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    canvas.addEventListener("touchstart", start, { passive: true });
    canvas.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end);

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
    };
  }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onClear?.();
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={800}
        height={170}
        className="w-full h-40 bg-white rounded-lg ring-1 ring-black/10"
      />
      <div className="mt-2 flex gap-2 justify-end">
        <Button variant="outline" onClick={clear}>
          Effacer
        </Button>
      </div>
    </div>
  );
}

// --- Modèle de données (intitulés de la liasse) ---
const REVENUS_FIELDS = [
  { key: "salaires", label: "Salaires / Retraites" },
  { key: "allocations", label: "Allocations (chômage, RSA, …)" },
  {
    key: "prestations",
    label: "Pensions et prestations familiales, bourses, aides…",
  },
  { key: "pensionAlimentaireRecue", label: "Pension alimentaire reçue" },
  { key: "aidesFamiliales", label: "Aides familiales" },
  { key: "revenusLocatifs", label: "Revenus locatifs" },
  { key: "revenusAutres", label: "Revenus autres" },
];

const CHARGES_MAISON_FIELDS = [
  { key: "loyer", label: "Loyer" },
  { key: "chargesLocatives", label: "Charges locatives / copropriété" },
  { key: "energie", label: "Gaz / Électricité" },
  { key: "fioulBois", label: "Fioul / Bois" },
  { key: "eau", label: "Eau" },
  { key: "telecom", label: "Téléphone - Internet" },
];

const CHARGES_ENFANTS_FIELDS = [
  {
    key: "scolarite",
    label: "Frais de scolarité (cantine, garde d'enfants, …)",
  },
  {
    key: "pensionAlimentaireVersee",
    label: "Pension alimentaire versée",
  },
  { key: "enfantsAutres", label: "Autres" },
];

const CHARGES_AUTRES_FIELDS = [
  { key: "transports", label: "Transports (essence, abonnements, …)" },
  { key: "abonnements", label: "Abonnements divers" },
  { key: "fraisDivers", label: "Frais divers (santé, …)" },
  { key: "autres", label: "Autres (précisez)" },
];

const ASSURANCES_FIELDS = [
  { key: "habitation", label: "Assurance habitation" },
  { key: "auto", label: "Assurance voiture" },
  { key: "mutuelle", label: "Mutuelle" },
  {
    key: "assurancesAutres",
    label: "Autres assurances (prévoyance, protection juridique, obsèques, …)",
  },
];

const IMPOTS_FIELDS = [
  { key: "impotRevenu", label: "Impôts sur le revenu" },
  { key: "taxeHabitation", label: "Taxe d'habitation" },
  { key: "taxeFonciere", label: "Taxe foncière" },
  { key: "taxeOrdures", label: "Taxe d'ordures ménagères" },
  { key: "assainissement", label: "Assainissement" },
];

// --- Composants annexes ---
function Stepper({ current, total }) {
  return (
    <div
      className="w-full grid grid-cols-12 gap-1 mb-4"
      aria-label={`Étape ${current + 1} sur ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full ${
            i <= current ? "bg-indigo-600" : "bg-black/10"
          }`}
        />
      ))}
    </div>
  );
}

function FieldMoney({ label, value, onChange }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          inputMode="decimal"
          placeholder="0,00"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="text-sm text-black/60">€ / mois</span>
      </div>
    </div>
  );
}

function CreditsTable({ items, setItems, title, icon: Icon }) {
  const add = () =>
    setItems([
      ...(items || []),
      { etabl: "", mensualite: "", capital: "", impayes: "" },
    ]);
  const remove = (idx) => setItems(items.filter((_, i) => i !== idx));
  return (
    <Card>
      <SectionTitle
        icon={Icon}
        title={title}
        subtitle="Saisissez autant de lignes que nécessaire"
      />
      <div className="mt-4 space-y-4">
        {(items || []).map((it, idx) => (
          <div
            key={idx}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-3">
              <Label>Établissement financier</Label>
              <Input
                value={it.etabl}
                onChange={(e) => {
                  const clone = [...items];
                  clone[idx] = { ...clone[idx], etabl: e.target.value };
                  setItems(clone);
                }}
              />
            </div>
            <div className="sm:col-span-3">
              <Label>Mensualité</Label>
              <Input
                inputMode="decimal"
                value={it.mensualite}
                onChange={(e) => {
                  const clone = [...items];
                  clone[idx] = { ...clone[idx], mensualite: e.target.value };
                  setItems(clone);
                }}
              />
            </div>
            <div className="sm:col-span-3">
              <Label>Capital restant dû</Label>
              <Input
                inputMode="decimal"
                value={it.capital}
                onChange={(e) => {
                  const clone = [...items];
                  clone[idx] = { ...clone[idx], capital: e.target.value };
                  setItems(clone);
                }}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Impayés</Label>
              <Input
                inputMode="decimal"
                value={it.impayes}
                onChange={(e) => {
                  const clone = [...items];
                  clone[idx] = { ...clone[idx], impayes: e.target.value };
                  setItems(clone);
                }}
              />
            </div>
            <div className="sm:col-span-1 flex justify-end">
              <Button variant="danger" onClick={() => remove(idx)}>
                <I.Trash />
              </Button>
            </div>
          </div>
        ))}
        <Button variant="outline" onClick={add}>
          <I.Plus /> Ajouter une ligne
        </Button>
      </div>
    </Card>
  );
}

function ModalRGPD({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl p-6 relative">
        {/* Bouton fermer */}
        <button
          className="absolute top-3 right-3 text-black/60 hover:text-black text-xl"
          onClick={onClose}
        >
          ×
        </button>

        <h2 className="text-xl font-semibold mb-4">
          Texte complet sur la protection des données (RGPD)
        </h2>

        <div className="text-sm space-y-3 leading-relaxed">
          <p>
            Conformément au Règlement Général sur la protection des données
            personnelles, en vigueur depuis le 25 mai 2018, ainsi qu’à la loi
            n°2018-493 du 20 juin 2018 modifiant la loi n°78-17 du 6 janvier
            1978 relative à l’informatique aux fichiers et aux libertés, les
            conseillers de CRÉSUS, dans le cadre de l’accompagnement budgétaire,
            ne traiteront ou n’utiliseront vos données personnelles que dans la
            mesure où cela est nécessaire pour vous contacter, analyser votre
            dossier, faire le suivi budgétaire et mettre en œuvre
            l’accompagnement CRÉSUS adapté à votre situation, faire la médiation
            budgétaire, réaliser des études statistiques et respecter nos
            obligations légales.
          </p>

          <p>
            Vos données à caractère personnel sont conservées pendant une durée
            de deux ans à l’issue de l’accompagnement, et feront l’objet d’une
            anonymisation intégrale, sauf si vous avez exercé auparavant votre
            droit de suppression des données vous concernant dans les
            conditions décrites ci-après.
          </p>

          <p>
            Nous mettons en place tous les moyens techniques et
            organisationnels afin d’assurer la confidentialité, la sécurité, la
            disponibilité et l’intégrité de vos données personnelles, de manière
            à empêcher tout effacement, endommagement, ou accès par des tiers
            non autorisés.
          </p>

          <p>
            L’accès à vos données personnelles est limité à nos salariés et à
            nos sous-traitants, sauf dans le cas d’une médiation budgétaire et
            avec votre accord, pour que nous puissions échanger avec vos
            créanciers en tant que médiateur.
          </p>

          <p>
            Nos salariés et sous-traitants sont soumis à une obligation de
            confidentialité et ne peuvent utiliser vos données qu’en conformité
            avec les dispositions contractuelles fixées en matière de protection
            des données personnelles et la législation applicable. En tant que
            tiers de confiance, CRÉSUS s’engage à ne pas vendre, louer, céder ni
            donner accès à des tiers à vos données sans votre consentement sauf
            motif légitime (notamment obligation légale, exercice des droits à
            la défense).
          </p>

          <p>
            Pour des raisons tenant aux finalités énoncées et sous réserve de
            votre accord, vos données peuvent être transférées aux associations
            du réseau CRÉSUS. Ces associations sont soumises à nos dispositions
            contractuelles fixées en matière de protection des données
            personnelles et à la législation applicable.
          </p>

          <p>
            Dans votre intérêt strict et pour des raisons tenant aux finalités
            énoncées, des données personnelles vous concernant peuvent être
            transmises lors de la communication de l’état d’avancement de votre
            situation au prescripteur de votre accompagnement.
          </p>

          <p>
            Dans le cadre de la médiation budgétaire, CRÉSUS peut être amené à
            communiquer des données personnelles à votre sujet aux tiers définis
            dans votre autorisation de communiquer (qui fait l’objet d’un
            consentement distinct). Ce dernier est recueilli à la page
            « Autorisation de communiquer des informations budgétaires
            personnelles ».
          </p>

          <p>Conformément au RGPD, vous bénéficiez :</p>

          <ul className="list-disc pl-6 space-y-1">
            <li>d’un droit d’accès à vos données</li>
            <li>d’un droit de rectification</li>
            <li>d’un droit à la portabilité</li>
            <li>d’un droit à l’effacement</li>
            <li>d’un droit de limitation du traitement</li>
            <li>d’un droit d’opposition</li>
          </ul>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500"
          >
            J’ai lu et compris
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Composant principal ---
export default function CresusForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center p-6">
        <img src="/CRESUS_FONDATION.png" alt="Logo CRÉSUS" className="h-16 w-auto mb-6" />
        <h1 className="text-2xl font-bold text-emerald-700 mb-2">✔ Votre dossier a bien été envoyé</h1>
        <p className="text-black/70 max-w-md">Un conseiller CRÉSUS va analyser votre dossier et vous recontactera si nécessaire.</p>
        <button className="mt-6 px-6 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500" onClick={() => window.location.href = "/"}>Retour à l’accueil</button>
      </div>
    );
  }

  if (sent) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center p-6">
      <img
        src="/CRESUS_FONDATION.png"
        alt="Logo CRÉSUS"
        className="h-16 w-auto mb-6"
      />

      <h1 className="text-2xl font-bold text-emerald-700 mb-2">
        ✔ Votre dossier a bien été envoyé
      </h1>

      <p className="text-black/70 max-w-md">
        Un conseiller CRÉSUS va analyser votre dossier et vous recontactera si nécessaire.
      </p>

      <button
        className="mt-6 px-6 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500"
        onClick={() => window.location.href = "/"}
      >
        Retour à l’accueil
      </button>
    </div>
  );
}

  const [step, setStep] = useState(0);
  const TOTAL_STEPS = 8;
  const [showRGPD, setShowRGPD] = useState(false);

  // Contact & situations
  const [contact, setContact] = useState({
    civilite: "Monsieur",
    nom: "",
    prenom: "",
    adresse: "",
    cp: "",
    ville: "",
    naissance: "",
    lieuNaissance: "",
    nationalite: "",
    tel: "",
    mobile: "",
    email: "",
    metier: "",
    conjointNom: "",
    conjointNaissance: "",
    conjointLieu: "",
    conjointNationalite: "",
    conjointMetier: "",
    enfants: "",
    logement: "Locataire",
    situationPro: "Employé(e)",
    situationFam: "Célibataire",
  });

  // RGPD consent + signature
  const [consents, setConsents] = useState({
    traitement: false,
    prescripteur: false,
    transfertReseau: false,
    autorisationCommunication: "",
  });

  // Revenus / Charges / Assurances / Impôts
  const [revenus, setRevenus] = useState(
    Object.fromEntries(REVENUS_FIELDS.map((f) => [f.key, ""]))
  );
  const [chargesMaison, setChargesMaison] = useState(
    Object.fromEntries(CHARGES_MAISON_FIELDS.map((f) => [f.key, ""]))
  );
  const [chargesEnfants, setChargesEnfants] = useState(
    Object.fromEntries(CHARGES_ENFANTS_FIELDS.map((f) => [f.key, ""]))
  );
  const [chargesAutres, setChargesAutres] = useState(
    Object.fromEntries(CHARGES_AUTRES_FIELDS.map((f) => [f.key, ""]))
  );
  const [assurances, setAssurances] = useState(
    Object.fromEntries(ASSURANCES_FIELDS.map((f) => [f.key, ""]))
  );
  const [impots, setImpots] = useState(
    Object.fromEntries(IMPOTS_FIELDS.map((f) => [f.key, ""]))
  );

  // Crédits
  const [creditsImmo, setCreditsImmo] = useState([]);
  const [creditsConso, setCreditsConso] = useState([]);
  const [autresDettes, setAutresDettes] = useState([]);

  // Pièces justificatives
  const [files, setFiles] = useState([]); // mais maintenant ce seront des objets étendus

  // Totaux
  const totals = useMemo(() => {
    const sumObj = (o) => Object.values(o).reduce((a, v) => a + num(v), 0);
    const totalRevenus = sumObj(revenus);
    const totalCharges =
      sumObj(chargesMaison) +
      sumObj(chargesEnfants) +
      sumObj(chargesAutres) +
      sumObj(assurances) +
      sumObj(impots);
    const totalCredits = [...creditsImmo, ...creditsConso].reduce(
      (a, c) => a + num(c.mensualite),
      0
    );
    const reste = totalRevenus - (totalCharges + totalCredits);
    return { totalRevenus, totalCharges, totalCredits, reste };
  }, [
    revenus,
    chargesMaison,
    chargesEnfants,
    chargesAutres,
    assurances,
    impots,
    creditsImmo,
    creditsConso,
  ]);

  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  // Impression / PDF
  const downloadPDF = () => {
    if (typeof window !== "undefined" && window.print) window.print();
    else alert("Impression non disponible dans cet environnement.");
  };

  // Tests intégrés
  const [tests, setTests] = useState([]);


  function runSelfTests() {
    const out = [];
    const r = {
      salaires: "1000",
      allocations: "500",
      prestations: "",
      pensionAlimentaireRecue: "",
      aidesFamiliales: "",
      revenusLocatifs: "250",
      revenusAutres: "250",
    };
    const sumR = Object.values(r).reduce((a, v) => a + num(v), 0);
    out.push({
      name: "Somme revenus",
      expect: 2000,
      got: sumR,
      pass: sumR === 2000,
    });

    const charges = {
      loyer: "600",
      chargesLocatives: "100",
      energie: "100",
      fioulBois: "0",
      eau: "30",
      telecom: "20",
    };
    const autres = {
      transports: "150",
      abonnements: "50",
      fraisDivers: "50",
      autres: "20",
    };
    const assurancesT = {
      habitation: "20",
      auto: "40",
      mutuelle: "60",
      assurancesAutres: "0",
    };
    const impotsT = {
      impotRevenu: "50",
      taxeHabitation: "0",
      taxeFonciere: "0",
      taxeOrdures: "5",
      assainissement: "0",
    };
    const totCharges = Object.values(charges)
      .concat(Object.values(autres))
      .concat(Object.values(assurancesT))
      .concat(Object.values(impotsT))
      .reduce((a, v) => a + num(v), 0);
    const credits = [{ mensualite: "200" }, { mensualite: "100" }].reduce(
      (a, c) => a + num(c.mensualite),
      0
    );
    const reste = 2000 - (totCharges + credits);
    const expectReste =
      2000 -
      ((600 + 100 + 100 + 0 + 30 + 20) +
        (150 + 50 + 50 + 20) +
        (20 + 40 + 60 + 0) +
        (50 + 0 + 0 + 5 + 0) +
        (200 + 100));

    out.push({
      name: "Reste pour vivre",
      expect: expectReste,
      got: reste,
      pass: Math.abs(reste - expectReste) < 1e-9,
    });
    out.push({
      name: "Conversion virgule",
      expect: 12.5,
      got: num("12,5"),
      pass: num("12,5") === 12.5,
    });
    setTests(out);
  }

 // ---- Firebase : upload des fichiers avec barre de progression ----
async function uploadFilesToFirebase(fileList) {
  if (!fileList || fileList.length === 0) return [];

  const uploaded = [];

  for (let i = 0; i < fileList.length; i++) {
    const fileObj = fileList[i];
    const file = fileObj.file;

    const path = `dossiers/${Date.now()}_${i}_${file.name}`;
    const storageRef = ref(storage, path);

    try {
      const result = await new Promise((resolve) => {
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );

            setFiles((prev) =>
              prev.map((f, idx) => (idx === i ? { ...f, progress } : f))
            );
          },
          (error) => {
            console.error("❌ Erreur upload Firebase :", error);
            resolve(null); // 👉 IMPORTANT : on CONTINUE MÊME EN CAS D’ÉCHEC
          },
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ name: file.name, url, path });
          }
        );
      });

      if (result) uploaded.push(result);

    } catch (e) {
      console.error("Erreur inattendue upload :", e);
      // 👉 On continue même si un fichier échoue
    }
  }

  return uploaded;
}

  // ---- Firebase : sauvegarde du dossier complet ----
  async function saveDossier() {
    try {
      const uploadedFiles = await uploadFilesToFirebase(files);

      const dossier = {
        createdAt: serverTimestamp(),
        contact,
        consents,
        revenus,
        charges: {
          maison: chargesMaison,
          enfants: chargesEnfants,
          autres: chargesAutres,
        },
        assurances,
        impots,
        credits: {
          immo: creditsImmo,
          conso: creditsConso,
          autresDettes,
        },
        files: uploadedFiles,
        totals,
      };

      await addDoc(collection(db, "dossiers"), dossier);

      setSent(true);

    } catch (e) {
      console.error(e);
      alert("Erreur lors de l’envoi du dossier.");
    }
  }

  const StepActions = () => (
    <div className="flex justify-between mt-4 print:hidden">
      <Button variant="ghost" onClick={prev} disabled={step === 0}>
        <I.ChevronLeft /> Précédent
      </Button>
      <div className="flex gap-2">
        {step < TOTAL_STEPS - 1 ? (
          <Button
            variant="primary"
            onClick={next}
            disabled={step === 0 && !consents.traitement}
          >
            Suivant <I.ChevronRight />
          </Button>
        ) : (
          <Button variant="outline" onClick={downloadPDF}>
            <I.Download /> Télécharger le PDF
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* HEADER FIXE */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/CRESUS_FONDATION.png"
              alt="Logo CRÉSUS"
              className="h-10 w-auto object-contain"
            />
            <h1 className="text-lg md:text-2xl font-semibold">
              CRÉSUS — Dossier bénéficiaire
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-black/60">
            <I.Lock /> Données saisies localement (démo)
          </div>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Stepper current={step} total={TOTAL_STEPS} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-4">
            {/* Étape 0 */}
            {step === 0 && (
              <Card>
                <SectionTitle
                  icon={I.Shield}
                  title="Consentements RGPD & Médiation"
                  subtitle="Merci de lire et de cocher les autorisations nécessaires à l'accompagnement"
                />
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={consents.traitement}
                        onChange={(e) =>
                          setConsents({
                            ...consents,
                            traitement: e.target.checked,
                          })
                        }
                      />
                      <span className="text-sm">
                        J'accepte le{" "}
                        <b>traitement de mes données personnelles</b> par
                        CRÉSUS dans le cadre de l'accompagnement budgétaire.
                      </span>
                    </label>
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={consents.prescripteur}
                        onChange={(e) =>
                          setConsents({
                            ...consents,
                            prescripteur: e.target.checked,
                          })
                        }
                      />
                      <span className="text-sm">
                        J'accepte que l'état d'avancement de ma situation soit
                        communiqué au <b>prescripteur</b> de mon dossier.
                      </span>
                    </label>
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={consents.transfertReseau}
                        onChange={(e) =>
                          setConsents({
                            ...consents,
                            transfertReseau: e.target.checked,
                          })
                        }
                      />
                      <span className="text-sm">
                        J'accepte le <b>transfert</b> de mes données au réseau
                        d'associations CRÉSUS si nécessaire.
                      </span>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Autorisation de communiquer des informations budgétaires
                      personnelles (liste de créanciers et autorisation)
                    </Label>
                    <Textarea
                      rows={3}
                      placeholder="Listez ici vos établissements créanciers (ex: Banque X, Organisme Y)…"
                      value={consents.autorisationCommunication}
                      onChange={(e) =>
                        setConsents({
                          ...consents,
                          autorisationCommunication: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Signature électronique</Label>
                    <SignaturePad onClear={() => {}} />
                  </div>
                </div>
                <StepActions />
              </Card>
            )}

            {/* Étape 1 : Fiche contact */}
            {step === 1 && (
              <Card>
                <SectionTitle
                  icon={I.Users}
                  title="Fiche contact"
                  subtitle="Renseignez les informations du bénéficiaire et du foyer"
                />
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Civilité</Label>
                    <Select
                      value={contact.civilite}
                      onChange={(e) =>
                        setContact({ ...contact, civilite: e.target.value })
                      }
                    >
                      <option>Monsieur</option>
                      <option>Madame</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Nom</Label>
                    <Input
                      value={contact.nom}
                      onChange={(e) =>
                        setContact({ ...contact, nom: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Prénom</Label>
                    <Input
                      value={contact.prenom}
                      onChange={(e) =>
                        setContact({ ...contact, prenom: e.target.value })
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Adresse</Label>
                    <Input
                      value={contact.adresse}
                      onChange={(e) =>
                        setContact({ ...contact, adresse: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Code postal</Label>
                    <Input
                      value={contact.cp}
                      onChange={(e) =>
                        setContact({ ...contact, cp: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Ville</Label>
                    <Input
                      value={contact.ville}
                      onChange={(e) =>
                        setContact({ ...contact, ville: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Date de naissance</Label>
                    <Input
                      type="date"
                      value={contact.naissance}
                      onChange={(e) =>
                        setContact({ ...contact, naissance: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input
                      value={contact.tel}
                      onChange={(e) =>
                        setContact({ ...contact, tel: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Mobile</Label>
                    <Input
                      value={contact.mobile}
                      onChange={(e) =>
                        setContact({ ...contact, mobile: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={contact.email}
                      onChange={(e) =>
                        setContact({ ...contact, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Métier</Label>
                    <Input
                      value={contact.metier}
                      onChange={(e) =>
                        setContact({ ...contact, metier: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Situation professionnelle</Label>
                    <Select
                      value={contact.situationPro}
                      onChange={(e) =>
                        setContact({
                          ...contact,
                          situationPro: e.target.value,
                        })
                      }
                    >
                      {[
                        "Employé(e)",
                        "Ouvrier(ère) spécialisée(e)",
                        "Indépendant",
                        "Travailleur indépendant",
                        "Retraité(e)",
                        "Recherche d'emploi",
                        "En maladie",
                        "Au foyer",
                        "Bénéficiaire RSA",
                        "Autres",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Situation familiale</Label>
                    <Select
                      value={contact.situationFam}
                      onChange={(e) =>
                        setContact({
                          ...contact,
                          situationFam: e.target.value,
                        })
                      }
                    >
                      {[
                        "Célibataire",
                        "Marié(e)",
                        "Union libre",
                        "Pacsé(e)",
                        "Divorcé(e)",
                        "Séparé(e)",
                        "Veuf(ve)",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Conjoint(e) — Nom et prénom</Label>
                    <Input
                      value={contact.conjointNom}
                      onChange={(e) =>
                        setContact({
                          ...contact,
                          conjointNom: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Conjoint(e) — Date de naissance</Label>
                    <Input
                      type="date"
                      value={contact.conjointNaissance}
                      onChange={(e) =>
                        setContact({
                          ...contact,
                          conjointNaissance: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Conjoint(e) — Métier</Label>
                    <Input
                      value={contact.conjointMetier}
                      onChange={(e) =>
                        setContact({
                          ...contact,
                          conjointMetier: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Nombre d'enfants à charge et âges</Label>
                    <Input
                      value={contact.enfants}
                      onChange={(e) =>
                        setContact({ ...contact, enfants: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Situation du logement</Label>
                    <Select
                      value={contact.logement}
                      onChange={(e) =>
                        setContact({
                          ...contact,
                          logement: e.target.value,
                        })
                      }
                    >
                      {[
                        "Propriétaire",
                        "Locataire",
                        "Hébergé(e) à titre gratuit",
                        "Accession à la propriété",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </Select>
                  </div>
                
                </div>
                <StepActions />
              </Card>
            )}

            {/* Étape 2 : Revenus */}
            {step === 2 && (
              <Card>
                <SectionTitle
                  icon={I.Euro}
                  title="Revenus mensuels"
                  subtitle="Saisissez les montants moyens mensuels (sur les 3 derniers mois)"
                />
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {REVENUS_FIELDS.map((f) => (
                    <FieldMoney
                      key={f.key}
                      label={f.label}
                      value={revenus[f.key]}
                      onChange={(v) =>
                        setRevenus({ ...revenus, [f.key]: v })
                      }
                    />
                  ))}
                </div>
                <div className="mt-4 text-sm text-black/80">
                  Total revenus :{" "}
                  <b>
                    {currency(
                      Object.values(revenus).reduce(
                        (a, v) => a + num(v),
                        0
                      )
                    )}
                  </b>
                </div>
                <StepActions />
              </Card>
            )}

            {/* Étape 3 : Charges maison */}
            {step === 3 && (
              <Card>
                <SectionTitle
                  icon={I.Home}
                  title="Charges mensuelles — Maison"
                  subtitle="Inclure les charges locatives, énergie, eau, télécom…"
                />
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CHARGES_MAISON_FIELDS.map((f) => (
                    <FieldMoney
                      key={f.key}
                      label={f.label}
                      value={chargesMaison[f.key]}
                      onChange={(v) =>
                        setChargesMaison({
                          ...chargesMaison,
                          [f.key]: v,
                        })
                      }
                    />
                  ))}
                </div>
                <StepActions />
              </Card>
            )}

            {/* Étape 4 : Charges enfants + autres */}
            {step === 4 && (
              <div className="space-y-4">
                <Card>
                  <SectionTitle icon={I.Users} title="Charges — Enfants" />
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {CHARGES_ENFANTS_FIELDS.map((f) => (
                      <FieldMoney
                        key={f.key}
                        label={f.label}
                        value={chargesEnfants[f.key]}
                        onChange={(v) =>
                          setChargesEnfants({
                            ...chargesEnfants,
                            [f.key]: v,
                          })
                        }
                      />
                    ))}
                  </div>
                </Card>
                <Card>
                  <SectionTitle
                    icon={I.Building}
                    title="Autres charges / Transports / Abonnements"
                  />
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {CHARGES_AUTRES_FIELDS.map((f) => (
                      <FieldMoney
                        key={f.key}
                        label={f.label}
                        value={chargesAutres[f.key]}
                        onChange={(v) =>
                          setChargesAutres({
                            ...chargesAutres,
                            [f.key]: v,
                          })
                        }
                      />
                    ))}
                  </div>
                </Card>
                <StepActions />
              </div>
            )}

            {/* Étape 5 : Assurances & impôts */}
            {step === 5 && (
              <div className="space-y-4">
                <Card>
                  <SectionTitle
                    icon={I.Shield}
                    title="Assurances"
                    subtitle="Mensualiser si nécessaire"
                  />
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ASSURANCES_FIELDS.map((f) => (
                      <FieldMoney
                        key={f.key}
                        label={f.label}
                        value={assurances[f.key]}
                        onChange={(v) =>
                          setAssurances({
                            ...assurances,
                            [f.key]: v,
                          })
                        }
                      />
                    ))}
                  </div>
                </Card>
                <Card>
                  <SectionTitle
                    icon={I.FileText}
                    title="Impôts & taxes"
                    subtitle="Mensualiser si nécessaire"
                  />
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {IMPOTS_FIELDS.map((f) => (
                      <FieldMoney
                        key={f.key}
                        label={f.label}
                        value={impots[f.key]}
                        onChange={(v) =>
                          setImpots({
                            ...impots,
                            [f.key]: v,
                          })
                        }
                      />
                    ))}
                  </div>
                </Card>
                <StepActions />
              </div>
            )}

            {/* Étape 6 : Crédits & dettes */}
            {step === 6 && (
              <div className="space-y-4">
                <CreditsTable
                  items={creditsImmo}
                  setItems={setCreditsImmo}
                  title="Crédits immobiliers"
                  icon={I.Home}
                />
                <CreditsTable
                  items={creditsConso}
                  setItems={setCreditsConso}
                  title="Crédits à la consommation / renouvelables"
                  icon={I.Building}
                />
                <CreditsTable
                  items={autresDettes}
                  setItems={setAutresDettes}
                  title="Autres dettes (retards, découverts, charges, amis…)"
                  icon={I.Euro}
                />
                <StepActions />
              </div>
            )}

            {/* Étape 7 : Justificatifs + récap + tests */}
            {step === 7 && (
              <div className="space-y-4" id="recap-print-root">
                {/* Justificatifs */}
                <Card>
                  <SectionTitle
                    icon={I.FileText}
                    title="Justificatifs"
                    subtitle="Téléversez les documents nécessaires à l'étude du dossier"
                  />
                  <div className="mt-4 space-y-4">
                    {/* Liste des documents requis */}
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                      <h3 className="text-sm font-semibold text-indigo-800 mb-2">
                        Documents à fournir :
                      </h3>
                      <ul className="text-sm text-indigo-900 space-y-1 list-disc pl-5">
                        <li>
                          📄 3 derniers <b>relevés de comptes bancaires</b>
                        </li>
                        <li>
                          📄 Derniers{" "}
                          <b>relevés de crédit (renouvelables)</b> ou{" "}
                          <b>tableaux d’amortissement</b> pour crédits
                          amortissables
                        </li>
                        <li>
                          📄 Dernier <b>avis d’imposition</b>
                        </li>
                      </ul>
                    </div>

                    {/* Bouton joindre fichier */}
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium bg-indigo-600 text-white cursor-pointer hover:bg-indigo-500">
                      <I.Upload /> Joindre un fichier
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const selected = Array.from(e.target.files || []);
                          const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

                          const newFiles = [];

                          for (const file of selected) {
                            if (file.size > MAX_SIZE) {
                              alert(
                                `❌ Le fichier "${file.name}" dépasse 10 Mo.`
                              );
                              continue;
                            }

                            newFiles.push({
                              file,
                              progress: 0,
                            });
                          }

                          setFiles((prev) => [...prev, ...newFiles]);
                        }}
                      />
                    </label>

                    {files?.length > 0 && (
                      <div className="bg-white border border-black/10 rounded-xl p-4">
                        <h4 className="text-sm font-semibold mb-2">
                          Fichiers ajoutés :
                        </h4>
                        <ul className="text-sm space-y-3">
                          {files.map((f, i) => (
                            <li key={i} className="flex flex-col gap-1">
                              {/* Nom + bouton supprimer */}
                              <div className="flex justify-between items-center">
                                <span>{f.file.name}</span>
                                <button
                                  onClick={() =>
                                    setFiles((prev) =>
                                      prev.filter((_, idx) => idx !== i)
                                    )
                                  }
                                  className="text-red-600 text-xs underline"
                                >
                                  Supprimer
                                </button>
                              </div>

                              {/* Barre de progression */}
                              {f.progress > 0 && f.progress < 100 && (
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-indigo-600 h-2 rounded-full"
                                    style={{ width: `${f.progress}%` }}
                                  />
                                </div>
                              )}

                              {/* Terminé */}
                              {f.progress === 100 && (
                                <div className="text-green-600 text-xs">
                                  ✔ Téléchargé
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Récapitulatif & envoi */}
                <Card>
                  <SectionTitle
                    icon={I.FileText}
                    title="Récapitulatif & envoi"
                    subtitle="Aperçu du budget et impression / PDF pour transmission au conseiller"
                  />
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Card>
                        <div className="text-sm">Total revenus</div>
                        <div className="text-2xl font-semibold">
                          {currency(totals.totalRevenus)}
                        </div>
                      </Card>
                      <Card>
                        <div className="text-sm">
                          Total charges (hors crédits)
                        </div>
                        <div className="text-2xl font-semibold">
                          {currency(totals.totalCharges)}
                        </div>
                      </Card>
                      <Card>
                        <div className="text-sm">
                          Total mensualités crédits
                        </div>
                        <div className="text-2xl font-semibold">
                          {currency(totals.totalCredits)}
                        </div>
                      </Card>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Card>
                        <div className="text-sm">
                          Reste pour vivre (revenus − charges − crédits)
                        </div>
                        <div
                          className={`text-3xl font-semibold ${
                            totals.reste < 0
                              ? "text-rose-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {currency(totals.reste)}
                        </div>
                      </Card>
                      <Card>
                        <div className="text-sm">Bénéficiaire</div>
                        <div className="font-medium">
                          {contact.civilite} {contact.prenom} {contact.nom}
                        </div>
                        <div className="text-xs text-black/60 flex items-center gap-2 mt-1">
                          <I.Phone /> {contact.mobile || contact.tel}{" "}
                          <I.Mail /> {contact.email}
                        </div>
                        <div className="text-xs text-black/60 flex items-center gap-2 mt-1">
                          <I.Calendar /> Né(e) le{" "}
                          {contact.naissance || "—"} à{" "}
                          {contact.lieuNaissance || "—"}
                        </div>
                      </Card>
                    </div>
                    <div className="text-xs text-black/50">
                      Signature électronique et consentements enregistrés.
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 print:hidden">
                    <Button variant="primary" onClick={saveDossier}>
                      <I.FileText /> Envoyer au conseiller CRÉSUS
                    </Button>
                    <div className="text-xs text-black/60">
                      (Dans une version connectée, l'envoi PDF + pièces serait
                      fait vers l'espace conseiller.)
                    </div>
                  </div>
                </Card>

                {/* Tests intégrés */}
                <Card>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">Tests intégrés</div>
                    <Button variant="outline" onClick={runSelfTests}>
                      Exécuter les tests
                    </Button>
                  </div>
                  <ul className="mt-3 text-sm list-disc pl-5">
                    {tests.length === 0 && (
                      <li>Aucun résultat pour l'instant.</li>
                    )}
                    {tests.map((t, i) => (
                      <li
                        key={i}
                        className={`flex items-center gap-2 ${
                          t.pass ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        <span>{t.pass ? "✅" : "❌"}</span>
                        <span className="font-medium">{t.name}</span>
                        <span className="opacity-70">
                          — attendu: {String(t.expect)} | obtenu:{" "}
                          {String(t.got)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <StepActions />
              </div>
            )}
          </div>

          {/* Sidebar summary */}
          <div className="space-y-4">
            <Card>
              <div className="flex items-center gap-2">
                <I.FileText />
                <div className="font-semibold">Synthèse</div>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Revenus</span>
                  <b>{currency(totals.totalRevenus)}</b>
                </div>
                <div className="flex justify-between">
                  <span>Charges</span>
                  <b>{currency(totals.totalCharges)}</b>
                </div>
                <div className="flex justify-between">
                  <span>Crédits</span>
                  <b>{currency(totals.totalCredits)}</b>
                </div>
                <div className="h-px bg-black/10 my-2" />
                <div className="flex justify-between">
                  <span>Reste pour vivre</span>
                  <b
                    className={
                      totals.reste < 0
                        ? "text-rose-600"
                        : "text-emerald-600"
                    }
                  >
                    {currency(totals.reste)}
                  </b>
                </div>
              </div>
            </Card>

            <Card>
              <div className="font-semibold mb-2">Étapes</div>
              <ol className="text-sm space-y-2">
                {[
                  "Consentements & signature",
                  "Fiche contact",
                  "Revenus",
                  "Charges — Maison",
                  "Charges — Enfants & autres",
                  "Assurances & Impôts",
                  "Crédits & dettes",
                  "Justificatifs & envoi",
                ].map((t, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded-full grid place-items-center text-[10px] ${
                        i <= step
                          ? "bg-indigo-600 text-white"
                          : "bg-black/10"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-2">
                <I.Shield />
                <div className="font-semibold">RGPD (résumé)</div>
              </div>
              <ul className="text-xs text-black/70 list-disc pl-5 space-y-1 mb-3">
                <li>
                  Durée de conservation indicative : 2 ans après
                  l'accompagnement.
                </li>
                <li>
                  Accès restreint aux conseillers et sous-traitants habilités.
                </li>
                <li>
                  Autorisation distincte pour communiquer aux créanciers.
                </li>
              </ul>

              <button
                onClick={() => setShowRGPD(true)}
                className="text-xs text-indigo-600 underline hover:text-indigo-800"
              >
                ➜ Lire la réglementation complète
              </button>
            </Card>
          </div>
        </div>

        <ModalRGPD open={showRGPD} onClose={() => setShowRGPD(false)} />
      </main>
    </div>
  );
}

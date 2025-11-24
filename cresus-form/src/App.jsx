import React, { useEffect, useMemo, useRef, useState } from "react";

// --- Icônes simples (aucune dépendance externe) ---
const I = {
  Download: () => <span>⬇️</span>,
  Upload: () => <span>📎</span>,
  Plus: () => <span>➕</span>,
  Trash: () => <span>🗑️</span>,
  ChevronLeft: () => <span>◀️</span>,
  ChevronRight: () => <span>▶️</span>,
  Shield: () => <span>🛡️</span>,
  Building: () => <span>🏢</span>,
  Euro: () => <span>💶</span>,
  Users: () => <span>👥</span>,
  Home: () => <span>🏠</span>,
  Phone: () => <span>📞</span>,
  Mail: () => <span>✉️</span>,
  Calendar: () => <span>📅</span>,
  Lock: () => <span>🔒</span>,
};

// --- Composants de base ---
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
  const styles = {
    default: "bg-black text-white hover:bg-black/90 focus:ring-black",
    ghost: "bg-transparent hover:bg-black/5",
    outline: "bg-white ring-1 ring-black/10 hover:bg-black/5",
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-600",
    danger: "bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-600",
  }[variant];
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
const Select = ({ children, ...props }) => (
  <select
    {...props}
    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
  >
    {children}
  </select>
);
const Textarea = (props) => (
  <textarea
    {...props}
    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
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
      {subtitle && (
        <p className="text-sm text-black/60 mt-0.5">{subtitle}</p>
      )}
    </div>
  </div>
);

// --- Fonctions utilitaires ---
const currency = (n) =>
  isNaN(n) ? "0" : Number(n).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const num = (v) =>
  v === "" || v === null || v === undefined ? 0 : Number(String(v).replace(",", ".")) || 0;

// --- Signature simplifiée ---
function SignaturePad() {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x =
        (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const y =
        (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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

// --- Étapes du formulaire ---
export default function App() {
  const [step, setStep] = useState(0);
  const TOTAL_STEPS = 4;

  const [contact, setContact] = useState({
    civilite: "Monsieur",
    nom: "",
    prenom: "",
    adresse: "",
    tel: "",
    email: "",
  });
  const [revenus, setRevenus] = useState({ salaire: "", aides: "", autres: "" });
  const [charges, setCharges] = useState({ loyer: "", factures: "", autres: "" });

  const totals = useMemo(() => {
    const totalRevenus = Object.values(revenus).reduce((a, v) => a + num(v), 0);
    const totalCharges = Object.values(charges).reduce((a, v) => a + num(v), 0);
    const reste = totalRevenus - totalCharges;
    return { totalRevenus, totalCharges, reste };
  }, [revenus, charges]);

  const next = () => setStep(Math.min(TOTAL_STEPS - 1, step + 1));
  const prev = () => setStep(Math.max(0, step - 1));

  const downloadPDF = () => window.print();

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <h1 className="text-2xl font-semibold text-center">
          CRÉSUS — Dossier bénéficiaire
        </h1>

        {step === 0 && (
          <Card>
            <SectionTitle icon={I.Shield} title="Consentement RGPD" />
            <p className="text-sm mt-3 text-gray-700">
              J’autorise CRÉSUS à collecter et traiter mes données personnelles
              dans le cadre de l’accompagnement budgétaire.
            </p>
            <div className="mt-3">
              <Label>Signature électronique</Label>
              <SignaturePad />
            </div>
            <div className="mt-4 flex justify-between">
              <Button disabled>◀️ Précédent</Button>
              <Button variant="primary" onClick={next}>
                Suivant ▶️
              </Button>
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <SectionTitle icon={I.Users} title="Fiche contact" />
            <div className="mt-4 grid grid-cols-1 gap-3">
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
              <div>
                <Label>Email</Label>
                <Input
                  value={contact.email}
                  onChange={(e) =>
                    setContact({ ...contact, email: e.target.value })
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
            </div>
            <div className="mt-4 flex justify-between">
              <Button onClick={prev}>◀️ Précédent</Button>
              <Button variant="primary" onClick={next}>
                Suivant ▶️
              </Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <SectionTitle icon={I.Euro} title="Budget mensuel" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div>
                <Label>Salaire</Label>
                <Input
                  inputMode="decimal"
                  value={revenus.salaire}
                  onChange={(e) =>
                    setRevenus({ ...revenus, salaire: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Aides</Label>
                <Input
                  inputMode="decimal"
                  value={revenus.aides}
                  onChange={(e) =>
                    setRevenus({ ...revenus, aides: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Autres revenus</Label>
                <Input
                  inputMode="decimal"
                  value={revenus.autres}
                  onChange={(e) =>
                    setRevenus({ ...revenus, autres: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Loyer</Label>
                <Input
                  inputMode="decimal"
                  value={charges.loyer}
                  onChange={(e) =>
                    setCharges({ ...charges, loyer: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Factures</Label>
                <Input
                  inputMode="decimal"
                  value={charges.factures}
                  onChange={(e) =>
                    setCharges({ ...charges, factures: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Autres charges</Label>
                <Input
                  inputMode="decimal"
                  value={charges.autres}
                  onChange={(e) =>
                    setCharges({ ...charges, autres: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="mt-4 text-sm">
              Total revenus : <b>{currency(totals.totalRevenus)}</b> <br />
              Total charges : <b>{currency(totals.totalCharges)}</b> <br />
              Reste pour vivre :{" "}
              <b
                className={
                  totals.reste < 0 ? "text-red-600" : "text-green-600"
                }
              >
                {currency(totals.reste)}
              </b>
            </div>

            <div className="mt-4 flex justify-between">
              <Button onClick={prev}>◀️ Précédent</Button>
              <Button variant="primary" onClick={next}>
                Suivant ▶️
              </Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <SectionTitle icon={I.Upload} title="Justificatifs & récapitulatif" />
            <p className="text-sm mt-3 text-gray-700">
              Joignez vos relevés bancaires, justificatifs de crédit, et avis
              d’imposition.
            </p>
            <input multiple type="file" className="mt-3" />
            <div className="mt-4 text-sm">
              <b>{contact.prenom} {contact.nom}</b> — {contact.email}
              <br />
              Reste pour vivre : {currency(totals.reste)}
            </div>
            <div className="mt-4 flex justify-between">
              <Button onClick={prev}>◀️ Précédent</Button>
              <Button variant="primary" onClick={downloadPDF}>
                ⬇️ Télécharger le PDF
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

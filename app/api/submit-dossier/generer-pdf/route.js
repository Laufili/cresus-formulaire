// app/api/generer-pdf/route.js
// Génère un PDF à partir d’un fichier formulaire.json

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    // Récupère le nom du dossier à convertir
    const { dossier } = await req.json();
    if (!dossier) {
      return NextResponse.json({ success: false, error: "Aucun dossier fourni." }, { status: 400 });
    }

    const root = process.cwd();
    const dossierPath = path.join(root, "dossiers", dossier);
    const jsonPath = path.join(dossierPath, "formulaire.json");
    const pdfPath = path.join(dossierPath, "dossier-CRESUS.pdf");

    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json({ success: false, error: "formulaire.json introuvable." }, { status: 404 });
    }

    // Lecture des données du JSON
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

    // Création du PDF
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(pdfPath));

    // --- EN-TÊTE ---
    doc.fontSize(18).fillColor("#1a365d").text("DOSSIER CRÉSUS", { align: "center" });
    doc.moveDown();

    // --- Identité ---
    doc.fontSize(14).fillColor("black").text("1. Identité et coordonnées", { underline: true });
    doc.fontSize(12).text(`Nom : ${data.identity?.nom || ""}`);
    doc.text(`Prénom : ${data.identity?.prenom || ""}`);
    doc.text(`Civilité : ${data.identity?.civilite || ""}`);
    doc.text(`Date de naissance : ${data.identity?.dateNaissance || ""}`);
    doc.text(`Téléphone : ${data.identity?.telephone || ""}`);
    doc.text(`Email : ${data.identity?.email || ""}`);
    doc.text(`Adresse : ${data.identity?.adresse || ""}`);
    doc.moveDown();

    // --- Situation ---
    doc.fontSize(14).text("2. Situation familiale et professionnelle", { underline: true });
    doc.fontSize(12).text(`Profession : ${data.situation?.profession || ""}`);
    doc.text(`Situation familiale : ${data.situation?.familiale || ""}`);
    doc.moveDown();

    // --- Budget : Revenus ---
    doc.fontSize(14).text("3. Budget mensuel", { underline: true });
    doc.fontSize(12).text("Revenus mensuels (€) :", { bold: true });
    doc.text(`Salaires : ${data.budget?.salaires || 0} €`);
    doc.text(`Allocations : ${data.budget?.allocations || 0} €`);
    doc.text(`Pensions : ${data.budget?.pensions || 0} €`);
    doc.text(`Autres revenus : ${data.budget?.autresRevenus || 0} €`);
    doc.moveDown();

    // --- Charges ---
    doc.text("Charges mensuelles (€) :", { bold: true });
    doc.text(`Loyer / Crédit immo : ${data.budget?.loyer || 0} €`);
    doc.text(`Énergie : ${data.budget?.energie || 0} €`);
    doc.text(`Télécom : ${data.budget?.telecom || 0} €`);
    doc.text(`Alimentation : ${data.budget?.alimentation || 0} €`);
    doc.text(`Santé : ${data.budget?.sante || 0} €`);
    doc.text(`Autres charges : ${data.budget?.autresCharges || 0} €`);
    doc.moveDown();

    // --- Crédits ---
    doc.fontSize(12).text("Crédits à la consommation :", { bold: true });
    for (let i = 0; i < 3; i++) {
      const nom = data.budget[`creditConsoNom${i}`] || "";
      const mens = data.budget[`creditConsoMens${i}`] || "";
      const crd = data.budget[`creditConsoCRD${i}`] || "";
      if (nom) doc.text(`• ${nom} — ${mens} €/mois — CRD : ${crd} €`);
    }
    doc.moveDown();

    doc.text("Crédits immobiliers :", { bold: true });
    for (let i = 0; i < 2; i++) {
      const nom = data.budget[`creditImmoNom${i}`] || "";
      const mens = data.budget[`creditImmoMens${i}`] || "";
      const crd = data.budget[`creditImmoCRD${i}`] || "";
      if (nom) doc.text(`• ${nom} — ${mens} €/mois — CRD : ${crd} €`);
    }

    // --- Pied de page ---
    doc.moveDown();
    doc.fontSize(10).fillColor("gray").text("Document généré automatiquement — CRÉSUS", { align: "center" });

    doc.end();

    return NextResponse.json({ success: true, pdfPath });
  } catch (err) {
    console.error("Erreur PDF:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
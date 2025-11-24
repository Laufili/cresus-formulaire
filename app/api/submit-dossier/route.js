// Active l’environnement Node.js pour utiliser fs et path
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import JSZip from "jszip";
import { promises as fs } from "fs";
import path from "path";

// Cette fonction s’exécute quand le formulaire est envoyé
export async function POST(req) {
  try {
    // 1️⃣ On récupère toutes les données envoyées
    const formData = await req.formData();

    // 2️⃣ On récupère les infos du formulaire (en JSON)
    const metaPart = formData.get("meta");
    if (!metaPart) {
      return NextResponse.json({ success: false, error: "Aucune donnée reçue." }, { status: 400 });
    }
    const meta = JSON.parse(await metaPart.text());

    // 3️⃣ On crée une archive ZIP
    const zip = new JSZip();
    zip.file("formulaire.json", JSON.stringify(meta, null, 2));

    // 4️⃣ On ajoute les fichiers justificatifs (les “pièces jointes”)
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_")) {
        const blob = value;
        const arrayBuffer = await blob.arrayBuffer();
        zip.file(`pieces/${blob.name}`, Buffer.from(arrayBuffer));
      }
    }

    // 5️⃣ On crée le dossier “dossiers” s’il n’existe pas encore
    const root = process.cwd();
    const dossierDir = path.join(root, "dossiers");
    await fs.mkdir(dossierDir, { recursive: true });

    // 6️⃣ On génère le fichier ZIP et on le sauvegarde
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const savePath = path.join(dossierDir, `dossier-${timestamp}.zip`);
    await fs.writeFile(savePath, buffer);

    // 7️⃣ Réponse de succès
    return NextResponse.json({ success: true, message: "Dossier reçu", path: savePath });
  } catch (err) {
    console.error("Erreur API submit-dossier:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
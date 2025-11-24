"use client";

import Link from "next/link";

export default function FormulaireAccueil() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-4 text-center">

      {/* GROS LOGO CRESUS */}
      <img
        src="/CRESUS_FONDATION.png"
        alt="Logo CRÉSUS"
        className="w-40 h-auto mb-8 drop-shadow-lg"
      />

      <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
        Bienvenue sur votre espace bénéficiaire
      </h1>

      <p className="mt-4 text-gray-600 max-w-xl text-sm md:text-base">
        Merci de compléter vos informations afin que votre conseiller CRÉSUS puisse 
        analyser votre situation et vous accompagner dans les meilleures conditions.
      </p>

      {/* BOUTON COMMENCER */}
      <Link
        href="/formulaire/start"
        className="mt-8 px-8 py-3 rounded-2xl bg-indigo-600 text-white text-lg font-medium hover:bg-indigo-500 shadow-md transition"
      >
        Commencer
      </Link>
    </div>
  );
}

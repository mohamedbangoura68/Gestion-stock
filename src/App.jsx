import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

// ─── MIGRATION SUPABASE REQUISE ───────────────────────────────────────────
// Pour activer les "onglets personnalisés par utilisateur", ajoutez une colonne
// à la table app_users dans Supabase (SQL Editor) :
//   ALTER TABLE app_users ADD COLUMN custom_nav jsonb DEFAULT NULL;
// custom_nav = NULL  → l'utilisateur suit les permissions par défaut de son rôle
// custom_nav = ["dashboard","sales",...] → liste personnalisée qui remplace le rôle


// ─── DONNÉES INITIALES ────────────────────────────────────────────────────────
const INITIAL_PRODUCTS = [
  { name: "Ciment Portland CPA", ref: "CIM-001", category: "Ciment", subcategory: "CPA 42.5", buy_price: 85000, sell_price: 95000, qty: 250, alert: 50, unit: "Sac 50kg", supplier: "CIMAF Guinée", image: "" },
  { name: "Fer à béton Ø12", ref: "FER-012", category: "Fer", subcategory: "Ronds à béton", buy_price: 95000, sell_price: 110000, qty: 120, alert: 20, unit: "Barre 12m", supplier: "SOMINEX", image: "" },
  { name: "Fer à béton Ø10", ref: "FER-010", category: "Fer", subcategory: "Ronds à béton", buy_price: 72000, sell_price: 85000, qty: 8, alert: 20, unit: "Barre 12m", supplier: "SOMINEX", image: "" },
  { name: "Peinture Satinée Blanche", ref: "PEI-001", category: "Peinture", subcategory: "Satinée", buy_price: 180000, sell_price: 220000, qty: 45, alert: 10, unit: "Seau 20L", supplier: "Valentine", image: "" },
  { name: "Carrelage Sol 60x60", ref: "CAR-001", category: "Carrelage", subcategory: "Sol", buy_price: 95000, sell_price: 125000, qty: 3, alert: 15, unit: "m²", supplier: "SOGUIPAH", image: "" },
  { name: "Tuyau PVC Ø100", ref: "PLB-001", category: "Plomberie", subcategory: "Tuyaux", buy_price: 35000, sell_price: 45000, qty: 60, alert: 20, unit: "Barre 3m", supplier: "Africaplast", image: "" },
  { name: "Câble électrique 2.5mm²", ref: "ELC-001", category: "Électricité", subcategory: "Câbles", buy_price: 28000, sell_price: 38000, qty: 200, alert: 30, unit: "Rouleau 100m", supplier: "Nexans", image: "" },
  { name: "Briques pleines", ref: "BRQ-001", category: "Briques", subcategory: "Pleines", buy_price: 800, sell_price: 1200, qty: 2000, alert: 500, unit: "Unité", supplier: "Local", image: "" },
];
// Catégories de clients prédéfinies (l'utilisateur peut aussi en saisir une autre)
const CLIENT_CATEGORIES = ["Détail", "Grossiste", "Demi Grossiste", "Distributeur"];
const CATEGORY_OTHER = "__autre__";
const INITIAL_CLIENTS = [
  { name: "Mamadou Bah", phone: "622 00 11 22", address: "Matam, Conakry", email: "mbah@email.com", category: "Détail", debt: 450000, total_purchases: 3200000 },
  { name: "Entreprise SODIHA", phone: "628 33 44 55", address: "Kaloum, Conakry", email: "contact@sodiha.gn", category: "Grossiste", debt: 0, total_purchases: 12500000 },
  { name: "Alpha Diallo", phone: "620 66 77 88", address: "Ratoma, Conakry", email: "", category: "Détail", debt: 180000, total_purchases: 850000 },
];
const INITIAL_SUPPLIERS = [
  { name: "CIMAF Guinée", contact: "Directeur Commercial", phone: "631 11 22 33", address: "Zone Industrielle Matoto", email: "cimaf@gn.com", total_orders: 8500000 },
  { name: "SOMINEX", contact: "Service Vente", phone: "625 44 55 66", address: "Almamya, Conakry", email: "sominex@gn.com", total_orders: 5200000 },
  { name: "Africaplast", contact: "M. Konaté", phone: "628 77 88 99", address: "Dixinn, Conakry", email: "africaplast@gn.com", total_orders: 1800000 },
];
const INITIAL_SALES = [
  { date: "2025-05-28", client: "Mamadou Bah", items: [{ product: "Ciment Portland CPA", qty: 10, price: 95000 }], total: 950000, payment: "Espèces", status: "Payé" },
  { date: "2025-05-28", client: "Entreprise SODIHA", items: [{ product: "Carrelage Sol 60x60", qty: 50, price: 125000 }], total: 6250000, payment: "Virement", status: "Payé" },
  { date: "2025-05-27", client: "Alpha Diallo", items: [{ product: "Peinture Satinée Blanche", qty: 3, price: 220000 }], total: 660000, payment: "Mobile Money", status: "Partiel" },
];
const INITIAL_EXPENSES = [
  { date: "2025-05-28", type: "Salaire", description: "Salaire Mai - Ibrahima", amount: 1500000, justif: "Reçu signé" },
  { date: "2025-05-27", type: "Transport", description: "Livraison ciment site BTP", amount: 250000, justif: "" },
  { date: "2025-05-26", type: "Loyer", description: "Loyer Mai 2025", amount: 2000000, justif: "Quittance" },
];
const CATEGORIES = ["Ciment", "Fer", "Peinture", "Carrelage", "Plomberie", "Électricité", "Briques", "Sable/Gravier", "Bois", "Électroménager", "Autre"];

// ─── PHOTOS PRODUITS (Supabase Storage) ───────────────────────────────────────
const PRODUCT_PHOTO_BUCKET = "product-photos";
// Réduit l'image (max 800px, JPEG) avant envoi pour économiser l'espace et accélérer l'affichage
const compressImage = (file, maxSize = 800, quality = 0.8) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const r = Math.min(1, maxSize / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    c.toBlob(b => { URL.revokeObjectURL(url); b ? resolve(b) : reject(new Error("Compression impossible")); }, "image/jpeg", quality);
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image illisible")); };
  img.src = url;
});
const uploadProductPhoto = async (file) => {
  const blob = await compressImage(file);
  const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(PRODUCT_PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) {
    if (/bucket not found/i.test(error.message)) throw new Error("Le bucket « product-photos » n'existe pas : exécutez le SQL de configuration dans Supabase.");
    if (/row-level security|policy/i.test(error.message)) throw new Error("Droits d'envoi manquants : exécutez le SQL de configuration (policies Storage) dans Supabase.");
    throw new Error(error.message);
  }
  return supabase.storage.from(PRODUCT_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
};
const removeProductPhoto = async (url) => {
  try {
    const marker = `/${PRODUCT_PHOTO_BUCKET}/`; const i = (url || "").indexOf(marker);
    if (i < 0) return;
    await supabase.storage.from(PRODUCT_PHOTO_BUCKET).remove([decodeURIComponent(url.slice(i + marker.length))]);
  } catch (e) { /* nettoyage non bloquant */ }
};
// Date de péremption : libellé + couleur (périmé / bientôt / ok)
const expiryInfo = (d) => {
  if (!d) return null;
  const days = Math.ceil((new Date(d + "T00:00:00") - new Date().setHours(0, 0, 0, 0)) / 86400000);
  const label = String(d).split("-").reverse().join("/");
  if (days < 0) return { label, note: "Périmé", color: "#ef4444" };
  if (days <= 30) return { label, note: `J-${days}`, color: "#f59e0b" };
  return { label, note: "", color: null };
};
const isExpired = (p) => expiryInfo(p?.expiry_date)?.note === "Périmé";

// ─── TARIFICATION À LA CAISSE ─────────────────────────────────────────────────
// Catégorie client -> champ de prix du produit. Toute catégorie saisie manuellement
// (hors les 4 prédéfinies) utilise le champ « Autres prix de vente » (price_autre).
const normCat = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
const STATE_STYLE = {
  "Payé":{bg:"rgba(34,197,94,0.15)",color:"#22c55e"},
  "Partiel":{bg:"rgba(245,158,11,0.15)",color:"#f59e0b"},
  "Impayé":{bg:"rgba(239,68,68,0.15)",color:"#ef4444"},
  "Annulé":{bg:"rgba(148,163,184,0.18)",color:"#94a3b8"},
  "Livré":{bg:"rgba(34,197,94,0.15)",color:"#22c55e"},
  "Annulée":{bg:"rgba(148,163,184,0.18)",color:"#94a3b8"},
  "Retourné":{bg:"rgba(168,85,247,0.15)",color:"#a855f7"},
  "En attente":{bg:"rgba(59,130,246,0.15)",color:"#60a5fa"},
  "Converti":{bg:"rgba(34,197,94,0.15)",color:"#22c55e"},
  "Refusé":{bg:"rgba(239,68,68,0.15)",color:"#ef4444"},
  "Expiré":{bg:"rgba(148,163,184,0.18)",color:"#94a3b8"},
};
const normText = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const priceFieldForCategory = (cat) => {
  const c = normCat(cat);
  if (!c || c === "detail") return "sell_price";
  if (c === "demigrossiste" || c === "demigros") return "price_demi_gros";
  if (c === "grossiste" || c === "gros") return "price_gros";
  if (c === "distributeur") return "price_distributeur";
  return "price_autre";
};
// Prix automatique : promo (si case cochée et prix promo défini) > prix de la catégorie > prix détail
const resolvePrice = (p, clientCat, promo) => {
  if (promo && p.price_promo != null) return { price: p.price_promo, source: "Promo" };
  const f = priceFieldForCategory(clientCat);
  if (f !== "sell_price" && p[f] != null) return { price: p[f], source: clientCat || "Détail" };
  return { price: p.sell_price || 0, source: f === "sell_price" ? "Détail" : "Détail (pas de prix " + clientCat + ")" };
};
const ROLES_LIST = ["Administrateur", "Caissier", "Gestionnaire Stock"];

// ─── PERMISSIONS PAR RÔLE ─────────────────────────────────────────────────────
// Chaque rôle définit quels onglets il voit + ses droits (can_write, can_delete)
const PERMISSIONS = {
  Administrateur: {
    nav: ["dashboard","products","stock","sales","billing","deliveries","clients","suppliers","expenses","users","accounting","settings"],
    write: ["products","stock","sales","billing","deliveries","clients","suppliers","expenses","users","settings"],
    delete: ["products","clients","suppliers","users","billing","deliveries"],
  },
  Caissier: {
    nav: ["dashboard","sales","billing","deliveries","clients"],
    write: ["sales","billing","deliveries","clients"],
    delete: [],
  },
  "Gestionnaire Stock": {
    nav: ["dashboard","products","stock","suppliers"],
    write: ["products","stock","suppliers"],
    delete: ["products"],
  },
};
// canAccess accepte soit un rôle (string) soit un objet user complet.
// Si l'utilisateur a des onglets personnalisés (custom_nav non vide), ceux-ci
// remplacent la liste par défaut du rôle. Sinon on retombe sur les permissions du rôle.
const canAccess = (roleOrUser, page) => {
  if (roleOrUser && typeof roleOrUser === "object") {
    if (Array.isArray(roleOrUser.custom_nav) && roleOrUser.custom_nav.length > 0) {
      return roleOrUser.custom_nav.includes(page);
    }
    return (PERMISSIONS[roleOrUser.role]?.nav || []).includes(page);
  }
  return (PERMISSIONS[roleOrUser]?.nav || []).includes(page);
};
const canWrite  = (role, page) => (PERMISSIONS[role]?.write || []).includes(page);
const canDelete = (role, page) => (PERMISSIONS[role]?.delete || []).includes(page);

// ─── THÈMES ───────────────────────────────────────────────────────────────────
const THEMES = {
  dark:  { bg:"#111111", sidebar:"#0f0f0f", card:"#1a1a1a", cardBorder:"rgba(255,255,255,0.07)", text:"#ffffff", textSub:"#9ca3af", textMuted:"#6b7280", input:"rgba(255,255,255,0.06)", inputBorder:"rgba(255,255,255,0.1)", headerBg:"#0f0f0f", headerBorder:"rgba(255,255,255,0.06)", navActive:"linear-gradient(135deg,rgba(249,115,22,0.2),rgba(249,115,22,0.1))", navActiveBorder:"#f97316", navText:"#6b7280", rowHover:"rgba(255,255,255,0.03)", tableHead:"rgba(255,255,255,0.04)", userCard:"rgba(255,255,255,0.04)", accent:"#f97316", name:"Sombre", optionBg:"#1e1e1e", optionColor:"#e5e7eb" },
  light: { bg:"#F4F4F4", sidebar:"#191919", card:"#ffffff", cardBorder:"rgba(0,0,0,0.07)", text:"#0f172a", textSub:"#FB1A1A", textMuted:"#F76B00", input:"rgba(0,0,0,0.04)", inputBorder:"rgba(0,0,0,0.12)", headerBg:"#EBE7E7", headerBorder:"rgba(0,0,0,0.08)", navActive:"linear-gradient(135deg,rgba(249,115,22,0.12),rgba(249,115,22,0.06))", navActiveBorder:"#f97316", navText:"#64748b", rowHover:"rgba(0,0,0,0.02)", tableHead:"rgba(0,0,0,0.03)", userCard:"rgba(0,0,0,0.03)", accent:"#f97316", name:"Clair", optionBg:"#ffffff", optionColor:"#0f172a" },
  blue:  { bg:"#0f172a", sidebar:"#0a1628", card:"#1e293b", cardBorder:"rgba(148,163,184,0.1)", text:"#f1f5f9", textSub:"#94a3b8", textMuted:"#64748b", input:"rgba(148,163,184,0.08)", inputBorder:"rgba(148,163,184,0.15)", headerBg:"#0a1628", headerBorder:"rgba(148,163,184,0.1)", navActive:"linear-gradient(135deg,rgba(59,130,246,0.2),rgba(59,130,246,0.1))", navActiveBorder:"#3b82f6", navText:"#64748b", rowHover:"rgba(148,163,184,0.04)", tableHead:"rgba(148,163,184,0.06)", userCard:"rgba(148,163,184,0.06)", accent:"#3b82f6", name:"Océan", optionBg:"#1e293b", optionColor:"#f1f5f9" },
  green: { bg:"#0a1a0f", sidebar:"#061209", card:"#0f2018", cardBorder:"rgba(34,197,94,0.1)", text:"#f0fdf4", textSub:"#86efac", textMuted:"#4ade80", input:"rgba(34,197,94,0.06)", inputBorder:"rgba(34,197,94,0.15)", headerBg:"#061209", headerBorder:"rgba(34,197,94,0.1)", navActive:"linear-gradient(135deg,rgba(34,197,94,0.2),rgba(34,197,94,0.1))", navActiveBorder:"#22c55e", navText:"#4ade80", rowHover:"rgba(34,197,94,0.03)", tableHead:"rgba(34,197,94,0.06)", userCard:"rgba(34,197,94,0.06)", accent:"#22c55e", name:"Forêt", optionBg:"#0f2018", optionColor:"#f0fdf4" },
};

const fmtGNF = (v) => new Intl.NumberFormat("fr-GN",{style:"currency",currency:"GNF",maximumFractionDigits:0}).format(v||0);

// Montant net d'une facture = total - retours (0 si annulée)
const saleNet = (s) => s.status === "Annulé" ? 0 : Math.max(0, (+s.total || 0) - (+s.returned || 0));

// ─── DATE LOCALE (évite le décalage UTC) ─────────────────────────────────────
const localDateStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
};
const localMonthStr = (d = new Date()) => localDateStr(d).slice(0,7);

// ─── ICÔNES SVG ───────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20 }) => {
  const icons = {
    dashboard:<path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>,
    products:<path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>,
    stock:<path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>,
    sales:<path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>,
    clients:<path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>,
    suppliers:<path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>,
    expenses:<path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>,
    users:<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>,
    accounting:<path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>,
    settings:<path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>,
    delivery:<path strokeLinecap="round" strokeLinejoin="round" d="M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z"/>,
    billing:<path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>,
    plus:<path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>,
    edit:<path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>,
    trash:<path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>,
    search:<path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>,
    bell:<path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>,
    close:<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>,
    check:<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>,
    chart:<path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>,
    print:<path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>,
    warning:<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>,
    logout:<path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>,
    menu:<path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>,
    eye:<><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></>,
    download:<path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>,
    palette:<path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>,
    key:<path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>,
    lock:<path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>,
    shield:<path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>,
    building:<path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>,
    tag:<path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>,
    pin:<path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"/>,
    calendar:<path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>,
    user:<path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>,
    cash:<path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>,
    card:<path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>,
    phone:<path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>,
    mail:<path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>,
    clipboard:<path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>,
    flame:<path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657zM9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"/>,
    arrow:<path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>,
    trend:<path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>,
    ban:<path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>,
    moon:<path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>,
    sun:<path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>,
    drop:<path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5c3 3.5 6 6.5 6 10a6 6 0 11-12 0c0-3.5 3-6.5 6-10z"/>,
    leaf:<path strokeLinecap="round" strokeLinejoin="round" d="M5 21c0-9 5-14 15-16 0 10-5 15-14 15m-1 1c1-4 4-7 8-9"/>,
    inbox:<path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>,
    upload:<path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>,
    image:<path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>,
    briefcase:<path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>,
    undo:<path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>,
    chevdown:<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>,
    chevup:<path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/>,
    save:<path strokeLinecap="round" strokeLinejoin="round" d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4zM12 17a3 3 0 100-6 3 3 0 000 6zm3-10H7V4h8v3z"/>,
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{display:"inline-block",verticalAlign:"-0.18em",flexShrink:0}}>
      {icons[name]}
    </svg>
  );
};

const ShopLogo = ({ url, size = 32, accent = "#f97316", radius = 12 }) => url
  ? <img src={url} alt="Logo" style={{width:size,height:size,objectFit:"contain",borderRadius:radius,background:"#fff",flexShrink:0}}/>
  : <div className="flex items-center justify-center flex-shrink-0" style={{width:size,height:size,borderRadius:radius,background:`linear-gradient(135deg,${accent},${accent}bb)`,color:"#fff"}}><Icon name="building" size={Math.round(size*0.55)}/></div>;
// Réduit le logo (PNG, fond transparent conservé) et le renvoie en data URL
const fileToLogoDataUrl = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file); const img = new Image();
  img.onload = () => {
    for (const max of [320, 220, 150]) {
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const d = c.toDataURL("image/png");
      if (d.length < 300000 || max === 150) { URL.revokeObjectURL(url); resolve(d); return; }
    }
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image illisible")); };
  img.src = url;
});

// ─── COMPOSANTS UI DE BASE ────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, T, wide = false }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
    <div className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-2xl overflow-hidden shadow-2xl`} style={{ background: T.card, border: `1px solid ${T.accent}44` }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: T.cardBorder }}>
        <h3 className="font-bold text-base" style={{ color: T.text }}>{title}</h3>
        <button onClick={onClose} style={{ color: T.textMuted }}><Icon name="close" size={20} /></button>
      </div>
      <div className="p-5 max-h-[75vh] overflow-y-auto">{children}</div>
    </div>
  </div>
);

const Field = ({ label, type = "text", value, onChange, options, optionLabels, required, T, placeholder = "" }) => (
  <div>
    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: T.textSub }}>
      {label}{required && <span className="text-orange-400 ml-1">*</span>}
    </label>
    {options ? (
      <>
        <style>{`select.themed-select option { background-color: ${T.optionBg || "#1e1e1e"} !important; color: ${T.optionColor || "#e5e7eb"} !important; }`}</style>
        <select value={value} onChange={e => onChange(e.target.value)} className="themed-select mt-1 w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: T.card, border: `1px solid ${T.inputBorder}`, color: T.text }}>
          <option value="">-- Choisir --</option>
          {options.map((o, i) => <option key={o} value={o}>{optionLabels ? optionLabels[i] : o}</option>)}
        </select>
      </>
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text }} />
    )}
  </div>
);

const ProductThumb = ({ p, size = 28 }) => p.photo_url
  ? <img src={p.photo_url} alt="" loading="lazy" className="rounded-lg object-cover shrink-0" style={{ width: size, height: size }} />
  : <Icon name="products" size={Math.round(size * 0.55)}/>;

const Btn = ({ onClick, children, variant = "primary", size = "md", className = "", T, disabled = false }) => {
  const ac = T?.accent || "#f97316";
  const styles = {
    primary: { background: disabled ? "#6b7280" : `linear-gradient(135deg,${ac},${ac}cc)`, color: "#fff", boxShadow: disabled ? "none" : `0 4px 15px ${ac}44` },
    success: { background: disabled ? "#6b7280" : "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff" },
    danger:  { background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" },
    ghost:   { background: T ? T.input : "rgba(255,255,255,0.06)", color: T ? T.textSub : "#d1d5db", border: `1px solid ${T ? T.inputBorder : "rgba(255,255,255,0.1)"}` },
  };
  const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  return <button onClick={onClick} disabled={disabled} className={`${pad} rounded-xl font-semibold transition-all ${className}`} style={styles[variant]}>{children}</button>;
};

const ErrBox = ({ msg }) => msg ? (
  <div className="mb-3 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}><Icon name="warning" size={14}/> {msg}</div>
) : null;

const OkBox = ({ msg }) => msg ? (
  <div className="mb-3 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: "rgba(34,197,94,0.12)", color: "#86efac", border: "1px solid rgba(34,197,94,0.3)" }}><Icon name="check" size={14}/> {msg}</div>
) : null;

// Bandeau "accès refusé" pour les pages interdites
const AccessDenied = ({ T, role }) => (
  <div className="flex flex-col items-center justify-center h-64 gap-4">
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)" }}>
      <span style={{ color: "#ef4444" }}><Icon name="lock" size={32} /></span>
    </div>
    <div className="text-center">
      <p className="font-bold text-lg" style={{ color: T.text }}>Accès refusé</p>
      <p className="text-sm mt-1" style={{ color: T.textMuted }}>
        Le rôle <span style={{ color: T.accent, fontWeight: 700 }}>{role}</span> n'a pas accès à cette section.
      </p>
    </div>
  </div>
);

const StatCard = ({ label, value, icon, color, sub, T, themeName }) => {
  const isLight = themeName === "light";
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: isLight ? `${color}14` : T.card, border: `1px solid ${isLight ? `${color}40` : T.cardBorder}` }}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full -mr-8 -mt-8 opacity-10" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: T.textMuted }}>{label}</p>
          <p className="text-2xl font-black mt-1" style={{ color: isLight ? color : T.text }}>{value}</p>
          {sub && <p className="text-xs mt-1" style={{ color }}>{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, color }}>
          <Icon name={icon} size={20} />
        </div>
      </div>
    </div>
  );
};

const MiniBar = ({ data, color }) => {
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-t" style={{ height: `${(d.v / max) * 64}px`, background: color, opacity: 0.7 + (i / data.length) * 0.3 }} />
          <span className="text-xs" style={{ color: "#6b7280" }}>{d.l}</span>
        </div>
      ))}
    </div>
  );
};

// ─── SÉLECTEUR THÈME ──────────────────────────────────────────────────────────
const ThemePicker = ({ themeName, setThemeName, T }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="p-2 rounded-xl" style={{ background: T.input, color: T.accent, border: `1px solid ${T.inputBorder}` }} title="Thème">
        <Icon name="palette" size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-11 rounded-2xl p-3 z-50 shadow-2xl min-w-[160px]" style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.textMuted }}>Thème</p>
          {Object.entries(THEMES).map(([key, th]) => (
            <button key={key} onClick={() => { setThemeName(key); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium" style={{ background: themeName === key ? `${th.accent}20` : "transparent", color: themeName === key ? th.accent : T.textSub }}>
              <div className="w-4 h-4 rounded-full" style={{ background: th.accent }} />
              {th.name}
              {themeName === key && <span className="ml-auto"><Icon name="check" size={12} /></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Pastille de rôle colorée
const RoleBadge = ({ role }) => {
  const colors = {
    Administrateur:        { bg: "rgba(239,68,68,0.15)",    color: "#fca5a5" },
    Caissier:              { bg: "rgba(59,130,246,0.15)",   color: "#93c5fd" },
    "Gestionnaire Stock":  { bg: "rgba(168,85,247,0.15)",   color: "#d8b4fe" },
  };
  const c = colors[role] || { bg: "rgba(100,116,139,0.15)", color: "#94a3b8" };
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={c}>{role}</span>;
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
const LoginPage = ({ onLogin }) => {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showPwd, setShowPwd]   = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError("Veuillez remplir l'email et le mot de passe."); return; }
    setLoading(true); setError("");
    const { data, error: err } = await supabase
      .from("app_users").select("*")
      .eq("email", email.trim().toLowerCase())
      .eq("active", true).single();
    if (err || !data) { setError("Email introuvable ou compte désactivé."); setLoading(false); return; }
    if (data.password !== password) { setError("Mot de passe incorrect."); setLoading(false); return; }
    await supabase.from("app_users").update({ last_login: new Date().toISOString() }).eq("id", data.id);
    onLogin({ id: data.id, name: data.name, role: data.role, email: data.email, custom_nav: data.custom_nav || null });
  };

  const saved = (() => { try { return JSON.parse(localStorage.getItem("bfy_shop_settings") || "{}"); } catch { return {}; } })();
  const fld = { width: "100%", padding: "13px 14px 13px 42px", borderRadius: 12, background: "#f6f4f2", border: "1px solid #f0ebe6", color: "#1f2937", fontSize: 14, outline: "none" };
  const ico = { position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#f97316" };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "#fff7f0", padding: 20 }}>
      <style>{`
        .lg-card{display:flex;width:100%;max-width:880px;min-height:540px;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 24px 60px rgba(249,115,22,.16);position:relative;z-index:1}
        .lg-side{flex:1;position:relative;overflow:hidden;background:linear-gradient(145deg,#fb923c 0%,#f97316 55%,#ea580c 100%);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 32px}
        .lg-main{flex:1.1;display:flex;flex-direction:column;justify-content:center;padding:44px 48px}
        @media(max-width:760px){.lg-side{display:none}.lg-main{padding:32px 24px}}
      `}</style>
      <div style={{ position: "absolute", top: -90, right: -70, width: 260, height: 260, borderRadius: "50%", background: "#fdba74", opacity: .55 }}/>
      <div style={{ position: "absolute", bottom: -110, left: -80, width: 300, height: 300, borderRadius: "50%", background: "#fed7aa", opacity: .7 }}/>
      <div className="lg-card">
        <div className="lg-side">
          <div style={{ position: "absolute", top: 28, left: 28, display: "flex", alignItems: "center", gap: 8 }}>
            <ShopLogo url={saved.logo_url} size={34} accent="#ffffff22" radius={10}/>
            <span style={{ fontWeight: 700, fontSize: 13, opacity: .95 }}>{saved.shop_name || "MOGESTOCK"}</span>
          </div>
          <div style={{ position: "absolute", top: 70, right: 36, width: 52, height: 52, background: "rgba(255,255,255,.14)", transform: "rotate(45deg)", borderRadius: 8 }}/>
          <div style={{ position: "absolute", bottom: 60, right: 50, width: 26, height: 26, background: "rgba(255,255,255,.16)", transform: "rotate(45deg)", borderRadius: 5 }}/>
          <div style={{ position: "absolute", bottom: -70, left: -50, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,.12)" }}/>
          <div style={{ position: "relative" }}>
            <h1 style={{ fontSize: 34, fontWeight: 900, letterSpacing: .5, marginBottom: 10 }}>MOGESTOCK</h1>
            <p style={{ fontSize: 13, lineHeight: 1.6, opacity: .92, maxWidth: 240, margin: "0 auto" }}>Application de Gestion d'une boutique et stock</p>
          </div>
        </div>
        <div className="lg-main">
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <h2 style={{ fontSize: 30, fontWeight: 900, color: "#f97316" }}>Connexion</h2>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>Entrez vos identifiants pour accéder à l'application</p>
          </div>
          <ErrBox msg={error} />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ position: "relative" }}>
              <span style={ico}><Icon name="mail" size={17}/></span>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={fld}/>
            </div>
            <div style={{ position: "relative" }}>
              <span style={ico}><Icon name="lock" size={17}/></span>
              <input type={showPwd?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={{ ...fld, paddingRight: 42 }}/>
              <button type="button" onClick={()=>setShowPwd(v=>!v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}><Icon name={showPwd?"close":"eye"} size={16}/></button>
            </div>
            <button onClick={handleLogin} disabled={loading} style={{ marginTop: 8, alignSelf: "center", minWidth: 220, padding: "13px 28px", borderRadius: 999, fontWeight: 700, fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase", color: "#fff", background: loading ? "#d1d5db" : "linear-gradient(135deg,#fb923c,#ea580c)", boxShadow: loading ? "none" : "0 8px 22px rgba(249,115,22,.4)" }}>
              {loading ? "Vérification..." : "Se connecter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const Dashboard = ({ products, sales, clients, expenses, T, user, shopSettings, themeName }) => {
  const role = user.role;
  const isAdmin = role === "Administrateur";
  const today = localDateStr();
  const todaySales = sales.filter(s=>s.date===today).reduce((a,s)=>a+saleNet(s),0);
  const monthSales = sales.reduce((a,s)=>a+saleNet(s),0);
  const totalDebt = clients.reduce((a,c)=>a+(c.debt||0),0);
  const lowStock = products.filter(p=>p.qty<=p.alert);
  const totalExpenses = expenses.reduce((a,e)=>a+e.amount,0);
  const salesData = [{l:"Jan",v:8200000},{l:"Fév",v:9500000},{l:"Mar",v:7800000},{l:"Avr",v:11000000},{l:"Mai",v:monthSales||1}];
  const topProducts = products.slice(0,5).map(p=>({l:p.name.slice(0,7),v:p.qty*(p.sell_price||0)}));
  const shopName = shopSettings?.shop_name || "BOUMAYAH ET FILS";
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{color:T.text}}>Tableau de bord</h1>
          <p className="text-sm mt-0.5" style={{color:T.textMuted}}>{new Date().toLocaleDateString("fr-FR",{weekday:"long",year:"numeric",month:"long",day:"numeric"})} · {shopName}</p>
        </div>
        <div className="flex items-center gap-2">
          <RoleBadge role={role} />
          {isAdmin && <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{background:`linear-gradient(135deg,${T.accent},${T.accent}bb)`}}><Icon name="print" size={15}/> Rapport</button>}
        </div>
      </div>
      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)"}}>
          <span style={{color:"#ef4444"}}><Icon name="warning" size={18}/></span>
          <span className="text-red-600 text-sm font-medium">{lowStock.length} produit(s) en stock faible : {lowStock.map(p=>p.name).join(", ")}</span>
        </div>
      )}
      {/* Stats visibles selon le rôle */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {canAccess(user,"sales") && <StatCard label="CA Aujourd'hui" value={fmtGNF(todaySales)} icon="chart" color="#f97316" T={T} themeName={themeName}/>}
        {canAccess(user,"sales") && <StatCard label="CA du mois" value={fmtGNF(monthSales)} icon="sales" color="#22c55e" T={T} themeName={themeName}/>}
        {isAdmin && <StatCard label="Bénéfice estimé" value={fmtGNF(monthSales*0.15)} icon="accounting" color="#3b82f6" sub="Marge 15%" T={T} themeName={themeName}/>}
        {isAdmin && <StatCard label="Dettes clients" value={fmtGNF(totalDebt)} icon="clients" color="#f59e0b" T={T} themeName={themeName}/>}
        {canAccess(user,"products") && <StatCard label="Produits" value={products.length} icon="products" color="#8b5cf6" T={T} themeName={themeName}/>}
        {canAccess(user,"stock") && <StatCard label="Stock faible" value={lowStock.length} icon="warning" color="#ef4444" T={T} themeName={themeName}/>}
        {canAccess(user,"clients") && <StatCard label="Clients" value={clients.length} icon="clients" color="#06b6d4" T={T} themeName={themeName}/>}
        {isAdmin && <StatCard label="Dépenses" value={fmtGNF(totalExpenses)} icon="expenses" color="#ec4899" T={T} themeName={themeName}/>}
      </div>
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
            <h3 className="text-sm font-bold mb-4" style={{color:T.text}}>Évolution des ventes 2025</h3>
            <MiniBar data={salesData} color={T.accent}/>
          </div>
          <div className="rounded-2xl p-5" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
            <h3 className="text-sm font-bold mb-4" style={{color:T.text}}>Top produits par valeur</h3>
            {topProducts.length>0 && <MiniBar data={topProducts} color="#22c55e"/>}
          </div>
        </div>
      )}
      {canAccess(user,"sales") && (
        <div className="rounded-2xl p-5" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
          <h3 className="text-sm font-bold mb-4" style={{color:T.text}}>Dernières ventes</h3>
          <div className="space-y-2">
            {sales.slice(0,5).map(s=>(
              <div key={s.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{background:T.rowHover}}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{background:`${T.accent}20`,color:T.accent}}>#{s.id}</div>
                  <div><p className="text-sm font-semibold" style={{color:T.text}}>{s.client}</p><p className="text-xs" style={{color:T.textMuted}}>{s.date} · {s.payment}</p></div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{color:T.text}}>{fmtGNF(s.total)}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{background:s.status==="Payé"?"rgba(34,197,94,0.15)":"rgba(245,158,11,0.15)",color:s.status==="Payé"?"#22c55e":"#f59e0b"}}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── PRODUCTS PAGE ────────────────────────────────────────────────────────────
const ProductsPage = ({ products, setProducts, T, userRole }) => {
  const write = canWrite(userRole,"products");
  const del   = canDelete(userRole,"products");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const empty = {name:"",ref:"",category_select:"",category_custom:"",subcategory:"",buy_price:"",cost_price:"",sell_price:"",price_demi_gros:"",price_gros:"",price_distributeur:"",price_autre:"",price_promo:"",qty:"",alert:"10",unit:"Unité",supplier:"",expiry_date:"",image:"",photo_url:"",photoFile:null,photoPreview:""};
  const [form, setForm] = useState(empty);
  // Catégories saisies à la main déjà utilisées → réutilisables dans la liste et le filtre
  const customProdCats = [...new Set(products.map(p=>(p.category||"").trim()).filter(x=>x&&!CATEGORIES.includes(x)))];
  const prodCatOptions = [...CATEGORIES, ...customProdCats, CATEGORY_OTHER];
  const prodCatLabels = [...CATEGORIES, ...customProdCats, "Autre (saisir une catégorie)"];
  const onPickPhoto = (e) => {
    const file = e.target.files?.[0]; if(!file) return;
    if(!file.type.startsWith("image/")){setErrMsg("Le fichier choisi doit être une image.");return;}
    if(file.size>10*1024*1024){setErrMsg("Image trop lourde (max 10 Mo).");return;}
    setErrMsg(""); setForm(f=>({...f,photoFile:file,photoPreview:URL.createObjectURL(file)}));
  };
  const removePhoto = () => setForm(f=>({...f,photoFile:null,photoPreview:"",photo_url:""}));
  const filtered = products.filter(p=>(p.name.toLowerCase().includes(search.toLowerCase())||(p.ref||"").toLowerCase().includes(search.toLowerCase()))&&(catFilter?p.category===catFilter:true));
  const openAdd = () => { setEditing(null); setForm(empty); setErrMsg(""); setShowModal(true); };
  const openEdit = (p) => { setEditing(p.id); const n=(v)=>v==null?"":String(v);
    setForm({...p,category_select:p.category||"",category_custom:"",buy_price:String(p.buy_price||""),cost_price:n(p.cost_price),sell_price:String(p.sell_price||""),price_demi_gros:n(p.price_demi_gros),price_gros:n(p.price_gros),price_distributeur:n(p.price_distributeur),price_autre:n(p.price_autre),price_promo:n(p.price_promo),expiry_date:p.expiry_date||"",photo_url:p.photo_url||"",photoFile:null,photoPreview:"",qty:String(p.qty),alert:String(p.alert)}); setErrMsg(""); setShowModal(true); };
  const save = async () => {
    if (!form.name){setErrMsg("Nom et catégorie obligatoires.");return;}
    const category = form.category_select===CATEGORY_OTHER ? form.category_custom.trim() : form.category_select;
    if (!category){setErrMsg(form.category_select===CATEGORY_OTHER?"Saisissez le nom de la catégorie.":"Nom et catégorie obligatoires.");return;}
    setSaving(true); setErrMsg("");
    let photo_url = form.photo_url||null;
    if (form.photoFile) {
      try { photo_url = await uploadProductPhoto(form.photoFile); }
      catch(e){ setErrMsg("Erreur photo : "+e.message); setSaving(false); return; }
    }
    const optNum = (v) => (v===""||v==null) ? null : (Math.round(+v)||0);
    const item={name:form.name,ref:form.ref,category,subcategory:form.subcategory,buy_price:+form.buy_price||0,cost_price:optNum(form.cost_price),sell_price:+form.sell_price||0,price_demi_gros:optNum(form.price_demi_gros),price_gros:optNum(form.price_gros),price_distributeur:optNum(form.price_distributeur),price_autre:optNum(form.price_autre),price_promo:optNum(form.price_promo),qty:+form.qty||0,alert:+form.alert||0,unit:form.unit,supplier:form.supplier,expiry_date:form.expiry_date||null,image:form.image,photo_url};
    if(editing){
      const {error}=await supabase.from("products").update(item).eq("id",editing);
      if(error){setErrMsg("Erreur : "+error.message);setSaving(false);return;}
      const oldPhoto = products.find(p=>p.id===editing)?.photo_url;
      if(oldPhoto && oldPhoto!==photo_url) removeProductPhoto(oldPhoto);
      setProducts(prev=>prev.map(p=>p.id===editing?{...item,id:editing}:p));
    } else {
      const {data,error}=await supabase.from("products").insert([item]).select();
      if(error){setErrMsg("Erreur : "+error.message);setSaving(false);return;}
      setProducts(prev=>[...prev,data[0]]);
    }
    setSaving(false); setShowModal(false);
  };
  const doDelete = async (id) => {
    if(!window.confirm("Supprimer ce produit ?"))return;
    const {error}=await supabase.from("products").delete().eq("id",id);
    if(!error){removeProductPhoto(products.find(p=>p.id===id)?.photo_url);setProducts(prev=>prev.filter(p=>p.id!==id));}
    else alert("Erreur : "+error.message);
  };
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{color:T.text}}>Produits</h1>
        {write && <Btn onClick={openAdd} T={T}><span className="flex items-center gap-1"><Icon name="plus" size={14}/> Nouveau produit</span></Btn>}
      </div>
      {!write && <div className="px-4 py-2 rounded-xl text-xs font-medium" style={{background:`${T.accent}15`,color:T.accent}}><Icon name="eye" size={14}/> Mode lecture seule — votre rôle ne permet pas de modifier les produits.</div>}
      <div className="flex gap-3">
        <div className="flex-1 relative"><span className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:T.textMuted}}><Icon name="search" size={16}/></span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none" style={{background:T.input,border:`1px solid ${T.inputBorder}`,color:T.text}}/></div>
        <><style>{`select.themed-select option{background-color:${T.optionBg||"#1e1e1e"} !important;color:${T.optionColor||"#e5e7eb"} !important;}`}</style><select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="themed-select px-3 py-2.5 rounded-xl text-sm outline-none" style={{background:T.card,border:`1px solid ${T.inputBorder}`,color:T.text}}><option value="">Toutes</option>{[...CATEGORIES,...customProdCats].map(c=><option key={c} value={c}>{c}</option>)}</select></>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
        <div className="overflow-x-auto"><table className="w-full">
          <thead><tr style={{background:T.tableHead}}>{["Produit","Réf.","Catégorie","Prix achat","Prix vente détail","Stock","Péremption","Fournisseur",...(write||del?[""]:[])].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{color:T.textMuted}}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(p=>(
              <tr key={p.id} className="border-t" style={{borderColor:T.cardBorder}}>
                <td className="px-4 py-3"><div className="flex items-center gap-2"><ProductThumb p={p} size={36}/><span className="text-sm font-medium" style={{color:T.text}}>{p.name}</span></div></td>
                <td className="px-4 py-3 text-xs font-mono" style={{color:T.textMuted}}>{p.ref}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{background:`${T.accent}20`,color:T.accent}}>{p.category}</span></td>
                <td className="px-4 py-3 text-sm" style={{color:T.textSub}}>{fmtGNF(p.buy_price)}</td>
                <td className="px-4 py-3 text-sm font-semibold" style={{color:T.text}} title={[["Revient",p.cost_price],["Demi-gros",p.price_demi_gros],["Gros",p.price_gros],["Distributeur",p.price_distributeur],["Autre",p.price_autre],["Promo",p.price_promo]].filter(([,v])=>v!=null).map(([l,v])=>`${l} : ${fmtGNF(v)}`).join("\n")}>{fmtGNF(p.sell_price)}{p.price_promo!=null&&<span className="block text-xs font-bold" style={{color:"#f59e0b"}}><Icon name="flame" size={14}/> Promo {fmtGNF(p.price_promo)}</span>}</td>
                <td className="px-4 py-3"><span className="font-bold text-sm" style={{color:p.qty<=p.alert?"#ef4444":"#22c55e"}}>{p.qty} <span className="text-xs font-normal" style={{color:T.textMuted}}>{p.unit}</span></span>{p.qty<=p.alert&&<span className="ml-1"><Icon name="warning" size={14}/></span>}</td>
                <td className="px-4 py-3 text-xs whitespace-nowrap">{(()=>{const e=expiryInfo(p.expiry_date);return e?<span style={{color:e.color||T.textSub}}>{e.label}{e.note&&<b className="ml-1">({e.note})</b>}</span>:<span style={{color:T.textMuted}}>—</span>;})()}</td>
                <td className="px-4 py-3 text-xs" style={{color:T.textMuted}}>{p.supplier}</td>
                {(write||del)&&<td className="px-4 py-3"><div className="flex gap-2">{write&&<Btn onClick={()=>openEdit(p)} variant="ghost" size="sm" T={T}><Icon name="edit" size={13}/></Btn>}{del&&<Btn onClick={()=>doDelete(p.id)} variant="danger" size="sm" T={T}><Icon name="trash" size={13}/></Btn>}</div></td>}
              </tr>
            ))}
          </tbody>
        </table></div>
        {filtered.length===0&&<p className="text-center py-10" style={{color:T.textMuted}}>Aucun produit trouvé</p>}
      </div>
      {showModal&&write&&(
        <Modal title={editing?"Modifier produit":"Nouveau produit"} onClose={()=>setShowModal(false)} T={T}>
          <ErrBox msg={errMsg}/>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Field label="Nom du produit" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} required T={T}/></div>
            <Field label="Référence" value={form.ref} onChange={v=>setForm(f=>({...f,ref:v}))} T={T}/>
            <Field label="Catégorie" value={form.category_select} onChange={v=>setForm(f=>({...f,category_select:v}))} options={prodCatOptions} optionLabels={prodCatLabels} required T={T}/>
            {form.category_select===CATEGORY_OTHER&&<div className="col-span-2"><Field label="Nouvelle catégorie" value={form.category_custom} onChange={v=>setForm(f=>({...f,category_custom:v}))} placeholder="Ex : Quincaillerie, Outillage..." required T={T}/></div>}
            <Field label="Sous-catégorie" value={form.subcategory} onChange={v=>setForm(f=>({...f,subcategory:v}))} T={T}/>
            <Field label="Unité" value={form.unit} onChange={v=>setForm(f=>({...f,unit:v}))} T={T}/>
            <div className="col-span-2 pt-1"><p className="text-xs font-bold uppercase tracking-wider" style={{color:T.accent}}><Icon name="cash" size={14}/> Tarification (GNF)</p></div>
            <Field label="Prix d'achat" type="number" value={form.buy_price} onChange={v=>setForm(f=>({...f,buy_price:v}))} T={T}/>
            <Field label="Prix de revient" type="number" value={form.cost_price} onChange={v=>setForm(f=>({...f,cost_price:v}))} T={T}/>
            <Field label="Prix de vente détail" type="number" value={form.sell_price} onChange={v=>setForm(f=>({...f,sell_price:v}))} T={T}/>
            <Field label="Prix vente demi-grossiste" type="number" value={form.price_demi_gros} onChange={v=>setForm(f=>({...f,price_demi_gros:v}))} T={T}/>
            <Field label="Prix vente grossiste" type="number" value={form.price_gros} onChange={v=>setForm(f=>({...f,price_gros:v}))} T={T}/>
            <Field label="Prix vente distributeur" type="number" value={form.price_distributeur} onChange={v=>setForm(f=>({...f,price_distributeur:v}))} T={T}/>
            <Field label="Autres prix de vente" type="number" value={form.price_autre} onChange={v=>setForm(f=>({...f,price_autre:v}))} T={T}/>
            <Field label="Prix promo" type="number" value={form.price_promo} onChange={v=>setForm(f=>({...f,price_promo:v}))} T={T}/>
            <div className="col-span-2 pt-1"><p className="text-xs font-bold uppercase tracking-wider" style={{color:T.accent}}><Icon name="products" size={14}/> Stock</p></div>
            <Field label="Quantité" type="number" value={form.qty} onChange={v=>setForm(f=>({...f,qty:v}))} T={T}/>
            <Field label="Seuil alerte" type="number" value={form.alert} onChange={v=>setForm(f=>({...f,alert:v}))} T={T}/>
            <Field label="Fournisseur" value={form.supplier} onChange={v=>setForm(f=>({...f,supplier:v}))} T={T}/>
            <Field label="Date de péremption" type="date" value={form.expiry_date} onChange={v=>setForm(f=>({...f,expiry_date:v}))} T={T}/>
            <div className="col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{color:T.textSub}}>Photo du produit</label>
              <div className="mt-1 flex items-center gap-3">
                <div className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center text-3xl shrink-0" style={{background:T.input,border:`1px solid ${T.inputBorder}`}}>
                  {(form.photoPreview||form.photo_url)?<img src={form.photoPreview||form.photo_url} alt="" className="w-full h-full object-cover"/>:<Icon name="products" size={28}/>}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <input type="file" accept="image/*" onChange={onPickPhoto} className="block w-full text-xs" style={{color:T.textSub}}/>
                  {(form.photoPreview||form.photo_url)&&<button type="button" onClick={removePhoto} className="text-xs underline" style={{color:"#ef4444"}}>Retirer la photo</button>}
                  <p className="text-[10px]" style={{color:T.textMuted}}>Optionnel · JPG, PNG, WebP · compressée automatiquement</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5"><Btn onClick={()=>setShowModal(false)} variant="ghost" T={T}>Annuler</Btn><Btn onClick={save} T={T}>{saving?"Enregistrement...":"Enregistrer"}</Btn></div>
        </Modal>
      )}
    </div>
  );
};

// ─── STOCK PAGE ───────────────────────────────────────────────────────────────
const StockPage = ({ products, setProducts, T, userRole, user }) => {
  const write = canWrite(userRole,"stock");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({productName:"",qty:"",type:"Entrée",reason:""});
  const [errMsg, setErrMsg] = useState("");
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(true);

  // Charger l'historique depuis Supabase
  useEffect(() => {
    const loadHistory = async () => {
      setHistLoading(true);
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*")
        .order("id", { ascending: false })
        .limit(100);
      if (!error && data) setHistory(data);
      setHistLoading(false);
    };
    loadHistory();
  }, []);

  const saveStock = async () => {
    const prod=products.find(p=>p.name.toLowerCase()===form.productName.trim().toLowerCase());
    if(!prod){setErrMsg("Produit introuvable. Choisissez un nom dans la liste.");return;}
    if(!form.qty||+form.qty<=0){setErrMsg("Quantité invalide.");return;}
    const isIn=form.type==="Entrée";
    const newQty=prod.qty+(isIn?+form.qty:-(+form.qty));
    const {error}=await supabase.from("products").update({qty:newQty}).eq("id",prod.id);
    if(error){setErrMsg("Erreur : "+error.message);return;}
    setProducts(prev=>prev.map(p=>p.id===prod.id?{...p,qty:newQty}:p));
    // Sauvegarder le mouvement dans Supabase avec le nom de l'utilisateur
    const movement = {
      date: localDateStr(),
      product: prod.name,
      type: form.type,
      qty: +form.qty,
      reason: form.reason,
      user_name: user?.name || "Inconnu",
      user_role: user?.role || "",
    };
    const { data: mvData, error: mvError } = await supabase
      .from("stock_movements")
      .insert([movement])
      .select();
    if (!mvError && mvData) {
      setHistory(prev=>[mvData[0], ...prev]);
    } else {
      // Fallback local si table absente
      setHistory(prev=>[{id:Date.now(), ...movement}, ...prev]);
    }
    setShowModal(false); setForm({productName:"",qty:"",type:"Entrée",reason:""});
  };
  const lowStock=products.filter(p=>p.qty<=p.alert);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{color:T.text}}>Gestion du Stock</h1>
        {write&&<Btn onClick={()=>{setErrMsg("");setShowModal(true);}} variant="success" T={T}><span className="flex items-center gap-1"><Icon name="plus" size={14}/> Mouvement</span></Btn>}
      </div>
      {lowStock.length>0&&<div className="rounded-2xl p-4" style={{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.2)"}}><h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2"><Icon name="warning" size={15}/>Alertes ({lowStock.length})</h3><div className="grid grid-cols-2 lg:grid-cols-4 gap-2">{lowStock.map(p=><div key={p.id} className="px-3 py-2 rounded-xl" style={{background:"rgba(239,68,68,0.08)"}}><p className="text-white text-xs font-semibold">{p.name}</p><p className="text-red-400 text-xs">{p.qty} {p.unit} (seuil:{p.alert})</p></div>)}</div></div>}
      <div className="rounded-2xl overflow-hidden" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
        <div className="px-4 py-3 border-b flex justify-between" style={{borderColor:T.cardBorder}}><h3 className="font-bold text-sm" style={{color:T.text}}>État du stock</h3><span className="text-xs" style={{color:T.textMuted}}>{products.length} produits</span></div>
        <table className="w-full">
          <thead><tr style={{background:T.tableHead}}>{["Produit","Catégorie","Stock actuel","Seuil alerte","Valeur stock","Statut"].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs uppercase tracking-wider" style={{color:T.textMuted}}>{h}</th>)}</tr></thead>
          <tbody>{products.map(p=>(
            <tr key={p.id} className="border-t" style={{borderColor:T.cardBorder}}>
              <td className="px-4 py-3 text-sm font-medium" style={{color:T.text}}><span className="inline-flex items-center gap-2"><ProductThumb p={p} size={24}/>{p.name}</span></td>
              <td className="px-4 py-3 text-xs" style={{color:T.textMuted}}>{p.category}</td>
              <td className="px-4 py-3 font-bold text-sm" style={{color:p.qty<=p.alert?"#ef4444":"#22c55e"}}>{p.qty} {p.unit}</td>
              <td className="px-4 py-3 text-xs" style={{color:T.textMuted}}>{p.alert}</td>
              <td className="px-4 py-3 text-sm" style={{color:T.text}}>{fmtGNF(p.qty*p.buy_price)}</td>
              <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{background:p.qty<=0?"rgba(239,68,68,0.15)":p.qty<=p.alert?"rgba(245,158,11,0.15)":"rgba(34,197,94,0.15)",color:p.qty<=0?"#ef4444":p.qty<=p.alert?"#f59e0b":"#22c55e"}}>{p.qty<=0?"Rupture":p.qty<=p.alert?"Faible":"Normal"}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{borderColor:T.cardBorder}}>
          <h3 className="font-bold text-sm" style={{color:T.text}}>Historique des mouvements</h3>
          <span className="text-xs" style={{color:T.textMuted}}>{histLoading ? "Chargement…" : `${history.length} mouvement(s)`}</span>
        </div>
        {histLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{borderColor:T.accent,borderTopColor:"transparent"}}/>
          </div>
        ) : (
          <table className="w-full">
            <thead><tr style={{background:T.tableHead}}>{["Date","Produit","Type","Qté","Raison","Utilisateur"].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs uppercase tracking-wider" style={{color:T.textMuted}}>{h}</th>)}</tr></thead>
            <tbody>{history.length === 0
              ? <tr><td colSpan={6} className="text-center py-8 text-sm" style={{color:T.textMuted}}>Aucun mouvement enregistré</td></tr>
              : history.map(h=>(
              <tr key={h.id} className="border-t" style={{borderColor:T.cardBorder}}>
                <td className="px-4 py-3 text-xs" style={{color:T.textMuted}}>{h.date}</td>
                <td className="px-4 py-3 text-sm" style={{color:T.text}}>{h.product}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{background:h.type==="Entrée"?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)",color:h.type==="Entrée"?"#22c55e":"#ef4444"}}>{h.type}</span></td>
                <td className="px-4 py-3 text-sm font-bold" style={{color:T.text}}>{h.type==="Entrée"?"+":"-"}{h.qty}</td>
                <td className="px-4 py-3 text-xs" style={{color:T.textMuted}}>{h.reason||"—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{background:`linear-gradient(135deg,${T.accent},${T.accent}aa)`}}>
                      {(h.user_name||h.user||"?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{color:T.text}}>{h.user_name||h.user||"Inconnu"}</p>
                      {h.user_role&&<p className="text-xs" style={{color:T.textMuted}}>{h.user_role}</p>}
                    </div>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {showModal&&write&&(
        <Modal title="Mouvement de stock" onClose={()=>setShowModal(false)} T={T}>
          <ErrBox msg={errMsg}/>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{color:T.textSub}}>Produit <span className="text-orange-400">*</span></label>
              <datalist id="prodlist">{products.map(p=><option key={p.id} value={p.name}/>)}</datalist>
              <input
                list="prodlist"
                value={form.productName}
                onChange={e=>setForm(f=>({...f,productName:e.target.value}))}
                placeholder="Tapez ou choisissez un produit…"
                className="mt-1 w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{background:T.input,border:`1px solid ${T.inputBorder}`,color:T.text}}
              />
              {form.productName&&(()=>{const p=products.find(x=>x.name.toLowerCase()===form.productName.trim().toLowerCase());return p?<p className="text-xs mt-1 px-3 py-1.5 rounded-lg" style={{background:T.rowHover,color:T.accent}}><Icon name="check" size={14}/> {p.name} — Stock actuel : <strong>{p.qty} {p.unit}</strong></p>:form.productName.length>2?<p className="text-xs mt-1 px-3 py-1.5 rounded-lg" style={{background:"rgba(239,68,68,0.08)",color:"#f87171"}}>Produit non trouvé</p>:null;})()}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type" value={form.type} onChange={v=>setForm(f=>({...f,type:v}))} options={["Entrée","Sortie - Vente","Sortie - Perte","Sortie - Casse"]} T={T}/>
              <Field label="Quantité" type="number" value={form.qty} onChange={v=>setForm(f=>({...f,qty:v}))} required T={T}/>
            </div>
            <Field label="Raison" value={form.reason} onChange={v=>setForm(f=>({...f,reason:v}))} T={T}/>
          </div>
          <div className="flex justify-end gap-3 mt-5"><Btn onClick={()=>setShowModal(false)} variant="ghost" T={T}>Annuler</Btn><Btn onClick={saveStock} variant="success" T={T}>Valider</Btn></div>
        </Modal>
      )}
    </div>
  );
};

// ─── SALES PAGE ───────────────────────────────────────────────────────────────
// ─── VENTES EN ATTENTE (repli local si la table « held_sales » est absente) ───
const HELD_KEY = "mgs_held_sales";
const heldLocalRead = () => { try { return JSON.parse(localStorage.getItem(HELD_KEY) || "[]"); } catch { return []; } };
const heldLocalWrite = (arr) => { try { localStorage.setItem(HELD_KEY, JSON.stringify(arr)); } catch {} };
const isLocalHeld = (id) => String(id).startsWith("local-");

const SalesPage = ({ setDeliveries, products, setProducts, sales, setSales, clients, setClients, T, userRole, shopSettings, user, preload, onPreloadDone }) => {
  const write = canWrite(userRole,"sales");
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [payment, setPayment] = useState("Espèces");
  const [discount, setDiscount] = useState(0);
  // Paiement partiel
  const [amountPaid, setAmountPaid] = useState("");
  // Options de facture : vente oubliée (date passée), échéance de paiement, livraison prévue, note
  const [showOpts, setShowOpts] = useState(false);
  const [invDate, setInvDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [saleNote, setSaleNote] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showInvoice, setShowInvoice] = useState(null);
  const [showDevis, setShowDevis] = useState(null);
  const [detailSale, setDetailSale] = useState(null); // modal "Voir plus"
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [usePromo, setUsePromo] = useState(false); // case « prix promo »
  // Sélecteur de client avec recherche (nouveaux clients en premier : `clients` est trié du plus récent au plus ancien)
  const [clientQuery, setClientQuery] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const clientMatches = clients.filter(c=>{
    const q=normText(clientQuery).trim(); if(!q) return true;
    const digits=clientQuery.replace(/\D/g,"");
    return normText(c.name).includes(q)||normText(c.category).includes(q)||(digits&&(c.phone||"").replace(/\D/g,"").includes(digits));
  });
  const pickClient = (name) => { setSelectedClient(name); setClientQuery(""); setClientOpen(false); };

  // Devis chargé depuis l'onglet Facturation (« Convertir en facture »)
  const [linkedDevis, setLinkedDevis] = useState(null);
  // Ventes mises en attente
  const [held, setHeld] = useState([]);
  const [heldDb, setHeldDb] = useState(true);
  const [showHeld, setShowHeld] = useState(false);
  const [linkedHeld, setLinkedHeld] = useState(null); // vente en attente actuellement reprise dans le panier
  const [notice, setNotice] = useState("");
  const [toDeliver, setToDeliver] = useState(false);
  const [deliveryAddr, setDeliveryAddr] = useState("");
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("held_sales").select("*").order("id", { ascending: false });
      if (!error) { setHeldDb(true); setHeld(data || []); } else { setHeldDb(false); setHeld(heldLocalRead()); }
    })();
  }, []);
  useEffect(() => {
    if (!preload) return;
    const lines = [], missing = [];
    (preload.items || []).forEach(it => {
      const p = products.find(x => x.id === it.product_id) || products.find(x => normText(x.name).trim() === normText(it.product).trim());
      if (!p) { missing.push(it.product); return; }
      if (isExpired(p)) { missing.push(`${p.name} (périmé)`); return; }
      lines.push({ ...p, qty: +it.qty || 1, manualPrice: it.price });
    });
    setCart(lines);
    setSelectedClient(preload.client && preload.client !== "Client comptoir" ? preload.client : "");
    setDiscount(+preload.discount || 0);
    setUsePromo(false);
    setLinkedDevis({ id: preload.id, num: preload.id });
    setLinkedHeld(null);
    setErrMsg(missing.length ? `Articles non repris du devis : ${missing.join(", ")}.` : "");
    onPreloadDone && onPreloadDone();
    // eslint-disable-next-line
  }, [preload]);

  // Catégorie du client sélectionné (client comptoir = Détail)
  const clientObj = clients.find(c=>c.name===selectedClient);
  const clientCat = clientObj?.category || "Détail";
  // Prix unitaire effectif d'une ligne : prix manuel > promo > prix de la catégorie
  const cartPrice = (i) => i.manualPrice!=null ? (+i.manualPrice||0) : resolvePrice(i,clientCat,usePromo).price;

  const filtered = products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||(p.ref||"").toLowerCase().includes(search.toLowerCase()));
  const addToCart = (p) => {
    if(isExpired(p)){setErrMsg(`« ${p.name} » est périmé (${expiryInfo(p.expiry_date).label}) : vente impossible.`);return;}
    setErrMsg("");
    setCart(prev=>{const ex=prev.find(i=>i.id===p.id);if(ex)return prev.map(i=>i.id===p.id?{...i,qty:(+i.qty||0)+1}:i);return[...prev,{...p,qty:1,manualPrice:null}];});
  };
  const updateCartQty = (id,qty) => {if(qty<=0)setCart(prev=>prev.filter(i=>i.id!==id));else setCart(prev=>prev.map(i=>i.id===id?{...i,qty}:i));};
  // Saisie directe de la quantité ("" autorisé pendant la frappe)
  const setCartQtyRaw = (id,v) => setCart(prev=>prev.map(i=>i.id===id?{...i,qty:v===""?"":Math.max(0,Math.floor(+v)||0)}:i));
  const fixCartQty = (id) => setCart(prev=>prev.map(i=>i.id===id&&!(+i.qty>0)?{...i,qty:1}:i));
  // Saisie manuelle du prix ("" = retour au prix automatique au blur)
  const setCartPriceRaw = (id,v) => setCart(prev=>prev.map(i=>i.id===id?{...i,manualPrice:v}:i));
  const fixCartPrice = (id) => setCart(prev=>prev.map(i=>i.id===id&&i.manualPrice===""?{...i,manualPrice:null}:i));
  const resetCartPrice = (id) => setCart(prev=>prev.map(i=>i.id===id?{...i,manualPrice:null}:i));
  const subtotal = cart.reduce((a,i)=>a+cartPrice(i)*(+i.qty||0),0);
  const total = Math.round(subtotal - subtotal*(discount/100));
  const shopName = shopSettings?.shop_name || "MOGESTOCK";

  // Calcul paiement partiel
  const paid = (amountPaid === "" || amountPaid == null) ? total : Math.min(Math.max(+amountPaid || 0, 0), total);
  const remaining = total - paid;
  const isPartial = remaining > 0;

  const validateSale = async () => {
    if(cart.length===0){setErrMsg("Le panier est vide.");return;}
    const expiredItem=cart.find(i=>isExpired(i));
    if(expiredItem){setErrMsg(`« ${expiredItem.name} » est périmé : retirez-le du panier pour valider la vente.`);return;}
    if(cart.some(i=>!(+i.qty>0))){setErrMsg("Chaque article doit avoir une quantité supérieure à 0.");return;}
    if(isPartial && !selectedClient){setErrMsg("Sélectionnez un client pour un paiement partiel.");return;}
    const today=localDateStr();
    if(invDate && invDate>today){setErrMsg("La date de la facture ne peut pas être dans le futur.");setShowOpts(true);return;}
    if(isPartial && dueDate && dueDate<(invDate||today)){setErrMsg("L'échéance ne peut pas précéder la date de la facture.");setShowOpts(true);return;}
    setSaving(true); setErrMsg("");
    const status = isPartial ? (paid > 0 ? "Partiel" : "Impayé") : "Payé";
    // Champs facultatifs : envoyés seulement s'ils sont renseignés (la vente classique n'a besoin d'aucune colonne en plus)
    const extra={
      ...(isPartial && dueDate ? {due_date:dueDate} : {}),
      ...(deliveryDate ? {delivery_date:deliveryDate} : {}),
      ...(saleNote.trim() ? {note:saleNote.trim()} : {}),
    };
    const sale={
      date: invDate || today,
      client: selectedClient||"Client comptoir",
      items: cart.map(i=>({product:i.name,qty:+i.qty,price:cartPrice(i),product_id:i.id})),
      total,
      paid,
      remaining,
      payment,
      status,
      seller_name: user?.name || "Inconnu",
      ...extra,
    };
    const {data,error}=await supabase.from("sales").insert([sale]).select();
    if(error){setErrMsg("Erreur : "+error.message+(Object.keys(extra).length?" — exécutez la mise à jour de facturation.sql (colonnes due_date, delivery_date, note).":""));setSaving(false);return;}
    setSales(prev=>[data[0],...prev]);

    // Livraison : la vente devient une livraison « En attente »
    if(toDeliver){
      const cl=clients.find(c=>c.name===selectedClient);
      const dl={sale_id:data[0].id,client:data[0].client,address:deliveryAddr.trim()||cl?.address||null,phone:cl?.phone||null,planned_date:deliveryDate||null,status:"En attente",note:saleNote.trim()||null,created_by:user?.name||"Inconnu"};
      const {data:dd,error:de}=await supabase.from("deliveries").insert([dl]).select();
      if(de||!dd?.[0]) setNotice("Vente enregistrée, mais la livraison n'a pas pu être créée : "+(de?.message||"erreur")+" (exécutez livraisons.sql).");
      else setDeliveries(prev=>[dd[0],...prev]);
    }

    // Mise à jour stock
    for(const ci of cart){const prod=products.find(p=>p.id===ci.id);if(prod)await supabase.from("products").update({qty:prod.qty-ci.qty}).eq("id",prod.id);}
    setProducts(prev=>prev.map(p=>{const ci=cart.find(c=>c.id===p.id);return ci?{...p,qty:p.qty-ci.qty}:p;}));

    // Mise à jour dette client si paiement partiel
    if(isPartial && selectedClient){
      const client = clients.find(c=>c.name===selectedClient);
      if(client){
        const newDebt = (client.debt||0) + remaining;
        const newTotal = (client.total_purchases||0) + total;
        await supabase.from("clients").update({debt:newDebt,total_purchases:newTotal}).eq("id",client.id);
        setClients(prev=>prev.map(c=>c.id===client.id?{...c,debt:newDebt,total_purchases:newTotal}:c));
      }
    } else if(selectedClient) {
      // Paiement complet : mettre à jour total_purchases seulement
      const client = clients.find(c=>c.name===selectedClient);
      if(client){
        const newTotal = (client.total_purchases||0) + total;
        await supabase.from("clients").update({total_purchases:newTotal}).eq("id",client.id);
        setClients(prev=>prev.map(c=>c.id===client.id?{...c,total_purchases:newTotal}:c));
      }
    }

    if(linkedHeld){ await deleteHeldRec(linkedHeld.id); setHeld(prev=>prev.filter(x=>x.id!==linkedHeld.id)); setLinkedHeld(null); }
    if(linkedDevis){ await supabase.from("devis").update({status:"Converti",sale_id:data[0].id}).eq("id",linkedDevis.id); setLinkedDevis(null); }
    setShowInvoice(data[0]); setToDeliver(false); setDeliveryAddr("");
    setCart([]); setSelectedClient(""); setDiscount(0); setAmountPaid(""); setUsePromo(false); setInvDate(""); setDueDate(""); setDeliveryDate(""); setSaleNote(""); setShowOpts(false); setLinkedHeld(null); setSaving(false);
  };

  // Génère un devis (état estimatif) à partir du panier actuel.
  // Contrairement à validateSale : aucune écriture en base, aucune mise à jour
  // du stock ni de la dette client. Le panier reste intact pour permettre de
  // poursuivre vers une vraie vente si le client accepte le devis.
  const makeDevis = async () => {
    if (cart.length === 0) { setErrMsg("Le panier est vide."); return; }
    const expiredItem = cart.find(i => isExpired(i));
    if (expiredItem) { setErrMsg(`« ${expiredItem.name} » est périmé : retirez-le du panier.`); return; }
    if (cart.some(i => !(+i.qty > 0))) { setErrMsg("Chaque article doit avoir une quantité supérieure à 0."); return; }
    setErrMsg("");
    const doc = {
      date: localDateStr(),
      valid_until: localDateStr(new Date(Date.now() + 15 * 86400000)),
      client: selectedClient || "Client comptoir",
      items: cart.map(i => ({ product: i.name, qty: +i.qty || 0, price: cartPrice(i), product_id: i.id })),
      total,
      discount,
      status: "En attente",
      seller_name: user?.name || "Inconnu",
    };
    const { data, error } = await supabase.from("devis").insert([doc]).select();
    if (!error && data?.[0]) { setShowDevis({ ...data[0], num: data[0].id }); return; }
    // Repli : numéro local si la table « devis » n'existe pas encore
    let num = 1;
    try {
      num = (parseInt(localStorage.getItem("bfy_devis_counter") || "0", 10) || 0) + 1;
      localStorage.setItem("bfy_devis_counter", String(num));
    } catch {}
    setErrMsg("Devis non enregistré en base (table « devis » absente ?) : exécutez facturation.sql dans Supabase. Il reste imprimable.");
    setShowDevis({ ...doc, num });
  };

  // ── Mise en attente d'une vente ──
  // Une vente en attente n'écrit rien dans les ventes : ni stock, ni dette, ni facture.
  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(""), 4500); };
  const deleteHeldRec = async (id) => {
    if (isLocalHeld(id)) heldLocalWrite(heldLocalRead().filter(x => x.id !== id));
    else await supabase.from("held_sales").delete().eq("id", id);
  };
  const holdSale = async () => {
    if (cart.length === 0) { setErrMsg("Le panier est vide."); return; }
    if (cart.some(i => !(+i.qty > 0))) { setErrMsg("Chaque article doit avoir une quantité supérieure à 0."); return; }
    setErrMsg(""); setSaving(true);
    const rec = {
      client: selectedClient || "Client comptoir",
      items: cart.map(i => ({ product_id: i.id, product: i.name, qty: +i.qty, manual_price: (i.manualPrice != null && i.manualPrice !== "") ? +i.manualPrice : null })),
      discount: +discount || 0, use_promo: usePromo, payment, amount_paid: String(amountPaid ?? ""),
      inv_date: invDate || null, due_date: dueDate || null, delivery_date: deliveryDate || null, note: saleNote.trim() || null,
      devis_id: linkedDevis?.id ?? null, total, held_by: user?.name || "Inconnu",
    };
    let saved = null;
    if (heldDb) {
      const dbLinked = linkedHeld && !isLocalHeld(linkedHeld.id);
      const { data, error } = dbLinked
        ? await supabase.from("held_sales").update(rec).eq("id", linkedHeld.id).select()
        : await supabase.from("held_sales").insert([rec]).select();
      if (error || !data?.[0]) { setErrMsg("Erreur : " + (error?.message || "enregistrement impossible")); setSaving(false); return; }
      saved = data[0];
    } else {
      const id = (linkedHeld && isLocalHeld(linkedHeld.id)) ? linkedHeld.id : `local-${Date.now()}`;
      saved = { ...rec, id, created_at: new Date().toISOString() };
      const rest = heldLocalRead().filter(x => x.id !== id);
      heldLocalWrite([saved, ...rest]);
    }
    setHeld(prev => [saved, ...prev.filter(x => x.id !== saved.id)]);
    setCart([]); setSelectedClient(""); setDiscount(0); setAmountPaid(""); setUsePromo(false);
    setInvDate(""); setDueDate(""); setDeliveryDate(""); setSaleNote(""); setShowOpts(false);
    setLinkedDevis(null); setLinkedHeld(null); setSaving(false);
    flash("⏸ Vente mise en attente. Retrouvez-la dans « En attente » pour la reprendre et l'encaisser.");
  };
  const resumeHeld = (h) => {
    if (cart.length > 0 && !window.confirm("Le panier actuel sera remplacé par la vente en attente. Continuer ?")) return;
    const lines = [], missing = [];
    (h.items || []).forEach(it => {
      const pr = products.find(x => x.id === it.product_id) || products.find(x => normText(x.name).trim() === normText(it.product).trim());
      if (!pr) { missing.push(it.product); return; }
      if (isExpired(pr)) { missing.push(`${pr.name} (périmé)`); return; }
      lines.push({ ...pr, qty: +it.qty || 1, manualPrice: it.manual_price != null ? it.manual_price : null });
    });
    if (lines.length === 0) { setErrMsg("Aucun article de cette vente n'est encore disponible (produit supprimé ou périmé)."); setShowHeld(false); return; }
    setCart(lines);
    setSelectedClient(h.client && h.client !== "Client comptoir" ? h.client : "");
    setDiscount(+h.discount || 0); setUsePromo(!!h.use_promo); setPayment(h.payment || "Espèces"); setAmountPaid(h.amount_paid || "");
    setInvDate(h.inv_date || ""); setDueDate(h.due_date || ""); setDeliveryDate(h.delivery_date || ""); setSaleNote(h.note || "");
    setShowOpts(!!(h.inv_date || h.due_date || h.delivery_date || h.note));
    setLinkedDevis(h.devis_id ? { id: h.devis_id, num: h.devis_id } : null);
    setLinkedHeld({ id: h.id });
    setErrMsg(missing.length ? `Articles non repris (supprimés ou périmés) : ${missing.join(", ")}.` : "");
    setShowHeld(false);
  };
  const removeHeld = async (h) => {
    if (!window.confirm(`Supprimer la vente en attente de « ${h.client} » ?`)) return;
    await deleteHeldRec(h.id);
    setHeld(prev => prev.filter(x => x.id !== h.id));
    if (linkedHeld?.id === h.id) setLinkedHeld(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{color:T.text}}>Caisse · Point de vente</h1>
        <div className="flex items-center gap-2">
          <Btn onClick={()=>setShowHeld(true)} variant="ghost" T={T}><span className="flex items-center gap-1">⏸ En attente{held.length>0&&<span className="text-xs px-1.5 rounded-full font-bold" style={{background:"rgba(245,158,11,0.2)",color:"#f59e0b"}}>{held.length}</span>}</span></Btn>
          <Btn onClick={()=>setShowHistory(true)} variant="ghost" T={T}><span className="flex items-center gap-1"><Icon name="eye" size={14}/> Historique</span></Btn>
        </div>
      </div>
      <ErrBox msg={errMsg}/>
      {notice&&<div className="rounded-xl px-4 py-2 text-sm" style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",color:"#f59e0b"}}>{notice}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Grille produits */}
        <div className="lg:col-span-3 space-y-3">
          <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:T.textMuted}}><Icon name="search" size={16}/></span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher produit..." className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none" style={{background:T.input,border:`1px solid ${T.inputBorder}`,color:T.text}}/></div>
          <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
            {filtered.map(p=>{
              const exp=expiryInfo(p.expiry_date); const expired=isExpired(p); const rp=resolvePrice(p,clientCat,usePromo);
              return(
              <button key={p.id} onClick={()=>addToCart(p)} className="text-left p-3 rounded-xl transition-all hover:scale-105" style={{background:T.card,border:`1px solid ${expired?"#ef4444":T.cardBorder}`,opacity:expired?0.6:1,cursor:expired?"not-allowed":"pointer"}} disabled={!write}>
                <div className="mb-1"><ProductThumb p={p} size={44}/></div>
                <p className="text-xs font-semibold truncate" style={{color:T.text}}>{p.name}</p>
                <p className="text-xs font-bold mt-0.5" style={{color:rp.source==="Promo"?"#f59e0b":T.accent}}>{rp.source==="Promo"&&<><Icon name="flame" size={13}/> </>}{fmtGNF(rp.price)}</p>
                <p className="text-xs" style={{color:T.textMuted}}>Stock: {p.qty} {p.unit}</p>
                {expired&&<p className="text-xs font-bold mt-0.5" style={{color:"#ef4444"}}><Icon name="ban" size={14}/> Périmé le {exp.label}</p>}
                {!expired&&exp?.note&&<p className="text-xs font-semibold mt-0.5" style={{color:exp.color}}><Icon name="warning" size={14}/> Expire {exp.label} ({exp.note})</p>}
              </button>);
            })}
          </div>
        </div>

        {/* Panier */}
        <div className="lg:col-span-2 rounded-2xl p-4 space-y-3" style={{background:T.card,border:`1px solid ${T.accent}33`}}>
          <h3 className="font-bold text-sm" style={{color:T.text}}><Icon name="sales" size={14}/> Panier ({cart.length})</h3>
          {linkedHeld&&<div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl" style={{background:"rgba(245,158,11,0.1)",color:"#f59e0b",border:"1px solid rgba(245,158,11,0.3)"}}><span>⏸ Vente en attente reprise : elle sera retirée de la liste après validation.</span><button onClick={()=>setLinkedHeld(null)} title="Détacher (la vente reste en attente)" className="ml-2"><Icon name="close" size={14}/></button></div>}
          {linkedDevis&&<div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl" style={{background:`${T.accent}15`,color:T.accent,border:`1px solid ${T.accent}40`}}><span><Icon name="billing" size={14}/> Devis N° {String(linkedDevis.num).padStart(4,"0")} chargé : il sera marqué « Converti » après validation.</span><button onClick={()=>setLinkedDevis(null)} title="Détacher le devis" className="ml-2"><Icon name="close" size={14}/></button></div>}
          <div>
            <label className="text-xs" style={{color:T.textMuted}}>Client</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:T.textMuted}}><Icon name="search" size={14}/></span>
              <input
                value={clientOpen?clientQuery:(selectedClient?`${selectedClient}${clientObj?.category?` (${clientObj.category})`:""}`:"")}
                placeholder={clientOpen&&selectedClient?selectedClient:"Client comptoir · taper pour rechercher..."}
                onFocus={()=>{setClientQuery("");setClientOpen(true);}}
                onChange={e=>{setClientQuery(e.target.value);setClientOpen(true);}}
                onBlur={()=>setClientOpen(false)}
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs outline-none"
                style={{background:T.card,border:`1px solid ${clientOpen?T.accent:T.inputBorder}`,color:T.text}}/>
              {selectedClient&&<button onMouseDown={e=>{e.preventDefault();pickClient("");}} title="Revenir au client comptoir" className="absolute right-2 top-1/2 -translate-y-1/2 text-xs w-5 h-5 rounded flex items-center justify-center" style={{color:T.textMuted}}><Icon name="close" size={14}/></button>}
              {clientOpen&&(
                <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl overflow-y-auto max-h-56 shadow-xl" style={{background:T.optionBg||"#1e1e1e",border:`1px solid ${T.inputBorder}`}}>
                  <button onMouseDown={e=>{e.preventDefault();pickClient("");}} className="w-full text-left px-3 py-2 text-xs" style={{color:T.optionColor||"#e5e7eb",background:!selectedClient?`${T.accent}25`:"transparent"}}>Client comptoir</button>
                  {clientMatches.map(c=>(
                    <button key={c.id} onMouseDown={e=>{e.preventDefault();pickClient(c.name);}} className="w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2" style={{color:T.optionColor||"#e5e7eb",background:selectedClient===c.name?`${T.accent}25`:"transparent"}}>
                      <span className="truncate">{c.name}</span>
                      <span className="whitespace-nowrap" style={{color:T.textMuted}}>{c.category||"Détail"}{c.phone?` · ${c.phone}`:""}</span>
                    </button>
                  ))}
                  {clientMatches.length===0&&<p className="px-3 py-2 text-xs" style={{color:T.textMuted}}>Aucun client trouvé</p>}
                </div>
              )}
            </div>
          </div>

          {/* Prix promo */}
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none px-3 py-2 rounded-xl" style={{background:usePromo?"rgba(245,158,11,0.15)":T.rowHover,color:usePromo?"#f59e0b":T.textMuted,border:`1px solid ${usePromo?"rgba(245,158,11,0.4)":T.cardBorder}`}}>
            <input type="checkbox" checked={usePromo} onChange={e=>setUsePromo(e.target.checked)} className="w-4 h-4 cursor-pointer" style={{accentColor:"#f59e0b"}}/>
            <Icon name="flame" size={14}/> Appliquer les prix promo
          </label>
          <p className="text-xs" style={{color:T.textMuted}}>Tarif appliqué : <b style={{color:T.accent}}>{clientCat}</b>{usePromo&&" (promo si disponible)"}</p>

          {/* Articles */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {cart.length===0&&<p className="text-xs text-center py-4" style={{color:T.textMuted}}>Cliquer sur un produit pour l'ajouter</p>}
            {cart.map(item=>{
              const rp=resolvePrice(item,clientCat,usePromo); const manual=item.manualPrice!=null; const unit=cartPrice(item); const exp=expiryInfo(item.expiry_date);
              return(
              <div key={item.id} className="px-2 py-2 rounded-lg space-y-1.5" style={{background:T.rowHover,border:isExpired(item)?"1px solid #ef4444":"1px solid transparent"}}>
                <div className="flex items-center gap-2">
                  <ProductThumb p={item} size={28}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{color:T.text}}>{item.name}</p>
                    <p className="text-xs" style={{color:manual?"#f59e0b":rp.source==="Promo"?"#f59e0b":T.textMuted}}>{manual?"Prix manuel":rp.source==="Promo"?"Promo":rp.source}</p>
                  </div>
                  <p className="text-xs font-bold whitespace-nowrap" style={{color:T.accent}}>{fmtGNF(unit*(+item.qty||0))}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="number" min="0" value={manual?item.manualPrice:unit} onChange={e=>setCartPriceRaw(item.id,e.target.value)} onBlur={()=>fixCartPrice(item.id)} title="Prix unitaire (modifiable)" className="flex-1 min-w-0 px-2 py-1 rounded text-xs outline-none text-right" style={{background:T.input,border:`1px solid ${manual?"#f59e0b":T.inputBorder}`,color:T.text}}/>
                  {manual&&<button onClick={()=>resetCartPrice(item.id)} title="Revenir au prix automatique" className="w-5 h-5 rounded text-xs flex items-center justify-center" style={{background:T.input,color:"#f59e0b"}}><Icon name="undo" size={12}/></button>}
                  <span className="text-xs" style={{color:T.textMuted}}>×</span>
                  <button onClick={()=>updateCartQty(item.id,(+item.qty||0)-1)} className="w-5 h-5 rounded text-xs flex items-center justify-center" style={{background:T.input,color:T.text}}>−</button>
                  <input type="number" min="1" step="1" value={item.qty} onChange={e=>setCartQtyRaw(item.id,e.target.value)} onBlur={()=>fixCartQty(item.id)} title="Quantité (modifiable)" className="w-14 px-1 py-1 rounded text-xs outline-none text-center" style={{background:T.input,border:`1px solid ${T.inputBorder}`,color:T.text}}/>
                  <button onClick={()=>updateCartQty(item.id,(+item.qty||0)+1)} className="w-5 h-5 rounded text-xs flex items-center justify-center" style={{background:`${T.accent}40`,color:T.accent}}>+</button>
                </div>
                {isExpired(item)&&<p className="text-xs font-bold" style={{color:"#ef4444"}}><Icon name="ban" size={14}/> Produit périmé : vente bloquée, retirez-le du panier.</p>}
                {!isExpired(item)&&exp?.note&&<p className="text-xs" style={{color:exp.color}}><Icon name="warning" size={14}/> Péremption proche : {exp.label} ({exp.note})</p>}
              </div>);
            })}
          </div>

          {/* Totaux */}
          <div className="border-t pt-3 space-y-2" style={{borderColor:T.cardBorder}}>
            <div className="flex justify-between text-xs" style={{color:T.textMuted}}><span>Sous-total</span><span>{fmtGNF(subtotal)}</span></div>
            <div className="flex items-center justify-between text-xs" style={{color:T.textMuted}}>
              <span>Remise (%)</span>
              <input type="number" value={discount} onChange={e=>setDiscount(+e.target.value)} className="w-16 px-2 py-0.5 rounded text-xs outline-none text-right" style={{background:T.input,border:`1px solid ${T.inputBorder}`,color:T.text}} min="0" max="100"/>
            </div>
            <div className="flex justify-between text-sm font-black"><span style={{color:T.text}}>TOTAL</span><span style={{color:T.accent}}>{fmtGNF(total)}</span></div>
          </div>

          {/* Mode de paiement */}
          <div>
            <label className="text-xs" style={{color:T.textMuted}}>Mode de paiement</label>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              {["Espèces","Mobile Money","Virement","Carte"].map(m=>(
                <button key={m} onClick={()=>setPayment(m)} className="py-1.5 rounded-lg text-xs font-semibold" style={{background:payment===m?`${T.accent}30`:T.input,color:payment===m?T.accent:T.textMuted,border:payment===m?`1px solid ${T.accent}`:`1px solid transparent`}}>{m}</button>
              ))}
            </div>
          </div>

          {/* À livrer */}
          <div className="rounded-xl p-3 space-y-2" style={{background:T.rowHover,border:`1px solid ${toDeliver?T.accent+"55":T.cardBorder}`}}>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer" style={{color:T.text}}>
              <input type="checkbox" checked={toDeliver} onChange={e=>setToDeliver(e.target.checked)}/> <Icon name="delivery" size={14}/> À livrer
            </label>
            {toDeliver&&<div className="space-y-2">
              <div>
                <label className="text-xs" style={{color:T.textMuted}}>Date de livraison</label>
                <input type="date" min={localDateStr()} value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)} className="w-full mt-1 px-3 py-1.5 rounded-lg text-xs outline-none" style={{background:T.input,border:`1px solid ${T.inputBorder}`,color:T.text}}/>
              </div>
                          <input type="text" value={deliveryAddr} onChange={e=>setDeliveryAddr(e.target.value)} placeholder={`Adresse de livraison${clients.find(c=>c.name===selectedClient)?.address?` (par défaut : ${clients.find(c=>c.name===selectedClient).address})`:""}`} className="w-full px-3 py-1.5 rounded-lg text-xs outline-none" style={{background:T.input,border:`1px solid ${T.inputBorder}`,color:T.text}}/>
            </div>}
          </div>

          {/* Options de facture */}
          <div className="rounded-xl p-3 space-y-2" style={{background:T.rowHover,border:`1px solid ${(invDate||dueDate||deliveryDate||saleNote)?T.accent+"55":T.cardBorder}`}}>
            <button type="button" onClick={()=>setShowOpts(o=>!o)} className="w-full flex items-center justify-between text-xs font-semibold" style={{color:T.textMuted}}>
              <span><Icon name="calendar" size={14}/> Options de la facture{(invDate||dueDate||deliveryDate||saleNote)?<span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:T.accent,marginLeft:6,verticalAlign:"middle"}}/>:null}</span><Icon name={showOpts?"chevup":"chevdown"} size={14}/>
            </button>
            {showOpts&&(()=>{const ctl={background:T.input,border:`1px solid ${T.inputBorder}`,color:T.text};return(
              <div className="space-y-2">
                <div>
                  <label className="text-xs" style={{color:T.textMuted}}>Date de la facture <span style={{opacity:0.7}}>(vente oubliée : choisir la date réelle)</span></label>
                  <div className="flex gap-2 mt-1"><input type="date" max={localDateStr()} value={invDate} onChange={e=>setInvDate(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none" style={ctl}/>{invDate&&<button onClick={()=>setInvDate("")} className="text-xs px-2 rounded-lg" style={{background:T.input,color:T.textMuted}}>Aujourd'hui</button>}</div>
                </div>
                <div>
                  <label className="text-xs" style={{color:T.textMuted}}>Échéance de paiement <span style={{opacity:0.7}}>(si un reste est à payer)</span></label>
                  <input type="date" min={invDate||localDateStr()} value={dueDate} onChange={e=>setDueDate(e.target.value)} className="w-full mt-1 px-3 py-1.5 rounded-lg text-xs outline-none" style={ctl}/>
                </div>
                <div>
                  <label className="text-xs" style={{color:T.textMuted}}>Livraison prévue <span style={{opacity:0.7}}>(commande facturée à l'avance)</span></label>
                  <input type="date" min={localDateStr()} value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)} className="w-full mt-1 px-3 py-1.5 rounded-lg text-xs outline-none" style={ctl}/>
                </div>
                <div>
                  <label className="text-xs" style={{color:T.textMuted}}>Note</label>
                  <input type="text" value={saleNote} onChange={e=>setSaleNote(e.target.value)} placeholder="Ex : commande chantier Kipé, livraison le matin" className="w-full mt-1 px-3 py-1.5 rounded-lg text-xs outline-none" style={ctl}/>
                </div>
              </div>);})()}
          </div>

          {/* Paiement partiel */}
          <div className="rounded-xl p-3 space-y-2" style={{background:T.rowHover,border:`1px solid ${isPartial?"rgba(245,158,11,0.3)":T.cardBorder}`}}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold" style={{color:T.textMuted}}><Icon name="cash" size={14}/> Montant versé (GNF)</label>
              {isPartial && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{background:"rgba(245,158,11,0.15)",color:"#f59e0b"}}>{paid>0?"Partiel":"Impayé (crédit)"}</span>}
              {!isPartial && amountPaid && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{background:"rgba(34,197,94,0.15)",color:"#22c55e"}}>Complet</span>}
            </div>
            <input
              type="number"
              value={amountPaid}
              onChange={e=>setAmountPaid(e.target.value)}
              placeholder={`Total : ${total.toLocaleString()} GNF (vide = payé · 0 = crédit)`}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{background:T.input,border:`1px solid ${T.inputBorder}`,color:T.text}}
            />
            {amountPaid && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span style={{color:T.textMuted}}>Payé</span>
                  <span className="font-bold" style={{color:"#22c55e"}}>{fmtGNF(paid)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{color:T.textMuted}}>Reste à payer</span>
                  <span className="font-bold" style={{color:remaining>0?"#f59e0b":"#22c55e"}}>{remaining>0?fmtGNF(remaining):"—"}</span>
                </div>
                {isPartial && <p className="text-xs mt-1" style={{color:"#f59e0b"}}><Icon name="warning" size={14}/> Le reste ({fmtGNF(remaining)}) sera ajouté à la dette du client.</p>}
              </div>
            )}
          </div>

          {write&&(
            <div className="flex gap-2">
              <Btn onClick={makeDevis} variant="ghost" className="flex-1 justify-center" T={T} disabled={cart.length===0}>
                <span className="flex items-center justify-center gap-2"><Icon name="billing" size={14}/> Devis</span>
              </Btn>
              <Btn onClick={holdSale} variant="ghost" className="flex-1 justify-center" T={T} disabled={cart.length===0||saving}>
                <span className="flex items-center justify-center gap-2">⏸ En attente</span>
              </Btn>
              <Btn onClick={validateSale} variant="success" className="flex-1 justify-center" T={T} disabled={saving}>
                <span className="flex items-center justify-center gap-2">
                  <Icon name="check" size={15}/>{saving?"Enregistrement...":"Valider la vente"}
                </span>
              </Btn>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Facture ── */}
      {showInvoice&&(
        <Modal title="Facture" onClose={()=>setShowInvoice(null)} T={T}>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{background:"rgba(34,197,94,0.15)"}}><span style={{color:"#22c55e"}}><Icon name="check" size={32}/></span></div>
            <p className="font-black text-xl" style={{color:T.text}}>{shopName}</p>
            <p className="font-bold" style={{color:"#22c55e"}}><Icon name="check" size={14}/> Vente enregistrée avec succès</p>
            <div className="rounded-xl p-4 text-left space-y-2" style={{background:T.rowHover,border:`1px solid ${T.cardBorder}`}}>
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold uppercase tracking-wider" style={{color:T.textMuted}}>Facture N° {showInvoice.id}</p>
                <p className="text-xs" style={{color:T.textMuted}}>{showInvoice.date}</p>
              </div>
              <p className="font-semibold text-sm" style={{color:T.text}}><Icon name="user" size={14}/> {showInvoice.client}</p>
              {showInvoice.seller_name&&<p className="text-xs" style={{color:T.textMuted}}>Vendeur : {showInvoice.seller_name}</p>}
              <div className="border-t my-2" style={{borderColor:T.cardBorder}}/>
              {(showInvoice.items||[]).map((i,idx)=>(
                <div key={idx} className="flex justify-between text-sm">
                  <span style={{color:T.textMuted}}>{i.product} × {i.qty}</span>
                  <span style={{color:T.text}}>{fmtGNF(i.price*i.qty)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-1 space-y-1" style={{borderColor:T.cardBorder}}>
                <div className="flex justify-between font-black text-sm"><span style={{color:T.text}}>Total</span><span style={{color:T.accent}}>{fmtGNF(showInvoice.total)}</span></div>
                <div className="flex justify-between text-xs"><span style={{color:T.textMuted}}>Payé</span><span style={{color:"#22c55e"}}>{fmtGNF(showInvoice.paid??showInvoice.total)}</span></div>
                {(showInvoice.remaining>0)&&<div className="flex justify-between text-xs font-bold"><span style={{color:"#f59e0b"}}>Reste à payer</span><span style={{color:"#f59e0b"}}>{fmtGNF(showInvoice.remaining)}</span></div>}
              </div>
            </div>
            <div className="flex gap-3">
              <Btn onClick={()=>setShowInvoice(null)} variant="ghost" T={T} className="flex-1">Fermer</Btn>
              <Btn T={T} className="flex-1" onClick={()=>{
                const inv=showInvoice;
                const sName=shopName;
                const lignes=(inv.items||[]).map((it,i)=>`
                  <tr style="background:${i%2===0?"#fafafa":"#fff"}">
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a1a1a;">${it.product}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:13px;color:#555;">${it.qty}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;color:#555;">${fmtGNF(it.price)}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;font-weight:700;color:#1a1a1a;">${fmtGNF(it.price*it.qty)}</td>
                  </tr>`).join("");
                const sBadgeBg  = inv.status==="Payé"?"#dcfce7":"#fef3c7";
                const sBadgeCol = inv.status==="Payé"?"#15803d":"#b45309";
                const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<title>Facture N°${inv.id} — ${sName}</title>
<style>
  @page{margin:16mm 14mm}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a1a;font-size:13px}
  .wrap{max-width:720px;margin:0 auto;padding:0}
  /* EN-TETE */
  .top{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid #f97316;margin-bottom:22px}
  .brand-name{font-size:26px;font-weight:900;color:#f97316;letter-spacing:1px;margin-bottom:2px}
  .brand-sub{font-size:11px;color:#999}
  .inv-block{text-align:right}
  .inv-num{font-size:20px;font-weight:900;color:#111;margin-bottom:3px}
  .inv-meta{font-size:11px;color:#888;line-height:1.8}
  .badge{display:inline-block;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700;background:${sBadgeBg};color:${sBadgeCol};margin-top:6px}
  /* PARTIES */
  .parties{display:flex;gap:16px;margin-bottom:22px}
  .pbox{flex:1;border:1px solid #eee;border-radius:10px;padding:13px 15px;background:#fafafa}
  .plabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#f97316;margin-bottom:5px}
  .pname{font-size:14px;font-weight:800;color:#111;margin-bottom:2px}
  .psub{font-size:11px;color:#777}
  /* TABLEAU */
  table{width:100%;border-collapse:collapse;margin-bottom:18px;border:1px solid #eee;border-radius:8px;overflow:hidden}
  thead tr{background:#f97316}
  thead th{padding:10px 14px;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;text-align:left}
  thead th:nth-child(2){text-align:center}
  thead th:nth-child(3),thead th:nth-child(4){text-align:right}
  /* TOTAUX */
  .tot-wrap{display:flex;justify-content:flex-end;margin-bottom:26px}
  .tot{width:255px;border:1px solid #eee;border-radius:10px;overflow:hidden}
  .tot-row{display:flex;justify-content:space-between;padding:9px 14px;font-size:13px;border-bottom:1px solid #f5f5f5}
  .tot-row:last-child{border-bottom:none}
  .tot-lbl{color:#777}
  .tot-val{font-weight:600}
  .tot-grand{background:#fff8f3;padding:11px 14px;display:flex;justify-content:space-between;font-size:16px;font-weight:900;color:#f97316}
  .green{color:#15803d}
  .amber{color:#b45309}
  /* PIED */
  .foot{border-top:1px solid #eee;padding-top:16px;display:flex;justify-content:space-between;align-items:flex-end}
  .foot-left .merci{font-size:14px;font-weight:800;color:#f97316}
  .foot-left .note{font-size:10px;color:#aaa;margin-top:3px}
  .foot-right{text-align:right;font-size:11px;color:#aaa}
  .sig-line{width:150px;border-top:1px solid #ccc;margin-top:30px;margin-left:auto}
</style></head><body><div class="wrap">
  <div class="top">
    <div>
      <div class="brand-name">${sName}</div>
      <div class="brand-sub">Vente de matériaux de construction · Conakry, Guinée</div>
    </div>
    <div class="inv-block">
      <div class="inv-num">FACTURE N° ${String(inv.id).padStart(4,"0")}</div>
      <div class="inv-meta">Date : ${inv.date}<br/>Paiement : ${inv.payment}${inv.due_date?`<br/>Échéance : ${inv.due_date}`:""}${inv.delivery_date?`<br/>Livraison prévue : ${inv.delivery_date}`:""}${inv.note?`<br/>Note : ${inv.note}`:""}</div>
      <span class="badge">${inv.status}</span>
    </div>
  </div>
  <div class="parties">
    <div class="pbox">
      <div class="plabel">Vendu par</div>
      <div class="pname">${sName}</div>
      ${inv.seller_name?`<div class="psub">Vendeur : ${inv.seller_name}</div>`:""}
    </div>
    <div class="pbox">
      <div class="plabel">Client</div>
      <div class="pname">${inv.client}</div>
      <div class="psub">Mode : ${inv.payment}</div>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>Désignation</th>
      <th style="text-align:center">Qté</th>
      <th style="text-align:right">Prix unitaire</th>
      <th style="text-align:right">Montant</th>
    </tr></thead>
    <tbody>${lignes}</tbody>
  </table>
  <div class="tot-wrap"><div class="tot">
    <div class="tot-grand"><span>Total TTC</span><span>${fmtGNF(inv.total)}</span></div>
    <div class="tot-row"><span class="tot-lbl">Montant versé</span><span class="tot-val green">${fmtGNF(inv.paid??inv.total)}</span></div>
    ${(inv.remaining>0)?`<div class="tot-row"><span class="tot-lbl">Reste à payer</span><span class="tot-val amber">${fmtGNF(inv.remaining)}</span></div>`:`<div class="tot-row"><span class="tot-lbl">Solde</span><span class="tot-val green">Soldé</span></div>`}
  </div></div>
  <div class="foot">
    <div class="foot-left">
      <div class="merci">Merci pour votre confiance !</div>
      <div class="note">Tout article vendu n'est ni repris ni échangé.</div>
    </div>
    <div class="foot-right">
      <div class="sig-line"></div>
      <div>Signature &amp; Cachet</div>
    </div>
  </div>
</div></body></html>`;
                const w=window.open("","_blank","width=800,height=1000");
                w.document.open();w.document.write(html);w.document.close();
                w.focus();setTimeout(()=>w.print(),450);
              }}>
                <span className="flex items-center justify-center gap-1"><Icon name="print" size={14}/> Imprimer</span>
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal Devis ── */}
      {showDevis&&(
        <Modal title="Devis" onClose={()=>setShowDevis(null)} T={T}>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-2xl" style={{background:`${T.accent}22`}}><Icon name="billing" size={24}/></div>
            <p className="font-black text-xl" style={{color:T.text}}>{shopName}</p>
            <p className="font-bold" style={{color:T.accent}}>Devis N° {String(showDevis.num).padStart(4,"0")}</p>
            <div className="rounded-xl p-4 text-left space-y-2" style={{background:T.rowHover,border:`1px solid ${T.cardBorder}`}}>
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold uppercase tracking-wider" style={{color:T.textMuted}}>Devis N° {String(showDevis.num).padStart(4,"0")}</p>
                <p className="text-xs" style={{color:T.textMuted}}>{showDevis.date}</p>
              </div>
              <p className="font-semibold text-sm" style={{color:T.text}}><Icon name="user" size={14}/> {showDevis.client}</p>
              {showDevis.seller_name&&<p className="text-xs" style={{color:T.textMuted}}>Établi par : {showDevis.seller_name}</p>}
              <div className="border-t my-2" style={{borderColor:T.cardBorder}}/>
              {(showDevis.items||[]).map((i,idx)=>(
                <div key={idx} className="flex justify-between text-sm">
                  <span style={{color:T.textMuted}}>{i.product} × {i.qty}</span>
                  <span style={{color:T.text}}>{fmtGNF(i.price*i.qty)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-1 space-y-1" style={{borderColor:T.cardBorder}}>
                <div className="flex justify-between font-black text-sm"><span style={{color:T.text}}>Total estimé</span><span style={{color:T.accent}}>{fmtGNF(showDevis.total)}</span></div>
              </div>
            </div>
            <p className="text-xs" style={{color:T.textMuted}}><Icon name="warning" size={14}/> Ce devis est une estimation. Il ne constitue pas une facture et n'enregistre aucune vente ni mouvement de stock.</p>
            <div className="flex gap-3">
              <Btn onClick={()=>setShowDevis(null)} variant="ghost" T={T} className="flex-1">Fermer</Btn>
              <Btn T={T} className="flex-1" onClick={()=>{
                const inv=showDevis;
                const sName=shopName;
                const lignes=(inv.items||[]).map((it,i)=>`
                  <tr style="background:${i%2===0?"#fafafa":"#fff"}">
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a1a1a;">${it.product}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:13px;color:#555;">${it.qty}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;color:#555;">${fmtGNF(it.price)}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;font-weight:700;color:#1a1a1a;">${fmtGNF(it.price*it.qty)}</td>
                  </tr>`).join("");
                const today=new Date();
                const validUntil=new Date(today.getTime()+15*24*60*60*1000);
                const validStr=localDateStr(validUntil);
                const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<title>Devis N°${String(inv.num).padStart(4,"0")} — ${sName}</title>
<style>
  @page{margin:16mm 14mm}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a1a;font-size:13px}
  .wrap{max-width:720px;margin:0 auto;padding:0}
  /* EN-TETE */
  .top{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid #f97316;margin-bottom:22px}
  .brand-name{font-size:26px;font-weight:900;color:#f97316;letter-spacing:1px;margin-bottom:2px}
  .brand-sub{font-size:11px;color:#999}
  .inv-block{text-align:right}
  .inv-num{font-size:20px;font-weight:900;color:#111;margin-bottom:3px}
  .inv-meta{font-size:11px;color:#888;line-height:1.8}
  .badge{display:inline-block;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700;background:#fef3c7;color:#b45309;margin-top:6px}
  /* PARTIES */
  .parties{display:flex;gap:16px;margin-bottom:22px}
  .pbox{flex:1;border:1px solid #eee;border-radius:10px;padding:13px 15px;background:#fafafa}
  .plabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#f97316;margin-bottom:5px}
  .pname{font-size:14px;font-weight:800;color:#111;margin-bottom:2px}
  .psub{font-size:11px;color:#777}
  /* TABLEAU */
  table{width:100%;border-collapse:collapse;margin-bottom:18px;border:1px solid #eee;border-radius:8px;overflow:hidden}
  thead tr{background:#f97316}
  thead th{padding:10px 14px;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;text-align:left}
  thead th:nth-child(2){text-align:center}
  thead th:nth-child(3),thead th:nth-child(4){text-align:right}
  /* TOTAUX */
  .tot-wrap{display:flex;justify-content:flex-end;margin-bottom:10px}
  .tot{width:255px;border:1px solid #eee;border-radius:10px;overflow:hidden}
  .tot-grand{background:#fff8f3;padding:11px 14px;display:flex;justify-content:space-between;font-size:16px;font-weight:900;color:#f97316}
  .validity{text-align:right;font-size:11px;color:#b45309;font-weight:700;margin-bottom:26px}
  /* PIED */
  .foot{border-top:1px solid #eee;padding-top:16px;display:flex;justify-content:space-between;align-items:flex-end}
  .foot-left .merci{font-size:14px;font-weight:800;color:#f97316}
  .foot-left .note{font-size:10px;color:#aaa;margin-top:3px;max-width:400px;line-height:1.5}
  .foot-right{text-align:right;font-size:11px;color:#aaa}
  .sig-line{width:150px;border-top:1px solid #ccc;margin-top:30px;margin-left:auto}
</style></head><body><div class="wrap">
  <div class="top">
    <div>
      <div class="brand-name">${sName}</div>
      <div class="brand-sub">Vente de matériaux de construction · Conakry, Guinée</div>
    </div>
    <div class="inv-block">
      <div class="inv-num">DEVIS N° ${String(inv.num).padStart(4,"0")}</div>
      <div class="inv-meta">Date : ${inv.date}<br/>Validité : 15 jours</div>
      <span class="badge">DEVIS</span>
    </div>
  </div>
  <div class="parties">
    <div class="pbox">
      <div class="plabel">Établi par</div>
      <div class="pname">${sName}</div>
      ${inv.seller_name?`<div class="psub">Vendeur : ${inv.seller_name}</div>`:""}
    </div>
    <div class="pbox">
      <div class="plabel">Client</div>
      <div class="pname">${inv.client}</div>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>Désignation</th>
      <th style="text-align:center">Qté</th>
      <th style="text-align:right">Prix unitaire</th>
      <th style="text-align:right">Montant</th>
    </tr></thead>
    <tbody>${lignes}</tbody>
  </table>
  <div class="tot-wrap"><div class="tot">
    <div class="tot-grand"><span>Total estimé</span><span>${fmtGNF(inv.total)}</span></div>
  </div></div>
  <div class="validity">Devis valable jusqu'au ${validStr}</div>
  <div class="foot">
    <div class="foot-left">
      <div class="merci">Merci de votre confiance !</div>
      <div class="note">Ce document est un devis estimatif. Il ne constitue pas une facture et n'engage aucune vente ni mouvement de stock. Les prix indiqués sont susceptibles d'évoluer après la date de validité.</div>
    </div>
    <div class="foot-right">
      <div class="sig-line"></div>
      <div>Signature &amp; Cachet</div>
    </div>
  </div>
</div></body></html>`;
                const w=window.open("","_blank","width=800,height=1000");
                w.document.open();w.document.write(html);w.document.close();
                w.focus();setTimeout(()=>w.print(),450);
              }}>
                <span className="flex items-center justify-center gap-1"><Icon name="print" size={14}/> Imprimer</span>
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal Historique ── */}
      {showHeld&&(
        <Modal title={`Ventes en attente (${held.length})`} onClose={()=>setShowHeld(false)} T={T} wide>
          {!heldDb&&<p className="text-xs mb-3 px-3 py-2 rounded-xl" style={{background:"rgba(245,158,11,0.1)",color:"#f59e0b"}}><Icon name="warning" size={14}/> Enregistrées sur cet appareil uniquement. Exécutez la mise à jour de facturation.sql (table held_sales) pour les partager entre les postes.</p>}
          <div className="space-y-2">
            {held.map(h=>{
              const when=h.created_at?new Date(h.created_at).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"";
              const names=(h.items||[]).map(i=>`${i.qty}× ${i.product}`);
              return(
              <div key={h.id} className="px-3 py-3 rounded-xl flex items-center justify-between gap-3 flex-wrap" style={{background:T.rowHover,border:linkedHeld?.id===h.id?`1px solid ${T.accent}`:"1px solid transparent"}}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold" style={{color:T.text}}>{h.client}{linkedHeld?.id===h.id&&<span className="text-xs ml-2" style={{color:T.accent}}>(dans le panier)</span>}</p>
                  <p className="text-xs" style={{color:T.textMuted}}>{when}{h.held_by?` · ${h.held_by}`:""} · {(h.items||[]).length} art.</p>
                  <p className="text-xs truncate" style={{color:T.textMuted}}>{names.slice(0,3).join(", ")}{names.length>3?"…":""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm whitespace-nowrap" style={{color:T.accent}}>{fmtGNF(h.total)}</p>
                  {write&&<Btn onClick={()=>resumeHeld(h)} variant="success" size="sm" T={T}><span className="whitespace-nowrap"><Icon name="arrow" size={13}/> Reprendre / Encaisser</span></Btn>}
                  {write&&<Btn onClick={()=>removeHeld(h)} variant="danger" size="sm" T={T}><Icon name="trash" size={13}/></Btn>}
                </div>
              </div>);
            })}
            {held.length===0&&<p className="text-center py-8 text-sm" style={{color:T.textMuted}}>Aucune vente en attente</p>}
          </div>
          <p className="text-xs mt-3" style={{color:T.textMuted}}>Le total affiché est celui du moment de la mise en attente : les prix sont recalculés à la reprise, sauf les prix saisis à la main.</p>
        </Modal>
      )}

      {showHistory&&(
        <Modal title="Historique des ventes" onClose={()=>setShowHistory(false)} T={T} wide>
          <div className="space-y-2">
            {sales.map(s=>(
              <div key={s.id} className="px-3 py-3 rounded-xl" style={{background:T.rowHover}}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold" style={{color:T.text}}>{s.client}</p>
                    <p className="text-xs" style={{color:T.textMuted}}>{s.date} · {s.payment} · {(s.items||[]).length} art.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-sm" style={{color:T.accent}}>{fmtGNF(s.total)}</p>
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{background:(STATE_STYLE[s.status]||STATE_STYLE["Partiel"]).bg,color:(STATE_STYLE[s.status]||STATE_STYLE["Partiel"]).color}}>{s.status}</span>
                    </div>
                    <button
                      onClick={()=>setDetailSale(s)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{background:`${T.accent}18`,color:T.accent,border:`1px solid ${T.accent}33`}}
                    >
                      <Icon name="eye" size={13}/> Voir plus
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {sales.length===0&&<p className="text-center py-8" style={{color:T.textMuted}}>Aucune vente enregistrée</p>}
          </div>
        </Modal>
      )}

      {/* ── Modal Détail vente ── */}
      {detailSale&&(
        <Modal title="Détail de la vente" onClose={()=>setDetailSale(null)} T={T}>
          <div className="space-y-4">
            {/* En-tête */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{background:T.rowHover}}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-white flex-shrink-0" style={{background:`linear-gradient(135deg,${T.accent},${T.accent}aa)`}}>
                {(detailSale.client||"?").charAt(0)}
              </div>
              <div>
                <p className="font-black" style={{color:T.text}}>{detailSale.client}</p>
                <p className="text-xs" style={{color:T.textMuted}}>Vente N° {detailSale.id}</p>
              </div>
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-semibold" style={{background:(STATE_STYLE[detailSale.status]||STATE_STYLE["Partiel"]).bg,color:(STATE_STYLE[detailSale.status]||STATE_STYLE["Partiel"]).color}}>
                {detailSale.status}
              </span>
            </div>

            {/* Infos rapides */}
            <div className="grid grid-cols-2 gap-2">
              <div className="px-3 py-2 rounded-xl" style={{background:T.rowHover}}>
                <p className="text-xs" style={{color:T.textMuted}}><Icon name="calendar" size={14}/> Date</p>
                <p className="text-sm font-semibold mt-0.5" style={{color:T.text}}>{detailSale.date}</p>
              </div>
              <div className="px-3 py-2 rounded-xl" style={{background:T.rowHover}}>
                <p className="text-xs" style={{color:T.textMuted}}><Icon name="card" size={14}/> Paiement</p>
                <p className="text-sm font-semibold mt-0.5" style={{color:T.text}}>{detailSale.payment}</p>
              </div>
              <div className="px-3 py-2 rounded-xl col-span-2" style={{background:T.rowHover}}>
                <p className="text-xs" style={{color:T.textMuted}}><Icon name="user" size={14}/> Vendeur</p>
                <p className="text-sm font-semibold mt-0.5" style={{color:T.accent}}>{detailSale.seller_name || "—"}</p>
              </div>
            </div>

            {/* Articles */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{color:T.textMuted}}>Articles achetés</p>
              <div className="rounded-xl overflow-hidden" style={{border:`1px solid ${T.cardBorder}`}}>
                {(detailSale.items||[]).map((item,i)=>(
                  <div key={i} className="flex justify-between items-center px-3 py-2.5 border-b last:border-0" style={{borderColor:T.cardBorder,background:i%2===0?T.rowHover:"transparent"}}>
                    <div>
                      <p className="text-sm font-medium" style={{color:T.text}}>{item.product}</p>
                      <p className="text-xs" style={{color:T.textMuted}}>{fmtGNF(item.price)} × {item.qty}</p>
                    </div>
                    <p className="font-bold text-sm" style={{color:T.accent}}>{fmtGNF(item.price*item.qty)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Récapitulatif financier */}
            <div className="rounded-xl p-4 space-y-2.5" style={{background:T.rowHover,border:`1px solid ${T.cardBorder}`}}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{color:T.textMuted}}>Récapitulatif</p>
              <div className="flex justify-between text-sm font-black border-t pt-2" style={{borderColor:T.cardBorder}}>
                <span style={{color:T.text}}>Montant total</span>
                <span style={{color:T.accent}}>{fmtGNF(detailSale.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{color:T.textMuted}}><Icon name="check" size={14}/> Montant payé</span>
                <span className="font-bold" style={{color:"#22c55e"}}>{fmtGNF(detailSale.paid ?? detailSale.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{color:T.textMuted}}>⏳ Reste à payer</span>
                <span className="font-bold" style={{color:(detailSale.remaining||0)>0?"#f59e0b":"#22c55e"}}>
                  {(detailSale.remaining||0)>0 ? fmtGNF(detailSale.remaining) : "—"}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Btn onClick={()=>setDetailSale(null)} variant="ghost" T={T} className="flex-1">Fermer</Btn>
              <Btn T={T} className="flex-1" onClick={()=>{
                const inv=detailSale;
                const sName=shopName;
                const lignes=(inv.items||[]).map((it,i)=>`
                  <tr style="background:${i%2===0?"#fafafa":"#fff"}">
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a1a1a;">${it.product}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:13px;color:#555;">${it.qty}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;color:#555;">${fmtGNF(it.price)}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;font-weight:700;color:#1a1a1a;">${fmtGNF(it.price*it.qty)}</td>
                  </tr>`).join("");
                const sBadgeBg  = inv.status==="Payé"?"#dcfce7":"#fef3c7";
                const sBadgeCol = inv.status==="Payé"?"#15803d":"#b45309";
                const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<title>Facture N°${inv.id} — ${sName}</title>
<style>
  @page{margin:16mm 14mm}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a1a;font-size:13px}
  .wrap{max-width:720px;margin:0 auto}
  .top{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid #f97316;margin-bottom:22px}
  .brand-name{font-size:26px;font-weight:900;color:#f97316;letter-spacing:1px;margin-bottom:2px}
  .brand-sub{font-size:11px;color:#999}
  .inv-block{text-align:right}
  .inv-num{font-size:20px;font-weight:900;color:#111;margin-bottom:3px}
  .inv-meta{font-size:11px;color:#888;line-height:1.8}
  .badge{display:inline-block;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700;background:${sBadgeBg};color:${sBadgeCol};margin-top:6px}
  .parties{display:flex;gap:16px;margin-bottom:22px}
  .pbox{flex:1;border:1px solid #eee;border-radius:10px;padding:13px 15px;background:#fafafa}
  .plabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#f97316;margin-bottom:5px}
  .pname{font-size:14px;font-weight:800;color:#111;margin-bottom:2px}
  .psub{font-size:11px;color:#777}
  table{width:100%;border-collapse:collapse;margin-bottom:18px;border:1px solid #eee;border-radius:8px;overflow:hidden}
  thead tr{background:#f97316}
  thead th{padding:10px 14px;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;text-align:left}
  thead th:nth-child(2){text-align:center}
  thead th:nth-child(3),thead th:nth-child(4){text-align:right}
  .tot-wrap{display:flex;justify-content:flex-end;margin-bottom:26px}
  .tot{width:255px;border:1px solid #eee;border-radius:10px;overflow:hidden}
  .tot-row{display:flex;justify-content:space-between;padding:9px 14px;font-size:13px;border-bottom:1px solid #f5f5f5}
  .tot-row:last-child{border-bottom:none}
  .tot-lbl{color:#777}
  .tot-val{font-weight:600}
  .tot-grand{background:#fff8f3;padding:11px 14px;display:flex;justify-content:space-between;font-size:16px;font-weight:900;color:#f97316}
  .green{color:#15803d}
  .amber{color:#b45309}
  .foot{border-top:1px solid #eee;padding-top:16px;display:flex;justify-content:space-between;align-items:flex-end}
  .foot-left .merci{font-size:14px;font-weight:800;color:#f97316}
  .foot-left .note{font-size:10px;color:#aaa;margin-top:3px}
  .foot-right{text-align:right;font-size:11px;color:#aaa}
  .sig-line{width:150px;border-top:1px solid #ccc;margin-top:30px;margin-left:auto}
</style></head><body><div class="wrap">
  <div class="top">
    <div>
      <div class="brand-name">${sName}</div>
      <div class="brand-sub">Vente de matériaux de construction · Conakry, Guinée</div>
    </div>
    <div class="inv-block">
      <div class="inv-num">FACTURE N° ${String(inv.id).padStart(4,"0")}</div>
      <div class="inv-meta">Date : ${inv.date}<br/>Paiement : ${inv.payment}${inv.due_date?`<br/>Échéance : ${inv.due_date}`:""}${inv.delivery_date?`<br/>Livraison prévue : ${inv.delivery_date}`:""}${inv.note?`<br/>Note : ${inv.note}`:""}</div>
      <span class="badge">${inv.status}</span>
    </div>
  </div>
  <div class="parties">
    <div class="pbox">
      <div class="plabel">Vendu par</div>
      <div class="pname">${sName}</div>
      ${inv.seller_name?`<div class="psub">Vendeur : ${inv.seller_name}</div>`:""}
    </div>
    <div class="pbox">
      <div class="plabel">Client</div>
      <div class="pname">${inv.client}</div>
      <div class="psub">Mode : ${inv.payment}</div>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>Désignation</th>
      <th style="text-align:center">Qté</th>
      <th style="text-align:right">Prix unitaire</th>
      <th style="text-align:right">Montant</th>
    </tr></thead>
    <tbody>${lignes}</tbody>
  </table>
  <div class="tot-wrap"><div class="tot">
    <div class="tot-grand"><span>Total TTC</span><span>${fmtGNF(inv.total)}</span></div>
    <div class="tot-row"><span class="tot-lbl">Montant versé</span><span class="tot-val green">${fmtGNF(inv.paid??inv.total)}</span></div>
    ${(inv.remaining>0)?`<div class="tot-row"><span class="tot-lbl">Reste à payer</span><span class="tot-val amber">${fmtGNF(inv.remaining)}</span></div>`:`<div class="tot-row"><span class="tot-lbl">Solde</span><span class="tot-val green">Soldé</span></div>`}
  </div></div>
  <div class="foot">
    <div class="foot-left">
      <div class="merci">Merci pour votre confiance !</div>
      <div class="note">Tout article vendu n'est ni repris ni échangé.</div>
    </div>
    <div class="foot-right">
      <div class="sig-line"></div>
      <div>Signature &amp; Cachet</div>
    </div>
  </div>
</div></body></html>`;
                const w=window.open("","_blank","width=800,height=1000");
                w.document.open();w.document.write(html);w.document.close();
                w.focus();setTimeout(()=>w.print(),450);
              }}>
                <span className="flex items-center justify-center gap-1"><Icon name="print" size={14}/> Imprimer</span>
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── CLIENTS PAGE ─────────────────────────────────────────────────────────────
const ClientsPage = ({ clients, setClients, T, userRole }) => {
  const write = canWrite(userRole,"clients");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const empty = {name:"",phone:"",address:"",email:"",category_select:"Détail",category_custom:"",debt:"0",total_purchases:"0"};
  const [form, setForm] = useState(empty);
  // Catégories personnalisées déjà utilisées par d'autres clients → réutilisables dans la liste
  const customCats = [...new Set(clients.map(c=>(c.category||"").trim()).filter(x=>x&&!CLIENT_CATEGORIES.includes(x)))];
  const catOptions = [...CLIENT_CATEGORIES, ...customCats, CATEGORY_OTHER];
  const catLabels = [...CLIENT_CATEGORIES, ...customCats, "Autre (saisir une catégorie)"];
  const filtered = clients.filter(c=>{
    const q=search.toLowerCase();
    return c.name.toLowerCase().includes(q)||(c.phone||"").includes(search)||(c.category||"").toLowerCase().includes(q);
  });
  const openEdit = (c) => {setEditing(c.id);setForm({...c,category_select:c.category||"",category_custom:"",debt:String(c.debt||0),total_purchases:String(c.total_purchases||0)});setErrMsg("");setShowModal(true);};
  const doDelete = async (c) => {
    if(!window.confirm(`Supprimer le client "${c.name}" ? Cette action est irréversible.`))return;
    const {error}=await supabase.from("clients").delete().eq("id",c.id);
    if(!error)setClients(prev=>prev.filter(x=>x.id!==c.id));
    else alert("Erreur suppression : "+error.message);
  };
  const save = async () => {
    if(!form.name){setErrMsg("Le nom est obligatoire.");return;}
    const category = form.category_select===CATEGORY_OTHER ? form.category_custom.trim() : form.category_select;
    if(form.category_select===CATEGORY_OTHER && !category){setErrMsg("Saisissez le nom de la catégorie.");return;}
    setSaving(true); setErrMsg("");
    const item={name:form.name,phone:form.phone,address:form.address,email:form.email,category,debt:+form.debt||0,total_purchases:+form.total_purchases||0};
    if(editing){
      const {error}=await supabase.from("clients").update(item).eq("id",editing);
      if(error){setErrMsg("Erreur : "+error.message);setSaving(false);return;}
      setClients(prev=>prev.map(c=>c.id===editing?{...item,id:editing}:c));
    } else {
      const {data,error}=await supabase.from("clients").insert([item]).select();
      if(error){setErrMsg("Erreur : "+error.message);setSaving(false);return;}
      setClients(prev=>[data[0],...prev]);
    }
    setSaving(false); setShowModal(false); setEditing(null);
  };
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-black" style={{color:T.text}}>Clients</h1>{write&&<Btn onClick={()=>{setEditing(null);setForm(empty);setErrMsg("");setShowModal(true);}} T={T}><span className="flex items-center gap-1"><Icon name="plus" size={14}/> Nouveau client</span></Btn>}</div>
      <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:T.textMuted}}><Icon name="search" size={16}/></span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher client..." className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none" style={{background:T.input,border:`1px solid ${T.inputBorder}`,color:T.text}}/></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(c=>(
          <div key={c.id} className="rounded-2xl p-4" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-white" style={{background:`linear-gradient(135deg,${T.accent},${T.accent}aa)`}}>{c.name.charAt(0)}</div><div><p className="font-bold text-sm" style={{color:T.text}}>{c.name}</p><p className="text-xs" style={{color:T.textMuted}}>{c.phone}</p>{c.category&&<span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{background:`${T.accent}22`,color:T.accent,border:`1px solid ${T.accent}44`}}><Icon name="tag" size={14}/> {c.category}</span>}</div></div>
              {write&&<div className="flex gap-2"><Btn onClick={()=>openEdit(c)} variant="ghost" size="sm" T={T}><Icon name="edit" size={13}/></Btn><Btn onClick={()=>doDelete(c)} variant="danger" size="sm" T={T}><Icon name="trash" size={13}/></Btn></div>}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="px-2 py-1.5 rounded-lg" style={{background:T.rowHover}}><p style={{color:T.textMuted}}>Total achats</p><p className="text-green-400 font-bold">{fmtGNF(c.total_purchases)}</p></div>
              <div className="px-2 py-1.5 rounded-lg" style={{background:c.debt>0?"rgba(239,68,68,0.06)":"rgba(34,197,94,0.06)"}}><p style={{color:T.textMuted}}>Dette</p><p className="font-bold" style={{color:c.debt>0?"#ef4444":"#22c55e"}}>{c.debt>0?fmtGNF(c.debt):"Aucune"}</p></div>
            </div>
            {c.address&&<p className="text-xs mt-2" style={{color:T.textMuted}}><Icon name="pin" size={14}/> {c.address}</p>}
          </div>
        ))}
      </div>
      {showModal&&write&&(
        <Modal title={editing?"Modifier client":"Nouveau client"} onClose={()=>setShowModal(false)} T={T}>
          <ErrBox msg={errMsg}/>
          <div className="space-y-3">
            <Field label="Nom complet" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} required T={T}/>
            <Field label="Téléphone" value={form.phone} onChange={v=>setForm(f=>({...f,phone:v}))} T={T}/>
            <Field label="Adresse" value={form.address} onChange={v=>setForm(f=>({...f,address:v}))} T={T}/>
            <Field label="Email" type="email" value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} T={T}/>
            <Field label="Catégorie client" value={form.category_select} options={catOptions} optionLabels={catLabels} onChange={v=>setForm(f=>({...f,category_select:v}))} T={T}/>
            {form.category_select===CATEGORY_OTHER&&(
              <Field label="Nouvelle catégorie" value={form.category_custom} onChange={v=>setForm(f=>({...f,category_custom:v}))} placeholder="Ex : Revendeur, Entreprise, VIP..." required T={T}/>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dette (GNF)" type="number" value={form.debt} onChange={v=>setForm(f=>({...f,debt:v}))} T={T}/>
              <Field label="Total achats (GNF)" type="number" value={form.total_purchases} onChange={v=>setForm(f=>({...f,total_purchases:v}))} T={T}/>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5"><Btn onClick={()=>setShowModal(false)} variant="ghost" T={T}>Annuler</Btn><Btn onClick={save} T={T}>{saving?"Enregistrement...":"Enregistrer"}</Btn></div>
        </Modal>
      )}
    </div>
  );
};

// ─── SUPPLIERS PAGE ───────────────────────────────────────────────────────────
const SuppliersPage = ({ suppliers, setSuppliers, T, userRole }) => {
  const write = canWrite(userRole,"suppliers");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const empty = {name:"",contact:"",phone:"",address:"",email:"",total_orders:"0"};
  const [form, setForm] = useState(empty);
  const filtered = suppliers.filter(s=>s.name.toLowerCase().includes(search.toLowerCase()));
  const openEdit = (s) => {setEditing(s.id);setForm({...s,total_orders:String(s.total_orders||0)});setErrMsg("");setShowModal(true);};
  const doDelete = async (s) => {
    if(!window.confirm(`Supprimer le fournisseur "${s.name}" ? Cette action est irréversible.`))return;
    const {error}=await supabase.from("suppliers").delete().eq("id",s.id);
    if(!error)setSuppliers(prev=>prev.filter(x=>x.id!==s.id));
    else alert("Erreur suppression : "+error.message);
  };
  const save = async () => {
    if(!form.name){setErrMsg("Le nom est obligatoire.");return;}
    setSaving(true); setErrMsg("");
    const item={name:form.name,contact:form.contact,phone:form.phone,address:form.address,email:form.email,total_orders:+form.total_orders||0};
    if(editing){
      const {error}=await supabase.from("suppliers").update(item).eq("id",editing);
      if(error){setErrMsg("Erreur : "+error.message);setSaving(false);return;}
      setSuppliers(prev=>prev.map(s=>s.id===editing?{...item,id:editing}:s));
    } else {
      const {data,error}=await supabase.from("suppliers").insert([item]).select();
      if(error){setErrMsg("Erreur : "+error.message);setSaving(false);return;}
      setSuppliers(prev=>[...prev,data[0]]);
    }
    setSaving(false); setShowModal(false); setEditing(null);
  };
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-black" style={{color:T.text}}>Fournisseurs</h1>{write&&<Btn onClick={()=>{setEditing(null);setForm(empty);setErrMsg("");setShowModal(true);}} T={T}><span className="flex items-center gap-1"><Icon name="plus" size={14}/> Nouveau fournisseur</span></Btn>}</div>
      <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:T.textMuted}}><Icon name="search" size={16}/></span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher fournisseur..." className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none" style={{background:T.input,border:`1px solid ${T.inputBorder}`,color:T.text}}/></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(s=>(
          <div key={s.id} className="rounded-2xl p-4 space-y-3" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{background:"rgba(34,197,94,0.12)"}}><Icon name="suppliers" size={14}/></div><div><p className="font-bold text-sm" style={{color:T.text}}>{s.name}</p><p className="text-xs" style={{color:T.textMuted}}>{s.contact} · {s.phone}</p></div></div>
              {write&&<div className="flex gap-2"><Btn onClick={()=>openEdit(s)} variant="ghost" size="sm" T={T}><Icon name="edit" size={13}/></Btn><Btn onClick={()=>doDelete(s)} variant="danger" size="sm" T={T}><Icon name="trash" size={13}/></Btn></div>}
            </div>
            <div className="px-3 py-2 rounded-xl flex justify-between" style={{background:"rgba(34,197,94,0.06)"}}><span className="text-xs" style={{color:T.textMuted}}>Total commandes</span><span className="text-green-400 font-bold text-xs">{fmtGNF(s.total_orders)}</span></div>
            {s.address&&<p className="text-xs" style={{color:T.textMuted}}><Icon name="pin" size={14}/> {s.address}</p>}
          </div>
        ))}
      </div>
      {showModal&&write&&(
        <Modal title={editing?"Modifier fournisseur":"Nouveau fournisseur"} onClose={()=>setShowModal(false)} T={T}>
          <ErrBox msg={errMsg}/>
          <div className="space-y-3">
            <Field label="Nom entreprise" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} required T={T}/>
            <div className="grid grid-cols-2 gap-3"><Field label="Contact" value={form.contact} onChange={v=>setForm(f=>({...f,contact:v}))} T={T}/><Field label="Téléphone" value={form.phone} onChange={v=>setForm(f=>({...f,phone:v}))} T={T}/></div>
            <Field label="Adresse" value={form.address} onChange={v=>setForm(f=>({...f,address:v}))} T={T}/>
            <Field label="Email" type="email" value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} T={T}/>
            <Field label="Total commandes (GNF)" type="number" value={form.total_orders} onChange={v=>setForm(f=>({...f,total_orders:v}))} T={T}/>
          </div>
          <div className="flex justify-end gap-3 mt-5"><Btn onClick={()=>setShowModal(false)} variant="ghost" T={T}>Annuler</Btn><Btn onClick={save} T={T}>{saving?"Enregistrement...":"Enregistrer"}</Btn></div>
        </Modal>
      )}
    </div>
  );
};

// ─── EXPENSES PAGE ────────────────────────────────────────────────────────────
const ExpensesPage = ({ expenses, setExpenses, T }) => {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const emptyForm = {type:"",description:"",amount:"",justif:"",date:""};
  const [form, setForm] = useState(emptyForm);
  const TYPES = ["Transport","Loyer","Salaire","Carburant","Maintenance","Fournitures","Autre"];

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrMsg("");
    setShowModal(true);
  };

  const openEdit = (e) => {
    setEditing(e.id);
    setForm({type:e.type,description:e.description,amount:String(e.amount),justif:e.justif||"",date:e.date});
    setErrMsg("");
    setShowModal(true);
  };

  const doDelete = async (e) => {
    if(!window.confirm(`Supprimer la dépense "${e.description}" (${fmtGNF(e.amount)}) ? Cette action est irréversible.`))return;
    const {error}=await supabase.from("expenses").delete().eq("id",e.id);
    if(!error)setExpenses(prev=>prev.filter(x=>x.id!==e.id));
    else alert("Erreur suppression : "+error.message);
  };

  const save = async () => {
    if(!form.type||!form.description||!form.amount){setErrMsg("Type, description et montant obligatoires.");return;}
    setSaving(true); setErrMsg("");
    const item={
      type:form.type,
      description:form.description,
      amount:+form.amount,
      justif:form.justif,
      date:form.date||localDateStr()
    };
    if(editing){
      const {error}=await supabase.from("expenses").update(item).eq("id",editing);
      if(error){setErrMsg("Erreur : "+error.message);setSaving(false);return;}
      setExpenses(prev=>prev.map(e=>e.id===editing?{...item,id:editing}:e));
    } else {
      const {data,error}=await supabase.from("expenses").insert([item]).select();
      if(error){setErrMsg("Erreur : "+error.message);setSaving(false);return;}
      setExpenses(prev=>[data[0],...prev]);
    }
    setSaving(false); setShowModal(false); setEditing(null);
  };

  const total=expenses.reduce((a,e)=>a+e.amount,0);
  const byType=TYPES.map(t=>({type:t,total:expenses.filter(e=>e.type===t).reduce((a,e)=>a+e.amount,0)})).filter(t=>t.total>0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{color:T.text}}>Dépenses</h1>
        <Btn onClick={openAdd} T={T}><span className="flex items-center gap-1"><Icon name="plus" size={14}/> Nouvelle dépense</span></Btn>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 col-span-2 rounded-2xl p-4" style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)"}}><p className="text-xs uppercase tracking-wider" style={{color:T.textMuted}}>Total dépenses</p><p className="text-2xl font-black text-red-400 mt-1">{fmtGNF(total)}</p></div>
        {byType.slice(0,3).map(t=><div key={t.type} className="rounded-2xl p-4" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}><p className="text-xs uppercase tracking-wider" style={{color:T.textMuted}}>{t.type}</p><p className="font-bold mt-1 text-sm" style={{color:T.text}}>{fmtGNF(t.total)}</p></div>)}
      </div>
      <div className="rounded-2xl overflow-hidden" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
        <table className="w-full">
          <thead>
            <tr style={{background:T.tableHead}}>
              {["Date","Type","Description","Montant","Justificatif","Actions"].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider" style={{color:T.textMuted}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{expenses.map(e=>(
            <tr key={e.id} className="border-t" style={{borderColor:T.cardBorder}}>
              <td className="px-4 py-3 text-xs" style={{color:T.textMuted}}>{e.date}</td>
              <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{background:"rgba(239,68,68,0.1)",color:"#fca5a5"}}>{e.type}</span></td>
              <td className="px-4 py-3 text-sm" style={{color:T.text}}>{e.description}</td>
              <td className="px-4 py-3 text-red-400 font-bold text-sm">{fmtGNF(e.amount)}</td>
              <td className="px-4 py-3 text-xs" style={{color:T.textMuted}}>{e.justif||"—"}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Btn onClick={()=>openEdit(e)} variant="ghost" size="sm" T={T}><Icon name="edit" size={13}/></Btn>
                  <Btn onClick={()=>doDelete(e)} variant="danger" size="sm" T={T}><Icon name="trash" size={13}/></Btn>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {expenses.length===0&&<p className="text-center py-10 text-sm" style={{color:T.textMuted}}>Aucune dépense enregistrée</p>}
      </div>
      {showModal&&(
        <Modal title={editing?"Modifier la dépense":"Nouvelle dépense"} onClose={()=>setShowModal(false)} T={T}>
          <ErrBox msg={errMsg}/>
          <div className="space-y-3">
            <Field label="Type de dépense" value={form.type} onChange={v=>setForm(f=>({...f,type:v}))} options={TYPES} required T={T}/>
            <Field label="Description" value={form.description} onChange={v=>setForm(f=>({...f,description:v}))} required T={T}/>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Montant (GNF)" type="number" value={form.amount} onChange={v=>setForm(f=>({...f,amount:v}))} required T={T}/>
              <Field label="Date" type="date" value={form.date} onChange={v=>setForm(f=>({...f,date:v}))} T={T}/>
            </div>
            <Field label="Justificatif / Remarque" value={form.justif} onChange={v=>setForm(f=>({...f,justif:v}))} T={T}/>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <Btn onClick={()=>setShowModal(false)} variant="ghost" T={T}>Annuler</Btn>
            <Btn onClick={save} variant="danger" T={T}>{saving?"Enregistrement...":(editing?"Mettre à jour":"Enregistrer")}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── USERS PAGE ───────────────────────────────────────────────────────────────
const UsersPage = ({ T, currentUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const empty = {name:"",email:"",password:"",role:"Caissier",active:true,useCustomNav:false,customNav:[]};
  const [form, setForm] = useState(empty);

  useEffect(()=>{
    const load=async()=>{
      setLoading(true);
      const {data,error}=await supabase.from("app_users").select("id,name,email,role,active,last_login,created_at,custom_nav").order("id");
      if(!error&&data)setUsers(data);
      setLoading(false);
    };
    load();
  },[]);

  const openEdit=(u)=>{
    setEditing(u.id);
    const hasCustom = Array.isArray(u.custom_nav) && u.custom_nav.length>0;
    setForm({name:u.name,email:u.email,password:"",role:u.role,active:u.active,useCustomNav:hasCustom,customNav:hasCustom?u.custom_nav:(PERMISSIONS[u.role]?.nav||[])});
    setErrMsg("");setShowPwd(false);setShowModal(true);
  };

  const save=async()=>{
    if(!form.name||!form.email){setErrMsg("Nom et email obligatoires.");return;}
    if(!editing&&!form.password){setErrMsg("Mot de passe obligatoire.");return;}
    if(form.password&&form.password.length<4){setErrMsg("Mot de passe trop court (min. 4 caractères).");return;}
    if(form.useCustomNav&&form.customNav.length===0){setErrMsg("Sélectionnez au moins un onglet, ou désactivez la personnalisation.");return;}
    setSaving(true); setErrMsg("");
    const customNavValue = form.useCustomNav ? form.customNav : null;
    if(editing){
      const updates={name:form.name,email:form.email.trim().toLowerCase(),role:form.role,active:form.active,custom_nav:customNavValue};
      if(form.password)updates.password=form.password;
      const {error}=await supabase.from("app_users").update(updates).eq("id",editing);
      if(error){setErrMsg("Erreur : "+error.message);setSaving(false);return;}
      setUsers(prev=>prev.map(u=>u.id===editing?{...u,...updates}:u));
    } else {
      const {data:ex}=await supabase.from("app_users").select("id").eq("email",form.email.trim().toLowerCase()).single();
      if(ex){setErrMsg("Cet email est déjà utilisé.");setSaving(false);return;}
      const {data,error}=await supabase.from("app_users").insert([{name:form.name,email:form.email.trim().toLowerCase(),password:form.password,role:form.role,active:form.active,custom_nav:customNavValue}]).select("id,name,email,role,active,last_login,created_at,custom_nav");
      if(error){setErrMsg("Erreur : "+error.message);setSaving(false);return;}
      setUsers(prev=>[...prev,data[0]]);
    }
    setSaving(false); setShowModal(false); setEditing(null);
  };

  const toggleActive=async(u)=>{
    if(u.id===currentUser.id){alert("Impossible de désactiver votre propre compte.");return;}
    const newVal=!u.active;
    const {error}=await supabase.from("app_users").update({active:newVal}).eq("id",u.id);
    if(!error)setUsers(prev=>prev.map(x=>x.id===u.id?{...x,active:newVal}:x));
  };

  const doDelete=async(u)=>{
    if(u.id===currentUser.id){alert("Impossible de supprimer votre propre compte.");return;}
    if(!window.confirm(`Supprimer ${u.name} ?`))return;
    const {error}=await supabase.from("app_users").delete().eq("id",u.id);
    if(!error)setUsers(prev=>prev.filter(x=>x.id!==u.id));
  };

  // Coche/décoche un onglet dans la sélection personnalisée (le tableau de bord reste toujours actif)
  const toggleNavTab=(id)=>{
    if(id==="dashboard")return;
    setForm(f=>{
      const has=f.customNav.includes(id);
      return {...f,customNav: has? f.customNav.filter(x=>x!==id) : [...f.customNav,id]};
    });
  };

  // Résumé des permissions pour chaque rôle
  const roleDesc = {
    Administrateur: "Accès complet à toutes les fonctionnalités",
    Caissier: "Caisse, ventes et clients uniquement",
    "Gestionnaire Stock": "Produits, stock et fournisseurs uniquement",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{color:T.text}}>Utilisateurs</h1>
        <Btn onClick={()=>{setEditing(null);setForm(empty);setErrMsg("");setShowPwd(false);setShowModal(true);}} T={T}><span className="flex items-center gap-1"><Icon name="plus" size={14}/> Nouvel utilisateur</span></Btn>
      </div>

      {/* Carte résumé des rôles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {ROLES_LIST.map(role=>{
          const colors={Administrateur:{bg:"rgba(239,68,68,0.08)",border:"rgba(239,68,68,0.2)",color:"#fca5a5",icon:"shield"},Caissier:{bg:"rgba(59,130,246,0.08)",border:"rgba(59,130,246,0.2)",color:"#93c5fd",icon:"sales"},"Gestionnaire Stock":{bg:"rgba(168,85,247,0.08)",border:"rgba(168,85,247,0.2)",color:"#d8b4fe",icon:"stock"}};
          const c=colors[role];
          const count=users.filter(u=>u.role===role).length;
          const perms=PERMISSIONS[role]?.nav||[];
          return(
            <div key={role} className="rounded-2xl p-4" style={{background:c.bg,border:`1px solid ${c.border}`}}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><span style={{color:c.color}}><Icon name={c.icon} size={16}/></span><p className="font-bold text-sm" style={{color:c.color}}>{role}</p></div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:`${c.color}20`,color:c.color}}>{count} user{count>1?"s":""}</span>
              </div>
              <p className="text-xs mb-2" style={{color:T.textMuted}}>{roleDesc[role]}</p>
              <div className="flex flex-wrap gap-1">{perms.map(p=><span key={p} className="text-xs px-1.5 py-0.5 rounded" style={{background:`${c.color}15`,color:c.color}}>{p}</span>)}</div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 rounded-full animate-spin" style={{borderColor:T.accent,borderTopColor:"transparent"}}/></div>
      ) : (
        <div className="grid gap-3">
          {users.map(u=>(
            <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl" style={{background:T.card,border:`1px solid ${u.id===currentUser.id?T.accent+"60":T.cardBorder}`}}>
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-white" style={{background:`linear-gradient(135deg,${T.accent},${T.accent}99)`}}>
                  {u.name.charAt(0)}
                  {u.id===currentUser.id&&<span className="absolute -top-1 -right-1 text-xs"><Icon name="user" size={14}/></span>}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm" style={{color:T.text}}>{u.name}</p>
                    {u.id===currentUser.id&&<span className="text-xs" style={{color:T.accent}}>(vous)</span>}
                    <RoleBadge role={u.role}/>
                    {Array.isArray(u.custom_nav)&&u.custom_nav.length>0&&(
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{background:`${T.accent}18`,color:T.accent}} title={u.custom_nav.map(id=>ALL_NAV.find(n=>n.id===id)?.label||id).join(", ")}>
                        <Icon name="key" size={10}/> Accès personnalisé
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{color:T.textMuted}}>{u.email}</p>
                  {u.last_login&&<p className="text-xs" style={{color:T.textMuted}}>Dernière connexion : {new Date(u.last_login).toLocaleString("fr-FR")}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={()=>toggleActive(u)} className="relative w-10 h-5 rounded-full transition-all" style={{background:u.active?"#22c55e":"#374151"}} title={u.active?"Désactiver":"Activer"}>
                  <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all" style={{left:u.active?"22px":"2px"}}/>
                </button>
                <Btn onClick={()=>openEdit(u)} variant="ghost" size="sm" T={T}><Icon name="edit" size={13}/></Btn>
                {u.id!==currentUser.id&&<Btn onClick={()=>doDelete(u)} variant="danger" size="sm" T={T}><Icon name="trash" size={13}/></Btn>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal&&(
        <Modal title={editing?"Modifier utilisateur":"Nouvel utilisateur"} onClose={()=>setShowModal(false)} T={T}>
          <ErrBox msg={errMsg}/>
          <div className="space-y-3">
            <Field label="Nom complet" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} required T={T}/>
            <Field label="Email (identifiant de connexion)" type="email" value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} required T={T}/>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1" style={{color:T.textSub}}><Icon name="key" size={12}/> {editing?"Nouveau mot de passe (vide = inchangé)":"Mot de passe"}{!editing&&<span className="text-orange-400">*</span>}</label>
              <div className="relative mt-1">
                <input type={showPwd?"text":"password"} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder={editing?"Laisser vide pour ne pas changer":"Minimum 4 caractères"} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none pr-10" style={{background:T.input,border:`1px solid ${T.inputBorder}`,color:T.text}}/>
                <button type="button" onClick={()=>setShowPwd(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{color:T.textMuted}}><Icon name={showPwd?"close":"eye"} size={15}/></button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{color:T.textSub}}>Rôle <span className="text-orange-400">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES_LIST.map(role=>{
                  const colors={Administrateur:"#fca5a5",Caissier:"#93c5fd","Gestionnaire Stock":"#d8b4fe"};
                  const c=colors[role];
                  return(
                    <button key={role} onClick={()=>setForm(f=>({...f,role,customNav:PERMISSIONS[role]?.nav||[]}))} className="p-2 rounded-xl text-xs font-semibold transition-all text-center" style={{background:form.role===role?`${c}20`:T.input,border:`2px solid ${form.role===role?c:T.inputBorder}`,color:form.role===role?c:T.textMuted}}>
                      {role}<br/><span className="font-normal text-xs opacity-70">{roleDesc[role].split(" ").slice(0,3).join(" ")}...</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs mt-2 px-3 py-2 rounded-xl" style={{background:T.rowHover,color:T.textMuted}}>{roleDesc[form.role]}</p>
            </div>

            {/* Personnalisation des onglets accessibles, indépendamment du rôle */}
            <div className="rounded-xl p-3" style={{background:T.input,border:`1px solid ${T.inputBorder}`}}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider flex-1" style={{color:T.textSub}}>Onglets personnalisés pour cet utilisateur</span>
                <button onClick={()=>setForm(f=>({...f,useCustomNav:!f.useCustomNav,customNav:(!f.useCustomNav&&f.customNav.length===0)?(PERMISSIONS[f.role]?.nav||[]):f.customNav}))} className="relative w-10 h-5 rounded-full flex-shrink-0" style={{background:form.useCustomNav?T.accent:"#374151"}}>
                  <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all" style={{left:form.useCustomNav?"22px":"2px"}}/>
                </button>
              </div>
              {!form.useCustomNav ? (
                <p className="text-xs mt-2" style={{color:T.textMuted}}>Désactivé : l'utilisateur voit les onglets par défaut de son rôle ({(PERMISSIONS[form.role]?.nav||[]).length} onglets).</p>
              ) : (
                <>
                  <p className="text-xs mt-2 mb-2" style={{color:T.textMuted}}>Cochez les onglets auxquels cet utilisateur aura accès (remplace les permissions du rôle).</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ALL_NAV.map(item=>{
                      const checked = item.id==="dashboard" || form.customNav.includes(item.id);
                      const locked = item.id==="dashboard";
                      return(
                        <button key={item.id} type="button" onClick={()=>toggleNavTab(item.id)} disabled={locked} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-all" style={{background:checked?`${T.accent}18`:T.card,border:`1px solid ${checked?T.accent+"55":T.inputBorder}`,color:checked?T.accent:T.textMuted,opacity:locked?0.8:1,cursor:locked?"default":"pointer"}}>
                          <span className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{background:checked?T.accent:"transparent",border:checked?"none":`1px solid ${T.inputBorder}`}}>
                            {checked&&<Icon name="check" size={11}/>}
                          </span>
                          <Icon name={item.icon} size={13}/>
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{background:T.input}}>
              <span className="text-xs font-semibold uppercase tracking-wider flex-1" style={{color:T.textSub}}>Compte actif</span>
              <button onClick={()=>setForm(f=>({...f,active:!f.active}))} className="relative w-10 h-5 rounded-full" style={{background:form.active?"#22c55e":"#374151"}}>
                <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all" style={{left:form.active?"22px":"2px"}}/>
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5"><Btn onClick={()=>setShowModal(false)} variant="ghost" T={T}>Annuler</Btn><Btn onClick={save} T={T}>{saving?"Enregistrement...":editing?"Mettre à jour":"Créer l'utilisateur"}</Btn></div>
        </Modal>
      )}
    </div>
  );
};

// ─── ACCOUNTING PAGE ──────────────────────────────────────────────────────────
const AccountingPage = ({ sales, expenses, T }) => {
  const today = new Date();
  const [period, setPeriod] = useState("month");
  // Sélecteur de date selon la période
  const [selDate,  setSelDate]  = useState(localDateStr());      // YYYY-MM-DD
  const [selMonth, setSelMonth] = useState(localMonthStr());     // YYYY-MM
  const [selYear,  setSelYear]  = useState(String(today.getFullYear()));           // YYYY

  // ── Filtrage des données selon la période sélectionnée ──
  const filteredSales = sales.filter(s => {
    if (period === "day")   return s.date === selDate;
    if (period === "month") return s.date?.slice(0,7) === selMonth;
    if (period === "year")  return s.date?.slice(0,4) === selYear;
    return true;
  });
  const filteredExpenses = expenses.filter(e => {
    if (period === "day")   return e.date === selDate;
    if (period === "month") return e.date?.slice(0,7) === selMonth;
    if (period === "year")  return e.date?.slice(0,4) === selYear;
    return true;
  });

  const totalRevenue   = filteredSales.reduce((a,s)=>a+saleNet(s),0);
  const totalExpenses  = filteredExpenses.reduce((a,e)=>a+e.amount,0);
  const grossProfit    = totalRevenue * 0.15;
  const netProfit      = grossProfit - totalExpenses;

  // ── Titre dynamique du rapport ──
  const periodLabel = period === "day"
    ? new Date(selDate+"T12:00:00").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})
    : period === "month"
      ? new Date(selMonth+"-01T12:00:00").toLocaleDateString("fr-FR",{month:"long",year:"numeric"})
      : `Année ${selYear}`;

  // ── Lignes du tableau selon période ──
  const buildRows = () => {
    if (period === "day") {
      // Détail de chaque vente de la journée
      return filteredSales.map(s => ({
        label: `${s.client} (${s.payment})`,
        rev: saleNet(s),
        exp: 0,
      }));
    }
    if (period === "month") {
      // Regrouper par jour
      const days = {};
      filteredSales.forEach(s => { days[s.date] = (days[s.date]||0) + saleNet(s); });
      filteredExpenses.forEach(e => { days[e.date] = days[e.date] || 0; }); // init si absent
      // Ajouter les dépenses par jour
      const expByDay = {};
      filteredExpenses.forEach(e => { expByDay[e.date] = (expByDay[e.date]||0) + e.amount; });
      return Object.keys(days).sort().map(d => ({
        label: new Date(d+"T12:00:00").toLocaleDateString("fr-FR",{day:"numeric",month:"short"}),
        rev: days[d] || 0,
        exp: expByDay[d] || 0,
      }));
    }
    if (period === "year") {
      // Regrouper par mois
      const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
      return MONTHS.map((m, i) => {
        const mm = String(i+1).padStart(2,"0");
        const key = `${selYear}-${mm}`;
        const rev = filteredSales.filter(s=>s.date?.slice(0,7)===key).reduce((a,s)=>a+saleNet(s),0);
        const exp = filteredExpenses.filter(e=>e.date?.slice(0,7)===key).reduce((a,e)=>a+e.amount,0);
        return { label: m, rev, exp };
      });
    }
    return [];
  };

  const rows = buildRows();

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black" style={{color:T.text}}>Comptabilité</h1>

      {/* Sélecteur de période */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 rounded-xl" style={{background:T.input}}>
          {[["day","Journalier"],["month","Mensuel"],["year","Annuel"]].map(([p,l])=>(
            <button key={p} onClick={()=>setPeriod(p)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{background:period===p?`linear-gradient(135deg,${T.accent},${T.accent}bb)`:"transparent",color:period===p?"#fff":T.textSub}}>
              {l}
            </button>
          ))}
        </div>
        {/* Sélecteur de date contextuel */}
        {period === "day" && (
          <input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{background:T.input,border:`1px solid ${T.inputBorder}`,color:T.text}}/>
        )}
        {period === "month" && (
          <input type="month" value={selMonth} onChange={e=>setSelMonth(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{background:T.input,border:`1px solid ${T.inputBorder}`,color:T.text}}/>
        )}
        {period === "year" && (
          <><style>{`select.themed-select option{background-color:${T.optionBg||"#1e1e1e"} !important;color:${T.optionColor||"#e5e7eb"} !important;}`}</style>
          <select value={selYear} onChange={e=>setSelYear(e.target.value)}
            className="themed-select px-3 py-2 rounded-xl text-sm outline-none"
            style={{background:T.card,border:`1px solid ${T.inputBorder}`,color:T.text}}>
            {["2023","2024","2025","2026"].map(y=><option key={y} value={y}>{y}</option>)}
          </select></>
        )}
        <span className="text-sm font-semibold capitalize" style={{color:T.textSub}}>{periodLabel}</span>
      </div>

      {/* KPI filtrés */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="CA période" value={fmtGNF(totalRevenue)} icon="chart" color="#22c55e" T={T}/>
        <StatCard label="Dépenses" value={fmtGNF(totalExpenses)} icon="expenses" color="#ef4444" T={T}/>
        <StatCard label="Bénéfice brut" value={fmtGNF(grossProfit)} icon="accounting" color={T.accent} sub="Marge 15%" T={T}/>
        <StatCard label="Bénéfice net" value={fmtGNF(netProfit)} icon="accounting" color={netProfit>=0?"#22c55e":"#ef4444"} sub={netProfit>=0?"Positif":"Négatif"} T={T}/>
      </div>

      {/* Tableau de détail */}
      <div className="rounded-2xl overflow-hidden" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{borderColor:T.cardBorder}}>
          <h3 className="font-bold capitalize" style={{color:T.text}}>Rapport — {periodLabel}</h3>
          <span className="text-xs px-2 py-1 rounded-lg" style={{background:T.input,color:T.textMuted}}>
            {filteredSales.length} vente(s) · {filteredExpenses.length} dépense(s)
          </span>
        </div>
        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-4xl mb-2"><Icon name="inbox" size={36}/></p>
            <p className="text-sm" style={{color:T.textMuted}}>Aucune donnée pour cette période</p>
          </div>
        ) : (
          <table className="w-full">
            <thead><tr style={{background:T.tableHead}}>
              {[period==="day"?"Transaction":"Période","CA","Dépenses","Bén. brut","Bén. net","Marge"].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider" style={{color:T.textMuted}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{rows.map((row,i)=>{
              const gross = row.rev * 0.15;
              const net   = gross - row.exp;
              const margin = row.rev > 0 ? ((gross/row.rev)*100).toFixed(1) : "—";
              return (
                <tr key={i} className="border-t" style={{borderColor:T.cardBorder}}>
                  <td className="px-4 py-3 font-semibold text-sm" style={{color:T.text}}>{row.label}</td>
                  <td className="px-4 py-3 text-green-400 text-sm">{fmtGNF(row.rev)}</td>
                  <td className="px-4 py-3 text-red-400 text-sm">{fmtGNF(row.exp)}</td>
                  <td className="px-4 py-3 text-sm" style={{color:T.accent}}>{fmtGNF(gross)}</td>
                  <td className="px-4 py-3 font-bold text-sm" style={{color:net>=0?"#22c55e":"#ef4444"}}>{fmtGNF(net)}</td>
                  <td className="px-4 py-3 text-sm" style={{color:T.textMuted}}>{margin}{margin!=="—"?"%":""}</td>
                </tr>
              );
            })}</tbody>
            {/* Ligne totaux */}
            <tfoot>
              <tr style={{background:T.tableHead,borderTop:`2px solid ${T.accent}44`}}>
                <td className="px-4 py-3 font-black text-sm" style={{color:T.text}}>TOTAL</td>
                <td className="px-4 py-3 font-black text-sm text-green-400">{fmtGNF(totalRevenue)}</td>
                <td className="px-4 py-3 font-black text-sm text-red-400">{fmtGNF(totalExpenses)}</td>
                <td className="px-4 py-3 font-black text-sm" style={{color:T.accent}}>{fmtGNF(grossProfit)}</td>
                <td className="px-4 py-3 font-black text-sm" style={{color:netProfit>=0?"#22c55e":"#ef4444"}}>{fmtGNF(netProfit)}</td>
                <td className="px-4 py-3 font-black text-sm" style={{color:T.textMuted}}>{totalRevenue>0?((grossProfit/totalRevenue)*100).toFixed(1)+"%":"—"}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Résumé ventes de la période */}
      {filteredSales.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
          <div className="px-5 py-4 border-b" style={{borderColor:T.cardBorder}}>
            <h3 className="font-bold text-sm" style={{color:T.text}}>Détail des ventes</h3>
          </div>
          <table className="w-full">
            <thead><tr style={{background:T.tableHead}}>{["Date","Client","Montant","Paiement","Statut"].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs uppercase tracking-wider" style={{color:T.textMuted}}>{h}</th>)}</tr></thead>
            <tbody>{filteredSales.map(s=>(
              <tr key={s.id} className="border-t" style={{borderColor:T.cardBorder}}>
                <td className="px-4 py-2.5 text-xs" style={{color:T.textMuted}}>{s.date}</td>
                <td className="px-4 py-2.5 text-sm font-medium" style={{color:T.text}}>{s.client}</td>
                <td className="px-4 py-2.5 font-bold text-sm" style={{color:T.accent}}>{fmtGNF(s.total)}</td>
                <td className="px-4 py-2.5 text-xs" style={{color:T.textMuted}}>{s.payment}</td>
                <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{background:s.status==="Payé"?"rgba(34,197,94,0.15)":"rgba(245,158,11,0.15)",color:s.status==="Payé"?"#22c55e":"#f59e0b"}}>{s.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Résumé dépenses de la période */}
      {filteredExpenses.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
          <div className="px-5 py-4 border-b" style={{borderColor:T.cardBorder}}>
            <h3 className="font-bold text-sm" style={{color:T.text}}>Détail des dépenses</h3>
          </div>
          <table className="w-full">
            <thead><tr style={{background:T.tableHead}}>{["Date","Type","Description","Montant"].map(h=><th key={h} className="px-4 py-2.5 text-left text-xs uppercase tracking-wider" style={{color:T.textMuted}}>{h}</th>)}</tr></thead>
            <tbody>{filteredExpenses.map(e=>(
              <tr key={e.id} className="border-t" style={{borderColor:T.cardBorder}}>
                <td className="px-4 py-2.5 text-xs" style={{color:T.textMuted}}>{e.date}</td>
                <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{background:"rgba(239,68,68,0.12)",color:"#fca5a5"}}>{e.type}</span></td>
                <td className="px-4 py-2.5 text-sm" style={{color:T.text}}>{e.description}</td>
                <td className="px-4 py-2.5 font-bold text-sm text-red-400">{fmtGNF(e.amount)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── SETTINGS PAGE ─── (sauvegarde dans Supabase + localStorage) ─────────────
const SettingsPage = ({ T, themeName, setThemeName, shopSettings, setShopSettings }) => {
  const DEFAULTS = {
    shop_name: "BOUMAYAH ET FILS",
    shop_phone: "+224 622 00 00 00",
    shop_email: "contact@boumayah.gn",
    shop_address: "Conakry, Guinée",
    shop_website: "",
    shop_description: "Matériaux de construction & Quincaillerie",
    shop_rccm: "",
    shop_nif: "",
    shop_capital: "",
    shop_hours: "Lun-Sam 08h-18h",
    tva: "18",
    currency: "GNF",
    logo_url: "",
  };

  const [form, setForm] = useState({ ...DEFAULTS, ...shopSettings });
  const [saving, setSaving] = useState(false);
  const [okMsg, setOkMsg]   = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [activeTab, setActiveTab] = useState("entreprise");

  // Synchroniser si shopSettings change depuis l'extérieur
  useEffect(() => {
    if (shopSettings) setForm({ ...DEFAULTS, ...shopSettings });
  }, [shopSettings]);

  const handleSave = async () => {
    if (!form.shop_name.trim()) { setErrMsg("Le nom de l'entreprise est obligatoire."); return; }
    setSaving(true); setOkMsg(""); setErrMsg("");

    // 1. Sauvegarder dans localStorage (toujours disponible)
    try { localStorage.setItem("bfy_shop_settings", JSON.stringify(form)); } catch {}

    // 2. Tenter la sauvegarde dans Supabase
    const updates = Object.entries(form).map(([key, value]) => ({ key, value: String(value||""), updated_at: new Date().toISOString() }));
    const { error } = await supabase.from("app_settings").upsert(updates, { onConflict: "key" });

    if (error) {
      // Si Supabase échoue, on informe mais les données sont quand même en localStorage
      setErrMsg("Serveur injoignable : paramètres enregistrés sur cet appareil uniquement.");
    } else {
      setOkMsg("Informations sauvegardées avec succès !");
    }
    // Mettre à jour le state global dans tous les cas
    setShopSettings(form);
    setSaving(false);
    setTimeout(() => { setOkMsg(""); setErrMsg(""); }, 4000);
  };

  // Export fiche entreprise en JSON
  const exportFiche = () => {
    const blob = new Blob([JSON.stringify(form, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "fiche_entreprise.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const logoRef = useRef(null);
  const pickLogo = async (e) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErrMsg("Le fichier doit être une image (PNG, JPG, SVG, WEBP)."); return; }
    if (f.size > 5 * 1024 * 1024) { setErrMsg("Image trop lourde (5 Mo maximum)."); return; }
    try { const d = await fileToLogoDataUrl(f); setForm(p => ({ ...p, logo_url: d })); setErrMsg(""); setOkMsg("Logo chargé : cliquez sur Sauvegarder pour l'enregistrer."); }
    catch (er) { setErrMsg(er.message); }
  };
  const TABS = [
    { id: "entreprise", label: "Entreprise" },
    { id: "commercial", label: "Commercial" },
    { id: "apparence",  label: "Apparence" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{color:T.text}}>Paramètres</h1>
        <div className="flex gap-2">
          <Btn onClick={exportFiche} variant="ghost" T={T} size="sm">
            <span className="flex items-center gap-1"><Icon name="download" size={13}/> Exporter fiche</span>
          </Btn>
          <Btn onClick={handleSave} T={T} disabled={saving}>
            <span className="flex items-center gap-2"><Icon name="save" size={15}/>{saving ? "Sauvegarde..." : "Sauvegarder"}</span>
          </Btn>
        </div>
      </div>

      {/* Messages */}
      <OkBox msg={okMsg}/>
      <ErrBox msg={errMsg}/>

      {/* Onglets */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{background:T.input}}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{background: activeTab===tab.id ? T.card : "transparent", color: activeTab===tab.id ? T.accent : T.textMuted, boxShadow: activeTab===tab.id ? "0 1px 4px rgba(0,0,0,0.15)" : "none"}}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Entreprise ── */}
      {activeTab === "entreprise" && (
        <div className="rounded-2xl p-5 space-y-5" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
          <h3 className="font-bold text-sm flex items-center gap-2" style={{color:T.text}}><Icon name="building" size={15}/> Identité de l'entreprise</h3>

          {/* Aperçu carte entreprise */}
          <div className="rounded-2xl p-4 flex items-center gap-4" style={{background:`linear-gradient(135deg,${T.accent}18,${T.accent}08)`,border:`1px solid ${T.accent}33`}}>
            <ShopLogo url={form.logo_url} size={56} accent={T.accent} radius={16}/>
            <div>
              <p className="font-black text-base" style={{color:T.text}}>{form.shop_name||"Nom de l'entreprise"}</p>
              <p className="text-xs mt-0.5" style={{color:T.textSub}}>{form.shop_description||"Description"}</p>
              <div className="flex gap-3 mt-1 text-xs" style={{color:T.textMuted}}>
                {form.shop_phone && <span><Icon name="phone" size={14}/> {form.shop_phone}</span>}
                {form.shop_email && <span><Icon name="mail" size={14}/> {form.shop_email}</span>}
              </div>
            </div>
          </div>

          {/* Logo */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider" style={{color:T.textSub}}>Logo de l'entreprise</label>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <ShopLogo url={form.logo_url} size={64} accent={T.accent} radius={14}/>
              <input ref={logoRef} type="file" accept="image/*" onChange={pickLogo} className="hidden"/>
              <Btn onClick={() => logoRef.current?.click()} variant="ghost" size="sm" T={T}><span className="flex items-center gap-1"><Icon name="upload" size={14}/> {form.logo_url ? "Changer le logo" : "Téléverser un logo"}</span></Btn>
              {form.logo_url && <Btn onClick={() => setForm(p => ({ ...p, logo_url: "" }))} variant="danger" size="sm" T={T}><span className="flex items-center gap-1"><Icon name="trash" size={14}/> Retirer</span></Btn>}
            </div>
            <p className="text-xs mt-2" style={{color:T.textMuted}}>PNG, JPG, SVG ou WEBP. Le logo s'affiche sur l'écran de connexion et dans le menu.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Field label="Nom de l'entreprise *" value={form.shop_name} onChange={v=>setForm(f=>({...f,shop_name:v}))} required T={T}/>
            </div>
            <div className="col-span-2">
              <Field label="Slogan / Description" value={form.shop_description} onChange={v=>setForm(f=>({...f,shop_description:v}))} placeholder="ex: Matériaux de construction & Quincaillerie" T={T}/>
            </div>
            <Field label="Téléphone principal" value={form.shop_phone} onChange={v=>setForm(f=>({...f,shop_phone:v}))} placeholder="+224 6XX XX XX XX" T={T}/>
            <Field label="Email professionnel" type="email" value={form.shop_email} onChange={v=>setForm(f=>({...f,shop_email:v}))} placeholder="contact@entreprise.gn" T={T}/>
            <div className="col-span-2">
              <Field label="Adresse complète" value={form.shop_address} onChange={v=>setForm(f=>({...f,shop_address:v}))} placeholder="Quartier, Commune, Ville" T={T}/>
            </div>
            <Field label="Site web" value={form.shop_website} onChange={v=>setForm(f=>({...f,shop_website:v}))} placeholder="https://www.entreprise.gn" T={T}/>
            <Field label="Horaires d'ouverture" value={form.shop_hours} onChange={v=>setForm(f=>({...f,shop_hours:v}))} placeholder="Lun-Sam 08h-18h" T={T}/>
          </div>

          {/* Informations légales */}
          <div className="border-t pt-4" style={{borderColor:T.cardBorder}}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:T.textMuted}}><Icon name="clipboard" size={14}/> Informations légales</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="N° RCCM" value={form.shop_rccm} onChange={v=>setForm(f=>({...f,shop_rccm:v}))} placeholder="RCCM/GN/CON/2020/..." T={T}/>
              <Field label="N° NIF / NINEA" value={form.shop_nif} onChange={v=>setForm(f=>({...f,shop_nif:v}))} placeholder="123456789" T={T}/>
              <div className="col-span-2">
                <Field label="Capital social (GNF)" value={form.shop_capital} onChange={v=>setForm(f=>({...f,shop_capital:v}))} placeholder="ex: 50 000 000 GNF" T={T}/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Commercial ── */}
      {activeTab === "commercial" && (
        <div className="rounded-2xl p-5 space-y-4" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
          <h3 className="font-bold text-sm mb-4" style={{color:T.text}}><Icon name="briefcase" size={14}/> Paramètres commerciaux</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="TVA (%)" type="number" value={form.tva} onChange={v=>setForm(f=>({...f,tva:v}))} T={T}/>
            <Field label="Monnaie" value={form.currency} onChange={v=>setForm(f=>({...f,currency:v}))} options={["GNF","USD","EUR"]} T={T}/>
          </div>
          {/* Aperçu TVA */}
          <div className="rounded-xl p-3 flex items-center gap-3" style={{background:T.input}}>
            <span className="text-2xl"><Icon name="billing" size={24}/></span>
            <div className="text-xs" style={{color:T.textSub}}>
              <p>Prix HT : <strong style={{color:T.text}}>100 000 GNF</strong></p>
              <p>TVA {form.tva||0}% : <strong style={{color:T.accent}}>{Math.round(100000 * (+(form.tva||0)/100)).toLocaleString()} GNF</strong></p>
              <p>Prix TTC : <strong style={{color:"#22c55e"}}>{Math.round(100000 * (1 + +(form.tva||0)/100)).toLocaleString()} GNF</strong></p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Apparence ── */}
      {activeTab === "apparence" && (
        <div className="rounded-2xl p-5" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{color:T.text}}><Icon name="palette" size={15}/> Thème de l'interface</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(THEMES).map(([key,th]) => (
              <button key={key} onClick={() => setThemeName(key)}
                className="p-4 rounded-2xl flex flex-col items-center gap-2 transition-all"
                style={{background:key===themeName?`${th.accent}18`:T.input, border:`2px solid ${key===themeName?th.accent:T.inputBorder}`, transform:key===themeName?"scale(1.03)":"scale(1)"}}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{background:`linear-gradient(135deg,${th.accent},${th.accent}66)`}}>
                  <Icon name={key==="dark"?"moon":key==="light"?"sun":key==="blue"?"drop":"leaf"} size={18}/>
                </div>
                <span className="text-xs font-bold" style={{color:key===themeName?th.accent:T.textSub}}>{th.name}</span>
                {key===themeName && <span style={{color:th.accent}}><Icon name="check" size={14}/></span>}
              </button>
            ))}
          </div>
          <p className="text-xs mt-4" style={{color:T.textMuted}}>Le thème est appliqué immédiatement et mémorisé dans votre navigateur.</p>
        </div>
      )}

      {/* Bouton fixe en bas */}
      <div className="flex justify-between items-center pt-2">
        <p className="text-xs" style={{color:T.textMuted}}>
          Les modifications sont enregistrées après un clic sur « Sauvegarder ».
        </p>
        <Btn onClick={handleSave} T={T} disabled={saving}>
          <span className="flex items-center gap-2"><Icon name="save" size={15}/>{saving ? "Sauvegarde en cours..." : "Sauvegarder les paramètres"}</span>
        </Btn>
      </div>
    </div>
  );
};

// ─── FACTURATION ──────────────────────────────────────────────────────────────
const printInvoiceDoc = (inv, sName) => {
  
                
                const lignes=(inv.items||[]).map((it,i)=>`
                  <tr style="background:${i%2===0?"#fafafa":"#fff"}">
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a1a1a;">${it.product}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:13px;color:#555;">${it.qty}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;color:#555;">${fmtGNF(it.price)}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;font-weight:700;color:#1a1a1a;">${fmtGNF(it.price*it.qty)}</td>
                  </tr>`).join("");
                const sBadgeBg  = (inv.status==="Annulé"||inv.status==="Impayé")?"#fee2e2":inv.status==="Payé"?"#dcfce7":"#fef3c7";
                const sBadgeCol = (inv.status==="Annulé"||inv.status==="Impayé")?"#b91c1c":inv.status==="Payé"?"#15803d":"#b45309";
                const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<title>Facture N°${inv.id} — ${sName}</title>
<style>
  @page{margin:16mm 14mm}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a1a;font-size:13px}
  .wrap{max-width:720px;margin:0 auto;padding:0}
  /* EN-TETE */
  .top{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid #f97316;margin-bottom:22px}
  .brand-name{font-size:26px;font-weight:900;color:#f97316;letter-spacing:1px;margin-bottom:2px}
  .brand-sub{font-size:11px;color:#999}
  .inv-block{text-align:right}
  .inv-num{font-size:20px;font-weight:900;color:#111;margin-bottom:3px}
  .inv-meta{font-size:11px;color:#888;line-height:1.8}
  .badge{display:inline-block;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700;background:${sBadgeBg};color:${sBadgeCol};margin-top:6px}
  /* PARTIES */
  .parties{display:flex;gap:16px;margin-bottom:22px}
  .pbox{flex:1;border:1px solid #eee;border-radius:10px;padding:13px 15px;background:#fafafa}
  .plabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#f97316;margin-bottom:5px}
  .pname{font-size:14px;font-weight:800;color:#111;margin-bottom:2px}
  .psub{font-size:11px;color:#777}
  /* TABLEAU */
  table{width:100%;border-collapse:collapse;margin-bottom:18px;border:1px solid #eee;border-radius:8px;overflow:hidden}
  thead tr{background:#f97316}
  thead th{padding:10px 14px;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;text-align:left}
  thead th:nth-child(2){text-align:center}
  thead th:nth-child(3),thead th:nth-child(4){text-align:right}
  /* TOTAUX */
  .tot-wrap{display:flex;justify-content:flex-end;margin-bottom:26px}
  .tot{width:255px;border:1px solid #eee;border-radius:10px;overflow:hidden}
  .tot-row{display:flex;justify-content:space-between;padding:9px 14px;font-size:13px;border-bottom:1px solid #f5f5f5}
  .tot-row:last-child{border-bottom:none}
  .tot-lbl{color:#777}
  .tot-val{font-weight:600}
  .tot-grand{background:#fff8f3;padding:11px 14px;display:flex;justify-content:space-between;font-size:16px;font-weight:900;color:#f97316}
  .green{color:#15803d}
  .amber{color:#b45309}
  /* PIED */
  .foot{border-top:1px solid #eee;padding-top:16px;display:flex;justify-content:space-between;align-items:flex-end}
  .foot-left .merci{font-size:14px;font-weight:800;color:#f97316}
  .foot-left .note{font-size:10px;color:#aaa;margin-top:3px}
  .foot-right{text-align:right;font-size:11px;color:#aaa}
  .sig-line{width:150px;border-top:1px solid #ccc;margin-top:30px;margin-left:auto}
</style></head><body><div class="wrap">
  <div class="top">
    <div>
      <div class="brand-name">${sName}</div>
      <div class="brand-sub">Vente de matériaux de construction · Conakry, Guinée</div>
    </div>
    <div class="inv-block">
      <div class="inv-num">FACTURE N° ${String(inv.id).padStart(4,"0")}</div>
      <div class="inv-meta">Date : ${inv.date}<br/>Paiement : ${inv.payment}${inv.due_date?`<br/>Échéance : ${inv.due_date}`:""}${inv.delivery_date?`<br/>Livraison prévue : ${inv.delivery_date}`:""}${inv.note?`<br/>Note : ${inv.note}`:""}</div>
      <span class="badge">${inv.status}</span>
    </div>
  </div>
  <div class="parties">
    <div class="pbox">
      <div class="plabel">Vendu par</div>
      <div class="pname">${sName}</div>
      ${inv.seller_name?`<div class="psub">Vendeur : ${inv.seller_name}</div>`:""}
    </div>
    <div class="pbox">
      <div class="plabel">Client</div>
      <div class="pname">${inv.client}</div>
      <div class="psub">Mode : ${inv.payment}</div>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>Désignation</th>
      <th style="text-align:center">Qté</th>
      <th style="text-align:right">Prix unitaire</th>
      <th style="text-align:right">Montant</th>
    </tr></thead>
    <tbody>${lignes}</tbody>
  </table>
  <div class="tot-wrap"><div class="tot">
    <div class="tot-grand"><span>Total TTC</span><span>${fmtGNF(inv.total)}</span></div>
    <div class="tot-row"><span class="tot-lbl">Montant versé</span><span class="tot-val green">${fmtGNF(inv.paid??inv.total)}</span></div>
    ${(inv.remaining>0)?`<div class="tot-row"><span class="tot-lbl">Reste à payer</span><span class="tot-val amber">${fmtGNF(inv.remaining)}</span></div>`:`<div class="tot-row"><span class="tot-lbl">Solde</span><span class="tot-val green">Soldé</span></div>`}
  </div></div>
  <div class="foot">
    <div class="foot-left">
      <div class="merci">Merci pour votre confiance !</div>
      <div class="note">Tout article vendu n'est ni repris ni échangé.</div>
    </div>
    <div class="foot-right">
      <div class="sig-line"></div>
      <div>Signature &amp; Cachet</div>
    </div>
  </div>
</div></body></html>`;
                const w=window.open("","_blank","width=800,height=1000");
                w.document.open();w.document.write(html);w.document.close();
                w.focus();setTimeout(()=>w.print(),450);
};
const printDevisDoc = (inv, sName) => {
  
                
                const lignes=(inv.items||[]).map((it,i)=>`
                  <tr style="background:${i%2===0?"#fafafa":"#fff"}">
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a1a1a;">${it.product}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:13px;color:#555;">${it.qty}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;color:#555;">${fmtGNF(it.price)}</td>
                    <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;font-weight:700;color:#1a1a1a;">${fmtGNF(it.price*it.qty)}</td>
                  </tr>`).join("");
                const today=new Date();
                const validUntil=new Date(today.getTime()+15*24*60*60*1000);
                const validStr=inv.valid_until||localDateStr(validUntil);
                const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<title>Devis N°${String(inv.num).padStart(4,"0")} — ${sName}</title>
<style>
  @page{margin:16mm 14mm}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a1a;font-size:13px}
  .wrap{max-width:720px;margin:0 auto;padding:0}
  /* EN-TETE */
  .top{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid #f97316;margin-bottom:22px}
  .brand-name{font-size:26px;font-weight:900;color:#f97316;letter-spacing:1px;margin-bottom:2px}
  .brand-sub{font-size:11px;color:#999}
  .inv-block{text-align:right}
  .inv-num{font-size:20px;font-weight:900;color:#111;margin-bottom:3px}
  .inv-meta{font-size:11px;color:#888;line-height:1.8}
  .badge{display:inline-block;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700;background:#fef3c7;color:#b45309;margin-top:6px}
  /* PARTIES */
  .parties{display:flex;gap:16px;margin-bottom:22px}
  .pbox{flex:1;border:1px solid #eee;border-radius:10px;padding:13px 15px;background:#fafafa}
  .plabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#f97316;margin-bottom:5px}
  .pname{font-size:14px;font-weight:800;color:#111;margin-bottom:2px}
  .psub{font-size:11px;color:#777}
  /* TABLEAU */
  table{width:100%;border-collapse:collapse;margin-bottom:18px;border:1px solid #eee;border-radius:8px;overflow:hidden}
  thead tr{background:#f97316}
  thead th{padding:10px 14px;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;text-align:left}
  thead th:nth-child(2){text-align:center}
  thead th:nth-child(3),thead th:nth-child(4){text-align:right}
  /* TOTAUX */
  .tot-wrap{display:flex;justify-content:flex-end;margin-bottom:10px}
  .tot{width:255px;border:1px solid #eee;border-radius:10px;overflow:hidden}
  .tot-grand{background:#fff8f3;padding:11px 14px;display:flex;justify-content:space-between;font-size:16px;font-weight:900;color:#f97316}
  .validity{text-align:right;font-size:11px;color:#b45309;font-weight:700;margin-bottom:26px}
  /* PIED */
  .foot{border-top:1px solid #eee;padding-top:16px;display:flex;justify-content:space-between;align-items:flex-end}
  .foot-left .merci{font-size:14px;font-weight:800;color:#f97316}
  .foot-left .note{font-size:10px;color:#aaa;margin-top:3px;max-width:400px;line-height:1.5}
  .foot-right{text-align:right;font-size:11px;color:#aaa}
  .sig-line{width:150px;border-top:1px solid #ccc;margin-top:30px;margin-left:auto}
</style></head><body><div class="wrap">
  <div class="top">
    <div>
      <div class="brand-name">${sName}</div>
      <div class="brand-sub">Vente de matériaux de construction · Conakry, Guinée</div>
    </div>
    <div class="inv-block">
      <div class="inv-num">DEVIS N° ${String(inv.num).padStart(4,"0")}</div>
      <div class="inv-meta">Date : ${inv.date}<br/>Validité : 15 jours</div>
      <span class="badge">DEVIS</span>
    </div>
  </div>
  <div class="parties">
    <div class="pbox">
      <div class="plabel">Établi par</div>
      <div class="pname">${sName}</div>
      ${inv.seller_name?`<div class="psub">Vendeur : ${inv.seller_name}</div>`:""}
    </div>
    <div class="pbox">
      <div class="plabel">Client</div>
      <div class="pname">${inv.client}</div>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>Désignation</th>
      <th style="text-align:center">Qté</th>
      <th style="text-align:right">Prix unitaire</th>
      <th style="text-align:right">Montant</th>
    </tr></thead>
    <tbody>${lignes}</tbody>
  </table>
  <div class="tot-wrap"><div class="tot">
    <div class="tot-grand"><span>Total estimé</span><span>${fmtGNF(inv.total)}</span></div>
  </div></div>
  <div class="validity">Devis valable jusqu'au ${validStr}</div>
  <div class="foot">
    <div class="foot-left">
      <div class="merci">Merci de votre confiance !</div>
      <div class="note">Ce document est un devis estimatif. Il ne constitue pas une facture et n'engage aucune vente ni mouvement de stock. Les prix indiqués sont susceptibles d'évoluer après la date de validité.</div>
    </div>
    <div class="foot-right">
      <div class="sig-line"></div>
      <div>Signature &amp; Cachet</div>
    </div>
  </div>
</div></body></html>`;
                const w=window.open("","_blank","width=800,height=1000");
                w.document.open();w.document.write(html);w.document.close();
                w.focus();setTimeout(()=>w.print(),450);
};

const saleState = (s) => {
  if (s.status === "Annulé") return "Annulé";
  if ((+s.total || 0) > 0 && (+s.returned || 0) >= (+s.total || 0)) return "Retourné";
  if (s.status === "Partiel" && s.remaining == null) return "Partiel";
  if ((+s.remaining || 0) > 0) return (+s.paid || 0) > 0 ? "Partiel" : "Impayé";
  return "Payé";
};
const devisState = (d) => (d.status === "En attente" && d.valid_until && d.valid_until < localDateStr()) ? "Expiré" : d.status;
const invNum = (id) => String(id).padStart(4, "0");
const StateBadge = ({ state }) => {
  const st = STATE_STYLE[state] || STATE_STYLE["Partiel"];
  return <span className="text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap" style={{background:st.bg,color:st.color}}>{state}</span>;
};
const periodRange = (p, from, to) => {
  const today = localDateStr(), d = new Date();
  if (p === "today") return [today, today];
  if (p === "week") return [localDateStr(new Date(Date.now() - 6 * 86400000)), today];
  if (p === "month") return [today.slice(0, 8) + "01", today];
  if (p === "lastmonth") return [localDateStr(new Date(d.getFullYear(), d.getMonth() - 1, 1)), localDateStr(new Date(d.getFullYear(), d.getMonth(), 0))];
  if (p === "custom") return [from || "", to || ""];
  return ["", ""];
};
const inRange = (date, [a, b]) => (!a || (date || "") >= a) && (!b || (date || "") <= b);

// Éditeur de devis (onglet Facturation)
const DevisFormModal = ({ clients, products, T, user, onSaved, onClose }) => {
  const [client, setClient] = useState("");
  const [validDays, setValidDays] = useState("15");
  const [discount, setDiscount] = useState("0");
  const [usePromo, setUsePromo] = useState(false);
  const [lines, setLines] = useState([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const cat = clients.find(c => c.name === client)?.category || "Détail";
  const price = (l) => l.manualPrice != null ? (+l.manualPrice || 0) : resolvePrice(l, cat, usePromo).price;
  const subtotal = lines.reduce((a, l) => a + price(l) * (+l.qty || 0), 0);
  const disc = Math.min(100, Math.max(0, +discount || 0));
  const total = Math.round(subtotal - subtotal * disc / 100);
  const q = normText(search).trim();
  const results = q ? products.filter(p => normText(p.name).includes(q) || normText(p.ref).includes(q)).slice(0, 6) : [];
  const ctl = { background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text };
  const add = (p) => {
    if (isExpired(p)) { setErrMsg(`« ${p.name} » est périmé : impossible de l'ajouter.`); return; }
    setErrMsg("");
    setLines(prev => { const ex = prev.find(l => l.id === p.id); return ex ? prev.map(l => l.id === p.id ? { ...l, qty: (+l.qty || 0) + 1 } : l) : [...prev, { ...p, qty: 1, manualPrice: null }]; });
    setSearch("");
  };
  const upd = (id, patch) => setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  const save = async () => {
    if (lines.length === 0) { setErrMsg("Ajoutez au moins un produit."); return; }
    if (lines.some(l => !(+l.qty > 0))) { setErrMsg("Chaque ligne doit avoir une quantité supérieure à 0."); return; }
    setSaving(true); setErrMsg("");
    const doc = {
      date: localDateStr(),
      valid_until: localDateStr(new Date(Date.now() + (Math.max(1, +validDays || 15)) * 86400000)),
      client: client || "Client comptoir",
      items: lines.map(l => ({ product: l.name, qty: +l.qty, price: price(l), product_id: l.id })),
      total, discount: disc, status: "En attente", seller_name: user?.name || "Inconnu",
    };
    const { data, error } = await supabase.from("devis").insert([doc]).select();
    if (error || !data?.[0]) { setErrMsg("Erreur : " + (error?.message || "enregistrement impossible") + " (table « devis » manquante ? exécutez facturation.sql)"); setSaving(false); return; }
    setSaving(false); onSaved(data[0]);
  };
  return (
    <Modal title="Nouveau devis" onClose={onClose} T={T} wide>
      <ErrBox msg={errMsg}/>
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Client" value={client} options={["", ...clients.map(c => c.name)]} optionLabels={["Client comptoir", ...clients.map(c => `${c.name}${c.category ? ` (${c.category})` : ""}`)]} onChange={setClient} T={T}/>
          <Field label="Validité (jours)" type="number" value={validDays} onChange={setValidDays} T={T}/>
          <Field label="Remise (%)" type="number" value={discount} onChange={setDiscount} T={T}/>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs" style={{color:T.textMuted}}>Tarif appliqué : <b style={{color:T.accent}}>{cat}</b></p>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none" style={{color:usePromo?"#f59e0b":T.textMuted}}>
            <input type="checkbox" checked={usePromo} onChange={e => setUsePromo(e.target.checked)} style={{accentColor:"#f59e0b"}}/> <Icon name="flame" size={14}/> Appliquer les prix promo
          </label>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:T.textMuted}}><Icon name="search" size={14}/></span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un produit à ajouter..." className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none" style={ctl}/>
          {results.length > 0 && (
            <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl" style={{background:T.optionBg||"#1e1e1e",border:`1px solid ${T.inputBorder}`}}>
              {results.map(p => (
                <button key={p.id} onClick={() => add(p)} className="w-full text-left px-3 py-2 text-xs flex justify-between gap-2" style={{color:T.optionColor||"#e5e7eb",opacity:isExpired(p)?0.5:1}}>
                  <span className="truncate">{p.name}{isExpired(p) ? " — périmé" : ""}</span>
                  <span style={{color:T.textMuted}}>{fmtGNF(resolvePrice(p, cat, usePromo).price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {lines.length === 0 && <p className="text-xs text-center py-4" style={{color:T.textMuted}}>Aucun produit ajouté</p>}
          {lines.map(l => (
            <div key={l.id} className="flex items-center gap-2 px-2 py-2 rounded-lg" style={{background:T.rowHover}}>
              <p className="flex-1 min-w-0 text-xs font-medium truncate" style={{color:T.text}}>{l.name}</p>
              <input type="number" min="0" value={l.manualPrice != null ? l.manualPrice : price(l)} onChange={e => upd(l.id, { manualPrice: e.target.value })} onBlur={() => l.manualPrice === "" && upd(l.id, { manualPrice: null })} title="Prix unitaire (modifiable)" className="w-28 px-2 py-1 rounded text-xs text-right outline-none" style={{...ctl,border:`1px solid ${l.manualPrice != null ? "#f59e0b" : T.inputBorder}`}}/>
              <span className="text-xs" style={{color:T.textMuted}}>×</span>
              <input type="number" min="1" step="1" value={l.qty} onChange={e => upd(l.id, { qty: e.target.value === "" ? "" : Math.max(0, Math.floor(+e.target.value) || 0) })} onBlur={() => !(+l.qty > 0) && upd(l.id, { qty: 1 })} className="w-16 px-1 py-1 rounded text-xs text-center outline-none" style={ctl}/>
              <p className="w-28 text-right text-xs font-bold" style={{color:T.accent}}>{fmtGNF(price(l) * (+l.qty || 0))}</p>
              <button onClick={() => setLines(prev => prev.filter(x => x.id !== l.id))} title="Retirer" style={{color:"#ef4444"}}><Icon name="trash" size={14}/></button>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center pt-2 border-t" style={{borderColor:T.cardBorder}}>
          <span className="text-xs" style={{color:T.textMuted}}>{disc > 0 ? `Remise ${disc}% incluse` : "Sans remise"}</span>
          <span className="text-lg font-black" style={{color:T.accent}}>{fmtGNF(total)}</span>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-4"><Btn onClick={onClose} variant="ghost" T={T}>Annuler</Btn><Btn onClick={save} T={T} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer le devis"}</Btn></div>
    </Modal>
  );
};

const FacturationPage = ({ sales, setSales, clients, setClients, products, setProducts, T, userRole, user, shopSettings, onConvertDevis, onNewInvoice }) => {
  const write = canWrite(userRole, "billing");
  const canCancel = canDelete(userRole, "billing");
  const shopName = shopSettings?.shop_name || "MOGESTOCK";
  const [tab, setTab] = useState("factures");
  const [statusF, setStatusF] = useState("Tous");
  const [clientF, setClientF] = useState("Tous");
  const [periodF, setPeriodF] = useState("all");
  const [dFrom, setDFrom] = useState("");
  const [dTo, setDTo] = useState("");
  const [q, setQ] = useState("");
  const [payments, setPayments] = useState([]);
  const [devisList, setDevisList] = useState([]);
  const [dbWarn, setDbWarn] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [payId, setPayId] = useState(null);
  const [cancelId, setCancelId] = useState(null);
  const [devisDetailId, setDevisDetailId] = useState(null);
  const [showDevisForm, setShowDevisForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [payForm, setPayForm] = useState({ amount: "", method: "Espèces", note: "" });
  const [cancelReason, setCancelReason] = useState("");
  const [returns, setReturns] = useState([]);
  const [retId, setRetId] = useState(null);
  const [retQty, setRetQty] = useState({});   // { index ligne: quantité à retourner }
  const [retCond, setRetCond] = useState({}); // { index ligne: "Revendable" | "Abîmé" }
  const [retReason, setRetReason] = useState("");
  const [retMethod, setRetMethod] = useState("Espèces");

  useEffect(() => {
    (async () => {
      const miss = [];
      const r1 = await supabase.from("sale_payments").select("*").order("id", { ascending: false });
      if (r1.error) miss.push("sale_payments"); else setPayments(r1.data || []);
      const r2 = await supabase.from("devis").select("*").order("id", { ascending: false });
      if (r2.error) miss.push("devis"); else setDevisList(r2.data || []);
      const r3 = await supabase.from("sales").select("cancelled_at").limit(1);
      if (r3.error) miss.push("colonnes d'annulation de sales");
      const r4 = await supabase.from("sale_returns").select("*").order("id", { ascending: false });
      if (r4.error) miss.push("sale_returns (retours.sql)"); else setReturns(r4.data || []);
      const r5 = await supabase.from("sales").select("returned").limit(1);
      if (r5.error) miss.push("colonne sales.returned (retours.sql)");
      setDbWarn(miss.length ? `Base de données à compléter : ${miss.join(", ")}. Exécutez le script facturation.sql dans Supabase (SQL Editor).` : "");
    })();
  }, []);

  const ctl = { background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text };
  const range = periodRange(periodF, dFrom, dTo);
  const ql = normText(q).trim();
  const isOverdue = (x) => x.status !== "Annulé" && (+x.remaining || 0) > 0 && !!x.due_date && x.due_date < localDateStr();
  const clientNames = [...new Set([...sales.map(s => s.client), ...devisList.map(d => d.client)].filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const switchTab = (t) => { setTab(t); setStatusF("Tous"); setErrMsg(""); };

  const facts = sales.filter(s => {
    if (statusF === "En retard" ? !isOverdue(s) : (statusF !== "Tous" && saleState(s) !== statusF)) return false;
    if (clientF !== "Tous" && s.client !== clientF) return false;
    if (!inRange(s.date, range)) return false;
    if (ql && !(normText(s.client).includes(ql) || invNum(s.id).includes(ql))) return false;
    return true;
  });
  const live = facts.filter(s => s.status !== "Annulé");
  const kTotal = live.reduce((a, s) => a + saleNet(s), 0);
  const kPaid = live.reduce((a, s) => a + (+s.paid || 0), 0);
  const kRem = live.reduce((a, s) => a + (+s.remaining || 0), 0);
  const kOpen = live.filter(s => (+s.remaining || 0) > 0).length;
  const kLate = live.filter(isOverdue).length;

  const devs = devisList.filter(d => {
    if (statusF !== "Tous" && devisState(d) !== statusF) return false;
    if (clientF !== "Tous" && d.client !== clientF) return false;
    if (!inRange(d.date, range)) return false;
    if (ql && !(normText(d.client).includes(ql) || invNum(d.id).includes(ql))) return false;
    return true;
  });

  const paymentsOf = (id) => payments.filter(p => String(p.sale_id) === String(id)).sort((a, b) => a.id - b.id);
  const returnsOf = (id) => returns.filter(r => String(r.sale_id) === String(id)).sort((a, b) => a.id - b.id);
  const returnedQty = (id, idx) => returnsOf(id).reduce((a, r) => a + (r.items || []).filter(i => i.idx === idx).reduce((b, i) => b + (+i.qty || 0), 0), 0);
  const refundedOf = (id) => returnsOf(id).reduce((a, r) => a + (+r.refund || 0), 0);
  const initialPaid = (s) => Math.max(0, (+s.paid || 0) + refundedOf(s.id) - paymentsOf(s.id).reduce((a, p) => a + (+p.amount || 0), 0));
  const canReturn = (s) => write && s.status !== "Annulé" && (s.items || []).some((it, i) => (+it.qty || 0) - returnedQty(s.id, i) > 0);

  const detail = sales.find(x => x.id === detailId) || null;
  const paySale = sales.find(x => x.id === payId) || null;
  const cancelSale = sales.find(x => x.id === cancelId) || null;
  const devisDetail = devisList.find(x => x.id === devisDetailId) || null;

  // ── Encaisser le reste ──
  const openPay = (s) => { setPayId(s.id); setPayForm({ amount: String(+s.remaining || 0), method: "Espèces", note: "" }); setErrMsg(""); };
  const doPay = async () => {
    const s = paySale; if (!s) return;
    const amt = Math.round(+payForm.amount || 0);
    if (!(amt > 0)) { setErrMsg("Saisissez un montant supérieur à 0."); return; }
    setBusy(true); setErrMsg("");
    const { data: fresh, error: e0 } = await supabase.from("sales").select("paid,remaining,status").eq("id", s.id).single();
    if (e0 || !fresh) { setErrMsg("Erreur : " + (e0?.message || "facture introuvable")); setBusy(false); return; }
    if (fresh.status === "Annulé") { setErrMsg("Cette facture a été annulée : encaissement impossible."); setBusy(false); return; }
    const rem = +fresh.remaining || 0;
    if (amt > rem) { setErrMsg(`Le montant dépasse le reste à encaisser (${fmtGNF(rem)}).`); setBusy(false); return; }
    const pay = { sale_id: s.id, date: localDateStr(), amount: amt, method: payForm.method, note: payForm.note.trim() || null, received_by: user?.name || "Inconnu" };
    const { data: pd, error: e1 } = await supabase.from("sale_payments").insert([pay]).select();
    if (e1 || !pd?.[0]) { setErrMsg("Erreur : " + (e1?.message || "enregistrement impossible") + " (table sale_payments manquante ? exécutez facturation.sql)"); setBusy(false); return; }
    const newPaid = (+fresh.paid || 0) + amt, newRem = rem - amt, newStatus = newRem > 0 ? "Partiel" : "Payé";
    const { error: e2 } = await supabase.from("sales").update({ paid: newPaid, remaining: newRem, status: newStatus }).eq("id", s.id);
    if (e2) { await supabase.from("sale_payments").delete().eq("id", pd[0].id); setErrMsg("Erreur : " + e2.message); setBusy(false); return; }
    const cl = clients.find(c => c.name === s.client);
    if (cl) {
      const { data: fc } = await supabase.from("clients").select("debt").eq("id", cl.id).single();
      const newDebt = Math.max(0, (+(fc?.debt ?? cl.debt) || 0) - amt);
      await supabase.from("clients").update({ debt: newDebt }).eq("id", cl.id);
      setClients(prev => prev.map(c => c.id === cl.id ? { ...c, debt: newDebt } : c));
    }
    setSales(prev => prev.map(x => x.id === s.id ? { ...x, paid: newPaid, remaining: newRem, status: newStatus } : x));
    setPayments(prev => [pd[0], ...prev]);
    setPayId(null); setBusy(false);
    setOkMsg(`${fmtGNF(amt)} encaissé sur la facture N° ${invNum(s.id)}${newRem > 0 ? ` — reste ${fmtGNF(newRem)}.` : " — facture soldée."}`);
  };

  // ── Annulation d'une facture (remet le stock en place) ──
  const resolveProduct = (it) => {
    if (it.product_id != null) { const p = products.find(x => x.id === it.product_id); if (p) return p; }
    const n = normText(it.product).trim();
    const m = products.filter(x => normText(x.name).trim() === n);
    return m.length === 1 ? m[0] : null;
  };
  const cancelPlan = cancelSale ? (cancelSale.items || []).map((it, i) => ({ it: { ...it, qty: (+it.qty || 0) - returnedQty(cancelSale.id, i) }, prod: resolveProduct(it) })).filter(x => x.it.qty > 0) : [];
  const openCancel = (s) => { setCancelId(s.id); setCancelReason(""); setErrMsg(""); };
  const doCancel = async () => {
    const s = cancelSale; if (!s) return;
    const reason = cancelReason.trim();
    if (reason.length < 3) { setErrMsg("Indiquez le motif de l'annulation."); return; }
    setBusy(true); setErrMsg("");
    const { data: fresh, error: e0 } = await supabase.from("sales").select("status,paid,remaining").eq("id", s.id).single();
    if (e0 || !fresh) { setErrMsg("Erreur : " + (e0?.message || "facture introuvable")); setBusy(false); return; }
    if (fresh.status === "Annulé") { setErrMsg("Cette facture est déjà annulée."); setBusy(false); return; }
    const patch = { status: "Annulé", cancelled_at: new Date().toISOString(), cancelled_by: user?.name || "Inconnu", cancel_reason: reason };
    const { error: e1 } = await supabase.from("sales").update(patch).eq("id", s.id);
    if (e1) { setErrMsg("Erreur : " + e1.message + " (colonnes d'annulation manquantes ? exécutez facturation.sql)"); setBusy(false); return; }
    // Retour des articles en stock
    const restored = [], skipped = [];
    for (const { it, prod } of cancelPlan) {
      if (!prod) { skipped.push(it.product); continue; }
      const { data: fp } = await supabase.from("products").select("qty").eq("id", prod.id).single();
      const newQty = (+(fp?.qty ?? prod.qty) || 0) + (+it.qty || 0);
      const { error: e } = await supabase.from("products").update({ qty: newQty }).eq("id", prod.id);
      if (e) { skipped.push(it.product); continue; }
      restored.push({ id: prod.id, newQty });
      await supabase.from("stock_movements").insert([{ date: localDateStr(), product: prod.name, type: "Entrée", qty: +it.qty || 0, reason: `Annulation facture N° ${invNum(s.id)}`, user_name: user?.name || "Inconnu", user_role: user?.role || "" }]);
    }
    if (restored.length) setProducts(prev => prev.map(p => { const r = restored.filter(x => x.id === p.id).pop(); return r ? { ...p, qty: r.newQty } : p; }));
    // Ajustement du client (achats cumulés et dette)
    const cl = clients.find(c => c.name === s.client);
    if (cl) {
      const { data: fc } = await supabase.from("clients").select("debt,total_purchases").eq("id", cl.id).single();
      const newDebt = Math.max(0, (+(fc?.debt ?? cl.debt) || 0) - (+fresh.remaining || 0));
      const newTotal = Math.max(0, (+(fc?.total_purchases ?? cl.total_purchases) || 0) - saleNet(s));
      await supabase.from("clients").update({ debt: newDebt, total_purchases: newTotal }).eq("id", cl.id);
      setClients(prev => prev.map(c => c.id === cl.id ? { ...c, debt: newDebt, total_purchases: newTotal } : c));
    }
    setSales(prev => prev.map(x => x.id === s.id ? { ...x, ...patch } : x));
    setCancelId(null); setBusy(false);
    const refund = +fresh.paid || 0;
    setOkMsg(`Facture N° ${invNum(s.id)} annulée. ${restored.length} article(s) remis en stock.${skipped.length ? ` Stock non restitué pour : ${skipped.join(", ")} (à corriger dans l'onglet Stock).` : ""}${refund > 0 ? ` À rembourser au client : ${fmtGNF(refund)}.` : ""}`);
  };

  // ── Retour de produits non utilisés ──
  // Règle : la valeur retournée réduit d'abord le reste à payer (vente à crédit),
  // l'excédent éventuel est remboursé (vente déjà payée). Prix = prix facturé, remise incluse.
  const retSale = sales.find(x => x.id === retId) || null;
  const retRatio = (s) => { const g = (s.items || []).reduce((a, it) => a + (+it.price || 0) * (+it.qty || 0), 0); return g > 0 ? (+s.total || 0) / g : 1; };
  const retPlan = retSale ? (retSale.items || []).map((it, idx) => {
    const avail = (+it.qty || 0) - returnedQty(retSale.id, idx);
    const q = Math.min(Math.max(+retQty[idx] || 0, 0), avail);
    const unit = Math.round((+it.price || 0) * retRatio(retSale));
    return { it, idx, avail, q, unit, cond: retCond[idx] || "Revendable", prod: resolveProduct(it) };
  }) : [];
  const retValue = retPlan.reduce((a, l) => a + l.q * l.unit, 0);
  const retDebt = retSale ? Math.min(+retSale.remaining || 0, retValue) : 0;
  const retRefund = retValue - retDebt;
  const openReturn = (s) => { setRetId(s.id); setRetQty({}); setRetCond({}); setRetReason(""); setRetMethod("Espèces"); setErrMsg(""); };
  const doReturn = async (thenPay) => {
    const s = retSale; if (!s) return;
    const lines = retPlan.filter(l => l.q > 0);
    if (!lines.length) { setErrMsg("Indiquez la quantité à retourner pour au moins un produit."); return; }
    if (retReason.trim().length < 3) { setErrMsg("Indiquez le motif du retour."); return; }
    setBusy(true); setErrMsg("");
    const { data: fresh, error: e0 } = await supabase.from("sales").select("paid,remaining,status,returned").eq("id", s.id).single();
    if (e0 || !fresh) { setErrMsg("Erreur : " + (e0?.message || "facture introuvable") + " (exécutez retours.sql ?)"); setBusy(false); return; }
    if (fresh.status === "Annulé") { setErrMsg("Cette facture est annulée : retour impossible."); setBusy(false); return; }
    const { data: fr } = await supabase.from("sale_returns").select("items").eq("sale_id", s.id);
    const used = {}; (fr || []).forEach(r => (r.items || []).forEach(i => { used[i.idx] = (used[i.idx] || 0) + (+i.qty || 0); }));
    if (lines.some(l => l.q > (+l.it.qty || 0) - (used[l.idx] || 0))) { setErrMsg("Une quantité dépasse ce qui reste retournable (un autre retour vient d'être enregistré)."); setBusy(false); return; }
    const rem = +fresh.remaining || 0, paidNow = +fresh.paid || 0;
    const debtRed = Math.min(rem, retValue), refund = retValue - debtRed;
    if (refund > paidNow) { setErrMsg("Le remboursement dépasse le montant déjà encaissé sur cette facture."); setBusy(false); return; }
    const rec = { sale_id: s.id, date: localDateStr(), amount: retValue, debt_reduction: debtRed, refund, refund_method: refund > 0 ? retMethod : null, reason: retReason.trim(), created_by: user?.name || "Inconnu",
      items: lines.map(l => ({ idx: l.idx, product: l.it.product, product_id: l.prod?.id ?? l.it.product_id ?? null, qty: l.q, price: l.unit, condition: l.cond })) };
    const { data: rd, error: e1 } = await supabase.from("sale_returns").insert([rec]).select();
    if (e1 || !rd?.[0]) { setErrMsg("Erreur : " + (e1?.message || "enregistrement impossible") + " (table sale_returns manquante ? exécutez retours.sql)"); setBusy(false); return; }
    const newRem = rem - debtRed, newPaid = paidNow - refund, newReturned = (+fresh.returned || 0) + retValue;
    const patch = { paid: newPaid, remaining: newRem, returned: newReturned, status: newRem > 0 ? (newPaid > 0 ? "Partiel" : "Impayé") : "Payé" };
    const { error: e2 } = await supabase.from("sales").update(patch).eq("id", s.id);
    if (e2) { await supabase.from("sale_returns").delete().eq("id", rd[0].id); setErrMsg("Erreur : " + e2.message); setBusy(false); return; }
    // Stock : seuls les produits revendables retournent en stock
    const restored = [];
    for (const l of lines) {
      if (l.cond !== "Revendable" || !l.prod) continue;
      const { data: fp } = await supabase.from("products").select("qty").eq("id", l.prod.id).single();
      const newQty = (+(fp?.qty ?? l.prod.qty) || 0) + l.q;
      const { error: e } = await supabase.from("products").update({ qty: newQty }).eq("id", l.prod.id);
      if (e) continue;
      restored.push({ id: l.prod.id, newQty });
      await supabase.from("stock_movements").insert([{ date: localDateStr(), product: l.prod.name, type: "Entrée", qty: l.q, reason: `Retour client — facture N° ${invNum(s.id)}`, user_name: user?.name || "Inconnu", user_role: user?.role || "" }]);
    }
    if (restored.length) setProducts(prev => prev.map(p => { const r = restored.filter(x => x.id === p.id).pop(); return r ? { ...p, qty: r.newQty } : p; }));
    // Client : dette et achats cumulés
    const cl = clients.find(c => c.name === s.client);
    if (cl) {
      const { data: fc } = await supabase.from("clients").select("debt,total_purchases").eq("id", cl.id).single();
      const nd = Math.max(0, (+(fc?.debt ?? cl.debt) || 0) - debtRed), nt = Math.max(0, (+(fc?.total_purchases ?? cl.total_purchases) || 0) - retValue);
      await supabase.from("clients").update({ debt: nd, total_purchases: nt }).eq("id", cl.id);
      setClients(prev => prev.map(c => c.id === cl.id ? { ...c, debt: nd, total_purchases: nt } : c));
    }
    setSales(prev => prev.map(x => x.id === s.id ? { ...x, ...patch } : x));
    setReturns(prev => [rd[0], ...prev]);
    setRetId(null); setBusy(false);
    const skipped = lines.filter(l => l.cond === "Revendable" && !l.prod).length;
    setOkMsg(`Retour de ${fmtGNF(retValue)} enregistré sur la facture N° ${invNum(s.id)}.${debtRed > 0 ? ` Dette réduite de ${fmtGNF(debtRed)}.` : ""}${refund > 0 ? ` À rembourser au client : ${fmtGNF(refund)} (${retMethod}).` : ""}${newRem > 0 ? ` Reste à payer : ${fmtGNF(newRem)}${s.due_date ? ` avant le ${s.due_date}` : ""}.` : ""}${skipped ? ` ${skipped} produit(s) introuvable(s) : stock à corriger manuellement.` : ""}`);
    if (thenPay && newRem > 0) openPay({ ...s, remaining: newRem });
  };

  // ── Devis ──
  const setDevisStatus = async (d, status) => {
    const { error } = await supabase.from("devis").update({ status }).eq("id", d.id);
    if (error) { setErrMsg("Erreur : " + error.message); return; }
    setDevisList(prev => prev.map(x => x.id === d.id ? { ...x, status } : x));
  };
  const deleteDevis = async (d) => {
    if (!window.confirm(`Supprimer définitivement le devis N° ${invNum(d.id)} ?`)) return;
    const { error } = await supabase.from("devis").delete().eq("id", d.id);
    if (error) { setErrMsg("Erreur : " + error.message); return; }
    setDevisList(prev => prev.filter(x => x.id !== d.id)); setDevisDetailId(null);
  };

  const statusOptions = tab === "factures" ? ["Tous", "Payé", "Partiel", "Impayé", "En retard", "Retourné", "Annulé"] : ["Tous", "En attente", "Converti", "Refusé", "Expiré"];
  const TabBtn = ({ id, label }) => (
    <button onClick={() => switchTab(id)} className="px-4 py-2 rounded-xl text-sm font-semibold transition-all" style={{background:tab===id?`${T.accent}25`:T.input,color:tab===id?T.accent:T.textMuted,border:`1px solid ${tab===id?T.accent+"55":T.inputBorder}`}}>{label}</button>
  );

  return (
    <div className="space-y-5">
      <style>{`select.themed-select option{background-color:${T.optionBg||"#1e1e1e"} !important;color:${T.optionColor||"#e5e7eb"} !important;}`}</style>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-black" style={{color:T.text}}>Facturation</h1>
        <div className="flex items-center gap-2">
          <TabBtn id="factures" label={`Factures (${sales.length})`}/>
          <TabBtn id="devis" label={`Devis (${devisList.length})`}/>
          {tab === "factures" && write && <Btn onClick={onNewInvoice} T={T}><span className="flex items-center gap-1"><Icon name="plus" size={14}/> Nouvelle facture</span></Btn>}
          {tab === "devis" && write && <Btn onClick={() => { setErrMsg(""); setShowDevisForm(true); }} T={T}><span className="flex items-center gap-1"><Icon name="plus" size={14}/> Nouveau devis</span></Btn>}
        </div>
      </div>
      {dbWarn && <div className="rounded-xl px-4 py-2 text-xs" style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",color:"#f59e0b"}}><Icon name="warning" size={14}/> {dbWarn}</div>}
      {okMsg && <div className="rounded-xl px-4 py-2 text-sm flex justify-between gap-3" style={{background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e"}}><span>{okMsg}</span><button onClick={() => setOkMsg("")}><Icon name="close" size={14}/></button></div>}
      {!payId && !cancelId && !showDevisForm && <ErrBox msg={errMsg}/>}

      {tab === "factures" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[["Total facturé", fmtGNF(kTotal), T.accent], ["Encaissé", fmtGNF(kPaid), "#22c55e"], ["Reste à encaisser", fmtGNF(kRem), "#f59e0b"], ["Factures à solder", String(kOpen) + (kLate ? ` (dont ${kLate} en retard)` : ""), "#ef4444"]].map(([l, v, c]) => (
            <div key={l} className="rounded-2xl p-4" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
              <p className="text-xs" style={{color:T.textMuted}}>{l}</p>
              <p className="text-lg font-black mt-1" style={{color:c}}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="rounded-2xl p-3 grid grid-cols-2 lg:grid-cols-6 gap-2" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
        <div className="relative col-span-2 lg:col-span-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:T.textMuted}}><Icon name="search" size={14}/></span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="N° ou nom du client..." className="w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none" style={ctl}/>
        </div>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} className="themed-select px-3 py-2 rounded-xl text-xs outline-none" style={ctl}>
          {statusOptions.map(o => <option key={o} value={o}>{o === "Tous" ? "Tous les statuts" : o}</option>)}
        </select>
        <select value={clientF} onChange={e => setClientF(e.target.value)} className="themed-select px-3 py-2 rounded-xl text-xs outline-none" style={ctl}>
          <option value="Tous">Tous les clients</option>
          {clientNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={periodF} onChange={e => setPeriodF(e.target.value)} className="themed-select px-3 py-2 rounded-xl text-xs outline-none col-span-2 lg:col-span-2" style={ctl}>
          <option value="all">Toute la période</option><option value="today">Aujourd'hui</option><option value="week">7 derniers jours</option>
          <option value="month">Ce mois</option><option value="lastmonth">Mois dernier</option><option value="custom">Période personnalisée…</option>
        </select>
        {periodF === "custom" && (
          <div className="col-span-2 lg:col-span-6 flex items-center gap-2 text-xs" style={{color:T.textMuted}}>
            Du <input type="date" value={dFrom} onChange={e => setDFrom(e.target.value)} className="px-2 py-1.5 rounded-lg outline-none" style={ctl}/>
            au <input type="date" value={dTo} onChange={e => setDTo(e.target.value)} className="px-2 py-1.5 rounded-lg outline-none" style={ctl}/>
          </div>
        )}
      </div>

      {/* Liste des factures */}
      {tab === "factures" && (
        <div className="rounded-2xl overflow-hidden" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{minWidth:900}}>
              <thead><tr style={{background:T.tableHead}}>{["N°", "Date", "Client", "Total", "Payé", "Reste", "Statut", "Actions"].map(h => <th key={h} className="px-3 py-2.5 text-left text-xs uppercase tracking-wider" style={{color:T.textMuted}}>{h}</th>)}</tr></thead>
              <tbody>
                {facts.map(s => {
                  const st = saleState(s); const open = (st === "Partiel" || st === "Impayé") && (+s.remaining || 0) > 0;
                  return (
                    <tr key={s.id} className="border-t" style={{borderColor:T.cardBorder,opacity:st==="Annulé"?0.55:1}}>
                      <td className="px-3 py-2.5 text-xs font-bold whitespace-nowrap" style={{color:T.text}}>N° {invNum(s.id)}</td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{color:T.textMuted}}>{s.date}</td>
                      <td className="px-3 py-2.5 text-xs" style={{color:T.text}}>{s.client}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap" style={{color:T.accent}}>{fmtGNF(s.total)}{(+s.returned || 0) > 0 && <span className="block text-xs font-normal" style={{color:"#a855f7"}}><Icon name="undo" size={13}/> −{fmtGNF(s.returned)}</span>}</td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{color:"#22c55e"}}>{fmtGNF(s.paid != null ? s.paid : (st === "Payé" ? s.total : 0))}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap" style={{color:open?"#f59e0b":T.textMuted}}>{open ? fmtGNF(s.remaining) : "—"}{open && s.due_date && <span className="block text-xs font-normal" style={{color:isOverdue(s)?"#ef4444":T.textMuted}}>Éch. {s.due_date}{isOverdue(s) ? " · en retard" : ""}</span>}</td>
                      <td className="px-3 py-2.5"><StateBadge state={st}/></td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1.5 flex-wrap">
                          <Btn onClick={() => setDetailId(s.id)} variant="ghost" size="sm" T={T}><Icon name="eye" size={13}/></Btn>
                          <Btn onClick={() => printInvoiceDoc(s, shopName)} variant="ghost" size="sm" T={T}><Icon name="print" size={13}/></Btn>
                          {open && write && <Btn onClick={() => openPay(s)} variant="success" size="sm" T={T}><span className="whitespace-nowrap"><Icon name="cash" size={14}/> Encaisser le reste</span></Btn>}
                          {canReturn(s) && <Btn onClick={() => openReturn(s)} variant="ghost" size="sm" T={T}><span className="whitespace-nowrap"><Icon name="undo" size={13}/> Retour</span></Btn>}
                          {st !== "Annulé" && canCancel && <Btn onClick={() => openCancel(s)} variant="danger" size="sm" T={T}><span className="whitespace-nowrap">Annuler</span></Btn>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {facts.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-sm" style={{color:T.textMuted}}>Aucune facture ne correspond aux filtres</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Liste des devis */}
      {tab === "devis" && (
        <div className="rounded-2xl overflow-hidden" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{minWidth:860}}>
              <thead><tr style={{background:T.tableHead}}>{["N°", "Date", "Valable jusqu'au", "Client", "Total", "Statut", "Actions"].map(h => <th key={h} className="px-3 py-2.5 text-left text-xs uppercase tracking-wider" style={{color:T.textMuted}}>{h}</th>)}</tr></thead>
              <tbody>
                {devs.map(d => {
                  const st = devisState(d); const convertible = (st === "En attente" || st === "Expiré") && write;
                  return (
                    <tr key={d.id} className="border-t" style={{borderColor:T.cardBorder}}>
                      <td className="px-3 py-2.5 text-xs font-bold whitespace-nowrap" style={{color:T.text}}>N° {invNum(d.id)}</td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{color:T.textMuted}}>{d.date}</td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{color:st==="Expiré"?"#ef4444":T.textMuted}}>{d.valid_until || "—"}</td>
                      <td className="px-3 py-2.5 text-xs" style={{color:T.text}}>{d.client}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap" style={{color:T.accent}}>{fmtGNF(d.total)}</td>
                      <td className="px-3 py-2.5"><StateBadge state={st}/></td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1.5 flex-wrap">
                          <Btn onClick={() => setDevisDetailId(d.id)} variant="ghost" size="sm" T={T}><Icon name="eye" size={13}/></Btn>
                          <Btn onClick={() => printDevisDoc({ ...d, num: d.id }, shopName)} variant="ghost" size="sm" T={T}><Icon name="print" size={13}/></Btn>
                          {convertible && <Btn onClick={() => onConvertDevis(d)} variant="success" size="sm" T={T}><span className="whitespace-nowrap"><Icon name="arrow" size={14}/> Convertir en facture</span></Btn>}
                          {convertible && <Btn onClick={() => setDevisStatus(d, "Refusé")} variant="ghost" size="sm" T={T}><span className="whitespace-nowrap">Refusé</span></Btn>}
                          {canCancel && <Btn onClick={() => deleteDevis(d)} variant="danger" size="sm" T={T}><Icon name="trash" size={13}/></Btn>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {devs.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-sm" style={{color:T.textMuted}}>Aucun devis ne correspond aux filtres</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Détail facture */}
      {detail && (
        <Modal title={`Facture N° ${invNum(detail.id)}`} onClose={() => setDetailId(null)} T={T} wide>
          {(() => {
            const st = saleState(detail); const pays = paymentsOf(detail.id); const ini = initialPaid(detail);
            const open = (st === "Partiel" || st === "Impayé") && (+detail.remaining || 0) > 0;
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div><p className="font-semibold text-sm" style={{color:T.text}}>{detail.client}</p><p className="text-xs" style={{color:T.textMuted}}>{detail.date} · {detail.payment} · Vendeur : {detail.seller_name || "—"}</p></div>
                  <StateBadge state={st}/>
                </div>
                {(detail.due_date || detail.delivery_date || detail.note) && (
                  <div className="rounded-xl px-3 py-2 text-xs space-y-0.5" style={{background:T.rowHover,color:T.text}}>
                    {detail.due_date && <p><Icon name="calendar" size={14}/> Échéance de paiement : <b style={{color:isOverdue(detail)?"#ef4444":T.text}}>{detail.due_date}{isOverdue(detail) ? " (en retard)" : ""}</b></p>}
                    {detail.delivery_date && <p><Icon name="delivery" size={14}/> Livraison prévue : <b>{detail.delivery_date}</b></p>}
                    {detail.note && <p><Icon name="clipboard" size={14}/> {detail.note}</p>}
                  </div>
                )}
                {st === "Annulé" && <div className="rounded-xl px-3 py-2 text-xs" style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)",color:"#ef4444"}}><Icon name="ban" size={14}/> Annulée le {(detail.cancelled_at || "").slice(0, 10) || "—"} par {detail.cancelled_by || "—"}. Motif : {detail.cancel_reason || "—"}</div>}
                <div className="rounded-xl overflow-hidden" style={{border:`1px solid ${T.cardBorder}`}}>
                  {(detail.items || []).map((it, i) => (
                    <div key={i} className="flex justify-between gap-2 px-3 py-2 text-xs border-b last:border-b-0" style={{borderColor:T.cardBorder,color:T.text}}>
                      <span className="flex-1">{it.product}</span><span style={{color:T.textMuted}}>{it.qty} × {fmtGNF(it.price)}</span><span className="font-bold w-28 text-right">{fmtGNF(it.price * it.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between font-black"><span style={{color:T.text}}>Total</span><span style={{color:T.accent}}>{fmtGNF(detail.total)}</span></div>
                  <div className="flex justify-between text-xs"><span style={{color:T.textMuted}}>Déjà payé</span><span className="font-bold" style={{color:"#22c55e"}}>{fmtGNF(detail.paid)}</span></div>
                  {(+detail.returned || 0) > 0 && <div className="flex justify-between text-xs"><span style={{color:T.textMuted}}>Produits retournés</span><span className="font-bold" style={{color:"#a855f7"}}>−{fmtGNF(detail.returned)}</span></div>}
                  {(+detail.remaining || 0) > 0 && st !== "Annulé" && <div className="flex justify-between text-xs"><span style={{color:T.textMuted}}>Reste à payer</span><span className="font-bold" style={{color:"#f59e0b"}}>{fmtGNF(detail.remaining)}</span></div>}
                </div>
                <div>
                  <p className="text-xs font-bold mb-1.5" style={{color:T.textMuted}}>HISTORIQUE DES PAIEMENTS</p>
                  <div className="space-y-1">
                    {ini > 0 && <div className="flex justify-between text-xs px-3 py-1.5 rounded-lg" style={{background:T.rowHover,color:T.text}}><span>{detail.date} · {detail.payment} · à la vente</span><b style={{color:"#22c55e"}}>{fmtGNF(ini)}</b></div>}
                    {pays.map(p => <div key={p.id} className="flex justify-between gap-2 text-xs px-3 py-1.5 rounded-lg" style={{background:T.rowHover,color:T.text}}><span>{p.date} · {p.method}{p.received_by ? ` · ${p.received_by}` : ""}{p.note ? ` · ${p.note}` : ""}</span><b style={{color:"#22c55e"}}>{fmtGNF(p.amount)}</b></div>)}
                    {ini <= 0 && pays.length === 0 && <p className="text-xs" style={{color:T.textMuted}}>Aucun paiement enregistré</p>}
                  </div>
                </div>
                {returnsOf(detail.id).length > 0 && (
                  <div>
                    <p className="text-xs font-bold mb-1.5" style={{color:T.textMuted}}>RETOURS DE PRODUITS</p>
                    <div className="space-y-1">
                      {returnsOf(detail.id).map(r => (
                        <div key={r.id} className="text-xs px-3 py-1.5 rounded-lg" style={{background:T.rowHover,color:T.text}}>
                          <div className="flex justify-between gap-2"><span>{r.date} · {r.created_by || "—"} · {r.reason}</span><b style={{color:"#a855f7"}}>−{fmtGNF(r.amount)}</b></div>
                          <p style={{color:T.textMuted}}>{(r.items || []).map(i => `${i.qty} × ${i.product}${i.condition === "Abîmé" ? " (abîmé)" : ""}`).join(", ")}{+r.debt_reduction > 0 ? ` · dette −${fmtGNF(r.debt_reduction)}` : ""}{+r.refund > 0 ? ` · remboursé ${fmtGNF(r.refund)} (${r.refund_method})` : ""}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap justify-end pt-1">
                  <Btn onClick={() => setDetailId(null)} variant="ghost" T={T}>Fermer</Btn>
                  {canReturn(detail) && <Btn onClick={() => openReturn(detail)} variant="ghost" T={T}><Icon name="undo" size={13}/> Retour de produits</Btn>}
                  <Btn onClick={() => printInvoiceDoc(detail, shopName)} variant="ghost" T={T}><span className="flex items-center gap-1"><Icon name="print" size={14}/> Imprimer</span></Btn>
                  {open && write && <Btn onClick={() => openPay(detail)} variant="success" T={T}><Icon name="cash" size={14}/> Encaisser le reste</Btn>}
                  {st !== "Annulé" && canCancel && <Btn onClick={() => openCancel(detail)} variant="danger" T={T}>Annuler la facture</Btn>}
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Encaisser le reste */}
      {paySale && (
        <Modal title={`Encaisser — Facture N° ${invNum(paySale.id)}`} onClose={() => setPayId(null)} T={T}>
          <ErrBox msg={errMsg}/>
          <div className="space-y-3">
            <div className="rounded-xl px-3 py-2 text-xs flex justify-between" style={{background:T.rowHover,color:T.text}}><span>{paySale.client} · Total {fmtGNF(paySale.total)}</span><b style={{color:"#f59e0b"}}>Reste : {fmtGNF(paySale.remaining)}</b></div>
            <Field label="Montant encaissé (GNF)" type="number" value={payForm.amount} onChange={v => setPayForm(f => ({ ...f, amount: v }))} T={T}/>
            <div className="flex gap-2"><Btn onClick={() => setPayForm(f => ({ ...f, amount: String(+paySale.remaining || 0) }))} variant="ghost" size="sm" T={T}>Solder la totalité</Btn></div>
            <Field label="Mode de paiement" value={payForm.method} options={["Espèces", "Mobile Money", "Virement", "Carte"]} onChange={v => setPayForm(f => ({ ...f, method: v }))} T={T}/>
            <Field label="Note (facultatif)" value={payForm.note} onChange={v => setPayForm(f => ({ ...f, note: v }))} T={T}/>
            {(+payForm.amount || 0) > 0 && (+payForm.amount || 0) < (+paySale.remaining || 0) && <p className="text-xs" style={{color:T.textMuted}}>Après ce paiement, il restera {fmtGNF((+paySale.remaining || 0) - (+payForm.amount || 0))} à encaisser.</p>}
          </div>
          <div className="flex justify-end gap-3 mt-4"><Btn onClick={() => setPayId(null)} variant="ghost" T={T}>Annuler</Btn><Btn onClick={doPay} variant="success" T={T} disabled={busy}>{busy ? "Enregistrement..." : "Valider l'encaissement"}</Btn></div>
        </Modal>
      )}

      {/* Retour de produits */}
      {retSale && (
        <Modal title={`Retour — Facture N° ${invNum(retSale.id)}`} onClose={() => setRetId(null)} T={T} wide>
          <ErrBox msg={errMsg}/>
          <div className="space-y-3">
            <div className="rounded-xl px-3 py-2 text-xs flex justify-between flex-wrap gap-2" style={{background:T.rowHover,color:T.text}}>
              <span>{retSale.client} · Total {fmtGNF(retSale.total)}{(+retSale.returned || 0) > 0 ? ` (déjà retourné ${fmtGNF(retSale.returned)})` : ""}</span>
              <span>Payé <b style={{color:"#22c55e"}}>{fmtGNF(retSale.paid)}</b> · Reste <b style={{color:"#f59e0b"}}>{fmtGNF(retSale.remaining)}</b>{retSale.due_date ? ` · Éch. ${retSale.due_date}` : ""}</span>
            </div>
            <p className="text-xs" style={{color:T.textMuted}}>Saisissez la quantité <b>non utilisée</b> que le client rapporte. Le prix retenu est celui de la facture (remise comprise).</p>
            <div className="rounded-xl overflow-hidden" style={{border:`1px solid ${T.cardBorder}`}}>
              {retPlan.map(l => (
                <div key={l.idx} className="flex items-center gap-2 px-3 py-2 text-xs border-b last:border-b-0 flex-wrap" style={{borderColor:T.cardBorder,color:T.text,opacity:l.avail > 0 ? 1 : 0.45}}>
                  <div className="flex-1 min-w-[140px]"><p className="font-semibold">{l.it.product}</p><p style={{color:T.textMuted}}>Acheté {l.it.qty} · retournable {l.avail} · {fmtGNF(l.unit)} l'unité</p></div>
                  <input type="number" min="0" max={l.avail} disabled={l.avail <= 0} value={retQty[l.idx] ?? ""} placeholder="0" onChange={e => setRetQty(q => ({ ...q, [l.idx]: e.target.value }))} className="w-20 px-2 py-1.5 rounded-lg outline-none text-right" style={{background:T.input,border:`1px solid ${T.inputBorder}`,color:T.text}}/>
                  <select value={l.cond} disabled={l.avail <= 0} onChange={e => setRetCond(c => ({ ...c, [l.idx]: e.target.value }))} className="themed-select px-2 py-1.5 rounded-lg text-xs outline-none" style={{background:T.input,border:`1px solid ${T.inputBorder}`,color:T.text}}>
                    <option value="Revendable">Revendable (retour en stock)</option><option value="Abîmé">Abîmé (pas de remise en stock)</option>
                  </select>
                  <b className="w-24 text-right">{fmtGNF(l.q * l.unit)}</b>
                </div>
              ))}
            </div>
            <div className="rounded-xl px-3 py-2 text-xs space-y-1" style={{background:T.rowHover,color:T.text}}>
              <div className="flex justify-between font-black text-sm"><span>Valeur des produits retournés</span><span style={{color:"#a855f7"}}>{fmtGNF(retValue)}</span></div>
              {retDebt > 0 && <p><Icon name="trend" size={14}/> Réduit le reste à payer de <b>{fmtGNF(retDebt)}</b> → le client ne devra plus que <b style={{color:"#f59e0b"}}>{fmtGNF((+retSale.remaining || 0) - retDebt)}</b>{retSale.due_date ? ` à l'échéance du ${retSale.due_date}` : ""}.</p>}
              {retRefund > 0 && <p><Icon name="cash" size={14}/> À rembourser au client : <b style={{color:"#f59e0b"}}>{fmtGNF(retRefund)}</b></p>}
            </div>
            {retRefund > 0 && <Field label="Remboursement par" value={retMethod} options={["Espèces", "Mobile Money", "Virement"]} onChange={setRetMethod} T={T}/>}
            <Field label="Motif du retour" value={retReason} onChange={setRetReason} required T={T} placeholder="Ex : produit non utilisé, surplus de chantier..."/>
          </div>
          <div className="flex justify-end gap-3 mt-4 flex-wrap">
            <Btn onClick={() => setRetId(null)} variant="ghost" T={T}>Annuler</Btn>
            {retDebt > 0 && (+retSale.remaining || 0) - retDebt > 0 && <Btn onClick={() => doReturn(true)} variant="ghost" T={T} disabled={busy || retValue <= 0}>Valider et encaisser le solde</Btn>}
            <Btn onClick={() => doReturn(false)} variant="success" T={T} disabled={busy || retValue <= 0}>{busy ? "Enregistrement..." : "Valider le retour"}</Btn>
          </div>
        </Modal>
      )}

      {/* Annulation */}
      {cancelSale && (
        <Modal title={`Annuler la facture N° ${invNum(cancelSale.id)}`} onClose={() => setCancelId(null)} T={T}>
          <ErrBox msg={errMsg}/>
          <div className="space-y-3">
            <p className="text-xs" style={{color:T.textMuted}}>Cette action est définitive. La facture sera conservée avec le statut « Annulé » et ne comptera plus dans le chiffre d'affaires.</p>
            <div className="rounded-xl p-3 space-y-1" style={{background:T.rowHover}}>
              <p className="text-xs font-bold" style={{color:T.textMuted}}>RETOUR EN STOCK</p>
              {cancelPlan.map(({ it, prod }, i) => prod
                ? <p key={i} className="text-xs" style={{color:T.text}}><Icon name="check" size={14}/> {it.product} : <b>+{it.qty}</b> ({prod.qty} → {(+prod.qty || 0) + (+it.qty || 0)})</p>
                : <p key={i} className="text-xs" style={{color:"#f59e0b"}}><Icon name="warning" size={14}/> {it.product} : produit introuvable, stock non restitué (à corriger dans l'onglet Stock)</p>)}
            </div>
            {clients.some(c => c.name === cancelSale.client) && <p className="text-xs" style={{color:T.text}}><Icon name="user" size={14}/> Client « {cancelSale.client} » : achats cumulés −{fmtGNF(saleNet(cancelSale))}{(+cancelSale.remaining || 0) > 0 ? `, dette −${fmtGNF(cancelSale.remaining)}` : ""}.</p>}
            {(+cancelSale.paid || 0) > 0 && <p className="text-xs font-semibold" style={{color:"#f59e0b"}}><Icon name="cash" size={14}/> Montant déjà encaissé à rembourser au client : {fmtGNF(cancelSale.paid)}</p>}
            <Field label="Motif de l'annulation" value={cancelReason} onChange={setCancelReason} required T={T} placeholder="Ex : erreur de saisie, retour client..."/>
            <div className="flex gap-1.5 flex-wrap">{["Erreur de saisie", "Retour client", "Produit défectueux", "Client a annulé"].map(r => <button key={r} onClick={() => setCancelReason(r)} className="text-xs px-2 py-1 rounded-lg" style={{background:T.input,color:T.textMuted,border:`1px solid ${T.inputBorder}`}}>{r}</button>)}</div>
          </div>
          <div className="flex justify-end gap-3 mt-4"><Btn onClick={() => setCancelId(null)} variant="ghost" T={T}>Retour</Btn><Btn onClick={doCancel} variant="danger" T={T} disabled={busy}>{busy ? "Annulation..." : "Confirmer l'annulation"}</Btn></div>
        </Modal>
      )}

      {/* Détail devis */}
      {devisDetail && (() => {
        const st = devisState(devisDetail); const convertible = (st === "En attente" || st === "Expiré") && write;
        return (
          <Modal title={`Devis N° ${invNum(devisDetail.id)}`} onClose={() => setDevisDetailId(null)} T={T} wide>
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div><p className="font-semibold text-sm" style={{color:T.text}}>{devisDetail.client}</p><p className="text-xs" style={{color:T.textMuted}}>{devisDetail.date} · valable jusqu'au {devisDetail.valid_until || "—"} · établi par {devisDetail.seller_name || "—"}</p></div>
                <StateBadge state={st}/>
              </div>
              <div className="rounded-xl overflow-hidden" style={{border:`1px solid ${T.cardBorder}`}}>
                {(devisDetail.items || []).map((it, i) => (
                  <div key={i} className="flex justify-between gap-2 px-3 py-2 text-xs border-b last:border-b-0" style={{borderColor:T.cardBorder,color:T.text}}>
                    <span className="flex-1">{it.product}</span><span style={{color:T.textMuted}}>{it.qty} × {fmtGNF(it.price)}</span><span className="font-bold w-28 text-right">{fmtGNF(it.price * it.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-black text-sm"><span style={{color:T.text}}>Total estimé{+devisDetail.discount > 0 ? ` (remise ${devisDetail.discount}%)` : ""}</span><span style={{color:T.accent}}>{fmtGNF(devisDetail.total)}</span></div>
              {devisDetail.sale_id && <p className="text-xs" style={{color:"#22c55e"}}><Icon name="check" size={14}/> Converti en facture N° {invNum(devisDetail.sale_id)}</p>}
              <div className="flex gap-2 flex-wrap justify-end">
                <Btn onClick={() => setDevisDetailId(null)} variant="ghost" T={T}>Fermer</Btn>
                <Btn onClick={() => printDevisDoc({ ...devisDetail, num: devisDetail.id }, shopName)} variant="ghost" T={T}><span className="flex items-center gap-1"><Icon name="print" size={14}/> Imprimer</span></Btn>
                {convertible && <Btn onClick={() => onConvertDevis(devisDetail)} variant="success" T={T}><Icon name="arrow" size={14}/> Convertir en facture</Btn>}
                {convertible && <Btn onClick={() => { setDevisStatus(devisDetail, "Refusé"); }} variant="ghost" T={T}>Marquer refusé</Btn>}
              </div>
            </div>
          </Modal>
        );
      })()}

      {showDevisForm && <DevisFormModal clients={clients} products={products} T={T} user={user} onClose={() => setShowDevisForm(false)} onSaved={(d) => { setDevisList(prev => [d, ...prev]); setShowDevisForm(false); setDevisDetailId(d.id); setOkMsg(`Devis N° ${invNum(d.id)} enregistré.`); }}/>}
    </div>
  );
};

// Bon de livraison : même design que la facture, sans prix ni montants (sauf le reste à encaisser)
const printDeliveryDoc = (d, sale, driver, sName) => {
  const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lignes = ((sale && sale.items) || []).map((it, i) => `
    <tr style="background:${i % 2 === 0 ? "#fafafa" : "#fff"}">
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#555;width:40px;">${i + 1}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a1a1a;">${esc(it.product)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:14px;font-weight:700;color:#1a1a1a;">${esc(it.qty)}</td>
    </tr>`).join("");
  const done = d.status === "Livré";
  const rem = +sale?.remaining || 0;
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<title>Bon de livraison N°${String(d.id).padStart(4, "0")} — ${esc(sName)}</title>
<style>
  @page{margin:16mm 14mm}
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a1a;font-size:13px}
  .wrap{max-width:720px;margin:0 auto}
  .top{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:3px solid #f97316;margin-bottom:22px}
  .brand-name{font-size:26px;font-weight:900;color:#f97316;letter-spacing:1px;margin-bottom:2px}
  .brand-sub{font-size:11px;color:#999}
  .inv-block{text-align:right}
  .inv-num{font-size:20px;font-weight:900;color:#111;margin-bottom:3px}
  .inv-meta{font-size:11px;color:#888;line-height:1.8}
  .badge{display:inline-block;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700;background:${done ? "#dcfce7" : "#fef3c7"};color:${done ? "#15803d" : "#b45309"};margin-top:6px}
  .parties{display:flex;gap:16px;margin-bottom:22px}
  .pbox{flex:1;border:1px solid #eee;border-radius:10px;padding:13px 15px;background:#fafafa}
  .plabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#f97316;margin-bottom:5px}
  .pname{font-size:14px;font-weight:800;color:#111;margin-bottom:2px}
  .psub{font-size:11px;color:#777;line-height:1.6}
  table{width:100%;border-collapse:collapse;margin-bottom:18px;border:1px solid #eee}
  thead tr{background:#f97316}
  thead th{padding:10px 14px;color:#fff;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;text-align:left}
  .cash{border:1px solid #fcd9b6;background:#fff8f3;border-radius:10px;padding:11px 14px;display:flex;justify-content:space-between;font-size:14px;font-weight:900;color:#f97316;margin-bottom:22px}
  .note{font-size:11px;color:#777;margin-bottom:22px}
  .foot{border-top:1px solid #eee;padding-top:16px;display:flex;justify-content:space-between;gap:30px}
  .sig{flex:1;text-align:center;font-size:11px;color:#777}
  .sig-line{border-top:1px solid #ccc;margin-top:48px;padding-top:4px}
  .legal{font-size:10px;color:#aaa;margin-top:14px;text-align:center}
</style></head><body><div class="wrap">
  <div class="top">
    <div><div class="brand-name">${esc(sName)}</div><div class="brand-sub">Vente de matériaux de construction · Conakry, Guinée</div></div>
    <div class="inv-block">
      <div class="inv-num">BON DE LIVRAISON N° ${String(d.id).padStart(4, "0")}</div>
      <div class="inv-meta">Facture réf. : N° ${String(d.sale_id).padStart(4, "0")}<br/>Date : ${esc((d.created_at || sale?.date || "").slice(0, 10))}${d.planned_date ? `<br/>Livraison prévue : ${esc(d.planned_date)}` : ""}</div>
      <span class="badge">${done ? "Livré" : "À livrer"}</span>
    </div>
  </div>
  <div class="parties">
    <div class="pbox"><div class="plabel">Destinataire</div><div class="pname">${esc(d.client)}</div><div class="psub">${d.phone ? `Tél : ${esc(d.phone)}<br/>` : ""}${d.address ? `Adresse : ${esc(d.address)}` : "Adresse non renseignée"}</div></div>
    <div class="pbox"><div class="plabel">Livreur</div><div class="pname">${esc(d.driver_name || driver?.name || "À assigner")}</div><div class="psub">${driver?.phone ? `Tél : ${esc(driver.phone)}<br/>` : ""}${driver?.vehicle ? `${esc(driver.vehicle)}${driver.plate ? ` · ${esc(driver.plate)}` : ""}` : ""}</div></div>
  </div>
  <table>
    <thead><tr><th>N°</th><th>Désignation</th><th style="text-align:center">Quantité</th></tr></thead>
    <tbody>${lignes}</tbody>
  </table>
  ${rem > 0 ? `<div class="cash"><span>Reste à encaisser à la livraison</span><span>${fmtGNF(rem)}</span></div>` : ""}
  ${d.note ? `<div class="note">Note : ${esc(d.note)}</div>` : ""}
  <div class="foot">
    <div class="sig"><div class="sig-line">Signature du livreur</div></div>
    <div class="sig"><div class="sig-line">Signature du client (nom &amp; date)</div></div>
  </div>
  <div class="legal">Le client reconnaît avoir reçu les marchandises ci-dessus en bon état.</div>
</div></body></html>`;
  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) { alert("Autorisez les fenêtres pop-up pour imprimer le bon de livraison."); return; }
  w.document.open(); w.document.write(html); w.document.close();
  w.focus(); setTimeout(() => w.print(), 450);
};

// ─── LIVRAISONS ───────────────────────────────────────────────────────────────
const VEHICLES = ["Moto", "Voiture", "Camionnette", "Camion", "Tricycle", "Vélo", "Autre"];
const DeliveriesPage = ({ deliveries, setDeliveries, sales, missing, shopSettings, T, userRole, user }) => {
  const write = canWrite(userRole, "deliveries");
  const del = canDelete(userRole, "deliveries");
  const shopName = shopSettings?.shop_name || "MOGESTOCK";
  const [statusF, setStatusF] = useState("Tous");
  const [q, setQ] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState("deliveries");
  const [drivers, setDrivers] = useState([]);
  const [driversMissing, setDriversMissing] = useState(false);
  const [driverForm, setDriverForm] = useState(null); // null = fermé ; { id?, name, phone, vehicle, plate, note }
  const [savingDriver, setSavingDriver] = useState(false);
  useEffect(() => {
    (async () => {
      const r = await supabase.from("drivers").select("*").order("name");
      if (r.error) setDriversMissing(true); else { setDriversMissing(false); setDrivers(r.data || []); }
    })();
  }, []);
  const driverOf = (d) => drivers.find(x => x.id === d.driver_id) || null;
  const assignDriver = async (d, val) => {
    const dr = drivers.find(x => String(x.id) === String(val));
    const patch = { driver_id: dr ? dr.id : null, driver_name: dr ? dr.name : null };
    const { error } = await supabase.from("deliveries").update(patch).eq("id", d.id);
    if (error) { setErrMsg("Erreur : " + error.message + " (exécutez livreurs.sql ?)"); return; }
    setErrMsg(""); setDeliveries(prev => prev.map(x => x.id === d.id ? { ...x, ...patch } : x));
  };
  const saveDriver = async () => {
    const f = driverForm; if (!f) return;
    if (!f.name.trim()) { setErrMsg("Le nom du livreur est obligatoire."); return; }
    setSavingDriver(true); setErrMsg("");
    const item = { name: f.name.trim(), phone: f.phone.trim() || null, vehicle: f.vehicle || null, plate: f.plate.trim() || null, note: f.note.trim() || null };
    if (f.id) {
      const { error } = await supabase.from("drivers").update(item).eq("id", f.id);
      if (error) { setErrMsg("Erreur : " + error.message); setSavingDriver(false); return; }
      setDrivers(prev => prev.map(x => x.id === f.id ? { ...x, ...item } : x).sort((a, b) => a.name.localeCompare(b.name)));
      if (drivers.find(x => x.id === f.id)?.name !== item.name) {
        await supabase.from("deliveries").update({ driver_name: item.name }).eq("driver_id", f.id);
        setDeliveries(prev => prev.map(x => x.driver_id === f.id ? { ...x, driver_name: item.name } : x));
      }
    } else {
      const { data, error } = await supabase.from("drivers").insert([item]).select();
      if (error || !data?.[0]) { setErrMsg("Erreur : " + (error?.message || "création impossible") + " (exécutez livreurs.sql ?)"); setSavingDriver(false); return; }
      setDrivers(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setSavingDriver(false); setDriverForm(null);
    setOkMsg(`Livreur « ${item.name} » enregistré.`);
  };
  const deleteDriver = async (dr) => {
    const nPend = deliveries.filter(x => x.driver_id === dr.id && x.status === "En attente").length;
    if (!window.confirm(`Supprimer le livreur « ${dr.name} » ?${nPend ? `\n${nPend} livraison(s) en attente deviendront « non assignées ».` : ""}\nLes livraisons déjà effectuées gardent son nom.`)) return;
    await supabase.from("deliveries").update({ driver_id: null, driver_name: null }).eq("driver_id", dr.id).eq("status", "En attente");
    const { error } = await supabase.from("drivers").delete().eq("id", dr.id);
    if (error) { setErrMsg("Erreur : " + error.message); return; }
    setDrivers(prev => prev.filter(x => x.id !== dr.id));
    setDeliveries(prev => prev.map(x => x.driver_id === dr.id ? { ...x, driver_id: null, driver_name: x.status === "En attente" ? null : x.driver_name } : x));
    setOkMsg(`Livreur « ${dr.name} » supprimé.`);
  };
  const [errMsg, setErrMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const saleOf = (d) => sales.find(x => x.id === d.sale_id);
  const stOf = (d) => saleOf(d)?.status === "Annulé" ? "Annulée" : d.status;
  const late = (d) => stOf(d) === "En attente" && !!d.planned_date && d.planned_date < localDateStr();
  const rows = deliveries.filter(d => {
    if (statusF !== "Tous" && stOf(d) !== statusF) return false;
    const ql = normText(q).trim();
    return !ql || normText(d.client).includes(ql) || normText(d.address).includes(ql) || invNum(d.sale_id).includes(ql);
  });
  const nPending = deliveries.filter(d => stOf(d) === "En attente").length;
  const nDone = deliveries.filter(d => stOf(d) === "Livré").length;
  const nLate = deliveries.filter(late).length;
  const confirm = async (d) => {
    if (!window.confirm(`Confirmer la livraison de la facture N° ${invNum(d.sale_id)} (${d.client}) ?`)) return;
    setBusyId(d.id); setErrMsg("");
    const patch = { status: "Livré", delivered_at: new Date().toISOString(), delivered_by: user?.name || "Inconnu" };
    const { error } = await supabase.from("deliveries").update(patch).eq("id", d.id);
    setBusyId(null);
    if (error) { setErrMsg("Erreur : " + error.message); return; }
    setDeliveries(prev => prev.map(x => x.id === d.id ? { ...x, ...patch } : x));
    setOkMsg(`Livraison de la facture N° ${invNum(d.sale_id)} confirmée.`);
  };
  const detail = deliveries.find(x => x.id === detailId) || null;
  const dSale = detail ? saleOf(detail) : null;
  const ctl = { background: T.input, border: `1px solid ${T.inputBorder}`, color: T.text };
  return (
    <div className="space-y-5">
      <style>{`select.themed-select option{background-color:${T.optionBg||"#1e1e1e"} !important;color:${T.optionColor||"#e5e7eb"} !important;}`}</style>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-black" style={{color:T.text}}>Livraisons</h1>
        <div className="flex items-center gap-2">
          {[["deliveries", `Livraisons (${deliveries.length})`], ["drivers", `Livreurs (${drivers.length})`]].map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id); setErrMsg(""); }} className="px-4 py-2 rounded-xl text-sm font-semibold transition-all" style={{background:tab===id?`${T.accent}25`:T.input,color:tab===id?T.accent:T.textMuted,border:`1px solid ${tab===id?T.accent+"55":T.inputBorder}`}}>{label}</button>
          ))}
          {tab === "drivers" && write && <Btn onClick={() => { setErrMsg(""); setDriverForm({ name: "", phone: "", vehicle: "Moto", plate: "", note: "" }); }} T={T}><span className="flex items-center gap-1"><Icon name="plus" size={14}/> Nouveau livreur</span></Btn>}
        </div>
      </div>
      {driversMissing && <div className="rounded-xl px-4 py-2 text-xs" style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",color:"#f59e0b"}}><Icon name="warning" size={14}/> Table « drivers » introuvable : exécutez livreurs.sql dans Supabase (SQL Editor).</div>}
      {missing && <div className="rounded-xl px-4 py-2 text-xs" style={{background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.3)",color:"#f59e0b"}}><Icon name="warning" size={14}/> Table « deliveries » introuvable : exécutez livraisons.sql dans Supabase (SQL Editor).</div>}
      {okMsg && <div className="rounded-xl px-4 py-2 text-sm flex justify-between gap-3" style={{background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",color:"#22c55e"}}><span>{okMsg}</span><button onClick={() => setOkMsg("")}><Icon name="close" size={14}/></button></div>}
      {!driverForm && <ErrBox msg={errMsg}/>}
      {tab === "deliveries" && <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[["En attente", nPending + (nLate ? ` (dont ${nLate} en retard)` : ""), "#60a5fa"], ["Livrées", nDone, "#22c55e"], ["Total", deliveries.length, T.accent]].map(([l, v, c]) => (
          <div key={l} className="rounded-2xl p-4" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}><p className="text-xs" style={{color:T.textMuted}}>{l}</p><p className="text-lg font-black mt-1" style={{color:c}}>{v}</p></div>
        ))}
      </div>
      <div className="rounded-2xl p-3 flex gap-2 flex-wrap" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="N° facture, client ou adresse..." className="flex-1 min-w-[180px] px-3 py-2 rounded-xl text-xs outline-none" style={ctl}/>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} className="themed-select px-3 py-2 rounded-xl text-xs outline-none" style={ctl}>
          {["Tous", "En attente", "Livré", "Annulée"].map(o => <option key={o} value={o}>{o === "Tous" ? "Tous les statuts" : o}</option>)}
        </select>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{minWidth:1100}}>
            <thead><tr style={{background:T.tableHead}}>{["", "Facture", "Date", "Client", "Adresse", "Livreur", "Prévue le", "Reste à payer", "Statut", "Actions"].map(h => <th key={h} className="px-3 py-2.5 text-left text-xs uppercase tracking-wider" style={{color:T.textMuted}}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map(d => {
                const st = stOf(d), sale = saleOf(d), rem = +sale?.remaining || 0;
                return (
                  <tr key={d.id} className="border-t" style={{borderColor:T.cardBorder,opacity:st === "Annulée" ? 0.55 : 1}}>
                    <td className="px-2 py-2.5"><Btn onClick={() => printDeliveryDoc(d, sale, driverOf(d), shopName)} variant="ghost" size="sm" T={T}><Icon name="print" size={13}/></Btn></td>
                    <td className="px-3 py-2.5 text-xs font-bold whitespace-nowrap" style={{color:T.text}}>N° {invNum(d.sale_id)}</td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{color:T.textMuted}}>{(d.created_at || sale?.date || "").slice(0, 10)}</td>
                    <td className="px-3 py-2.5 text-xs" style={{color:T.text}}>{d.client}{d.phone && <span className="block" style={{color:T.textMuted}}>{d.phone}</span>}</td>
                    <td className="px-3 py-2.5 text-xs" style={{color:T.text}}>{d.address || "—"}</td>
                    <td className="px-3 py-2.5 text-xs">{write && st === "En attente"
                      ? <select value={d.driver_id || ""} onChange={e => assignDriver(d, e.target.value)} className="themed-select px-2 py-1 rounded-lg text-xs outline-none" style={ctl}><option value="">— Non assigné —</option>{drivers.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
                      : <span style={{color:T.text}}>{d.driver_name || "—"}</span>}</td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{color:late(d) ? "#ef4444" : T.textMuted}}>{d.planned_date || "—"}{late(d) && " · en retard"}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap" style={{color:rem > 0 ? "#f59e0b" : T.textMuted}}>{rem > 0 ? fmtGNF(rem) : "—"}</td>
                    <td className="px-3 py-2.5"><StateBadge state={st}/></td>
                    <td className="px-3 py-2.5"><div className="flex gap-1.5 flex-wrap">
                      <Btn onClick={() => setDetailId(d.id)} variant="ghost" size="sm" T={T}><Icon name="eye" size={13}/></Btn>
                      {st === "En attente" && write && <Btn onClick={() => confirm(d)} variant="success" size="sm" T={T} disabled={busyId === d.id}><span className="whitespace-nowrap"><Icon name="check" size={14}/> Confirmer</span></Btn>}
                    </div></td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={10} className="text-center py-8 text-sm" style={{color:T.textMuted}}>Aucune livraison. Cochez « À livrer » lors d'une vente dans la caisse.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      </div>}

      {tab === "drivers" && (
        <div className="rounded-2xl overflow-hidden" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{minWidth:760}}>
              <thead><tr style={{background:T.tableHead}}>{["Nom", "Téléphone", "Véhicule", "Immatriculation", "En attente", "Livrées", "Actions"].map(h => <th key={h} className="px-3 py-2.5 text-left text-xs uppercase tracking-wider" style={{color:T.textMuted}}>{h}</th>)}</tr></thead>
              <tbody>
                {drivers.map(dr => (
                  <tr key={dr.id} className="border-t" style={{borderColor:T.cardBorder}}>
                    <td className="px-3 py-2.5 text-xs font-bold" style={{color:T.text}}>{dr.name}{dr.note && <span className="block font-normal" style={{color:T.textMuted}}>{dr.note}</span>}</td>
                    <td className="px-3 py-2.5 text-xs" style={{color:T.text}}>{dr.phone || "—"}</td>
                    <td className="px-3 py-2.5 text-xs" style={{color:T.text}}>{dr.vehicle || "—"}</td>
                    <td className="px-3 py-2.5 text-xs" style={{color:T.text}}>{dr.plate || "—"}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold" style={{color:"#60a5fa"}}>{deliveries.filter(x => x.driver_id === dr.id && stOf(x) === "En attente").length}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold" style={{color:"#22c55e"}}>{deliveries.filter(x => x.driver_id === dr.id && x.status === "Livré").length}</td>
                    <td className="px-3 py-2.5">{write && <div className="flex gap-1.5">
                      <Btn onClick={() => { setErrMsg(""); setDriverForm({ id: dr.id, name: dr.name || "", phone: dr.phone || "", vehicle: dr.vehicle || "Moto", plate: dr.plate || "", note: dr.note || "" }); }} variant="ghost" size="sm" T={T}><Icon name="edit" size={13}/></Btn>
                      {del && <Btn onClick={() => deleteDriver(dr)} variant="danger" size="sm" T={T}><Icon name="trash" size={13}/></Btn>}
                    </div>}</td>
                  </tr>
                ))}
                {drivers.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-sm" style={{color:T.textMuted}}>Aucun livreur. Cliquez sur « Nouveau livreur » pour en ajouter.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {driverForm && (
        <Modal title={driverForm.id ? "Modifier le livreur" : "Nouveau livreur"} onClose={() => setDriverForm(null)} T={T}>
          <ErrBox msg={errMsg}/>
          <div className="space-y-3">
            <Field label="Nom complet" value={driverForm.name} onChange={v => setDriverForm(f => ({ ...f, name: v }))} required T={T}/>
            <Field label="Téléphone" value={driverForm.phone} onChange={v => setDriverForm(f => ({ ...f, phone: v }))} T={T}/>
            <Field label="Véhicule" value={driverForm.vehicle} options={VEHICLES} onChange={v => setDriverForm(f => ({ ...f, vehicle: v }))} T={T}/>
            <Field label="Immatriculation (facultatif)" value={driverForm.plate} onChange={v => setDriverForm(f => ({ ...f, plate: v }))} T={T}/>
            <Field label="Note (facultatif)" value={driverForm.note} onChange={v => setDriverForm(f => ({ ...f, note: v }))} T={T}/>
          </div>
          <div className="flex justify-end gap-3 mt-4"><Btn onClick={() => setDriverForm(null)} variant="ghost" T={T}>Annuler</Btn><Btn onClick={saveDriver} T={T} disabled={savingDriver}>{savingDriver ? "Enregistrement..." : "Enregistrer"}</Btn></div>
        </Modal>
      )}

      {detail && (
        <Modal title={`Livraison — Facture N° ${invNum(detail.sale_id)}`} onClose={() => setDetailId(null)} T={T}>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2"><div><p className="font-semibold text-sm" style={{color:T.text}}>{detail.client}</p><p className="text-xs" style={{color:T.textMuted}}>{detail.phone || "—"} · {detail.address || "Adresse non renseignée"}</p></div><StateBadge state={stOf(detail)}/></div>
            {detail.note && <p className="text-xs rounded-xl px-3 py-2" style={{background:T.rowHover,color:T.text}}><Icon name="clipboard" size={14}/> {detail.note}</p>}
            <p className="text-xs" style={{color:T.text}}><Icon name="user" size={14}/> Livreur : <b>{detail.driver_name || "non assigné"}</b>{driverOf(detail)?.phone ? ` · ${driverOf(detail).phone}` : ""}</p>
            {dSale && <div className="rounded-xl overflow-hidden" style={{border:`1px solid ${T.cardBorder}`}}>{(dSale.items || []).map((it, i) => <div key={i} className="flex justify-between gap-2 px-3 py-2 text-xs border-b last:border-b-0" style={{borderColor:T.cardBorder,color:T.text}}><span className="flex-1">{it.product}</span><span style={{color:T.textMuted}}>× {it.qty}</span></div>)}</div>}
            {dSale && (+dSale.remaining || 0) > 0 && <p className="text-xs font-semibold" style={{color:"#f59e0b"}}><Icon name="cash" size={14}/> Reste à encaisser : {fmtGNF(dSale.remaining)}</p>}
            <p className="text-xs" style={{color:T.textMuted}}>Créée par {detail.created_by || "—"}{detail.planned_date ? ` · prévue le ${detail.planned_date}` : ""}{detail.delivered_at ? ` · livrée le ${detail.delivered_at.slice(0, 10)} (${detail.delivered_by || "—"})` : ""}</p>
            <div className="flex justify-end gap-2">
              <Btn onClick={() => setDetailId(null)} variant="ghost" T={T}>Fermer</Btn>
              <Btn onClick={() => printDeliveryDoc(detail, dSale, driverOf(detail), shopName)} variant="ghost" T={T}><span className="flex items-center gap-1"><Icon name="print" size={14}/> Bon de livraison</span></Btn>
              {stOf(detail) === "En attente" && write && <Btn onClick={() => { confirm(detail); setDetailId(null); }} variant="success" T={T}><Icon name="check" size={14}/> Confirmer la livraison</Btn>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const ALL_NAV = [
  {id:"dashboard",label:"Tableau de bord",icon:"dashboard"},
  {id:"products",  label:"Produits",       icon:"products"},
  {id:"stock",     label:"Stock",          icon:"stock"},
  {id:"sales",     label:"Caisse / Ventes",icon:"sales"},
  {id:"billing",   label:"Facturation",    icon:"billing"},
  {id:"deliveries",label:"Livraison",      icon:"delivery"},
  {id:"clients",   label:"Clients",        icon:"clients"},
  {id:"suppliers", label:"Fournisseurs",   icon:"suppliers"},
  {id:"expenses",  label:"Dépenses",       icon:"expenses"},
  {id:"users",     label:"Utilisateurs",   icon:"users"},
  {id:"accounting",label:"Comptabilité",   icon:"accounting"},
  {id:"settings",  label:"Paramètres",     icon:"settings"},
];

const Sidebar = ({ active, setActive, user, onLogout, collapsed, T, shopSettings, badges = {} }) => {
  const nav = ALL_NAV.filter(item => canAccess(user, item.id));
  const shopName = shopSettings?.shop_name || "BOUMAYAH ET FILS";
  return (
    <aside className="flex flex-col h-full" style={{background:T.sidebar,borderRight:`1px solid ${T.headerBorder}`,width:collapsed?"64px":"220px",transition:"width 0.2s ease",flexShrink:0}}>
      <div className="px-4 py-5 border-b" style={{borderColor:T.headerBorder}}>
        {collapsed
          ? <ShopLogo url={shopSettings?.logo_url} size={32} accent={T.accent}/>
          : <div className="flex items-center gap-2">
              <ShopLogo url={shopSettings?.logo_url} size={32} accent={T.accent}/>
              <div><p className="font-black text-xs leading-tight" style={{color:"#ffffff"}}>{shopName.toUpperCase().slice(0,14)}</p><p className="text-xs font-medium" style={{color:"#22c55e"}}>Gestion</p></div>
            </div>
        }
      </div>
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto px-2">
        {nav.map(item=>(
          <button key={item.id} onClick={()=>setActive(item.id)} title={collapsed?item.label:""} className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left" style={{background:active===item.id?T.navActive:"transparent",color:active===item.id?T.accent:T.navText,borderLeft:active===item.id?`2px solid ${T.navActiveBorder}`:"2px solid transparent"}}>
            <span className="flex-shrink-0"><Icon name={item.icon} size={18}/></span>
            {!collapsed&&<span className="text-xs font-semibold truncate">{item.label}</span>}
            {badges[item.id]>0&&<span className={collapsed?"absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full text-white flex items-center justify-center font-bold":"ml-auto min-w-5 h-5 px-1.5 rounded-full text-white flex items-center justify-center font-bold"} style={{background:"#ef4444",fontSize:"10px"}}>{badges[item.id]}</span>}
          </button>
        ))}
      </nav>
      <div className="px-2 py-3 border-t" style={{borderColor:T.headerBorder}}>
        {!collapsed
          ? <div className="px-3 py-2 rounded-xl" style={{background:T.userCard}}>
              <p className="text-xs font-semibold truncate" style={{color:"#ffffff"}}>{user.name}</p>
              <RoleBadge role={user.role}/>
              <button onClick={onLogout} className="mt-2 flex items-center gap-1 text-xs hover:text-red-400 transition-colors" style={{color:T.textMuted}}><Icon name="logout" size={12}/> Déconnexion</button>
            </div>
          : <button onClick={onLogout} className="w-full flex items-center justify-center p-2 rounded-xl hover:text-red-400" style={{color:T.textMuted}}><Icon name="logout" size={16}/></button>
        }
      </div>
    </aside>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]           = useState(null);
  const [active, setActive]       = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [themeName, setThemeName] = useState(() => localStorage.getItem("bfy_theme") || "dark");
  const [devisPreload, setDevisPreload] = useState(null);
  const [products,  setProducts]  = useState([]);
  const [sales,     setSales]     = useState([]);
  const [clients,   setClients]   = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenses,  setExpenses]  = useState([]);
  const [shopSettings, setShopSettings] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [deliveriesMissing, setDeliveriesMissing] = useState(false);
  const [loading, setLoading]     = useState(true);

  const T = THEMES[themeName] || THEMES.dark;

  // Sauvegarder le thème dans localStorage
  useEffect(() => { localStorage.setItem("bfy_theme", themeName); }, [themeName]);

  // Si le rôle n'a pas accès à la page active → rediriger vers dashboard
  useEffect(() => {
    if (user && !canAccess(user, active)) setActive("dashboard");
  }, [user, active]);

  // Charger les données depuis Supabase
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      setLoading(true);
      const [p, s, c, sup, e, sets] = await Promise.all([
        supabase.from("products").select("*").order("id"),
        supabase.from("sales").select("*").order("id", { ascending: false }),
        supabase.from("clients").select("*").order("id",{ascending:false}),
        supabase.from("suppliers").select("*").order("id"),
        supabase.from("expenses").select("*").order("id", { ascending: false }),
        supabase.from("app_settings").select("key,value"),
      ]);
      // Produits
      if (p.data?.length === 0) { const r = await supabase.from("products").insert(INITIAL_PRODUCTS).select(); setProducts(r.data||[]); } else setProducts(p.data||[]);
      // Ventes
      if (s.data?.length === 0) { const r = await supabase.from("sales").insert(INITIAL_SALES).select(); setSales(r.data||[]); } else setSales(s.data||[]);
      // Clients
      if (c.data?.length === 0) { const r = await supabase.from("clients").insert(INITIAL_CLIENTS).select(); setClients([...(r.data||[])].sort((a,b)=>b.id-a.id)); } else setClients(c.data||[]);
      // Fournisseurs
      if (sup.data?.length === 0) { const r = await supabase.from("suppliers").insert(INITIAL_SUPPLIERS).select(); setSuppliers(r.data||[]); } else setSuppliers(sup.data||[]);
      // Dépenses
      if (e.data?.length === 0) { const r = await supabase.from("expenses").insert(INITIAL_EXPENSES).select(); setExpenses(r.data||[]); } else setExpenses(e.data||[]);
      // Paramètres → transformer [{key,value}] en objet {key:value}
      if (sets.data && sets.data.length > 0) {
        const obj = {};
        sets.data.forEach(row => { obj[row.key] = row.value; });
        setShopSettings(obj);
      } else {
        // Fallback localStorage si Supabase vide ou non configuré
        try {
          const local = localStorage.getItem("bfy_shop_settings");
          if (local) setShopSettings(JSON.parse(local));
        } catch {}
      }
      const dl = await supabase.from("deliveries").select("*").order("id", { ascending: false });
      if (dl.error) setDeliveriesMissing(true); else { setDeliveriesMissing(false); setDeliveries(dl.data || []); }
      setLoading(false);
    };
    loadData();
  }, [user]);

  const lowStock = products.filter(p => p.qty <= p.alert);
  const pendingDeliveries = deliveries.filter(d => d.status === "En attente" && sales.find(x => x.id === d.sale_id)?.status !== "Annulé").length;

  const renderPage = () => {
    if (loading) return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto" style={{borderColor:T.accent,borderTopColor:"transparent"}}/>
          <p className="text-sm" style={{color:T.textMuted}}>Chargement...</p>
        </div>
      </div>
    );
    // Vérifier l'accès au rôle avant d'afficher la page
    if (!canAccess(user, active)) return <AccessDenied T={T} role={user.role}/>;
    switch (active) {
      case "dashboard":  return <Dashboard products={products} sales={sales.filter(x=>x.status!=="Annulé")} clients={clients} expenses={expenses} T={T} user={user} shopSettings={shopSettings} themeName={themeName}/>;
      case "products":   return <ProductsPage products={products} setProducts={setProducts} T={T} userRole={user.role}/>;
      case "stock":      return <StockPage products={products} setProducts={setProducts} T={T} userRole={user.role} user={user}/>;
      case "sales":      return <SalesPage setDeliveries={setDeliveries} products={products} setProducts={setProducts} sales={sales} setSales={setSales} clients={clients} setClients={setClients} T={T} userRole={user.role} shopSettings={shopSettings} user={user} preload={devisPreload} onPreloadDone={()=>setDevisPreload(null)}/>;
      case "deliveries": return <DeliveriesPage deliveries={deliveries} setDeliveries={setDeliveries} sales={sales} missing={deliveriesMissing} shopSettings={shopSettings} T={T} userRole={user.role} user={user}/>;
      case "billing":    return <FacturationPage sales={sales} setSales={setSales} clients={clients} setClients={setClients} products={products} setProducts={setProducts} T={T} userRole={user.role} user={user} shopSettings={shopSettings} onConvertDevis={(d)=>{setDevisPreload(d);setActive("sales");}} onNewInvoice={()=>setActive("sales")}/>;
      case "clients":    return <ClientsPage clients={clients} setClients={setClients} T={T} userRole={user.role}/>;
      case "suppliers":  return <SuppliersPage suppliers={suppliers} setSuppliers={setSuppliers} T={T} userRole={user.role}/>;
      case "expenses":   return <ExpensesPage expenses={expenses} setExpenses={setExpenses} T={T}/>;
      case "users":      return <UsersPage T={T} currentUser={user}/>;
      case "accounting": return <AccountingPage sales={sales.filter(x=>x.status!=="Annulé")} expenses={expenses} T={T}/>;
      case "settings":   return <SettingsPage T={T} themeName={themeName} setThemeName={setThemeName} shopSettings={shopSettings} setShopSettings={setShopSettings}/>;
      default: return null;
    }
  };

  if (!user) return <LoginPage onLogin={setUser}/>;

  const shopName = shopSettings?.shop_name || "BOUMAYAH ET FILS";

  return (
    <div className="flex h-screen overflow-hidden" style={{background:T.bg,fontFamily:"'Segoe UI',sans-serif"}}>
      <Sidebar active={active} setActive={setActive} user={user} onLogout={()=>setUser(null)} collapsed={collapsed} T={T} shopSettings={shopSettings} badges={{deliveries:pendingDeliveries}}/>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0" style={{background:T.headerBg,borderColor:T.headerBorder}}>
          <button onClick={()=>setCollapsed(c=>!c)} style={{color:T.textMuted}}><Icon name="menu" size={20}/></button>
          <div className="flex items-center gap-3">
            {lowStock.length > 0 && (
              <button className="relative p-2 rounded-xl" style={{background:T.input}} title={`${lowStock.length} produit(s) en stock faible`}>
                <span style={{color:T.textMuted}}><Icon name="bell" size={18}/></span>
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center" style={{background:"#ef4444",fontSize:"9px"}}>{lowStock.length}</span>
              </button>
            )}
            <ThemePicker themeName={themeName} setThemeName={setThemeName} T={T}/>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold" style={{color:T.text}}>{user.name}</p>
              <RoleBadge role={user.role}/>
            </div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white" style={{background:`linear-gradient(135deg,${T.accent},${T.accent}aa)`}}>{user.name.charAt(0)}</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{renderPage()}</main>
      </div>
    </div>
  );
}

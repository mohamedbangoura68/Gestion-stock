import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

// ─── DONNÉES INITIALES ────────────────────────────────────────────────────────
const INITIAL_PRODUCTS = [
  { name: "Ciment Portland CPA", ref: "CIM-001", category: "Ciment", subcategory: "CPA 42.5", buy_price: 85000, sell_price: 95000, qty: 250, alert: 50, unit: "Sac 50kg", supplier: "CIMAF Guinée", image: "🏗️" },
  { name: "Fer à béton Ø12", ref: "FER-012", category: "Fer", subcategory: "Ronds à béton", buy_price: 95000, sell_price: 110000, qty: 120, alert: 20, unit: "Barre 12m", supplier: "SOMINEX", image: "🔩" },
  { name: "Fer à béton Ø10", ref: "FER-010", category: "Fer", subcategory: "Ronds à béton", buy_price: 72000, sell_price: 85000, qty: 8, alert: 20, unit: "Barre 12m", supplier: "SOMINEX", image: "🔩" },
  { name: "Peinture Satinée Blanche", ref: "PEI-001", category: "Peinture", subcategory: "Satinée", buy_price: 180000, sell_price: 220000, qty: 45, alert: 10, unit: "Seau 20L", supplier: "Valentine", image: "🎨" },
  { name: "Carrelage Sol 60x60", ref: "CAR-001", category: "Carrelage", subcategory: "Sol", buy_price: 95000, sell_price: 125000, qty: 3, alert: 15, unit: "m²", supplier: "SOGUIPAH", image: "⬛" },
  { name: "Tuyau PVC Ø100", ref: "PLB-001", category: "Plomberie", subcategory: "Tuyaux", buy_price: 35000, sell_price: 45000, qty: 60, alert: 20, unit: "Barre 3m", supplier: "Africaplast", image: "🚿" },
  { name: "Câble électrique 2.5mm²", ref: "ELC-001", category: "Électricité", subcategory: "Câbles", buy_price: 28000, sell_price: 38000, qty: 200, alert: 30, unit: "Rouleau 100m", supplier: "Nexans", image: "⚡" },
  { name: "Briques pleines", ref: "BRQ-001", category: "Briques", subcategory: "Pleines", buy_price: 800, sell_price: 1200, qty: 2000, alert: 500, unit: "Unité", supplier: "Local", image: "🧱" },
];
const INITIAL_CLIENTS = [
  { name: "Mamadou Bah", phone: "622 00 11 22", address: "Matam, Conakry", email: "mbah@email.com", debt: 450000, total_purchases: 3200000 },
  { name: "Entreprise SODIHA", phone: "628 33 44 55", address: "Kaloum, Conakry", email: "contact@sodiha.gn", debt: 0, total_purchases: 12500000 },
  { name: "Alpha Diallo", phone: "620 66 77 88", address: "Ratoma, Conakry", email: "", debt: 180000, total_purchases: 850000 },
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
const CATEGORIES = ["Ciment", "Fer", "Peinture", "Carrelage", "Plomberie", "Électricité", "Briques", "Sable/Gravier", "Bois", "Autre"];
const ROLES_LIST = ["Administrateur", "Caissier", "Gestionnaire Stock"];

// ─── PERMISSIONS PAR RÔLE ─────────────────────────────────────────────────────
// Chaque rôle définit quels onglets il voit + ses droits (can_write, can_delete)
const PERMISSIONS = {
  Administrateur: {
    nav: ["dashboard","products","stock","sales","clients","suppliers","expenses","users","accounting","settings"],
    write: ["products","stock","sales","clients","suppliers","expenses","users","settings"],
    delete: ["products","clients","suppliers","users"],
  },
  Caissier: {
    nav: ["dashboard","sales","clients"],
    write: ["sales","clients"],
    delete: [],
  },
  "Gestionnaire Stock": {
    nav: ["dashboard","products","stock","suppliers"],
    write: ["products","stock","suppliers"],
    delete: ["products"],
  },
};
const canAccess = (role, page) => (PERMISSIONS[role]?.nav || []).includes(page);
const canWrite  = (role, page) => (PERMISSIONS[role]?.write || []).includes(page);
const canDelete = (role, page) => (PERMISSIONS[role]?.delete || []).includes(page);

// ─── THÈMES ───────────────────────────────────────────────────────────────────
const THEMES = {
  dark:  { bg:"#111111", sidebar:"#0f0f0f", card:"#1a1a1a", cardBorder:"rgba(255,255,255,0.07)", text:"#ffffff", textSub:"#9ca3af", textMuted:"#6b7280", input:"rgba(255,255,255,0.06)", inputBorder:"rgba(255,255,255,0.1)", headerBg:"#0f0f0f", headerBorder:"rgba(255,255,255,0.06)", navActive:"linear-gradient(135deg,rgba(249,115,22,0.2),rgba(249,115,22,0.1))", navActiveBorder:"#f97316", navText:"#6b7280", rowHover:"rgba(255,255,255,0.03)", tableHead:"rgba(255,255,255,0.04)", userCard:"rgba(255,255,255,0.04)", accent:"#f97316", name:"Sombre", optionBg:"#1e1e1e", optionColor:"#e5e7eb" },
  light: { bg:"#F4F4F4", sidebar:"#191919", card:"#FFEAE5", cardBorder:"rgba(0,0,0,0.07)", text:"#0f172a", textSub:"#FB1A1A", textMuted:"#F76B00", input:"rgba(0,0,0,0.04)", inputBorder:"rgba(0,0,0,0.12)", headerBg:"#EBE7E7", headerBorder:"rgba(0,0,0,0.08)", navActive:"linear-gradient(135deg,rgba(249,115,22,0.12),rgba(249,115,22,0.06))", navActiveBorder:"#f97316", navText:"#64748b", rowHover:"rgba(0,0,0,0.02)", tableHead:"rgba(0,0,0,0.03)", userCard:"rgba(0,0,0,0.03)", accent:"#f97316", name:"Clair", optionBg:"#ffffff", optionColor:"#0f172a" },
  blue:  { bg:"#0f172a", sidebar:"#0a1628", card:"#1e293b", cardBorder:"rgba(148,163,184,0.1)", text:"#f1f5f9", textSub:"#94a3b8", textMuted:"#64748b", input:"rgba(148,163,184,0.08)", inputBorder:"rgba(148,163,184,0.15)", headerBg:"#0a1628", headerBorder:"rgba(148,163,184,0.1)", navActive:"linear-gradient(135deg,rgba(59,130,246,0.2),rgba(59,130,246,0.1))", navActiveBorder:"#3b82f6", navText:"#64748b", rowHover:"rgba(148,163,184,0.04)", tableHead:"rgba(148,163,184,0.06)", userCard:"rgba(148,163,184,0.06)", accent:"#3b82f6", name:"Océan", optionBg:"#1e293b", optionColor:"#f1f5f9" },
  green: { bg:"#0a1a0f", sidebar:"#061209", card:"#0f2018", cardBorder:"rgba(34,197,94,0.1)", text:"#f0fdf4", textSub:"#86efac", textMuted:"#4ade80", input:"rgba(34,197,94,0.06)", inputBorder:"rgba(34,197,94,0.15)", headerBg:"#061209", headerBorder:"rgba(34,197,94,0.1)", navActive:"linear-gradient(135deg,rgba(34,197,94,0.2),rgba(34,197,94,0.1))", navActiveBorder:"#22c55e", navText:"#4ade80", rowHover:"rgba(34,197,94,0.03)", tableHead:"rgba(34,197,94,0.06)", userCard:"rgba(34,197,94,0.06)", accent:"#22c55e", name:"Forêt", optionBg:"#0f2018", optionColor:"#f0fdf4" },
};

const fmtGNF = (v) => new Intl.NumberFormat("fr-GN",{style:"currency",currency:"GNF",maximumFractionDigits:0}).format(v||0);

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
    save:<path strokeLinecap="round" strokeLinejoin="round" d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4zM12 17a3 3 0 100-6 3 3 0 000 6zm3-10H7V4h8v3z"/>,
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      {icons[name]}
    </svg>
  );
};

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
  <div className="mb-3 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}>⚠️ {msg}</div>
) : null;

const OkBox = ({ msg }) => msg ? (
  <div className="mb-3 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: "rgba(34,197,94,0.12)", color: "#86efac", border: "1px solid rgba(34,197,94,0.3)" }}>✅ {msg}</div>
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

const StatCard = ({ label, value, icon, color, sub, T }) => (
  <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
    <div className="absolute top-0 right-0 w-24 h-24 rounded-full -mr-8 -mt-8 opacity-10" style={{ background: color }} />
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: T.textMuted }}>{label}</p>
        <p className="text-2xl font-black mt-1" style={{ color: T.text }}>{value}</p>
        {sub && <p className="text-xs mt-1" style={{ color }}>{sub}</p>}
      </div>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, color }}>
        <Icon name={icon} size={20} />
      </div>
    </div>
  </div>
);

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
    onLogin({ id: data.id, name: data.name, role: data.role, email: data.email });
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "linear-gradient(135deg,#0a0a0a 0%,#1a1a1a 50%,#0f1f0f 100%)" }}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_,i) => (
          <div key={i} className="absolute rounded-full" style={{ width:`${180+i*80}px`, height:`${180+i*80}px`, background: i%2===0?"#f97316":"#22c55e", top:`${8+i*16}%`, left:`${4+i*16}%`, opacity:0.04, filter:"blur(60px)", animation:`pulse ${3+i}s ease-in-out infinite alternate` }} />
        ))}
      </div>
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4 shadow-2xl" style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}>
            <span className="text-3xl">🏗️</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">MOGESTOCK</h1>
          <p className="text-sm mt-1 font-medium" style={{ color: "#22c55e" }}>Application de Gestion d'une boustique et stock</p>
        </div>
        <div className="rounded-3xl p-8" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(249,115,22,0.25)" }}>
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Icon name="lock" size={18}/> Connexion</h2>
          <ErrBox msg={error} />
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="votre@email.com" onKeyDown={e=>e.key==="Enter"&&handleLogin()} className="mt-1 w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)" }} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Mot de passe</label>
              <div className="relative">
                <input type={showPwd?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleLogin()} className="mt-1 w-full px-4 py-3 rounded-xl text-white text-sm outline-none pr-10" style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)" }} />
                <button type="button" onClick={()=>setShowPwd(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{showPwd ? <Icon name="close" size={15}/> : <Icon name="eye" size={15}/>}</button>
              </div>
            </div>
            <button onClick={handleLogin} disabled={loading} className="w-full py-3.5 rounded-xl font-bold text-white text-sm mt-2" style={{ background: loading?"#374151":"linear-gradient(135deg,#f97316,#ea580c)", boxShadow: loading?"none":"0 4px 20px rgba(249,115,22,0.4)" }}>
              {loading ? "Vérification..." : "Se connecter"}
            </button>
            <div className="mt-3 px-3 py-2.5 rounded-xl flex items-center gap-2" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
              <span className="text-base">🔑</span>
              <div>
                <p className="text-xs font-semibold" style={{color:"rgba(255,255,255,0.5)"}}>Compte administrateur par défaut</p>
                <p className="text-xs font-mono mt-0.5" style={{color:"#f97316"}}>admin@mogestoc.gn &nbsp;·&nbsp; admin123</p>
              </div>
            </div>
          </div>

        </div>
      </div>
      <style>{`@keyframes pulse{from{transform:scale(1)}to{transform:scale(1.08)}}`}</style>
    </div>
  );
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const Dashboard = ({ products, sales, clients, expenses, T, user, shopSettings }) => {
  const role = user.role;
  const isAdmin = role === "Administrateur";
  const today = localDateStr();
  const todaySales = sales.filter(s=>s.date===today).reduce((a,s)=>a+s.total,0);
  const monthSales = sales.reduce((a,s)=>a+s.total,0);
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
        {canAccess(role,"sales") && <StatCard label="CA Aujourd'hui" value={fmtGNF(todaySales)} icon="chart" color="#f97316" T={T}/>}
        {canAccess(role,"sales") && <StatCard label="CA du mois" value={fmtGNF(monthSales)} icon="sales" color="#22c55e" T={T}/>}
        {isAdmin && <StatCard label="Bénéfice estimé" value={fmtGNF(monthSales*0.15)} icon="accounting" color="#3b82f6" sub="Marge 15%" T={T}/>}
        {isAdmin && <StatCard label="Dettes clients" value={fmtGNF(totalDebt)} icon="clients" color="#f59e0b" T={T}/>}
        {canAccess(role,"products") && <StatCard label="Produits" value={products.length} icon="products" color="#8b5cf6" T={T}/>}
        {canAccess(role,"stock") && <StatCard label="Stock faible" value={lowStock.length} icon="warning" color="#ef4444" T={T}/>}
        {canAccess(role,"clients") && <StatCard label="Clients" value={clients.length} icon="clients" color="#06b6d4" T={T}/>}
        {isAdmin && <StatCard label="Dépenses" value={fmtGNF(totalExpenses)} icon="expenses" color="#ec4899" T={T}/>}
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
      {canAccess(role,"sales") && (
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
  const empty = {name:"",ref:"",category:"",subcategory:"",buy_price:"",sell_price:"",qty:"",alert:"10",unit:"Unité",supplier:"",image:"📦"};
  const [form, setForm] = useState(empty);
  const filtered = products.filter(p=>(p.name.toLowerCase().includes(search.toLowerCase())||(p.ref||"").toLowerCase().includes(search.toLowerCase()))&&(catFilter?p.category===catFilter:true));
  const openAdd = () => { setEditing(null); setForm(empty); setErrMsg(""); setShowModal(true); };
  const openEdit = (p) => { setEditing(p.id); setForm({...p,buy_price:String(p.buy_price||""),sell_price:String(p.sell_price||""),qty:String(p.qty),alert:String(p.alert)}); setErrMsg(""); setShowModal(true); };
  const save = async () => {
    if (!form.name||!form.category){setErrMsg("Nom et catégorie obligatoires.");return;}
    setSaving(true); setErrMsg("");
    const item={name:form.name,ref:form.ref,category:form.category,subcategory:form.subcategory,buy_price:+form.buy_price||0,sell_price:+form.sell_price||0,qty:+form.qty||0,alert:+form.alert||0,unit:form.unit,supplier:form.supplier,image:form.image};
    if(editing){
      const {error}=await supabase.from("products").update(item).eq("id",editing);
      if(error){setErrMsg("Erreur : "+error.message);setSaving(false);return;}
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
    if(!error)setProducts(prev=>prev.filter(p=>p.id!==id));
    else alert("Erreur : "+error.message);
  };
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{color:T.text}}>Produits</h1>
        {write && <Btn onClick={openAdd} T={T}><span className="flex items-center gap-1"><Icon name="plus" size={14}/> Nouveau produit</span></Btn>}
      </div>
      {!write && <div className="px-4 py-2 rounded-xl text-xs font-medium" style={{background:`${T.accent}15`,color:T.accent}}>👁️ Mode lecture seule — votre rôle ne permet pas de modifier les produits.</div>}
      <div className="flex gap-3">
        <div className="flex-1 relative"><span className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:T.textMuted}}><Icon name="search" size={16}/></span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none" style={{background:T.input,border:`1px solid ${T.inputBorder}`,color:T.text}}/></div>
        <><style>{`select.themed-select option{background-color:${T.optionBg||"#1e1e1e"} !important;color:${T.optionColor||"#e5e7eb"} !important;}`}</style><select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="themed-select px-3 py-2.5 rounded-xl text-sm outline-none" style={{background:T.card,border:`1px solid ${T.inputBorder}`,color:T.text}}><option value="">Toutes</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
        <table className="w-full">
          <thead><tr style={{background:T.tableHead}}>{["Produit","Réf.","Catégorie","Prix achat","Prix vente","Stock","Fournisseur",...(write||del?[""]:[])].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{color:T.textMuted}}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(p=>(
              <tr key={p.id} className="border-t" style={{borderColor:T.cardBorder}}>
                <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="text-xl">{p.image}</span><span className="text-sm font-medium" style={{color:T.text}}>{p.name}</span></div></td>
                <td className="px-4 py-3 text-xs font-mono" style={{color:T.textMuted}}>{p.ref}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{background:`${T.accent}20`,color:T.accent}}>{p.category}</span></td>
                <td className="px-4 py-3 text-sm" style={{color:T.textSub}}>{fmtGNF(p.buy_price)}</td>
                <td className="px-4 py-3 text-sm font-semibold" style={{color:T.text}}>{fmtGNF(p.sell_price)}</td>
                <td className="px-4 py-3"><span className="font-bold text-sm" style={{color:p.qty<=p.alert?"#ef4444":"#22c55e"}}>{p.qty} <span className="text-xs font-normal" style={{color:T.textMuted}}>{p.unit}</span></span>{p.qty<=p.alert&&<span className="ml-1">⚠️</span>}</td>
                <td className="px-4 py-3 text-xs" style={{color:T.textMuted}}>{p.supplier}</td>
                {(write||del)&&<td className="px-4 py-3"><div className="flex gap-2">{write&&<Btn onClick={()=>openEdit(p)} variant="ghost" size="sm" T={T}><Icon name="edit" size={13}/></Btn>}{del&&<Btn onClick={()=>doDelete(p.id)} variant="danger" size="sm" T={T}><Icon name="trash" size={13}/></Btn>}</div></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0&&<p className="text-center py-10" style={{color:T.textMuted}}>Aucun produit trouvé</p>}
      </div>
      {showModal&&write&&(
        <Modal title={editing?"Modifier produit":"Nouveau produit"} onClose={()=>setShowModal(false)} T={T}>
          <ErrBox msg={errMsg}/>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Field label="Nom du produit" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} required T={T}/></div>
            <Field label="Référence" value={form.ref} onChange={v=>setForm(f=>({...f,ref:v}))} T={T}/>
            <Field label="Catégorie" value={form.category} onChange={v=>setForm(f=>({...f,category:v}))} options={CATEGORIES} required T={T}/>
            <Field label="Sous-catégorie" value={form.subcategory} onChange={v=>setForm(f=>({...f,subcategory:v}))} T={T}/>
            <Field label="Unité" value={form.unit} onChange={v=>setForm(f=>({...f,unit:v}))} T={T}/>
            <Field label="Prix achat (GNF)" type="number" value={form.buy_price} onChange={v=>setForm(f=>({...f,buy_price:v}))} T={T}/>
            <Field label="Prix vente (GNF)" type="number" value={form.sell_price} onChange={v=>setForm(f=>({...f,sell_price:v}))} T={T}/>
            <Field label="Quantité" type="number" value={form.qty} onChange={v=>setForm(f=>({...f,qty:v}))} T={T}/>
            <Field label="Seuil alerte" type="number" value={form.alert} onChange={v=>setForm(f=>({...f,alert:v}))} T={T}/>
            <div className="col-span-2"><Field label="Fournisseur" value={form.supplier} onChange={v=>setForm(f=>({...f,supplier:v}))} T={T}/></div>
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
              <td className="px-4 py-3 text-sm font-medium" style={{color:T.text}}>{p.image} {p.name}</td>
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
              {form.productName&&(()=>{const p=products.find(x=>x.name.toLowerCase()===form.productName.trim().toLowerCase());return p?<p className="text-xs mt-1 px-3 py-1.5 rounded-lg" style={{background:T.rowHover,color:T.accent}}>✓ {p.name} — Stock actuel : <strong>{p.qty} {p.unit}</strong></p>:form.productName.length>2?<p className="text-xs mt-1 px-3 py-1.5 rounded-lg" style={{background:"rgba(239,68,68,0.08)",color:"#f87171"}}>Produit non trouvé</p>:null;})()}
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
const SalesPage = ({ products, setProducts, sales, setSales, clients, setClients, T, userRole, shopSettings, user }) => {
  const write = canWrite(userRole,"sales");
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [payment, setPayment] = useState("Espèces");
  const [discount, setDiscount] = useState(0);
  // Paiement partiel
  const [amountPaid, setAmountPaid] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showInvoice, setShowInvoice] = useState(null);
  const [detailSale, setDetailSale] = useState(null); // modal "Voir plus"
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const filtered = products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||(p.ref||"").toLowerCase().includes(search.toLowerCase()));
  const addToCart = (p) => setCart(prev=>{const ex=prev.find(i=>i.id===p.id);if(ex)return prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i);return[...prev,{...p,qty:1}];});
  const updateCartQty = (id,qty) => {if(qty<=0)setCart(prev=>prev.filter(i=>i.id!==id));else setCart(prev=>prev.map(i=>i.id===id?{...i,qty}:i));};
  const subtotal = cart.reduce((a,i)=>a+(i.sell_price||0)*i.qty,0);
  const total = Math.round(subtotal - subtotal*(discount/100));
  const shopName = shopSettings?.shop_name || "MOGESTOCK";

  // Calcul paiement partiel
  const paid = Math.min(+amountPaid || total, total);
  const remaining = total - paid;
  const isPartial = remaining > 0;

  const validateSale = async () => {
    if(cart.length===0){setErrMsg("Le panier est vide.");return;}
    if(isPartial && !selectedClient){setErrMsg("Sélectionnez un client pour un paiement partiel.");return;}
    setSaving(true); setErrMsg("");
    const status = isPartial ? "Partiel" : "Payé";
    const sale={
      date: localDateStr(),
      client: selectedClient||"Client comptoir",
      items: cart.map(i=>({product:i.name,qty:i.qty,price:i.sell_price||0})),
      total,
      paid,
      remaining,
      payment,
      status,
      seller_name: user?.name || "Inconnu",
    };
    const {data,error}=await supabase.from("sales").insert([sale]).select();
    if(error){setErrMsg("Erreur : "+error.message);setSaving(false);return;}
    setSales(prev=>[data[0],...prev]);

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

    setShowInvoice(data[0]);
    setCart([]); setSelectedClient(""); setDiscount(0); setAmountPaid(""); setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black" style={{color:T.text}}>Caisse · Point de vente</h1>
        <Btn onClick={()=>setShowHistory(true)} variant="ghost" T={T}><span className="flex items-center gap-1"><Icon name="eye" size={14}/> Historique</span></Btn>
      </div>
      <ErrBox msg={errMsg}/>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Grille produits */}
        <div className="lg:col-span-3 space-y-3">
          <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:T.textMuted}}><Icon name="search" size={16}/></span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher produit..." className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none" style={{background:T.input,border:`1px solid ${T.inputBorder}`,color:T.text}}/></div>
          <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
            {filtered.map(p=>(
              <button key={p.id} onClick={()=>addToCart(p)} className="text-left p-3 rounded-xl transition-all hover:scale-105" style={{background:T.card,border:`1px solid ${T.cardBorder}`}} disabled={!write}>
                <div className="text-2xl mb-1">{p.image}</div>
                <p className="text-xs font-semibold truncate" style={{color:T.text}}>{p.name}</p>
                <p className="text-xs font-bold mt-0.5" style={{color:T.accent}}>{fmtGNF(p.sell_price)}</p>
                <p className="text-xs" style={{color:T.textMuted}}>Stock: {p.qty} {p.unit}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Panier */}
        <div className="lg:col-span-2 rounded-2xl p-4 space-y-3" style={{background:T.card,border:`1px solid ${T.accent}33`}}>
          <h3 className="font-bold text-sm" style={{color:T.text}}>🛒 Panier ({cart.length})</h3>
          <div>
            <label className="text-xs" style={{color:T.textMuted}}>Client</label>
            <style>{`select.themed-select option{background-color:${T.optionBg||"#1e1e1e"} !important;color:${T.optionColor||"#e5e7eb"} !important;}`}</style>
            <select value={selectedClient} onChange={e=>setSelectedClient(e.target.value)} className="themed-select mt-1 w-full px-3 py-2 rounded-xl text-xs outline-none" style={{background:T.card,border:`1px solid ${T.inputBorder}`,color:T.text}}>
              <option value="">Client comptoir</option>
              {clients.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          {/* Articles */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {cart.length===0&&<p className="text-xs text-center py-4" style={{color:T.textMuted}}>Cliquer sur un produit pour l'ajouter</p>}
            {cart.map(item=>(
              <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{background:T.rowHover}}>
                <span className="text-lg">{item.image}</span>
                <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate" style={{color:T.text}}>{item.name}</p><p className="text-xs" style={{color:T.accent}}>{fmtGNF(item.sell_price)} × {item.qty}</p></div>
                <div className="flex items-center gap-1">
                  <button onClick={()=>updateCartQty(item.id,item.qty-1)} className="w-5 h-5 rounded text-xs flex items-center justify-center" style={{background:T.input,color:T.text}}>−</button>
                  <span className="text-xs w-5 text-center" style={{color:T.text}}>{item.qty}</span>
                  <button onClick={()=>updateCartQty(item.id,item.qty+1)} className="w-5 h-5 rounded text-xs flex items-center justify-center" style={{background:`${T.accent}40`,color:T.accent}}>+</button>
                </div>
              </div>
            ))}
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

          {/* Paiement partiel */}
          <div className="rounded-xl p-3 space-y-2" style={{background:T.rowHover,border:`1px solid ${isPartial?"rgba(245,158,11,0.3)":T.cardBorder}`}}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold" style={{color:T.textMuted}}>💵 Montant versé (GNF)</label>
              {isPartial && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{background:"rgba(245,158,11,0.15)",color:"#f59e0b"}}>Partiel</span>}
              {!isPartial && amountPaid && <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{background:"rgba(34,197,94,0.15)",color:"#22c55e"}}>Complet</span>}
            </div>
            <input
              type="number"
              value={amountPaid}
              onChange={e=>setAmountPaid(e.target.value)}
              placeholder={`Total : ${total.toLocaleString()} GNF`}
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
                {isPartial && <p className="text-xs mt-1" style={{color:"#f59e0b"}}>⚠️ Le reste ({fmtGNF(remaining)}) sera ajouté à la dette du client.</p>}
              </div>
            )}
          </div>

          {write&&<Btn onClick={validateSale} variant="success" className="w-full justify-center" T={T}>
            <span className="flex items-center justify-center gap-2">
              <Icon name="check" size={15}/>{saving?"Enregistrement...":"Valider la vente"}
            </span>
          </Btn>}
        </div>
      </div>

      {/* ── Modal Facture ── */}
      {showInvoice&&(
        <Modal title="Facture" onClose={()=>setShowInvoice(null)} T={T}>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{background:"rgba(34,197,94,0.15)"}}><span style={{color:"#22c55e"}}><Icon name="check" size={32}/></span></div>
            <p className="font-black text-xl" style={{color:T.text}}>{shopName}</p>
            <p className="font-bold" style={{color:"#22c55e"}}>✓ Vente enregistrée avec succès</p>
            <div className="rounded-xl p-4 text-left space-y-2" style={{background:T.rowHover,border:`1px solid ${T.cardBorder}`}}>
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold uppercase tracking-wider" style={{color:T.textMuted}}>Facture N° {showInvoice.id}</p>
                <p className="text-xs" style={{color:T.textMuted}}>{showInvoice.date}</p>
              </div>
              <p className="font-semibold text-sm" style={{color:T.text}}>👤 {showInvoice.client}</p>
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
      <div class="inv-meta">Date : ${inv.date}<br/>Paiement : ${inv.payment}</div>
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
    ${(inv.remaining>0)?`<div class="tot-row"><span class="tot-lbl">Reste à payer</span><span class="tot-val amber">${fmtGNF(inv.remaining)}</span></div>`:`<div class="tot-row"><span class="tot-lbl">Solde</span><span class="tot-val green">Soldé ✓</span></div>`}
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

      {/* ── Modal Historique ── */}
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
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{background:s.status==="Payé"?"rgba(34,197,94,0.15)":"rgba(245,158,11,0.15)",color:s.status==="Payé"?"#22c55e":"#f59e0b"}}>{s.status}</span>
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
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-semibold" style={{background:detailSale.status==="Payé"?"rgba(34,197,94,0.15)":"rgba(245,158,11,0.15)",color:detailSale.status==="Payé"?"#22c55e":"#f59e0b"}}>
                {detailSale.status}
              </span>
            </div>

            {/* Infos rapides */}
            <div className="grid grid-cols-2 gap-2">
              <div className="px-3 py-2 rounded-xl" style={{background:T.rowHover}}>
                <p className="text-xs" style={{color:T.textMuted}}>📅 Date</p>
                <p className="text-sm font-semibold mt-0.5" style={{color:T.text}}>{detailSale.date}</p>
              </div>
              <div className="px-3 py-2 rounded-xl" style={{background:T.rowHover}}>
                <p className="text-xs" style={{color:T.textMuted}}>💳 Paiement</p>
                <p className="text-sm font-semibold mt-0.5" style={{color:T.text}}>{detailSale.payment}</p>
              </div>
              <div className="px-3 py-2 rounded-xl col-span-2" style={{background:T.rowHover}}>
                <p className="text-xs" style={{color:T.textMuted}}>👤 Vendeur</p>
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
                <span style={{color:T.textMuted}}>✅ Montant payé</span>
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
      <div class="inv-meta">Date : ${inv.date}<br/>Paiement : ${inv.payment}</div>
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
    ${(inv.remaining>0)?`<div class="tot-row"><span class="tot-lbl">Reste à payer</span><span class="tot-val amber">${fmtGNF(inv.remaining)}</span></div>`:`<div class="tot-row"><span class="tot-lbl">Solde</span><span class="tot-val green">Soldé ✓</span></div>`}
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
  const empty = {name:"",phone:"",address:"",email:"",debt:"0",total_purchases:"0"};
  const [form, setForm] = useState(empty);
  const filtered = clients.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||(c.phone||"").includes(search));
  const openEdit = (c) => {setEditing(c.id);setForm({...c,debt:String(c.debt||0),total_purchases:String(c.total_purchases||0)});setErrMsg("");setShowModal(true);};
  const doDelete = async (c) => {
    if(!window.confirm(`Supprimer le client "${c.name}" ? Cette action est irréversible.`))return;
    const {error}=await supabase.from("clients").delete().eq("id",c.id);
    if(!error)setClients(prev=>prev.filter(x=>x.id!==c.id));
    else alert("Erreur suppression : "+error.message);
  };
  const save = async () => {
    if(!form.name){setErrMsg("Le nom est obligatoire.");return;}
    setSaving(true); setErrMsg("");
    const item={name:form.name,phone:form.phone,address:form.address,email:form.email,debt:+form.debt||0,total_purchases:+form.total_purchases||0};
    if(editing){
      const {error}=await supabase.from("clients").update(item).eq("id",editing);
      if(error){setErrMsg("Erreur : "+error.message);setSaving(false);return;}
      setClients(prev=>prev.map(c=>c.id===editing?{...item,id:editing}:c));
    } else {
      const {data,error}=await supabase.from("clients").insert([item]).select();
      if(error){setErrMsg("Erreur : "+error.message);setSaving(false);return;}
      setClients(prev=>[...prev,data[0]]);
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
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black text-white" style={{background:`linear-gradient(135deg,${T.accent},${T.accent}aa)`}}>{c.name.charAt(0)}</div><div><p className="font-bold text-sm" style={{color:T.text}}>{c.name}</p><p className="text-xs" style={{color:T.textMuted}}>{c.phone}</p></div></div>
              {write&&<div className="flex gap-2"><Btn onClick={()=>openEdit(c)} variant="ghost" size="sm" T={T}><Icon name="edit" size={13}/></Btn><Btn onClick={()=>doDelete(c)} variant="danger" size="sm" T={T}><Icon name="trash" size={13}/></Btn></div>}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="px-2 py-1.5 rounded-lg" style={{background:T.rowHover}}><p style={{color:T.textMuted}}>Total achats</p><p className="text-green-400 font-bold">{fmtGNF(c.total_purchases)}</p></div>
              <div className="px-2 py-1.5 rounded-lg" style={{background:c.debt>0?"rgba(239,68,68,0.06)":"rgba(34,197,94,0.06)"}}><p style={{color:T.textMuted}}>Dette</p><p className="font-bold" style={{color:c.debt>0?"#ef4444":"#22c55e"}}>{c.debt>0?fmtGNF(c.debt):"Aucune"}</p></div>
            </div>
            {c.address&&<p className="text-xs mt-2" style={{color:T.textMuted}}>📍 {c.address}</p>}
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
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{background:"rgba(34,197,94,0.12)"}}>🏭</div><div><p className="font-bold text-sm" style={{color:T.text}}>{s.name}</p><p className="text-xs" style={{color:T.textMuted}}>{s.contact} · {s.phone}</p></div></div>
              {write&&<div className="flex gap-2"><Btn onClick={()=>openEdit(s)} variant="ghost" size="sm" T={T}><Icon name="edit" size={13}/></Btn><Btn onClick={()=>doDelete(s)} variant="danger" size="sm" T={T}><Icon name="trash" size={13}/></Btn></div>}
            </div>
            <div className="px-3 py-2 rounded-xl flex justify-between" style={{background:"rgba(34,197,94,0.06)"}}><span className="text-xs" style={{color:T.textMuted}}>Total commandes</span><span className="text-green-400 font-bold text-xs">{fmtGNF(s.total_orders)}</span></div>
            {s.address&&<p className="text-xs" style={{color:T.textMuted}}>📍 {s.address}</p>}
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
  const empty = {name:"",email:"",password:"",role:"Caissier",active:true};
  const [form, setForm] = useState(empty);

  useEffect(()=>{
    const load=async()=>{
      setLoading(true);
      const {data,error}=await supabase.from("app_users").select("id,name,email,role,active,last_login,created_at").order("id");
      if(!error&&data)setUsers(data);
      setLoading(false);
    };
    load();
  },[]);

  const openEdit=(u)=>{setEditing(u.id);setForm({name:u.name,email:u.email,password:"",role:u.role,active:u.active});setErrMsg("");setShowPwd(false);setShowModal(true);};

  const save=async()=>{
    if(!form.name||!form.email){setErrMsg("Nom et email obligatoires.");return;}
    if(!editing&&!form.password){setErrMsg("Mot de passe obligatoire.");return;}
    if(form.password&&form.password.length<4){setErrMsg("Mot de passe trop court (min. 4 caractères).");return;}
    setSaving(true); setErrMsg("");
    if(editing){
      const updates={name:form.name,email:form.email.trim().toLowerCase(),role:form.role,active:form.active};
      if(form.password)updates.password=form.password;
      const {error}=await supabase.from("app_users").update(updates).eq("id",editing);
      if(error){setErrMsg("Erreur : "+error.message);setSaving(false);return;}
      setUsers(prev=>prev.map(u=>u.id===editing?{...u,...updates}:u));
    } else {
      const {data:ex}=await supabase.from("app_users").select("id").eq("email",form.email.trim().toLowerCase()).single();
      if(ex){setErrMsg("Cet email est déjà utilisé.");setSaving(false);return;}
      const {data,error}=await supabase.from("app_users").insert([{name:form.name,email:form.email.trim().toLowerCase(),password:form.password,role:form.role,active:form.active}]).select("id,name,email,role,active,last_login,created_at");
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
                  {u.id===currentUser.id&&<span className="absolute -top-1 -right-1 text-xs">👤</span>}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm" style={{color:T.text}}>{u.name}</p>
                    {u.id===currentUser.id&&<span className="text-xs" style={{color:T.accent}}>(vous)</span>}
                    <RoleBadge role={u.role}/>
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
                    <button key={role} onClick={()=>setForm(f=>({...f,role}))} className="p-2 rounded-xl text-xs font-semibold transition-all text-center" style={{background:form.role===role?`${c}20`:T.input,border:`2px solid ${form.role===role?c:T.inputBorder}`,color:form.role===role?c:T.textMuted}}>
                      {role}<br/><span className="font-normal text-xs opacity-70">{roleDesc[role].split(" ").slice(0,3).join(" ")}...</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs mt-2 px-3 py-2 rounded-xl" style={{background:T.rowHover,color:T.textMuted}}>{roleDesc[form.role]}</p>
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

  const totalRevenue   = filteredSales.reduce((a,s)=>a+s.total,0);
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
        rev: s.total,
        exp: 0,
      }));
    }
    if (period === "month") {
      // Regrouper par jour
      const days = {};
      filteredSales.forEach(s => { days[s.date] = (days[s.date]||0) + s.total; });
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
        const rev = filteredSales.filter(s=>s.date?.slice(0,7)===key).reduce((a,s)=>a+s.total,0);
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
        <StatCard label="Bénéfice net" value={fmtGNF(netProfit)} icon="accounting" color={netProfit>=0?"#22c55e":"#ef4444"} sub={netProfit>=0?"✓ Positif":"⚠ Négatif"} T={T}/>
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
            <p className="text-4xl mb-2">📭</p>
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
    logo: "🏗️",
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
      setErrMsg("Supabase non configuré — données sauvegardées localement uniquement.");
    } else {
      setOkMsg("✅ Informations sauvegardées dans Supabase avec succès !");
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

  const LOGOS = ["🏗️","🏢","🏠","🔨","🧱","⚒️","🪚","🔧","🏪","🛠️"];
  const TABS = [
    { id: "entreprise", label: "🏢 Entreprise" },
    { id: "commercial", label: "💼 Commercial" },
    { id: "apparence",  label: "🎨 Apparence" },
    { id: "supabase",   label: "☁️ Supabase" },
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
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0" style={{background:`linear-gradient(135deg,${T.accent},${T.accent}aa)`}}>
              {form.logo}
            </div>
            <div>
              <p className="font-black text-base" style={{color:T.text}}>{form.shop_name||"Nom de l'entreprise"}</p>
              <p className="text-xs mt-0.5" style={{color:T.textSub}}>{form.shop_description||"Description"}</p>
              <div className="flex gap-3 mt-1 text-xs" style={{color:T.textMuted}}>
                {form.shop_phone && <span>📞 {form.shop_phone}</span>}
                {form.shop_email && <span>✉️ {form.shop_email}</span>}
              </div>
            </div>
          </div>

          {/* Icône */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider" style={{color:T.textSub}}>Icône / Logo</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {LOGOS.map(logo => (
                <button key={logo} onClick={() => setForm(f=>({...f,logo}))}
                  className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                  style={{background:form.logo===logo?`${T.accent}25`:T.input, border:`2px solid ${form.logo===logo?T.accent:T.inputBorder}`, transform:form.logo===logo?"scale(1.1)":"scale(1)"}}>
                  {logo}
                </button>
              ))}
            </div>
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
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:T.textMuted}}>📋 Informations légales</p>
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
          <h3 className="font-bold text-sm mb-4" style={{color:T.text}}>💼 Paramètres commerciaux</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="TVA (%)" type="number" value={form.tva} onChange={v=>setForm(f=>({...f,tva:v}))} T={T}/>
            <Field label="Monnaie" value={form.currency} onChange={v=>setForm(f=>({...f,currency:v}))} options={["GNF","USD","EUR"]} T={T}/>
          </div>
          {/* Aperçu TVA */}
          <div className="rounded-xl p-3 flex items-center gap-3" style={{background:T.input}}>
            <span className="text-2xl">🧾</span>
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
                  {key==="dark"?"🌙":key==="light"?"☀️":key==="blue"?"🌊":"🌿"}
                </div>
                <span className="text-xs font-bold" style={{color:key===themeName?th.accent:T.textSub}}>{th.name}</span>
                {key===themeName && <span style={{color:th.accent}}><Icon name="check" size={14}/></span>}
              </button>
            ))}
          </div>
          <p className="text-xs mt-4" style={{color:T.textMuted}}>Le thème est appliqué immédiatement et mémorisé dans votre navigateur.</p>
        </div>
      )}

      {/* ── TAB: Supabase ── */}
      {activeTab === "supabase" && (
        <div className="rounded-2xl p-5 space-y-4" style={{background:T.card,border:`1px solid rgba(99,102,241,0.3)`}}>
          <h3 className="font-bold text-sm flex items-center gap-2" style={{color:T.text}}>
            <span style={{color:"#6366f1"}}>☁️</span> Configuration Supabase
          </h3>
          <p className="text-xs" style={{color:T.textSub}}>
            Editez le fichier <code className="px-1 py-0.5 rounded" style={{background:T.input}}>supabaseClient.js</code> avec vos clés pour activer la persistance cloud.
          </p>
          <div className="rounded-xl p-4 text-xs font-mono space-y-1.5" style={{background:T.input,color:T.textSub}}>
            <p style={{color:"#22c55e"}}>// supabaseClient.js</p>
            <p><span style={{color:"#6366f1"}}>import</span> {"{"} createClient {"}"} <span style={{color:"#6366f1"}}>from</span> <span style={{color:"#f97316"}}>'@supabase/supabase-js'</span>;</p>
            <p className="mt-2"><span style={{color:"#6366f1"}}>export const</span> supabase = createClient(</p>
            <p className="pl-4"><span style={{color:"#f97316"}}>"https://VOTRE_ID.supabase.co"</span>,</p>
            <p className="pl-4"><span style={{color:"#f97316"}}>"VOTRE_ANON_KEY"</span></p>
            <p>);</p>
          </div>
          <div className="rounded-xl p-4 text-xs font-mono space-y-1" style={{background:T.input,color:T.textSub}}>
            <p style={{color:"#22c55e"}}>-- SQL à exécuter dans Supabase :</p>
            {["CREATE TABLE IF NOT EXISTS app_settings (key text PRIMARY KEY, value text, updated_at timestamptz);",
              "CREATE TABLE IF NOT EXISTS products (id bigserial PRIMARY KEY, name text, ref text, category text, subcategory text, buy_price int, sell_price int, qty int, alert int, unit text, supplier text, image text);",
              "CREATE TABLE IF NOT EXISTS clients (id bigserial PRIMARY KEY, name text, phone text, address text, email text, debt int, total_purchases int);",
              "CREATE TABLE IF NOT EXISTS suppliers (id bigserial PRIMARY KEY, name text, contact text, phone text, address text, email text, total_orders int);",
              "CREATE TABLE IF NOT EXISTS sales (id bigserial PRIMARY KEY, date text, client text, items jsonb, total int, payment text, status text);",
              "CREATE TABLE IF NOT EXISTS expenses (id bigserial PRIMARY KEY, date text, type text, description text, amount int, justif text);",
            ].map((sql,i) => <p key={i} className="mt-1">{sql}</p>)}
          </div>
        </div>
      )}

      {/* Bouton fixe en bas */}
      <div className="flex justify-between items-center pt-2">
        <p className="text-xs" style={{color:T.textMuted}}>
          💾 Les données sont sauvegardées dans Supabase <em>et</em> dans votre navigateur.
        </p>
        <Btn onClick={handleSave} T={T} disabled={saving}>
          <span className="flex items-center gap-2"><Icon name="save" size={15}/>{saving ? "Sauvegarde en cours..." : "Sauvegarder les paramètres"}</span>
        </Btn>
      </div>
    </div>
  );
};

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const ALL_NAV = [
  {id:"dashboard",label:"Tableau de bord",icon:"dashboard"},
  {id:"products",  label:"Produits",       icon:"products"},
  {id:"stock",     label:"Stock",          icon:"stock"},
  {id:"sales",     label:"Caisse / Ventes",icon:"sales"},
  {id:"clients",   label:"Clients",        icon:"clients"},
  {id:"suppliers", label:"Fournisseurs",   icon:"suppliers"},
  {id:"expenses",  label:"Dépenses",       icon:"expenses"},
  {id:"users",     label:"Utilisateurs",   icon:"users"},
  {id:"accounting",label:"Comptabilité",   icon:"accounting"},
  {id:"settings",  label:"Paramètres",     icon:"settings"},
];

const Sidebar = ({ active, setActive, user, onLogout, collapsed, T, shopSettings }) => {
  const nav = ALL_NAV.filter(item => canAccess(user.role, item.id));
  const logo = shopSettings?.logo || "🏗️";
  const shopName = shopSettings?.shop_name || "BOUMAYAH ET FILS";
  return (
    <aside className="flex flex-col h-full" style={{background:T.sidebar,borderRight:`1px solid ${T.headerBorder}`,width:collapsed?"64px":"220px",transition:"width 0.2s ease",flexShrink:0}}>
      <div className="px-4 py-5 border-b" style={{borderColor:T.headerBorder}}>
        {collapsed
          ? <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:`linear-gradient(135deg,${T.accent},${T.accent}bb)`}}>{logo}</div>
          : <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{background:`linear-gradient(135deg,${T.accent},${T.accent}bb)`}}>{logo}</div>
              <div><p className="font-black text-xs leading-tight" style={{color:T.text}}>{shopName.toUpperCase().slice(0,14)}</p><p className="text-xs font-medium" style={{color:"#22c55e"}}>Gestion</p></div>
            </div>
        }
      </div>
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto px-2">
        {nav.map(item=>(
          <button key={item.id} onClick={()=>setActive(item.id)} title={collapsed?item.label:""} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left" style={{background:active===item.id?T.navActive:"transparent",color:active===item.id?T.accent:T.navText,borderLeft:active===item.id?`2px solid ${T.navActiveBorder}`:"2px solid transparent"}}>
            <span className="flex-shrink-0"><Icon name={item.icon} size={18}/></span>
            {!collapsed&&<span className="text-xs font-semibold truncate">{item.label}</span>}
          </button>
        ))}
      </nav>
      <div className="px-2 py-3 border-t" style={{borderColor:T.headerBorder}}>
        {!collapsed
          ? <div className="px-3 py-2 rounded-xl" style={{background:T.userCard}}>
              <p className="text-xs font-semibold truncate" style={{color:T.text}}>{user.name}</p>
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
  const [products,  setProducts]  = useState([]);
  const [sales,     setSales]     = useState([]);
  const [clients,   setClients]   = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [expenses,  setExpenses]  = useState([]);
  const [shopSettings, setShopSettings] = useState(null);
  const [loading, setLoading]     = useState(true);

  const T = THEMES[themeName] || THEMES.dark;

  // Sauvegarder le thème dans localStorage
  useEffect(() => { localStorage.setItem("bfy_theme", themeName); }, [themeName]);

  // Si le rôle n'a pas accès à la page active → rediriger vers dashboard
  useEffect(() => {
    if (user && !canAccess(user.role, active)) setActive("dashboard");
  }, [user, active]);

  // Charger les données depuis Supabase
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      setLoading(true);
      const [p, s, c, sup, e, sets] = await Promise.all([
        supabase.from("products").select("*").order("id"),
        supabase.from("sales").select("*").order("id", { ascending: false }),
        supabase.from("clients").select("*").order("id"),
        supabase.from("suppliers").select("*").order("id"),
        supabase.from("expenses").select("*").order("id", { ascending: false }),
        supabase.from("app_settings").select("key,value"),
      ]);
      // Produits
      if (p.data?.length === 0) { const r = await supabase.from("products").insert(INITIAL_PRODUCTS).select(); setProducts(r.data||[]); } else setProducts(p.data||[]);
      // Ventes
      if (s.data?.length === 0) { const r = await supabase.from("sales").insert(INITIAL_SALES).select(); setSales(r.data||[]); } else setSales(s.data||[]);
      // Clients
      if (c.data?.length === 0) { const r = await supabase.from("clients").insert(INITIAL_CLIENTS).select(); setClients(r.data||[]); } else setClients(c.data||[]);
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
      setLoading(false);
    };
    loadData();
  }, [user]);

  const lowStock = products.filter(p => p.qty <= p.alert);

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
    if (!canAccess(user.role, active)) return <AccessDenied T={T} role={user.role}/>;
    switch (active) {
      case "dashboard":  return <Dashboard products={products} sales={sales} clients={clients} expenses={expenses} T={T} user={user} shopSettings={shopSettings}/>;
      case "products":   return <ProductsPage products={products} setProducts={setProducts} T={T} userRole={user.role}/>;
      case "stock":      return <StockPage products={products} setProducts={setProducts} T={T} userRole={user.role} user={user}/>;
      case "sales":      return <SalesPage products={products} setProducts={setProducts} sales={sales} setSales={setSales} clients={clients} setClients={setClients} T={T} userRole={user.role} shopSettings={shopSettings} user={user}/>;
      case "clients":    return <ClientsPage clients={clients} setClients={setClients} T={T} userRole={user.role}/>;
      case "suppliers":  return <SuppliersPage suppliers={suppliers} setSuppliers={setSuppliers} T={T} userRole={user.role}/>;
      case "expenses":   return <ExpensesPage expenses={expenses} setExpenses={setExpenses} T={T}/>;
      case "users":      return <UsersPage T={T} currentUser={user}/>;
      case "accounting": return <AccountingPage sales={sales} expenses={expenses} T={T}/>;
      case "settings":   return <SettingsPage T={T} themeName={themeName} setThemeName={setThemeName} shopSettings={shopSettings} setShopSettings={setShopSettings}/>;
      default: return null;
    }
  };

  if (!user) return <LoginPage onLogin={setUser}/>;

  const shopName = shopSettings?.shop_name || "BOUMAYAH ET FILS";

  return (
    <div className="flex h-screen overflow-hidden" style={{background:T.bg,fontFamily:"'Segoe UI',sans-serif"}}>
      <Sidebar active={active} setActive={setActive} user={user} onLogout={()=>setUser(null)} collapsed={collapsed} T={T} shopSettings={shopSettings}/>
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

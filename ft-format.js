// ft/utils/format.js — Ficha Técnica v1.0
// Formatadores de números, moeda e unidades.

/** Formata valor em reais: 1234.5 → "R$ 1.234,50" */
export function formatCurrency(n) {
    if (n == null || isNaN(n)) return 'R$ 0,00';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Formata percentual: 0.4 ou 40 → "40,00%" (aceita fração ou inteiro) */
export function formatPercent(n, isDecimal = false) {
    if (n == null || isNaN(n)) return '0,00%';
    const v = isDecimal ? n * 100 : n;
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

/** Formata quantidade com unidade: 120 g, 1,500 kg, 3 uni */
export function formatQtdUnid(qtd, unidade) {
    if (qtd == null) return '—';
    const f = qtd.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
    return `${f} ${unidade}`;
}

/** Formata número simples com casas decimais */
export function formatNum(n, decimais = 2) {
    if (n == null || isNaN(n)) return '0';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: decimais, maximumFractionDigits: decimais });
}

/** Parse de string para float (aceita vírgula como separador decimal) */
export function parseNum(s) {
    if (s == null) return 0;
    const n = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
}

/** Gera ID único: timestamp + random */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Label de tamanho de pizza */
export const TAMANHO_LABEL = { P: 'P (25cm)', M: 'M (30cm)', G: 'G (35cm)', GG: 'GG (40cm)' };

/** Label de unidades */
export const UNIDADE_LABEL = { g: 'g', kg: 'kg', ml: 'ml', l: 'L', uni: 'uni', pct: 'pct' };

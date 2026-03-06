// ft/utils/calc.js — Ficha Técnica v1.0
// Todas as fórmulas de custo, preço e margem.

/**
 * Custo unitário de um ingrediente.
 * Ex: R$12 por 1000g → R$0.012 por g
 */
export function calcCustoUnitario(precoCompra, qtdEmbalagem) {
    if (!qtdEmbalagem || qtdEmbalagem <= 0) return 0;
    return precoCompra / qtdEmbalagem;
}

/**
 * Custo de um ingrediente numa receita.
 * Ex: 120g × R$0.012/g = R$1.44
 */
export function calcCustoIngrediente(quantidade, custoUnitario) {
    return quantidade * custoUnitario;
}

/**
 * Custo total de uma receita a partir da lista de ingredientes.
 * ingredientes: [{ custo: number }, ...]
 */
export function calcCustoReceita(ingredientes) {
    if (!Array.isArray(ingredientes)) return 0;
    return ingredientes.reduce((sum, i) => sum + (i.custo || 0), 0);
}

/**
 * Preço de venda pelo markup (sobre custo).
 * markup = 200 → preço = custo * (1 + 200/100) = custo * 3
 */
export function calcPrecoMarkup(custo, markupPercent) {
    return custo * (1 + markupPercent / 100);
}

/**
 * Preço de venda pela margem desejada (sobre preço de venda).
 * margem = 40% → preço = custo / (1 - 0.40) = custo / 0.60
 */
export function calcPrecoMargem(custo, margemPercent) {
    const margem = margemPercent / 100;
    if (margem >= 1) return 0; // inválido
    return custo / (1 - margem);
}

/**
 * Lucro absoluto.
 */
export function calcLucro(preco, custo) {
    return preco - custo;
}

/**
 * Margem real (% sobre o preço de venda).
 */
export function calcMargemReal(preco, custo) {
    if (!preco || preco <= 0) return 0;
    return ((preco - custo) / preco) * 100;
}

/**
 * Markup implícito (% sobre o custo).
 */
export function calcMarkupImplicito(preco, custo) {
    if (!custo || custo <= 0) return 0;
    return ((preco - custo) / custo) * 100;
}

/**
 * Rendimento de um ingrediente: quantas pizzas por embalagem.
 * Ex: 1000g ÷ 120g/pizza = 8.33 pizzas
 */
export function calcRendimento(qtdEmbalagem, qtdPorPizza) {
    if (!qtdPorPizza || qtdPorPizza <= 0) return 0;
    return qtdEmbalagem / qtdPorPizza;
}

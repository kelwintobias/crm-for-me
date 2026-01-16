import type { ContractSource, ContractPackage } from "@prisma/client";

// ============================================
// PREÇOS DOS PACOTES (REGRA DE NEGÓCIO)
// ============================================

export const PACKAGE_PRICES: Record<ContractPackage, number> = {
    INTERMEDIARIO: 25.00,
    AVANCADO: 40.00,
    ELITE: 50.00,
    PRO_PLUS: 75.00,
    ULTRA_PRO: 100.00,
    EVOLUTION: 150.00,
};

// ============================================
// PREÇOS DOS ADICIONAIS
// ============================================

export const ADDON_PRICES: Record<string, number> = {
    "ATIVACAO_WINDOWS": 19.90,
    "UPBOOST_PLUS": 29.90,
    "REMOCAO_DELAY": 35.90,
    "FORMATACAO_PADRAO": 59.90,
    "FORMATACAO_PROFISSIONAL": 99.90,
};

// Labels para exibição
export const ADDON_LABELS: Record<string, string> = {
    "ATIVACAO_WINDOWS": "Ativação do Windows",
    "UPBOOST_PLUS": "UPBOOST+",
    "REMOCAO_DELAY": "Remoção Delay",
    "FORMATACAO_PADRAO": "Formatação Padrão",
    "FORMATACAO_PROFISSIONAL": "Formatação Profissional",
};

export const PACKAGE_LABELS: Record<ContractPackage, string> = {
    INTERMEDIARIO: "Pacote Intermediário",
    AVANCADO: "Pacote Avançado",
    ELITE: "Pacote Elite",
    PRO_PLUS: "Pacote Pro Plus",
    ULTRA_PRO: "Pacote Ultra Pro",
    EVOLUTION: "Pacote Evolution",
};

export const SOURCE_LABELS: Record<ContractSource, string> = {
    ANUNCIO: "Anúncio",
    INDICACAO: "Indicação",
    INFLUENCIADOR: "Influenciador",
    PARCEIRO: "Parceiro",
};

// ============================================
// HELPER: CALCULAR VALOR TOTAL
// ============================================

export function calculateTotalValue(
    packageType: ContractPackage,
    addons: string[]
): number {
    const packagePrice = PACKAGE_PRICES[packageType];
    const addonsPrice = addons.reduce((sum, addon) => {
        return sum + (ADDON_PRICES[addon] || 0);
    }, 0);
    return packagePrice + addonsPrice;
}

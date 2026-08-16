/**
 * Tokens visuais do Cultive+ Mobile, extraídos das telas do Figma.
 * O verde da marca e a hierarquia de cinzas seguem o sistema web.
 */

export const cores = {
  // Marca
  verde: '#16A34A',
  verdeEscuro: '#14532D',
  verdeClaro: '#20E512',
  verdeGradienteInicio: '#14950A',
  verdeGradienteFim: '#146E28',

  // Superfícies
  fundo: '#F1F5F9',
  cartao: '#FFFFFF',
  cartaoAlt: '#F8FAFC',
  borda: '#E2E8F0',
  bordaForte: '#CBD5E1',

  // Texto
  texto: '#0F172A',
  textoSuave: '#64748B',
  textoFraco: '#94A3B8',
  textoInverso: '#FFFFFF',

  // Estados
  vermelho: '#DC2626',
  vermelhoFundo: '#FEF2F2',
  ambar: '#D97706',
  ambarFundo: '#FFFBEB',
  azul: '#2563EB',
  azulFundo: '#EFF6FF',
  verdeFundo: '#F0FDF4',
  cinzaFundo: '#F1F5F9',
} as const;

export const espacamento = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const raio = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const sombra = {
  cartao: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  destaque: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export const fonte = {
  titulo: 24,
  subtitulo: 18,
  corpo: 15,
  pequeno: 13,
  minusculo: 11,
} as const;

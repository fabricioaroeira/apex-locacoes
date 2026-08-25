// =====================================================================
// Padronização de nomes próprios (empreendimento, endereço, cidade)
// =====================================================================
// REGRA DA CASA: no banco tudo é gravado em CAIXA NATURAL, com acento.
// A CAIXA ALTA do cabeçalho é decisão de layout (text-transform no CSS),
// não de digitação — assim o mesmo nome sai bonito no cabeçalho, na lista
// suspensa, no contrato e no PDF, sem ninguém precisar lembrar da regra.
//
// Por que não gravar em caixa alta: quem digita em CAPS costuma perder o
// acento ("GALPOES"), e não dá para recuperá-lo depois. O caminho contrário
// funciona — "Galpões" vira "GALPÕES" no CSS sem perder nada.
// =====================================================================

// Conectivos que ficam minúsculos no meio do nome (nunca na primeira palavra)
const MINUSCULAS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas',
  'a', 'o', 'as', 'os', 'ao', 'aos', 'à', 'às', 'com', 'para', 'por',
  'sob', 'sobre', 'entre', 'del', 'la', 'el',
]);

// Siglas que devem permanecer em caixa alta mesmo dentro do nome.
// Ampliar esta lista é a forma correta de ensinar uma sigla nova ao sistema.
const SIGLAS = new Set([
  'SOF', 'SIA', 'SCS', 'SCN', 'SBN', 'SBS', 'SEN', 'SES', 'SGA', 'SAAN',
  'SHIS', 'SQN', 'SQS', 'SHN', 'SHS', 'CLN', 'CLS', 'CRS', 'CRN', 'SMAS',
  'ADE', 'QNA', 'QNB', 'QNC', 'QND', 'QNE', 'QNL', 'QNM', 'QNN', 'QNP',
  'DF', 'GO', 'MG', 'SP', 'RJ', 'BA', 'PR', 'SC', 'RS', 'ES', 'MT', 'MS',
  'ABL', 'IPTU', 'CEP', 'LTDA', 'ME', 'EPP', 'SA', 'II', 'III', 'IV',
]);

// Palavras que costumam vir digitadas sem acento. Só entra aqui o que é
// inequívoco — nada de "e"→"é" ou "esta"→"está", que dependem de contexto.
const ACENTOS = {
  galpao: 'Galpão', galpoes: 'Galpões',
  predio: 'Prédio', predios: 'Prédios',
  edificio: 'Edifício', edificios: 'Edifícios',
  condominio: 'Condomínio', condominios: 'Condomínios',
  comercio: 'Comércio', comercial: 'Comercial',
  area: 'Área', areas: 'Áreas',
  nucleo: 'Núcleo', jardim: 'Jardim',
  industria: 'Indústria', industrial: 'Industrial',
  logistica: 'Logística', logistico: 'Logístico',
  servico: 'Serviço', servicos: 'Serviços',
  acacia: 'Acácia', acacias: 'Acácias', ipe: 'Ipê', ipes: 'Ipês',
  aroeira: 'Aroeira', sabia: 'Sabiá', jatoba: 'Jatobá',
  // Siglas que costumam ser digitadas em minúsculo
  jk: 'JK', qi: 'QI', ql: 'QL', qe: 'QE', qs: 'QS', ii: 'II', iii: 'III', iv: 'IV',
  // Localidades do DF e entorno
  brasilia: 'Brasília', goiania: 'Goiânia', ceilandia: 'Ceilândia',
  taguatinga: 'Taguatinga', samambaia: 'Samambaia', guara: 'Guará',
  paranoa: 'Paranoá', itapoa: 'Itapoã', sobradinho: 'Sobradinho',
  planaltina: 'Planaltina', brazlandia: 'Brazlândia', candangolandia: 'Candangolândia',
  aguas: 'Águas', otimo: 'Ótimo', varzea: 'Várzea', sitio: 'Sítio',
  anapolis: 'Anápolis', luziania: 'Luziânia', valparaiso: 'Valparaíso',
};

const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

function palavra(tok, primeira) {
  if (!tok) return tok;

  const min = tok.toLowerCase();
  const cru = semAcento(tok).toUpperCase().replace(/[^A-Z0-9]/g, '');
  // "Já veio em caixa alta" é o sinal de que o usuário quis dizer sigla.
  // Sem essa checagem, "me"/"sa"/"da" seriam promovidos a ME/SA/DA.
  const gritado = tok === tok.toUpperCase() && /\p{L}/u.test(tok);

  // 0. Letra única digitada em caixa alta é designador ("bloco A", "torre B"),
  //    não o artigo "a". Precisa vir antes da regra de conectivo.
  if (gritado && tok.length === 1) return tok;

  // 1. Conectivo no meio do nome — vem ANTES da regra de sigla, senão
  //    "JARDIM DAS ACÁCIAS" congela o "DAS" achando que é sigla curta.
  if (!primeira && MINUSCULAS.has(min)) return min;

  // 2. Sigla conhecida, digitada em caixa alta
  if (gritado && SIGLAS.has(cru)) return cru;

  // 3. Número puro ou alfanumérico de quadra/lote (511, 24, A1) — intocado
  if (/^\d+[a-zA-Z]?$/.test(tok)) return tok;

  // 4. Sigla curta desconhecida, digitada em caixa alta (LET, JK, QI, XP).
  //    Só preserva o que veio gritado: quem digitou minúsculo queria palavra.
  if (gritado && tok.length <= 3) return tok;

  // 5. Palavra que perdeu o acento — ou sigla que o dicionário conhece
  const corrigida = ACENTOS[semAcento(min)];
  if (corrigida) {
    return (!primeira && MINUSCULAS.has(corrigida.toLowerCase())) ? corrigida.toLowerCase() : corrigida;
  }

  // 6. Caso geral: primeira letra maiúscula. Trata hífen e apóstrofo
  //    ("santo-antônio", "d'ávila") como fronteiras de palavra.
  return min.replace(/(^|[-'’])([\p{L}])/gu, (_, sep, letra) => sep + letra.toUpperCase());
}

/**
 * Converte um nome próprio para a caixa natural da casa.
 * "GALPOES SOF NORTE"        → "Galpões SOF Norte"
 * "Let Parque comercial"     → "Let Parque Comercial"
 * "rua 24 norte lote 1"      → "Rua 24 Norte Lote 1"
 * "BRASILIA"                 → "Brasília"
 */
export function padronizarNome(txt) {
  if (!txt) return txt;
  const limpo = String(txt).replace(/\s+/g, ' ').trim();
  if (!limpo) return limpo;
  return limpo.split(' ').map((tok, i) => palavra(tok, i === 0)).join(' ');
}

/** true quando a padronização mudaria alguma coisa — usado para só oferecer o ajuste quando faz diferença. */
export function precisaPadronizar(txt) {
  if (!txt) return false;
  return padronizarNome(txt) !== String(txt).replace(/\s+/g, ' ').trim();
}

const UFS = new Set(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
                     'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']);

/**
 * UF em caixa alta, validada. Devolve '' quando não é uma UF real —
 * melhor um campo vazio do que "Distrito Federal" virar "DI" no cadastro.
 */
export function padronizarUF(txt) {
  const s = String(txt || '').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
  return UFS.has(s) ? s : '';
}

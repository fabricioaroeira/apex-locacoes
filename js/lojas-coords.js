// =====================================================================
// Coordenadas das 52 lojas na planta baixa (em % da imagem 1890x420)
// Versão 2 — refinada com base em medição visual da planta arquitetônica
// =====================================================================
export const LOJAS_COORDS = {
  // ===== Coluna esquerda — 6 lojas pequenas empilhadas (x ~0-3%) =====
  '01': { x: 0.3, y: 1.5,  w: 3.0, h: 17 },
  '02': { x: 0.3, y: 19,   w: 3.0, h: 14 },
  '03': { x: 0.3, y: 33.5, w: 3.0, h: 14 },
  '52': { x: 0.3, y: 48,   w: 3.0, h: 14 },
  '51': { x: 0.3, y: 62.5, w: 3.0, h: 14 },
  '50': { x: 0.3, y: 77,   w: 3.0, h: 17 },

  // ===== Faixa superior =====
  '04': { x: 3.5,  y: 11, w: 6.0, h: 36 },  // bloco grande laranja
  '05': { x: 7.5,  y: 1,  w: 6.5, h: 14 },  // pequena rosa topo

  // Lojas lilás 06-09 (faixa superior central-esquerda)
  '06': { x: 14.4, y: 5,  w: 5.0, h: 42 },
  '07': { x: 19.7, y: 5,  w: 5.0, h: 42 },
  '08': { x: 25.0, y: 5,  w: 5.0, h: 42 },
  '09': { x: 30.3, y: 5,  w: 5.0, h: 42 },

  // Lojas amarelas 10-13
  '10': { x: 35.6, y: 5,  w: 5.0, h: 42 },
  '11': { x: 40.9, y: 5,  w: 5.0, h: 42 },
  '12': { x: 46.2, y: 5,  w: 5.0, h: 42 },
  '13': { x: 51.5, y: 5,  w: 5.0, h: 42 },

  // Galeria 1 (entre 13 e 14) — sem loja em x ~57-61%

  // Lojas verde/azul 14-18
  '14': { x: 61.2, y: 5,  w: 5.0, h: 42 },  // verde
  '15': { x: 66.5, y: 5,  w: 4.8, h: 42 },  // azul claro
  '16': { x: 71.6, y: 5,  w: 4.8, h: 42 },
  '17': { x: 76.7, y: 5,  w: 4.8, h: 42 },
  '18': { x: 81.8, y: 5,  w: 4.8, h: 42 },  // rosa

  // Lojas topo extremo direito
  '19': { x: 79.5, y: 1,  w: 4.2, h: 13 },  // pequena rosa topo
  '20': { x: 86.7, y: 5,  w: 5.0, h: 42 },  // verde grande
  '21': { x: 86.5, y: 1,  w: 4.5, h: 13 },  // pequena verde-água topo

  // ===== Coluna direita vertical (lojas verde-água 22-26) =====
  '22': { x: 91.5, y: 1,  w: 4.5, h: 23 },
  '23': { x: 91.5, y: 24, w: 4.5, h: 14 },
  '24': { x: 91.5, y: 39, w: 4.5, h: 14 },
  '25': { x: 91.5, y: 54, w: 4.5, h: 14 },
  '26': { x: 91.5, y: 78, w: 4.5, h: 20 },

  // Outras lojas no canto direito inferior
  '27': { x: 86.7, y: 60, w: 4.5, h: 22 },
  '28': { x: 80.6, y: 80, w: 6.5, h: 18 },

  // Lojas 29-31 na coluna mais à direita (após 22-26)
  '31': { x: 96.0, y: 50, w: 3.5, h: 14 },
  '30': { x: 96.0, y: 65, w: 3.5, h: 14 },
  '29': { x: 96.0, y: 80, w: 3.5, h: 14 },

  // ===== Faixa inferior =====
  '48': { x: 3.5,  y: 72, w: 3.5, h: 23 },  // rosa pequena esquerda
  '49': { x: 7.3,  y: 50, w: 7.0, h: 49 },  // uso interno preto

  // Lojas lilás 47-41 (faixa inferior central-esquerda)
  '47': { x: 14.4, y: 50, w: 5.0, h: 49 },
  '46': { x: 19.7, y: 50, w: 5.0, h: 49 },
  '45': { x: 25.0, y: 50, w: 5.0, h: 49 },
  '44': { x: 30.3, y: 50, w: 5.0, h: 49 },
  '43': { x: 35.6, y: 50, w: 5.0, h: 49 },
  '42': { x: 40.9, y: 50, w: 5.0, h: 49 },
  '41': { x: 46.2, y: 50, w: 5.0, h: 49 },

  // Lojas amarelas 40-36
  '40': { x: 51.5, y: 50, w: 5.0, h: 49 },

  // Galeria 2 (entre 40 e 39) — sem loja em x ~57-61%

  '39': { x: 61.2, y: 50, w: 5.0, h: 42 },
  '38': { x: 66.5, y: 50, w: 4.8, h: 42 },
  '37': { x: 71.6, y: 50, w: 4.8, h: 42 },
  '36': { x: 76.7, y: 50, w: 4.8, h: 42 },

  // L35 — central inferior abaixo do corredor (verde)
  '35': { x: 73.0, y: 91, w: 6.0, h: 8 },

  // Lojas azuis 34-32 (faixa inferior direita)
  '34': { x: 81.8, y: 50, w: 4.8, h: 42 },  // azul claro
  '33': { x: 86.7, y: 50, w: 4.8, h: 42 },
  '32': { x: 91.5, y: 50, w: 4.5, h: 28 }   // mais estreita (vai até a coluna 22-26)
};

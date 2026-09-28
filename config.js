// Configuração do Medidor do Mapa Regional.
// Escalas, caixas e velocidades ficam todas aqui.

const CONFIG = Object.freeze({
  // Mapa aberto por omissão: o ficheiro "mapa" da pasta media, com a primeira
  // destas extensões que existir (experimenta-as também em maiúsculas)
  ficheiroMapa: 'media/mapa',
  extensoesMapa: ['jpg', 'jpeg', 'png', 'webp', 'avif', 'jfif'],

  // Dimensões da imagem original exportada do PSD, em píxeis
  larguraOriginal: 3372,
  alturaOriginal: 5266,

  // Escala na resolução original. Não multiplicar também pelo fatorVidaReal.
  kmPorPixel: 3.81,
  km2PorPixel: 14.52,

  // Só para o conversor: km da vida real para km do mapa
  fatorVidaReal: 18.51,

  // Caixas à parte, em píxeis da imagem original.
  // Têm a mesma escala do continente, mas não se mede entre zonas diferentes.
  caixas: [
    { nome: 'Taprobana', x: 50, y: 1786, largura: 485, altura: 686 },
    { nome: 'Marrocos', x: 2391, y: 125, largura: 931, altura: 1131 },
    { nome: 'Moçambique', x: 2391, y: 1351, largura: 931, altura: 1291 },
    { nome: 'Angola', x: 2391, y: 2782, largura: 931, altura: 1060 },
    { nome: 'Indonésia', x: 90, y: 3927, largura: 3197, altura: 1251 }
  ],

  // Tempos de viagem, um grupo por botão.
  // kmDia para quem anda por dias, kmh para o resto: [cruzeiro] ou [cruzeiro, máxima].
  // porMar: avisa e pinta os troços que passam por terra.
  velocidades: [
    { grupo: 'Civis', meios: [
      { nome: 'A pé', kmDia: [30] },
      { nome: 'Carro', kmh: [90] },
      { nome: 'Comboio', kmh: [120, 300] },
      { nome: 'Avião', kmh: [800, 900] }
    ] },
    { grupo: 'Mar', porMar: true, meios: [
      { nome: 'Cargueiro', kmh: [37, 46] },
      { nome: 'Navio de guerra', kmh: [33, 56] },
      { nome: 'Porta-aviões', kmh: [46, 59] },
      { nome: 'Submarino', kmh: [37, 56] }
    ] },
    { grupo: 'Militar', meios: [
      { nome: 'Caça', kmh: [900, 2100] },
      { nome: 'Bombardeiro', kmh: [850, 1000] },
      { nome: 'Avião de transporte', kmh: [540, 600] },
      { nome: 'Coluna blindada', kmDia: [150, 250] },
      { nome: 'Infantaria', kmDia: [30, 50] }
    ] }
  ],

  // Cor do mar no mapa. Um píxel é mar se o vermelho não passar vermelhoMax,
  // o verde e o azul estiverem nos intervalos e o azul passar o vermelho em azulMenosVermelho.
  mar: { vermelhoMax: 119, verde: [95, 185], azul: [125, 190], azulMenosVermelho: 40 },

  // Terra seguida, em km, que um troço por mar pode atravessar sem aviso (portos, letras, contornos)
  kmTerraTolerado: 80,

  // Zoom máximo (1 = píxeis da imagem ao tamanho real)
  zoomMaximo: 8,

  // Altura mínima do painel no telemóvel, em fração do ecrã
  alturaMinimaPainel: 0.12,

  // Notificação dos créditos ao abrir o site: probabilidade no computador (mais de 700px de largura)
  // e no telemóvel, segundos a entrar ou sair e parada. Com o rato por cima ou o dedo a tocar fica;
  // sai segundosDepoisDeLargar depois de a largarem, nunca antes de acabar o tempo parada.
  creditos: {
    probabilidadeComputador: 1, probabilidadeTelemovel: 1,
    segundosAnimacao: 0.2, segundosParada: 3, segundosDepoisDeLargar: 1
  }
});

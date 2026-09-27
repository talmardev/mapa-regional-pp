// Configuração do Medidor do Mapa Regional.
// Escalas, caixas e velocidades ficam todas aqui.

const CONFIG = Object.freeze({
  // Mapa aberto por omissão
  ficheiroMapa: 'mapa.jpg',

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

  // Tempos de viagem: kmDia para quem anda por dias, kmh para o resto
  velocidades: [
    { nome: 'A pé', kmDia: 30 },
    { nome: 'Carro', kmh: 90 },
    { nome: 'Comboio', kmh: 120 },
    { nome: 'Avião', kmh: 800 }
  ],

  // Zoom máximo (1 = píxeis da imagem ao tamanho real)
  zoomMaximo: 8
});

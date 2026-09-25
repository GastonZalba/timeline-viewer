import Timeline from '../dist/TimelineViewer.js';
import mockData from './mock-data.js';

// Uso: abrir index.html con ?api para probar el modo API contra el mock.
const useApi = new URLSearchParams(window.location.search).has('api');

const baseOptions = {
  container: '#noticias-container',
  featuredCount: 10,
  itemsPerPage: 10,
  inlineImages: true,
  inlineAdjuntos: true,
  internalButtons: true,
  relatedLabel: (count) => (count === 1 ? 'artículo relacionado' : 'artículos relacionados')
};

if (useApi) {
  new Timeline({
    ...baseOptions,
    api: { url: '/api' }
  });
} else {
  new Timeline({
    ...baseOptions,
    items: mockData.items,
    lastUpdated: mockData.lastUpdated
  });
}

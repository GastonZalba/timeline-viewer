import Timeline from '../dist/TimelineViewer.js';
import mockData from './mock-data.js';

// Uso: abrir index.html con ?api para probar el modo API contra el mock.
// ?id=FUE-0001 (opcional) renderiza solo esa tarjeta, ya expandida.
// El menú de información muestra el ID con el icono "Ir" hacia esa misma vista (singleUrl).
// En el modo single, singleTaxonomies agrega un bloque de links de navegación al pie de la tarjeta.
const useApi = new URLSearchParams(window.location.search).has('api');
const singleId = new URLSearchParams(window.location.search).get('id');

// Un item acepta `content` como string (se escapa y se muestra como texto) o como HTMLElement
// (se mueve dentro del link, tal cual viene). Los labels largos del grupo se cropean con "..."
// y el texto completo aparece en el tooltip (title).
const publisherTag = document.createElement('em');
publisherTag.textContent = 'Cronista';

const baseOptions = {
  container: '#noticias-container',
  featuredCount: 10,
  itemsPerPage: 10,
  inlineImages: true,
  inlineAdjuntos: true,
  internalButtons: true,
  relatedLabel: (count) =>
    count === 1 ? 'publicación relacionada' : 'publicaciones relacionadas',
  singleId,
  singleUrl: '?id={id}',
  singleTaxonomies: [
    {
      label: 'Fuentes oficiales',
      items: [
        { content: 'Boletín Oficial', link: 'https://www.boletinoficial.gob.ar/' },
        { content: 'Infoleg', link: 'https://www.infoleg.gob.ar/' }
      ]
    },
    {
      label: 'También en',
      items: [
        { content: publisherTag, link: 'https://www.cronista.com/' },
        {
          content: 'Semanario:|de esta publicación, en la edición del domingo',
          link: 'https://www.semanario.com.uy/'
        }
      ]
    },
    {
      // Label deliberadamente largo: se verifica el crop con "..." y el tooltip con el texto completo.
      label: 'Taxonomías y fuentes consultadas durante la verificación de este artículo',
      items: [
        { content: 'Salud & Bienestar', link: 'https://example.com/salud' },
        { content: 'A < B & C > D', link: 'https://example.com/notas' }
      ]
    }
  ]
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

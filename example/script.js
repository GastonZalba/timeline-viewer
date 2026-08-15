import Timeline from '../dist/TimelineViewer.js';
import mockData from './mock-data.js';

new Timeline({
  container: '#noticias-container',
  items: mockData.items,
  lastUpdated: mockData.lastUpdated,
  featuredCount: 10,
  itemsPerPage: 10,
  inlineImages: true
});

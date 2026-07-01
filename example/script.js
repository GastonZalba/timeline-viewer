import Timeline from '../src/TimelineViewer.js';
import mockData from './mock-data.js';

new Timeline({
  container: '#noticias-container',
  items: mockData.items,
  lastUpdated: mockData.lastUpdated,
  featuredCount: 12,
  itemsPerPage: 10
});

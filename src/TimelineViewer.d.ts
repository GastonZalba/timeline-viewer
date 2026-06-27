export interface ItemTema {
  title: string;
  desc: string;
  tone: 'positivo' | 'negativo' | 'neutro';
}

export interface TimelineItem {
  id: number | string;
  title: string;
  description: string;
  date: string;
  crawlDate: string;
  tone: 'positivo' | 'negativo' | 'neutro';
  fuente: string;
  image: string | null;
  link: string;
  protagonista: string[];
  hasPdf: boolean;
  images: string[];
  temas: ItemTema[];
}

export interface TimelineOptions {
  container: string | HTMLElement;
  items?: TimelineItem[];
  featuredCount?: number;
  lastUpdated?: string;
}

export default class Timeline {
  constructor(options: TimelineOptions);
}

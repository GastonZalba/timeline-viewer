export interface ItemTema {
  titulo: string;
  resumen: string;
  tono_social: 'Positivo' | 'Negativo' | 'Neutro';
}

export interface TimelineItem {
  id: number | string;
  nombre_fuente: string;
  resumen_ia: string;
  fecha_publicacion: string;
  fecha_scrapeo: string;
  tono_social: 'Positivo' | 'Negativo' | 'Neutro';
  fuente_institucional: string;
  tipo_fuente: string;
  thumbnail: string | null;
  link_web: string;
  actores_principales: string[];
  screenshot: string | null;
  imagenes: { thumb: string; full: string }[];
  temas: ItemTema[];
}

export interface TimelineOptions {
  container: string | HTMLElement;
  items?: TimelineItem[];
  featuredCount?: number;
  lastUpdated?: string;
  itemsPerPage?: number;
}

export default class Timeline {
  constructor(options: TimelineOptions);
}

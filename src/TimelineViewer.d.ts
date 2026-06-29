export interface ItemTema {
  titulo: string;
  resumen: string;
  tono_social: 'positivo' | 'negativo' | 'neutro';
}

export interface TimelineItem {
  id: number | string;
  nombre_fuente: string;
  resumen_ia: string;
  fecha_publicacion: string;
  crawlDate: string;
  tono_social: 'positivo' | 'negativo' | 'neutro';
  fuente_institucional: string;
  tipo_medio: string;
  link_portada: string | null;
  link_web: string;
  actores_principales: string[];
  hasCapture: boolean;
  imagenes: string[];
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

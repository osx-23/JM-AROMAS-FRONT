export type Audiencia = 'Mujer' | 'Hombre' | 'Unisex';
export type Familia = 'Floral' | 'Amaderada' | 'Cítrica' | 'Fresca' | 'Oriental' | 'Frutal';
export type Tono = 'rosa' | 'ambar' | 'verde' | 'azul' | 'lila' | 'marfil' | 'dorado' | 'arena';

export interface Producto {
  id: string; slug: string; nombre: string; marca: string; descripcion: string;
  precio: number; precioAnterior?: number; disponible: boolean; ml?: number;
  audiencia: Audiencia | 'Sin clasificar'; familia: Familia | 'Sin clasificar';
  categoria: string; notas: string[]; tono: Tono; demo: boolean;
  imagenes: string[];
}
export interface LineaCarrito { producto: Producto; cantidad: number; }

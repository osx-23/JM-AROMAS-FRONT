export type Audiencia = 'Mujer' | 'Hombre' | 'Unisex';
export type Familia = 'Floral' | 'Amaderada' | 'Cítrica' | 'Fresca' | 'Oriental' | 'Frutal';
export type Tono = 'rosa' | 'ambar' | 'verde' | 'azul' | 'lila' | 'marfil' | 'dorado' | 'arena';

export interface Producto {
  id: string; slug: string; nombre: string; marca: string; descripcion: string;
  precio: number; precioAnterior?: number; disponible: boolean; ml?: number;
  audiencia: Audiencia | 'Sin clasificar'; familia: Familia | 'Sin clasificar';
  categoria: string; notas: string[]; tono: Tono; demo: boolean;
}
export interface LineaCarrito { producto: Producto; cantidad: number; }

// Datos claramente ficticios: no se publican como inventario real.
export const PRODUCTOS_DEMO: Producto[] = [
  { id:'ej-1',slug:'aura-floral-ejemplo',nombre:'Aura Floral',marca:'JM-AROMAS',descripcion:'Un bouquet luminoso y delicado para todos los días.',precio:89.90,precioAnterior:119.90,disponible:true,ml:50,audiencia:'Mujer',familia:'Floral',categoria:'Perfumes',notas:['Rosa','Peonía','Almizcle'],tono:'rosa',demo:true },
  { id:'ej-2',slug:'noche-ambar-ejemplo',nombre:'Noche Ámbar',marca:'JM-AROMAS',descripcion:'Una fragancia profunda con carácter y calidez.',precio:129,disponible:true,ml:100,audiencia:'Hombre',familia:'Oriental',categoria:'Perfumes',notas:['Ámbar','Vainilla','Especias'],tono:'ambar',demo:true },
  { id:'ej-3',slug:'brisa-citrica-ejemplo',nombre:'Brisa Cítrica',marca:'JM-AROMAS',descripcion:'Frescura vibrante con notas alegres y brillantes.',precio:75,precioAnterior:95,disponible:true,ml:60,audiencia:'Unisex',familia:'Cítrica',categoria:'Perfumes',notas:['Bergamota','Limón','Neroli'],tono:'verde',demo:true },
  { id:'ej-4',slug:'madera-noble-ejemplo',nombre:'Madera Noble',marca:'JM-AROMAS',descripcion:'Acordes elegantes de madera para cualquier ocasión.',precio:149,disponible:true,ml:100,audiencia:'Hombre',familia:'Amaderada',categoria:'Perfumes',notas:['Cedro','Vetiver','Sándalo'],tono:'arena',demo:true },
  { id:'ej-5',slug:'jardin-rosa-ejemplo',nombre:'Jardín Rosa',marca:'JM-AROMAS',descripcion:'Un aroma romántico con frutas y pétalos.',precio:99,precioAnterior:140,disponible:true,ml:50,audiencia:'Mujer',familia:'Frutal',categoria:'Perfumes',notas:['Frambuesa','Rosa','Jazmín'],tono:'lila',demo:true },
  { id:'ej-6',slug:'oceano-ejemplo',nombre:'Océano',marca:'JM-AROMAS',descripcion:'Sensación fresca y limpia con acentos marinos.',precio:110,disponible:true,ml:75,audiencia:'Unisex',familia:'Fresca',categoria:'Perfumes',notas:['Notas marinas','Menta','Cedro'],tono:'azul',demo:true },
  { id:'ej-7',slug:'ambar-dorado-ejemplo',nombre:'Ámbar Dorado',marca:'JM-AROMAS',descripcion:'Notas cálidas para dejar una impresión memorable.',precio:139.90,precioAnterior:169,disponible:true,ml:80,audiencia:'Mujer',familia:'Oriental',categoria:'Perfumes',notas:['Ámbar','Mandarina','Vainilla'],tono:'dorado',demo:true },
  { id:'ej-8',slug:'luz-serena-ejemplo',nombre:'Luz Serena',marca:'JM-AROMAS',descripcion:'Flores blancas y una textura suave y envolvente.',precio:85,disponible:true,ml:50,audiencia:'Mujer',familia:'Floral',categoria:'Perfumes',notas:['Lirio','Jazmín','Almizcle'],tono:'marfil',demo:true }
];

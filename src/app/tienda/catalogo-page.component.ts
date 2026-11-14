import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Session } from '@supabase/supabase-js';
import { AuthService, RolJmAromas } from '../auth/auth.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { CatalogoService, ProductoApi } from './data-access/catalogo.service';
import { Audiencia, Familia, LineaCarrito, Producto, Tono } from './models/producto.model';

@Component({
  selector: 'app-catalogo-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './catalogo-page.component.html',
  styleUrls: ['./catalogo-page.component.css']
})
export class CatalogoPageComponent implements OnInit, OnDestroy {
  private readonly catalogo = inject(CatalogoService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);
  private cancelarAuth?: () => void;
  private temporizadorPortada?: ReturnType<typeof setInterval>;
  private readonly intervaloPortadaMs = 5500;
  indicePortada = 0;
  portadaEnPausa = false;
  portadaHover = false;
  portadaConFoco = false;
  sesion: Session | null = null;
  rol: RolJmAromas | null = null;
  errorAuth = '';
  productos: Producto[] = [];
  cargando = true;
  apiSinConexion = false;
  busqueda = '';
  publico: Audiencia | 'Todos' = 'Todos';
  categoriaSeleccionada = 'Todas';
  readonly categorias = ['Perfumes','Cuidado personal','Cuidado de rostro','Maquillaje','Bebés y niños'];
  familia: Familia | 'Todas' = 'Todas';
  precioMaximo = 1000;
  soloPromociones = false;
  mlSeleccionado:number|null=null;
  orden = 'destacados';
  carrito: LineaCarrito[] = [];
  abiertoCarrito = false;
  abiertoFiltros = false;
  abiertoMenu = false;
  detalle: Producto | null = null;
  indiceFotoDetalle=0;
  readonly publicos: (Audiencia | 'Todos')[] = ['Todos','Mujer','Hombre','Unisex'];
  readonly familias: Familia[] = ['Floral','Amaderada','Cítrica','Fresca','Oriental','Frutal'];
  private filtradoCache: { clave:string; origen:Producto[]; resultado:Producto[] } | null=null;
  private presentacionesCache: { origen:Producto[]; valores:number[] } | null=null;
  private readonly formatoMoneda = new Intl.NumberFormat('es-PE', {style:'currency',currency:'PEN'});
  trackProducto(_index:number, producto:Producto):string {return producto.id;}
  trackCarrito(_index:number, item:LineaCarrito):string {return item.producto.id;}


  ngOnInit(): void {
    const evento = this.auth.client.auth.onAuthStateChange((_event, session) => {
      // Evitar solicitudes HTTP dentro de la devolución de Supabase Auth.
      queueMicrotask(() => void this.actualizarSesion(session));
    });
    this.cancelarAuth = () => evento.data.subscription.unsubscribe();
    void this.auth.sesion().then(session => this.actualizarSesion(session))
      .catch(() => { this.errorAuth = 'No fue posible comprobar la sesión.'; });
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.cargando = true;
    this.apiSinConexion = false;
    this.catalogo.listar().subscribe({
      next: data => {
        // No mostrar inventario de ejemplo: exclusivamente datos publicados por la API.
        this.productos = data.map(p => this.transformar(p));
        this.indicePortada = 0;
        this.iniciarCarruselPortada();
        this.apiSinConexion = false;
        this.cargando = false;
      },
      error: () => {
        this.productos = [];
        this.detenerCarruselPortada();
        this.indicePortada = 0;
        this.apiSinConexion = true;
        this.cargando = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.detenerCarruselPortada();
    this.cancelarAuth?.();
  }

  get nombreCuenta(): string {
    const correo = this.sesion?.user.email || '';
    const nombre = this.sesion?.user.user_metadata?.['full_name'];
    return typeof nombre === 'string' && nombre.trim()
      ? nombre.split(' ')[0] : (correo ? correo.split('@')[0] : 'Mi cuenta');
  }

  private async actualizarSesion(sesion: Session | null): Promise<void> {
    this.sesion = sesion;
    this.rol = null;
    this.errorAuth = '';
    if (!sesion) return;
    try {
      const identity = await this.auth.identidadConToken(sesion.access_token);
      if (this.sesion?.access_token === sesion.access_token) this.rol = identity.rol;
    } catch {
      this.errorAuth = 'No se pudieron verificar los permisos de la cuenta.';
    }
  }

  async cerrarSesion(): Promise<void> {
    try {
      await this.auth.cerrarSesion();
      this.sesion = null;
      this.rol = null;
    } catch {
      this.errorAuth = 'No se pudo cerrar la sesión. Inténtalo otra vez.';
    }
  }

  private transformar(p: ProductoApi): Producto {
    const categoria = p.categoria ?? 'Perfumes';
    return {
      id: p.id, slug: p.slug, nombre: p.nombre,
      marca: p.marca || 'JM-AROMAS', descripcion: p.descripcion || '',
      precio: Number(p.precio), disponible: p.disponible,
      categoria,
      audiencia: p.publicoObjetivo==='HOMBRE'?'Hombre':
        p.publicoObjetivo==='MUJER'?'Mujer':
        p.publicoObjetivo==='UNISEX'?'Unisex':'Sin clasificar',
      familia: p.familiaOlfativa && this.familias.includes(p.familiaOlfativa as Familia)
        ? p.familiaOlfativa as Familia : 'Sin clasificar',
      precioAnterior: p.precioAnterior==null?undefined:Number(p.precioAnterior),
      ml: p.contenidoMl??undefined,
      gramos: p.contenidoGramos??undefined,
      notas: [], tono: 'marfil' as Tono, demo: false,
      imagenes: Array.isArray(p.imagenes) ? p.imagenes : []
    };
  }

  /** Incluye todos los artículos del catálogo público, incluso sin fotografía. */
  get productoPortada(): Producto | null {
    if (!this.productos.length) return null;
    return this.productos[this.indicePortada % this.productos.length];
  }

  get totalProductosPortada(): number { return this.productos.length; }

  private detenerCarruselPortada(): void {
    if (this.temporizadorPortada !== undefined) {
      clearInterval(this.temporizadorPortada);
      this.temporizadorPortada = undefined;
    }
  }

  private iniciarCarruselPortada(): void {
    this.detenerCarruselPortada();
    if (this.totalProductosPortada < 2) return;
    this.temporizadorPortada = setInterval(() => {
      if (this.portadaEnPausa || this.portadaHover || this.portadaConFoco || document.hidden || this.detalle || this.abiertoCarrito) return;
      this.indicePortada = (this.indicePortada + 1) % this.totalProductosPortada;
    }, this.intervaloPortadaMs);
  }

  cambiarPortada(delta: number): void {
    if (this.totalProductosPortada < 2) return;
    this.indicePortada = (this.indicePortada + delta + this.totalProductosPortada) % this.totalProductosPortada;
    this.iniciarCarruselPortada();
  }

  seleccionarPortada(indice: number): void {
    if (indice < 0 || indice >= this.totalProductosPortada) return;
    this.indicePortada = indice;
    this.iniciarCarruselPortada();
  }

  pausarPortada(pausar: boolean): void {
    this.portadaEnPausa = pausar;
  }

  hoverPortada(hover: boolean): void {
    this.portadaHover = hover;
  }

  enfocarPortada(enfocada: boolean): void {
    this.portadaConFoco = enfocada;
  }

  @HostListener('document:visibilitychange')
  controlarVisibilidadPortada(): void {
    if (!document.hidden) this.iniciarCarruselPortada();
  }

  get presentaciones(): number[] {
    if (this.presentacionesCache?.origen===this.productos)
      return this.presentacionesCache.valores;
    const valores = [...new Set(this.productos
      .map(p=>p.ml)
      .filter((ml):ml is number=>typeof ml==='number' && ml>0))]
      .sort((a,b)=>a-b);
    this.presentacionesCache = { origen:this.productos, valores };
    return valores;
  }

  get filtrados(): Producto[] {
    // Evita filtrar y ordenar el catálogo repetidamente en un mismo ciclo de Angular.
    const clave = JSON.stringify([this.busqueda, this.publico, this.familia,
      this.precioMaximo, this.soloPromociones, this.mlSeleccionado, this.orden, this.categoriaSeleccionada]);
    if (this.filtradoCache?.clave===clave && this.filtradoCache.origen===this.productos)
      return this.filtradoCache.resultado;
    const termino = this.busqueda.trim().toLocaleLowerCase('es-PE');
    const filtrados = this.productos.filter(p => {
      const texto = [p.nombre,p.marca,p.descripcion,p.categoria,p.familia,...p.notas]
        .join(' ').toLocaleLowerCase('es-PE');
      return (!termino || texto.includes(termino)) &&
        (this.publico === 'Todos' || p.audiencia === this.publico) &&
        (this.categoriaSeleccionada === 'Todas' || p.categoria === this.categoriaSeleccionada) &&
        (this.mlSeleccionado===null || p.ml===this.mlSeleccionado) &&
        (this.familia === 'Todas' || p.familia === this.familia) &&
        (!this.soloPromociones || this.enOferta(p)) &&
        p.precio <= this.precioMaximo;
    });
    if (this.orden === 'precio-asc') filtrados.sort((a,b) => a.precio - b.precio);
    if (this.orden === 'precio-desc') filtrados.sort((a,b) => b.precio - a.precio);
    if (this.orden === 'nombre') filtrados.sort((a,b) => a.nombre.localeCompare(b.nombre, 'es'));
    this.filtradoCache = { clave, origen:this.productos, resultado:filtrados };
    return filtrados;
  }

  get cantidadCarrito(): number {
    return this.carrito.reduce((suma, x) => suma + x.cantidad, 0);
  }
  get subtotal(): number {
    return this.carrito.reduce((suma, x) => suma + x.cantidad * x.producto.precio, 0);
  }
  moneda(monto: number): string {
    return this.formatoMoneda.format(monto);
  }
  irInicio(): void {
    this.abiertoMenu=false;
    window.scrollTo({top:0,behavior:'smooth'});
  }
  enOferta(p: Producto): boolean {
    return !!p.precioAnterior && p.precioAnterior > p.precio;
  }
  porcentaje(p: Producto): number {
    return p.precioAnterior ? Math.round((1-p.precio/p.precioAnterior)*100) : 0;
  }
  irCatalogo(): void {
    const catalogo = document.getElementById('catalogo');
    if (!catalogo) return;
    const header = document.getElementById('jm-site-header');
    const margen = (header?.getBoundingClientRect().height || 140) + 12;
    window.scrollTo({
      top: Math.max(0, window.scrollY + catalogo.getBoundingClientRect().top - margen),
      behavior: 'smooth'
    });
  }
  elegirCategoria(categoria: string): void {
    this.limpiar();
    this.categoriaSeleccionada = categoria;
    this.abiertoMenu = false;
    this.abiertoFiltros = false;
    this.irCatalogo();
  }
  elegirOfertas(): void {
    this.limpiar();
    this.soloPromociones = true;
    this.abiertoMenu = false;
    this.irCatalogo();
  }
  elegirPublico(p: Audiencia | 'Todos'): void {
    this.categoriaSeleccionada = 'Perfumes';
    this.publico = p;
    this.abiertoMenu = false;
    this.abiertoFiltros = false;
    this.irCatalogo();
  }
  limpiar(): void {
    this.categoriaSeleccionada = 'Todas';
    this.busqueda = '';
    this.publico = 'Todos';
    this.familia = 'Todas';
    this.precioMaximo = 1000;
    this.soloPromociones = false;
    this.mlSeleccionado = null;
    this.orden = 'destacados';
  }
  agregar(producto: Producto): void {
    if (!producto.disponible) return;
    const existente = this.carrito.find(x => x.producto.id === producto.id);
    if (existente) {
      existente.cantidad++;
    } else {
      this.carrito = [...this.carrito,{producto,cantidad:1}];
    }
    this.detalle = null;
    this.abiertoCarrito = true;
    this.analytics.evento('add_to_cart',{
      currency:'PEN',value:Number(producto.precio),
      items:[{item_id:producto.id,item_name:producto.nombre,
        price:Number(producto.precio),quantity:1}]
    });
  }
  modificarCantidad(id: string, delta: number): void {
    this.carrito = this.carrito
      .map(x => x.producto.id === id ? {...x,cantidad:x.cantidad + delta} : x)
      .filter(x => x.cantidad > 0);
  }
  get carritoConDemo(): boolean { return this.carrito.some(x => x.producto.demo); }
  iniciarCheckout(): void {
    if (this.carrito.length===0 || this.carritoConDemo) return;
    this.analytics.evento('begin_checkout',{
      currency:'PEN',value:Number(this.subtotal.toFixed(2)),
      items:this.carrito.map(x=>({
        item_id:x.producto.id,item_name:x.producto.nombre,
        price:Number(x.producto.precio),quantity:x.cantidad
      }))
    });
    sessionStorage.setItem('jm_checkout_items', JSON.stringify(this.carrito.map(x => ({
      productoId:x.producto.id,nombre:x.producto.nombre,precio:x.producto.precio,
      cantidad:x.cantidad,demo:x.producto.demo
    }))));
    this.abiertoCarrito = false;
    void this.router.navigate(['/checkout']);
  }
  abrirDetalle(p:Producto):void {
    this.detalle=p;this.indiceFotoDetalle=0;
    this.analytics.evento('view_item',{
      currency:'PEN',value:Number(p.precio),
      items:[{item_id:p.id,item_name:p.nombre,price:Number(p.precio),quantity:1}]
    });
  }
  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    this.cerrarOverlays();
    this.abiertoMenu = false;
  }

  cerrarOverlays(): void {
    this.detalle = null;
    this.abiertoCarrito = false;
    this.abiertoFiltros = false;
  }
}

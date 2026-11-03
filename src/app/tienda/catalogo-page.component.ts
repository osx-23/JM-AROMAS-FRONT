import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CatalogoService, ProductoApi } from '../catalogo.service';
import { Audiencia, Familia, LineaCarrito, PRODUCTOS_DEMO, Producto, Tono } from '../productos-demo';

@Component({
  selector: 'app-catalogo-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalogo-page.component.html',
  styleUrls: ['./catalogo-page.component.css']
})
export class CatalogoPageComponent implements OnInit {
  private readonly catalogo = inject(CatalogoService);
  private readonly router = inject(Router);
  productos: Producto[] = [];
  cargando = true;
  modoDemo = false;
  apiSinConexion = false;
  busqueda = '';
  publico: Audiencia | 'Todos' = 'Todos';
  familia: Familia | 'Todas' = 'Todas';
  precioMaximo = 1000;
  soloPromociones = false;
  orden = 'destacados';
  carrito: LineaCarrito[] = [];
  abiertoCarrito = false;
  abiertoFiltros = false;
  abiertoMenu = false;
  detalle: Producto | null = null;
  readonly publicos: (Audiencia | 'Todos')[] = ['Todos','Mujer','Hombre','Unisex'];
  readonly familias: Familia[] = ['Floral','Amaderada','Cítrica','Fresca','Oriental','Frutal'];

  ngOnInit(): void {
    this.catalogo.listar().subscribe({
      next: data => {
        if (data.length > 0) {
          this.productos = data.map(p => this.transformar(p));
          this.modoDemo = false;
        } else {
          this.mostrarDemo(false);
        }
        this.cargando = false;
      },
      error: () => {
        this.mostrarDemo(true);
        this.cargando = false;
      }
    });
  }

  private mostrarDemo(sinConexion: boolean): void {
    this.productos = [...PRODUCTOS_DEMO];
    this.modoDemo = true;
    this.apiSinConexion = sinConexion;
  }

  private transformar(p: ProductoApi): Producto {
    const categoria = p.categoria ?? 'Perfumes';
    const categoriaNormalizada = categoria.toLocaleLowerCase('es-PE');
    const audiencia: Audiencia | 'Sin clasificar' =
      categoriaNormalizada.includes('mujer') || categoriaNormalizada.includes('ella') ? 'Mujer' :
      categoriaNormalizada.includes('hombre') || categoriaNormalizada.includes('él') ? 'Hombre' :
      categoriaNormalizada.includes('unisex') ? 'Unisex' : 'Sin clasificar';
    return {
      id: p.id, slug: p.slug, nombre: p.nombre,
      marca: p.marca || 'JM-AROMAS', descripcion: p.descripcion || '',
      precio: Number(p.precio), disponible: p.disponible,
      categoria, audiencia, familia: 'Sin clasificar',
      notas: [], tono: 'marfil' as Tono, demo: false
    };
  }

  get filtrados(): Producto[] {
    const termino = this.busqueda.trim().toLocaleLowerCase('es-PE');
    const filtrados = this.productos.filter(p => {
      const texto = [p.nombre,p.marca,p.descripcion,p.categoria,p.familia,...p.notas]
        .join(' ').toLocaleLowerCase('es-PE');
      return (!termino || texto.includes(termino)) &&
        (this.publico === 'Todos' || p.audiencia === this.publico) &&
        (this.familia === 'Todas' || p.familia === this.familia) &&
        (!this.soloPromociones || this.enOferta(p)) &&
        p.precio <= this.precioMaximo;
    });
    if (this.orden === 'precio-asc') return filtrados.sort((a,b) => a.precio - b.precio);
    if (this.orden === 'precio-desc') return filtrados.sort((a,b) => b.precio - a.precio);
    if (this.orden === 'nombre') return filtrados.sort((a,b) => a.nombre.localeCompare(b.nombre, 'es'));
    return filtrados;
  }

  get cantidadCarrito(): number {
    return this.carrito.reduce((suma, x) => suma + x.cantidad, 0);
  }
  get subtotal(): number {
    return this.carrito.reduce((suma, x) => suma + x.cantidad * x.producto.precio, 0);
  }
  moneda(monto: number): string {
    return new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(monto);
  }
  enOferta(p: Producto): boolean {
    return !!p.precioAnterior && p.precioAnterior > p.precio;
  }
  porcentaje(p: Producto): number {
    return p.precioAnterior ? Math.round((1-p.precio/p.precioAnterior)*100) : 0;
  }
  irCatalogo(): void {
    document.getElementById('catalogo')?.scrollIntoView({behavior:'smooth'});
  }
  elegirPublico(p: Audiencia | 'Todos'): void {
    this.publico = p;
    this.abiertoMenu = false;
    this.abiertoFiltros = false;
    this.irCatalogo();
  }
  limpiar(): void {
    this.busqueda = '';
    this.publico = 'Todos';
    this.familia = 'Todas';
    this.precioMaximo = 1000;
    this.soloPromociones = false;
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
  }
  modificarCantidad(id: string, delta: number): void {
    this.carrito = this.carrito
      .map(x => x.producto.id === id ? {...x,cantidad:x.cantidad + delta} : x)
      .filter(x => x.cantidad > 0);
  }
  get carritoConDemo(): boolean { return this.carrito.some(x => x.producto.demo); }
  iniciarCheckout(): void {
    if (this.carrito.length===0 || this.carritoConDemo) return;
    sessionStorage.setItem('jm_checkout_items', JSON.stringify(this.carrito.map(x => ({
      productoId:x.producto.id,nombre:x.producto.nombre,precio:x.producto.precio,
      cantidad:x.cantidad,demo:x.producto.demo
    }))));
    this.abiertoCarrito = false;
    void this.router.navigate(['/checkout']);
  }
  cerrarOverlays(): void {
    this.detalle = null;
    this.abiertoCarrito = false;
    this.abiertoFiltros = false;
  }
}

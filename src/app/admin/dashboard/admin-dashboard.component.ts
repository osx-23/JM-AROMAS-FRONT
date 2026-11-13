import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { environment } from '../../../environments/environment';

interface ResumenPedidos {
  pedidosPeriodo: number;
  pedidosPagados: number;
  ingresosConfirmados: number;
  pendientes: number;
  cancelados: number;
}
interface InventarioResumen {
  productosActivos: number;
  publicados: number;
  stockBajo: number;
  sinStock: number;
  valorPrecioLista: number;
}
interface VentaDia { fecha: string; ingresos: number; pedidosPagados: number; }
interface Metodo { metodo: string; cantidad: number; monto: number; }
interface ProductoVendido { nombre: string; sku: string; unidades: number; ingresos: number; }
interface ProductoStock { nombre: string; sku: string; stock: number; publicado: boolean; }
interface PedidoReciente {
  codigo: string; metodoPago: string; estado: string;
  estadoPago: string; total: number; creadoEn: string; canal?: string;
}
interface DatosDashboard {
  periodoDias: number; fechaInicio: string; fechaFin: string; zonaHoraria: string;
  pedidos: ResumenPedidos;
  ventasPresenciales?: { cantidad: number; ingresos: number };
  inventario: InventarioResumen;
  ventasDiarias: VentaDia[];
  metodos: Metodo[];
  masVendidos: ProductoVendido[];
  stockCritico: ProductoStock[];
  pedidosRecientes: PedidoReciente[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly cache = new Map<number, { datos: DatosDashboard; fecha: number }>();
  private readonly ttlMs = 45_000;
  private solicitudActual = 0;

  readonly periodos = [7, 30, 90];
  readonly analyticsConfigurado =
    /^G-[A-Z0-9]+$/i.test(environment.analyticsMeasurementId || '');
  readonly analyticsUrl = 'https://analytics.google.com/';
  dias = 30;
  cargando = true;
  error = '';
  datos: DatosDashboard | null = null;
  ultimaActualizacion: Date | null = null;
  linea = '';
  area = '';
  ventaMaxima = 1;
  maximoVentasProductos = 1;
  totalMetodos = 0;
  menuAbierto = false;
  get ingresosWeb(): number { return Number(this.datos?.pedidos.ingresosConfirmados || 0); }
  get ingresosPresenciales(): number { return Number(this.datos?.ventasPresenciales?.ingresos || 0); }
  get cantidadPresenciales(): number { return Number(this.datos?.ventasPresenciales?.cantidad || 0); }
  get ingresos(): number { return this.ingresosWeb + this.ingresosPresenciales; }
  get ticketPromedio(): number {
    const pagados = Number(this.datos?.pedidos.pedidosPagados || 0) + this.cantidadPresenciales;
    return pagados ? this.ingresos / pagados : 0;
  }

  ngOnInit(): void { void this.cargar(); }

  async cargar(dias = this.dias, forzar = false): Promise<void> {
    if (!this.periodos.includes(dias)) return;
    const solicitud = ++this.solicitudActual;
    this.dias = dias;
    this.error = '';
    const guardado = this.cache.get(dias);
    if (!forzar && guardado && Date.now() - guardado.fecha < this.ttlMs) {
      this.preparar(guardado.datos);
      this.cargando = false;
      this.cdr.markForCheck();
      return;
    }
    this.cargando = true;
    this.cdr.markForCheck();
    try {
      const sesion = await this.auth.sesion();
      if (!sesion) throw new Error('Inicia sesión con Google para ver las métricas.');
      const resultado = await firstValueFrom(this.http.get<DatosDashboard>(
        environment.apiBaseUrl + '/admin/dashboard/resumen',
        {
          params: { dias: String(dias) },
          headers: new HttpHeaders({ Authorization: 'Bearer ' + sesion.access_token })
        }
      ));
      if (solicitud !== this.solicitudActual) return;
      this.cache.set(dias, { datos: resultado, fecha: Date.now() });
      this.preparar(resultado);
      this.ultimaActualizacion = new Date();
    } catch {
      if (solicitud === this.solicitudActual)
        this.error = 'No pudimos recuperar las métricas. Comprueba el backend y tu sesión administrativa.';
    } finally {
      if (solicitud === this.solicitudActual) {
        this.cargando = false;
        this.cdr.markForCheck();
      }
    }
  }

  /** Datos derivados calculados una sola vez por respuesta, no en cada render. */
  private preparar(datos: DatosDashboard): void {
    this.datos = datos;
    this.ventaMaxima = Math.max(1, ...datos.ventasDiarias.map(x => Number(x.ingresos || 0)));
    this.maximoVentasProductos = Math.max(1,
      ...datos.masVendidos.map(x => Number(x.unidades || 0)));
    this.totalMetodos = datos.metodos.reduce((a, x) => a + Number(x.cantidad), 0);
    this.linea = datos.ventasDiarias.map((p, i, valores) => {
      const x = 44 + (valores.length === 1 ? 0 : i * 840 / (valores.length - 1));
      const y = 226 - Number(p.ingresos) / this.ventaMaxima * 178;
      return x.toFixed(2) + ',' + y.toFixed(2);
    }).join(' ');
    this.area = this.linea ? '44,226 ' + this.linea + ' 884,226' : '';
  }

  porcentajeMetodo(m: Metodo): number {
    return this.totalMetodos ? Number(m.cantidad) / this.totalMetodos * 100 : 0;
  }
  porcentajeProducto(p: ProductoVendido): number {
    return Number(p.unidades) / this.maximoVentasProductos * 100;
  }
  trackFecha(_i: number, x: VentaDia): string { return x.fecha; }
  trackProducto(_i: number, x: ProductoVendido): string { return x.sku; }
  trackPedido(_i: number, x: PedidoReciente): string { return x.codigo; }
  trackMetodo(_i: number, x: Metodo): string { return x.metodo; }
  trackStock(_i: number, x: ProductoStock): string { return x.sku; }
  get ventas(): VentaDia[] { return this.datos?.ventasDiarias || []; }

  etiquetaCanal(p: PedidoReciente): string { return p.canal === 'PRESENCIAL' ? 'Tienda física' : 'Tienda web'; }
  etiquetaMetodo(m: string): string {
    return m === 'COORDINAR_WHATSAPP' ? 'WhatsApp'
      : m === 'TRANSFERENCIA' ? 'Transferencia' : m === 'YAPE' ? 'Yape' : m;
  }
  etiquetaEstado(p: PedidoReciente): string {
    if (p.estado === 'CANCELADO' || p.estado === 'VENCIDO')
      return 'Cancelado';
    if (p.estadoPago === 'PAGADO') return 'Pago confirmado';
    if (p.estadoPago === 'PENDIENTE_CONFIRMACION') return 'En revisión';
    return 'Pendiente';
  }
  claseEstado(p: PedidoReciente): string {
    if (p.estado === 'CANCELADO' || p.estado === 'VENCIDO') return 'cancelado';
    return p.estadoPago === 'PAGADO' ? 'pagado' : 'pendiente';
  }
}

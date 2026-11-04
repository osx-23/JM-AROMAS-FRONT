import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
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
  estadoPago: string; total: number; creadoEn: string;
}
interface DatosDashboard {
  periodoDias: number; fechaInicio: string; fechaFin: string; zonaHoraria: string;
  pedidos: ResumenPedidos;
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
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly periodos = [7, 30, 90];
  readonly analyticsConfigurado =
    /^G-[A-Z0-9]+$/i.test(environment.analyticsMeasurementId || '');
  readonly analyticsUrl = 'https://analytics.google.com/';
  dias = 30;
  cargando = true;
  error = '';
  datos: DatosDashboard | null = null;
  ultimaActualizacion: Date | null = null;

  ngOnInit(): void { void this.cargar(); }

  async cargar(dias = this.dias): Promise<void> {
    if (!this.periodos.includes(dias)) return;
    this.dias = dias;
    this.cargando = true;
    this.error = '';
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
      this.datos = resultado;
      this.ultimaActualizacion = new Date();
    } catch {
      this.error = 'No pudimos recuperar las métricas. Comprueba el backend y tu sesión administrativa.';
    } finally {
      this.cargando = false;
    }
  }

  get pedidos(): ResumenPedidos | undefined { return this.datos?.pedidos; }
  get inventario(): InventarioResumen | undefined { return this.datos?.inventario; }
  get ventas(): VentaDia[] { return this.datos?.ventasDiarias || []; }
  get ventaMaxima(): number {
    return Math.max(1, ...this.ventas.map(d => Number(d.ingresos || 0)));
  }
  get ingresos(): number { return Number(this.pedidos?.ingresosConfirmados || 0); }
  get ticketPromedio(): number {
    const pagos = Number(this.pedidos?.pedidosPagados || 0);
    return pagos ? this.ingresos / pagos : 0;
  }
  get maximoVentasProductos(): number {
    return Math.max(1, ...(this.datos?.masVendidos || []).map(p => Number(p.unidades)));
  }
  get totalMetodos(): number {
    return (this.datos?.metodos || []).reduce((a, m) => a + Number(m.cantidad), 0);
  }
  porcentajeMetodo(m: Metodo): number {
    return this.totalMetodos ? Number(m.cantidad) / this.totalMetodos * 100 : 0;
  }
  porcentajeProducto(p: ProductoVendido): number {
    return Number(p.unidades) / this.maximoVentasProductos * 100;
  }

  /** Gráfico SVG accesible con los mismos puntos reflejados en los datos del período. */
  get linea(): string {
    const valores = this.ventas;
    if (!valores.length) return '';
    return valores.map((d, i) => {
      const x = 44 + (valores.length === 1 ? 0 : i * 840 / (valores.length - 1));
      const y = 226 - Number(d.ingresos) / this.ventaMaxima * 178;
      return x.toFixed(2) + ',' + y.toFixed(2);
    }).join(' ');
  }
  get area(): string {
    const points = this.linea;
    return points ? '44,226 ' + points + ' 884,226' : '';
  }
  get totalUnidadesVendidas(): number {
    return (this.datos?.masVendidos || []).reduce((a, p) => a + Number(p.unidades), 0);
  }
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

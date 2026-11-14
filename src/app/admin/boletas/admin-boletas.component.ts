import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { environment } from '../../../environments/environment';

interface PedidoElegible {
  id: string;
  codigo: string;
  clienteNombre: string;
  clienteDni: string;
  metodoPago: string;
  estado: string;
  estadoPago: string;
  total: number;
  creadoEn: string;
}

interface BoletaManual {
  id: string;
  pedidoId: string;
  pedidoCodigo: string;
  serie: string;
  numero: number;
  fechaEmision: string;
  clienteNombre: string;
  estadoValidacion: string;
  modalidad: string;
  total: number;
  creadoEn: string;
}

interface SolicitudBoletaAutomatica {
  id: string;
  pedidoId: string;
  pedidoCodigo: string;
  clienteNombre: string;
  estado: string;
  estadoPago: string;
  modalidad: string;
  total: number;
  creadoEn: string;
  ultimoError: string | null;
}
interface EstadoAutomatizacion {
  modo: string;
  emisionRealHabilitada: boolean;
  registroAutomatico: boolean;
  rucEmisorConfigurado: boolean;
  serieParaSoftwareConfirmada: boolean;
  certificadoDigitalConfigurado: boolean;
  vinculacionSeeContribuyenteConfirmada: boolean;
  transmisionResumenDiarioHabilitada: boolean;
  mensaje: string;
}
interface PreparacionComercial {
  pedidoCodigo: string;
  rucEmisor: string | null;
  tipoComprobante: string;
  total: number;
  moneda: string;
  lineas: {nombre:string;cantidad:number;totalLinea:number}[];
  advertencia: string;
}

@Component({
  selector: 'app-admin-boletas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-boletas.component.html',
  styleUrls: ['./admin-boletas.component.css']
})
export class AdminBoletasComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiBaseUrl + '/admin/boletas';

  cargando = false;
  guardando = false;
  error = '';
  mensaje = '';
  pendientes: PedidoElegible[] = [];
  registradas: BoletaManual[] = [];
  solicitudesAutomaticas: SolicitudBoletaAutomatica[] = [];
  estadoAutomatizacion: EstadoAutomatizacion | null = null;
  preparacion: PreparacionComercial | null = null;
  cargandoPreparacion = false;


  pedidoId = '';
  serie = 'EB01';
  numero: number | null = null;
  fechaEmision = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  emitidaEnSunat = false;

  get pedidoSeleccionado(): PedidoElegible | undefined {
    return this.pendientes.find(p => p.id === this.pedidoId);
  }

  ngOnInit(): void { void this.cargar(); }

  private async cabeceras(): Promise<HttpHeaders> {
    const sesion = await this.auth.sesion();
    if (!sesion) throw new Error('Inicia sesión con una cuenta administradora de JM Aromas.');
    return new HttpHeaders({ Authorization: 'Bearer ' + sesion.access_token });
  }

  async cargar(): Promise<void> {
    this.cargando = true;
    this.error = '';
    try {
      const headers = await this.cabeceras();
      const [pedidos, boletas, automaticas, estado] = await Promise.all([
        firstValueFrom(this.http.get<PedidoElegible[]>(
          this.url + '/pedidos-elegibles', { headers })),
        firstValueFrom(this.http.get<BoletaManual[]>(this.url, { headers })),
        firstValueFrom(this.http.get<SolicitudBoletaAutomatica[]>(
          this.url + '/automaticas', { headers })),
        firstValueFrom(this.http.get<EstadoAutomatizacion>(
          this.url + '/automaticas/configuracion', { headers }))
      ]);
      this.pendientes = pedidos;
      this.registradas = boletas;
      this.solicitudesAutomaticas = automaticas;
      this.estadoAutomatizacion = estado;
      if (this.pedidoId && !pedidos.some(p => p.id === this.pedidoId)) this.pedidoId = '';
    } catch (e) {
      this.error = this.mensajeError(e, 'No se pudo consultar el registro de boletas.');
    } finally {
      this.cargando = false;
    }
  }

  async verPreparacion(id: string): Promise<void> {
    this.cargandoPreparacion = true;
    this.preparacion = null;
    this.error = '';
    try {
      const headers = await this.cabeceras();
      this.preparacion = await firstValueFrom(this.http.get<PreparacionComercial>(
        this.url + '/automaticas/' + encodeURIComponent(id) + '/preparacion',
        { headers }
      ));
    } catch(e) {
      this.error = this.mensajeError(e, 'No se pudo preparar el resumen comercial del pedido.');
    } finally {
      this.cargandoPreparacion = false;
    }
  }

  etiquetaEstadoAutomatico(e: string): string {
    return ({
      PENDIENTE_CONFIGURACION:'Pendiente de habilitación SUNAT',
      LISTA_PARA_EMITIR:'Preparada para emisión',
      GENERANDO:'Procesando',
      ENVIADA:'Enviada a SUNAT',
      ACEPTADA:'Aceptada',
      RECHAZADA:'Rechazada',
      ERROR:'Error de procesamiento',
      DESCARTADA:'Gestionada mediante SEE-SOL'
    } as Record<string,string>)[e] || e;
  }

  async registrar(): Promise<void> {
    if (this.guardando || !this.pedidoId || !this.emitidaEnSunat) return;
    this.error = '';
    this.mensaje = '';
    const serie = this.serie.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(serie) ||
        this.numero === null || !Number.isInteger(this.numero) || this.numero < 1 ||
        this.numero > 99999999 || !this.fechaEmision) {
      this.error = 'Comprueba la serie de cuatro caracteres, el correlativo y la fecha de emisión.';
      return;
    }
    this.guardando = true;
    try {
      const headers = await this.cabeceras();
      const respuesta = await firstValueFrom(this.http.post<{mensaje:string;serie:string;numero:number}>(
        this.url,
        {
          pedidoId: this.pedidoId,
          serie,
          numero: this.numero,
          fechaEmision: this.fechaEmision,
          emitidaEnSunat: true
        },
        { headers }
      ));
      this.mensaje = respuesta.serie + '-' + respuesta.numero
        + ' registrada correctamente. Recuerda que el registro interno no valida la boleta en SUNAT.';
      this.pedidoId = '';
      this.numero = null;
      this.emitidaEnSunat = false;
      await this.cargar();
    } catch (e) {
      this.error = this.mensajeError(e, 'No fue posible registrar la boleta.');
    } finally {
      this.guardando = false;
    }
  }

  private mensajeError(e: unknown, fallback: string): string {
    if (e instanceof Error && !(e instanceof HttpErrorResponse)) return e.message;
    const err = e as HttpErrorResponse;
    const response: unknown = err?.error;
    if (response && typeof response === 'object') {
      const body = response as Record<string, unknown>;
      for (const k of ['error', 'detail', 'message']) {
        const v = body[k];
        if (typeof v === 'string' && v.length < 350 && v.trim()) return v;
      }
    }
    if (err?.status === 409) return 'La boleta o el pedido ya están registrados. Actualiza la lista.';
    if (err?.status === 503) return 'El RUC emisor todavía no está configurado en el backend.';
    if (err?.status === 401 || err?.status === 403)
      return 'Necesitas iniciar sesión con una cuenta administradora autorizada.';
    return fallback;
  }
}

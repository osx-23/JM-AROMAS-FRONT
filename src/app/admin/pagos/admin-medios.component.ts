import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

type Tipo = 'YAPE' | 'TRANSFERENCIA' | 'WHATSAPP';
interface Medio {
  id?: string;
  tipo: Tipo;
  titulo: string;
  titular: string | null;
  numeroYape: string | null;
  qrUrl: string | null;
  banco: string | null;
  numeroCuenta: string | null;
  cci: string | null;
  telefonoWhatsapp: string | null;
  activo: boolean;
  orden: number;
}

function medioVacio(): Medio {
  return {
    tipo: 'YAPE', titulo: 'Yape JM-AROMAS',
    titular: null, numeroYape: null, qrUrl: null,
    banco: null, numeroCuenta: null, cci: null,
    telefonoWhatsapp: null, activo: false, orden: 0
  };
}

/**
 * Administración de medios de cobro. Las credenciales de Storage se mantienen
 * exclusivamente en el backend; el navegador envía únicamente el JWT de ADMIN.
 *
 * Para Yape: al crear se guarda inicialmente inactivo, se sube la imagen QR y
 * luego se aplica el estado solicitado; así nunca se publica un QR inexistente.
 */
@Component({
  selector: 'app-admin-medios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-medios.component.html',
  styleUrls: ['./admin-medios.component.css']
})
export class AdminMediosComponent implements OnInit, OnDestroy {
  @Input({ required: true }) accessToken!: string;
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl + '/admin/medios-pago';
  private readonly limiteBytes = 3 * 1024 * 1024;
  private readonly formatos = ['image/jpeg', 'image/png', 'image/webp'];

  medios: Medio[] = [];
  form: Medio = medioVacio();
  formAbierto = false;
  cargando = false;
  guardando = false;
  qrFile: File | null = null;
  qrPreview: string | null = null;
  arrastrando = false;
  error = '';
  mensaje = '';

  get fotoVisible(): string | null {
    return this.qrPreview || this.form.qrUrl;
  }

  ngOnInit(): void { void this.cargar(); }
  ngOnDestroy(): void { this.liberarVistaPrevia(); }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: 'Bearer ' + this.accessToken });
  }

  private liberarVistaPrevia(): void {
    if (this.qrPreview) URL.revokeObjectURL(this.qrPreview);
    this.qrPreview = null;
    this.qrFile = null;
    this.arrastrando = false;
  }

  private reiniciarMensajes(): void {
    this.error = '';
    this.mensaje = '';
  }

  async cargar(): Promise<void> {
    if (!this.accessToken) return;
    this.cargando = true;
    try {
      this.medios = await firstValueFrom(this.http.get<Medio[]>(
        this.baseUrl, { headers: this.headers() }));
    } catch {
      this.error = 'No se pudo obtener la configuración de cobros.';
    } finally {
      this.cargando = false;
    }
  }

  nuevo(): void {
    this.liberarVistaPrevia();
    this.form = medioVacio();
    this.formAbierto = true;
    this.reiniciarMensajes();
  }

  editar(medio: Medio): void {
    this.liberarVistaPrevia();
    this.form = { ...medio };
    this.formAbierto = true;
    this.reiniciarMensajes();
  }

  cerrar(): void {
    if (this.guardando) return;
    this.liberarVistaPrevia();
    this.formAbierto = false;
  }

  seleccionarQr(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = ''; // Permite seleccionar de nuevo el mismo archivo.
    if (archivo) this.prepararArchivo(archivo);
  }

  arrastrarQr(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.arrastrando = true;
  }

  salirArrastre(event: DragEvent): void {
    event.preventDefault();
    this.arrastrando = false;
  }

  soltarQr(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.arrastrando = false;
    const archivo = event.dataTransfer?.files?.[0];
    if (archivo) this.prepararArchivo(archivo);
  }

  pegarQr(event: ClipboardEvent): void {
    const archivo = Array.from(event.clipboardData?.files ?? [])
      .find(f => this.formatos.includes(f.type));
    if (!archivo) return;
    event.preventDefault();
    this.prepararArchivo(archivo);
  }

  private prepararArchivo(archivo: File): void {
    this.error = '';
    if (!this.formatos.includes(archivo.type) ||
        archivo.size === 0 || archivo.size > this.limiteBytes) {
      this.error = 'Selecciona una imagen JPG, PNG o WEBP de hasta 3 MB.';
      return;
    }
    this.liberarVistaPrevia();
    this.qrFile = archivo;
    this.qrPreview = URL.createObjectURL(archivo);
  }

  quitarQrSeleccionado(): void { this.liberarVistaPrevia(); }

  private async subirImagenQr(id: string): Promise<void> {
    if (!this.qrFile) return;
    const archivo = this.qrFile;
    const body = new FormData();
    body.append('archivo', archivo, archivo.name);
    const respuesta = await firstValueFrom(this.http.post<{ qrUrl: string }>(
      this.baseUrl + '/' + id + '/qr',
      body, { headers: this.headers() }
    ));
    this.form.qrUrl = respuesta.qrUrl;
    this.liberarVistaPrevia();
  }

  async guardar(): Promise<void> {
    if (this.guardando) return;
    this.reiniciarMensajes();

    // No es posible habilitar Yape sin un QR previamente guardado o seleccionado.
    if (this.form.tipo === 'YAPE' && this.form.activo &&
        !this.form.qrUrl && !this.qrFile) {
      this.error = 'Para activar Yape, adjunta primero la fotografía de su código QR.';
      return;
    }
    this.guardando = true;
    let medioCreado = false;
    try {
      if (this.form.id) {
        // En una edición, subir la nueva foto antes de guardar el resto.
        if (this.form.tipo === 'YAPE' && this.qrFile) {
          await this.subirImagenQr(this.form.id);
        }
        await firstValueFrom(this.http.patch(
          this.baseUrl + '/' + this.form.id,
          this.form, { headers: this.headers() }));
      } else {
        const activarAlTerminar = this.form.activo;
        const datosIniciales: Medio = { ...this.form };
        // Un QR recién elegido todavía no existe en Storage.
        if (this.form.tipo === 'YAPE' && this.qrFile) {
          datosIniciales.activo = false;
          datosIniciales.qrUrl = null;
        }
        const resultado = await firstValueFrom(this.http.post<{ id: string }>(
          this.baseUrl, datosIniciales, { headers: this.headers() }));
        this.form.id = resultado.id;
        medioCreado = true;

        if (this.form.tipo === 'YAPE' && this.qrFile) {
          await this.subirImagenQr(resultado.id);
          if (activarAlTerminar) {
            await firstValueFrom(this.http.patch(
              this.baseUrl + '/' + resultado.id,
              { ...this.form, activo: true },
              { headers: this.headers() }));
          }
        }
      }
      this.mensaje = 'Método de pago e imagen QR guardados correctamente.';
      await this.cargar();
    } catch (e) {
      const err = e as HttpErrorResponse;
      const detalle = err.error?.error || err.error?.detail;
      this.error = medioCreado
        ? 'El método fue creado, pero no se completó la subida o activación del QR. ' +
          'Quedó inactivo; revisa la imagen y pulsa Guardar de nuevo.'
        : (detalle || 'No se pudo guardar el método de pago o su imagen QR.');
      await this.cargar();
    } finally {
      this.guardando = false;
    }
  }
}

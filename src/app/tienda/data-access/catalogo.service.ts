import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProductoApi {
  id: string;
  nombre: string;
  slug: string;
  marca: string | null;
  descripcion: string | null;
  precio: number;
  precioAnterior: number | null;
  publicoObjetivo: 'HOMBRE'|'MUJER'|'UNISEX'|null;
  contenidoMl: number | null;
  familiaOlfativa: string | null;
  disponible: boolean;
  categoria: string | null;
  imagenes: string[];
}
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly ttlMs = 60_000;
  private ultimaConsulta = 0;
  private cache$: Observable<ProductoApi[]> | null = null;

  /** Reutiliza el catálogo durante 60 s y evita peticiones duplicadas en navegación. */
  listar(forzar = false): Observable<ProductoApi[]> {
    const vigente = Date.now() - this.ultimaConsulta < this.ttlMs;
    if (!forzar && vigente && this.cache$) return this.cache$;
    this.ultimaConsulta = Date.now();
    this.cache$ = this.http.get<ProductoApi[]>(
      environment.apiBaseUrl + '/productos?pagina=0&tamano=48'
    ).pipe(
      shareReplay({ bufferSize: 1, refCount: false }),
      catchError(error => {
        this.cache$ = null;
        this.ultimaConsulta = 0;
        return throwError(() => error);
      })
    );
    return this.cache$;
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

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
  listar(): Observable<ProductoApi[]> {
    return this.http.get<ProductoApi[]>(environment.apiBaseUrl + '/productos?pagina=0&tamano=48');
  }
}

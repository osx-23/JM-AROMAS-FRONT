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
  disponible: boolean;
  categoria: string | null;
}
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);
  listar(): Observable<ProductoApi[]> {
    return this.http.get<ProductoApi[]>(environment.apiBaseUrl + '/productos?pagina=0&tamano=48');
  }
}

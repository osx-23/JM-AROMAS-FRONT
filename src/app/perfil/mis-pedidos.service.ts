import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export interface ResumenPedido {
  id: string;
  codigo: string;
  estado: string;
  estado_pago: string;
  metodo_pago: string;
  total: number;
  creado_en: string;
  actualizado_en: string;
  expira_en: string | null;
}

/**
 * Lista solo los pedidos del usuario autenticado. PostgREST aplica además
 * la política RLS pedido_propio_lectura (usuario_id = auth.uid()).
 * Las compras como invitado conservan su acceso por enlace privado.
 */
@Injectable({ providedIn: 'root' })
export class MisPedidosService {
  private readonly auth = inject(AuthService);

  async listar(): Promise<ResumenPedido[]> {
    const { data: { user }, error: errorUsuario } = await this.auth.client.auth.getUser();
    if (errorUsuario || !user) throw new Error('Inicia sesión con Google para consultar tus pedidos.');

    const { data, error } = await this.auth.client.from('pedidos')
      .select('id,codigo,estado,estado_pago,metodo_pago,total,creado_en,actualizado_en,expira_en')
      .eq('usuario_id', user.id)
      .order('creado_en', { ascending: false })
      .limit(40);
    if (error) throw new Error('No se pudo consultar el historial de pedidos. Inténtalo nuevamente.');
    return (data || []) as ResumenPedido[];
  }
}

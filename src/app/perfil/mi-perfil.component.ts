import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { PerfilCliente, PerfilClienteService, perfilVacio, validarPerfil } from './perfil-cliente.service';
import { MisPedidosService, ResumenPedido } from './mis-pedidos.service';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.css']
})
export class MiPerfilComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly perfiles = inject(PerfilClienteService);
  private readonly pedidosService = inject(MisPedidosService);
  pedidos: ResumenPedido[] = [];
  cargandoPedidos = false;
  errorPedidos = '';

  datos: PerfilCliente = perfilVacio();
  cargando = true;
  guardando = false;
  sesionIniciada = false;
  error = '';
  mensaje = '';

  async ngOnInit(): Promise<void> { await this.cargar(); }

  async cargar(): Promise<void> {
    this.cargando = true;
    this.error = '';
    try {
      const sesion = await this.auth.sesion();
      this.sesionIniciada = !!sesion;
      if (sesion) {
        const perfil = await this.perfiles.obtener();
        this.datos = perfil.datos;
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'No fue posible cargar Mi perfil.';
    } finally {
      this.cargando = false;
    }
    if (this.sesionIniciada) await this.cargarPedidos();
  }

  async cargarPedidos(): Promise<void> {
    if (!this.sesionIniciada) return;
    this.cargandoPedidos = true;
    this.errorPedidos = '';
    try {
      this.pedidos = await this.pedidosService.listar();
    } catch (e) {
      this.errorPedidos = e instanceof Error ? e.message : 'No pudimos cargar tus pedidos.';
    } finally {
      this.cargandoPedidos = false;
    }
  }

  nombreEstado(estado: string): string {
    return ({
      PENDIENTE: 'Pendiente',
      CONTACTADO: 'En coordinación',
      CONFIRMADO: 'Confirmado',
      PREPARANDO: 'En preparación',
      ENTREGADO: 'Entregado',
      CANCELADO: 'Cancelado'
    } as Record<string, string>)[estado] || estado;
  }

  nombrePago(estado: string): string {
    return ({
      PENDIENTE: 'Pago pendiente',
      PENDIENTE_CONFIRMACION: 'Comprobante en revisión',
      PAGADO: 'Pago confirmado',
      RECHAZADO: 'Comprobante rechazado',
      ANULADO: 'Anulado'
    } as Record<string, string>)[estado] || estado;
  }

  async iniciarGoogle(): Promise<void> {
    try {
      sessionStorage.setItem('jm_auth_next', '/mi-perfil');
      await this.auth.iniciarGoogle();
    } catch {
      sessionStorage.removeItem('jm_auth_next');
      this.error = 'No se pudo iniciar sesión con Google.';
    }
  }

  async guardar(): Promise<void> {
    if (this.guardando || !this.sesionIniciada) return;
    this.error = '';
    this.mensaje = '';
    const error = validarPerfil(this.datos);
    if (error) { this.error = error; return; }
    this.guardando = true;
    try {
      await this.perfiles.guardar(this.datos);
      this.mensaje = 'Tu perfil y dirección de entrega quedaron actualizados para próximas compras.';
      await this.cargar();
      // cargar borra errores; conservar confirmación de guardado.
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'No se pudo guardar tu perfil.';
    } finally {
      this.guardando = false;
    }
  }
}

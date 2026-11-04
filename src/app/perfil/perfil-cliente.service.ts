import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

/** Datos guardados por cada cuenta Google en tablas RLS de Supabase. */
export interface PerfilCliente {
  nombre: string;
  dni: string;
  telefono: string;
  email: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  referencia: string;
}

export interface PerfilGuardado {
  datos: PerfilCliente;
  completo: boolean;
}

export function perfilVacio(email = ''): PerfilCliente {
  return {
    nombre: '', dni: '', telefono: '', email, departamento: 'Lima',
    provincia: 'Lima', distrito: '', direccion: '', referencia: ''
  };
}

/** Validación compartida entre Mi perfil y el checkout, acorde a Spring Boot. */
export function validarPerfil(c: PerfilCliente): string | null {
  const longitud = (valor: string, min: number, max: number) =>
    (valor || '').trim().length >= min && (valor || '').trim().length <= max;
  if (!longitud(c.nombre, 3, 150)) return 'Nombre: escribe entre 3 y 150 caracteres.';
  if (!/^[0-9]{8}$/.test(c.dni.trim())) return 'DNI: introduce exactamente 8 dígitos.';
  if (!/^[0-9]{9,15}$/.test(c.telefono.replace(/[^0-9]/g, '')))
    return 'Teléfono: introduce entre 9 y 15 dígitos.';
  if (!longitud(c.email, 5, 160) || !c.email.includes('@'))
    return 'El correo de Google no es válido.';
  if (!longitud(c.departamento, 2, 100)) return 'Departamento: mínimo 2 caracteres.';
  if (!longitud(c.provincia, 2, 100)) return 'Provincia: mínimo 2 caracteres.';
  if (!longitud(c.distrito, 2, 100)) return 'Distrito: mínimo 2 caracteres.';
  if (!longitud(c.direccion, 5, 250)) return 'Dirección: mínimo 5 caracteres.';
  if ((c.referencia || '').length > 250) return 'Referencia: máximo 250 caracteres.';
  return null;
}

@Injectable({ providedIn: 'root' })
export class PerfilClienteService {
  private readonly auth = inject(AuthService);
  private readonly db = this.auth.client;

  private async usuario() {
    // getUser consulta al servidor Auth y no confía solo en el usuario del navegador.
    const { data, error } = await this.db.auth.getUser();
    if (error || !data.user) throw new Error('Inicia sesión con Google para acceder a Mi perfil.');
    return data.user;
  }

  async obtener(): Promise<PerfilGuardado> {
    const user = await this.usuario();
    const [perfilResult, direccionesResult] = await Promise.all([
      this.db.from('perfiles').select('nombre,telefono,dni')
        .eq('usuario_id', user.id).maybeSingle(),
      this.db.from('direcciones')
        .select('id,departamento,provincia,distrito,linea_direccion,referencia')
        .eq('usuario_id', user.id)
        .order('principal', { ascending: false })
        .order('actualizado_en', { ascending: false })
        .limit(1)
    ]);
    if (perfilResult.error || direccionesResult.error)
      throw new Error('No fue posible recuperar los datos de tu cuenta. Intenta nuevamente.');
    const p = perfilResult.data;
    const d = direccionesResult.data?.[0];
    const datos: PerfilCliente = {
      ...perfilVacio(user.email || ''),
      nombre: p?.nombre || '',
      telefono: p?.telefono || '',
      dni: p?.dni || '',
      departamento: d?.departamento || 'Lima',
      provincia: d?.provincia || 'Lima',
      distrito: d?.distrito || '',
      direccion: d?.linea_direccion || '',
      referencia: d?.referencia || ''
    };
    return { datos, completo: validarPerfil(datos) === null };
  }

  async guardar(datos: PerfilCliente): Promise<void> {
    const user = await this.usuario();
    const formulario: PerfilCliente = {
      ...datos,
      nombre: datos.nombre.trim(),
      dni: datos.dni.trim(),
      telefono: datos.telefono.trim(),
      departamento: datos.departamento.trim(),
      provincia: datos.provincia.trim(),
      distrito: datos.distrito.trim(),
      direccion: datos.direccion.trim(),
      referencia: (datos.referencia || '').trim(),
      email: user.email || ''
    };
    const error = validarPerfil(formulario);
    if (error) throw new Error(error);

    // RLS comprueba auth.uid() = usuario_id para SELECT, INSERT y UPDATE.
    const { error: errorPerfil } = await this.db.from('perfiles').upsert({
      usuario_id: user.id, nombre: formulario.nombre, telefono: formulario.telefono,
      dni: formulario.dni, actualizado_en: new Date().toISOString()
    }, { onConflict: 'usuario_id' });
    if (errorPerfil) throw new Error('No se pudieron guardar los datos personales.');

    // Reutilizar la dirección principal (o la última) sin generar duplicados.
    const { data: actual, error: errorBuscar } = await this.db.from('direcciones')
      .select('id')
      .eq('usuario_id', user.id)
      .order('principal', { ascending: false })
      .order('actualizado_en', { ascending: false })
      .limit(1);
    if (errorBuscar) throw new Error('No fue posible consultar tu dirección guardada.');

    const direccion = {
      destinatario: formulario.nombre,
      telefono: formulario.telefono,
      departamento: formulario.departamento,
      provincia: formulario.provincia,
      distrito: formulario.distrito,
      linea_direccion: formulario.direccion,
      referencia: formulario.referencia || null,
      principal: true,
      actualizado_en: new Date().toISOString()
    };

    if (actual?.[0]?.id) {
      const { data: guardado, error: errorDireccion } = await this.db.from('direcciones')
        .update(direccion)
        .eq('id', actual[0].id).eq('usuario_id', user.id)
        .select('id').single();
      if (errorDireccion || !guardado)
        throw new Error('Tus datos personales se guardaron, pero no la dirección. Inténtalo otra vez.');
    } else {
      const { error: errorDireccion } = await this.db.from('direcciones')
        .insert({ usuario_id: user.id, ...direccion });
      if (errorDireccion)
        throw new Error('Tus datos personales se guardaron, pero no la dirección. Inténtalo otra vez.');
    }
  }
}

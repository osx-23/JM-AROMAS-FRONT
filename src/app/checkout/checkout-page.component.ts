import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Session } from '@supabase/supabase-js';
import { AuthService } from '../auth/auth.service';
import { PerfilClienteService, perfilVacio } from '../perfil/perfil-cliente.service';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

type TipoMedio='YAPE'|'TRANSFERENCIA'|'WHATSAPP';
interface MedioPago {
  id:string;tipo:TipoMedio;titulo:string;titular:string|null;
  numeroYape:string|null;qrUrl:string|null;banco:string|null;
  numeroCuenta:string|null;cci:string|null;telefonoWhatsApp:string|null;
}
interface CompraItem { productoId:string; nombre:string; precio:number; cantidad:number; demo:boolean; }
interface ZonaEntrega {
  id:string;grupo:string;distrito:string;etiqueta:string;precio:number;departamento:string;
}
interface AgenciaShalom {id:string;grupo:string;nombre:string;}
interface OpcionesEntrega {
  zonasLima:ZonaEntrega[];agenciasShalom:AgenciaShalom[];
  directorioOficialShalom:string;advertenciaAgencias:string;notaTarifaShalom:string;
}
interface PedidoRespuesta {
  id:string;codigo:string;tokenConsulta:string;estado:string;estadoPago:string;
  metodoPago:string;totalProductos:number;costoEntrega:number;totalPedido:number;
  metodoEntrega:string;descripcionEntrega:string;envio:string;reservaHoras:number;
  articulos?:{nombre:string;sku:string;cantidad:number;precioUnitario:number;totalLinea:number}[];
}
interface ClienteForm {
  nombre:string;dni:string;telefono:string;email:string;
  departamento:string;provincia:string;distrito:string;
  direccion:string;referencia:string;
}

@Component({
  selector:'app-checkout-page',
  standalone:true,
  imports:[CommonModule,FormsModule,RouterLink],
  templateUrl:'./checkout-page.component.html',
  styleUrls:['./checkout-page.component.css']
})
export class CheckoutPageComponent implements OnInit, OnDestroy {
  private readonly http=inject(HttpClient);
  private readonly router=inject(Router);
  private readonly authService=inject(AuthService);
  private readonly perfiles=inject(PerfilClienteService);
  private readonly supabase=this.authService.client;
  sesion:Session|null=null;
  esAdmin=false;
  modoPruebaAdmin=false;
  cargando=false;
  cargandoMetodos=true;
  error='';
  mensaje='';
  medios:MedioPago[]=[];
  items:CompraItem[]=[];
  modo:'WHATSAPP'|'WEB'='WHATSAPP';
  whatsappAbierto=false;
  private readonly idempotencia=crypto.randomUUID();
  medioId='';
  pedido:PedidoRespuesta|null=null;
  archivo:File|null=null;
  vistaComprobante:string|null=null;
  enviando=false;
  datosGuardados=false;
  editarDatosEntrega=true;
  cargandoPerfil=false;
  cliente:ClienteForm=perfilVacio();
  // Instantánea de Mi perfil: nunca se modifica durante el checkout.
  direccionPrincipal:ClienteForm|null=null;
  avisoDireccionEntrega='';
  private ubicacionDeLaDireccion='';
  tipoEntrega:'DELIVERY_LIMA'|'SHALOM'='DELIVERY_LIMA';
  zonaEntregaId='';
  busquedaDistrito='';
  agenciaShalom='';
  avisoZonaPerfil='';
  busquedaAgencia='';
  opcionesEntrega:OpcionesEntrega|null=null;
  cargandoEntregas=true;
  get unidades():number{return this.items.reduce((n,p)=>n+p.cantidad,0);}
  get zonaSeleccionada():ZonaEntrega|undefined{
    return this.opcionesEntrega?.zonasLima.find(z=>z.id===this.zonaEntregaId);
  }
  get agenciaSeleccionada():AgenciaShalom|undefined{
    return this.opcionesEntrega?.agenciasShalom.find(a=>a.id===this.agenciaShalom);
  }
  get costoEnvioEstimado():number {
    if(this.tipoEntrega==='DELIVERY_LIMA')return this.zonaSeleccionada?.precio||0;
    // La tarifa comercial Shalom depende de perfumes, NO de la agencia seleccionada.
    // Mostrar el importe desde que el comprador elige Shalom; para confirmar
    // el pedido sigue siendo obligatorio indicar una agencia real.
    return this.unidades>0 ? 8+2*(this.unidades-1) : 0;
  }
  get mostrarCostoEnvio():boolean {
    return !!this.pedido || (this.tipoEntrega==='DELIVERY_LIMA'
      ? !!this.zonaSeleccionada : this.unidades>0);
  }
  get totalEstimado():number {return this.previo+this.costoEnvioEstimado;}
  private normalizarBusqueda(valor:string):string {
    return (valor||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/\s+/g,' ').toLocaleLowerCase('es-PE');
  }

  private distritoNormalizado(valor:string):string {
    const v=this.normalizarBusqueda(valor);
    return ({
      'smp':'san martin de porres',
      'sjl':'san juan de lurigancho',
      'sjm':'san juan de miraflores',
      'vmt':'villa maria del triunfo',
      'lima':'cercado de lima',
      'cercado':'cercado de lima'
    } as Record<string,string>)[v]||v;
  }

  /** Al escribir otro distrito deja de utilizarse el envío calculado anteriormente. */
  actualizarBusquedaDistrito():void {
    this.zonaEntregaId='';
    this.avisoZonaPerfil='';
  }

  get zonasFiltradas():ZonaEntrega[] {
    const busqueda=this.normalizarBusqueda(this.busquedaDistrito);
    const zonas=this.opcionesEntrega?.zonasLima||[];
    const encontrados=zonas.filter(z=>!busqueda || this.normalizarBusqueda(
      z.etiqueta+' '+z.departamento).includes(busqueda));
    const elegida=this.zonaSeleccionada;
    if(elegida && !encontrados.some(z=>z.id===elegida.id))return [elegida,...encontrados];
    return encontrados;
  }

  get agenciasFiltradas():AgenciaShalom[] {
    const texto=this.normalizarBusqueda(this.busquedaAgencia);
    const agencias=this.opcionesEntrega?.agenciasShalom||[];
    const encontradas=agencias.filter(a=>!texto ||
      this.normalizarBusqueda(a.grupo+' '+a.nombre).includes(texto));
    const elegida=this.agenciaSeleccionada;
    if(elegida && !encontradas.some(a=>a.id===elegida.id))return [elegida,...encontradas];
    return encontradas;
  }

  elegirTipoEntrega(tipo:'DELIVERY_LIMA'|'SHALOM'):void {
    if(this.pedido)return;
    this.tipoEntrega=tipo;
    this.error='';
    if(tipo==='SHALOM' && !this.agenciaShalom && !this.busquedaAgencia)
      this.sugerirAgenciaPerfil();
    if(tipo==='DELIVERY_LIMA' && !this.zonaEntregaId)
      this.sugerirZonaPerfil();
  }

  private claveUbicacionDireccion():string {
    return [this.cliente.departamento,this.cliente.provincia,this.cliente.distrito]
      .map(v=>this.normalizarBusqueda(v)).join('|');
  }

  /** Al cambiar distrito, no conservar la calle de un distrito anterior. */
  private limpiarDireccionAnterior():void {
    const ubicacion=this.claveUbicacionDireccion();
    if(this.ubicacionDeLaDireccion && ubicacion!==this.ubicacionDeLaDireccion){
      this.cliente.direccion='';
      this.cliente.referencia='';
      this.editarDatosEntrega=true;
      this.avisoDireccionEntrega='Completa la calle y número para este destino. '
        +'La dirección principal de Mi perfil no cambiará.';
    }
    this.ubicacionDeLaDireccion=ubicacion;
  }

  seleccionarZona():void {
    const zona=this.zonaSeleccionada;
    this.avisoZonaPerfil='';
    if(!zona)return;
    this.busquedaDistrito=zona.etiqueta;
    this.cliente.departamento=zona.departamento;
    this.cliente.provincia=zona.departamento==='Callao'?'Callao':'Lima';
    this.cliente.distrito=zona.distrito;
    this.limpiarDireccionAnterior();
  }

  /** Reutiliza la dirección principal únicamente en el borrador de este pedido. */
  usarDireccionPrincipal():void {
    const d=this.direccionPrincipal;
    if(!d || this.pedido)return;
    this.cliente={
      ...this.cliente,
      departamento:d.departamento,
      provincia:d.provincia,
      distrito:d.distrito,
      direccion:d.direccion,
      referencia:d.referencia
    };
    this.ubicacionDeLaDireccion=this.claveUbicacionDireccion();
    this.avisoDireccionEntrega='';
    this.zonaEntregaId='';
    this.avisoZonaPerfil='';
    if(this.tipoEntrega==='DELIVERY_LIMA')this.sugerirZonaPerfil();
    this.editarDatosEntrega=!this.datosGuardados;
  }

  /** Conserva la dirección de Mi perfil y sugiere solo zonas inequívocas. */
  private sugerirZonaPerfil():boolean {
    if(!this.opcionesEntrega || !this.cliente.distrito?.trim())return false;
    const dept=this.normalizarBusqueda(this.cliente.departamento);
    const dist=this.distritoNormalizado(this.cliente.distrito);
    const zonas=this.opcionesEntrega.zonasLima.filter(z=>
      this.normalizarBusqueda(z.departamento)===dept &&
      this.normalizarBusqueda(z.distrito)===dist);
    if(!zonas.length)return false;
    this.busquedaDistrito=zonas[0].distrito;
    this.avisoZonaPerfil='';
    const ubicacion=this.normalizarBusqueda(
      (this.cliente.direccion||'')+' '+(this.cliente.referencia||''));
    const especiales=zonas.filter(z=>this.normalizarBusqueda(z.etiqueta)!==dist);
    const coincidencias=especiales.filter(z=>{
      const sector=this.normalizarBusqueda(z.etiqueta)
        .replace(dist,'').replace(/[—–-]/g,'').trim();
      return sector.split('/').some(parte=>parte.trim().length>3 && ubicacion.includes(parte.trim()));
    });
    if(coincidencias.length===1) {
      this.zonaEntregaId=coincidencias[0].id;
      this.busquedaDistrito=coincidencias[0].etiqueta;
    } else if(zonas.length===1) {
      this.zonaEntregaId=zonas[0].id;
      this.busquedaDistrito=zonas[0].etiqueta;
    } else {
      // Distritos con sectores de cobro distinto requieren confirmar el sector.
      this.zonaEntregaId='';
      this.avisoZonaPerfil='Encontramos tu distrito guardado. Selecciona el sector exacto para calcular bien el envío.';
    }
    return true;
  }

  private sugerirAgenciaPerfil():void {
    if(!this.opcionesEntrega || !this.cliente.distrito?.trim())return;
    const agencias=this.opcionesEntrega.agenciasShalom;
    const claves=[this.cliente.provincia,this.cliente.distrito,this.cliente.departamento]
      .map(v=>this.normalizarBusqueda(v)).filter(v=>v.length>2);
    const coincidencia=claves.find(k=>agencias.some(a=>
      this.normalizarBusqueda(a.nombre).includes(k)));
    if(!coincidencia)return;
    this.busquedaAgencia=coincidencia;
    // Una única coincidencia literal permite sugerir agencia sin ambigüedad.
    const exactas=agencias.filter(a=>this.normalizarBusqueda(a.nombre)===coincidencia);
    if(exactas.length===1)this.agenciaShalom=exactas[0].id;
  }

  private sugerirEntregaPerfil():void {
    if(!this.sesion || !this.cliente.distrito?.trim() || !this.opcionesEntrega)return;
    if(this.sugerirZonaPerfil()){
      this.tipoEntrega='DELIVERY_LIMA';
      return;
    }
    this.tipoEntrega='SHALOM';
    this.sugerirAgenciaPerfil();
  }

  /** Los cambios de ubicación solo afectan al borrador de la compra. */
  ubicacionEditada():void {
    this.limpiarDireccionAnterior();
    if(this.tipoEntrega==='DELIVERY_LIMA') {
      this.zonaEntregaId='';
      this.avisoZonaPerfil='Selecciona nuevamente el distrito y sector de entrega.';
      this.busquedaDistrito=this.cliente.distrito||'';
    }
  }

  private async cargarOpcionesEntrega():Promise<void> {
    this.cargandoEntregas=true;
    try {
      this.opcionesEntrega=await firstValueFrom(this.http.get<OpcionesEntrega>(
        environment.apiBaseUrl+'/checkout/entrega/opciones'));
      this.sugerirEntregaPerfil();
    }catch {
      this.error='No se pudieron cargar las tarifas ni agencias. Vuelve a intentarlo.';
    }finally{this.cargandoEntregas=false;}
  }

  get mediosWeb():MedioPago[]{return this.medios.filter(m=>m.tipo==='YAPE'||m.tipo==='TRANSFERENCIA');}
  get tieneWhatsapp():boolean{return this.medios.some(m=>m.tipo==='WHATSAPP');}
  get medio():MedioPago|undefined{
    return this.medios.find(x=>x.id===this.medioId);
  }
  get previo():number{return this.items.reduce((t,p)=>t+p.cantidad*p.precio,0);}
  get esDemo():boolean{return this.items.some(x=>x.demo);}
  get puedeCrear():boolean{
    return this.items.length>0 && !this.esDemo && !this.cargando &&
      !this.cargandoEntregas && !!this.opcionesEntrega &&
      (this.tipoEntrega==='DELIVERY_LIMA'?!!this.zonaEntregaId:!!this.agenciaShalom) &&
      (this.modo==='WHATSAPP'?this.tieneWhatsapp:!!this.medio);
  }
  moneda(n:number):string{
    return new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n);
  }
  async ngOnInit():Promise<void> {
    try{
      const raw=sessionStorage.getItem('jm_checkout_items');
      const parsed:unknown=raw?JSON.parse(raw):[];
      if(Array.isArray(parsed)) {
        this.items=parsed.filter((x):x is CompraItem=>!!x && typeof x.productoId==='string'
          && typeof x.nombre==='string' && Number.isFinite(x.cantidad)
          && Number.isInteger(x.cantidad) && x.cantidad>0 && Number.isFinite(x.precio)
          && typeof x.demo==='boolean').slice(0,20);
      }
    }catch{this.items=[];}
    const {data}=await this.supabase.auth.getSession();
    this.sesion=data.session;
    if(this.sesion){
      try {
        const identidad=await this.authService.identidadConToken(this.sesion.access_token);
        this.esAdmin=identidad.rol==='ADMIN';
      } catch {
        this.esAdmin=false;
      }
      await this.precargarCliente();
    }
    await Promise.all([this.cargarMedios(),this.cargarOpcionesEntrega()]);
  }
  private async cargarMedios():Promise<void>{
    this.cargandoMetodos=true;
    try{
      this.medios=await firstValueFrom(this.http.get<MedioPago[]>(
        environment.apiBaseUrl+'/checkout/medios-pago'));
      this.medioId=this.mediosWeb[0]?.id||'';
      // Solo el backend conoce las modalidades actualmente habilitadas.
      this.modo=this.tieneWhatsapp?'WHATSAPP':'WEB';
    }catch{
      this.error='No se pudieron cargar los medios de pago. Comprueba la API.';
    }finally{this.cargandoMetodos=false;}
  }
  private async precargarCliente():Promise<void>{
    if(!this.sesion)return;
    this.cargandoPerfil=true;
    this.datosGuardados=false;
    this.editarDatosEntrega=true;
    // Aun sin perfil previo, Google proporciona el correo del cliente.
    this.cliente.email=this.sesion.user.email||'';
    try{
      const perfil=await this.perfiles.obtener();
      this.direccionPrincipal={...perfil.datos};
      this.cliente={...perfil.datos,email:this.sesion.user.email||perfil.datos.email};
      this.ubicacionDeLaDireccion=this.claveUbicacionDireccion();
      this.datosGuardados=perfil.completo;
      this.editarDatosEntrega=!perfil.completo;
    }catch{
      this.direccionPrincipal=null;
      this.error='No se pudieron recuperar tus datos guardados. Puedes completar el formulario o editar Mi perfil.';
    }finally{this.cargandoPerfil=false;}
  }

  async iniciarGoogle():Promise<void>{
    try { await this.authService.iniciarGoogle(); }
    catch { this.error='No se pudo iniciar sesión con Google. Revisa OAuth en Supabase.'; }
  }
  async salir():Promise<void>{
    await this.supabase.auth.signOut();
    this.sesion=null;
    this.esAdmin=false;
    this.modoPruebaAdmin=false;
    this.datosGuardados=false;
    this.editarDatosEntrega=true;
    this.cliente=perfilVacio();
    this.direccionPrincipal=null;
    this.ubicacionDeLaDireccion='';
    this.avisoDireccionEntrega='';
  }
  ngOnDestroy():void {this.limpiarComprobante();}

  private limpiarComprobante():void {
    if(this.vistaComprobante)URL.revokeObjectURL(this.vistaComprobante);
    this.vistaComprobante=null;
    this.archivo=null;
  }

  quitarComprobante():void {this.limpiarComprobante();}

  elegirModo(m:'WHATSAPP'|'WEB'):void{
    if(this.pedido)return;
    this.modo=m;
    this.error='';
  }
  copiar(texto:string|null|undefined):void {
    if(texto)void navigator.clipboard.writeText(texto).then(()=>{
      this.mensaje='Dato copiado al portapapeles.';
    }).catch(()=>this.error='No se pudo copiar automáticamente. Selecciona el dato manualmente.');
  }
  archivoSeleccionado(event:Event):void{
    const control=event.target as HTMLInputElement;
    const file=control.files?.[0];
    this.error='';
    if(!file){this.limpiarComprobante();return;}
    if(!['image/png','image/jpeg','image/webp'].includes(file.type) ||
       file.size===0 || file.size>5*1024*1024){
      this.error='Selecciona una foto JPG, PNG o WEBP de máximo 5 MB.';
      control.value='';return;
    }
    this.limpiarComprobante();
    this.archivo=file;
    this.vistaComprobante=URL.createObjectURL(file);
    // Permite elegir nuevamente el mismo archivo después de quitarlo.
    control.value='';
  }
  private validarDatosPedido():string|null {
    const c=this.cliente;
    const longitud=(valor:string,min:number,max:number)=>
      valor.trim().length>=min && valor.trim().length<=max;
    if(!longitud(c.nombre,3,150))return 'Nombre: escribe entre 3 y 150 caracteres.';
    if(!/^\d{8}$/.test(c.dni.trim()))return 'DNI: introduce exactamente 8 dígitos.';
    if(!longitud(c.telefono,8,20))return 'Celular: escribe entre 8 y 20 caracteres.';
    if(this.modo==='WHATSAPP' && !/^\d{9,15}$/.test(c.telefono.replace(/\D/g,'')))
      return 'Celular: indica entre 9 y 15 dígitos, sin letras.';
    if(!longitud(c.email,5,160) || !c.email.includes('@'))
      return 'Correo: introduce una dirección válida.';
    if(!longitud(c.departamento,2,100))return 'Departamento: mínimo 2 caracteres.';
    if(!longitud(c.provincia,2,100))return 'Provincia: mínimo 2 caracteres.';
    if(!longitud(c.distrito,2,100))return 'Distrito: mínimo 2 caracteres.';
    if(!longitud(c.direccion,5,250))return 'Dirección: mínimo 5 caracteres.';
    if(c.referencia.length>250)return 'Referencia: máximo 250 caracteres.';
    if(this.tipoEntrega==='DELIVERY_LIMA' && !this.zonaEntregaId)
      return 'Selecciona una zona de delivery Lima.';
    if(this.tipoEntrega==='SHALOM' && !this.agenciaShalom)
      return 'Selecciona una agencia Shalom.';
    if(this.tipoEntrega==='DELIVERY_LIMA' && this.zonaSeleccionada &&
       (c.departamento.toLowerCase()!==this.zonaSeleccionada.departamento.toLowerCase() ||
        c.distrito.toLowerCase()!==this.zonaSeleccionada.distrito.toLowerCase()))
      return 'Los datos del distrito no corresponden a la zona elegida. Vuelve a seleccionar tu destino.';
    return null;
  }

  private mensajeErrorPedido(error:unknown):string {
    const http=error as HttpErrorResponse;
    let cuerpo:unknown=http?.error;
    if(typeof cuerpo==='string') {
      try {cuerpo=JSON.parse(cuerpo);} catch { /* Puede ser un error HTML */ }
    }
    if(cuerpo && typeof cuerpo==='object') {
      const datos=cuerpo as Record<string,unknown>;
      for(const clave of ['error','detail','message']) {
        if(typeof datos[clave]==='string' && datos[clave])
          return String(datos[clave]);
      }
    }
    if(http?.status===400)
      return 'El servidor rechazó los datos del pedido (400). Revisa los campos y vuelve a intentar.';
    if(http?.status===409)
      return 'Este pedido ya existe o hay un conflicto de disponibilidad. Revisa el estado del pedido.';
    if(http?.status===429)
      return 'Has alcanzado el límite temporal de pedidos. Intenta más tarde.';
    if(http?.status===503)
      return 'La modalidad de compra no está habilitada en el servidor.';
    return 'No fue posible crear el pedido. Comprueba disponibilidad y conexión.';
  }

  async crearPedido():Promise<void>{
    if(!this.puedeCrear)return;
    this.error='';this.mensaje='';
    const errorDatos=this.validarDatosPedido();
    if(errorDatos){this.error=errorDatos;return;}
    this.cargando=true;
    // Ventana abierta por interacción directa: evita el bloqueo de ventanas
    // emergentes tras esperar la respuesta del backend.
    const ventanaWhatsapp=this.modo==='WHATSAPP'
      ?window.open('about:blank','_blank'):null;
    try{
      let authHeaders=this.sesion?.access_token
        ?new HttpHeaders({Authorization:'Bearer '+this.sesion.access_token})
        :undefined;
      if(this.esAdmin && this.modoPruebaAdmin && authHeaders)
        authHeaders=authHeaders.set('X-JM-Test-Order','true');
      const metodoPago=this.modo==='WHATSAPP'?'COORDINAR_WHATSAPP':this.medio?.tipo;
      const body={
        idempotencia:this.idempotencia,
        metodoPago,medioPagoId:this.modo==='WEB'?this.medioId:null,
        cliente:this.cliente,
        articulos:this.items.map(i=>({productoId:i.productoId,cantidad:i.cantidad})),
        guardarDatos:false, // Comprar no modifica Mi perfil: solo se guarda el destino en el pedido.
        metodoEntrega:this.tipoEntrega,
        zonaEntregaId:this.tipoEntrega==='DELIVERY_LIMA'?this.zonaEntregaId:null,
        agenciaShalom:this.tipoEntrega==='SHALOM'?this.agenciaShalom:null
      };
      this.pedido=await firstValueFrom(this.http.post<PedidoRespuesta>(
        environment.apiBaseUrl+'/checkout/pedidos',body,{headers:authHeaders}));
      sessionStorage.setItem('jm_pedido_token_'+this.pedido.id,this.pedido.tokenConsulta);
      this.mensaje='Pedido registrado. Total verificado por el servidor: '+this.moneda(this.pedido.totalPedido)+
        '. Si se abrió WhatsApp, revisa el mensaje y pulsa Enviar.';
      if(this.pedido.metodoPago==='COORDINAR_WHATSAPP' && ventanaWhatsapp){
        ventanaWhatsapp.location.replace(this.urlWhatsapp());
        this.whatsappAbierto=true;
      }else if(ventanaWhatsapp){
        ventanaWhatsapp.close();
      }
    }catch(e:unknown){
      ventanaWhatsapp?.close();
      this.error=this.mensajeErrorPedido(e);
    }finally{this.cargando=false;}
  }
  mensajeWhatsapp():string{
    if(!this.pedido)return '';
    const productos=(this.pedido.articulos||[]).map(i=>
      '- '+i.nombre+' × '+i.cantidad+' — '+this.moneda(Number(i.totalLinea))
    ).join(String.fromCharCode(10));
    return [
      'Hola, JM-AROMAS. Quiero coordinar mi pedido.',
      '',
      '*Pedido:* '+this.pedido.codigo,
      '*Productos:*',
      productos||'Ver detalle con la tienda',
      '*Productos:* '+this.moneda(this.pedido.totalProductos),
      '*Entrega:* '+this.pedido.descripcionEntrega,
      '*Costo de envío:* '+this.moneda(this.pedido.costoEntrega),
      '*Total a pagar:* '+this.moneda(this.pedido.totalPedido),
      '',
      'Quedo atento(a) a la confirmación y a las opciones de entrega.'
    ].join(String.fromCharCode(10));
  }
  urlWhatsapp():string {
    const numero=this.medios.find(m=>m.tipo==='WHATSAPP')?.telefonoWhatsApp?.replace(/\D/g,'');
    return numero?'https://wa.me/'+numero+'?text='+encodeURIComponent(this.mensajeWhatsapp()):'';
  }
  abrirWhatsapp():void{
    if(!this.pedido || this.pedido.metodoPago!=='COORDINAR_WHATSAPP')return;
    const url=this.urlWhatsapp();
    if(!url){this.error='La tienda no tiene WhatsApp activo. Contacta a la administradora.';return;}
    this.whatsappAbierto=true;
    window.open(url,'_blank','noopener,noreferrer');
  }
  copiarMensajeWhatsapp():void {
    this.copiar(this.mensajeWhatsapp());
  }
  async subirEvidencia():Promise<void>{
    if(!this.pedido||!this.archivo||this.enviando)return;
    this.enviando=true;this.error='';
    try{
      const body=new FormData();
      body.append('archivo',this.archivo,this.archivo.name);
      await firstValueFrom(this.http.post(
        environment.apiBaseUrl+'/checkout/pedidos/'+this.pedido.id+'/comprobante',
        body,{headers:new HttpHeaders({'X-Pedido-Token':this.pedido.tokenConsulta})}
      ));
      this.limpiarComprobante();
      this.mensaje='Comprobante recibido. El pago será revisado por la administradora.';
      this.irEstado();
    }catch(e:any){
      this.error=e?.error?.error||e?.error?.detail||
        'No se pudo subir el comprobante. El pedido sigue pendiente; vuelve a intentarlo.';
    }finally{this.enviando=false;}
  }
  irEstado():void{
    if(this.pedido)this.router.navigate(['/pedido',this.pedido.id],{
      fragment:'token='+encodeURIComponent(this.pedido.tokenConsulta)
    });
  }
  enlaceEstado():string{
    if(!this.pedido)return '';
    return window.location.origin+'/pedido/'+this.pedido.id+
      '#token='+encodeURIComponent(this.pedido.tokenConsulta);
  }
}

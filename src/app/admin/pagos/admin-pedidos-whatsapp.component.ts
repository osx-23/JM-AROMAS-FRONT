import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface Pedido {
  id:string; codigo:string; estado:string; estadoPago:string;
  total:number; subtotal:number; descuentoTotal:number; costoEntrega:number;
  metodoEntrega:string; agenciaShalom:string|null; descripcionEntrega:string;
  zonaEntregaId:string|null; metodoPago:string;
  creadoEn:string; expiraEn:string|null;
  clienteNombre:string; clienteTelefono:string; distrito:string;
  departamento:string|null; provincia:string|null;
  direccion:string|null; referencia:string|null;
  tieneEvidencia:boolean; estadoEvidencia:string|null; evidenciaEn:string|null;
}
interface Linea {
  nombre:string; sku:string; cantidad:number;
  precioOriginal:number; descuentoUnitario:number; totalLinea:number;
}
type Pestaña = 'RESUMEN' | 'PAGO' | 'ENTREGA';
type DecisionPago = 'CONFIRMAR' | 'RECHAZAR';

@Component({
  selector:'app-admin-pedidos-whatsapp',
  standalone:true,
  imports:[CommonModule, FormsModule],
  templateUrl:'./admin-pedidos-whatsapp.component.html',
  styleUrls:['./admin-pedidos-whatsapp.component.css']
})
export class AdminPedidosWhatsappComponent implements OnInit, OnDestroy {
  @Input({required:true}) accessToken!:string;
  private readonly http=inject(HttpClient);
  private readonly base=environment.apiBaseUrl+'/admin/pedidos-whatsapp';
  private readonly pagosBase=environment.apiBaseUrl+'/admin/pedidos';

  pedidos:Pedido[]=[];
  buscar='';
  filtro='TODOS';
  soloComprobantes=false;
  modal:Pedido|null=null;
  pestana:Pestaña='RESUMEN';
  lineas:Linea[]=[];
  cargando=false;
  cargandoDetalle=false;
  cargandoEvidencia=false;
  procesando=false;
  evidenciaUrl:string|null=null;
  evidenciaTipo='';
  evidenciaError='';
  verificacionReal=false;
  motivoRechazo='';
  observacionEstado='';
  error='';
  mensaje='';
  errorModal='';
  mensajeModal='';

  ngOnInit():void {void this.cargar();}
  ngOnDestroy():void {this.limpiarEvidencia();}

  @HostListener('document:keydown.escape')
  cerrarConEscape():void {
    if(this.modal && !this.procesando) this.cerrarModal();
  }

  private headers():HttpHeaders {
    return new HttpHeaders({Authorization:'Bearer '+this.accessToken});
  }
  moneda(valor:number|null|undefined):string {
    return new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'})
      .format(Number(valor||0));
  }
  metodoPagoTexto(valor:string):string {
    return ({
      COORDINAR_WHATSAPP:'Coordinación por WhatsApp',
      YAPE:'Yape', TRANSFERENCIA:'Transferencia bancaria'
    } as Record<string,string>)[valor] || valor;
  }
  estadoTexto(estado:string):string {
    return ({
      PENDIENTE:'Pendiente',CONTACTADO:'Contactado',CONFIRMADO:'Pedido confirmado',
      PREPARANDO:'En preparación',EN_CAMINO:'En camino',
      FINALIZADO:'Finalizado',ENTREGADO:'Entregado',CANCELADO:'Cancelado'
    } as Record<string,string>)[estado] || estado;
  }
  estadoPagoTexto(estado:string):string {
    return ({
      PENDIENTE:'Pendiente de pago',PENDIENTE_CONFIRMACION:'Comprobante por revisar',
      PAGADO:'Pago confirmado',RECHAZADO:'Comprobante rechazado',
      ANULADO:'Pago anulado'
    } as Record<string,string>)[estado] || estado;
  }
  entregaTexto(p:Pedido):string {
    return p.descripcionEntrega ||
      (p.metodoEntrega==='SHALOM'?'Recojo en agencia Shalom':'Envío por coordinar');
  }
  get pendientesPago():number {
    return this.pedidos.filter(p=>p.estadoPago==='PENDIENTE_CONFIRMACION').length;
  }
  get enPreparacion():number {
    return this.pedidos.filter(p=>p.estado==='PREPARANDO').length;
  }
  get enCamino():number {
    return this.pedidos.filter(p=>p.estado==='EN_CAMINO').length;
  }
  get pedidosFiltrados():Pedido[] {
    const q=this.buscar.trim().toLocaleLowerCase('es-PE');
    return this.pedidos.filter(p=>
      (this.filtro==='TODOS' || p.estado===this.filtro ||
        (this.filtro==='ACTIVOS' && !['FINALIZADO','ENTREGADO','CANCELADO'].includes(p.estado))) &&
      (!this.soloComprobantes || p.estadoPago==='PENDIENTE_CONFIRMACION') &&
      (!q || [p.codigo,p.clienteNombre,p.clienteTelefono,p.distrito,
        p.descripcionEntrega,p.metodoPago].some(s=>(s||'').toLocaleLowerCase('es-PE').includes(q)))
    );
  }

  async cargar():Promise<void> {
    this.cargando=true; this.error='';
    try {
      const datos=await firstValueFrom(this.http.get<Pedido[]>(
        this.base,{headers:this.headers()}));
      this.pedidos=datos;
      if(this.modal) {
        const actualizado=datos.find(p=>p.id===this.modal?.id);
        if(actualizado) this.modal=actualizado;
        else this.cerrarModal();
      }
    } catch {
      this.error='No se pudieron consultar los pedidos. Comprueba la conexión y tus permisos.';
    } finally {
      this.cargando=false;
    }
  }

  private limpiarEvidencia():void {
    if(this.evidenciaUrl)URL.revokeObjectURL(this.evidenciaUrl);
    this.evidenciaUrl=null;
    this.evidenciaTipo='';
    this.evidenciaError='';
  }

  async abrirModal(p:Pedido, pestana:Pestaña='RESUMEN'):Promise<void> {
    if(this.procesando)return;
    this.limpiarEvidencia();
    this.modal=p;
    this.pestana=pestana;
    this.lineas=[];
    this.cargandoDetalle=true;
    this.verificacionReal=false;
    this.motivoRechazo='';
    this.observacionEstado='';
    this.errorModal='';
    this.mensajeModal='';
    if(pestana==='PAGO' && p.tieneEvidencia)void this.verEvidencia();
    try {
      const detalle=await firstValueFrom(this.http.get<Linea[]>(
        this.base+'/'+encodeURIComponent(p.id)+'/lineas',{headers:this.headers()}));
      if(this.modal?.id===p.id)this.lineas=detalle;
    } catch {
      if(this.modal?.id===p.id)
        this.errorModal='No se pudo cargar el detalle de productos del pedido.';
    } finally {
      if(this.modal?.id===p.id)this.cargandoDetalle=false;
    }
  }

  cerrarModal():void {
    if(this.procesando)return;
    this.modal=null;
    this.lineas=[];
    this.limpiarEvidencia();
    this.verificacionReal=false;
    this.motivoRechazo='';
    this.errorModal='';
    this.mensajeModal='';
  }

  cambiarPestana(pestana:Pestaña):void {
    this.pestana=pestana;
    this.errorModal='';
    if(pestana==='PAGO' && this.modal?.tieneEvidencia && !this.evidenciaUrl
      && !this.cargandoEvidencia)void this.verEvidencia();
  }

  async verEvidencia():Promise<void> {
    const p=this.modal;
    if(!p?.tieneEvidencia || this.cargandoEvidencia)return;
    this.limpiarEvidencia();
    this.cargandoEvidencia=true;
    this.evidenciaError='';
    try {
      const blob=await firstValueFrom(this.http.get(
        this.pagosBase+'/'+encodeURIComponent(p.id)+'/comprobante',
        {headers:this.headers(),responseType:'blob'}));
      if(this.modal?.id!==p.id)return;
      const mime=(blob.type||'').split(';')[0].toLowerCase();
      if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(mime)){
        this.evidenciaError='El formato del archivo no admite previsualización segura.';
        return;
      }
      this.evidenciaTipo=mime;
      this.evidenciaUrl=URL.createObjectURL(blob);
    } catch {
      if(this.modal?.id===p.id)
        this.evidenciaError='No se pudo recuperar la evidencia privada. Comprueba Storage y vuelve a intentarlo.';
    } finally {
      this.cargandoEvidencia=false;
    }
  }

  abrirChat(p:Pedido):void {
    const telefono=p.clienteTelefono?.replace(/\D/g,'');
    if(!telefono){this.errorModal='El cliente no registró un número de teléfono válido.';return;}
    const mensaje='Hola '+p.clienteNombre+', te escribimos de JM Aromas sobre tu pedido '+p.codigo+'.';
    window.open('https://wa.me/'+telefono+'?text='+encodeURIComponent(mensaje),
      '_blank','noopener,noreferrer');
  }

  puedeConfirmarComprobante(p:Pedido):boolean {
    return p.tieneEvidencia && p.estadoPago==='PENDIENTE_CONFIRMACION'
      && p.estado!=='CANCELADO';
  }
  puedeConfirmarWhatsapp(p:Pedido):boolean {
    return p.metodoPago==='COORDINAR_WHATSAPP' &&
      p.estadoPago==='PENDIENTE' &&
      !['CANCELADO','ENTREGADO','FINALIZADO'].includes(p.estado);
  }
  acciones(p:Pedido):string[] {
    if(['CANCELADO','FINALIZADO','ENTREGADO'].includes(p.estado))return [];
    const pagado=p.estadoPago==='PAGADO';
    const cancelar=pagado?[]:['CANCELADO'];
    switch(p.estado){
      case 'PENDIENTE':return ['CONTACTADO','CONFIRMADO',...cancelar];
      case 'CONTACTADO':return ['CONFIRMADO',...cancelar];
      case 'CONFIRMADO':return pagado?['PREPARANDO']:cancelar;
      case 'PREPARANDO':return pagado?['EN_CAMINO']:cancelar;
      case 'EN_CAMINO':return pagado?['FINALIZADO']:[];
      default:return [];
    }
  }
  accionTexto(a:string):string {
    return ({
      CONTACTADO:'Marcar contactado',CONFIRMADO:'Confirmar pedido',
      PREPARANDO:'Iniciar preparación',EN_CAMINO:'Marcar en camino',
      FINALIZADO:'Finalizar pedido',CANCELADO:'Cancelar pedido y devolver stock'
    } as Record<string,string>)[a]||a;
  }

  async actualizar(p:Pedido, estado:string):Promise<void> {
    if(this.procesando||!this.acciones(p).includes(estado))return;
    const advertencia=estado==='CANCELADO'
      ?'¿Cancelar el pedido '+p.codigo+' y devolver sus unidades al stock?'
      :'¿Cambiar el pedido '+p.codigo+' a «'+this.estadoTexto(estado)+'»?';
    if(!window.confirm(advertencia))return;
    this.procesando=true;this.errorModal='';this.mensajeModal='';this.mensaje='';
    try {
      await firstValueFrom(this.http.patch(
        this.base+'/'+encodeURIComponent(p.id)+'/estado',
        {estado,observacion:this.observacionEstado.trim()||'Actualizado desde la gestión de pedidos'},
        {headers:this.headers()}));
      await this.cargar();
      this.mensaje='Pedido '+p.codigo+': '+this.estadoTexto(estado)+'.';
      this.mensajeModal='Estado actualizado: '+this.estadoTexto(estado)+'.';
      this.observacionEstado='';
    } catch(e) {
      this.errorModal=this.mensajeError(e,'No se pudo actualizar el estado del pedido.');
    } finally {
      this.procesando=false;
    }
  }

  async decidirPago(p:Pedido, accion:DecisionPago):Promise<void> {
    if(this.procesando||!this.puedeConfirmarComprobante(p))return;
    if(accion==='CONFIRMAR' && (!this.verificacionReal || !this.evidenciaUrl))return;
    if(accion==='RECHAZAR' && !this.motivoRechazo.trim())return;
    if(accion==='CONFIRMAR' && !window.confirm(
      '¿Comprobaste en Yape o el banco el ingreso REAL de '+this.moneda(p.total)+
      ' correspondiente a '+p.codigo+'? Una captura por sí sola NO demuestra que se pagó.'))return;
    this.procesando=true;this.errorModal='';this.mensajeModal='';this.mensaje='';
    try{
      await firstValueFrom(this.http.patch(
        this.pagosBase+'/'+encodeURIComponent(p.id)+'/pago',
        {accion,observacion:accion==='RECHAZAR'?this.motivoRechazo.trim():
          'Ingresos verificados por administración desde el detalle del pedido'},
        {headers:this.headers()}));
      this.verificacionReal=false;
      this.motivoRechazo='';
      await this.cargar();
      this.mensaje=accion==='CONFIRMAR'
        ?'Pago confirmado para '+p.codigo+'.':'Comprobante rechazado para '+p.codigo+'.';
      this.mensajeModal=this.mensaje;
    }catch(e){
      this.errorModal=this.mensajeError(e,'No fue posible revisar el comprobante. Actualiza el pedido.');
    }finally{this.procesando=false;}
  }

  async confirmarPagoWhatsapp(p:Pedido):Promise<void> {
    if(this.procesando||!this.puedeConfirmarWhatsapp(p)||!this.verificacionReal)return;
    if(!window.confirm('¿Confirmas el ingreso real de '+this.moneda(p.total)+
      ' por el pedido '+p.codigo+'? La coordinación de WhatsApp NO acredita el pago.'))return;
    this.procesando=true;this.errorModal='';this.mensajeModal='';
    try {
      await firstValueFrom(this.http.patch(
        this.base+'/'+encodeURIComponent(p.id)+'/pago-verificado',
        {confirmado:true,observacion:'Cobro externo verificado por el administrador'},
        {headers:this.headers()}));
      this.verificacionReal=false;
      await this.cargar();
      this.mensaje='Pago de WhatsApp verificado: '+p.codigo+'.';
      this.mensajeModal=this.mensaje;
    }catch(e){
      this.errorModal=this.mensajeError(e,'No se pudo confirmar este cobro.');
    }finally{this.procesando=false;}
  }

  private mensajeError(e:unknown,alternativo:string):string {
    const err=e as HttpErrorResponse;
    if(err?.status===409)return 'El pedido cambió o ya fue revisado. Actualiza para ver el estado vigente.';
    if(err?.status===401||err?.status===403)return 'No tienes una sesión administrativa válida.';
    const detalle=err?.error?.detail||err?.error?.error||err?.error?.message;
    return typeof detalle==='string' && detalle.length<220?detalle:alternativo;
  }
}

import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface PedidoWhatsapp {
  id:string;codigo:string;estado:string;estadoPago:string;
  total:number;creadoEn:string;expiraEn:string|null;
  clienteNombre:string;clienteTelefono:string;distrito:string;
  departamento:string|null;provincia:string|null;
  direccion:string|null;referencia:string|null;
}
interface Linea {
  nombre:string;sku:string;cantidad:number;
  precioOriginal:number;descuentoUnitario:number;totalLinea:number;
}

@Component({
  selector:'app-admin-pedidos-whatsapp',
  standalone:true,
  imports:[CommonModule],
  templateUrl:'./admin-pedidos-whatsapp.component.html',
  styleUrls:['./admin-pedidos-whatsapp.component.css']
})
export class AdminPedidosWhatsappComponent implements OnInit {
  @Input({required:true}) accessToken!:string;
  private readonly http=inject(HttpClient);
  private readonly base=environment.apiBaseUrl+'/admin/pedidos-whatsapp';
  pedidos:PedidoWhatsapp[]=[];
  lineas:Linea[]=[];
  seleccionado:string|null=null;
  cargando=false;
  procesando=false;
  error='';
  mensaje='';

  ngOnInit():void {void this.cargar();}

  moneda(valor:number):string {
    return new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'})
      .format(Number(valor));
  }
  private headers():HttpHeaders {
    return new HttpHeaders({Authorization:'Bearer '+this.accessToken});
  }
  async cargar():Promise<void> {
    this.cargando=true;this.error='';
    try {
      this.pedidos=await firstValueFrom(this.http.get<PedidoWhatsapp[]>(
        this.base,{headers:this.headers()}));
      if(this.seleccionado && !this.pedidos.some(p=>p.id===this.seleccionado)) {
        this.seleccionado=null;this.lineas=[];
      }
    }catch(e) {
      this.error='No se pudieron cargar los pedidos por WhatsApp.';
    }finally {this.cargando=false;}
  }

  async detalle(p:PedidoWhatsapp):Promise<void> {
    if(this.seleccionado===p.id){this.seleccionado=null;this.lineas=[];return;}
    this.seleccionado=p.id;this.lineas=[];this.error='';
    try {
      this.lineas=await firstValueFrom(this.http.get<Linea[]>(
        this.base+'/'+p.id+'/lineas',{headers:this.headers()}));
    }catch {
      this.error='No se pudo cargar el detalle del pedido.';
    }
  }

  acciones(p:PedidoWhatsapp):string[] {
    const noCancelar=p.estadoPago==='PAGADO';
    if(noCancelar) {
      switch(p.estado) {
        case 'PENDIENTE':return ['CONTACTADO','CONFIRMADO'];
        case 'CONTACTADO':return ['CONFIRMADO'];
        case 'CONFIRMADO':return ['PREPARANDO'];
        case 'PREPARANDO':return ['ENTREGADO'];
        default:return [];
      }
    }
    switch(p.estado) {
      case 'PENDIENTE':return ['CONTACTADO','CONFIRMADO','CANCELADO'];
      case 'CONTACTADO':return ['CONFIRMADO','CANCELADO'];
      case 'CONFIRMADO':return ['PREPARANDO','CANCELADO'];
      case 'PREPARANDO':return p.estadoPago==='PAGADO'
        ?['ENTREGADO','CANCELADO']:['CANCELADO'];
      default:return [];
    }
  }

  accionTexto(accion:string):string {
    return ({
      CONTACTADO:'Marcar contactado',CONFIRMADO:'Confirmar pedido',
      PREPARANDO:'En preparación',ENTREGADO:'Marcar entregado',
      CANCELADO:'Cancelar y devolver stock'
    } as Record<string,string>)[accion]||accion;
  }

  abrirChat(p:PedidoWhatsapp):void {
    const tel=p.clienteTelefono?.replace(/\D/g,'');
    if(!tel){this.error='El cliente no registró un teléfono válido.';return;}
    const texto='Hola '+p.clienteNombre+', te escribimos de JM-AROMAS por tu pedido '+p.codigo+'.';
    window.open('https://wa.me/'+tel+'?text='+encodeURIComponent(texto),
      '_blank','noopener,noreferrer');
  }

  async actualizar(p:PedidoWhatsapp,estado:string):Promise<void> {
    if(this.procesando)return;
    const advertencia=estado==='CANCELADO'
      ?'¿Cancelar '+p.codigo+' y devolver sus unidades al inventario?'
      :'¿Cambiar el pedido '+p.codigo+' a '+estado+'?';
    if(!window.confirm(advertencia))return;
    this.procesando=true;this.error='';this.mensaje='';
    try {
      await firstValueFrom(this.http.patch(
        this.base+'/'+p.id+'/estado',
        {estado,observacion:'Actualizado desde el panel de JM-AROMAS'},
        {headers:this.headers()}));
      this.mensaje='Estado actualizado: '+p.codigo+' → '+estado;
      await this.cargar();
    }catch(e) {
      const err=e as HttpErrorResponse;
      this.error=err.error?.detail||err.error?.error||'No se pudo actualizar el pedido.';
    }finally {this.procesando=false;}
  }

  async confirmarPago(p:PedidoWhatsapp):Promise<void> {
    if(this.procesando)return;
    if(!window.confirm(
      '¿Verificaste REALMENTE que recibiste el dinero por este pedido? '+p.codigo+
      '. No confirmes pagos basándote solo en un mensaje de WhatsApp.'))return;
    this.procesando=true;this.error='';this.mensaje='';
    try{
      await firstValueFrom(this.http.patch(
        this.base+'/'+p.id+'/pago-verificado',
        {confirmado:true,observacion:'Pago comprobado manualmente por el administrador'},
        {headers:this.headers()}));
      this.mensaje='Pago registrado como verificado: '+p.codigo;
      await this.cargar();
    }catch(e){
      const err=e as HttpErrorResponse;
      this.error=err.error?.detail||err.error?.error||'No se pudo registrar el pago.';
    }finally{this.procesando=false;}
  }
}

import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface PagoPendiente {
  id:string;codigo:string;metodoPago:string;total:number;estadoPago:string;
  clienteJson:string;direccionJson:string;creadoEn:string;comprobanteEn:string;
  cuentaTitulo:string|null;cuentaTitular:string|null;cuentaBanco:string|null;
  cuentaNumero:string|null;cuentaYape:string|null;cuentaCci:string|null;
}
@Component({
  selector:'app-admin-pagos',
  standalone:true,
  imports:[CommonModule,FormsModule],
  templateUrl: './admin-pagos.component.html',
  styleUrls: ['./admin-pagos.component.css']
})
export class AdminPagosComponent implements OnInit,OnDestroy {
  @Input({required:true}) accessToken!:string;
  private readonly http=inject(HttpClient);
  pendientes:PagoPendiente[]=[];
  seleccion:PagoPendiente|null=null;
  urlComprobante:string|null=null;
  cargando=false;
  cargandoImagen=false;
  procesando=false;
  verificado=false;
  observacion='';
  error='';
  mensaje='';
  ngOnInit():void{void this.cargar();}
  ngOnDestroy():void{this.cerrarImagen();}
  private cabeceras():HttpHeaders{return new HttpHeaders({Authorization:'Bearer '+this.accessToken});}
  async cargar():Promise<void>{
    if(!this.accessToken)return;
    this.cargando=true;this.error='';
    try{
      this.pendientes=await firstValueFrom(this.http.get<PagoPendiente[]>(
        environment.apiBaseUrl+'/admin/pedidos/pendientes',{headers:this.cabeceras()}));
    }catch{this.error='No se pudo consultar la bandeja de pagos. Comprueba tus permisos y la API.';}
    finally{this.cargando=false;}
  }
  nombreCliente(p:PagoPendiente):string{
    try{return JSON.parse(p.clienteJson)?.nombre||'Cliente';}catch{return 'Cliente';}
  }
  cerrarImagen():void{
    if(this.urlComprobante)URL.revokeObjectURL(this.urlComprobante);
    this.urlComprobante=null;this.seleccion=null;this.verificado=false;this.observacion='';
  }
  async verComprobante(p:PagoPendiente):Promise<void>{
    this.cerrarImagen();
    this.seleccion=p;this.cargandoImagen=true;this.error='';
    try{
      const blob=await firstValueFrom(this.http.get(
        environment.apiBaseUrl+'/admin/pedidos/'+p.id+'/comprobante',
        {headers:this.cabeceras(),responseType:'blob'}));
      this.urlComprobante=URL.createObjectURL(blob);
    }catch{this.error='No se pudo obtener la evidencia privada. Revisa la configuración de Storage.';}
    finally{this.cargandoImagen=false;}
  }
  async decidir(p:PagoPendiente,accion:'CONFIRMAR'|'RECHAZAR'):Promise<void>{
    if(this.procesando || (accion==='CONFIRMAR'&&!this.verificado)||
       (accion==='RECHAZAR'&&!this.observacion.trim()))return;
    this.procesando=true;this.error='';this.mensaje='';
    try{
      await firstValueFrom(this.http.patch(
        environment.apiBaseUrl+'/admin/pedidos/'+p.id+'/pago',
        {accion,observacion:this.observacion},{headers:this.cabeceras()}));
      this.mensaje=accion==='CONFIRMAR'?'Pago confirmado. El cliente ya verá el estado PAGADO.':
        'Comprobante rechazado. El cliente verá RECHAZADO.';
      this.cerrarImagen();
      await this.cargar();
    }catch(e){this.error='No fue posible registrar la decisión. Comprueba que el comprobante siga pendiente.';}
    finally{this.procesando=false;}
  }
}

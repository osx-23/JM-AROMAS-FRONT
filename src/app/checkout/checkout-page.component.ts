import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Session } from '@supabase/supabase-js';
import { AuthService } from '../auth/auth.service';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

type TipoMedio='YAPE'|'TRANSFERENCIA'|'WHATSAPP';
interface MedioPago {
  id:string;tipo:TipoMedio;titulo:string;titular:string|null;
  numeroYape:string|null;qrUrl:string|null;banco:string|null;
  numeroCuenta:string|null;cci:string|null;telefonoWhatsApp:string|null;
}
interface CompraItem { productoId:string; nombre:string; precio:number; cantidad:number; demo:boolean; }
interface PedidoRespuesta {
  id:string;codigo:string;tokenConsulta:string;estado:string;estadoPago:string;
  metodoPago:string;totalProductos:number;envio:string;reservaHoras:number;
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
export class CheckoutPageComponent implements OnInit {
  private readonly http=inject(HttpClient);
  private readonly router=inject(Router);
  private readonly authService=inject(AuthService);
  private readonly supabase=this.authService.client;
  sesion:Session|null=null;
  cargando=false;
  cargandoMetodos=true;
  error='';
  mensaje='';
  medios:MedioPago[]=[];
  items:CompraItem[]=[];
  modo:'WHATSAPP'|'WEB'='WEB';
  medioId='';
  pedido:PedidoRespuesta|null=null;
  archivo:File|null=null;
  enviando=false;
  guardarDatos=true;
  cliente:ClienteForm={nombre:'',dni:'',telefono:'',email:'',departamento:'Lima',
    provincia:'Lima',distrito:'',direccion:'',referencia:''};

  get mediosWeb():MedioPago[]{return this.medios.filter(m=>m.tipo==='YAPE'||m.tipo==='TRANSFERENCIA');}
  get tieneWhatsapp():boolean{return this.medios.some(m=>m.tipo==='WHATSAPP');}
  get medio():MedioPago|undefined{
    return this.medios.find(x=>x.id===this.medioId);
  }
  get previo():number{return this.items.reduce((t,p)=>t+p.cantidad*p.precio,0);}
  get esDemo():boolean{return this.items.some(x=>x.demo);}
  get puedeCrear():boolean{
    return this.items.length>0 && !this.esDemo && !this.cargando &&
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
    if(this.sesion)await this.precargarCliente();
    await this.cargarMedios();
  }
  private async cargarMedios():Promise<void>{
    this.cargandoMetodos=true;
    try{
      this.medios=await firstValueFrom(this.http.get<MedioPago[]>(
        environment.apiBaseUrl+'/checkout/medios-pago'));
      this.medioId=this.mediosWeb[0]?.id||'';
    }catch{
      this.error='No se pudieron cargar los medios de pago. Comprueba la API.';
    }finally{this.cargandoMetodos=false;}
  }
  private async precargarCliente():Promise<void>{
    if(!this.sesion)return;
    if(this.sesion.user.email)this.cliente.email=this.sesion.user.email;
    try{
      const {data:perfil}=await this.supabase.from('perfiles')
        .select('nombre,telefono,dni')
        .eq('usuario_id',this.sesion.user.id).maybeSingle();
      if(perfil){
        this.cliente.nombre=perfil.nombre||'';
        this.cliente.telefono=perfil.telefono||'';
        this.cliente.dni=perfil.dni||'';
      }
      const {data:direcciones}=await this.supabase.from('direcciones')
        .select('departamento,provincia,distrito,linea_direccion,referencia')
        .eq('usuario_id',this.sesion.user.id)
        .order('creado_en',{ascending:false}).limit(1);
      const d=direcciones?.[0];
      if(d){
        this.cliente.departamento=d.departamento;
        this.cliente.provincia=d.provincia;
        this.cliente.distrito=d.distrito;
        this.cliente.direccion=d.linea_direccion;
        this.cliente.referencia=d.referencia||'';
      }
    }catch{ /* Permitir completar manualmente si no hay perfil aún. */ }
  }
  async iniciarGoogle():Promise<void>{
    try { await this.authService.iniciarGoogle(); }
    catch { this.error='No se pudo iniciar sesión con Google. Revisa OAuth en Supabase.'; }
  }
  async salir():Promise<void>{
    await this.supabase.auth.signOut();
    this.sesion=null;
  }
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
    if(!file){this.archivo=null;return;}
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024){
      this.error='Selecciona una foto JPG, PNG o WEBP de máximo 5 MB.';
      this.archivo=null;control.value='';return;
    }
    this.archivo=file;
  }
  async crearPedido():Promise<void>{
    if(!this.puedeCrear)return;
    this.error='';this.mensaje='';
    if(!/^\d{8}$/.test(this.cliente.dni.trim()) ||
       !this.cliente.nombre.trim() || !this.cliente.email.includes('@') ||
       !this.cliente.telefono.trim() || !this.cliente.direccion.trim() ||
       !this.cliente.distrito.trim()){
      this.error='Completa nombre, DNI de 8 dígitos, teléfono, email y dirección.';
      return;
    }
    this.cargando=true;
    try{
      const authHeaders=this.sesion?.access_token
        ?new HttpHeaders({Authorization:'Bearer '+this.sesion.access_token})
        :undefined;
      const metodoPago=this.modo==='WHATSAPP'?'COORDINAR_WHATSAPP':this.medio?.tipo;
      const body={
        idempotencia:crypto.randomUUID(),
        metodoPago,medioPagoId:this.modo==='WEB'?this.medioId:null,
        cliente:this.cliente,
        articulos:this.items.map(i=>({productoId:i.productoId,cantidad:i.cantidad})),
        guardarDatos:!!this.sesion&&this.guardarDatos
      };
      this.pedido=await firstValueFrom(this.http.post<PedidoRespuesta>(
        environment.apiBaseUrl+'/checkout/pedidos',body,{headers:authHeaders}));
      sessionStorage.setItem('jm_pedido_token_'+this.pedido.id,this.pedido.tokenConsulta);
      this.mensaje='Pedido reservado. Monto verificado por el servidor: '+this.moneda(this.pedido.totalProductos);
    }catch(e:any){
      this.error=e?.error?.error||e?.error?.detail||
        'No fue posible crear el pedido. Comprueba disponibilidad y conexión.';
    }finally{this.cargando=false;}
  }
  abrirWhatsapp():void{
    if(!this.pedido || this.pedido.metodoPago!=='COORDINAR_WHATSAPP')return;
    const numero=this.medios.find(m=>m.tipo==='WHATSAPP')?.telefonoWhatsApp?.replace(/\D/g,'');
    if(!numero){this.error='La administradora aún no ha configurado su WhatsApp.';return;}
    const mensaje='Hola, quiero coordinar mi pedido JM-AROMAS '+this.pedido.codigo+
      '. Total de productos: '+this.moneda(this.pedido.totalProductos)+
      '. Envío por coordinar.';
    window.open('https://wa.me/'+numero+'?text='+encodeURIComponent(mensaje),
      '_blank','noopener,noreferrer');
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
      this.mensaje='Comprobante recibido. Pago pendiente de confirmación por la administradora.';
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

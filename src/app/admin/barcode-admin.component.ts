import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { createClient, Session } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

interface ProductoAdmin {
  id: string;
  codigoBarras: string;
  sku: string;
  nombre: string;
  marca: string | null;
  descripcion: string | null;
  precio: number;
  stock: number;
  publicado: boolean;
}
interface RegistroForm {
  codigoBarras:string; nombre:string; marca:string;
  sku:string; descripcion:string; precio:number; stock:number;
}
const FORM_VACIO = ():RegistroForm => ({
  codigoBarras:'',nombre:'',marca:'',sku:'',descripcion:'',precio:0,stock:0
});

@Component({
  selector: 'app-barcode-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl:'./barcode-admin.component.html',
  styleUrls:['./barcode-admin.component.css']
})
export class BarcodeAdminComponent implements OnInit, OnDestroy {
  private readonly http=inject(HttpClient);
  private readonly cdr=inject(ChangeDetectorRef);
  private readonly auth=createClient(environment.supabaseUrl, environment.supabasePublishableKey);
  private readonly reader=new BrowserMultiFormatReader(
    new Map([[DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,BarcodeFormat.EAN_8,BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,BarcodeFormat.CODE_128,BarcodeFormat.CODE_39
    ]]])
  );
  private controls?:{stop():void | Promise<void>};
  private unsubscribeAuth?:()=>void;
  @ViewChild('vistaCamara') vistaCamara?:ElementRef<HTMLVideoElement>;

  sesion:Session | null=null;
  cargandoSesion=true;
  esAdmin=false;
  estado='Inicia sesión para acceder al inventario.';
  error='';
  mensaje='';
  camaraAbierta=false;
  procesando=false;
  guardando=false;
  buscando=false;
  codigo='';
  existente:ProductoAdmin | null=null;
  nuevo=false;
  form:RegistroForm=FORM_VACIO();
  ingresoCantidad=1;
  productos:ProductoAdmin[]=[];

  get contador():number{return this.productos.length}
  get productoEncontrado():boolean{return !!this.existente}

  ngOnInit():void {
    const authListener=this.auth.auth.onAuthStateChange((_evento, sesion)=>{
      // Evitar llamadas encadenadas a auth.getSession dentro de la devolución.
      this.sesion=sesion;
      this.cargandoSesion=false;
      if(!sesion){this.esAdmin=false;this.productos=[];this.cerrarCamara();}
      else {queueMicrotask(()=>void this.comprobarPermiso());}
      this.cdr.markForCheck();
    });
    this.unsubscribeAuth=()=>authListener.data.subscription.unsubscribe();
    void this.auth.auth.getSession().then(({data})=>{
      this.sesion=data.session;
      this.cargandoSesion=false;
      if(this.sesion) void this.comprobarPermiso();
    }).catch(()=>{this.cargandoSesion=false;this.estado='No se pudo consultar la sesión de Google.';});
  }

  ngOnDestroy():void {this.cerrarCamara();this.unsubscribeAuth?.();}

  async iniciarGoogle():Promise<void> {
    this.error='';
    const {error}=await this.auth.auth.signInWithOAuth({
      provider:'google',
      options:{redirectTo:window.location.origin}
    });
    if(error) this.error=error.message;
  }

  async salir():Promise<void> {
    this.cerrarCamara();
    await this.auth.auth.signOut();
    this.esAdmin=false;this.sesion=null;this.productos=[];this.existente=null;
  }

  private async cabeceras():Promise<HttpHeaders> {
    if(!this.sesion?.access_token) throw new Error('Primero inicia sesión');
    return new HttpHeaders({Authorization:'Bearer '+this.sesion.access_token});
  }
  private ruta(s:string):string{return environment.apiBaseUrl+'/admin/productos'+s}

  async comprobarPermiso():Promise<void> {
    const sesion=this.sesion;
    if(!sesion){this.esAdmin=false;return}
    try{
      const headers=await this.cabeceras();
      const productos=await firstValueFrom(this.http.get<ProductoAdmin[]>(this.ruta(''),{headers}));
      if(this.sesion?.user.id !== sesion.user.id) return;
      this.productos=productos;
      this.esAdmin=true;
      this.estado='Acceso de administrador verificado';
      this.error='';
    }catch(e){
      this.esAdmin=false;
      this.productos=[];
      const err=e as HttpErrorResponse;
      this.estado=err.status===403
        ?'Esta cuenta no tiene autorización de administrador.'
        :err.status===401?'La sesión no fue aceptada por el backend.'
        :'La API administrativa no está disponible. Comprueba Spring Boot y sus variables de entorno.';
    }
  }

  async abrirCamara():Promise<void> {
    if(!this.esAdmin) return;
    this.error='';this.mensaje='';
    if(!window.isSecureContext || !navigator.mediaDevices?.getUserMedia){
      this.error='La cámara requiere HTTPS o localhost y permiso del navegador. Puedes escribir el código manualmente.';
      return;
    }
    this.cerrarCamara();
    this.camaraAbierta=true;
    this.procesando=false;
    this.cdr.detectChanges();
    try{
      const video=this.vistaCamara?.nativeElement;
      if(!video)throw new Error('No se encontró la vista de cámara');
      const controles=await this.reader.decodeFromConstraints(
        {audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}},
        video,
        result=>{
          if(!result||this.procesando||!this.camaraAbierta)return;
          this.procesando=true;
          const texto=result.getText();
          this.cerrarCamara();
          this.codigo=texto;
          void this.buscarCodigo();
        }
      );
      if(!this.camaraAbierta){void controles.stop();return;}
      this.controls=controles;
    }catch(e){
      this.cerrarCamara();
      this.error='No se pudo abrir la cámara. Revisa sus permisos o escribe el código manualmente.';
    }
  }

  cerrarCamara():void{
    this.camaraAbierta=false;
    this.procesando=false;
    if(this.controls){void this.controls.stop();this.controls=undefined}
    const video=this.vistaCamara?.nativeElement;
    if(video?.srcObject){(video.srcObject as MediaStream).getTracks().forEach(t=>t.stop());video.srcObject=null}
  }

  async buscarCodigo():Promise<void> {
    if(!this.esAdmin || this.buscando)return;
    this.cerrarCamara();
    this.error='';this.mensaje='';
    let codigo=this.codigo.trim().toUpperCase();
    if(!/^[A-Z0-9._-]{4,64}$/.test(codigo)){
      this.error='Código inválido. Comprueba el código de barras y vuelve a intentarlo.';
      return;
    }
    if(/^\d{12}$/.test(codigo))codigo='0'+codigo;
    this.codigo=codigo;
    this.existente=null;this.nuevo=false;this.buscando=true;
    try{
      const headers=await this.cabeceras();
      this.existente=await firstValueFrom(
        this.http.get<ProductoAdmin>(this.ruta('/codigo-barras/'+encodeURIComponent(codigo)),{headers})
      );
      this.ingresoCantidad=1;
      this.mensaje='Producto encontrado. Puedes ingresar más unidades a su stock.';
    }catch(e){
      const err=e as HttpErrorResponse;
      if(err.status===404){
        this.form=FORM_VACIO();this.form.codigoBarras=codigo;
        this.nuevo=true;
        this.mensaje='Código nuevo. Completa los datos para registrarlo.';
      }else{
        this.error=err.error?.error || 'No se pudo consultar el código. Comprueba la conexión y vuelve a intentar.';
      }
    }finally{this.buscando=false;}
  }

  async registrar():Promise<void>{
    if(!this.esAdmin||this.guardando||!this.nuevo)return;
    this.error='';this.mensaje='';
    if(!this.form.nombre.trim()||!Number.isFinite(this.form.precio)||this.form.precio<0
      ||!Number.isInteger(this.form.stock)||this.form.stock<0){
      this.error='Completa nombre, precio y stock válido.';return;
    }
    this.guardando=true;
    try{
      const headers=await this.cabeceras();
      const r=await firstValueFrom(this.http.post<{id:string}>(this.ruta(''),this.form,{headers}));
      this.nuevo=false;
      this.mensaje='Producto registrado correctamente como borrador. ID: '+r.id;
      this.form=FORM_VACIO();
      this.codigo='';
      await this.comprobarPermiso();
    }catch(e){
      const err=e as HttpErrorResponse;
      this.error=err.status===409?'Este código o SKU ya está registrado. Vuelve a buscarlo.':
        (err.error?.error || 'No se pudo guardar el producto.');
    }finally{this.guardando=false;}
  }

  async sumarStock():Promise<void>{
    if(!this.existente||this.guardando||!this.esAdmin)return;
    if(!Number.isInteger(this.ingresoCantidad)||this.ingresoCantidad<=0){
      this.error='Indica una cantidad entera positiva.';return;
    }
    this.guardando=true;this.error='';this.mensaje='';
    try{
      const headers=await this.cabeceras();
      const r=await firstValueFrom(this.http.patch<{stockNuevo:number}>(
        this.ruta('/'+this.existente.id+'/stock'),{cantidad:this.ingresoCantidad,motivo:'Ingreso desde escáner móvil'},{headers}
      ));
      this.existente={...this.existente,stock:r.stockNuevo};
      this.mensaje='Stock actualizado y movimiento registrado. Nuevo total: '+r.stockNuevo;
      this.ingresoCantidad=1;
      await this.comprobarPermiso();
    }catch(e){
      const err=e as HttpErrorResponse;
      this.error=err.error?.error||'No se pudo registrar el ingreso de stock.';
    }finally{this.guardando=false;}
  }

  limpiar():void{
    this.cerrarCamara();this.codigo='';this.existente=null;this.nuevo=false;this.form=FORM_VACIO();
    this.error='';this.mensaje='';
  }
}

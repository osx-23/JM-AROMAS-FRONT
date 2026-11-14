import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Session } from '@supabase/supabase-js';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { environment } from '../../../environments/environment';
import { AdminEditorComponent } from '../productos/editor/admin-editor.component';

interface ProductoAdmin {
  id: string;
  codigoBarras: string;
  sku: string;
  nombre: string;
  marca: string | null;
  descripcion: string | null;
  precio: number;
  costoCompra: number | null;
  stock: number;
  publicado: boolean;
  publicoObjetivo:'HOMBRE'|'MUJER'|'UNISEX'|null;
  contenidoMl:number|null;
  contenidoGramos:number|null;
  categoriaSlug:string;
  familiaOlfativa:string|null;
  rutaFoto: string | null;
}
interface FotoProducto {
  id:string; url:string; descripcionAlt:string|null; orden:number;
}
interface FotoPendiente { archivo:File; preview:string; }
interface RegistroForm {
  codigoBarras:string; nombre:string; marca:string;
  sku:string; descripcion:string; precio:number; costoCompra:number|null; stock:number;
  publicoObjetivo:string; contenidoMl:number|null;
  contenidoGramos:number|null;
  categoriaSlug:string;
  unidadMedida:'ml'|'g';
  familiaOlfativa:string;
}
const FORM_VACIO = ():RegistroForm => ({
  codigoBarras:'',nombre:'',marca:'',sku:'',descripcion:'',precio:0,costoCompra:null,stock:0,
  publicoObjetivo:'',contenidoMl:null,contenidoGramos:null,categoriaSlug:'perfumes',unidadMedida:'ml',familiaOlfativa:''
});

@Component({
  selector: 'app-barcode-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AdminEditorComponent],
  templateUrl:'./barcode-admin.component.html',
  styleUrls:['./barcode-admin.component.css']
})
export class BarcodeAdminComponent implements OnInit, OnDestroy {
  private readonly http=inject(HttpClient);
  private readonly cdr=inject(ChangeDetectorRef);
  private readonly router=inject(Router);
  private readonly route=inject(ActivatedRoute);
  readonly seccion:'inventario'|'productos' = this.route.snapshot.data['seccion']==='productos'?'productos':'inventario';
  private readonly sessionService=inject(AuthService);
  private readonly auth=this.sessionService.client;
  private lectorPendiente?:Promise<import('@zxing/browser').BrowserMultiFormatReader>;
  /** La biblioteca de reconocimiento se carga solo cuando se utiliza la cámara. */
  private obtenerLector():Promise<import('@zxing/browser').BrowserMultiFormatReader> {
    if(!this.lectorPendiente) {
      this.lectorPendiente=Promise.all([
        import('@zxing/browser'),import('@zxing/library')
      ]).then(([browser,lib])=>new browser.BrowserMultiFormatReader(
        new Map([[lib.DecodeHintType.POSSIBLE_FORMATS,[
          lib.BarcodeFormat.EAN_13,lib.BarcodeFormat.EAN_8,
          lib.BarcodeFormat.UPC_A,lib.BarcodeFormat.UPC_E,
          lib.BarcodeFormat.CODE_128,lib.BarcodeFormat.CODE_39
        ]]])
      )).catch(e=>{
        this.lectorPendiente=undefined;
        throw e;
      });
    }
    return this.lectorPendiente;
  }
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
  iniciandoCamara=false;
  procesando=false;
  guardando=false;
  buscando=false;
  codigo='';
  existente:ProductoAdmin | null=null;
  nuevo=false;
  form:RegistroForm=FORM_VACIO();
  ingresoCantidad=1;
  productos:ProductoAdmin[]=[];
  productoEditar:ProductoAdmin|null=null;
  fotos:FotoProducto[]=[];
  fotosPendientes:FotoPendiente[]=[];
  subiendoFotos=false;
  gestionandoFoto=false;
  readonly limiteFotos=5;

  cambiarUnidadRegistro(unidad:'ml'|'g'):void {
    this.form.unidadMedida=unidad;
    if(unidad==='g') this.form.contenidoMl=null;
    else this.form.contenidoGramos=null;
  }

  // La administración de productos y existencias comparte una sola pantalla.
  vistaProductos: 'listado' | 'registro' | 'inventario' = this.seccion === 'inventario' ? 'inventario' : 'listado';
  filtroProductos = '';
  filtroEstadoProductos: 'todos' | 'publicados' | 'borradores' | 'stock-bajo' = 'todos';
  paginaProductos = 1;
  tamanoPaginaProductos = 10;
  readonly opcionesTamanoPagina = [10, 20, 50];

  cambiarVistaProductos(vista: 'listado' | 'registro' | 'inventario'): void {
    this.vistaProductos = vista;
    this.paginaProductos = 1;
    this.limpiar();
  }

  get productosFiltrados(): ProductoAdmin[] {
    const q = this.filtroProductos.trim().toLocaleLowerCase('es-PE');
    return this.productos.filter(p => {
      const texto = [p.nombre, p.marca, p.sku, p.codigoBarras, p.categoriaSlug]
        .filter(Boolean).join(' ').toLocaleLowerCase('es-PE');
      const coincide = !q || texto.includes(q);
      const estado = this.filtroEstadoProductos;
      return coincide && (estado === 'todos'
        || (estado === 'publicados' && p.publicado)
        || (estado === 'borradores' && !p.publicado)
        || (estado === 'stock-bajo' && p.stock <= 5));
    });
  }

  get totalPaginasProductos(): number {
    return Math.max(1, Math.ceil(this.productosFiltrados.length / this.tamanoPaginaProductos));
  }

  get productosPagina(): ProductoAdmin[] {
    const pagina = Math.min(this.paginaProductos, this.totalPaginasProductos);
    const inicio = (pagina - 1) * this.tamanoPaginaProductos;
    return this.productosFiltrados.slice(inicio, inicio + this.tamanoPaginaProductos);
  }

  cambiarPaginaProductos(pagina: number): void {
    this.paginaProductos = Math.max(1, Math.min(pagina, this.totalPaginasProductos));
  }

  reiniciarPaginacionProductos(): void { this.paginaProductos = 1; }

  get contador():number{return this.productos.length}
  get stockTotal():number{return this.productos.reduce((total,p)=>total+Number(p.stock||0),0)}
  get stockBajo():number{return this.productos.filter(p=>p.stock>=0&&p.stock<=5).length}

  prepararIngreso(p:ProductoAdmin):void {
    this.vistaProductos='inventario';
    this.cerrarCamara();this.existente=p;this.codigo=p.codigoBarras||p.sku;
    this.nuevo=false;this.productoEditar=null;this.ingresoCantidad=1;
    this.error='';this.mensaje='Indica cuántas unidades ingresaron para '+p.nombre+'.';
    // La tarjeta de ingreso se renderiza tras seleccionar el artículo.
    this.cdr.detectChanges();
    document.getElementById('ingreso-inventario')?.scrollIntoView({behavior:'smooth',block:'center'});
  }
  get productoEncontrado():boolean{return !!this.existente}

  ngOnInit():void {
    const authListener=this.auth.auth.onAuthStateChange((_evento, sesion)=>{
      // Evitar llamadas encadenadas a auth.getSession dentro de la devolución.
      this.sesion=sesion;
      this.cargandoSesion=false;
      if(!sesion){this.esAdmin=false;this.productos=[];this.cerrarCamara();this.limpiarFotosPendientes();this.fotos=[];}
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

  ngOnDestroy():void {
    this.cerrarCamara();this.unsubscribeAuth?.();this.limpiarFotosPendientes();
  }

  urlFoto(ruta:string|null|undefined):string {
    return ruta ? environment.supabaseUrl+'/storage/v1/object/public/jm-aromas-productos/'+ruta : '';
  }

  private limpiarFotosPendientes():void {
    for(const foto of this.fotosPendientes) URL.revokeObjectURL(foto.preview);
    this.fotosPendientes=[];
  }

  quitarFotoPendiente(indice:number):void {
    const foto=this.fotosPendientes.splice(indice,1)[0];
    if(foto) URL.revokeObjectURL(foto.preview);
  }

  seleccionarFotos(event:Event):void {
    const input=event.target as HTMLInputElement;
    const archivos=Array.from(input.files ?? []);
    input.value='';
    if(!this.esAdmin || (!this.nuevo && !this.existente)) {
      this.error='Primero escanea un producto o selecciona uno de la lista.';
      return;
    }
    this.error='';
    const espacios=this.limiteFotos-this.fotos.length-this.fotosPendientes.length;
    if(archivos.length>espacios) {
      this.error='Puedes guardar como máximo cinco fotos por perfume.';
    }
    for(const archivo of archivos.slice(0,Math.max(0,espacios))) {
      if(!['image/jpeg','image/png','image/webp'].includes(archivo.type) ||
          archivo.size===0 || archivo.size>5*1024*1024) {
        this.error='Solo se permiten imágenes JPG, PNG o WEBP de hasta 5 MB cada una.';
        continue;
      }
      this.fotosPendientes.push({archivo,preview:URL.createObjectURL(archivo)});
    }
  }

  private rutaFotos(id:string):string {return this.ruta('/'+id+'/imagenes');}

  async cargarFotos():Promise<void> {
    if(!this.existente) {this.fotos=[];return;}
    const id=this.existente.id;
    try {
      const fotos=await firstValueFrom(this.http.get<FotoProducto[]>(this.rutaFotos(id),{
        headers:await this.cabeceras()
      }));
      if(this.existente?.id===id) this.fotos=fotos;
    } catch {
      this.error='No se pudieron cargar las fotografías del producto.';
    }
  }

  async gestionarFotos(p:ProductoAdmin):Promise<void> {
    this.vistaProductos='listado';
    this.cerrarCamara();this.limpiarFotosPendientes();
    this.existente=p;this.nuevo=false;this.codigo=p.codigoBarras||p.sku;
    this.fotos=[];this.error='';this.mensaje='';
    await this.cargarFotos();
    this.cdr.detectChanges();
    document.getElementById('fotos-producto')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async subirFotos():Promise<void> {
    if(!this.existente || !this.esAdmin || this.subiendoFotos || this.fotosPendientes.length===0)return;
    this.subiendoFotos=true;this.error='';
    const id=this.existente.id;
    let completadas=0;
    try {
      while(this.fotosPendientes.length>0) {
        const foto=this.fotosPendientes[0];
        const body=new FormData();
        body.append('archivo',foto.archivo,foto.archivo.name);
        try {
          await firstValueFrom(this.http.post<FotoProducto>(this.rutaFotos(id),body,{
            headers:await this.cabeceras()
          }));
        } catch(e) {
          const err=e as HttpErrorResponse;
          this.error=err.error?.detail || err.error?.error ||
            'No se pudo subir la foto. Comprueba tu conexión y la clave privada de Storage.';
          break;
        }
        this.quitarFotoPendiente(0);
        completadas++;
      }
      await this.cargarFotos();
      if(completadas>0) {
        this.mensaje=completadas+' foto(s) guardada(s). Puedes elegir la imagen principal.';
        await this.comprobarPermiso();
      }
    } finally {this.subiendoFotos=false;}
  }

  async marcarPrincipal(foto:FotoProducto):Promise<void> {
    if(!this.existente || this.gestionandoFoto || this.subiendoFotos)return;
    this.gestionandoFoto=true;this.error='';
    try {
      this.fotos=await firstValueFrom(this.http.patch<FotoProducto[]>(
        this.rutaFotos(this.existente.id)+'/'+foto.id+'/principal',{},
        {headers:await this.cabeceras()}));
      this.mensaje='Foto principal actualizada.';
      await this.comprobarPermiso();
    } catch {
      this.error='No fue posible actualizar la foto principal.';
    } finally {this.gestionandoFoto=false;}
  }

  async eliminarFoto(foto:FotoProducto):Promise<void> {
    if(!this.existente || this.gestionandoFoto || this.subiendoFotos)return;
    if(!window.confirm('¿Eliminar definitivamente esta foto del perfume?'))return;
    this.gestionandoFoto=true;this.error='';
    try {
      await firstValueFrom(this.http.delete<void>(
        this.rutaFotos(this.existente.id)+'/'+foto.id,
        {headers:await this.cabeceras()}));
      this.mensaje='Fotografía eliminada.';
      await this.cargarFotos();
      await this.comprobarPermiso();
    } catch {
      this.error='No se pudo eliminar la fotografía.';
    } finally {this.gestionandoFoto=false;}
  }

  async iniciarGoogle():Promise<void> {
    this.error='';
    try { await this.sessionService.iniciarGoogle(); }
    catch { this.error='No se pudo conectar con Google.'; }
  }

  async salir():Promise<void> {
    this.cerrarCamara();
    await this.sessionService.cerrarSesion();
    this.esAdmin=false;this.sesion=null;this.productos=[];this.existente=null;
    this.limpiarFotosPendientes();this.fotos=[];
    void this.router.navigateByUrl('/');
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
      this.iniciandoCamara=true;
      this.cdr.markForCheck();
      const lector=await this.obtenerLector();
      if(!this.camaraAbierta)return;
      const video=this.vistaCamara?.nativeElement;
      if(!video)throw new Error('No se encontró la vista de cámara');
      const controles=await lector.decodeFromConstraints(
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
    }finally{
      this.iniciandoCamara=false;
      this.cdr.markForCheck();
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
    this.limpiarFotosPendientes();
    this.fotos=[];this.existente=null;this.productoEditar=null;this.nuevo=false;this.buscando=true;
    try{
      const headers=await this.cabeceras();
      this.existente=await firstValueFrom(
        this.http.get<ProductoAdmin>(this.ruta('/codigo-barras/'+encodeURIComponent(codigo)),{headers})
      );
      this.ingresoCantidad=1;
      this.productoEditar=this.existente;
      await this.cargarFotos();
      this.mensaje='Producto encontrado. Puedes ingresar más unidades a su stock o gestionar sus fotos.';
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
      ||this.form.costoCompra===null||!Number.isFinite(this.form.costoCompra)||this.form.costoCompra<0
      ||!Number.isInteger(this.form.stock)||this.form.stock<0){
      this.error='Completa nombre, costo de compra, precio de venta y stock válidos.';return;
    }
    this.guardando=true;
    try{
      const headers=await this.cabeceras();
      const r=await firstValueFrom(this.http.post<{id:string}>(this.ruta(''),{
        ...this.form,publicoObjetivo:this.form.publicoObjetivo||null,
        contenidoMl:this.form.contenidoMl??null,
        contenidoGramos:this.form.contenidoGramos??null,
        categoriaSlug:this.form.categoriaSlug,
        familiaOlfativa:this.form.familiaOlfativa||null
      },{headers}));
      const datos=this.form;
      this.nuevo=false;
      this.existente={
        id:r.id,codigoBarras:datos.codigoBarras,sku:datos.sku||r.id,
        nombre:datos.nombre,marca:datos.marca||null,descripcion:datos.descripcion||null,
        precio:datos.precio,costoCompra:datos.costoCompra,stock:datos.stock,publicado:false,rutaFoto:null,
        publicoObjetivo:(datos.publicoObjetivo||null) as ProductoAdmin['publicoObjetivo'],
        contenidoMl:datos.contenidoMl??null,
        contenidoGramos:datos.contenidoGramos??null,categoriaSlug:datos.categoriaSlug,
        familiaOlfativa:datos.familiaOlfativa||null
      };
      this.fotos=[];
      this.form=FORM_VACIO();
      this.mensaje='Producto registrado como borrador. Ahora puedes añadir sus fotografías.';
      await this.comprobarPermiso();
      if(this.fotosPendientes.length>0) await this.subirFotos();
      this.productoEditar=this.existente;
    }catch(e){
      const err=e as HttpErrorResponse;
      this.error=err.status===409?'Este código o SKU ya está registrado. Vuelve a buscarlo.':
        (err.error?.error || 'No se pudo guardar el producto.');
    }finally{this.guardando=false;}
  }

  async editarDatos(p:ProductoAdmin):Promise<void> {
    this.cerrarCamara();
    this.limpiarFotosPendientes();
    this.productoEditar=null;
    this.existente=p;
    this.codigo=p.codigoBarras||'';
    this.nuevo=false;
    this.fotos=[];
    this.error='';this.mensaje='';
    await this.cargarFotos();
    this.productoEditar=p;
    this.cdr.detectChanges();
    document.getElementById('editar-producto')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async recargarInventario():Promise<void> {
    await this.comprobarPermiso();
    if(this.existente) {
      const actualizado=this.productos.find(p=>p.id===this.existente?.id);
      if(actualizado) {
        this.existente=actualizado;
        this.productoEditar=actualizado;
        this.codigo=actualizado.codigoBarras||'';
      }
    }
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

  publicandoId:string|null=null;
  async cambiarPublicacion(p:ProductoAdmin):Promise<void>{
    if(this.publicandoId || !this.esAdmin)return;
    this.publicandoId=p.id;this.error='';this.mensaje='';
    try{
      const headers=await this.cabeceras();
      const nuevo=!p.publicado;
      await firstValueFrom(this.http.patch(
        this.ruta('/'+p.id+'/publicacion'),{publicado:nuevo},{headers}));
      this.mensaje=nuevo?'Producto publicado en la tienda.':'Producto ocultado del catálogo.';
      await this.comprobarPermiso();
    }catch(e:any){
      this.error=e?.error?.error||'No se pudo cambiar la publicación.';
    }finally{this.publicandoId=null;}
  }

  limpiar():void{
    this.cerrarCamara();this.limpiarFotosPendientes();
    this.codigo='';this.existente=null;this.productoEditar=null;
    this.nuevo=false;this.form=FORM_VACIO();this.fotos=[];
    this.error='';this.mensaje='';
  }
}

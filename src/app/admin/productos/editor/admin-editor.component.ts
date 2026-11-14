import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ProductoEditable {
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
  publicoObjetivo: 'HOMBRE' | 'MUJER' | 'UNISEX' | null;
  contenidoMl: number | null;
  contenidoGramos: number | null;
  categoriaSlug: string | null;
  familiaOlfativa:string|null;
}
interface Descuento {
  id: string; nombre: string; tipo: 'PORCENTAJE' | 'MONTO';
  valor: number; inicio: string; fin: string; activo: boolean;
}
interface Formulario {
  codigoBarras:string; sku:string; nombre:string; marca:string;
  descripcion:string; precio:number; costoCompra:number|null; publicoObjetivo:string; contenidoMl:number|null; contenidoGramos:number|null; categoriaSlug:string; unidadMedida:'ml'|'g';
  familiaOlfativa:string;
}

@Component({
  selector: 'app-admin-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-editor.component.html',
  styleUrls: ['./admin-editor.component.css']
})
export class AdminEditorComponent implements OnChanges {
  @Input({required:true}) producto!: ProductoEditable;
  @Input({required:true}) accessToken='';
  @Input() vista:'datos'|'descuentos'='datos';
  @Output() guardado=new EventEmitter<void>();
  @Output() cerrado=new EventEmitter<void>();

  private readonly http=inject(HttpClient);
  form:Formulario={codigoBarras:'',sku:'',nombre:'',marca:'',descripcion:'',
    precio:0,costoCompra:null,publicoObjetivo:'',contenidoMl:null,contenidoGramos:null,categoriaSlug:'',unidadMedida:'ml',familiaOlfativa:''};
  descuentos:Descuento[]=[];
  promo={nombre:'',tipo:'PORCENTAJE' as 'PORCENTAJE'|'MONTO',valor:10,inicio:'',fin:''};
  cargandoDescuentos=false;
  gestionandoDescuento=false;
  guardando=false;
  error='';
  mensaje='';

  ngOnChanges(changes:SimpleChanges):void {
    if(changes['producto'] && this.producto) {
      this.restaurar();
      this.descuentos=[];
      this.promo={nombre:'',tipo:'PORCENTAJE',valor:10,inicio:this.fechaLocal(Date.now()),
        fin:this.fechaLocal(Date.now()+7*24*3600000)};
      void this.cargarDescuentos();
    }
  }

  restaurar():void {
    const p=this.producto;
    this.form={codigoBarras:p.codigoBarras||'',sku:p.sku,nombre:p.nombre,
      marca:p.marca||'',descripcion:p.descripcion||'',precio:Number(p.precio),costoCompra:p.costoCompra??null,
      publicoObjetivo:p.publicoObjetivo||'',contenidoMl:p.contenidoMl??null,
      contenidoGramos:p.contenidoGramos??null,categoriaSlug:p.categoriaSlug||'',
      unidadMedida:p.contenidoGramos!=null?'g':'ml',familiaOlfativa:p.familiaOlfativa||''};
  }

  cambiarUnidad(unidad:'ml'|'g'):void {
    this.form.unidadMedida=unidad;
    if(unidad==='g')this.form.contenidoMl=null;
    else this.form.contenidoGramos=null;
  }

  private fechaLocal(fecha:number):string {
    const d=new Date(fecha);
    return new Date(fecha-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  }

  private headers():HttpHeaders {
    return new HttpHeaders({Authorization:'Bearer '+this.accessToken});
  }
  private url():string {return environment.apiBaseUrl+'/admin/productos/'+this.producto.id;}
  moneda(n:number):string {return new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n);}

  async guardar():Promise<void> {
    if(this.guardando)return;
    this.error='';this.mensaje='';
    if(!this.form.nombre.trim() || !this.form.sku.trim() ||
       !this.form.codigoBarras.trim() || !Number.isFinite(this.form.precio) ||
       this.form.precio<0 || !Number.isFinite(this.form.precio*100) ||
       (this.form.costoCompra!=null && (!Number.isFinite(this.form.costoCompra) || this.form.costoCompra<0)) ||
       (this.form.contenidoMl!=null && (!Number.isInteger(this.form.contenidoMl) ||
          this.form.contenidoMl<1 || this.form.contenidoMl>2000)) ||
       (this.form.contenidoGramos!=null && (!Number.isInteger(this.form.contenidoGramos) ||
          this.form.contenidoGramos<1 || this.form.contenidoGramos>20000))) {
      this.error='Completa correctamente el nombre, código, SKU, precio y presentación.';
      return;
    }
    this.guardando=true;
    try {
      await firstValueFrom(this.http.patch(this.url(),{
        ...this.form,
        publicoObjetivo:this.form.publicoObjetivo||null,
        contenidoMl:this.form.contenidoMl??null,
        contenidoGramos:this.form.contenidoGramos??null,categoriaSlug:this.form.categoriaSlug||null,
        familiaOlfativa:this.form.familiaOlfativa||null
      },{headers:this.headers()}));
      Object.assign(this.producto,{
        codigoBarras:this.form.codigoBarras,sku:this.form.sku,nombre:this.form.nombre,
        marca:this.form.marca||null,descripcion:this.form.descripcion||null,
        precio:this.form.precio,costoCompra:this.form.costoCompra,publicoObjetivo:this.form.publicoObjetivo||null,
        contenidoMl:this.form.contenidoMl??null,
        contenidoGramos:this.form.contenidoGramos??null,categoriaSlug:this.form.categoriaSlug||null,
        familiaOlfativa:this.form.familiaOlfativa||null
      });
      this.mensaje='Datos del producto actualizados correctamente.';
      this.guardado.emit();
    } catch(e) {
      const err=e as HttpErrorResponse;
      this.error=err.error?.error||err.error?.detail||'No se pudo guardar la edición.';
    } finally {this.guardando=false;}
  }

  async cargarDescuentos():Promise<void> {
    this.cargandoDescuentos=true;
    try {
      this.descuentos=await firstValueFrom(this.http.get<Descuento[]>(
        this.url()+'/descuentos',{headers:this.headers()}));
    } catch {
      this.error='No se pudo consultar la lista de descuentos.';
    } finally {this.cargandoDescuentos=false;}
  }

  estado(d:Descuento):string {
    if(!d.activo)return 'Desactivado';
    const hoy=Date.now();
    return hoy<Date.parse(d.inicio)?'Programado':
      hoy>=Date.parse(d.fin)?'Finalizado':'Vigente';
  }

  async crearDescuento():Promise<void> {
    if(this.gestionandoDescuento)return;
    this.error='';this.mensaje='';
    const inicio=new Date(this.promo.inicio);
    const fin=new Date(this.promo.fin);
    if(!this.promo.nombre.trim() || !Number.isFinite(this.promo.valor) ||
       this.promo.valor<=0 || Number.isNaN(inicio.getTime()) ||
       Number.isNaN(fin.getTime()) || fin<=inicio ||
       (this.promo.tipo==='PORCENTAJE' && this.promo.valor>=100) ||
       (this.promo.tipo==='MONTO' && this.promo.valor>=this.producto.precio)) {
      this.error='Verifica nombre, importe y fechas. La rebaja debe ser menor al precio.';
      return;
    }
    this.gestionandoDescuento=true;
    try {
      await firstValueFrom(this.http.post(this.url()+'/descuentos',{
        ...this.promo,inicio:inicio.toISOString(),fin:fin.toISOString()
      },{headers:this.headers()}));
      this.mensaje='Descuento registrado. Se aplicará automáticamente durante su vigencia.';
      await this.cargarDescuentos();
      this.guardado.emit();
    }catch(e) {
      const err=e as HttpErrorResponse;
      this.error=err.error?.error||err.error?.detail||'No se pudo registrar el descuento.';
    }finally{this.gestionandoDescuento=false;}
  }

  async desactivar(d:Descuento):Promise<void> {
    if(this.gestionandoDescuento)return;
    this.gestionandoDescuento=true;this.error='';this.mensaje='';
    try {
      await firstValueFrom(this.http.patch(this.url()+'/descuentos/'+d.id+'/desactivar',
        {},{headers:this.headers()}));
      this.mensaje='Descuento desactivado. El historial permanece disponible.';
      await this.cargarDescuentos();
      this.guardado.emit();
    }catch {
      this.error='No se pudo desactivar la promoción.';
    }finally {this.gestionandoDescuento=false;}
  }
}

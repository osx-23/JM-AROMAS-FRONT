import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

type Tipo='YAPE'|'TRANSFERENCIA'|'WHATSAPP';
interface Medio {
  id?:string;tipo:Tipo;titulo:string;titular:string|null;numeroYape:string|null;
  qrUrl:string|null;banco:string|null;numeroCuenta:string|null;cci:string|null;
  telefonoWhatsapp:string|null;activo:boolean;orden:number;
}
function vacio():Medio{return{
  tipo:'YAPE',titulo:'Yape JM-AROMAS',titular:null,numeroYape:null,qrUrl:null,
  banco:null,numeroCuenta:null,cci:null,telefonoWhatsapp:null,activo:false,orden:0
}}
@Component({
  selector:'app-admin-medios',
  standalone:true,
  imports:[CommonModule,FormsModule],
  templateUrl: './admin-medios.component.html',
  styleUrls: ['./admin-medios.component.css']
})
export class AdminMediosComponent implements OnInit {
  @Input({required:true}) accessToken!:string;
  private readonly http=inject(HttpClient);
  medios:Medio[]=[];
  form:Medio=vacio();
  formAbierto=false;
  cargando=false;
  guardando=false;
  subiendo=false;
  qrFile:File|null=null;
  error='';mensaje='';
  ngOnInit():void{void this.cargar();}
  private headers():HttpHeaders{return new HttpHeaders({Authorization:'Bearer '+this.accessToken});}
  async cargar():Promise<void>{
    if(!this.accessToken)return;
    this.cargando=true;
    try{
      this.medios=await firstValueFrom(this.http.get<Medio[]>(
        environment.apiBaseUrl+'/admin/medios-pago',{headers:this.headers()}));
    }catch{this.error='No se pudo obtener la configuración de cobros.';}
    finally{this.cargando=false;}
  }
  nuevo():void{this.form=vacio();this.qrFile=null;this.formAbierto=true;this.error='';this.mensaje='';}
  editar(m:Medio):void{this.form={...m};this.qrFile=null;this.formAbierto=true;this.error='';this.mensaje='';}
  async guardar():Promise<void>{
    this.guardando=true;this.error='';this.mensaje='';
    try{
      if(this.form.id){
        await firstValueFrom(this.http.patch(environment.apiBaseUrl+'/admin/medios-pago/'+this.form.id,
          this.form,{headers:this.headers()}));
      }else{
        const r=await firstValueFrom(this.http.post<{id:string}>(
          environment.apiBaseUrl+'/admin/medios-pago',this.form,{headers:this.headers()}));
        this.form.id=r.id;
      }
      this.mensaje='Medio de pago guardado correctamente.';
      await this.cargar();
    }catch(e:any){
      this.error=e?.error?.error||e?.error?.detail||
        'No se pudo guardar. Comprueba los campos obligatorios.';
    }finally{this.guardando=false;}
  }
  seleccionarQr(event:Event):void{
    const file=(event.target as HTMLInputElement).files?.[0];
    this.qrFile=file||null;
  }
  async subirQr():Promise<void>{
    if(!this.form.id||!this.qrFile)return;
    this.subiendo=true;this.error='';this.mensaje='';
    try{
      const body=new FormData();
      body.append('archivo',this.qrFile,this.qrFile.name);
      const resultado=await firstValueFrom(this.http.post<{qrUrl:string}>(
        environment.apiBaseUrl+'/admin/medios-pago/'+this.form.id+'/qr',
        body,{headers:this.headers()}));
      this.form.qrUrl=resultado.qrUrl;
      this.mensaje='QR cargado en Supabase. Activa el medio y guarda los cambios.';
      this.qrFile=null;
      await this.cargar();
    }catch{this.error='No se pudo subir el QR. Comprueba el formato y la configuración de Storage.';}
    finally{this.subiendo=false;}
  }
}

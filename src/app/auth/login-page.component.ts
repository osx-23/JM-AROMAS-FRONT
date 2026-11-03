import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="pagina">
      <header class="cabecera">
        <a routerLink="/" class="logo">JM<span>✦</span> AROMAS <small>PERFUMERÍA</small></a>
        <a routerLink="/" class="volver">← Seguir mirando perfumes</a>
      </header>
      <main class="contenido">
        <section class="tarjeta">
          <div class="simbolo">✦</div>
          <span class="etiqueta">BIENVENIDO A JM-AROMAS</span>
          <h1>Una cuenta, toda la <em>experiencia.</em></h1>
          <p class="subtitulo">Inicia sesión con Google. Detectaremos tu rol para llevarte al catálogo o al panel administrativo.</p>

          <p *ngIf="cargando" class="info" role="status">Verificando tu sesión y los permisos...</p>
          <p *ngIf="error" class="error" role="alert">{{error}}</p>
          <button *ngIf="!cargando" type="button" class="boton-google"
                  (click)="continuarGoogle()" [disabled]="ingresando">
            <span class="g">G</span>
            <span>{{ingresando ? 'Conectando con Google...' : 'Continuar con Google'}}</span>
            <span class="flecha">→</span>
          </button>
          <button *ngIf="!cargando && sesionExistente && error" type="button"
                  class="reintentar" (click)="verificarRol()">Reintentar verificación</button>
          <p class="nota">Los compradores acceden a la tienda. Solo las cuentas autorizadas como administradoras pueden gestionar productos y pagos.</p>
          <div class="separador"></div>
          <p class="invitado">¿Prefieres comprar sin iniciar sesión? <a routerLink="/">Explora la tienda</a></p>
        </section>
        <aside class="decoracion" aria-hidden="true">
          <span class="ornamento">✧</span>
          <div class="frasco"><span>JM</span><small>AROMAS</small></div>
          <p>TU ESENCIA, TU HISTORIA</p>
        </aside>
      </main>
    </div>
  `,
  styles: [`
    :host{display:block;min-height:100vh;background:#f9f5f0;color:#3b2f27}
    .pagina{min-height:100vh}.cabecera{height:85px;display:flex;align-items:center;justify-content:space-between;padding:0 max(25px,5vw);border-bottom:1px solid #e9ddd2;background:#fff}
    .logo{text-decoration:none;color:#382c24;font:600 25px 'Playfair Display',Georgia,serif;letter-spacing:-.05em}.logo span{font-size:13px;color:#ad805a;vertical-align:top}.logo small{font:700 9px Arial,sans-serif;letter-spacing:.13em;margin-left:7px;color:#9c785c}
    .volver{font-size:12px;color:#805e48;text-decoration:none}
    .contenido{max-width:1050px;min-height:calc(100vh - 85px);margin:auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.75fr);align-items:center;gap:80px;padding:55px 30px}
    .tarjeta{background:#fff;border:1px solid #e9ded3;padding:48px;border-radius:11px;box-shadow:0 20px 55px #4935220a}
    .simbolo{font-size:29px;color:#ab825d;margin-bottom:16px}.etiqueta{font-size:10px;letter-spacing:.19em;font-weight:800;color:#a77a59}
    h1{font:500 clamp(33px,4vw,49px)/1.16 'Playfair Display',Georgia,serif;letter-spacing:-.03em;margin:16px 0 16px}h1 em{color:#ac8265;font-weight:400}
    .subtitulo{font-size:14px;color:#817164;line-height:1.8;margin-bottom:30px}
    .boton-google{width:100%;display:flex;align-items:center;gap:15px;padding:14px 17px;background:#2f2722;color:white;border:0;border-radius:7px;cursor:pointer;font-size:13px;font-weight:700}
    .boton-google:disabled{opacity:.6}.g{background:white;color:#4285f4;font-weight:800;font-size:18px;width:29px;height:29px;display:grid;place-items:center;border-radius:50%}.flecha{margin-left:auto;font-size:20px}
    .nota{font-size:11px;line-height:1.7;color:#938377;margin-top:23px}.separador{height:1px;background:#eee3d8;margin:28px 0 18px}.invitado{color:#86786c;font-size:12px}.invitado a,.reintentar{color:#986749;font-weight:700}.reintentar{background:none;border:0;text-decoration:underline;margin-top:12px;font-size:12px}
    .info,.error{font-size:12px;line-height:1.65;padding:14px 16px;border-radius:5px}.info{background:#f3ede7;color:#6f5949}.error{background:#fff0eb;color:#9d403b}
    .decoracion{height:490px;display:flex;flex-direction:column;justify-content:center;align-items:center;background:radial-gradient(circle at center,#e6d4bc 0,#f3eadd 54%,#f9f5f0 70%)}
    .ornamento{font-size:38px;color:#aa8266}.frasco{width:170px;height:220px;border:7px solid #e4cdaa;border-top:30px solid #aa8061;background:linear-gradient(#f9ecda,#e4c6a1);box-shadow:15px 18px 33px #6b4a2926;border-radius:18px 18px 25px 25px;display:flex;flex-direction:column;justify-content:center;align-items:center;transform:rotate(-6deg)}
    .frasco span{font:600 46px Georgia,serif;color:#875d46}.frasco small{font-size:12px;letter-spacing:.23em;color:#9a7257}.decoracion p{font-size:10px;letter-spacing:.2em;color:#ad8b73;margin-top:35px}
    @media(max-width:850px){.contenido{grid-template-columns:1fr;max-width:620px}.decoracion{display:none}}
    @media(max-width:550px){.cabecera{height:70px;padding:0 17px}.logo{font-size:19px}.logo small{display:none}.volver{font-size:10px}.contenido{padding:27px 17px;min-height:calc(100vh - 70px)}.tarjeta{padding:30px 24px}}
  `]
})
export class LoginPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  cargando = true;
  ingresando = false;
  sesionExistente = false;
  error = '';

  async ngOnInit(): Promise<void> {
    this.error = this.route.snapshot.queryParamMap.get('aviso') || '';
    try {
      const sesion = await this.auth.sesion();
      this.sesionExistente = !!sesion;
      if (sesion) await this.verificarRol();
    } catch {
      this.error = 'No pudimos leer la sesión. Puedes volver a iniciar con Google.';
    } finally {
      this.cargando = false;
    }
  }

  async verificarRol(): Promise<void> {
    this.error = '';
    this.cargando = true;
    try {
      const identidad = await this.auth.identidadActual();
      if (identidad) {
        await this.router.navigateByUrl(identidad.rol === 'ADMIN' ? '/admin' : '/');
      }
    } catch {
      this.error = 'No pudimos comprobar tu rol. Verifica que Spring Boot esté funcionando y vuelve a intentarlo.';
    } finally {
      this.cargando = false;
    }
  }

  async continuarGoogle(): Promise<void> {
    this.error = '';
    this.ingresando = true;
    try {
      await this.auth.iniciarGoogle();
    } catch {
      this.error = 'No se pudo abrir el inicio de sesión de Google. Revisa su configuración en Supabase.';
      this.ingresando = false;
    }
  }
}

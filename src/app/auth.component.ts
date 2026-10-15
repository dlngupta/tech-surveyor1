import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

type AuthMode = 'login' | 'signup' | 'reset' | 'update';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule],
  template: `
    <main class="auth-page">
      <section class="auth-card">
        <div class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="54" height="54">
            <rect x="3" y="3" width="58" height="58" rx="16" fill="#0d4564"/>
            <path d="M12 47 32 17l20 30H12Z" fill="#55a85b"/>
            <path d="M23 47 32 33l9 14H23Z" fill="#a8d66d"/>
            <circle cx="32" cy="23" r="5" fill="#fff"/>
          </svg>
        </div>
        <h1>Tech Surveyor</h1>
        <p class="tagline">Survey and land-record tools</p>

        <form (ngSubmit)="submit()">
          @if (mode() !== 'update') {
            <label class="sr-only" for="email">Email</label>
            <input id="email" type="email" name="email" placeholder="Email" autocomplete="email"
              [(ngModel)]="email" required>
          }

          @if (mode() !== 'reset') {
            <label class="sr-only" for="password">{{ mode() === 'update' ? 'New password' : 'Password' }}</label>
            <input id="password" type="password" name="password"
              [placeholder]="mode() === 'update' ? 'New password' : 'Password'"
              [attr.autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'"
              [(ngModel)]="password" required minlength="6">
          }

          @if (error()) { <p class="message error" role="alert">{{ error() }}</p> }
          @if (notice()) { <p class="message notice" role="status">{{ notice() }}</p> }

          <button class="primary" type="submit" [disabled]="busy()">
            @if (busy()) { Please wait... }
            @else if (mode() === 'signup') { Create user account }
            @else if (mode() === 'reset') { Send reset link }
            @else if (mode() === 'update') { Update password }
            @else { Login }
          </button>
        </form>

        @if (mode() === 'login') {
          <button class="secondary" type="button" (click)="setMode('signup')">Create user account</button>
          <button class="google" type="button" (click)="googleLogin()" [disabled]="busy()">Continue with Google</button>
          <button class="text-button" type="button" (click)="setMode('reset')">Forgot password?</button>
        } @else {
          <button class="text-button" type="button" (click)="setMode('login')">Back to login</button>
        }
      </section>
    </main>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh; box-sizing: border-box; display: grid; place-items: start center;
      padding: clamp(28px, 8vh, 72px) 20px 40px; background: #f0f6f9;
      font-family: system-ui, -apple-system, sans-serif; color: #254d63;
    }
    .auth-card { width: min(100%, 460px); display: flex; flex-direction: column; align-items: stretch; }
    .brand-mark { text-align: center; margin-bottom: 6px; }
    h1 { margin: 0; text-align: center; font-size: 28px; color: #164b68; }
    .tagline { margin: 6px 0 30px; text-align: center; color: #71818a; }
    form { display: grid; gap: 12px; }
    input {
      box-sizing: border-box; width: 100%; min-height: 60px; padding: 14px 18px;
      border: 1px solid #ccd6db; border-radius: 12px; background: #fff; font: inherit; font-size: 18px;
    }
    input:focus { outline: 2px solid #5c9cc0; outline-offset: 1px; }
    button { min-height: 54px; padding: 12px 18px; border-radius: 11px; font: inherit; font-size: 17px; cursor: pointer; }
    button:disabled { opacity: .65; cursor: wait; }
    .primary { margin-top: 16px; border: 0; color: #fff; background: #0d4564; }
    .secondary, .google { margin-top: 10px; border: 1px solid #164b68; background: #fff; color: #315d73; }
    .google { border-color: #648fca; color: #4c80c4; }
    .text-button { min-height: 42px; margin-top: 8px; border: 0; background: transparent; color: #356c9a; }
    .message { margin: 4px 0; font-size: 14px; }
    .error { color: #b42318; }
    .notice { color: #267344; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
  `],
})
export class AuthComponent {
  email = '';
  password = '';
  mode = signal<AuthMode>('login');
  busy = signal(false);
  error = signal('');
  notice = signal('');

  constructor(private drive: SupabaseService, private router: Router, private route: ActivatedRoute) {
    if (this.route.snapshot.routeConfig?.path === 'reset-password') this.mode.set('update');
  }

  setMode(mode: AuthMode) {
    this.mode.set(mode);
    this.error.set('');
    this.notice.set('');
  }

  async submit() {
    if (this.busy()) return;
    this.error.set('');
    this.notice.set('');
    this.busy.set(true);
    try {
      if (this.mode() === 'reset') {
        await this.drive.sendPasswordReset(this.email.trim());
        this.notice.set('If an account exists for that email, a password reset link has been sent.');
      } else if (this.mode() === 'update') {
        await this.drive.updatePassword(this.password);
        this.notice.set('Password updated.');
        await this.router.navigate(['/']);
      } else if (this.mode() === 'signup') {
        const needsConfirmation = await this.drive.signUp(this.email.trim(), this.password);
        if (needsConfirmation) {
          this.notice.set('Check your email to confirm your account, then log in.');
          this.mode.set('login');
        } else {
          await this.router.navigate(['/']);
        }
      } else {
        await this.drive.signIn(this.email.trim(), this.password);
        await this.router.navigate(['/']);
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Unable to complete the request. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }

  async googleLogin() {
    if (this.busy()) return;
    this.error.set('');
    this.busy.set(true);
    try {
      await this.drive.signInWithGoogle();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Google sign-in could not be started.');
      this.busy.set(false);
    }
  }
}

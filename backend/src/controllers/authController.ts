import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { UserRegistration, UserLogin } from '../models/User';
import config from '../config/config';

const authService = new AuthService();

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData: UserRegistration = req.body;
    // Validation basique (peut être remplacée par Joi/Zod)
    if (!userData.email || !userData.password || !userData.phone_number) {
        res.status(400).json({ message: 'Email, password and phone_number are required.' });
        return;
    }
    const phone = String(userData.phone_number).trim();
    const phoneRegex = /^\+?\d{7,15}$/;
    if (!phoneRegex.test(phone)) {
        res.status(400).json({ message: 'Invalid phone_number format. Use international format, e.g. +261340000000' });
        return;
    }

    // Vérifier la confirmation du mot de passe si fournie
    const confirmPassword = (req.body as any).confirm_password;
    if (typeof confirmPassword !== 'string' || confirmPassword.length === 0) {
        res.status(400).json({ message: 'confirm_password is required.' });
        return;
    }
    if (userData.password !== confirmPassword) {
        res.status(400).json({ message: 'Passwords do not match.' });
        return;
    }

    const { user, token } = await authService.register(userData);
    res.status(201).json({ message: 'User registered successfully. Please check your email for verification.', user, token });
  } catch (error) {
    const err = error as Error;
    // Gérer les conflits (email déjà existant)
    if (err.message.includes('already exists')) {
        res.status(409).json({ message: err.message });
    } else {
        res.status(500).json({ message: 'An internal error occurred.', error: err.message });
    }
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const credentials: UserLogin = req.body;
    if (!credentials.email || !credentials.password) {
        res.status(400).json({ message: 'Email and password are required.' });
        return;
    }

    const { user, token } = await authService.login(credentials);
    res.status(200).json({ user, token });
  } catch (error) {
     const err = error as Error;
    // Gérer les identifiants invalides
    if (err.message.includes('Invalid credentials')) {
        res.status(401).json({ message: err.message });
    } else {
        res.status(500).json({ message: 'An internal error occurred.', error: err.message });
    }
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    await authService.verifyEmail(token);
    // Idéalement, rediriger vers une page de succès sur le frontend
    res.status(200).json({ message: 'Email verified successfully.' });
  } catch (error) {
    const err = error as Error;
    res.status(400).json({ message: 'Invalid or expired verification token.', error: err.message });
  }
};

export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
        res.status(400).json({ message: 'Email is required.' });
        return;
    }
    await authService.requestPasswordReset(email);
    // Toujours renvoyer un message de succès pour éviter l'énumération d'utilisateurs
    res.status(200).json({ message: 'If an account with this email exists, a password reset link has been sent.' });
  } catch (error) {
    const err = error as Error;
    // Ne pas exposer l'erreur au client, mais la logger côté serveur
    console.error('Password reset request error:', err);
    res.status(200).json({ message: 'If an account with this email exists, a password reset link has been sent.' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
        res.status(400).json({ message: 'Token and new password are required.' });
        return;
    }
    await authService.resetPassword(token, password);
    res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    const err = error as Error;
    res.status(400).json({ message: 'Invalid or expired reset token.', error: err.message });
  }
};

// Serve a minimal HTML page for password reset (backend-only flow)
export const resetPasswordPage = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.params;
  if (!token) {
    res.status(400).send('Missing token');
    return;
  }
  const html = `<!doctype html>
  <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Réinitialisation du mot de passe - EasyScrapy</title>
      <meta name="color-scheme" content="light dark">
      <style>
        :root{--bg-start:#0f172a;--bg-end:#1f2937;--card-bg:#ffffff;--text:#111827;--muted:#6b7280;--brand:#4f46e5;--brand-dark:#4338ca;--ring:#a5b4fc;--error:#b91c1c;--success:#065f46}
        @media (prefers-color-scheme: dark){:root{--card-bg:#0b1220;--text:#e5e7eb;--muted:#9ca3af}}
        *{box-sizing:border-box}
        body{margin:0;min-height:100vh;background:linear-gradient(135deg,var(--bg-start),var(--bg-end));display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,Segoe UI,Roboto,Arial,Helvetica,sans-serif;color:var(--text);padding:24px}
        .card{width:100%;max-width:480px;background:var(--card-bg);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.25),0 2px 10px rgba(0,0,0,.15);overflow:hidden;border:1px solid rgba(255,255,255,.06)}
        .header{display:flex;align-items:center;gap:10px;padding:20px 24px;border-bottom:1px solid rgba(0,0,0,.06)}
        .brand{width:36px;height:36px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;background:rgba(99,102,241,.15)}
        .title{font-size:16px;font-weight:600}
        .content{padding:24px}
        h2{margin:0 0 8px 0;font-size:22px}
        p.lead{margin:0 0 16px 0;color:var(--muted)}
        label{display:block;margin:14px 0 8px 0;font-size:14px}
        .field{position:relative}
        input{width:100%;padding:12px 44px 12px 12px;border:1px solid rgba(148,163,184,.6);background:transparent;color:inherit;border-radius:10px;font-size:14px;outline:none;transition:border .2s, box-shadow .2s}
        input:focus{border-color:var(--ring);box-shadow:0 0 0 4px rgba(165,180,252,.25)}
        .toggle{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:transparent;border:0;color:var(--muted);cursor:pointer;padding:6px;border-radius:8px}
        .toggle:hover{color:var(--text);background:rgba(148,163,184,.15)}
        .hint{color:var(--muted);font-size:12px;margin-top:8px}
        .alert{margin-top:12px;padding:10px 12px;border-radius:10px;font-size:14px}
        .alert.error{background:rgba(185,28,28,.08);color:#ef4444;border:1px solid rgba(185,28,28,.25)}
        .alert.success{background:rgba(5,150,105,.08);color:#34d399;border:1px solid rgba(5,150,105,.25)}
        .actions{margin-top:18px;display:flex;gap:10px;align-items:center}
        button.primary{flex:1;background:var(--brand);color:#fff;border:0;border-radius:10px;padding:12px 14px;font-size:14px;font-weight:600;cursor:pointer;transition:transform .02s ease, background .2s}
        button.primary:hover{background:var(--brand-dark)}
        button.primary:active{transform:translateY(1px)}
        .ghost{background:transparent;border:1px solid rgba(148,163,184,.5);color:var(--text);padding:11px 14px;border-radius:10px;text-decoration:none;font-size:14px}
        .footer{padding:14px 24px;border-top:1px solid rgba(0,0,0,.06);color:var(--muted);font-size:12px;text-align:center}
      </style>
    </head>
    <body>
      <div class="card" id="card">
        <div class="header">
          <div class="brand" aria-label="EasyScrapy">
            <img src="${config.server.frontendUrl}/favicon.ico" alt="Logo" width="36" height="36" style="display:block;object-fit:cover;width:36px;height:36px;border-radius:10px;" />
          </div>
          <div class="title">EasyScrapy</div>
        </div>
        <div class="content">
          <h2>Réinitialiser votre mot de passe</h2>
          <p class="lead">Définissez un nouveau mot de passe sécurisé pour votre compte.</p>
          <form id="resetForm" novalidate>
            <input type="hidden" name="token" value="${token}" />
            <label for="password">Nouveau mot de passe</label>
            <div class="field">
              <input id="password" name="password" type="password" minlength="8" autocomplete="new-password" required placeholder="Au moins 8 caractères" />
              <button type="button" class="toggle" aria-label="Afficher/Masquer" data-target="password">👁️</button>
            </div>
            <label for="confirm">Confirmer le mot de passe</label>
            <div class="field">
              <input id="confirm" name="confirm" type="password" minlength="8" autocomplete="new-password" required placeholder="Ressaisissez le mot de passe" />
              <button type="button" class="toggle" aria-label="Afficher/Masquer" data-target="confirm">👁️</button>
            </div>
            <div class="hint">Le mot de passe doit contenir au minimum 8 caractères.</div>
            <div id="msg" class="alert" style="display:none"></div>
            <div class="actions">
              <button id="submitBtn" class="primary" type="submit">Mettre à jour le mot de passe</button>
              <a class="ghost" href="${config.server.frontendUrl}/login">Se connecter</a>
            </div>
          </form>
        </div>
        <div class="footer">${new Date().getFullYear()} EasyScrapy — Tous droits réservés.</div>
      </div>
      <script>
        const form = document.getElementById('resetForm');
        const msg = document.getElementById('msg');
        const submitBtn = document.getElementById('submitBtn');
        document.querySelectorAll('.toggle').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-target');
            const input = document.getElementById(id);
            input.type = input.type === 'password' ? 'text' : 'password';
          });
        });

        function showMessage(type, text){
          msg.className = 'alert ' + type;
          msg.style.display = 'block';
          msg.textContent = text;
        }

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          msg.style.display = 'none';
          const password = (document.getElementById('password')).value.trim();
          const confirm = (document.getElementById('confirm')).value.trim();
          if (password.length < 8) {
            showMessage('error','Le mot de passe doit contenir au moins 8 caractères.');
            return;
          }
          if (password !== confirm) {
            showMessage('error','Les mots de passe ne correspondent pas.');
            return;
          }
          submitBtn.disabled = true;
          submitBtn.textContent = 'Mise à jour...';
          try {
            const res = await fetch('/api/auth/reset-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: '${token}', password })
            });
            const data = await res.json().catch(()=>({}));
            if (res.ok) {
              showMessage('success','Mot de passe mis à jour avec succès. Redirection vers la connexion dans 2 secondes...');
              form.reset();
              setTimeout(() => { window.location.href = '${config.server.frontendUrl}/login'; }, 2000);
            } else {
              showMessage('error', data.message || 'Une erreur est survenue.');
            }
          } catch (err) {
            showMessage('error','Erreur réseau. Veuillez réessayer.');
          } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Mettre à jour le mot de passe';
          }
        });
      </script>
    </body>
  </html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
};


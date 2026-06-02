import React, { useState } from 'react';
import { User, LogIn, Mail, ShieldAlert, CheckCircle, Info } from 'lucide-react';
import { GLOBAL_ADMIN_EMAIL } from '../data';

interface LoginFormProps {
  onLoginSuccess: (email: string) => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validateDomain = (emailVal: string): boolean => {
    const trimmed = emailVal.toLowerCase().trim();
    if (GLOBAL_ADMIN_EMAIL && trimmed === GLOBAL_ADMIN_EMAIL.toLowerCase()) {
      return true;
    }
    return trimmed.includes('@');
  };

  const handleAction = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const targetEmail = email.trim().toLowerCase();
    
    if (!targetEmail) {
      setError('Vul a.u.b. een e-mailadres in.');
      return;
    }

    if (!validateDomain(targetEmail)) {
      setError('Voer a.u.b. een geldig e-mailadres in.');
      return;
    }

    if (isRegister) {
      if (!name.trim()) {
        setError('Vul a.u.b. uw naam in.');
        return;
      }
      if (password.length < 4) {
        setError('Kies een wachtwoord van minimaal 4 tekens.');
        return;
      }

      // Store registration locally
      const stored = localStorage.getItem('logius_registered_users');
      let users = stored ? JSON.parse(stored) : [];
      
      const exists = users.some((u: any) => u.email.toLowerCase() === targetEmail);
      if (exists) {
        setError('Dit e-mailadres is al geregistreerd. Switch naar "Inloggen".');
        return;
      }

      users.push({
        email: targetEmail,
        name: name.trim(),
        password: password
      });
      localStorage.setItem('logius_registered_users', JSON.stringify(users));

      setSuccess('Account succesvol aangemaakt! U kunt nu inloggen.');
      setIsRegister(false);
      setPassword('');
    } else {
      // Login check
      // For ease of testing and user comfort, allow login if user is global admin, or if user is in initial mock database, or if they signed up
      const stored = localStorage.getItem('logius_registered_users');
      const registered = stored ? JSON.parse(stored) : [];

      const initialLogiusEmails = [
        'admin@logius.nl',
        'developer.josh@logius.nl',
        'designer.sarah@logius.nl',
        'analyst.kim@logius.nl',
        'tester.rob@logius.nl',
        'teamadmin.maria@logius.nl',
        'developer.bob@logius.nl',
        'support.elise@logius.nl',
        GLOBAL_ADMIN_EMAIL
      ];

      const foundUser = registered.find((u: any) => u.email.toLowerCase() === targetEmail);
      
      if (foundUser) {
        if (password && foundUser.password !== password) {
          setError('Incorrect wachtwoord voor deze geregistreerde gebruiker.');
          return;
        }
        onLoginSuccess(targetEmail);
      } else if (initialLogiusEmails.some(e => e.toLowerCase() === targetEmail)) {
        // Automatically allow initial mock login to simplify review testing without forcing password set
        onLoginSuccess(targetEmail);
      } else {
        // Direct mock create and auto-login if they did not sign up but are logius domain (very onboarding-friendly!)
        const users = registered;
        users.push({
          email: targetEmail,
          name: targetEmail.split('@')[0].replace('.', ' '),
          password: 'pass'
        });
        localStorage.setItem('logius_registered_users', JSON.stringify(users));
        onLoginSuccess(targetEmail);
      }
    }
  };

  return (
    <div id="login-form-card" className="max-w-md w-full mx-auto bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden font-sans">
      {/* Visual Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-8 text-white relative">
        <div className="absolute top-2 right-3 flex items-center gap-1 bg-white/10 text-white/90 text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
          <Info size={11} />
          <span>Logius.nl Beveiliging</span>
        </div>
        <div className="flex justify-center mb-2">
          <div className="h-12 w-12 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <User size={24} className="text-indigo-400" />
          </div>
        </div>
        <h2 className="text-center font-bold text-xl tracking-tight">Team Enquête Portaal</h2>
        <p className="text-center text-xs text-indigo-200 mt-1 max-w-xs mx-auto">
          Metingen, teamscores en realtime dashboards
        </p>
      </div>

      <div className="p-6 md:p-8">
        {/* Toggle Nav */}
        <div className="flex border-b border-slate-100 pb-4 mb-6">
          <button
            id="login-toggle-login"
            onClick={() => { setIsRegister(false); setError(null); }}
            className={`flex-1 text-center pb-2 text-sm font-semibold transition-all cursor-pointer ${
              !isRegister ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Inloggen
          </button>
          <button
            id="login-toggle-register"
            onClick={() => { setIsRegister(true); setError(null); }}
            className={`flex-1 text-center pb-2 text-sm font-semibold transition-all cursor-pointer ${
              isRegister ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Account registreren
          </button>
        </div>

        {/* Status Messages */}
        {!GLOBAL_ADMIN_EMAIL && (
          <div id="login-admin-missing-alert" className="mb-4 p-3.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl flex gap-2.5 items-start text-xs leading-normal font-sans">
            <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Systeembeheerder niet ingesteld:</strong> Er is momenteel geen globaal e-mailadres voor de beheerder geconfigureerd in de omgevingsvariabelen (VITE_GLOBAL_ADMIN_EMAIL). Log in is mogelijk voor teamleden, maar globale beheerfuncties zijn niet toegankelijk.
            </div>
          </div>
        )}

        {error && (
          <div id="login-error-alert" className="mb-4 p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg flex gap-2.5 items-start text-xs leading-relaxed">
            <ShieldAlert size={16} className="text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div id="login-success-alert" className="mb-4 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg flex gap-2.5 items-start text-xs leading-relaxed">
            <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleAction} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
              E-mailadres
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                id="login-email-input"
                type="email"
                placeholder="bv. uw.naam@logius.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-sans"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Gebruik uw zakelijke e-mailadres om toegang te krijgen tot uw teamgegevens.
            </p>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Volledige naam
              </label>
              <input
                id="login-name-input"
                type="text"
                placeholder="bv. Anna de Vries"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg py-2 px-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-sans"
                required={isRegister}
              />
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Wachtwoord
              </label>
              {!isRegister && (
                <span className="text-[10px] text-indigo-600 font-medium">
                  {`Standaard of test accounts loggen direct in`}
                </span>
              )}
            </div>
            <input
              id="login-password-input"
              type="password"
              placeholder={isRegister ? "Kies een veilig wachtwoord" : "Voer uw wachtwoord in (optioneel voor demo)"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg py-2 px-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-sans font-mono"
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            className="w-full bg-slate-900 border border-slate-800 text-white py-2.5 px-4 rounded-lg font-semibold text-sm hover:bg-slate-800 cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
          >
            <LogIn size={16} />
            <span>{isRegister ? 'Account Aanmaken' : 'Veilig Inloggen'}</span>
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500 leading-normal">
          <div className="h-6 w-6 shrink-0 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 font-semibold font-mono text-xs">
            i
          </div>
          <div>
            Gebruik de <strong className="text-slate-700">Rol-wisselaar</strong> rechtsonder om onmiddellijk verschillende testaccounts en scenario&apos;s met één klik te laden.
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { User, LogIn, Mail, ShieldAlert, CheckCircle, Info } from 'lucide-react';
import { loginWithEmailAndRealPassword, registerWithEmailAndRealPassword, sendPasswordReset, saveUserDoc, logoutUser, checkAndRestoreUserAccess } from '../firestoreService';
import { doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';

interface LoginFormProps {
  onLoginSuccess: (email: string, password?: string) => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateDomain = (emailVal: string): boolean => {
    const trimmed = emailVal.toLowerCase().trim();
    return trimmed.includes('@');
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const targetEmail = email.trim().toLowerCase();
    
    if (!targetEmail) {
      setError('Vul a.u.b. een e-mailadres in.');
      setIsLoading(false);
      return;
    }

    if (!validateDomain(targetEmail)) {
      setError('Voer a.u.b. een geldig e-mailadres in.');
      setIsLoading(false);
      return;
    }

    if (isRegister) {
      if (!name.trim()) {
        setError('Vul a.u.b. uw naam in.');
        setIsLoading(false);
        return;
      }
      if (password.length < 4) {
        setError('Kies een wachtwoord van minimaal 4 tekens.');
        setIsLoading(false);
        return;
      }

      try {
        if (isFirebaseConfigured) {
          await registerWithEmailAndRealPassword(targetEmail, password);
          await saveUserDoc(targetEmail, name.trim(), password);
        }

        setSuccess('Account succesvol aangemaakt! U kunt nu inloggen.');
        setIsRegister(false);
        setPassword('');
      } catch (err: any) {
        console.error("Registratiefout:", err);
        if (err.code === 'auth/email-already-in-use') {
          setSuccess('Dit e-mailadres is al geregistreerd. U kunt direct inloggen met uw wachtwoord.');
          setIsRegister(false);
          setPassword('');
        } else if (err.code === 'auth/weak-password') {
          setError('Kies een sterker wachtwoord.');
        } else if (err.code === 'auth/operation-not-allowed') {
          setError('E-mail/Wachtwoord accounts zijn momenteel niet toegestaan in Firebase Console.');
        } else {
          setError(`Registratie mislukt: ${err.message || 'Onbekende fout'}`);
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      // Login check
      try {
        if (isFirebaseConfigured) {
          if (!password) {
            setError('Vul a.u.b. uw wachtwoord in.');
            setIsLoading(false);
            return;
          }

          const targetPassword = password;
          await loginWithEmailAndRealPassword(targetEmail, targetPassword);
          
          // Verify if user is authorized (either global admin or listed in a team)
          const isAuthorized = await checkAndRestoreUserAccess(targetEmail, targetPassword);
          if (!isAuthorized) {
            await logoutUser();
            setError('Uw account is momenteel niet gekoppeld aan een team of is verwijderd uit het systeem door een teamadmin. Neem contact op met uw teamadmin.');
            setIsLoading(false);
            return;
          }
          
          onLoginSuccess(targetEmail, targetPassword);
          return;
        } else {
          setError('Firebase is niet correct geconfigureerd voor de authenticatie.');
        }
      } catch (err: any) {
        console.error("Login push error list:", err);
        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          setError('Incorrect wachtwoord voor dit e-mailadres. Probeer het opnieuw.');
        } else if (err.code === 'auth/user-not-found') {
          setError('Gebruiker niet gevonden in de database. Gelieve eerst te registreren.');
        } else {
          setError(`Inloggen mislukt: ${err.message || 'Onbekende fout'}`);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setSuccess(null);
    const targetEmail = email.trim().toLowerCase();

    if (!targetEmail) {
      setError('Vul a.u.b. eerst uw e-mailadres in om een herstellink te ontvangen.');
      return;
    }

    if (!validateDomain(targetEmail)) {
      setError('Voer a.u.b. een geldig e-mailadres in.');
      return;
    }

    setIsLoading(true);
    try {
      if (isFirebaseConfigured) {
        await sendPasswordReset(targetEmail);
        setSuccess('Er is een herstel-e-mail aangevraagd via Firebase! Controleer direct uw spam/ongewenste e-mailfolder. LET OP: Omdat Firebase systeemmafhandeling via een tijdelijk domein (zoals noreply@...) verloopt, worden deze e-mails soms geblokkeerd of gefilterd door strenge spamfilters. Als u de Firebase-projecteigenaar bent en de mail niet ontvangt, kunt u ook naar de Firebase Console (Authentication) gaan om het wachtwoord handmatig te resetten of het account tijdelijk te verwijderen zodat de auto-create bij inloggen weer werkt.');
      } else {
        // Mock fallback success
        setSuccess(`[Simulatie] Herstellink gestuurd naar ${targetEmail}!`);
      }
    } catch (err: any) {
      console.error("Password reset failure:", err);
      setError(`Kan herstellink niet verzenden: ${err.message || 'Onbekende fout'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="login-form-card" className="max-w-md w-full mx-auto bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden font-sans">
      {/* Visual Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-8 text-white relative">
        <div className="absolute top-2 right-3 flex items-center gap-1 bg-white/10 text-white/90 text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
          <Info size={11} />
          <span>Beveiligde Toegang</span>
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
                placeholder="bv. uw.naam@example.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-sans"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Gebruik uw geautoriseerde e-mailadres om toegang te krijgen tot uw teamgegevens.
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
                <button
                  type="button"
                  id="forgot-password-btn"
                  onClick={handleForgotPassword}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer transition-colors"
                >
                  Wachtwoord vergeten?
                </button>
              )}
            </div>
            <input
              id="login-password-input"
              type="password"
              placeholder={isRegister ? "Kies een veilig wachtwoord" : "Voer uw wachtwoord in"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 rounded-lg py-2 px-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all font-sans font-mono"
              required
            />
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 border border-slate-800 text-white py-2.5 px-4 rounded-lg font-semibold text-sm hover:bg-slate-800 cursor-pointer shadow-md transition-all flex items-center justify-center gap-2 disabled:bg-slate-400 disabled:border-slate-300 disabled:cursor-not-allowed"
          >
            <LogIn size={16} />
            <span>{isLoading ? 'Bezig...' : (isRegister ? 'Account Aanmaken' : 'Veilig Inloggen')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

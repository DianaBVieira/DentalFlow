import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';

interface LoginProps {
  onEnterTestMode: () => void;
}

export default function Login({ onEnterTestMode }: LoginProps) {
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Por favor, insira seu email para recuperar a senha.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setError('Email de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar email de recuperação');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-brand-sand max-w-sm w-full">
        <div className="flex justify-center mb-4">
          <img src="/assets/LogoDentalFlow.png" alt="DentalFlow" className="h-16 w-auto" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-6 font-display text-brand-dark">
          {isRegistering ? 'Cadastro' : 'Login'}
        </h1>
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-brand-sand rounded-lg focus:ring-2 focus:ring-brand-green outline-none"
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-brand-sand rounded-lg focus:ring-2 focus:ring-brand-green outline-none"
            required
          />
          <button 
            type="button" 
            onClick={handleForgotPassword}
            className="text-xs text-brand-muted hover:underline self-end"
          >
            Esqueci minha senha
          </button>
          <button type="submit" className="w-full py-3 bg-brand-green text-white rounded-lg font-semibold hover:bg-brand-green/90 transition shadow-md">
            {isRegistering ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-2 text-xs text-brand-muted text-center">
          <div className="flex-1 h-px bg-brand-sand"></div>
          OU
          <div className="flex-1 h-px bg-brand-sand"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Entrar com Google
        </button>

        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="w-full mt-4 text-sm text-brand-green font-semibold hover:underline"
        >
          {isRegistering ? 'Já tem conta? Entre aqui' : 'Não tem conta? Cadastre-se'}
        </button>
        
        <button
          onClick={onEnterTestMode}
          className="w-full mt-6 py-2 text-xs text-brand-muted hover:underline"
        >
          Entrar sem login (modo teste)
        </button>

        <footer className="mt-8 text-center pt-4 border-t border-brand-sand/20">
          <p className="text-[10px] text-brand-muted/60 tracking-wider font-mono flex items-center justify-center gap-1">
             <img src="/assets/utopia.png" alt="Utopia" className="h-3 w-auto" /> 
             <span>Utopia Desenvolvimentos</span>
          </p>
        </footer>
      </div>
    </div>
  );
}

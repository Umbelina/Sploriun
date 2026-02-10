import React, { useState } from 'react';
import { signIn, signUp } from '../lib/auth';
import { useNavigate, useParams } from 'react-router-dom';

export default function ClientLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const nav = useNavigate();
  const { slug } = useParams();

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSigningUp) await signUp(email, password);
      else await signIn(email, password);
      // After login, redirect to client dashboard or back to slug
      if (slug) nav(`/${slug}`);
      else nav('/client/app');
    } catch (err: any) {
      setMessage(err.message || 'Erro de autenticação');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handle} className="w-full max-w-md bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Login Cliente</h2>
        {message && <div className="mb-3 text-red-600">{message}</div>}
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full mb-3 p-3 border rounded" />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" type="password" className="w-full mb-3 p-3 border rounded" />
        <div className="flex gap-2">
          <button className="bg-black text-white px-4 py-2 rounded">{isSigningUp ? 'Cadastrar' : 'Entrar'}</button>
          <button type="button" onClick={() => setIsSigningUp(s => !s)} className="px-4 py-2 border rounded">{isSigningUp ? 'Já tenho conta' : 'Criar conta'}</button>
        </div>
      </form>
    </div>
  );
}

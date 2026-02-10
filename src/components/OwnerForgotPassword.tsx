// src/components/OwnerForgotPassword.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, CheckCircle } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';
import { Alert } from './Alert';
import { resetPassword } from '../lib/auth';

export default function OwnerForgotPassword() {
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const sploriunLogo = `${import.meta.env.BASE_URL}images/logo_sploriun_large.png`;

  useEffect(() => {
    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsValid(emailRegex.test(email));
  }, [email]);

  useEffect(() => {
    if (emailSent && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [emailSent, countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsLoading(true);
    setError(null);

    try {
      await resetPassword(email);
      setEmailSent(true);
      setCountdown(60);
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar email de recuperação');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;

    setIsLoading(true);
    setError(null);

    try {
      await resetPassword(email);
      setCountdown(60);
    } catch (err: any) {
      setError(err?.message || 'Erro ao reenviar email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Indicador visual temporário para debug */}
      <div className="fixed top-2 left-2 z-[9999] bg-red-500 text-white px-2 py-1 text-xs font-bold">
        RECOVER SCREEN - max-w-md ativo
      </div>

      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          
          {/* Logo */}
          <div className="flex justify-center mb-12">
            <img src={sploriunLogo} alt="Sploriun" className="w-[150px] h-auto" />
          </div>

          {/* CARD */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            
            <div className="text-center mb-8">
              <h1 className="text-3xl mb-2 text-[#1E3A8A]">Recuperar Senha</h1>
              <p className="text-gray-600">
                {emailSent ? 'Instruções enviadas!' : 'Digite seu email para receber as instruções'}
              </p>
            </div>

          {error && (
            <div className="mb-6">
              <Alert type="error">{error}</Alert>
            </div>
          )}

          {!emailSent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm text-[#1E3A8A]">
                  Email
                </label>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" style={{ marginLeft: '10px' }} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 border-gray-300 focus:border-[#1E3A8A] focus:ring-[#1E3A8A]"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={!isValid || isLoading}
                className="w-full h-12 text-white transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed !bg-[#1E3A8A]"
                loading={isLoading}
              >
                Enviar Email de Recuperação
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#1E3A8A]/10">
                  <CheckCircle className="w-10 h-10 text-[#1E3A8A]" />
                </div>

                <div className="space-y-2">
                  <p className="text-lg font-semibold text-[#1E3A8A]">
                    Email enviado!
                  </p>
                  <p className="text-gray-600 text-sm">
                    Enviamos as instruções para <strong>{email}</strong>
                  </p>
                </div>

                <div className="w-full p-4 rounded-lg bg-[#FAFAFA]">
                  <p className="text-sm text-gray-700">
                    {countdown > 0 ? (
                      <>
                        Você pode reenviar em{' '}
                        <span className="font-mono text-[#1E3A8A]">
                          {countdown}
                        </span>{' '}
                        segundo{countdown !== 1 ? 's' : ''}
                      </>
                    ) : (
                      'Você já pode reenviar o email'
                    )}
                  </p>
                </div>

                <Button
                  onClick={handleResend}
                  disabled={countdown > 0 || isLoading}
                  className="w-full h-12 text-white transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed !bg-[#1E3A8A]"
                  loading={isLoading}
                >
                  Reenviar Email
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/owner/login')}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Voltar para o login
          </button>
        </div>

      </div>
    </div>
  </>
  );
}

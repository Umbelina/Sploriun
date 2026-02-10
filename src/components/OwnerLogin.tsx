// src/components/OwnerLogin.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, signUp } from '../lib/auth';
import { Input } from './Input';
import { Button } from './Button';
import { Alert } from './Alert';
import { Mail, Lock, Calendar, Clock, Bell, Shield } from 'lucide-react';
import '../../styles/OwnerLogin.css';

export default function OwnerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const nav = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setShowError(true);
      return;
    }

    setIsLoading(true);
    setShowError(false);
    setMessage(null);

    try {
      const cleanedEmail = email.trim().toLowerCase();
      if (!cleanedEmail.includes('@')) throw new Error('Informe um e-mail válido.');

      if (password !== password.trim()) {
        setMessage("A senha não pode começar ou terminar com espaço.");
        setIsLoading(false);
        return;
      }
      const cleanedPassword = password;

      if (isSigningUp) await signUp(cleanedEmail, password);
      else await signIn(cleanedEmail, password);

      nav("/owner/app", { replace: true });
    } catch (err: any) {
      setMessage(err?.message || 'Erro de autenticação');
    } finally {
      setIsLoading(false);
    }
  };

  const sploriunLogo = `${import.meta.env.BASE_URL}images/logo_sploriun_large.png`;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA' }}>
      {/* Container Split Screen */}
      <div className="owner-login__grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh' }}>

        {/* COLUNA ESQUERDA - Hero Section (some no mobile/tablet via CSS) */}
        <div
          className="owner-login__left"
          style={{
            padding: '80px 80px 60px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: '48px',
          }}
        >
          <div>
            <img src={sploriunLogo} alt="Sploriun" style={{ width: '150px', height: '40px' }} />
          </div>

          <div style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '48px', fontWeight: '600', lineHeight: '1.2', margin: '0', color: '#030213' }}>
              Acesso do Proprietário
            </h1>
            <p style={{ fontSize: '18px', color: '#717182', margin: '0', lineHeight: '1.5' }}>
              Entre para administrar sua agenda e seus atendimentos.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Calendar style={{ width: '24px', height: '24px', color: '#030213' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0', color: '#030213' }}>
                  Controle de disponibilidade
                </h3>
                <p style={{ fontSize: '14px', color: '#717182', margin: '0', lineHeight: '1.5' }}>
                  Gerencie horários e bloqueios com facilidade
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock style={{ width: '24px', height: '24px', color: '#030213' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0', color: '#030213' }}>
                  Agenda do dia e reagendamentos
                </h3>
                <p style={{ fontSize: '14px', color: '#717182', margin: '0', lineHeight: '1.5' }}>
                  Visualize e ajuste compromissos em tempo real
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bell style={{ width: '24px', height: '24px', color: '#030213' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0', color: '#030213' }}>
                  Notificações de cancelamento
                </h3>
                <p style={{ fontSize: '14px', color: '#717182', margin: '0', lineHeight: '1.5' }}>
                  Receba alertas instantâneos de mudanças
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA - Login Form */}
        <div
          className="owner-login__right"
          style={{
            padding: '60px 80px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
            gap: '32px',
          }}
        >
          {/* MOBILE HEADER (aparece só no mobile/tablet) */}
          <div className="owner-login__mobile-header">
            <div className="owner-login__mobile-logo">
              <img
                src={sploriunLogo}
                alt="Sploriun"
                style={{
                  width: '150px',
                  height: '40px',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#0a0a0a' }}>
              Acesso do Proprietário
            </h1>
            <p style={{ margin: '8px 0 0 0', color: '#666666', lineHeight: 1.5 }}>
              Entre para administrar sua agenda e seus atendimentos.
            </p>
          </div>

          {/* Login Card */}
          <div
            className="owner-login__card"
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '16px',
              padding: '48px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              width: '100%',
              maxWidth: '480px',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            <h2 style={{ fontSize: '28px', fontWeight: '600', margin: '0 0 12px 0', color: '#030213' }}>
              {isSigningUp ? 'Crie sua conta' : 'Entrar no painel'}
            </h2>
            <p style={{ fontSize: '16px', color: '#717182', margin: '0 0 32px 0', lineHeight: '1.5' }}>
              {isSigningUp ? 'Crie sua conta para começar a usar a plataforma' : 'Digite suas credenciais para acessar'}
            </p>

            {message && (
              <div style={{ marginBottom: '24px' }}>
                <Alert type="error">{message}</Alert>
              </div>
            )}

            {showError && !message && (
              <div style={{ marginBottom: '24px' }}>
                <Alert type="error">E-mail ou senha inválidos. Tente novamente.</Alert>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                marginBottom: '32px',
                width: '100%',
                minWidth: 0,
              }}
            >
              <Input
                type="email"
                label="E-mail"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail style={{ marginLeft: '10px' }} />}
                error={showError && !email ? 'E-mail é obrigatório' : undefined}
              />

              <Input
                type="password"
                label="Senha"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock style={{ marginLeft: '10px' }} />}
                error={showError && !password ? 'Senha é obrigatória' : undefined}
              />

              {!isSigningUp && (
                <div style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="text-[#1E3A8A] hover:text-[#0F1F4A]"
                    style={{
                      fontSize: '14px',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      padding: '0',
                      fontWeight: '500',
                    }}
                    onClick={() => nav('/owner/forgot-password')}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="owner-login__submit-button !bg-[#1E3A8A] !text-white"
                fullWidth
                loading={isLoading}
              >
                {isSigningUp ? 'Criar conta e entrar' : 'Entrar no painel'}
              </Button>
            </form>

            <div style={{ position: 'relative', margin: '32px 0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(0, 0, 0, 0.1)' }} />
              <span style={{ fontSize: '14px', color: '#717182', whiteSpace: 'nowrap' }}>ou</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(0, 0, 0, 0.1)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#717182', margin: '0', lineHeight: '1.5' }}>
                {isSigningUp ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'}
              </p>

              <Button
  type="button"
  variant="primary"
  fullWidth
  className="!bg-transparent !text-[#1E3A8A] border-0 !shadow-none !opacity-100 hover:!bg-[#fafafa] hover:!opacity-100 active:!bg-[#fafafa] active:!opacity-100 focus-visible:!ring-0 focus-visible:!outline-none"
  onClick={() => {
    setIsSigningUp(!isSigningUp);
    setMessage(null);
    setShowError(false);
  }}
>
  {isSigningUp ? "Acessar conta existente" : "Criar conta"}
</Button>


            </div>

            <div
              style={{
                marginTop: '32px',
                paddingTop: '24px',
                borderTop: '1px solid rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Shield style={{ width: '16px', height: '16px', color: '#717182' }} />
              <span style={{ fontSize: '14px', color: '#717182' }}>Login seguro • Seus dados protegidos</span>
            </div>
          </div>

          {/* MOBILE FEATURES (aparece só no mobile/tablet) */}
          <div className="owner-login__mobile-features">
            <div className="owner-login__mobile-feature-item">
              <div className="owner-login__mobile-feature-icon">
                <Calendar style={{ width: 20, height: 20, color: '#1e3a8a' }} />
              </div>
              <p className="owner-login__mobile-feature-title">Controle de disponibilidade</p>
            </div>

            <div className="owner-login__mobile-feature-item">
              <div className="owner-login__mobile-feature-icon">
                <Clock style={{ width: 20, height: 20, color: '#1e3a8a' }} />
              </div>
              <p className="owner-login__mobile-feature-title">Agenda do dia e reagendamentos</p>
            </div>

            <div className="owner-login__mobile-feature-item">
              <div className="owner-login__mobile-feature-icon">
                <Bell style={{ width: 20, height: 20, color: '#1e3a8a' }} />
              </div>
              <p className="owner-login__mobile-feature-title">Notificações de cancelamento</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

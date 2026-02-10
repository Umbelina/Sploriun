// src/pages/Routes.tsx

import React, { useEffect, useState } from "react";
import type { JSX } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import App from "../../App";
import OwnerLogin from "../components/OwnerLogin";
import OwnerApp from "../components/OwnerApp";
import OwnerForgotPassword from "../components/OwnerForgotPassword";
import ClientLogin from "../components/ClientLogin";
import ClientDashboard from "../../components/ManageAppointments";
import { getSession, getUser, getProfile, onAuthStateChange } from "../lib/auth";

export function ProtectedRoute({
  children,
  role,
}: {
  children: JSX.Element;
  role?: "owner" | "client";
}) {
  const [loaded, setLoaded] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    const evaluate = async () => {
      try {
        // 1) sessão (fonte de verdade)
        const session = await getSession();
        if (!active) return;

        if (!session) {
          setAllowed(false);
          setLoaded(true);
          return;
        }

        // 2) user
        const user = await getUser();
        if (!active) return;

        if (!user) {
          setAllowed(false);
          setLoaded(true);
          return;
        }

        // 3) profile/role (não derruba se profile for null; apenas bloqueia se role for exigido)
        if (!role) {
          setAllowed(true);
          setLoaded(true);
          return;
        }

        const profile = await getProfile(user.id);
        if (!active) return;

        // Se profile ainda não existe ou RLS bloqueou, trate como "não autorizado"
        setAllowed(!!profile && profile.role === role);
        setLoaded(true);
      } catch {
        if (!active) return;
        setAllowed(false);
        setLoaded(true);
      }
    };

    // roda na montagem
    evaluate();

    // e também reage a mudanças de auth (login/logout)
    const { data: sub } = onAuthStateChange(() => {
      evaluate();
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [role]);

  if (!loaded) return <div>Carregando...</div>;

  if (!allowed) {
    return <Navigate to={role === "owner" ? "/owner/login" : "/client/login"} replace />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/:slug" element={<App />} />

      <Route path="/owner/login" element={<OwnerLogin />} />
      <Route path="/owner/forgot-password" element={<OwnerForgotPassword />} />
      <Route
        path="/owner/app"
        element={
          <ProtectedRoute role="owner">
            <OwnerApp />
          </ProtectedRoute>
        }
      />

      <Route path="/client/login/:slug?" element={<ClientLogin />} />
      <Route
        path="/client/app"
        element={
          <ProtectedRoute role="client">
            <ClientDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
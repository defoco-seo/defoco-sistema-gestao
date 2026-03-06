"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordTokenPage() {
  const { token } = useParams();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: any) {
    e.preventDefault();

    if (password !== confirm) {
      alert("As senhas não coincidem");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        password,
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (res.ok) {
      alert("Senha redefinida com sucesso");
      window.location.href = "/login";
    } else {
      alert(data.error || "Erro ao redefinir senha");
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto" }}>
      <h1>Redefinir senha</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Nova senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Confirmar senha"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Alterando..." : "Redefinir senha"}
        </button>
      </form>
    </div>
  );
}
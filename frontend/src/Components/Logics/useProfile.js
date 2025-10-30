import { useState } from 'react';

export function useProfileLogic() {
  const [form, setForm] = useState(null);

  const showSignUp = () => setForm("signup");
  const showLogin = () => setForm("login");
  const showReset = () => setForm("reset");
  const showVerify = () => setForm("verify");
  const showNewPassword = () => setForm("new_pw");
  const hideForm = () => setForm(null);

  return {
    form,
    showSignUp,
    showLogin,
    showReset,
    showVerify,
    showNewPassword,
    hideForm,
  };
}

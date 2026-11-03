import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import CodeForm from '../components/CodeForm.jsx';
import { resendCode, verifyEmail } from '../lib/api.js';
import { img } from '../img.js';

export default function VerifyEmail() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [keep, setKeep] = useState(false);

  if (!state?.email) return <Navigate to="/login" replace />;

  return (
    <AuthLayout
      title="Verify your email"
      intro="One last step. This confirms the email address belongs to you."
      image={img('kitchen-tablet.jpg')}
      imageAlt="A tablet showing a recipe on a kitchen counter next to limes and a wooden spoon"
      note="dinner, sorted"
    >
      <CodeForm
        email={state.email}
        submitLabel="Verify and continue"
        onSubmit={async (code) => {
          await verifyEmail(state.email, code, keep);
          navigate('/dashboard/profile', { state: { setup: true } });
        }}
        onResend={() => resendCode({ purpose: 'verify', email: state.email })}
      >
        <label className="check-row keep-row">
          <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
          <span>Keep me signed in on this device for 30 days</span>
        </label>
      </CodeForm>
      <p className="auth-switch">
        Wrong email? <Link to="/signup">Start again</Link>
      </p>
    </AuthLayout>
  );
}

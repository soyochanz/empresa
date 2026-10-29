import React, { useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { authenticatedFetch } from '../../utils/authenticatedFetch';
import { webOfferStatuses } from '../../utils/webOfferPlans';

export default function RequestActions({ request, onSaved }: { key?: string; request: any; onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState(request.status);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const locked = !!(request.checkout_session_id || request.stripe_subscription_id || ['active', 'past_due', 'canceled'].includes(request.status));
  async function submit(remove = false) {
    setBusy(true); setMessage('');
    try {
      const response = await authenticatedFetch(`/api/web-offers/admin/requests/${request.id}`, {
        method: remove ? 'DELETE' : 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(remove ? { confirm: true } : { status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo completar la acción.');
      setConfirm(false);
      setMessage(remove ? data.warning || 'Solicitud eliminada.' : 'Estado actualizado.');
      await onSaved();
    } catch (error: any) { setMessage(error.message); } finally { setBusy(false); }
  }
  return <section className="wa-request-actions" aria-label="Gestionar solicitud">
    <div><h4>Gestionar solicitud</h4><p>{locked ? 'El cobro está vinculado a Stripe. Conservamos la solicitud y su historial.' : 'Actualiza en qué punto está la web. El cliente verá este estado en su panel.'}</p></div>
    <div className="wa-request-controls">
      <label>Estado de la solicitud<select value={status} disabled={busy || locked} onChange={e => setStatus(e.target.value)}>
        {!['requested','designing','review','changes'].includes(status) && <option value={status}>{webOfferStatuses[status]}</option>}
        {['requested','designing','review','changes'].map(value => <option key={value} value={value} disabled={['review','changes'].includes(value) && !request.demo_url}>{webOfferStatuses[value]}</option>)}
      </select></label>
      <button disabled={busy || locked || status === request.status} onClick={() => submit()}><Save/>Guardar estado</button>
      <button className="wa-delete" disabled={busy || locked} onClick={() => setConfirm(true)}><Trash2/>Eliminar solicitud</button>
    </div>
    {confirm && <div className="wa-delete-confirm" role="alert">
      <h4>¿Eliminar {request.business_name}?</h4><p>Desaparecerá del panel y su enlace de demo dejará de funcionar. Se borrarán sus archivos adjuntos. Esta acción no se puede deshacer.</p>
      <div className="wa-tools"><button disabled={busy} onClick={() => setConfirm(false)}>Volver</button><button className="wa-delete" disabled={busy} onClick={() => submit(true)}>{busy ? 'Eliminando…' : 'Sí, eliminar solicitud'}</button></div>
    </div>}
    {message && <p role="status">{message}</p>}
  </section>;
}

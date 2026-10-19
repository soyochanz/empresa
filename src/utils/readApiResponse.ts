/** Do not treat an empty or HTML response as a successfully saved request. */
export async function readApiResponse(response: Response): Promise<any> {
  const raw = await response.text();
  let data: any;
  try { data = raw.trim() ? JSON.parse(raw) : undefined; } catch { data = undefined; }
  if (!response.ok) {
    if (typeof data?.error === 'string') throw new Error(data.error);
    if (response.status === 413) throw new Error('Los archivos son demasiado grandes. Reduce su tamaño y vuelve a intentarlo.');
    if (response.status === 404) throw new Error('El servicio de solicitudes todavía no está disponible en esta dirección. Tus datos siguen en el formulario; no se ha confirmado el envío.');
    throw new Error('El servidor no ha podido confirmar la operación. Conservamos tus datos en el formulario. Inténtalo de nuevo más tarde.');
  }
  if (data === undefined || data === null || typeof data !== 'object') {
    throw new Error('No hemos recibido una confirmación válida del servidor. Tus datos siguen en el formulario.');
  }
  return data;
}

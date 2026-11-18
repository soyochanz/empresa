// Browser extensions can inject rejected promises into the page. They are not
// evidence of a failed Althera operation and must not overwrite save feedback.
export const isBrowserExtensionError = (error: unknown, filename = ''): boolean => {
 const stack = typeof error === 'object' && error !== null && 'stack' in error
  ? String(error.stack || '') : '';
 return /(?:chrome|moz|safari-web)-extension:\/\//i.test(`${filename}\n${stack}`);
};

export const unexpectedErrorMessage = 'Ha ocurrido un error inesperado. Comprueba el resultado antes de repetir la operación.';

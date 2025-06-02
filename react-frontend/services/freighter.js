export async function isFreighterInstalled() {
  return typeof window.freighterApi !== 'undefined';
}

export async function getPublicKey() {
  if (!(await isFreighterInstalled())) {
    throw new Error('Freighter no está instalada.');
  }

  try {
    const publicKey = await window.freighterApi.getPublicKey();
    return publicKey;
  } catch (err) {
    console.error('Error al obtener publicKey:', err);
    throw err;
  }
}

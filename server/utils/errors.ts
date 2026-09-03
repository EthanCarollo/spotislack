export class IntegrationError extends Error {
  constructor(
    public readonly provider: 'spotify' | 'slack',
    public readonly code: string,
    message: string,
    public readonly statusCode = 502,
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

export function getPublicErrorMessage(error: unknown): string {
  if (error instanceof IntegrationError) {
    if (error.code === 'spotify_reauth_required') {
      return 'Spotify doit être reconnecté : le refresh token a expiré.';
    }
    if (error.code === 'manual_override') {
      return 'Ton statut Slack a été modifié manuellement. Réactive la synchronisation pour reprendre le contrôle.';
    }
    if (error.code === 'not_connected') {
      return 'Connecte Spotify et Slack avant de lancer la synchronisation.';
    }
    return `Le service ${error.provider} a refusé la demande.`;
  }
  return 'La synchronisation a rencontré une erreur temporaire.';
}

/**
 * OAuth Controller
 *
 * Handles OAuth token exchange for Microsoft and Google
 */

import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

export class OAuthController {
  /**
   * Exchange authorization code for access/refresh tokens
   * POST /api/email/oauth/token
   */
  async exchangeToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { provider, code, redirectUri } = req.body;

      if (!provider || !code || !redirectUri) {
        res.status(400).json({
          error: {
            message: 'Missing required fields: provider, code, redirectUri',
            code: 'INVALID_REQUEST',
          },
        });
        return;
      }

      let tokenData;

      if (provider === 'outlook') {
        tokenData = await this.exchangeOutlookToken(code, redirectUri);
      } else if (provider === 'gmail') {
        tokenData = await this.exchangeGmailToken(code, redirectUri);
      } else {
        res.status(400).json({
          error: {
            message: 'Invalid provider. Must be outlook or gmail',
            code: 'INVALID_PROVIDER',
          },
        });
        return;
      }

      res.json(tokenData);
    } catch (error: any) {
      console.error('OAuth token exchange error:', error.response?.data || error.message);
      next(error);
    }
  }

  /**
   * Exchange Microsoft OAuth code for tokens
   */
  private async exchangeOutlookToken(code: string, redirectUri: string) {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Microsoft OAuth credentials not configured');
    }

    // Exchange code for tokens
    const tokenResponse = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Get user profile from Microsoft Graph
    const profileResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000).toISOString(),
      email: profileResponse.data.mail || profileResponse.data.userPrincipalName,
      name: profileResponse.data.displayName,
    };
  }

  /**
   * Exchange Google OAuth code for tokens
   */
  private async exchangeGmailToken(code: string, redirectUri: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    // Exchange code for tokens
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Get user profile from Google
    const profileResponse = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000).toISOString(),
      email: profileResponse.data.email,
      name: profileResponse.data.name,
    };
  }
}

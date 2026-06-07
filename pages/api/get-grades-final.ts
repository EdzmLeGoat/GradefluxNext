// pages/api/get-grades-final.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { samlResponse } = req.body;

  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar, withCredentials: true }));
  const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

  try {
    console.log('Relaying valid user token back to District Hub...');
    const assertionUrl = 'https://edupoint.com';

    const assertionPayload = new URLSearchParams({
      SAMLResponse: samlResponse
    });

    const assertionResponse = await client.post(assertionUrl, assertionPayload.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
        'Origin': 'https://google.com'
      }
    });

    // Capture the generated authorized session cookies
    const authenticatedCookies = jar.getCookieStringSync('https://md-mcps-psv.edupoint.com');

    // Now you can immediately use authenticatedCookies to fetch from /GradebookFocusClassInfo!
    console.log('Session secured! Pulling class records...');

    return res.status(200).json({
      success: true,
      cookies: authenticatedCookies,
      html: assertionResponse.data
    });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

const ALLOWLIST = [
  'rfifm64k.ice.infomaniak.ch',
  'african1paris.ice.infomaniak.ch',
  'dreamsiteradiocp4.com',
  'stream.live.vc.bbcmedia.co.uk',
  'scdn.nrjaudio.fm',
  'radio-trace.ice.infomaniak.ch',
  'www.soundhelix.com',
  'rmc.bfmtv.com',
  'radio.garden',
  'stream.zeno.fm',
  '46.105.111.94',
  'listen.radioking.com',
  'mpbradio.ice.infomaniak.ch',
  'rs1.radiostreamer.com',
  '213.136.96.14',
  'studio.webradio.solutions',
  'dreamsiteradiocp.com',
  'stream.radiondekeluka.org',
  'c26.radioboss.fm',
  'listen.rba.co.rw',
  'isanganiro.ice.infomaniak.ch',
  'ballaradio.com',
  'kfm-kindu.com',
  'rtc-mali.com',
  'maniema1.com',
  'crtv-ouest.cm',
  'poala-fm.com',
  'rbn-bafoussam.com',
  'voix-montagnes.cm',
  'anchor.fm',
  'd3ctxlq1ktw2nl.cloudfront.net',
  'devscast.tech',
  'audio.ausha.co',
  'sphinx.acast.com',
  'www.buzzsprout.com',
  'aod-rfi.akamaized.net',
  'rfiplay-vh.akamaihd.net',
  'media.rfi.fr'
];

function isAllowed(urlString){
  try{
    const u = new URL(urlString);
    return ALLOWLIST.includes(u.hostname);
  }catch{
    return false;
  }
}

router.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing url param');
  if (!isAllowed(targetUrl)) return res.status(403).send('Domain not allowed');
  try{
    const forwardHeaders = { 'User-Agent': 'Eclairia-Radio-Player/1.0' };
    if (req.headers['range']) forwardHeaders['Range'] = req.headers['range'];
    const response = await fetch(targetUrl, { method: 'GET', headers: forwardHeaders });
    if (!response.ok) return res.status(response.status).send(`Error fetching: ${response.statusText}`);
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const acceptRanges = response.headers.get('accept-ranges');
    const contentRange = response.headers.get('content-range');
    const contentLength = response.headers.get('content-length');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Content-Type', contentType);
    if (acceptRanges) res.set('Accept-Ranges', acceptRanges);
    if (contentRange) res.set('Content-Range', contentRange);
    if (contentLength) res.set('Content-Length', contentLength);
    res.status(response.status);
    response.body.pipe(res);
  }catch(err){
    res.status(500).send('Error fetching stream');
  }
});

export default router;

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function encodeBase64Url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const event = payload.event;
    const data = payload.data;
    
    if (event?.type !== 'create') return new Response("Ignored", { status: 200 });
    
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    
    let toEmail = 'me';
    const settings = await base44.asServiceRole.entities.Settings.filter({ setting_name: 'bug_report_email' });
    if (settings.length > 0 && settings[0].setting_value) {
      toEmail = settings[0].setting_value;
    }
    
    const subject = `New ${data.type} report: ${data.title}`;
    const bodyText = `A new ${data.type} has been reported:\n\nTitle: ${data.title}\n\nDescription:\n${data.description}\n\nReported By: ${data.created_by}`;
    
    const message = [
      `To: ${toEmail}`, 
      'Subject: =?utf-8?B?' + btoa(unescape(encodeURIComponent(subject))) + '?=',
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      bodyText
    ].join('\r\n');
    
    const encodedMessage = encodeBase64Url(message);
      
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedMessage })
    });
    
    if (!res.ok) {
      const errText = await res.text();
      console.error('Gmail send error:', errText);
      return new Response(JSON.stringify({ error: errText }), { status: 500 });
    }
    
    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
/// <reference lib="deno.window" />

Deno.serve(async (req) => {
  const { email, code } = await req.json();

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Mensa App <onboarding@resend.dev>',
      to: email,
      subject: 'Ihr Einmalcode für die Mensa App',
      html: `
        <h2>Ihr Einmalcode</h2>
        <p>Ihr Code lautet:</p>
        <h1>${code}</h1>
        <p>Bitte geben Sie diesen Code in der App ein.</p>
      `,
    }),
  });

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
});

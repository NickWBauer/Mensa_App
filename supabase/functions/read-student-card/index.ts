const GOOGLE_VISION_API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY');

Deno.serve(async (req) => {
  try {
    const { imageBase64 } = await req.json();

    if (!GOOGLE_VISION_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'GOOGLE_VISION_API_KEY fehlt',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!imageBase64) {
      return new Response(
        JSON.stringify({
          error: 'Kein Bild empfangen',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: imageBase64,
              },
              features: [
                {
                  type: 'DOCUMENT_TEXT_DETECTION',
                },
              ],
            },
          ],
        }),
      }
    );

    const visionData = await visionResponse.json();

    if (!visionResponse.ok) {
      return new Response(
        JSON.stringify({
          error: 'Google Vision API Fehler',
          status: visionResponse.status,
          details: visionData,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const fullText =
      visionData?.responses?.[0]?.fullTextAnnotation?.text ??
      visionData?.responses?.[0]?.textAnnotations?.[0]?.description ??
      '';

    const lines = fullText
      .split('\n')
      .map((line: string) => line.trim())
      .filter(Boolean);

    let matrikelnummer = '';
    let vorname = '';
    let nachname = '';

    const matrikelMatch = fullText.match(
      /Matrikelnummer[:\s]*([0-9]{5,8})/i
    );

    if (matrikelMatch) {
      matrikelnummer = matrikelMatch[1];
    } else {
      const fallbackMatrikel = fullText.match(/\b[0-9]{6,8}\b/);
      if (fallbackMatrikel) {
        matrikelnummer = fallbackMatrikel[0];
      }
    }

    const ignoredWords = [
      'chatgpt',
      'never chat',
      'hochschule',
      'esslingen',
      'university',
      'applied',
      'sciences',
      'studierendenausweis',
      'matrikelnummer',
      'geburtsdatum',
      'student',
      'students',
      'codes',
      'apps',
      'login',
      'supabase',
      'expo',
      'typescript',
    ];

    const cleanLines = lines.filter((line: string) => {
      const lower = line.toLowerCase();

      if (ignoredWords.some((word) => lower.includes(word))) {
        return false;
      }

      if (/\d/.test(line)) {
        return false;
      }

      if (line.length < 5) {
        return false;
      }

      const parts = line.split(/\s+/);

      if (parts.length < 2 || parts.length > 4) {
        return false;
      }

      return true;
    });

    const nameLine =
      cleanLines.find((line: string) =>
        /^[A-ZÄÖÜ][a-zäöüß]+ [A-ZÄÖÜ][a-zäöüß]+$/.test(line)
      ) ?? cleanLines[0] ?? '';

    if (nameLine) {
      const parts = nameLine.split(/\s+/);
      vorname = parts[0] ?? '';
      nachname = parts.slice(1).join(' ');
    }

    return new Response(
      JSON.stringify({
        success: true,
        text: fullText,
        lines,
        cleanLines,
        vorname,
        nachname,
        matrikelnummer,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Function Catch Fehler',
        details: String(error),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
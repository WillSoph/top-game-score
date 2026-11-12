
export default async (request) => {
  const url = new URL(request.url);
  const file = url.searchParams.get("file");

  if (!file || !/^[a-zA-Z0-9._-]+\.png$/.test(file)) {
    return new Response("Arquivo inválido", { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;

  if (!supabaseUrl) {
    return new Response("Supabase não configurado", {
      status: 500,
    });
  }

  const imageUrl =
    `${supabaseUrl}/storage/v1/object/public/` +
    `topgamescore-social-assets/posts/${file}`;

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return new Response("Imagem não encontrada", {
        status: 404,
      });
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Erro ao carregar imagem", {
      status: 502,
    });
  }
};

export const config = {
  path: "/api/social-image",
};

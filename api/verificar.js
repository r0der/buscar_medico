export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { matricula, tipo } = req.body;

  if (!matricula || isNaN(matricula)) {
    return res.status(400).json({ error: "Matrícula inválida" });
  }

  const numero = Number(matricula);

  try {
    let filter;

    if (tipo === "MP") {
      filter = { property: "Mat. MP", number: { equals: numero } };
    } else if (tipo === "MN") {
      filter = { property: "Mat. MN", number: { equals: numero } };
    } else {
      filter = {
        or: [
          { property: "Mat. MP", number: { equals: numero } },
          { property: "Mat. MN", number: { equals: numero } }
        ]
      };
    }

    const notionRes = await fetch(
      `https://api.notion.com/v1/databases/${process.env.NOTION_DB_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          filter,
          page_size: 1
        }),
      }
    );

    const data = await notionRes.json();

    if (!notionRes.ok) {
      return res.status(500).json({ error: "Error en Notion" });
    }

    if (data.results.length === 0) {
      return res.json({ encontrado: false });
    }

    const props = data.results[0].properties;

    let nombre = null;

    const posibles = ["Nombre", "Nombre completo", "Médico", "Name"];
    for (const key of posibles) {
      const p = props[key];
      if (!p) continue;

      if (p.type === "title") {
        nombre = p.title.map(t => t.plain_text).join("");
        break;
      }

      if (p.type === "rich_text") {
        nombre = p.rich_text.map(t => t.plain_text).join("");
        break;
      }
    }

    return res.json({
      encontrado: true,
      nombre
    });

  } catch (error) {
    return res.status(500).json({ error: "Error interno" });
  }
}
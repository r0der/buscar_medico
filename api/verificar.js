export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { matricula } = req.body;

  if (!matricula || isNaN(matricula)) {
    return res.status(400).json({ error: "Matrícula inválida" });
  }

  const numero = Number(matricula);

  try {
    // 🔎 1. BUSCAR EN MATRÍCULA PROVINCIAL (MP)
    let notionRes = await fetch(
      `https://api.notion.com/v1/databases/${process.env.NOTION_DB_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        },
        body: JSON.stringify({
          filter: {
            property: "Mat. MP",
            number: { equals: numero }
          },
          page_size: 1
        })
      }
    );

    let data = await notionRes.json();

    let tipo = "Provincial (MP)";

    // 🔁 2. SI NO ENCUENTRA → BUSCAR EN NACIONAL (MN)
    if (data.results.length === 0) {
      notionRes = await fetch(
        `https://api.notion.com/v1/databases/${process.env.NOTION_DB_ID}/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28"
          },
          body: JSON.stringify({
            filter: {
              property: "Mat. MN",
              number: { equals: numero }
            },
            page_size: 1
          })
        }
      );

      data = await notionRes.json();
      tipo = "Nacional (MN)";
    }

    // ❌ NO ENCONTRADO
    if (data.results.length === 0) {
      return res.json({ encontrado: false });
    }

    const props = data.results[0].properties;

    // 👤 Profesional (TITLE)
    let nombre = null;
    if (props["Profesional"]?.type === "title") {
      nombre = props["Profesional"].title.map(t => t.plain_text).join("");
    }

    // ✅ RESPUESTA FINAL
    return res.json({
      encontrado: true,
      nombre,
      tipo
    });

  } catch (error) {
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

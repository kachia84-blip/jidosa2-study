export function mergeData(qJson, aJson) {
  const answers = new Map(aJson.items.map(answer => [answer.id, answer]));
  const items = qJson.items.map(question => {
    const answer = answers.get(question.id);
    const parts = answer?.parts ?? [];
    return {
      ...question,
      parts,
      status: answer?.status ?? "없음",
      note: answer?.note ?? "",
      outline: answer?.outline ?? null,
      model: answer?.model ?? "",
      easy: answer?.easy ?? "",
      study: answer?.study ?? "",
      total: parts.reduce((sum, part) => sum + part.items.length, 0),
    };
  });
  return {
    items,
    byId: new Map(items.map(item => [item.id, item])),
    topics: [...new Set(items.map(item => item.topic))],
  };
}

export async function loadData(base = "data/") {
  const prefix = base === "" || base.endsWith("/") ? base : `${base}/`;
  const [questions, answers] = await Promise.all(
    ["questions.json", "answers.json"].map(async file => {
      const response = await fetch(`${prefix}${file}`);
      if (!response.ok) throw new Error(`데이터를 불러오지 못했습니다: ${file} (${response.status})`);
      return response.json();
    }),
  );
  return mergeData(questions, answers);
}

export async function processMessage(data: unknown): Promise<unknown> {
  const res = await fetch('http://localhost:3001/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return res.json();
}

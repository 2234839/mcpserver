import { getEnv } from '../../utils/helpers.js';

export interface SiYuanApiRequest {
  endpoint: string;
  data?: any;
}

export async function makeSiYuanRequest<T = any>({ endpoint, data }: SiYuanApiRequest): Promise<T> {
  const env = getEnv();
  
  if (!env.SIYUAN_API_TOKEN) {
    throw new Error('SIYUAN_API_TOKEN environment variable is required');
  }

  const url = `${env.SIYUAN_API_BASE}/api/${endpoint}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${env.SIYUAN_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.code !== 0) {
    throw new Error(`SiYuan API error: ${result.msg}`);
  }

  return result.data;
}
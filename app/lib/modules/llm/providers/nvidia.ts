import { BaseProvider, getOpenAILikeModel } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';

interface NvidiaModelsResponse {
  data: Array<{
    id: string;
    context_length?: number;
  }>;
}

export default class NvidiaProvider extends BaseProvider {
  name = 'NVIDIA';
  getApiKeyLink = 'https://build.nvidia.com/';

  config = {
    baseUrlKey: 'NVIDIA_API_BASE_URL',
    apiTokenKey: 'NVIDIA_API_KEY',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
  };

  staticModels: ModelInfo[] = [];

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv: Record<string, string> = {},
  ): Promise<ModelInfo[]> {
    const { baseUrl: fetchBaseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv,
      defaultBaseUrlKey: 'NVIDIA_API_BASE_URL',
      defaultApiTokenKey: 'NVIDIA_API_KEY',
    });
    const baseUrl = fetchBaseUrl || 'https://integrate.api.nvidia.com/v1';

    if (!baseUrl || !apiKey) {
      return [];
    }

    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: this.createTimeoutSignal(),
    });

    if (!response.ok) {
      throw new Error(`NVIDIA models request failed: ${response.status} ${response.statusText}`);
    }

    const res = (await response.json()) as NvidiaModelsResponse;

    return res.data.map((model) => ({
      name: model.id,
      label: model.id,
      provider: this.name,
      maxTokenAllowed: model.context_length || 8000,
    }));
  }

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;
    const envRecord = this.convertEnvToRecord(serverEnv);

    const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: envRecord,
      defaultBaseUrlKey: 'NVIDIA_API_BASE_URL',
      defaultApiTokenKey: 'NVIDIA_API_KEY',
    });

    if (!baseUrl || !apiKey) {
      throw new Error(`Missing configuration for ${this.name} provider`);
    }

    return getOpenAILikeModel(baseUrl, apiKey, model);
  }
}

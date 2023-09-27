import { Configure } from '@/modules/core/configure';
import { ApiConfig } from '@/modules/restful/types';

import { v1 } from './v1';

export const api = async (configure: Configure): Promise<ApiConfig> => ({
    title: configure.env('APP_TITLE', 'Nest_3R'),
    description: configure.env('API_DESCRIPTION', 'NsetJS开发教程_3R'),
    auth: true,
    prefix: { route: 'api', doc: 'api-docs' },
    default: configure.env('API_DEFAULT_VERSION', 'v1'),
    enabled: [],
    versions: { v1: await v1(configure) },
});

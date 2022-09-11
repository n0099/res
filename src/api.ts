import type { PathInfo, PathInfoCache, PathsReadmeCache, SimularPathRecommends } from './index.d';
import qs from 'qs';
import { store } from './redux/store';
import { enqueueSnackbar } from './redux/snackbars';
import _ from 'lodash';

const getRequestDecorator = async <T extends ApiError>(endpoint: string, queryString: Record<string, unknown>): Promise<ApiError | T> => {
    try {
        const res = await fetch(`${process.env.REACT_APP_API_URL_PREFIX}/${endpoint}?${qs.stringify(queryString)}`);
        if (!res.ok) throw Error(`API ${endpoint} 返回 HTTP ${res.status} 错误`);
        return await res.json() as T;
    } catch (e: unknown) {
        if (e instanceof Error) {
            const { message } = e;
            store.dispatch(enqueueSnackbar({ message, variant: 'error' }));
            return { error: message };
        }
        throw e;
    }
};

export const getOneDriveDownloadUrl = async (path: string): Promise<string> =>
    new Promise<string>(reslove => {
        grecaptcha.ready(() => {
            void grecaptcha.execute(process.env.REACT_APP_RECAPTCHA_V3_KEY, { action: 'getOneDriveDownloadUrl' })
                .then(token => { reslove(`${process.env.REACT_APP_API_URL_PREFIX}/verify${path}?${qs.stringify({ token, version: 'v3' })}`) });
        });
    });

export interface ApiError { error: string }
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
export const isApiError = (r: any): r is ApiError => 'error' in r && typeof r.error === 'string';
export const fetchPathInfo = async (path: string): Promise<ApiError | PathInfo> => getRequestDecorator('pathInfo', { path });
export const fetchPathsInfo = async (paths: string[]): Promise<ApiError | PathInfoCache> =>
    (_.isEmpty(paths) ? {} : getRequestDecorator('pathInfo', { paths }));
export const fetchRecommends = async (path: string): Promise<ApiError | SimularPathRecommends> => getRequestDecorator('recommends', { path });
export const fetchPathsReadme = async (paths: string[]): Promise<ApiError | PathsReadmeCache> =>
    (_.isEmpty(paths) ? {} : getRequestDecorator('pathReadme', { paths }));

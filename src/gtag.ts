/* eslint-disable @typescript-eslint/naming-convention */
const event_category = 'res-dev';

export const gaPageView = (): void => {
    gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname
    });
};
export const gaScreenView = (screenName: string): void => {
    gtag('event', 'screen_view', {
        app_name: event_category,
        screen_name: screenName
    });
};
export const gaDownloadOnedriveStart = (path: string): void => {
    gtag('event', 'download-onedrive-start', {
        event_category,
        event_label: path
    });
};
export const gaDownloadStreamSaverStart = (path: string): void => {
    gtag('event', 'download-streamSaver-start', {
        event_category,
        event_label: path
    });
};
export const gaDownloadStreamSaverFinish = (path: string): void => {
    gtag('event', 'download-streamSaver-finish', {
        event_category,
        event_label: path
    });
};
export const gaDownloadStreamSaverError = (e: unknown): void => {
    gtag('event', 'download-streamSaver-error', {
        event_category,
        event_label: e
    });
};

/* eslint-disable @typescript-eslint/naming-convention */
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            REACT_APP_API_URL_PREFIX: string,
            REACT_APP_SITE_TITLE: string,
            REACT_APP_ROOT_URL: string,
            REACT_APP_STREAMSAVER_MITM_URL: string,
            REACT_APP_GA_MEASUREMENT_ID: string,
            REACT_APP_RECAPTCHA_V3_KEY: string
        }
    }
}
/* eslint-enable @typescript-eslint/naming-convention */

export type PathInfo = DirInfo | FileInfo | { type: '404' };
export interface SubDirInfo {
    name: string,
    subDirsCount: number,
    subFilesCount: number,
    subFilesSize: number
}
export interface DirInfo {
    type: 'dir',
    firstLevelSubDirs: SubDirInfo[],
    subFiles: FileInfo[]
}
export interface FileInfo {
    type: 'file',
    name: string,
    size: number,
    md5: string,
    sha1: string,
    chaoxingDownloadUrl: string | null,
    creationTime: number,
    modificationTime: number,
    lastDownloadTime: number,
    downloadCount: number,
    downloadRealCount: number
}
export type PathInfoCache = Record<string, PathInfo>;
export type SimularPathRecommends = Array<{
    type: 'dir' | 'file',
    path: string,
    distance: number
}>;
export type SimularPathRecommendsCache = Record<string, SimularPathRecommends>;
export type ColumnDirInfo = { info: DirInfo, path: string, parentPath: string | null } | null;
export type ColumnFileInfo = { info: FileInfo, path: string, parentPath: string } | null;
export interface PathsReadme { path: string, readme: string, modificationTime: number }
export type PathsReadmeCache = Record<string, PathsReadme>;
export interface DownloadTask {
    info: FileInfo,
    path: string,
    downloadSpeed: number,
    etaBytes: number,
    etaSeconds: number
}
export type DownloadTaskInitial = Pick<DownloadTask, 'info' | 'path'>;
export interface DownloadTaskUpdate { index: number, update: Omit<DownloadTask, 'info' | 'path'> }
export interface DownloadStatsCurrentSnapshot {
    backpressureCacheChunks: number,
    backpressureCacheChunksBytes: number,
    writerDesiredSize: number
}
export interface DownloadStatsPeriodSum {
    msTimestamp: number,
    fetchedBytes: number,
    writedChunks: number,
    writedChunksBytes: number
}
export interface DownloadStatsCumulativeSum {
    fetchedBytesCumulative: number,
    writedChunksCumulative: number,
    writedChunksBytesCumulative: number,
    downloadProgress: number
}
export type DownloadStats = DownloadStatsCumulativeSum & DownloadStatsCurrentSnapshot & DownloadStatsPeriodSum;

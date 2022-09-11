import type { Theme } from '@material-ui/core';
import { Avatar, Card, CardContent, CardHeader, Container, Grid, IconButton, LinearProgress, Typography, createStyles, makeStyles } from '@material-ui/core';
import { useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import _ from 'lodash';
import DirView from './DirView';
import FileView from './FileView';
import { getFullPathTiersPath, useGlobalStyle } from '.';
import type { ColumnDirInfo, ColumnFileInfo, DirInfo, PathInfo, PathInfoCache, PathsReadme, PathsReadmeCache, SimularPathRecommends, SimularPathRecommendsCache } from './index.d';
import PathBreadcrumbs from './PathBreadcrumbs';
import SimularPathRecommend from './SimularPathRecommend';
import { CommentRounded, NavigateBeforeRounded, NavigateNextRounded } from '@material-ui/icons';
import { timestampToRelative } from './luxon';
import DownloadTasks from './DownloadTasks';
import type { ApiError } from './api';
import { fetchPathInfo, fetchPathsInfo, fetchRecommends, isApiError, fetchPathsReadme as realFetchPathsReadme } from './api';
import classnames from 'classnames';
import { gaPageView } from './gtag';

const useStyle = makeStyles((t: Theme) => createStyles({
    notInCurrentPath: { opacity: '0.5' },
    currentColumnTip: {
        height: 6,
        width: '10%',
        margin: '6px auto 6px auto',
        borderRadius: '10px',
        backgroundColor: t.palette.grey[300]
    },
    fileInfoSticky: {
        top: t.spacing(8),
        position: 'sticky',
        alignSelf: 'flex-start'
    },
    arrowButtonsBetweenColumn: {
        top: '40vh',
        position: 'sticky',
        alignSelf: 'flex-start'
    },
    arrowButton: {
        width: t.spacing(2),
        padding: '10px 0'
    },
    pathReadmeCard: {
        marginTop: t.spacing(2)
    }
}));

function CurrentColumnTip({ isCurrentColumn }: { isCurrentColumn: boolean }): JSX.Element {
    const style = useStyle();
    const globalStyle = useGlobalStyle();
    return <div className={classnames(style.currentColumnTip, { [globalStyle.hidden]: isCurrentColumn })} />;
}

export default function MainView(): JSX.Element {
    console.log('MainView');
    const style = useStyle();
    const { pathname: fullPath } = useLocation();
    const routerHistory = useHistory();
    const [pathInfo, setPathInfo] = useState({} as PathInfo);
    const pathInfoCacheRef = useRef<PathInfoCache>({});
    const [recommends, setRecommends] = useState<SimularPathRecommends>([]);
    const recommendsCacheRef = useRef<SimularPathRecommendsCache>({});
    const concatSafeFullPath = _.last(fullPath) === '/' ? fullPath : `${fullPath}/`;
    const fullPathTrimEndSlash = fullPath === '/' ? '/' : _.trimEnd(fullPath, '/');
    const parentPath = fullPathTrimEndSlash === '/' ? null : `${fullPathTrimEndSlash.substr(0, fullPathTrimEndSlash.lastIndexOf('/'))}/`; // with trailing slash
    const [isAbleToShowTwoColumn, setIsAbleToShowTwoColumn] = useState(false);
    const [columnDirInfo, setColumnDirInfo] = useState<ColumnDirInfo>(null);
    const [columnFileInfo, setColumnFileInfo] = useState<ColumnFileInfo>(null);
    const [pathsReadme, setPathsReadme] = useState<PathsReadme[]>([]);
    const pathsReadmeCacheRef = useRef<PathsReadmeCache>({});
    const previousFetchedPathsReadmeRef = useRef<string[]>([]);
    const isLoading = concatSafeFullPath !== columnDirInfo?.path && concatSafeFullPath !== columnFileInfo?.path;
    const previousConcatSafeFullPath = useRef('');
    const [apiError, setApiError] = useState<Record<'pathInfo' | 'recommends', ApiError | undefined>>({ pathInfo: undefined, recommends: undefined });

    useEffect(() => {
        window.history.scrollRestoration = 'manual';
        const handleScreenRotate = (e: MediaQueryListEvent) => { setIsAbleToShowTwoColumn(e.matches) };
        const mediaQuery = window.matchMedia('(orientation: landscape) and (min-width: 900px)');
        setIsAbleToShowTwoColumn(mediaQuery.matches);
        mediaQuery.addEventListener('change', handleScreenRotate);
        return () => { mediaQuery.removeEventListener('change', handleScreenRotate) };
    }, []);

    useEffect(gaPageView, [fullPath]);
    useEffect(() => {
        previousConcatSafeFullPath.current = concatSafeFullPath;
    }, [concatSafeFullPath]);

    useEffect(() => {
        const path = fullPathTrimEndSlash;

        const calcUncachedSubDirPathInfo = (dirInfo: DirInfo, cachedPaths: string[]) => {
            const paths = _.chain(dirInfo.firstLevelSubDirs)
                .map(i => ({ name: i.name, count: i.subDirsCount + i.subFilesCount }))
                .orderBy('count', 'desc')
                .map('name')
                .map(subDirName => concatSafeFullPath + subDirName)
                .uniq()
                .difference(cachedPaths)
                .take(5)
                .value();
            return paths;
        };
        const calcUncachedTiersPathInfo = (cachedPaths: string[]) => {
            const paths = _.chain(getFullPathTiersPath(concatSafeFullPath))
                .without(concatSafeFullPath)
                .unshift('/')
                .uniq()
                .difference(cachedPaths)
                .take(5)
                .value();
            return paths;
        };

        const fetchPathsReadme = async (paths: string[]) => {
            previousFetchedPathsReadmeRef.current = [...previousFetchedPathsReadmeRef.current, ...paths];
            return realFetchPathsReadme(paths);
        };
        const calcUncachedSubPathsReadme = (dirInfo: DirInfo, cachedPaths: string[]) => {
            const paths = _.chain(dirInfo.firstLevelSubDirs)
                .map('name')
                .union(_.map(dirInfo.subFiles, 'name'))
                .map(subDirOrFileName => concatSafeFullPath + subDirOrFileName)
                .difference(cachedPaths)
                .difference(previousFetchedPathsReadmeRef.current)
                .take(5)
                .value();
            return paths;
        };
        const calcUncachedTiersPathsReadme = (cachedPaths: string[]) => {
            const paths = _.chain(getFullPathTiersPath(concatSafeFullPath))
                .unshift('/')
                .uniq()
                .difference(cachedPaths)
                .difference(previousFetchedPathsReadmeRef.current)
                .take(10)
                .value();
            return paths;
        };

        const extractSubFilesIntoPathInfoCache = (dirInfo: DirInfo) =>
            _.mapKeys(_.keyBy(dirInfo.subFiles, 'name'), (_i, k) => concatSafeFullPath + k);

        void (async () => {
            setRecommends([]); // show loading
            const pathInfoCache = pathInfoCacheRef.current;
            const newPathInfo = path in pathInfoCache
                ? pathInfoCache[path]
                : await fetchPathInfo(path);
            if (isApiError(newPathInfo) || newPathInfo.type === '404') {
                if (isApiError(newPathInfo)) setApiError(p => ({ ...p, pathInfo: newPathInfo }));
                setColumnDirInfo(null); // hide the previous path
                setColumnFileInfo(null);
            } else {
                setApiError(p => ({ ...p, pathInfo: undefined }));
                setPathInfo(newPathInfo);
                void (async () => {
                    let uncachedPathsInfo = calcUncachedTiersPathInfo(_.keys(pathInfoCache));
                    const newColumnPathInfo = { info: newPathInfo, path: concatSafeFullPath, parentPath };
                    const isColumnDirInfo = (columnPathInfo: typeof newColumnPathInfo): columnPathInfo is NonNullable<ColumnDirInfo> => columnPathInfo.info.type === 'dir';
                    const isColumnFileInfo = (columnPathInfo: typeof newColumnPathInfo): columnPathInfo is NonNullable<ColumnFileInfo> => columnPathInfo.info.type === 'file';
                    if (newPathInfo.type === 'dir' && isColumnDirInfo(newColumnPathInfo)) {
                        uncachedPathsInfo = [...uncachedPathsInfo, ...calcUncachedSubDirPathInfo(newPathInfo, _.keys(pathInfoCache))];
                        setColumnDirInfo(newColumnPathInfo);
                    } else if (isColumnFileInfo(newColumnPathInfo)) {
                        setColumnFileInfo(newColumnPathInfo);
                    }

                    const newPathsInfo = await fetchPathsInfo(uncachedPathsInfo);
                    pathInfoCacheRef.current = {
                        ...pathInfoCache,
                        ...isApiError(newPathsInfo) ? {} : newPathsInfo,
                        ...newPathInfo.type === 'dir' ? extractSubFilesIntoPathInfoCache(newPathInfo) : {},
                        [path]: newPathInfo
                    };
                })();
            }

            void (async () => {
                const recommendsCache = recommendsCacheRef.current;
                const newRecommends = path in recommendsCache
                    ? recommendsCache[path]
                    : await fetchRecommends(path);
                if (isApiError(newRecommends)) {
                    setApiError(p => ({ ...p, recommends: newRecommends }));
                } else {
                    setApiError(p => ({ ...p, recommends: undefined }));
                    recommendsCacheRef.current = { ...recommendsCache, [path]: newRecommends };
                    setRecommends(newRecommends);
                }
            })();

            void (async () => {
                let pathsReadmeCache = pathsReadmeCacheRef.current;
                const newPathsReadme = await fetchPathsReadme([
                    ...calcUncachedTiersPathsReadme(_.keys(pathsReadmeCache)),
                    ...!isApiError(newPathInfo) && newPathInfo.type === 'dir'
                        ? calcUncachedSubPathsReadme(newPathInfo, _.keys(pathsReadmeCache))
                        : []
                ]);
                if (!isApiError(newPathsReadme)) {
                    pathsReadmeCacheRef.current = { ...pathsReadmeCache, ...newPathsReadme };
                    pathsReadmeCache = pathsReadmeCacheRef.current; // sync with newly updated
                }
                setPathsReadme(_.chain(pathsReadmeCache)
                    .pick(_.chain(pathsReadmeCache)
                        .keys()
                        .intersection(getFullPathTiersPath(path))
                        .value())
                    .toArray()
                    .sortBy(i => -i.path.length) // sort desc by longest(closest to current) path
                    .value());
            })();
        })();
    }, [concatSafeFullPath, fullPathTrimEndSlash, parentPath]);

    const isPathInCurrentDirInfo = columnDirInfo?.path === concatSafeFullPath;
    const isPathInCurrentFileInfo = columnFileInfo?.path === concatSafeFullPath;
    const handleHideColumn = (whichColumn: 'dir' | 'file') => {
        if (whichColumn === 'dir' && columnFileInfo !== null) {
            window.scrollTo(0, 0);
            setColumnDirInfo(null);
            if (!isPathInCurrentFileInfo) routerHistory.push(columnFileInfo.path);
        } else if (whichColumn === 'file' && columnDirInfo !== null) {
            setColumnFileInfo(null);
            if (!isPathInCurrentDirInfo) routerHistory.push(columnDirInfo.path);
        }
    };
    // https://github.com/microsoft/TypeScript/issues/12184
    const isShowingDirColumn = (p: ColumnDirInfo): p is NonNullable<ColumnDirInfo> =>
        p !== null && (isAbleToShowTwoColumn || isPathInCurrentDirInfo || isLoading || previousConcatSafeFullPath.current === p.path);
    const isShowingFileColumn = (p: ColumnFileInfo): p is NonNullable<ColumnFileInfo> =>
        p !== null && (isAbleToShowTwoColumn || isPathInCurrentFileInfo || isLoading || previousConcatSafeFullPath.current === p.path);

    return <>
        <PathBreadcrumbs path={fullPath} />
        {/* <PathFullTiers path={fullPath} /> */}
        {isLoading && <LinearProgress color="secondary" />}
        {/* <DownloadTasks /> */}
        <Container>
            {apiError.pathInfo !== undefined && <Typography variant="h3" align="center">{apiError.pathInfo.error}</Typography>}
            {pathInfo.type === '404' && <Typography variant="h1" align="center">404</Typography>}
            {(apiError.pathInfo !== undefined || pathInfo.type === '404')
                && <SimularPathRecommend error={apiError.recommends} recommends={recommends} />}
            <Grid container wrap="nowrap">
                {isShowingDirColumn(columnDirInfo) && (
                    <Grid item xs={isShowingFileColumn(columnFileInfo) ? 7 : 12}>
                        <CurrentColumnTip isCurrentColumn={isPathInCurrentDirInfo} />
                        <DirView className={classnames({ [style.notInCurrentPath]: !isPathInCurrentDirInfo || isLoading })}
                            dir={columnDirInfo.info} path={columnDirInfo.path} parentPath={columnDirInfo.parentPath} />
                    </Grid>)}
                {isShowingDirColumn(columnDirInfo) && isShowingFileColumn(columnFileInfo) && (
                    <Grid item xs className={style.arrowButtonsBetweenColumn}>
                        <IconButton className={style.arrowButton} onClick={() => { handleHideColumn('dir') }}>
                            <NavigateBeforeRounded />
                        </IconButton>
                        <IconButton className={style.arrowButton} onClick={() => { handleHideColumn('file') }}>
                            <NavigateNextRounded />
                        </IconButton>
                    </Grid>)}
                {isShowingFileColumn(columnFileInfo) && (
                    <Grid item xs={isShowingDirColumn(columnDirInfo) ? 5 : 12} className={style.fileInfoSticky}>
                        <CurrentColumnTip isCurrentColumn={isPathInCurrentFileInfo} />
                        <FileView className={classnames({ [style.notInCurrentPath]: !isPathInCurrentFileInfo || isLoading })}
                            file={columnFileInfo.info} parentPath={columnFileInfo.parentPath} />
                    </Grid>)}
            </Grid>
            {_.map(pathsReadme, ({ path, readme: __html, modificationTime }) =>
                <Card key={path} className={style.pathReadmeCard}>
                    <CardHeader avatar={<Avatar><CommentRounded /></Avatar>}
                        title={`来自 ${path} 的 README`} subheader={`最后修订于${timestampToRelative(modificationTime)}`} />
                    <CardContent>
                        <Typography dangerouslySetInnerHTML={{ __html }} />
                    </CardContent>
                </Card>)}
            {!(apiError.pathInfo !== undefined || pathInfo.type === '404')
                && <SimularPathRecommend error={apiError.recommends} recommends={recommends} showItemsNum={5} />}
        </Container>
    </>;
}

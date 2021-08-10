import type { Theme } from '@material-ui/core';
import { AppBar, Breadcrumbs, Grid, IconButton, Link, Toolbar, createStyles, makeStyles } from '@material-ui/core';
import React, { useEffect, useRef, useState } from 'react';
import { HomeRounded, NavigateBeforeRounded, NavigateNextRounded } from '@material-ui/icons';
import _ from 'lodash';
import { AlignedIcon } from './AlignedIcon';
import SimpleBar from 'simplebar-react';
import 'simplebar/dist/simplebar.min.css';
import ScrollContainer from 'react-indiana-drag-scroll';
import { Link as RouterLink } from 'react-router-dom';
import { getFullPathTiers, getFullPathTiersPath } from '.';

const useStyle = makeStyles((t: Theme) => createStyles({
    contrastColor: { color: t.palette.grey[50] },
    appBar: { zIndex: t.zIndex.drawer + 1 },
    arrowButton: {
        padding: '10px 0',
        color: t.palette.grey[300]
    },
    arrowButtonColumn: { minWidth: t.spacing(3) },
    simpleBar: { '& .simplebar-scrollbar:before': { backgroundColor: 'white' } }
}));
const useOverrideStyle = makeStyles((t: Theme) => createStyles({
    separator: { color: t.palette.grey[400] },
    li: { whiteSpace: 'nowrap' },
    ol: {
        height: t.spacing(7),
        flexWrap: 'nowrap'
    }
}));

export default React.memo(({ path }: { path: string }): JSX.Element => {
    const style = useStyle();
    const overrideStyle = useOverrideStyle();
    const fullPathTiers = getFullPathTiers(path);
    const fullPathTiersPath = getFullPathTiersPath(path);
    const scrollContainerRef = useRef<HTMLElement>(null);
    const [isBreadcrumbScrollToStart, setIsBreadcrumbScrollToStart] = useState(true);
    const [isBreadcrumbScrollToEnd, setIsBreadcrumbScrollToEnd] = useState(true);
    const handleScrollButton = (direction: -1 | 1) => {
        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer !== null) scrollContainer.scrollBy({ left: direction * scrollContainer.scrollWidth * 0.1, behavior: 'smooth' });
    };
    const shouldShowScrollButton = (dom: HTMLElement) => {
        setIsBreadcrumbScrollToStart(dom.scrollLeft === 0);
        setIsBreadcrumbScrollToEnd(dom.scrollWidth === dom.scrollLeft + dom.clientWidth);
    };

    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer !== null) {
            const debouncedHandleResize = _.debounce(() => { shouldShowScrollButton(scrollContainer) }, 100);
            scrollContainer.addEventListener('scroll', _.debounce(
                (e: Event) => { shouldShowScrollButton(e.target as HTMLElement) }, 100
            ), { passive: true });
            window.addEventListener('resize', debouncedHandleResize);
            return () => { window.removeEventListener('resize', debouncedHandleResize) };
        }
        return () => {};
    }, []);

    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer !== null && scrollContainer.scrollWidth > scrollContainer.clientWidth) {
            shouldShowScrollButton(scrollContainer);
            scrollContainer.scrollTo({ left: scrollContainer.scrollWidth - scrollContainer.clientWidth, behavior: 'smooth' });
        }
    }, [path]);

    return <>
        <AppBar className={style.appBar} position="fixed">
            <Toolbar disableGutters>
                <Grid container alignItems="center">
                    <Grid item className={style.arrowButtonColumn}>
                        {!isBreadcrumbScrollToStart && (
                            <IconButton className={style.arrowButton} onClick={() => { handleScrollButton(-1) }}>
                                <NavigateBeforeRounded />
                            </IconButton>)}
                    </Grid>
                    <Grid item xs>
                        <SimpleBar className={style.simpleBar}>
                            {() => <ScrollContainer innerRef={scrollContainerRef} className="simplebar-content-wrapper">
                                {/* https://github.com/Norserium/react-indiana-drag-scroll/issues/51 */}
                                <Breadcrumbs maxItems={Infinity} classes={overrideStyle} className="simplebar-content" aria-label="当前路径">
                                    <span>
                                        <Link className={style.contrastColor} href={process.env.REACT_APP_ROOT_URL}>
                                            <AlignedIcon><HomeRounded /></AlignedIcon>
                                        </Link>
                                        {<Link className={style.contrastColor} component={RouterLink} to="/">
                                            <span> 四叶重工资源站</span>
                                        </Link>}
                                    </span>
                                    {_.map(fullPathTiers, (i, k) =>
                                        <Link key={k} to={fullPathTiersPath[k]}
                                            component={RouterLink} className={style.contrastColor}>{i}</Link>)}
                                </Breadcrumbs>
                            </ScrollContainer>}
                        </SimpleBar>
                    </Grid>
                    <Grid item className={style.arrowButtonColumn}>
                        {!isBreadcrumbScrollToEnd && (
                            <IconButton className={style.arrowButton} onClick={() => { handleScrollButton(1) }}>
                                <NavigateNextRounded />
                            </IconButton>)}
                    </Grid>
                </Grid>
            </Toolbar>
        </AppBar>
        <Toolbar />
    </>;
});

import * as echarts from 'echarts/core';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { LineChart } from 'echarts/charts';
import { AxisPointerComponent, DataZoomComponent, DatasetComponent, GridComponent, LegendComponent, ToolboxComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { AxisPointerComponentOption, DataZoomComponentOption, DatasetComponentOption, ECharts, GridComponentOption, LegendComponentOption, LineSeriesOption, ToolboxComponentOption, TooltipComponentOption } from 'echarts';
import type { Theme } from '@material-ui/core';
import { createStyles, makeStyles } from '@material-ui/core';
import _ from 'lodash';
import { useEffect, useRef } from 'react';
import type { DownloadStats } from './index.d';

type ChartOption = echarts.ComposeOption<AxisPointerComponentOption | DatasetComponentOption | DataZoomComponentOption | GridComponentOption | LegendComponentOption | LineSeriesOption | ToolboxComponentOption | TooltipComponentOption>;
echarts.use([LineChart, DatasetComponent, GridComponent, ToolboxComponent, TooltipComponent, AxisPointerComponent, LegendComponent, DataZoomComponent, CanvasRenderer]);

const useStyle = makeStyles((t: Theme) => createStyles({
    fab: {
        position: 'fixed',
        right: 30,
        bottom: 30,
        zIndex: t.zIndex.drawer + 1
    },
    drawerPaper: {
        width: '80vw',
        minWidth: '300px',
        maxWidth: '1000px'
    },
    logger: {
        width: '100%',
        height: '50vh'
    },
    chart: {
        width: '100%',
        height: '33vh'
    }
}));

export default function DownloadTaskStats({ stats }: { stats: DownloadStats[] }): JSX.Element {
    const style = useStyle();
    const chart = useRef<ReactEChartsCore>(null);
    const chunkChart = useRef<ReactEChartsCore>(null);
    const cumulativeChart = useRef<ReactEChartsCore>(null);

    const chartBaseOption: ChartOption = {
        legend: {},
        axisPointer: {},
        tooltip: { trigger: 'axis' },
        toolbox: { feature: { dataZoom: { yAxisIndex: 'none' } } },
        grid: { top: 40, bottom: 20 },
        xAxis: [{ type: 'time' }],
        yAxis: [{}, {}]
    };
    const makeSeries = (series: Array<[keyof DownloadStats, number]>): LineSeriesOption[] =>
        _.map(series, ([y, yAxisIndex]) => ({
            name: y,
            type: 'line',
            encode: { x: 'msTimestamp', y },
            yAxisIndex,
            showSymbol: false,
            emphasis: { focus: 'series' }
        }));
    const chartOption = {
        ...chartBaseOption,
        yAxis: [{}, {}, {}],
        series: makeSeries([
            ['fetchedBytes', 0],
            ['writerDesiredSize', 1],
            ['downloadProgress', 1]
        ])
    };
    const chunkChartOption = {
        ...chartBaseOption,
        series: makeSeries([
            ['writedChunks', 1],
            ['writedChunksBytes', 0],
            ['backpressureCacheChunks', 1],
            ['backpressureCacheChunksBytes', 0]
        ])
    };
    const cumulativeChartOption = {
        ...chartBaseOption,
        series: makeSeries([
            ['fetchedBytesCumulative', 1],
            ['writedChunksCumulative', 0],
            ['writedChunksBytesCumulative', 1]
        ])
    };

    useEffect(() => {

    }, []);
    useEffect(() => {
        _.each([chart, chunkChart, cumulativeChart], i => {
            i.current !== null && (i.current.getEchartsInstance() as ECharts).setOption({ dataset: { source: stats } });
        });
    }, [stats]);

    return <>
        <ReactEChartsCore echarts={echarts} ref={chart} option={chartOption} />
        <ReactEChartsCore echarts={echarts} ref={chunkChart} option={chunkChartOption} />
        <ReactEChartsCore echarts={echarts} ref={cumulativeChart} option={cumulativeChartOption} />
        <textarea readOnly className={style.logger} value={stats.map(i => JSON.stringify(i)).join('\n')}></textarea>
    </>;
}

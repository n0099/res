import _ from 'lodash';
import streamSaver from 'streamsaver';
import { createSHA1 } from 'hash-wasm';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment, @typescript-eslint/prefer-ts-expect-error
// @ts-ignore
import { Archive } from 'libarchive.js/main.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment, @typescript-eslint/prefer-ts-expect-error
// @ts-ignore
import { CompressedFile } from 'libarchive.js/src/compressed-file';
import type { DownloadStats, DownloadTask } from './index.d';
import { gaDownloadStreamSaverError, gaDownloadStreamSaverFinish, gaDownloadStreamSaverStart } from './gtag';

type DownloadFileInfo = Pick<DownloadTask, 'info' | 'path'>;

export async function download3(file: DownloadFileInfo, url: string, statsReporter: (stats: DownloadStats) => void): Promise<FileSystemFileHandle | undefined> {
    gaDownloadStreamSaverStart(file.path);
    let fileHandle = null;
    try {
        fileHandle = await showSaveFilePicker({ suggestedName: file.info.name, startIn: 'downloads' } as SaveFilePickerOptions);
    } catch (e: unknown) {
        console.error(e);
        return;
    }
    console.log(fileHandle);
    const stream = await fileHandle.createWritable();
    const writer = stream.getWriter();

    const fetchController = new AbortController();
    try {
        const response = await fetch(url, { signal: fetchController.signal });
        const sha1 = await createSHA1();
        sha1.init();
        const size = Number(response.headers.get('Content-Length')); // in bytes
        const logger = console.log;
        const resetedStats = {
            fetchedBytes: 0,
            writedChunks: 0,
            writedChunksBytes: 0,
            backpressureCacheChunks: 0,
            backpressureCacheChunksBytes: 0,
            writerDesiredSize: 0,
            downloadProgress: 0
        };
        let stats: DownloadStats = {
            ...resetedStats,
            msTimestamp: Date.now(),
            fetchedBytesCumulative: 0,
            writedChunksCumulative: 0,
            writedChunksBytesCumulative: 0
        };
        const reporter = () => {
            stats.fetchedBytesCumulative += stats.fetchedBytes;
            stats.writedChunksCumulative += stats.writedChunks;
            stats.writedChunksBytesCumulative += stats.writedChunksBytes;
            stats = {
                ...stats,
                backpressureCacheChunks: 0,
                backpressureCacheChunksBytes: 0,
                writerDesiredSize: writer.desiredSize ?? Infinity,
                downloadProgress: _.round(stats.fetchedBytesCumulative / size * 100, 2)
            };
            statsReporter(stats);
            stats = { ...stats, ...resetedStats, msTimestamp: Date.now() };
        };
        const reporterTimerID = window.setInterval(reporter, 1000); // every one second

        if (response.body === null) throw Error('response have no body');
        const a: Transformer<Uint8Array, Uint8Array> = {
            start() {},
            transform(chunk, controller) {
                stats.fetchedBytes += chunk.byteLength;
                controller.enqueue(chunk);
                stats.writedChunks++;
                stats.writedChunksBytes += chunk.byteLength;
            },
            flush() {}
        };
        await response.body
            // .pipeThrough(new TransformStream<Uint8Array, Uint8Array>(a))
            .pipeTo(new WritableStream<Uint8Array>({
                write(chunk) {
                    stats.fetchedBytes += chunk.byteLength;
                    void writer.write(chunk); // performance
                    stats.writedChunks++;
                    stats.writedChunksBytes += chunk.byteLength;
                },
                close() {
                    logger('close');
                    void writer.close();
                },
                abort(reason) {
                    logger(reason);
                    void writer.abort(reason);
                }
            }));
        clearInterval(reporterTimerID);
        reporter();
        logger(sha1.digest('hex'));
        logger(stats.fetchedBytesCumulative);
        logger(stats.writedChunksBytesCumulative);
        gaDownloadStreamSaverFinish(file.path);
        return fileHandle;
    } catch (e: unknown) {
        console.error(e);
        fetchController.abort();
        gaDownloadStreamSaverError(e);
    }
}

export async function extractZip(fileHandle: FileSystemFileHandle): Promise<void> {
    let unzipDir: FileSystemDirectoryHandle | null = null;
    try {
        unzipDir = await showDirectoryPicker();
        if (await unzipDir.queryPermission({ mode: 'readwrite' }) !== 'granted'
            && await unzipDir.requestPermission({ mode: 'readwrite' }) !== 'granted') throw Error('user haven\'t granted dir write permission');
    } catch (e: unknown) {
        console.error(e);
        return;
    }
    Archive.init({ workerUrl: `${process.env.PUBLIC_URL}/libarchive.worker-bundle.js` });
    console.log(Archive);
    const file = await fileHandle.getFile();
    console.log(file);
    const zip = await Archive.open(file);
    console.log(zip);
    await zip.usePassword('acghts');
    const recusriveExtract = async (fileOrFiles: CompressedFile | Record<string, CompressedFile>, dirName: string, parentDirHandle: FileSystemDirectoryHandle) => {
        console.log(parentDirHandle);
        if (fileOrFiles instanceof CompressedFile) {
            const fileHandle = await parentDirHandle.getFileHandle(fileOrFiles.name.replaceAll('*', '_'), { create: true });
            const stream = await fileHandle.createWritable();
            console.time('extract');
            const extractedFile = await fileOrFiles.extract();
            console.timeEnd('extract');
            console.time('write');
            await stream.write(extractedFile);
            console.timeEnd('write');
            await stream.close();
            console.log(fileHandle.getFile());
        } else {
            // unicode path name sucks https://github.com/nika-begiashvili/libarchivejs/issues/19
            const newDirHandle = await parentDirHandle.getDirectoryHandle(dirName.replaceAll('*', '_'), { create: true });
            console.log(newDirHandle);
            _.map(fileOrFiles, (i, k) => { recusriveExtract(i, k, newDirHandle) });
        }
    };
    const files = await zip.getFilesObject();
    console.log(files);
    console.log(unzipDir);
    _.map(files, (i, k) => {
        if (unzipDir === null) return;
        recusriveExtract(i, k, unzipDir);
    });
}

export async function download2(file: DownloadFileInfo, url: string, statsReporter: (stats: DownloadStats) => void): Promise<void> {
    gaDownloadStreamSaverStart(file.path);
    const fetchController = new AbortController();
    try {
        const response = await fetch(url, { signal: fetchController.signal });
        const sha1 = await createSHA1();
        sha1.init();
        const size = Number(response.headers.get('Content-Length')); // in bytes
        // const stratrgy = new ByteLengthQueuingStrategy({ highWaterMark: 100 });
        const backpressureCacheStoreName = 'backpressureCache';
        const { openDB } = await import('idb/with-async-ittr.js');
        const backpressureCacheIDB = await openDB('downloadTasks', 1, {
            upgrade(db) {
                // if (!db.objectStoreNames.contains(backpressureCacheStoreName))
                db.createObjectStore(backpressureCacheStoreName, { autoIncrement: true });
            }
        });
        const logger = console.log;
        const resetedStats = {
            fetchedBytes: 0,
            writedChunks: 0,
            writedChunksBytes: 0,
            backpressureCacheChunks: 0,
            backpressureCacheChunksBytes: 0,
            writerDesiredSize: 0,
            downloadProgress: 0
        };
        let stats: DownloadStats = {
            ...resetedStats,
            msTimestamp: Date.now(),
            fetchedBytesCumulative: 0,
            writedChunksCumulative: 0,
            writedChunksBytesCumulative: 0
        };
        const chunks: Uint8Array[] = [];

        const reporter = async () => {
            stats.fetchedBytesCumulative += stats.fetchedBytes;
            stats.writedChunksCumulative += stats.writedChunks;
            stats.writedChunksBytesCumulative += stats.writedChunksBytes;
            stats = {
                ...stats,
                backpressureCacheChunks: await backpressureCacheIDB.count(backpressureCacheStoreName),
                backpressureCacheChunksBytes: 0, // _.sumBy(backpressureCache, 'byteLength'),
                writerDesiredSize: 0, // writer.desiredSize,
                // downloadSpeed: Math.round(stats.fetchedBytes / ((Date.now() - stats.msTimestamp) / 1000)),
                downloadProgress: _.round(stats.fetchedBytesCumulative / size * 100, 2)
            };
            statsReporter(stats);
            stats = { ...stats, ...resetedStats, msTimestamp: Date.now() };
        };
        if (response.body === null) throw Error('response have no body');
        await response.body.pipeTo(new WritableStream({
            async write(chunk) {
                // sha1.update(chunk);
                chunks.push(chunk);

                // void backpressureCacheIDB.put(backpressureCacheStoreName, chunk);

                if (chunks.length > 1000) {
                    console.log(_.sumBy(chunks, 'byteLength'));
                    console.time('write');
                    await backpressureCacheIDB.put(backpressureCacheStoreName, chunks);
                    console.timeEnd('write');
                    chunks.length = 0;
                }
                stats.fetchedBytes += chunk.byteLength;
                if (Date.now() - stats.msTimestamp >= 1000) await reporter();
            },
            close() {
                logger('close');
            },
            abort(reason) {
                logger(reason);
            }
        }));
        console.log(_.sumBy(chunks, 'byteLength'));
        await backpressureCacheIDB.put(backpressureCacheStoreName, chunks);
        chunks.length = 0;
        await reporter();
        logger(sha1.digest('hex'));
        logger(await backpressureCacheIDB.count(backpressureCacheStoreName));
        logger(stats.fetchedBytesCumulative);
        logger(stats.writedChunksBytesCumulative);

        const stream = streamSaver.createWriteStream(file.info.name, { size });
        const writer = stream.getWriter();
        let cursor = await backpressureCacheIDB.transaction(backpressureCacheStoreName).objectStore(backpressureCacheStoreName).openCursor();
        let chunksBytes = 0;
        const chunkSaver = (chunk: Uint8Array) => {
            chunksBytes += chunk.byteLength;
            void writer.write(chunk);
        };
        while (cursor) {
            if (writer.desiredSize === null || writer.desiredSize < 0) console.log(writer.desiredSize);
            _.each(cursor.value, chunkSaver);
            cursor = await cursor.continue(); // eslint-disable-line no-await-in-loop
        }
        logger(chunksBytes);
        void writer.close();
        gaDownloadStreamSaverFinish(file.path);
    } catch (e: unknown) {
        console.error(e);
        fetchController.abort();
        // fileStream.abort();
        gaDownloadStreamSaverError(e);
    }
}

void (async () => {
    streamSaver.mitm = process.env.REACT_APP_STREAMSAVER_MITM_URL;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (window.WritableStream === undefined) {
        console.log('using writeableStream ponyfill');
        streamSaver.WritableStream = (await import('web-streams-polyfill/ponyfill/es2018')).WritableStream;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (window.TransformStream === undefined) {
        console.log('using transformStream ponyfill');
        streamSaver.TransformStream = (await import('web-streams-polyfill/ponyfill/es2018')).TransformStream as typeof TransformStream;
    }
})();
export async function download(file: DownloadFileInfo, url: string, statsReporter: (stats: DownloadStats) => void): Promise<void> {
    gaDownloadStreamSaverStart(file.path);
    const fetchController = new AbortController();
    const errorHandler = (e: unknown) => {
        console.log('catched');
        console.error(e);
        fetchController.abort();
        // fileStream.abort();
        gaDownloadStreamSaverError(e);
    };
    try {
        const sha1 = await createSHA1();
        sha1.init();
        const response = await fetch(url, { signal: fetchController.signal });
        const size = Number(response.headers.get('Content-Length')); // in bytes
        const { body } = response;
        if (body === null) throw Error('response have no body');
        const stream = streamSaver.createWriteStream(file.info.name, { size });
        const writer = stream.getWriter();
        // const stratrgy = new ByteLengthQueuingStrategy({ highWaterMark: 100 });
        const logger = console.log;
        const resetedStats = {
            fetchedBytes: 0,
            writedChunks: 0,
            writedChunksBytes: 0,
            backpressureCacheChunks: 0,
            backpressureCacheChunksBytes: 0,
            writerDesiredSize: 0,
            downloadProgress: 0
        };
        let stats: DownloadStats = {
            ...resetedStats,
            msTimestamp: Date.now(),
            fetchedBytesCumulative: 0,
            writedChunksCumulative: 0,
            writedChunksBytesCumulative: 0
        };
        const reporter = () => {
            stats.fetchedBytesCumulative += stats.fetchedBytes;
            stats.writedChunksCumulative += stats.writedChunks;
            stats.writedChunksBytesCumulative += stats.writedChunksBytes;
            stats = {
                ...stats,
                backpressureCacheChunks: backpressureCache.length,
                backpressureCacheChunksBytes: _.sumBy(backpressureCache, 'byteLength'),
                writerDesiredSize: writer.desiredSize ?? Infinity,
                downloadProgress: _.round(stats.fetchedBytesCumulative / size, 4)
            };
            statsReporter(stats);
            stats = { ...stats, ...resetedStats, msTimestamp: Date.now() };
        };
        let previousBackpressureCacheInfo: { time: number, size: number } | null = null;
        const reporterTimerID = window.setInterval(() => {
            reporter();
            const now = Date.now();
            const backpressureCacheSize = backpressureCache.length;
            if (backpressureCacheSize > (previousBackpressureCacheInfo?.size ?? 0)) { // only record rising edges
                previousBackpressureCacheInfo ??= { time: now, size: backpressureCacheSize };
            } else {
                previousBackpressureCacheInfo = null;
            }
            // 2048 * 16 kib = 32 mib, but fetch's chunk size might be vary from 4kb to 48kb, so it's usually 42mib
            if (now - (previousBackpressureCacheInfo?.time ?? now) > 20000) { // twenty seconds
                clearInterval(reporterTimerID);
                backpressureCache.length = 0;
                void writer.abort('desiredSize too small(backpressure)');
                errorHandler(Error('desiredSize too small(backpressure)'));
            }
        }, 1000); // every one second
        const writeChunk = (chunk: Uint8Array) => {
            // await writer.ready; // fetch won't wait for backpressure
            void writer.write(chunk); // shouldn't wait for write since we have to know is there a backpressure
            // sha1.update(chunk);
            stats.writedChunks++;
            stats.writedChunksBytes += chunk.byteLength;
        };
        const backpressureCache: Uint8Array[] = [];
        const writeBackBackpressureCache = () => {
            backpressureCache.forEach(writeChunk);
            backpressureCache.length = 0;
        };
        const streamWriter = (chunk: Uint8Array) => {
            if (writer.desiredSize === null) return;
            stats.fetchedBytes += chunk.byteLength;
            if (writer.desiredSize < 0) { // todo: desiredSize will be permanently 0 in firefox with fallback method
                backpressureCache.push(chunk);
            } else {
                if (backpressureCache.length !== 0) writeBackBackpressureCache();
                writeChunk(chunk);
            }
        };
        const streamClosure = () => {
            logger('close');
            writeBackBackpressureCache();
            // await writer.ready;
            void writer.close();
        };
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (body.pipeTo !== undefined && window.WritableStream !== undefined) {
            await body.pipeTo(new WritableStream<Uint8Array>({
                write: streamWriter,
                close: streamClosure,
                abort(reason) {
                    logger(reason);
                    void writer.abort(reason);
                }
            }));
        } else {
            console.log('fallback');
            const reader = body.getReader();
            let isFetchStreamClosed = false;
            await new Promise<void>(reslove => {
                const pump = async () => {
                    const readResult = await reader.read();
                    if (readResult.done) {
                        isFetchStreamClosed = true;
                        reslove();
                        streamClosure();
                    } else {
                        streamWriter(readResult.value);
                        setTimeout(() => { void pump() }, 100); // todo: delay invoke to save cpu, can only be used in reader->pumper->writer compatible method to ensure data completeness
                        // void pump();
                    }
                };
                // while (!isFetchStreamClosed) void pump();
                void pump();
            });
        }

        clearInterval(reporterTimerID);
        reporter();
        logger(stats.fetchedBytesCumulative);
        logger(stats.writedChunksBytesCumulative);
        logger(sha1.digest('hex'));
        gaDownloadStreamSaverFinish(file.path);
    } catch (e: unknown) {
        errorHandler(e);
    }
}

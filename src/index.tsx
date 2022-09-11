import ReactDOM from 'react-dom';
import { CssBaseline, createStyles, makeStyles } from '@material-ui/core';
import { BrowserRouter, Route } from 'react-router-dom';
import MainView from './MainView';
import _ from 'lodash';
import { SnackbarProvider } from 'notistack';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import Notifier from './Notifier';

// https://stackoverflow.com/questions/14480345/how-to-get-the-nth-occurrence-in-a-string/14480366#14480366
const getSubStrPosition = (haystack: string, needle: string, index: number) => haystack.split(needle, index).join(needle).length;

function App() {
    return (
        <Provider store={store}>
            <BrowserRouter basename={process.env.PUBLIC_URL.substr(getSubStrPosition(process.env.PUBLIC_URL, '/', 3))}>
                <Route path="/">
                    <SnackbarProvider>
                        <CssBaseline />
                        <MainView />
                        <Notifier />
                    </SnackbarProvider>
                </Route>
            </BrowserRouter>
        </Provider>
    );
}

// path=/a/b/c/d fullPathTiers=[a, b, c, d] fullPathTiersPath=[/a, /a/b, /a/b/c, /a/b/c/d]
export const getFullPathTiers = (path: string): string[] => _.split(_.trim(path, '/'), '/');
export const getFullPathTiersPath = (path: string): string[] =>
    _.map(getFullPathTiers(path), (i, k, c) => `/${c.slice(0, k).concat('').join('/')}${i}`);
export const useGlobalStyle = makeStyles(() => createStyles({
    '@global': {
        '.grecaptcha-badge': { opacity: 0 }
    },
    hidden: { visibility: 'hidden' }
}));

ReactDOM.render(<App />, document.getElementById('root'));

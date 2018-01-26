// tslint:disable-next-line import-name no-require-imports
import { all } from 'deepmerge';
import * as querystring from 'querystring';

import { Provider } from './providers/Provider';
import {
    IOptionalUrlRequestOptions,
    IRequestOptions,
    IRequestRunner,
    IResponse,
} from './RequestRunner';

// DO NOT EDIT, THIS IS UPDATE BY THE BUILD SCRIPT
const packageVersion = '0.13.0'; // package version

/**
 * Main client.
 */
export class Client {
    private provider: Provider;
    private userAgent: string;
    public urls = {
        api: 'https://mixer.com/api/v1',
        public: 'https://mixer.com',
    };
    /**
     * The primary Mixer client, responsible for storing authentication state
     * and dispatching requests to the API.
     */
    constructor(private requestRunner: IRequestRunner) {
        this.userAgent = this.buildUserAgent();
    }

    private buildUserAgent() {
        const client = `MixerClient/${packageVersion}`;
        // tslint:disable-next-line no-typeof-undefined
        if (typeof navigator !== 'undefined') { // in-browser
            return navigator.userAgent + ' ' + client;
        }

        return client + ' (JavaScript; Node.js ' + process.version + ')';
    }

    /**
     * Sets the the API/public URLs for the client.
     */
    public setUrl(kind: 'api' | 'public', url: string): this {
        this.urls[kind] = url;
        return this;
    }

    /**
     * Builds a path to the Mixer API by concating it with the address.
     */
    public buildAddress(base: string, path: string, querystr?: (string | Object)): string {
        let url = base;

        // Strip any trailing slash from the base
        if (url.slice(-1) === '/') {
            url = url.slice(0, -1);
        }
        let sanitizedPath = path;
        // And any leading slash from the path.
        if (sanitizedPath.charAt(0) === '/') {
            sanitizedPath = sanitizedPath.slice(1);
        }

        url = url + '/' + sanitizedPath;

        // And just add the query string
        if (querystr) {
            url += '?' + querystring.stringify(querystr);
        }

        return url;
    }

    /**
     * Creates and returns an authentication provider instance.
     */
    public use(provider: Provider): Provider {
        this.provider = provider;
        return provider;
    }

    /**
     * Returns the associated provider instance, as set by the
     * `use` method.
     */
    public getProvider(): Provider {
        return this.provider;
    }

    /**
     * Attempts to run a given request.
     */
    public request<T>(method: string, path: string, data: IOptionalUrlRequestOptions = {}): Promise<IResponse<T>> {
        const req = all([
            this.provider ? this.provider.getRequest() : {},
            {
                method: method || '',
                url: this.buildAddress(this.urls.api, path || ''),
                headers: {
                    'User-Agent': this.userAgent,
                },
                json: true,
            },
            data,
        ]);

        return this.requestRunner.run(<IRequestOptions>req)
        .catch(err => {
            if (this.provider) {
                return this.provider.handleResponseError(err, <IRequestOptions>req);
            }
            throw err;
        });
    }
}

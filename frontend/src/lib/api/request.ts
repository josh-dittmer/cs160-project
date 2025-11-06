import { isLeft } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import { PathReporter } from 'io-ts/PathReporter';
import { Endpoints } from './endpoints';


export type RequestData<C extends t.Mixed> = {
    request: RequestInit,
    decoder: C
};

export function get<C extends t.Mixed>({ token, decoder }: { token?: string, decoder: C }): RequestData<C> {
    const headers = new Headers();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const init: RequestInit = {
        method: 'get',
        headers: headers,
    };

    const data: RequestData<C> = {
        request: init,
        decoder: decoder
    };

    return data;
}

export function post<C extends t.Mixed>({ token, decoder, payload }: { token?: string, decoder: C, payload: object }): RequestData<C> {
    const headers = new Headers();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');

    const init: RequestInit = {
        method: 'post',
        headers: headers,
        body: JSON.stringify(payload)
    };

    const data: RequestData<C> = {
        request: init,
        decoder: decoder
    };

    return data;
}

export async function request<C extends t.Mixed>(path: string, data: RequestData<C>): Promise<t.TypeOf<typeof data.decoder>> {
    const url = Endpoints.mainApiInternal + path;

    const response = await fetch(url, data.request);
    
    if (response.status === 401) {
        // todo: redirect to login
        throw new Error('unauthorized');
    } else if (response.status !== 200 && response.status !== 201) {
        throw new Error('request failed');
    }

    const parsed: unknown = await response.json();

    const decoded = data.decoder?.decode(parsed);
    if (!decoded || isLeft(decoded)) {
        throw new Error(`could not validate data: ${PathReporter.report(decoded).join('\n')}`)
    }

    return decoded.right;
};